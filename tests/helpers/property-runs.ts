// The fast-check settings of a property suite. The seed is PROPERTY_SEED when set, to replay a
// failure, else a fresh one; both are printed with the run count, so any run can be replayed.
import { randomInt } from 'node:crypto'

const SEED_RANGE = 2 ** 31
const RUNS = 100

export function propertyRuns(suite: string): { seed: number; numRuns: number } {
  const named = process.env['PROPERTY_SEED']
  const seed = named === undefined || named === '' ? randomInt(SEED_RANGE) : Number(named)
  process.stdout.write(`property ${suite}: runs ${String(RUNS)}, seed ${String(seed)}\n`)
  return { seed, numRuns: RUNS }
}
