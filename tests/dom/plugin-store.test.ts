import { beforeEach, describe, expect, it } from 'vitest'
import { usePluginStore } from '../../src/renderer/src/stores/pluginStore'
import {
  createEmptyPlugin,
  type PluginDefinition,
  type PluginParameter,
  type PluginCommand,
  type PluginStruct
} from '../../src/renderer/src/types/plugin'
import { toBaseline } from '../../src/shared/types/plugin'
import { PluginParser } from '../../src/main/services/pluginParser'
import { generateRawMode } from '../../src/renderer/src/lib/generator/index'
import { recordOf, recordsOf, savedStateOf } from './support/persisted-state'

type PluginState = ReturnType<typeof usePluginStore.getState>

function makeParam(id: string, name: string): PluginParameter {
  return { id, name, text: name, desc: '', type: 'string', default: '' }
}

function makeCommand(id: string, name: string): PluginCommand {
  return { id, name, text: name, desc: '', args: [] }
}

function makeStruct(id: string, name: string): PluginStruct {
  return { id, name, parameters: [] }
}

function resetPluginStore(): void {
  localStorage.clear()
  usePluginStore.setState(usePluginStore.getInitialState(), true)
}

function createPlugin(name: string): PluginDefinition {
  const plugin = createEmptyPlugin()
  plugin.meta.name = name
  return plugin
}

/**
Records that tab `id` was written to `path` from `saved`, as every save of the app does.
*/
function recordSave(id: string, path: string, saved = usePluginStore.getState().plugin): void {
  usePluginStore
    .getState()
    .recordSaves([{ id, saved, path, sha256: `sha of ${path}`, written: '' }])
}

const baseOf = (path: string): { path: string; sha256: string } => ({
  path,
  sha256: `sha of ${path}`
})

// The open tab `id`, which must be open
function openTab(id: string): PluginDefinition {
  const tab = usePluginStore.getState().openPlugins.find((p) => p.id === id)
  if (tab === undefined) throw new Error(`no tab ${id} is open`)
  return tab
}

// The first of `items`, which must hold one
function first<T>(items: readonly T[], what: string): T {
  const item = items.at(0)
  if (item === undefined) throw new Error(`there is no ${what}`)
  return item
}

// The item of `items` named `name`, which must be there
function named<T extends { name: string }>(items: readonly T[], name: string): T {
  const item = items.find((candidate) => candidate.name === name)
  if (item === undefined) throw new Error(`there is no ${name}`)
  return item
}

const idsOf = (items: readonly { id: string }[]): string[] => items.map((item) => item.id)

// The active tab's id and name, and whether it is dirty
function active(): { id: string; name: string; isDirty: boolean } {
  const { plugin, isDirty } = usePluginStore.getState()
  return { id: plugin.id, name: plugin.meta.name, isDirty }
}

function baselineOf(id: string): PluginState['baselineByPluginId'][string] {
  const baseline = new Map(Object.entries(usePluginStore.getState().baselineByPluginId)).get(id)
  if (baseline === undefined) throw new Error(`tab ${id} has no baseline`)
  return baseline
}

const baselines = (): Record<string, unknown> => usePluginStore.getState().baselineByPluginId

// `plugin` without its file text
function withoutFileText(plugin: PluginDefinition): PluginDefinition {
  const copy = { ...plugin }
  delete copy.rawSource
  return copy
}

const FILE_TEXT = `/*:\n * @param alpha\n */\n(() => {})();\n`

// An imported plugin holding its file text, code body and custom code
function importedWithCode(name: string): PluginDefinition {
  const plugin = createPlugin(name)
  return {
    ...plugin,
    parameters: [makeParam('p1', 'alpha')],
    codeBody: '(() => {})();',
    customCode: '',
    rawSource: FILE_TEXT,
    importedFrom: `${name}.js`
  }
}

