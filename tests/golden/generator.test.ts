// Generated plugins and every export format, pinned for full-coverage, defect and hostile
// definitions before the escaping work changes them.
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { generatePlugin } from '../../src/renderer/src/lib/generator/index'
import { compilePlugin } from '../helpers/evaluate-plugin'
import { COMMENT_PAYLOADS } from '../helpers/hostile'
import { GENERATOR_ENTRIES, countHostileLeaves, renderExports } from './corpus/generator'
import type { GeneratorEntry } from './corpus/generator'
import { freezeTime, restoreTime } from './corpus/normalise'

const HOSTILE_PAYLOADS = new Map([
  ...COMMENT_PAYLOADS.map((p): [string, string] => [`hostile-${p.name}`, p.text]),
  ['hostile-control', 'Safe']
])
const BENIGN = ['all-param-types', 'meta-full', 'fixture-generated', 'hostile-control']

const entry = (name: string): GeneratorEntry => {
  const found = GENERATOR_ENTRIES.find((e) => e.name === name)
  if (found === undefined) throw new Error(`No generator entry ${name}`)
  return found
}

describe('generator goldens', () => {
  beforeAll(freezeTime)
  afterAll(restoreTime)

  for (const e of GENERATOR_ENTRIES) {
    it(`${e.name}: generatePlugin`, async () => {
      await expect(generatePlugin(e.def)).toMatchFileSnapshot(`__golden__/generator/${e.name}.js`)
    })
    it(`${e.name}: exports`, async () => {
      await expect(renderExports(e)).toMatchFileSnapshot(
        `__golden__/generator/${e.name}.exports.txt`
      )
    })
  }

  it('hostile entries fill every string leaf', () => {
    const leaves = [...HOSTILE_PAYLOADS].map(([name, payload]) =>
      countHostileLeaves(entry(name).def, payload)
    )
    const hostile = GENERATOR_ENTRIES.filter((e) => e.name.startsWith('hostile-')).length - 1
    console.log(
      `generator entries ${GENERATOR_ENTRIES.length} (hostile ${hostile}, ` +
        `leaves ${leaves[0].holding}/${leaves[0].total})`
    )
    expect(hostile).toBe(COMMENT_PAYLOADS.length)
    for (const count of leaves) {
      expect(count.total).toBeGreaterThan(0)
      expect(count).toEqual(leaves[0])
      expect(count.holding).toBe(count.total)
    }
  })

  it('benign entries compile', () => {
    for (const name of BENIGN) {
      expect(compilePlugin(generatePlugin(entry(name).def), `${name}.js`), name).toBeNull()
    }
  })
})
