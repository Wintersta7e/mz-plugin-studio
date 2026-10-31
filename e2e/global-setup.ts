// Runs once before any launch: re-reads both fuse wires (a twin without the inspect fuse makes
// every launch hang to its timeout with no message), then creates the run's temp root and
// snapshots the working tree for the teardown to compare.
import { execFileSync } from 'node:child_process'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { getCurrentFuseWire } from '@electron/fuses'
import { readArtifacts } from './fixtures/app'

export const TREE_SNAPSHOT = 'tree-status.txt'

/** `git status` of the working tree, every untracked file included */
export function treeStatus(): string {
  return execFileSync('git', ['status', '--porcelain', '--untracked-files=all'], {
    cwd: process.cwd(),
    encoding: 'utf8'
  })
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
  process.stdout.write(`e2e: fuse diff ${diff.join(', ')} (${diff.length} fuse)\n`)

  const root = mkdtempSync(join(tmpdir(), 'mz-e2e-run-'))
  process.env['E2E_RUN_ROOT'] = root
  process.env['E2E_RUN_START'] = String(Date.now())
  writeFileSync(join(root, TREE_SNAPSHOT), treeStatus())
  process.stdout.write(`e2e: run root ${root}\n`)
}