// The imported plugin Alpha with its file text
function importedAlpha(): PluginDefinition {
  return {
    ...createPlugin('Alpha'),
    parameters: [makeParam('p1', 'alpha')],
    rawSource: FILE_TEXT,
    importedFrom: 'Alpha.js'
  }
}

const typesOf = (params: PluginParameter[]): (string | undefined)[][] =>
  params.map((p) => [p.name, p.rawType ?? p.type, p.structType])

// Alpha imported without its file text, another tab, and the file Alpha is reattached to
function reattachFixture(): {
  missing: PluginDefinition
  other: PluginDefinition
  text: string
  parsed: PluginDefinition
  fromFile: PluginDefinition
  base: { path: string; sha256: string }
} {
  const missing = withoutFileText(importedAlpha())
  const text = `/*:\n * @plugindesc On disk\n * @param alpha\n */\n(() => {})();\n`
  const parsed: PluginDefinition = {
    ...createPlugin('ParsedName'),
    meta: { ...createPlugin('ParsedName').meta, description: 'On disk' },
    parameters: [makeParam('p9', 'alpha')],
    rawSource: text,
    codeBody: '(() => {})();'
  }
  const fromFile: PluginDefinition = {
    ...parsed,
    id: missing.id,
    importedFrom: 'Alpha.js',
    meta: { ...parsed.meta, name: 'Alpha' }
  }
  const base = { path: '/p/js/plugins/Alpha.js', sha256: 'on disk' }
  return { missing, other: createPlugin('Other'), text, parsed, fromFile, base }
}

function setUpCrud(): void {
  resetPluginStore()
  // Open a plugin so we have an active context
  usePluginStore.getState().openPlugin(createPlugin('TestPlugin'))
}

describe('pluginStore multi-plugin state: edits and saved paths', () => {
  beforeEach(resetPluginStore)

  it('keeps edits synced to the open plugin list and restores dirty state per plugin', () => {
    const alpha = createPlugin('Alpha')
    const beta = createPlugin('Beta')

    usePluginStore.getState().openPlugin(alpha)
    usePluginStore.getState().openPlugin(beta)
    usePluginStore.getState().setActivePlugin(alpha.id)
    usePluginStore.getState().updateMeta({ name: 'Alpha Updated' })

    expect({ ...active(), listedName: openTab(alpha.id).meta.name }).toStrictEqual({
      id: alpha.id,
      name: 'Alpha Updated',
      isDirty: true,
      listedName: 'Alpha Updated'
    })

    usePluginStore.getState().setActivePlugin(beta.id)

    expect(active()).toStrictEqual({ id: beta.id, name: 'Beta', isDirty: false })

    usePluginStore.getState().setActivePlugin(alpha.id)

    expect(active()).toStrictEqual({ id: alpha.id, name: 'Alpha Updated', isDirty: true })
  })

  it('tracks saved paths per plugin and does not clear dirty state on setPlugin', () => {
    const alpha = createPlugin('Alpha')
    const beta = createPlugin('Beta')

    usePluginStore.getState().openPlugin(alpha)
    const beforeEdit = usePluginStore.getState().plugin
    usePluginStore.getState().updateMeta({ version: '1.1.0' })
    // The edit was made while the file was written, so the tab stays unsaved
    recordSave(alpha.id, '/games/alpha.js', beforeEdit)

    const alphaSnapshot = { ...usePluginStore.getState().plugin }
    usePluginStore.getState().setPlugin(alphaSnapshot)
    const { isDirty, savedPath } = usePluginStore.getState()

    expect({ isDirty, savedPath }).toStrictEqual({ isDirty: true, savedPath: '/games/alpha.js' })

    usePluginStore.getState().openPlugin(beta)

    expect(usePluginStore.getState().savedPath).toBeNull()

    recordSave(beta.id, '/games/beta.js')
    usePluginStore.getState().setActivePlugin(alpha.id)

    expect(usePluginStore.getState().savedPath).toBe('/games/alpha.js')

    usePluginStore.getState().setActivePlugin(beta.id)
    const state = usePluginStore.getState()

    expect({ savedPath: state.savedPath, baseByPluginId: state.baseByPluginId }).toStrictEqual({
      savedPath: '/games/beta.js',
      baseByPluginId: {
        [alpha.id]: baseOf('/games/alpha.js'),
        [beta.id]: baseOf('/games/beta.js')
      }
    })
  })
})

