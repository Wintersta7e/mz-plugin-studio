// Runs once after the suite: fails the run when an app process, a fixture copy or a new file
// in the working tree outlived the tests, after deleting the run's temp root.
import { readdirSync, readFileSync, rmSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { appDirectories, runRoot } from './fixtures/app'
import { isWithin, liveProcesses } from './fixtures/teardown'
import { TREE_SNAPSHOT, treeStatus } from './global-setup'

const lines = (text: string): Set<string> => new Set(text.split('\n').filter(Boolean))

export default async function globalTeardown(): Promise<void> {
  const directories = appDirectories()
  const live = await liveProcesses()
  const left = live
    .map(({ executablePath }) => executablePath)
    .filter(
      (exe): exe is string =>
        exe !== undefined && directories.some((directory) => isWithin(exe, directory))
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
