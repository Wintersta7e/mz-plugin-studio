// Imported plugins written back by raw mode after each kind of edit, byte for byte, with whether
// the result still compiles.
import { describe, it, expect } from 'vitest'
import { generateRawMode } from '../../src/renderer/src/lib/generator/index'
import { toBaseline } from '../../src/shared/types/plugin'
import { compileCheck } from '../../src/main/services/syntax-check'
import { EDITS, fixturePlugins, loadFixture } from './corpus/raw-mode'

const fixtures = fixturePlugins()
const stem = (file: string): string => file.replace(/\.js$/, '')

/** Raw mode's output for an edit of the fixture, against the fixture as it was opened. */
function rawMode(file: string, edit: (typeof EDITS)[number]): string {
  const opened = loadFixture(file)
  return generateRawMode(edit.apply(opened), toBaseline(opened))
}

describe('raw-mode goldens', () => {
  for (const file of fixtures) {
    for (const edit of EDITS) {
      it(`${stem(file)}: ${edit.name}`, async () => {
        await expect(rawMode(file, edit)).toMatchFileSnapshot(
          `__golden__/raw-mode/${stem(file)}.${edit.name}.js`
        )
      })
    }
  }

  it('compile results', async () => {
    const parses: Record<string, boolean> = {}
    for (const file of fixtures) {
      for (const edit of EDITS) {
        const out = rawMode(file, edit)
        parses[`${stem(file)}.${edit.name}`] = compileCheck(out, file) === null
      }
    }
    const total = Object.keys(parses).length
    const compiling = Object.values(parses).filter((parsed) => parsed).length
    console.log(
      `raw-mode: fixtures ${fixtures.length} × edits ${EDITS.length}, compiling ${compiling}/${total}`
    )
    expect(fixtures.length).toBeGreaterThan(0)
    expect(compiling).toBe(total)
    await expect(JSON.stringify(parses, null, 2) + '\n').toMatchFileSnapshot(
      '__golden__/raw-mode/_parses.json'
    )
  })
})
