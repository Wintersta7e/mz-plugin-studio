// Runs once after the suite: fails the run when an app process, a fixture copy or a new file
// in the working tree outlived the tests, after deleting the run's temp root.
import { execFileSync } from 'node:child_process'
import { readdirSync, readFileSync, readlinkSync, rmSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { isWithin, readArtifacts, runRoot } from './fixtures/app'
import { TREE_SNAPSHOT, treeStatus } from './global-setup'

/** Executables of every running process the platform lets us read */
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
    .flatMap((pid) => {
      try {
        return [readlinkSync(`/proc/${pid}/exe`)]
      } catch {
        // Exited meanwhile, or not ours to read
        return []
      }
    })
}

const lines = (text: string): Set<string> => new Set(text.split('\n').filter(Boolean))

export default async function globalTeardown(): Promise<void> {
  const { release, twin } = readArtifacts()
  const appDirs = [dirname(release), dirname(twin)]
  const left = processExecutables().filter((exe) => appDirs.some((dir) => isWithin(exe, dir)))
  process.stdout.write(`e2e: app processes left ${left.length}\n`)
  if (process.env['E2E_RUN_ROOT'] === undefined) {
    // The global setup failed before creating the run root, so no test ran
    if (left.length > 0) throw new Error(`e2e teardown: app processes left ${left.length}`)
    return
  }

  const root = runRoot()
  const before = lines(readFileSync(join(root, TREE_SNAPSHOT), 'utf8'))
  const added = [...lines(treeStatus())].filter((line) => !before.has(line))
  process.stdout.write(`e2e: tree entries added ${added.length}\n`)

  rmSync(root, { recursive: true, force: true, maxRetries: 3 })
  const roots = readdirSync(tmpdir()).filter((entry) => join(tmpdir(), entry) === root)
  process.stdout.write(`e2e: temp roots left ${roots.length}\n`)

  // Copies of the fixture project made during the run that a teardown missed
  const start = Number(process.env['E2E_RUN_START'])
  const copies = readdirSync(tmpdir())
    .filter((entry) => entry.startsWith('mz-fixture-'))
    .filter((entry) => statSync(join(tmpdir(), entry)).mtimeMs >= start)
  process.stdout.write(`e2e: fixture copies left ${copies.length}\n`)

  const problems = [
    ...left.map((exe) => `app process left: ${exe}`),
    ...roots.map((entry) => `temp root left: ${entry}`),
    ...copies.map((entry) => `fixture copy left: ${entry}`),
    ...added.map((line) => `tree entry added: ${line}`)
  ]
  if (problems.length > 0) throw new Error(`e2e teardown:\n  ${problems.join('\n  ')}`)
}
