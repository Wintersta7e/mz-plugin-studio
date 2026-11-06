// Runs once after the suite: fails the run when an app process, a fixture copy or a new file
// in the working tree outlived the tests, after deleting the run's temp root.
import { execFileSync } from 'node:child_process'
import { readdirSync, readFileSync, readlinkSync, rmSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { isWithin, readArtifacts, runRoot } from './fixtures/app'
import { TREE_SNAPSHOT, treeStatus } from './global-setup'

/**
The executable of process `pid`, or undefined once it exited or when it is not ours to read
*/
function executableOf(pid: string): string | undefined {
  try {
    return readlinkSync(`/proc/${pid}/exe`)
  } catch {
    return undefined
  }
}

/**
Executables of every running process the platform lets us read
*/
function processExecutables(): string[] {
  if (process.platform === 'win32') {
    return execFileSync(
      'powershell',
      [
        '-NoProfile',
        '-Command',
        'Get-CimInstance Win32_Process | ForEach-Object { $_.ExecutablePath }'
      ],
      { encoding: 'utf8' }
    )
      .split(/\r?\n/)
      .filter(Boolean)
  }
  return readdirSync('/proc')
    .filter((entry) => /^\d+$/.test(entry))
    .map((pid) => executableOf(pid))
    .filter((executable) => executable !== undefined)
}

const lines = (text: string): Set<string> => new Set(text.split('\n').filter(Boolean))

export default function globalTeardown(): void {
  const { release, twin } = readArtifacts()
  const appDirectories = [path.dirname(release), path.dirname(twin)]
  const left = processExecutables().filter((exe) =>
    appDirectories.some((directory) => isWithin(exe, directory))
  )
  process.stdout.write(`e2e: app processes left ${String(left.length)}\n`)
  const { E2E_RUN_ROOT: createdRoot, E2E_RUN_START: startText } = process.env
  if (createdRoot === undefined) {
    // The global setup failed before creating the run root, so no test ran
    if (left.length > 0) throw new Error(`e2e teardown: app processes left ${String(left.length)}`)
    return
  }

  const root = runRoot()
  const before = lines(readFileSync(path.join(root, TREE_SNAPSHOT), 'utf8'))
  const added = [...lines(treeStatus()).difference(before)]
  process.stdout.write(`e2e: tree entries added ${String(added.length)}\n`)

  rmSync(root, { recursive: true, force: true, maxRetries: 3 })
  const roots = readdirSync(tmpdir()).filter((entry) => path.join(tmpdir(), entry) === root)
  process.stdout.write(`e2e: temp roots left ${String(roots.length)}\n`)

  // Copies of the fixture project made during the run that a teardown missed
  const start = Number(startText)
  const copies = readdirSync(tmpdir())
    .filter((entry) => entry.startsWith('mz-fixture-'))
    .filter((entry) => statSync(path.join(tmpdir(), entry)).mtimeMs >= start)
  process.stdout.write(`e2e: fixture copies left ${String(copies.length)}\n`)

  const problems = [
    ...left.map((exe) => `app process left: ${exe}`),
    ...roots.map((entry) => `temp root left: ${entry}`),
    ...copies.map((entry) => `fixture copy left: ${entry}`),
    ...added.map((line) => `tree entry added: ${line}`)
  ]
  if (problems.length > 0) throw new Error(`e2e teardown:\n  ${problems.join('\n  ')}`)
}