describe('pluginStore multi-plugin state: closing tabs', () => {
  beforeEach(resetPluginStore)

  it('closes the active plugin and restores the previous tab with its saved state', () => {
    const alpha = createPlugin('Alpha')
    const beta = createPlugin('Beta')

    usePluginStore.getState().openPlugin(alpha)
    recordSave(alpha.id, '/games/alpha.js')
    usePluginStore.getState().updateMeta({ description: 'Alpha changed' })

    usePluginStore.getState().openPlugin(beta)
    recordSave(beta.id, '/games/beta.js')
    usePluginStore.getState().updateMeta({ description: 'Beta changed' })

    usePluginStore.getState().closePlugin(beta.id)
    const state = usePluginStore.getState()

    expect({
      openIds: idsOf(state.openPlugins),
      activePluginId: state.activePluginId,
      activeId: state.plugin.id,
      isDirty: state.isDirty,
      savedPath: state.savedPath,
      dirtyByPluginId: state.dirtyByPluginId,
      savedPathsByPluginId: state.savedPathsByPluginId,
      baseByPluginId: state.baseByPluginId
    }).toStrictEqual({
      openIds: [alpha.id],
      activePluginId: alpha.id,
      activeId: alpha.id,
      isDirty: true,
      savedPath: '/games/alpha.js',
      dirtyByPluginId: { [alpha.id]: true },
      savedPathsByPluginId: { [alpha.id]: '/games/alpha.js' },
      baseByPluginId: { [alpha.id]: baseOf('/games/alpha.js') }
    })
  })

  it('resets to a fresh editor state when the last open plugin is closed', () => {
    const alpha = createPlugin('Alpha')

    usePluginStore.getState().openPlugin(alpha)
    recordSave(alpha.id, '/games/alpha.js')
    usePluginStore.getState().updateMeta({ description: 'Unsaved changes' })

    usePluginStore.getState().closePlugin(alpha.id)
    const state = usePluginStore.getState()

    expect({
      openPlugins: state.openPlugins,
      isDirty: state.isDirty,
      dirtyByPluginId: state.dirtyByPluginId,
      savedPathsByPluginId: state.savedPathsByPluginId,
      baseByPluginId: state.baseByPluginId,
      name: state.plugin.meta.name,
      isAlpha: state.plugin.id === alpha.id
    }).toStrictEqual({
      openPlugins: [],
      isDirty: false,
      dirtyByPluginId: {},
      savedPathsByPluginId: {},
      baseByPluginId: {},
      name: 'NewPlugin',
      isAlpha: false
    })
    expect(state.activePluginId).toBeNull()
    expect(state.savedPath).toBeNull()
  })
})

describe('pluginStore multi-plugin state: dirty state and activation', () => {
  beforeEach(resetPluginStore)

  it('clears per-plugin dirty bookkeeping when dirty state is reset', () => {
    const alpha = createPlugin('Alpha')

    usePluginStore.getState().openPlugin(alpha)
    usePluginStore.getState().setDirty(true)

    expect(usePluginStore.getState().dirtyByPluginId).toStrictEqual({ [alpha.id]: true })

    usePluginStore.getState().setDirty(false)

    expect(usePluginStore.getState().isDirty).toBe(false)
    expect(usePluginStore.getState().dirtyByPluginId).toStrictEqual({})
  })

  it('ignores attempts to activate a plugin that is not open', () => {
    const alpha = createPlugin('Alpha')

    usePluginStore.getState().openPlugin(alpha)
    const snapshot = usePluginStore.getState()

    usePluginStore.getState().setActivePlugin('missing-plugin')

    expect(usePluginStore.getState().activePluginId).toBe(snapshot.activePluginId)
    expect(usePluginStore.getState().plugin.id).toBe(snapshot.plugin.id)
    expect(usePluginStore.getState().openPlugins).toStrictEqual(snapshot.openPlugins)
  })
})

