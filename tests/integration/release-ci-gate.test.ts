// Runs the release workflow's CI wait step with fake `gh` and `sleep`: a release publishes
// only a commit whose own CI run exists and succeeded.
import { afterAll, afterEach, describe, expect, it } from 'vitest'
import { spawnSync } from 'node:child_process'
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync
} from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const RELEASE = fileURLToPath(new URL('../../.github/workflows/release.yml', import.meta.url))
const STEP_NAME = "      - name: Wait for this commit's CI run"
const SHA = '0123abc'

// The `run: |` block of the step, with its ten-space indent removed
function stepScript(): string {
  const lines = readFileSync(RELEASE, 'utf8').split(/\r?\n/)
  const step = lines.indexOf(STEP_NAME)
  if (step === -1) throw new Error(`release.yml has no step: ${STEP_NAME.trim()}`)
  const run = lines.findIndex((line, index) => index > step && line === '        run: |')
  if (run === -1) throw new Error('the CI wait step has no run: | block')
  const body: string[] = []
  const following = lines.slice(run + 1)
  for (const line of following) {
    if (line.trim() !== '' && !line.startsWith(' '.repeat(10))) break
    body.push(line.slice(10))
  }
  if (body.join('').trim() === '') throw new Error('the CI wait step runs nothing')
  return `${body.join('\n')}\n`
}

const FAKE_GH = `#!/bin/sh
echo "gh $*" >> "$FAKE_LOG"
case "$1 $2" in
  "run list")
    if [ "\${FAKE_LIST_EXIT:-0}" -ne 0 ]; then exit "$FAKE_LIST_EXIT"; fi
    if [ -n "$FAKE_RUN_ID" ]; then echo "$FAKE_RUN_ID"; fi
    ;;
  "run watch")
    for arg in "$@"; do
      if [ "$arg" = "--exit-status" ]; then exit "\${FAKE_WATCH_EXIT:-0}"; fi
    done
    ;;
esac
exit 0
`
const FAKE_SLEEP = `#!/bin/sh
echo "sleep $*" >> "$FAKE_LOG"
`

const temporaryFolders: string[] = []
const counted = { cases: 0 }

function runStep(variables: Record<string, string>): {
  status: number | null
  out: string
  log: string[]
} {
  const folder = mkdtempSync(path.join(tmpdir(), 'release-ci-gate-'))
  temporaryFolders.push(folder)
  const bin = path.join(folder, 'bin')
  const script = path.join(folder, 'step.sh')
  const log = path.join(folder, 'calls.log')
  writeFileSync(script, stepScript())
  mkdirSync(bin)
  writeFileSync(path.join(bin, 'gh'), FAKE_GH)
  writeFileSync(path.join(bin, 'sleep'), FAKE_SLEEP)
  chmodSync(path.join(bin, 'gh'), 0o755)
  chmodSync(path.join(bin, 'sleep'), 0o755)
  const { PATH: searchPath = '' } = process.env
  const result = spawnSync('bash', ['--noprofile', '--norc', '-eo', 'pipefail', script], {
    encoding: 'utf8',
    env: {
      ...process.env,
      PATH: `${bin}${path.delimiter}${searchPath}`,
      GITHUB_SHA: SHA,
      FAKE_LOG: log,
      ...variables
    }
  })
  counted.cases += 1
  return {
    status: result.status,
    out: result.stdout + result.stderr,
    log: existsSync(log) ? readFileSync(log, 'utf8').trim().split('\n') : []
  }
}

const lastLine = (out: string): string => out.trim().split('\n').at(-1) ?? ''

describe('release CI gate', () => {
  afterEach(() => {
    for (const folder of temporaryFolders.splice(0)) {
      rmSync(folder, { recursive: true, force: true })
    }
  })

  afterAll(() => {
    process.stdout.write(`release CI gate: cases ${String(counted.cases)}\n`)
  })

  it('fails after six tries when the commit has no CI run', () => {
    const { status, out, log } = runStep({ FAKE_RUN_ID: '' })
    const lists = log.filter((line) => line.startsWith('gh run list '))

    expect(lists).toHaveLength(6)

    for (const line of lists) expect(line).toContain(`--workflow ci.yml --commit ${SHA}`)

    expect(log.filter((line) => line.startsWith('gh run watch'))).toStrictEqual([])
    expect(lastLine(out)).toContain(SHA)
    expect(status).toBe(1)
  })

  it('fails when the CI run did not succeed', () => {
    const { status, out, log } = runStep({ FAKE_RUN_ID: '42', FAKE_WATCH_EXIT: '1' })

    expect(log.some((line) => /^gh run watch 42 .*--exit-status/.test(line))).toBe(true)
    expect(lastLine(out)).toContain('run 42')
    expect(status).toBe(1)
  })

  it('passes when the CI run succeeded', () => {
    const { status, log } = runStep({ FAKE_RUN_ID: '42', FAKE_WATCH_EXIT: '0' })

    expect(log.filter((line) => line.startsWith('gh run list '))).toHaveLength(1)
    expect(status).toBe(0)
  })

  it('fails without watching when listing the runs fails', () => {
    const { status, log } = runStep({ FAKE_LIST_EXIT: '1', FAKE_RUN_ID: '42' })

    expect(log.filter((line) => line.startsWith('gh run watch'))).toStrictEqual([])
    expect(status).toBe(1)
  })
})
