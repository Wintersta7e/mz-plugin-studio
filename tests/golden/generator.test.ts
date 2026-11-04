// Generated plugins and every export format, pinned for full-coverage, defect and hostile
// definitions before the escaping work changes them; and the plugins generated from parameter
// files whose defaults are not the declared type.
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { generatePlugin } from '../../src/renderer/src/lib/generator/index'
import { deserializeParams } from '../../src/renderer/src/lib/param-io'
import { compileCheck } from '../../src/main/services/syntax-check'
import { COMMENT_PAYLOADS } from '../helpers/hostile'
import { GENERATOR_ENTRIES, countHostileLeaves, renderExports } from './corpus/generator'
import type { GeneratorEntry } from './corpus/generator'
import { MZPARAMS_HOST } from './corpus/mzparams'
import { freezeTime, restoreTime } from './corpus/normalise'
import { typeViolatingDefaultCases, type TypeViolatingDefaultCase } from './corpus/type-violating'

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

// What the import path keeps of a parameter file, then the plugin generated from it.
function renderDefaultCase(c: TypeViolatingDefaultCase): string {
  const imported = deserializeParams(c.content)
  if (!imported.success) return `// refused: ${imported.reason}\n`
  const dropped = imported.dropped.map((d) => `${d.param}.${d.field}`).join(', ')
  const skipped = imported.skipped.map((s) => `${s.index} ${s.reason}`).join(', ')
  return (
    `// dropped: ${dropped === '' ? 'none' : dropped}\n` +
    `// skipped: ${skipped === '' ? 'none' : skipped}\n` +
    generatePlugin({ ...MZPARAMS_HOST, parameters: imported.parameters })
  )
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

  for (const c of typeViolatingDefaultCases) {
    it(`${c.name}: imported and generated`, async () => {
      expect.hasAssertions()
      await expect(renderDefaultCase(c)).toMatchFileSnapshot(`__golden__/generator/${c.name}.js`)
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
      expect(compileCheck(generatePlugin(entry(name).def), `${name}.js`), name).toBeNull()
    }
  })
})
