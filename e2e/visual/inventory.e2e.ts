// The baselines on disk are exactly the snapshots the states list names: a missing one would only
// fail in its own test, an extra one would never be compared.
import { existsSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { expect, test } from '../fixtures/app'
import { SNAPSHOTS } from './states'

/**
The PNG files in `directory`, none when it does not exist
*/
function pngsIn(directory: string): string[] {
  return existsSync(directory) ? readdirSync(directory).filter((name) => name.endsWith('.png')) : []
}

test('baselines match the snapshot list one to one', () => {
  const directory = path.join(process.cwd(), 'e2e', '__screenshots__', 'linux')
  const baselines = pngsIn(directory)
  const orphans = baselines.filter((name) => !SNAPSHOTS.includes(name))
  const missing = SNAPSHOTS.filter((name) => !baselines.includes(name))
  process.stdout.write(
    `visual: comparisons ${String(SNAPSHOTS.length)}, baselines ${String(baselines.length)}, orphans ${String(orphans.length)}\n`
  )
  expect({ orphans, missing }).toEqual({ orphans: [], missing: [] })
  expect([SNAPSHOTS.length, baselines.length]).toEqual([16, 16])
})
