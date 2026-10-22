import { beforeEach, describe, expect, it } from 'vitest'
import { usePluginStore } from '../../src/renderer/src/stores/pluginStore'
import { createEmptyPlugin } from '../../src/renderer/src/types/plugin'
import { toBaseline } from '../../src/shared/types/plugin'
import { PluginParser } from '../../src/main/services/pluginParser'
import { generateRawMode } from '../../src/renderer/src/lib/generator/index'
import type {
  PluginDefinition,
  PluginParameter,
  PluginCommand,
  PluginStruct
} from '../../src/renderer/src/types/plugin'

function makeParam(id: string, name: string): PluginParameter {
  return { id, name, text: name, desc: '', type: 'string', default: '' }
}

function makeCommand(id: string, name: string): PluginCommand {
  return { id, name, text: name, desc: '', args: [] }
}

function makeStruct(id: string, name: string): PluginStruct {
  return { id, name, parameters: [] }
}

function resetPluginStore() {
  localStorage.clear()
  usePluginStore.setState(usePluginStore.getInitialState(), true)
}

function createPlugin(name: string) {
  const plugin = createEmptyPlugin()
  plugin.meta.name = name
  return plugin
}

describe('pluginStore multi-plugin state', () => {
  beforeEach(() => {
    resetPluginStore()
  })

  it('keeps edits synced to the open plugin list and restores dirty state per plugin', () => {
    const alpha = createPlugin('Alpha')
    const beta = createPlugin('Beta')

    usePluginStore.getState().openPlugin(alpha)
    usePluginStore.getState().openPlugin(beta)
    usePluginStore.getState().setActivePlugin(alpha.id)
    usePluginStore.getState().updateMeta({ name: 'Alpha Updated' })

    expect(usePluginStore.getState().plugin.meta.name).toBe('Alpha Updated')
    expect(
      usePluginStore.getState().openPlugins.find((plugin) => plugin.id === alpha.id)?.meta.name
    ).toBe('Alpha Updated')
    expect(usePluginStore.getState().isDirty).toBe(true)

    usePluginStore.getState().setActivePlugin(beta.id)
    expect(usePluginStore.getState().plugin.id).toBe(beta.id)
    expect(usePluginStore.getState().isDirty).toBe(false)

    usePluginStore.getState().setActivePlugin(alpha.id)
    expect(usePluginStore.getState().plugin.meta.name).toBe('Alpha Updated')
    expect(usePluginStore.getState().isDirty).toBe(true)
  })

  it('tracks saved paths per plugin and does not clear dirty state on setPlugin', () => {
    const alpha = createPlugin('Alpha')
    const beta = createPlugin('Beta')

    usePluginStore.getState().openPlugin(alpha)
    usePluginStore.getState().updateMeta({ version: '1.1.0' })
    usePluginStore.getState().setSavedPath('/tmp/alpha.js')

    const alphaSnapshot = { ...usePluginStore.getState().plugin }
    usePluginStore.getState().setPlugin(alphaSnapshot)

    expect(usePluginStore.getState().isDirty).toBe(true)
    expect(usePluginStore.getState().savedPath).toBe('/tmp/alpha.js')

    usePluginStore.getState().openPlugin(beta)
    expect(usePluginStore.getState().savedPath).toBeNull()

    usePluginStore.getState().setSavedPath('/tmp/beta.js')
    usePluginStore.getState().setActivePlugin(alpha.id)
    expect(usePluginStore.getState().savedPath).toBe('/tmp/alpha.js')

    usePluginStore.getState().setActivePlugin(beta.id)
    expect(usePluginStore.getState().savedPath).toBe('/tmp/beta.js')
  })

  it('closes the active plugin and restores the previous tab with its saved state', () => {
    const alpha = createPlugin('Alpha')
    const beta = createPlugin('Beta')

    usePluginStore.getState().openPlugin(alpha)
    usePluginStore.getState().updateMeta({ description: 'Alpha changed' })
    usePluginStore.getState().setSavedPath('/tmp/alpha.js')

    usePluginStore.getState().openPlugin(beta)
    usePluginStore.getState().updateMeta({ description: 'Beta changed' })
    usePluginStore.getState().setSavedPath('/tmp/beta.js')

    usePluginStore.getState().closePlugin(beta.id)

    expect(usePluginStore.getState().openPlugins.map((plugin) => plugin.id)).toEqual([alpha.id])
    expect(usePluginStore.getState().activePluginId).toBe(alpha.id)
    expect(usePluginStore.getState().plugin.id).toBe(alpha.id)
    expect(usePluginStore.getState().isDirty).toBe(true)
    expect(usePluginStore.getState().savedPath).toBe('/tmp/alpha.js')
    expect(usePluginStore.getState().dirtyByPluginId).toEqual({ [alpha.id]: true })
    expect(usePluginStore.getState().savedPathsByPluginId).toEqual({
      [alpha.id]: '/tmp/alpha.js'
    })
  })

  it('clears per-plugin bookkeeping when dirty and saved path state are reset', () => {
    const alpha = createPlugin('Alpha')

    usePluginStore.getState().openPlugin(alpha)
    usePluginStore.getState().setDirty(true)
    usePluginStore.getState().setSavedPath('/tmp/alpha.js')

    expect(usePluginStore.getState().dirtyByPluginId).toEqual({ [alpha.id]: true })
    expect(usePluginStore.getState().savedPathsByPluginId).toEqual({
      [alpha.id]: '/tmp/alpha.js'
    })

    usePluginStore.getState().setDirty(false)
    usePluginStore.getState().setSavedPath(null)

    expect(usePluginStore.getState().isDirty).toBe(false)
    expect(usePluginStore.getState().savedPath).toBeNull()
    expect(usePluginStore.getState().dirtyByPluginId).toEqual({})
    expect(usePluginStore.getState().savedPathsByPluginId).toEqual({})
  })

  it('resets to a fresh editor state when the last open plugin is closed', () => {
    const alpha = createPlugin('Alpha')

    usePluginStore.getState().openPlugin(alpha)
    usePluginStore.getState().updateMeta({ description: 'Unsaved changes' })
    usePluginStore.getState().setSavedPath('/tmp/alpha.js')

    usePluginStore.getState().closePlugin(alpha.id)

    expect(usePluginStore.getState().openPlugins).toHaveLength(0)
    expect(usePluginStore.getState().activePluginId).toBeNull()
    expect(usePluginStore.getState().isDirty).toBe(false)
    expect(usePluginStore.getState().savedPath).toBeNull()
    expect(usePluginStore.getState().dirtyByPluginId).toEqual({})
    expect(usePluginStore.getState().savedPathsByPluginId).toEqual({})
    expect(usePluginStore.getState().plugin.meta.name).toBe('NewPlugin')
    expect(usePluginStore.getState().plugin.id).not.toBe(alpha.id)
  })

  it('ignores attempts to activate a plugin that is not open', () => {
    const alpha = createPlugin('Alpha')

    usePluginStore.getState().openPlugin(alpha)
    const snapshot = usePluginStore.getState()

    usePluginStore.getState().setActivePlugin('missing-plugin')

    expect(usePluginStore.getState().activePluginId).toBe(snapshot.activePluginId)
    expect(usePluginStore.getState().plugin.id).toBe(snapshot.plugin.id)
    expect(usePluginStore.getState().openPlugins).toEqual(snapshot.openPlugins)
  })
})