// COV-06: pluginStore CRUD operations
describe('pluginStore CRUD operations: parameters', () => {
  beforeEach(setUpCrud)

  it('addParameter appends and marks dirty', () => {
    usePluginStore.getState().addParameter(makeParam('p1', 'alpha'))
    const state = usePluginStore.getState()

    expect(state.plugin.parameters.map((p) => p.name)).toStrictEqual(['alpha'])
    expect(state.isDirty).toBe(true)
  })

  it('updateParameter mutates the matching param', () => {
    usePluginStore.getState().addParameter(makeParam('p1', 'alpha'))
    usePluginStore.getState().updateParameter('p1', { name: 'updated', type: 'number' })

    expect(usePluginStore.getState().plugin.parameters).toMatchObject([
      { name: 'updated', type: 'number' }
    ])
  })

  it('removeParameter removes by id', () => {
    usePluginStore.getState().addParameter(makeParam('p1', 'keep'))
    usePluginStore.getState().addParameter(makeParam('p2', 'remove'))
    usePluginStore.getState().removeParameter('p2')

    expect(idsOf(usePluginStore.getState().plugin.parameters)).toStrictEqual(['p1'])
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

    expect(idsOf(usePluginStore.getState().plugin.parameters)).toStrictEqual(['p2'])
  })

  it('reorderParameters swaps elements correctly', () => {
    usePluginStore.getState().addParameter(makeParam('p1', 'first'))
    usePluginStore.getState().addParameter(makeParam('p2', 'second'))
    usePluginStore.getState().addParameter(makeParam('p3', 'third'))
    usePluginStore.getState().reorderParameters(0, 2)

    expect(idsOf(usePluginStore.getState().plugin.parameters)).toStrictEqual(['p2', 'p3', 'p1'])
  })

  it('reorderParameters ignores out-of-bounds fromIndex', () => {
    usePluginStore.getState().addParameter(makeParam('p1', 'a'))
    usePluginStore.getState().addParameter(makeParam('p2', 'b'))
    const before = [...usePluginStore.getState().plugin.parameters]
    usePluginStore.getState().reorderParameters(99, 0)

    expect(usePluginStore.getState().plugin.parameters).toStrictEqual(before)
  })

  it('reorderParameters ignores out-of-bounds toIndex', () => {
    usePluginStore.getState().addParameter(makeParam('p1', 'a'))
    usePluginStore.getState().addParameter(makeParam('p2', 'b'))
    const before = [...usePluginStore.getState().plugin.parameters]
    usePluginStore.getState().reorderParameters(0, 99)

    expect(usePluginStore.getState().plugin.parameters).toStrictEqual(before)
  })
})

