import { describe, expect, it } from 'vitest'
import { generatePlugin, generateRawMode } from '../src/renderer/src/lib/generator'
import { generatePluginOutput } from '../src/renderer/src/lib/plugin-output'
import { PluginParser } from '../src/main/services/pluginParser'
import { createEmptyPlugin } from '../src/renderer/src/types/plugin'

const importedPluginSource = `/*:
 * @target MZ
 * @author Test
 * @plugindesc Sample plugin
 */
(() => {
  const message = 'keep body';
  console.log(message);
})();
`

describe('generatePluginOutput', () => {
  it('uses raw mode output only when raw mode is enabled for an imported plugin', () => {
    const plugin = PluginParser.parsePlugin(importedPluginSource, 'SamplePlugin.js')

    expect(generatePluginOutput(plugin, false)).toBe(generatePlugin(plugin))
    expect(generatePluginOutput(plugin, true)).toBe(generateRawMode(plugin))
  })

  it('falls back to generated output when raw mode is enabled without an imported source', () => {
    const plugin = createEmptyPlugin()
    plugin.meta.name = 'GeneratedOnly'
    plugin.customCode = 'console.log("generated");'

    expect(generatePluginOutput(plugin, true)).toBe(generatePlugin(plugin))
  })

  it('treats an empty rawSource as unavailable and uses generated output', () => {
    const plugin = createEmptyPlugin()
    plugin.meta.name = 'EmptyRawSource'
    plugin.rawSource = ''

    expect(generatePluginOutput(plugin, true)).toBe(generatePlugin(plugin))
  })
})