// COV-06: pluginStore CRUD operations
describe('pluginStore CRUD operations', () => {
  beforeEach(() => {
    localStorage.clear()
    usePluginStore.setState(usePluginStore.getInitialState(), true)
    // Open a plugin so we have an active context
    usePluginStore.getState().openPlugin(createPlugin('TestPlugin'))
  })

  describe('parameters', () => {
    it('addParameter appends and marks dirty', () => {
      usePluginStore.getState().addParameter(makeParam('p1', 'alpha'))
      const state = usePluginStore.getState()
      expect(state.plugin.parameters).toHaveLength(1)
      expect(state.plugin.parameters[0].name).toBe('alpha')
      expect(state.isDirty).toBe(true)
    })

    it('updateParameter mutates the matching param', () => {
      usePluginStore.getState().addParameter(makeParam('p1', 'alpha'))
      usePluginStore.getState().updateParameter('p1', { name: 'updated', type: 'number' })
      const param = usePluginStore.getState().plugin.parameters[0]
      expect(param.name).toBe('updated')
      expect(param.type).toBe('number')
    })

    it('removeParameter removes by id', () => {
      usePluginStore.getState().addParameter(makeParam('p1', 'keep'))
      usePluginStore.getState().addParameter(makeParam('p2', 'remove'))
      usePluginStore.getState().removeParameter('p2')
      const params = usePluginStore.getState().plugin.parameters
      expect(params).toHaveLength(1)
      expect(params[0].id).toBe('p1')
    })

    it('removeParameters with empty ids is a no-op', () => {
      usePluginStore.getState().addParameter(makeParam('p1', 'keep'))
      const before = usePluginStore.getState().plugin.parameters.length
      usePluginStore.getState().removeParameters([])
      expect(usePluginStore.getState().plugin.parameters).toHaveLength(before)
    })

    it('removeParameters no-op when ids do not match anything', () => {
      usePluginStore.getState().addParameter(makeParam('p1', 'keep'))
      usePluginStore.getState().removeParameters(['nonexistent'])
      expect(usePluginStore.getState().plugin.parameters).toHaveLength(1)
    })

    it('removeParameters removes multiple ids', () => {
      usePluginStore.getState().addParameter(makeParam('p1', 'a'))
      usePluginStore.getState().addParameter(makeParam('p2', 'b'))
      usePluginStore.getState().addParameter(makeParam('p3', 'c'))
      usePluginStore.getState().removeParameters(['p1', 'p3'])
      const params = usePluginStore.getState().plugin.parameters
      expect(params).toHaveLength(1)
      expect(params[0].id).toBe('p2')
    })

    it('reorderParameters swaps elements correctly', () => {
      usePluginStore.getState().addParameter(makeParam('p1', 'first'))
      usePluginStore.getState().addParameter(makeParam('p2', 'second'))
      usePluginStore.getState().addParameter(makeParam('p3', 'third'))
      usePluginStore.getState().reorderParameters(0, 2)
      const params = usePluginStore.getState().plugin.parameters
      expect(params[0].id).toBe('p2')
      expect(params[1].id).toBe('p3')
      expect(params[2].id).toBe('p1')
    })

    it('reorderParameters ignores out-of-bounds fromIndex', () => {
      usePluginStore.getState().addParameter(makeParam('p1', 'a'))
      usePluginStore.getState().addParameter(makeParam('p2', 'b'))
      const before = [...usePluginStore.getState().plugin.parameters]
      usePluginStore.getState().reorderParameters(99, 0)
      expect(usePluginStore.getState().plugin.parameters).toEqual(before)
    })

    it('reorderParameters ignores out-of-bounds toIndex', () => {
      usePluginStore.getState().addParameter(makeParam('p1', 'a'))
      usePluginStore.getState().addParameter(makeParam('p2', 'b'))
      const before = [...usePluginStore.getState().plugin.parameters]
      usePluginStore.getState().reorderParameters(0, 99)
      expect(usePluginStore.getState().plugin.parameters).toEqual(before)
    })
  })

  describe('commands', () => {
    it('addCommand appends and marks dirty', () => {
      usePluginStore.getState().addCommand(makeCommand('c1', 'DoThing'))
      const state = usePluginStore.getState()
      expect(state.plugin.commands).toHaveLength(1)
      expect(state.plugin.commands[0].name).toBe('DoThing')
      expect(state.isDirty).toBe(true)
    })

    it('updateCommand mutates the matching command', () => {
      usePluginStore.getState().addCommand(makeCommand('c1', 'DoThing'))
      usePluginStore.getState().updateCommand('c1', { name: 'Updated', desc: 'new desc' })
      const cmd = usePluginStore.getState().plugin.commands[0]
      expect(cmd.name).toBe('Updated')
      expect(cmd.desc).toBe('new desc')
    })

    it('removeCommand removes by id', () => {
      usePluginStore.getState().addCommand(makeCommand('c1', 'Keep'))
      usePluginStore.getState().addCommand(makeCommand('c2', 'Remove'))
      usePluginStore.getState().removeCommand('c2')
      const cmds = usePluginStore.getState().plugin.commands
      expect(cmds).toHaveLength(1)
      expect(cmds[0].id).toBe('c1')
    })

    it('addCommandArg appends arg to command', () => {
      usePluginStore.getState().addCommand(makeCommand('c1', 'DoThing'))
      usePluginStore.getState().addCommandArg('c1', makeParam('a1', 'target'))
      const args = usePluginStore.getState().plugin.commands[0].args
      expect(args).toHaveLength(1)
      expect(args[0].name).toBe('target')
    })

    it('updateCommandArg mutates the matching arg', () => {
      usePluginStore.getState().addCommand(makeCommand('c1', 'DoThing'))
      usePluginStore.getState().addCommandArg('c1', makeParam('a1', 'target'))
      usePluginStore.getState().updateCommandArg('c1', 'a1', { name: 'updated', type: 'number' })
      const arg = usePluginStore.getState().plugin.commands[0].args[0]
      expect(arg.name).toBe('updated')
      expect(arg.type).toBe('number')
    })

    it('removeCommandArg removes by argId', () => {
      usePluginStore.getState().addCommand(makeCommand('c1', 'DoThing'))
      usePluginStore.getState().addCommandArg('c1', makeParam('a1', 'keep'))
      usePluginStore.getState().addCommandArg('c1', makeParam('a2', 'remove'))
      usePluginStore.getState().removeCommandArg('c1', 'a2')
      const args = usePluginStore.getState().plugin.commands[0].args
      expect(args).toHaveLength(1)
      expect(args[0].id).toBe('a1')
    })
  })

  describe('structs', () => {
    it('addStruct appends and marks dirty', () => {
      usePluginStore.getState().addStruct(makeStruct('s1', 'Position'))
      const state = usePluginStore.getState()
      expect(state.plugin.structs).toHaveLength(1)
      expect(state.plugin.structs[0].name).toBe('Position')
      expect(state.isDirty).toBe(true)
    })

    it('updateStruct mutates the matching struct', () => {
      usePluginStore.getState().addStruct(makeStruct('s1', 'Position'))
      usePluginStore.getState().updateStruct('s1', { name: 'Location' })
      expect(usePluginStore.getState().plugin.structs[0].name).toBe('Location')
    })

    it('removeStruct removes by id', () => {
      usePluginStore.getState().addStruct(makeStruct('s1', 'Keep'))
      usePluginStore.getState().addStruct(makeStruct('s2', 'Remove'))
      usePluginStore.getState().removeStruct('s2')
      const structs = usePluginStore.getState().plugin.structs
      expect(structs).toHaveLength(1)
      expect(structs[0].id).toBe('s1')
    })

    it('addStructParam appends param to struct', () => {
      usePluginStore.getState().addStruct(makeStruct('s1', 'Position'))
      usePluginStore.getState().addStructParam('s1', makeParam('sp1', 'x'))
      const params = usePluginStore.getState().plugin.structs[0].parameters
      expect(params).toHaveLength(1)
      expect(params[0].name).toBe('x')
    })

    it('updateStructParam mutates the matching struct param', () => {
      usePluginStore.getState().addStruct(makeStruct('s1', 'Position'))
      usePluginStore.getState().addStructParam('s1', makeParam('sp1', 'x'))
      usePluginStore.getState().updateStructParam('s1', 'sp1', { name: 'coordX', type: 'number' })
      const param = usePluginStore.getState().plugin.structs[0].parameters[0]
      expect(param.name).toBe('coordX')
      expect(param.type).toBe('number')
    })

    it('removeStructParam removes by paramId', () => {
      usePluginStore.getState().addStruct(makeStruct('s1', 'Position'))
      usePluginStore.getState().addStructParam('s1', makeParam('sp1', 'keep'))
      usePluginStore.getState().addStructParam('s1', makeParam('sp2', 'remove'))
      usePluginStore.getState().removeStructParam('s1', 'sp2')
      const params = usePluginStore.getState().plugin.structs[0].parameters
      expect(params).toHaveLength(1)
      expect(params[0].id).toBe('sp1')
    })
  })

  describe('setCustomCode and updateMeta', () => {
    it('setCustomCode updates customCode and marks dirty', () => {
      usePluginStore.getState().setCustomCode('// my custom code')
      const state = usePluginStore.getState()
      expect(state.plugin.customCode).toBe('// my custom code')
      expect(state.isDirty).toBe(true)
    })

    it('updateMeta updates meta fields and syncs to openPlugins', () => {
      usePluginStore.getState().updateMeta({ version: '2.0.0', author: 'NewAuthor' })
      const state = usePluginStore.getState()
      expect(state.plugin.meta.version).toBe('2.0.0')
      expect(state.plugin.meta.author).toBe('NewAuthor')
      const inOpenPlugins = state.openPlugins.find((p) => p.id === state.plugin.id)
      expect(inOpenPlugins?.meta.version).toBe('2.0.0')
    })
  })

  describe('resetPlugin', () => {
    it('resets the full store to initial state', () => {
      usePluginStore.getState().addParameter(makeParam('p1', 'alpha'))
      expect(usePluginStore.getState().isDirty).toBe(true)

      usePluginStore.getState().resetPlugin()
      const state = usePluginStore.getState()
      // After reset: empty plugin, no open plugins, not dirty
      expect(state.plugin.parameters).toHaveLength(0)
      expect(state.openPlugins).toHaveLength(0)
      expect(state.activePluginId).toBeNull()
      expect(state.isDirty).toBe(false)
    })
  })
})

