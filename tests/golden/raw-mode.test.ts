// Imported plugins written back by raw mode after each kind of edit, byte for byte, with whether
// the result still compiles.
import { describe, it, expect } from 'vitest'
import { generateRawMode } from '../../src/renderer/src/lib/generator/index'
import { compilePlugin } from '../helpers/evaluate-plugin'
import { EDITS, fixturePlugins, loadFixture } from './corpus/raw-mode'

const fixtures = fixturePlugins()
const stem = (file: string): string => file.replace(/\.js$/, '')

describe('raw-mode goldens', () => {
  for (const file of fixtures) {
    for (const edit of EDITS) {
      it(`${stem(file)}: ${edit.name}`, async () => {
        await expect(generateRawMode(edit.apply(loadFixture(file)))).toMatchFileSnapshot(
          `__golden__/raw-mode/${stem(file)}.${edit.name}.js`
        )
      })
    }
  }

  it('compile results', async () => {
    const parses: Record<string, boolean> = {}
    for (const file of fixtures) {
      for (const edit of EDITS) {
        const out = generateRawMode(edit.apply(loadFixture(file)))
        parses[`${stem(file)}.${edit.name}`] = compilePlugin(out, file) === null
      }
    }
    const failing = Object.values(parses).filter((parsed) => !parsed).length
    console.log(
      `raw-mode: fixtures ${fixtures.length} × edits ${EDITS.length}, parses false ${failing}`
    )
    expect(fixtures.length).toBeGreaterThan(0)
    await expect(JSON.stringify(parses, null, 2) + '\n').toMatchFileSnapshot(
      '__golden__/raw-mode/_parses.json'
    )
  })
})
