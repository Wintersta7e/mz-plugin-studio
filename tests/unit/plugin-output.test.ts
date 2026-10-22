import { describe, expect, it } from 'vitest'
import { generatePlugin, generateRawMode } from '../../src/renderer/src/lib/generator'
import {
  generatePluginOutput,
  isImported,
  isRawMode
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

  it('a plugin loaded from a file is imported, one created in the app is not', () => {
    expect(isImported(imported('Fixture_HandWritten.js'))).toBe(true)
    expect(isImported(createEmptyPlugin())).toBe(false)
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
      code: generateRawMode(plugin, baseline)
    })
  })

  it('refuses raw mode without the file text or without the loaded definition', () => {
    const plugin = imported('Fixture_HandWritten.js')
    const message =
      'Not saved: the original file Fixture_HandWritten.js is not loaded. Reload it from the project, or turn raw mode off to save regenerated code.'
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
      expect(code.replace('/*~struct~Added:\n */\n\n', '')).toBe(plugin.rawSource)
    })
  }

  it('saves header changes to a file whose English block stands in for the main block', () => {
    const plugin = imported('Fixture_EnJaOnly.js')
    const text = plugin.rawSource ?? ''
    const edited = { ...plugin, meta: { ...plugin.meta, description: 'Edited description' } }
    const out = generatePluginOutput(edited, true, toBaseline(plugin))
    expect(out.ok).toBe(true)
    const code = out.ok ? out.code : ''
    expect(code.startsWith('/*:en\n')).toBe(true)
    expect(code).toContain(' * @plugindesc Edited description\n')
    expect(code.endsWith(text.slice(text.indexOf('/*:ja')))).toBe(true)
  })

  it('keeps help written as the last tag of the block when a parameter is edited', () => {
    const plugin = imported('Fixture_Generated.js')
    const text = plugin.rawSource ?? ''
    const helpStart = text.indexOf(' * @help\n')
    const help = text.slice(helpStart, text.indexOf('*/', helpStart) + 2)
    const edited = {
      ...plugin,
      parameters: plugin.parameters.map((p, i) => (i === 0 ? { ...p, default: 42 } : p))
    }
    const out = generatePluginOutput(edited, true, toBaseline(plugin))
    expect(out.ok).toBe(true)
    const code = out.ok ? out.code : ''
    expect(code).toContain(' * @default 42\n')
    expect(help).toContain('Generated from a fixed definition.')
    expect(code).toContain(help)
  })
})