describe('pluginStore baseline of an imported plugin', () => {
  beforeEach(() => {
    resetPluginStore()
  })

  function importedPlugin(name: string): PluginDefinition {
    const plugin = createPlugin(name)
    return {
      ...plugin,
      parameters: [makeParam('p1', 'alpha')],
      codeBody: '(() => {})();',
      customCode: '',
      rawSource: `/*:\n * @param alpha\n */\n(() => {})();\n`,
      importedFrom: `${name}.js`
    }
  }

  const baselines = (): Record<string, unknown> => usePluginStore.getState().baselineByPluginId

  it('records the definition an imported plugin was opened with, once', () => {
    const alpha = importedPlugin('Alpha')
    usePluginStore.getState().openPlugin(alpha)
    expect(baselines()).toEqual({ [alpha.id]: toBaseline(alpha) })
    expect(baselines()[alpha.id]).not.toHaveProperty('rawSource')
    expect(baselines()[alpha.id]).not.toHaveProperty('codeBody')
    expect(baselines()[alpha.id]).not.toHaveProperty('customCode')

    usePluginStore.getState().updateMeta({ description: 'Edited' })
    usePluginStore.getState().openPlugin(usePluginStore.getState().plugin)
    expect(baselines()).toEqual({ [alpha.id]: toBaseline(alpha) })
  })

  it('records none for a plugin created here or an import without its file text', () => {
    const { rawSource: _rawSource, ...missing } = importedPlugin('Beta')
    usePluginStore.getState().openPlugin(createPlugin('Alpha'))
    usePluginStore.getState().openPlugin(missing)
    expect(baselines()).toEqual({})
  })

  it('drops the baseline when its tab closes or the store resets', () => {
    const alpha = importedPlugin('Alpha')
    const beta = importedPlugin('Beta')
    usePluginStore.getState().openPlugin(alpha)
    usePluginStore.getState().openPlugin(beta)
    usePluginStore.getState().closePlugin(alpha.id)
    expect(Object.keys(baselines())).toEqual([beta.id])
    usePluginStore.getState().resetPlugin()
    expect(baselines()).toEqual({})
  })

  it('saves the file text, file name and baseline but not the code body', () => {
    const alpha = importedPlugin('Alpha')
    usePluginStore.getState().openPlugin(alpha)
    const saved = JSON.parse(localStorage.getItem('mz-plugin-studio-plugin') ?? '{}').state
    expect(saved.schemaVersion).toBe(2)
    for (const def of [saved.plugin, saved.openPlugins[0]]) {
      expect(def.rawSource).toBe(alpha.rawSource)
      expect(def.importedFrom).toBe('Alpha.js')
      expect(def).not.toHaveProperty('codeBody')
    }
    expect(saved.baselineByPluginId).toEqual({
      [alpha.id]: JSON.parse(JSON.stringify(toBaseline(alpha)))
    })
  })
})

