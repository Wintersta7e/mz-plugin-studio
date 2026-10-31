// The baselines on disk are exactly the snapshots the states list names: a missing one would only
// fail in its own test, an extra one would never be compared.
import { existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { expect, test } from '../fixtures/app'
import { SNAPSHOTS } from './states'

test('baselines match the snapshot list one to one', () => {
  const dir = join(process.cwd(), 'e2e', '__screenshots__', 'linux')
  const baselines = existsSync(dir) ? readdirSync(dir).filter((name) => name.endsWith('.png')) : []
  const orphans = baselines.filter((name) => !SNAPSHOTS.includes(name))
  const missing = SNAPSHOTS.filter((name) => !baselines.includes(name))
  process.stdout.write(
    `visual: comparisons ${SNAPSHOTS.length}, baselines ${baselines.length}, orphans ${orphans.length}\n`
  )
  expect({ orphans, missing }).toEqual({ orphans: [], missing: [] })
  expect([SNAPSHOTS.length, baselines.length]).toEqual([16, 16])
})
