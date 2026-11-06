// What the parser makes of each fixture plugin and each synthetic pattern case, with its random
// ids numbered by appearance.
import { describe, it, expect } from 'vitest'
import { PluginParser } from '../../src/main/services/pluginParser'
import { normaliseIds } from './corpus/normalise'
import { parserPatternCases } from './corpus/parser-patterns'
import { fixturePlugins, loadFixture } from './corpus/raw-mode'

const fixtures = fixturePlugins()
const stem = (file: string): string => file.replace(/\.js$/, '')

describe('parser goldens', () => {
  it('finds the fixture plugins', () => {
    expect(fixtures.length).toBeGreaterThan(0)
  })

  it.each(fixtures.map((file) => ({ file, name: stem(file) })))(
    '$name: parsePlugin',
    async ({ file, name }) => {
      expect.assertions(1)

      const parsed = loadFixture(file)

      await expect(normaliseIds(JSON.stringify(parsed, null, 2)) + '\n').toMatchFileSnapshot(
        `__golden__/parser/${name}.json`
      )
    }
  )
})

describe('parser pattern goldens', () => {
  it('has pattern cases with distinct names', () => {
    const names = parserPatternCases.map((c) => c.name)

    expect(names.length).toBeGreaterThan(0)
    expect(new Set(names).size).toBe(names.length)
  })

  it.each(parserPatternCases)('pattern $name: parsePlugin', async ({ name, filename, source }) => {
    expect.assertions(1)

    const parsed = PluginParser.parsePlugin(source, filename)

    await expect(normaliseIds(JSON.stringify(parsed, null, 2)) + '\n').toMatchFileSnapshot(
      `__golden__/parser/pattern-${name}.json`
    )
  })
})