describe('pluginStore file text of an imported plugin', () => {
  beforeEach(() => {
    resetPluginStore()
  })

  function importedPlugin(name: string): PluginDefinition {
    return {
      ...createPlugin(name),
      parameters: [makeParam('p1', 'alpha')],
      rawSource: `/*:\n * @param alpha\n */\n(() => {})();\n`,
      importedFrom: `${name}.js`
    }
  }

  it('reattachSource gives a tab its file text and that file as the baseline, keeping edits', () => {
    const { rawSource: _rawSource, ...missing } = importedPlugin('Alpha')
    const other = createPlugin('Other')
    const text = `/*:\n * @plugindesc On disk\n * @param alpha\n */\n(() => {})();\n`
    const parsed: PluginDefinition = {
      ...createPlugin('ParsedName'),
      meta: { ...createPlugin('ParsedName').meta, description: 'On disk' },
      parameters: [makeParam('p9', 'alpha')],
      rawSource: text,
      codeBody: '(() => {})();'
    }

    for (const active of [false, true]) {
      resetPluginStore()
      usePluginStore.getState().openPlugin(missing)
      usePluginStore.getState().updateMeta({ description: 'Edited' })
      if (!active) usePluginStore.getState().openPlugin(other)
      usePluginStore.getState().reattachSource(missing.id, text, parsed)

      const state = usePluginStore.getState()
      const tab = state.openPlugins.find((p) => p.id === missing.id)
      expect(tab?.rawSource).toBe(text)
      expect(tab?.meta.description).toBe('Edited')
      expect(state.plugin.id).toBe(active ? missing.id : other.id)
      if (active) expect(state.plugin.rawSource).toBe(text)
      expect(state.dirtyByPluginId[missing.id]).toBe(true)
      expect(state.baselineByPluginId[missing.id]).toEqual(
        toBaseline({
          ...parsed,
          id: missing.id,
          importedFrom: 'Alpha.js',
          meta: { ...parsed.meta, name: 'Alpha' }
        })
      )
    }
  })

  it('recordSaved makes the written text the file text and the saved definition the baseline', () => {
    const alpha = importedPlugin('Alpha')
    usePluginStore.getState().openPlugin(alpha)
    usePluginStore.getState().updateMeta({ description: 'Edited' })
    const saved = usePluginStore.getState().plugin
    usePluginStore.getState().updateMeta({ description: 'Edited after the save started' })
    usePluginStore.getState().recordSaved(alpha.id, saved, 'written text')

    const state = usePluginStore.getState()
    expect(state.plugin.rawSource).toBe('written text')
    expect(state.plugin.meta.description).toBe('Edited after the save started')
    expect(state.openPlugins[0].rawSource).toBe('written text')
    expect(state.baselineByPluginId[alpha.id]).toEqual(toBaseline(saved))
  })

  it('recordSaved leaves a plugin created here without file text or baseline', () => {
    const created = createPlugin('Created')
    usePluginStore.getState().openPlugin(created)
    usePluginStore.getState().recordSaved(created.id, created, 'written text')
    const state = usePluginStore.getState()
    expect(state.plugin.rawSource).toBeUndefined()
    expect(state.openPlugins[0].rawSource).toBeUndefined()
    expect(state.baselineByPluginId).toEqual({})
  })
})

