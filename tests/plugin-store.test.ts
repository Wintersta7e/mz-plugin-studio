// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { usePluginStore } from '../src/renderer/src/stores/pluginStore'
import { createEmptyPlugin } from '../src/renderer/src/types/plugin'
import type { PluginParameter, PluginCommand, PluginStruct } from '../src/renderer/src/types/plugin'

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