describe('pluginStore CRUD operations: commands', () => {
  beforeEach(setUpCrud)

  it('addCommand appends and marks dirty', () => {
    usePluginStore.getState().addCommand(makeCommand('c1', 'DoThing'))
    const state = usePluginStore.getState()

    expect(state.plugin.commands.map((c) => c.name)).toStrictEqual(['DoThing'])
    expect(state.isDirty).toBe(true)
  })

  it('updateCommand mutates the matching command', () => {
    usePluginStore.getState().addCommand(makeCommand('c1', 'DoThing'))
    usePluginStore.getState().updateCommand('c1', { name: 'Updated', desc: 'new desc' })

    expect(usePluginStore.getState().plugin.commands).toMatchObject([
      { name: 'Updated', desc: 'new desc' }
    ])
  })

  it('removeCommand removes by id', () => {
    usePluginStore.getState().addCommand(makeCommand('c1', 'Keep'))
    usePluginStore.getState().addCommand(makeCommand('c2', 'Remove'))
    usePluginStore.getState().removeCommand('c2')

    expect(idsOf(usePluginStore.getState().plugin.commands)).toStrictEqual(['c1'])
  })

  it('addCommandArg appends arg to command', () => {
    usePluginStore.getState().addCommand(makeCommand('c1', 'DoThing'))
    usePluginStore.getState().addCommandArg('c1', makeParam('a1', 'target'))
    const { args } = first(usePluginStore.getState().plugin.commands, 'command')

    expect(args.map((a) => a.name)).toStrictEqual(['target'])
  })

  it('updateCommandArg mutates the matching arg', () => {
    usePluginStore.getState().addCommand(makeCommand('c1', 'DoThing'))
    usePluginStore.getState().addCommandArg('c1', makeParam('a1', 'target'))
    usePluginStore.getState().updateCommandArg('c1', 'a1', { name: 'updated', type: 'number' })
    const { args } = first(usePluginStore.getState().plugin.commands, 'command')

    expect(args).toMatchObject([{ name: 'updated', type: 'number' }])
  })

  it('removeCommandArg removes by argId', () => {
    usePluginStore.getState().addCommand(makeCommand('c1', 'DoThing'))
    usePluginStore.getState().addCommandArg('c1', makeParam('a1', 'keep'))
    usePluginStore.getState().addCommandArg('c1', makeParam('a2', 'remove'))
    usePluginStore.getState().removeCommandArg('c1', 'a2')
    const { args } = first(usePluginStore.getState().plugin.commands, 'command')

    expect(idsOf(args)).toStrictEqual(['a1'])
  })
})

describe('pluginStore CRUD operations: structs', () => {
  beforeEach(setUpCrud)

  it('addStruct appends and marks dirty', () => {
    usePluginStore.getState().addStruct(makeStruct('s1', 'Position'))
    const state = usePluginStore.getState()

    expect(state.plugin.structs.map((s) => s.name)).toStrictEqual(['Position'])
    expect(state.isDirty).toBe(true)
  })

  it('updateStruct mutates the matching struct', () => {
    usePluginStore.getState().addStruct(makeStruct('s1', 'Position'))
    usePluginStore.getState().updateStruct('s1', { name: 'Location' })

    expect(first(usePluginStore.getState().plugin.structs, 'struct').name).toBe('Location')
  })

  it('removeStruct removes by id', () => {
    usePluginStore.getState().addStruct(makeStruct('s1', 'Keep'))
    usePluginStore.getState().addStruct(makeStruct('s2', 'Remove'))
    usePluginStore.getState().removeStruct('s2')

    expect(idsOf(usePluginStore.getState().plugin.structs)).toStrictEqual(['s1'])
  })

  it('addStructParam appends param to struct', () => {
    usePluginStore.getState().addStruct(makeStruct('s1', 'Position'))
    usePluginStore.getState().addStructParam('s1', makeParam('sp1', 'x'))
    const { parameters } = first(usePluginStore.getState().plugin.structs, 'struct')

    expect(parameters.map((p) => p.name)).toStrictEqual(['x'])
  })

  it('updateStructParam mutates the matching struct param', () => {
    usePluginStore.getState().addStruct(makeStruct('s1', 'Position'))
    usePluginStore.getState().addStructParam('s1', makeParam('sp1', 'x'))
    usePluginStore.getState().updateStructParam('s1', 'sp1', { name: 'coordX', type: 'number' })
    const { parameters } = first(usePluginStore.getState().plugin.structs, 'struct')

    expect(parameters).toMatchObject([{ name: 'coordX', type: 'number' }])
  })

  it('removeStructParam removes by paramId', () => {
    usePluginStore.getState().addStruct(makeStruct('s1', 'Position'))
    usePluginStore.getState().addStructParam('s1', makeParam('sp1', 'keep'))
    usePluginStore.getState().addStructParam('s1', makeParam('sp2', 'remove'))
    usePluginStore.getState().removeStructParam('s1', 'sp2')
    const { parameters } = first(usePluginStore.getState().plugin.structs, 'struct')

    expect(idsOf(parameters)).toStrictEqual(['sp1'])
  })
})

