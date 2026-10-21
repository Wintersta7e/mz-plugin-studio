// Runs the release workflow's CI wait step with fake `gh` and `sleep`: a release publishes
// only a commit whose own CI run exists and succeeded.
import { afterAll, afterEach, describe, expect, it } from 'vitest'
import { spawnSync } from 'child_process'
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync
} from 'fs'
import { tmpdir } from 'os'
import { delimiter, join } from 'path'
import { fileURLToPath } from 'url'

const RELEASE = fileURLToPath(new URL('../../.github/workflows/release.yml', import.meta.url))
const STEP_NAME = "      - name: Wait for this commit's CI run"
const SHA = '0123abc'

// The `run: |` block of the step, with its ten-space indent removed
function stepScript(): string {
  const lines = readFileSync(RELEASE, 'utf8').split(/\r?\n/)
  const step = lines.indexOf(STEP_NAME)
  if (step < 0) throw new Error(`release.yml has no step: ${STEP_NAME.trim()}`)
  const run = lines.findIndex((line, index) => index > step && line === '        run: |')
  if (run < 0) throw new Error('the CI wait step has no run: | block')
  const body: string[] = []
  for (const line of lines.slice(run + 1)) {
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

const tempDirs: string[] = []
let cases = 0

afterEach(() => {
  for (const dir of tempDirs.splice(0)) rmSync(dir, { recursive: true, force: true })
})

afterAll(() => {
  console.log(`release CI gate: cases ${cases}`)
})

function runStep(env: Record<string, string>): {
  status: number | null
  out: string
  log: string[]
} {
  const dir = mkdtempSync(join(tmpdir(), 'release-ci-gate-'))
  tempDirs.push(dir)
  const bin = join(dir, 'bin')
  const script = join(dir, 'step.sh')
  const log = join(dir, 'calls.log')
  writeFileSync(script, stepScript())
  mkdirSync(bin)
  writeFileSync(join(bin, 'gh'), FAKE_GH)
  writeFileSync(join(bin, 'sleep'), FAKE_SLEEP)
  chmodSync(join(bin, 'gh'), 0o755)
  chmodSync(join(bin, 'sleep'), 0o755)
  const result = spawnSync('bash', ['--noprofile', '--norc', '-eo', 'pipefail', script], {
    encoding: 'utf8',
    env: {
      ...process.env,
      PATH: `${bin}${delimiter}${process.env.PATH ?? ''}`,
      GITHUB_SHA: SHA,
      FAKE_LOG: log,
      ...env
    }
  })
  cases++
  return {
    status: result.status,
    out: result.stdout + result.stderr,
    log: existsSync(log) ? readFileSync(log, 'utf8').trim().split('\n') : []
  }
}

const lastLine = (out: string): string => out.trim().split('\n').at(-1) ?? ''

describe('release CI gate', () => {
  it('fails after six tries when the commit has no CI run', () => {
    const { status, out, log } = runStep({ FAKE_RUN_ID: '' })
    const lists = log.filter((line) => line.startsWith('gh run list '))
    expect(lists).toHaveLength(6)
    for (const line of lists) expect(line).toContain(`--workflow ci.yml --commit ${SHA}`)
    expect(log.filter((line) => line.startsWith('gh run watch'))).toEqual([])
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
    expect(log.filter((line) => line.startsWith('gh run watch'))).toEqual([])
    expect(status).toBe(1)
  })
})
