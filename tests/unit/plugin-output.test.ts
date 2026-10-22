import { describe, expect, it } from 'vitest'
import { generatePlugin, generateRawMode } from '../../src/renderer/src/lib/generator'
import {
  generatePluginOutput,
  isImported,
  isRawMode,
  isSourceMissing
} from '../../src/renderer/src/lib/plugin-output'
import { createEmptyPlugin, toBaseline } from '../../src/shared/types/plugin'
import type { PluginDefinition } from '../../src/shared/types/plugin'
import { loadFixture } from '../golden/corpus/raw-mode'

const imported = (file: string): PluginDefinition => ({ ...loadFixture(file), importedFrom: file })

const withoutSource = (def: PluginDefinition): PluginDefinition => {
  const { rawSource: _rawSource, ...rest } = def
  return rest
}

describe('raw mode of a plugin', () => {
  it('is on for an imported plugin unless turned off, and never for an app-created one', () => {
    const created = createEmptyPlugin()
    const file = imported('Fixture_HandWritten.js')
    const table: [PluginDefinition, boolean | undefined, boolean][] = [
      [created, undefined, false],
      [created, true, false],
      [created, false, false],
      [file, undefined, true],
      [file, true, true],
      [file, false, false]
    ]
    for (const [plugin, choice, expected] of table) {
      expect(isRawMode(plugin, choice), `${plugin.meta.name} ${String(choice)}`).toBe(expected)
    }
  })

  it('an imported plugin without its file text is source missing', () => {
    const file = imported('Fixture_HandWritten.js')
    expect(isImported(file)).toBe(true)
    expect(isSourceMissing(file)).toBe(false)
    expect(isSourceMissing(withoutSource(file))).toBe(true)
    expect(isImported(createEmptyPlugin())).toBe(false)
    expect(isSourceMissing(createEmptyPlugin())).toBe(false)
  })
})

describe('generatePluginOutput', () => {
  it('regenerates the plugin with raw mode off and keeps the file with raw mode on', () => {
    const plugin = imported('Fixture_HandWritten.js')
    const baseline = toBaseline(plugin)
    expect(generatePluginOutput(plugin, false, baseline)).toEqual({
      ok: true,
      code: generatePlugin(plugin)
    })
    expect(generatePluginOutput(plugin, true, baseline)).toEqual({
      ok: true,
      code: generateRawMode(plugin)
    })
  })

  it('refuses raw mode without the file text or without the loaded definition', () => {
    const plugin = imported('Fixture_HandWritten.js')
    const message =
      'Not saved: the original file Fixture_HandWritten.js is not loaded. Turn raw mode off to save regenerated code.'
    expect(generatePluginOutput(withoutSource(plugin), true, toBaseline(plugin))).toEqual({
      ok: false,
      refusal: 'source-missing',
      message
    })
    expect(generatePluginOutput(plugin, true, null)).toEqual({
      ok: false,
      refusal: 'source-missing',
      message
    })
  })

  for (const file of ['Fixture_JaOnly.js', 'Fixture_NoBlock.js']) {
    it(`refuses header changes to ${file}, which has no main block`, () => {
      const plugin = imported(file)
      const edited = { ...plugin, meta: { ...plugin.meta, description: 'Edited description' } }
      expect(generatePluginOutput(edited, true, toBaseline(plugin))).toEqual({
        ok: false,
        refusal: 'header-without-main-block',
        message: `Header changes cannot be saved: ${file} has no main annotation block (/*: or /*:en). Undo the header changes, or turn raw mode off to save regenerated code.`
      })
    })

    it(`saves struct changes to ${file} into its own text`, () => {
      const plugin = imported(file)
      const edited: PluginDefinition = {
        ...plugin,
        structs: [{ id: 'added-struct', name: 'Added', parameters: [] }]
      }
      const out = generatePluginOutput(edited, true, toBaseline(plugin))
      expect(out.ok).toBe(true)
      const code = out.ok ? out.code : ''
      expect(code).toContain('/*~struct~Added:')
      for (const line of (plugin.rawSource ?? '').split('\n')) expect(code).toContain(line)
    })
  }
})
