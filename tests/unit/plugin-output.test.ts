import { describe, expect, it } from 'vitest'
import { generatePlugin, generateRawMode } from '../../src/renderer/src/lib/generator'
import {
  fileNameMismatch,
  generatePluginOutput,
  isImported,
  isRawMode
} from '../../src/renderer/src/lib/plugin-output'
import {
  createEmptyCommand,
  createEmptyParameter,
  createEmptyPlugin,
  toBaseline
} from '../../src/shared/types/plugin'
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

describe('fileNameMismatch', () => {
  const named = (
    name: string,
    { commands = false, parameters = false }: { commands?: boolean; parameters?: boolean }
  ): PluginDefinition => {
    const plugin = createEmptyPlugin()
    return {
      ...plugin,
      meta: { ...plugin.meta, name },
      commands: commands ? [createEmptyCommand()] : [],
      parameters: parameters ? [createEmptyParameter()] : []
    }
  }
  const both = named('Foo', { commands: true, parameters: true })
  // Generated code names the plugin in a string, as it always does
  const mismatch = (plugin: PluginDefinition, path: string): ReturnType<typeof fileNameMismatch> =>
    fileNameMismatch(plugin, path, generatePlugin(plugin))

  it('is null for a file named after the plugin', () => {
    expect(mismatch(both, 'Foo.js')).toBeNull()
  })

  it('loses only the commands when the names differ in letter case', () => {
    expect(mismatch(both, 'foo.js')).toEqual({ commands: true, parameters: false })
    expect(mismatch(named('Foo', { parameters: true }), 'FOO.js')).toBeNull()
  })

  it('loses commands and parameters under another name', () => {
    expect(mismatch(both, 'Bar.js')).toEqual({ commands: true, parameters: true })
    expect(mismatch(named('Foo', { commands: true }), 'Bar.js')).toEqual({
      commands: true,
      parameters: false
    })
    expect(mismatch(named('Foo', { parameters: true }), 'Bar.js')).toEqual({
      commands: false,
      parameters: true
    })
  })

  it('is null for another name when the plugin has neither', () => {
    expect(mismatch(named('Foo', {}), 'Bar.js')).toBeNull()
  })

  it('reads the name from the last path segment of either separator, any case of .js', () => {
    expect(mismatch(both, 'C:\\x\\Foo.JS')).toBeNull()
    expect(mismatch(both, '/tmp/sub/Foo.js')).toBeNull()
    expect(mismatch(both, '/tmp/Foo/Bar.js')).toEqual({ commands: true, parameters: true })
  })

  it('is null for a plugin with no name', () => {
    expect(mismatch(named('', { commands: true, parameters: true }), 'Bar.js')).toBeNull()
  })

  it('is null for code that reads its own name from its file instead of naming the plugin', () => {
    const code = [
      '(() => {',
      '  const name = document.currentScript.src.match(/([^/]+)\\.js$/)[1];',
      '  const params = PluginManager.parameters(name);',
      "  PluginManager.registerCommand(name, 'Show', () => {});",
      '})();'
    ].join('\n')
    expect(fileNameMismatch(both, 'Bar.js', code)).toBeNull()
  })

  it.each([`'Foo'`, `"Foo"`, '`Foo`'])(
    'loses commands and parameters under another name for code naming the plugin as %s',
    (literal) => {
      const code = `(() => { const params = PluginManager.parameters(${literal}); })();`
      expect(fileNameMismatch(both, 'Bar.js', code)).toEqual({ commands: true, parameters: true })
    }
  )

  it.each(["It's", 'A\\B', 'Say "Hi"'])('finds the name %s escaped in generated code', (name) => {
    expect(mismatch(named(name, { commands: true }), 'Bar.js')).toEqual({
      commands: true,
      parameters: false
    })
  })
})
