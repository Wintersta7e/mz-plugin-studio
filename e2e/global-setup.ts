// Runs once before any launch: re-reads both fuse wires (a twin without the inspect fuse makes
// every launch hang to its timeout with no message), then creates the run's temp root and
// snapshots the working tree for the teardown to compare.
import { execFileSync } from 'node:child_process'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { getCurrentFuseWire } from '@electron/fuses'
import { readArtifacts } from './fixtures/app'

export const TREE_SNAPSHOT = 'tree-status.txt'

/**
`git status` of the working tree, every untracked file included
*/
export function treeStatus(): string {
  return execFileSync('git', ['status', '--porcelain', '--untracked-files=all'], {
    cwd: process.cwd(),
    encoding: 'utf8'
  })
}

/**
Every tracked file, by its path relative to the working tree
*/
export function trackedFiles(): string[] {
  return execFileSync('git', ['ls-files', '-z'], { cwd: process.cwd(), encoding: 'utf8' })
    .split('\0')
    .filter((file) => file !== '')
}

export default async function globalSetup(): Promise<void> {
  // Loaded natively: the test transform compiles static imports to CommonJS, which rejects the
  // script's module-only syntax
  const { compareWires, formatWire } = await import('../scripts/e2e-prepare.mjs')
  const { release, twin } = readArtifacts()
  const releaseWire = await getCurrentFuseWire(release)
  const twinWire = await getCurrentFuseWire(twin)
  process.stdout.write(`e2e: fuses release ${formatWire(releaseWire)}\n`)
  process.stdout.write(`e2e: fuses twin ${formatWire(twinWire)}\n`)
  const { diff } = compareWires(releaseWire, twinWire)
  process.stdout.write(`e2e: fuse diff ${diff.join(', ')} (${String(diff.length)} fuse)\n`)

  // Read before the root exists: a failing `git status` then leaves no folder behind
  const status = treeStatus()
  const root = mkdtempSync(path.join(tmpdir(), 'mz-e2e-run-'))
  Object.assign(process.env, { E2E_RUN_ROOT: root, E2E_RUN_START: String(Date.now()) })
  writeFileSync(path.join(root, TREE_SNAPSHOT), status)
  process.stdout.write(`e2e: run root ${root}\n`)
}