describe('pluginStore type edits on an imported plugin', () => {
  const SOURCE = `/*:
 * @target MZ
 * @plugindesc Type edits
 *
 * @param rate
 * @type Number
 * @default 1
 *
 * @param list
 * @type struct<Entry>[]
 * @default []
 *
 * @command run
 * @arg mode
 * @type multiline_string
 */
/*~struct~Entry:
 * @param label
 * @type multiline_string
 */
/*~struct~Other:
 * @param x
 */
(() => {})();
`

  beforeEach(() => {
    resetPluginStore()
  })

  it('a changed type reaches the saved file; other edits keep the imported type text', () => {
    const imported = {
      ...PluginParser.parsePlugin(SOURCE, 'TypeEdits.js'),
      importedFrom: 'TypeEdits.js'
    }
    const store = usePluginStore.getState()
    store.openPlugin(imported)
    const id = (name: string) => imported.parameters.find((p) => p.name === name)!.id
    const command = imported.commands[0]
    const entry = imported.structs.find((s) => s.name === 'Entry')!

    store.updateParameter(id('rate'), { desc: 'Edited' })
    expect(usePluginStore.getState().plugin.parameters[0].rawType).toBe('Number')

    store.updateParameter(id('rate'), { type: 'string' })
    store.updateParameter(id('list'), { structType: 'Other' })
    store.updateCommandArg(command.id, command.args[0].id, { type: 'number' })
    store.updateStructParam(entry.id, entry.parameters[0].id, { type: 'string' })

    const state = usePluginStore.getState()
    const saved = PluginParser.parsePlugin(
      generateRawMode(state.plugin, state.baselineByPluginId[imported.id]),
      'TypeEdits.js'
    )
    const types = (params: PluginParameter[]) =>
      params.map((p) => [p.name, p.rawType ?? p.type, p.structType])
    expect(types(saved.parameters)).toEqual([
      ['rate', 'string', undefined],
      ['list', 'struct<Other>[]', 'Other']
    ])
    expect(types(saved.commands[0].args)).toEqual([['mode', 'number', undefined]])
    expect(types(saved.structs.find((s) => s.name === 'Entry')!.parameters)).toEqual([
      ['label', 'string', undefined]
    ])
  })
})