describe('pluginStore CRUD operations: setCustomCode and updateMeta', () => {
  beforeEach(setUpCrud)

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

describe('pluginStore baseline of an imported plugin', () => {
  beforeEach(resetPluginStore)

  it('records the definition an imported plugin was opened with, once', () => {
    const alpha = importedWithCode('Alpha')
    usePluginStore.getState().openPlugin(alpha)
    const baseline = recordOf(baselines()[alpha.id], 'the baseline')

    expect(baselines()).toStrictEqual({ [alpha.id]: toBaseline(alpha) })
    expect(
      ['rawSource', 'codeBody', 'customCode'].filter((key) => Object.hasOwn(baseline, key))
    ).toStrictEqual([])

    usePluginStore.getState().updateMeta({ description: 'Edited' })
    usePluginStore.getState().openPlugin(usePluginStore.getState().plugin)

    expect(baselines()).toStrictEqual({ [alpha.id]: toBaseline(alpha) })
  })

  it('records none for a plugin created here or an import without its file text', () => {
    const missing = withoutFileText(importedWithCode('Beta'))
    usePluginStore.getState().openPlugin(createPlugin('Alpha'))
    usePluginStore.getState().openPlugin(missing)

    expect(baselines()).toStrictEqual({})
  })

  it('drops the baseline when its tab closes', () => {
    const alpha = importedWithCode('Alpha')
    const beta = importedWithCode('Beta')
    usePluginStore.getState().openPlugin(alpha)
    usePluginStore.getState().openPlugin(beta)
    usePluginStore.getState().closePlugin(alpha.id)

    expect(Object.keys(baselines())).toStrictEqual([beta.id])
  })

  it('saves the file text, file name and baseline but not the code body', () => {
    const alpha = importedWithCode('Alpha')
    usePluginStore.getState().openPlugin(alpha)
    const { schemaVersion, plugin, openPlugins, baselineByPluginId } = savedStateOf(
      localStorage.getItem('mz-plugin-studio-plugin'),
      'the saved plugin store'
    )
    const savedTabs = [
      recordOf(plugin, 'the saved plugin'),
      recordOf(recordsOf(openPlugins, 'the saved open plugins').at(0), 'the first open plugin')
    ]

    expect({
      schemaVersion,
      tabs: savedTabs.map((tab) => {
        const { rawSource, importedFrom } = tab
        return { rawSource, importedFrom, hasCodeBody: 'codeBody' in tab }
      }),
      baselines: JSON.stringify(baselineByPluginId)
    }).toStrictEqual({
      schemaVersion: 3,
      tabs: [
        { rawSource: alpha.rawSource, importedFrom: 'Alpha.js', hasCodeBody: false },
        { rawSource: alpha.rawSource, importedFrom: 'Alpha.js', hasCodeBody: false }
      ],
      baselines: JSON.stringify({ [alpha.id]: toBaseline(alpha) })
    })
  })
})

describe('pluginStore file text of an imported plugin: reattachSource', () => {
  beforeEach(resetPluginStore)

  const { missing, other, text, parsed, fromFile, base } = reattachFixture()

  /**
  Opens the tab without file text, edited, then reattaches `text` to it.
  */
  function reattach(isActive: boolean, shouldKeepTab: boolean): void {
    resetPluginStore()
    usePluginStore.getState().openPlugin(missing)
    usePluginStore.getState().updateMeta({ description: 'Edited' })
    if (!isActive) usePluginStore.getState().openPlugin(other)
    usePluginStore
      .getState()
      .reattachSource(missing.id, text, parsed, { keepTab: shouldKeepTab, base })
  }

  it('keeping or replacing the tab records the file it was read from', () => {
    for (const isKeepTab of [false, true]) {
      reattach(true, isKeepTab)

      expect(usePluginStore.getState().baseByPluginId).toStrictEqual({ [missing.id]: base })
    }
  })

  it('keeping the tab gives it its file text and that file as the baseline', () => {
    for (const isActive of [false, true]) {
      reattach(isActive, true)
      const state = usePluginStore.getState()
      const tab = openTab(missing.id)

      expect({
        rawSource: tab.rawSource,
        description: tab.meta.description,
        activeId: state.plugin.id,
        // The active tab's file text, when it is this tab
        activeRawSource: isActive ? state.plugin.rawSource : text,
        isTabDirty: state.dirtyByPluginId[missing.id],
        baseline: state.baselineByPluginId[missing.id]
      }).toStrictEqual({
        rawSource: text,
        description: 'Edited',
        activeId: isActive ? missing.id : other.id,
        activeRawSource: text,
        isTabDirty: true,
        baseline: toBaseline(fromFile)
      })
    }
  })

  it('replacing the tab makes it the file, keeping its id and file name, not dirty', () => {
    for (const isActive of [false, true]) {
      reattach(isActive, false)
      const state = usePluginStore.getState()

      expect({
        tab: openTab(missing.id),
        plugin: state.plugin,
        isDirty: state.isDirty,
        isTabDirty: state.dirtyByPluginId[missing.id],
        baseline: state.baselineByPluginId[missing.id]
      }).toStrictEqual({
        tab: fromFile,
        plugin: isActive ? fromFile : other,
        isDirty: false,
        isTabDirty: undefined,
        baseline: toBaseline(fromFile)
      })
    }
  })
})

describe('pluginStore file text of an imported plugin: recordSaves', () => {
  beforeEach(resetPluginStore)

  it('recordSaves makes the written text the file text and the saved definition the baseline', () => {
    const alpha = importedAlpha()
    usePluginStore.getState().openPlugin(alpha)
    usePluginStore.getState().updateMeta({ description: 'Edited' })
    const saved = usePluginStore.getState().plugin
    usePluginStore.getState().updateMeta({ description: 'Edited after the save started' })
    usePluginStore
      .getState()
      .recordSaves([
        { id: alpha.id, saved, path: '/p/Alpha.js', sha256: 'aa', written: 'written text' }
      ])
    const state = usePluginStore.getState()

    expect({
      rawSource: state.plugin.rawSource,
      description: state.plugin.meta.description,
      tabRawSource: openTab(alpha.id).rawSource,
      baseline: state.baselineByPluginId[alpha.id],
      // Edited after the save started, so what is in the tab is still unsaved
      isTabDirty: state.dirtyByPluginId[alpha.id],
      isDirty: state.isDirty,
      savedPath: state.savedPath,
      base: state.baseByPluginId[alpha.id]
    }).toStrictEqual({
      rawSource: 'written text',
      description: 'Edited after the save started',
      tabRawSource: 'written text',
      baseline: toBaseline(saved),
      isTabDirty: true,
      isDirty: true,
      savedPath: '/p/Alpha.js',
      base: { path: '/p/Alpha.js', sha256: 'aa' }
    })
  })

  it('recordSaves leaves a plugin created here without file text or baseline', () => {
    const created = createPlugin('Created')
    usePluginStore.getState().openPlugin(created)
    usePluginStore.getState().updateMeta({ description: 'Edited' })
    const saved = usePluginStore.getState().plugin
    usePluginStore
      .getState()
      .recordSaves([
        { id: created.id, saved, path: '/p/Created.js', sha256: 'cc', written: 'text' }
      ])
    const state = usePluginStore.getState()

    expect(state.plugin.rawSource).toBeUndefined()
    expect(openTab(created.id).rawSource).toBeUndefined()
    expect(state.baselineByPluginId).toStrictEqual({})
    expect(state.dirtyByPluginId).toStrictEqual({})
    expect(state.isDirty).toBe(false)
  })
})

describe('pluginStore file text of an imported plugin: recordSaves of several tabs', () => {
  beforeEach(resetPluginStore)

  it('recordSaves records each saved tab by its id in one update, whichever tab is active', () => {
    const alpha = createPlugin('Alpha')
    const beta = createPlugin('Beta')
    const gamma = createPlugin('Gamma')
    for (const plugin of [alpha, beta, gamma]) {
      usePluginStore.getState().openPlugin(plugin)
      usePluginStore.getState().updateMeta({ description: 'Edited' })
    }
    const records = [alpha, beta].map((p) => ({
      id: p.id,
      saved: openTab(p.id),
      path: `/p/${p.meta.name}.js`,
      sha256: p.meta.name,
      written: 'text'
    }))
    let updates = 0
    const unsubscribe = usePluginStore.subscribe(() => updates++)
    usePluginStore.getState().recordSaves(records)
    unsubscribe()
    const state = usePluginStore.getState()

    expect({
      updates,
      dirtyByPluginId: state.dirtyByPluginId,
      savedPathsByPluginId: state.savedPathsByPluginId,
      baseByPluginId: state.baseByPluginId,
      activeId: state.plugin.id,
      isDirty: state.isDirty
    }).toStrictEqual({
      updates: 1,
      dirtyByPluginId: { [gamma.id]: true },
      savedPathsByPluginId: { [alpha.id]: '/p/Alpha.js', [beta.id]: '/p/Beta.js' },
      baseByPluginId: {
        [alpha.id]: { path: '/p/Alpha.js', sha256: 'Alpha' },
        [beta.id]: { path: '/p/Beta.js', sha256: 'Beta' }
      },
      activeId: gamma.id,
      isDirty: true
    })
    expect(state.savedPath).toBeNull()
  })
})

describe('pluginStore file text of an imported plugin: opening and closing', () => {
  beforeEach(resetPluginStore)

  it('openPlugin records the file a tab was read from; closing the tab drops it', () => {
    const alpha = importedAlpha()
    usePluginStore.getState().openPlugin(alpha, { path: '/p/Alpha.js', sha256: 'aa' })

    expect(usePluginStore.getState().baseByPluginId).toStrictEqual({
      [alpha.id]: { path: '/p/Alpha.js', sha256: 'aa' }
    })

    usePluginStore.getState().closePlugin(alpha.id)

    expect(usePluginStore.getState().baseByPluginId).toStrictEqual({})
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

  beforeEach(resetPluginStore)

  it('a changed type reaches the saved file; other edits keep the imported type text', () => {
    const imported = {
      ...PluginParser.parsePlugin(SOURCE, 'TypeEdits.js'),
      importedFrom: 'TypeEdits.js'
    }
    const store = usePluginStore.getState()
    store.openPlugin(imported)
    const idOf = (name: string): string => named(imported.parameters, name).id
    const command = named(imported.commands, 'run')
    const entry = named(imported.structs, 'Entry')

    store.updateParameter(idOf('rate'), { desc: 'Edited' })

    expect(named(usePluginStore.getState().plugin.parameters, 'rate').rawType).toBe('Number')

    store.updateParameter(idOf('rate'), { type: 'string' })
    store.updateParameter(idOf('list'), { structType: 'Other' })
    store.updateCommandArg(command.id, named(command.args, 'mode').id, { type: 'number' })
    store.updateStructParam(entry.id, named(entry.parameters, 'label').id, { type: 'string' })

    const saved = PluginParser.parsePlugin(
      generateRawMode(usePluginStore.getState().plugin, baselineOf(imported.id)),
      'TypeEdits.js'
    )

    expect(typesOf(saved.parameters)).toStrictEqual([
      ['rate', 'string', undefined],
      ['list', 'struct<Other>[]', 'Other']
    ])
    expect(typesOf(named(saved.commands, 'run').args)).toStrictEqual([
      ['mode', 'number', undefined]
    ])
    expect(typesOf(named(saved.structs, 'Entry').parameters)).toStrictEqual([
      ['label', 'string', undefined]
    ])
  })
})
