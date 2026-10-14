// What the parser makes of each fixture plugin, with its random ids numbered by appearance.
import { describe, it, expect } from 'vitest'
import { normaliseIds } from './corpus/normalise'
import { fixturePlugins, loadFixture } from './corpus/raw-mode'

const fixtures = fixturePlugins()
const stem = (file: string): string => file.replace(/\.js$/, '')

describe('parser goldens', () => {
  it('finds the fixture plugins', () => {
    expect(fixtures.length).toBeGreaterThan(0)
  })

  for (const file of fixtures) {
    it(`${stem(file)}: parsePlugin`, async () => {
      await expect(
        normaliseIds(JSON.stringify(loadFixture(file), null, 2)) + '\n'
      ).toMatchFileSnapshot(`__golden__/parser/${stem(file)}.json`)
    })
  }
})
