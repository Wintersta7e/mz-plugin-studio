import log from 'electron-log/renderer'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  createEmptyPlugin,
  toBaseline,
  type LocalizedContent,
  type NoteParam,
  type PluginBaseline,
  type PluginDefinition,
  type PluginMeta,
  type PluginParameter,
  type PluginCommand,
  type PluginStruct
} from '../types/plugin'
import type { FileBase } from '../../../shared/ipc-types'
import { checkSavedParameter, PARAMETER_LABELS } from '../lib/param-io'
import { isImported } from '../lib/plugin-output'
import {
  checkArrayOf,
  checkBoolean,
  checkEach,
  checkRecordOf,
  checkString,
  checkStringOrNull,
  definePersist,
  isRecord,
  type FieldCheck,
  type FieldPath,
  type MigrationStep
} from './persist'
// None of these stores imports this one, so each is fully set up before this module runs.
import { useUIStore } from './uiStore'
import { useHistoryStore } from './historyStore'
import { useSettingsStore } from './settingsStore'

interface PluginState {
  plugin: PluginDefinition
  openPlugins: PluginDefinition[]
  activePluginId: string | null
  isDirty: boolean
  savedPath: string | null
  dirtyByPluginId: Record<string, boolean>
  savedPathsByPluginId: Record<string, string>
  // The definition each imported tab was opened with; raw mode saves against it
  baselineByPluginId: Record<string, PluginBaseline>
  // The file each tab was read from or last saved to; a save asks before replacing any other
  baseByPluginId: Record<string, FileBase>

  // `isDirty` also sets the tab's unsaved state in the same update (undo and redo)
  setPlugin: (plugin: PluginDefinition, isDirty?: boolean) => void
  updateMeta: (meta: Partial<PluginDefinition['meta']>) => void

  // Parameters
  addParameter: (param: PluginParameter) => void
  updateParameter: (id: string, param: Partial<PluginParameter>) => void
  removeParameter: (id: string) => void
  removeParameters: (ids: string[]) => void
  reorderParameters: (fromIndex: number, toIndex: number) => void

  // Commands
  addCommand: (command: PluginCommand) => void
  updateCommand: (id: string, command: Partial<PluginCommand>) => void
  removeCommand: (id: string) => void
  addCommandArg: (commandId: string, arg: PluginParameter) => void
  updateCommandArg: (commandId: string, argId: string, arg: Partial<PluginParameter>) => void
  removeCommandArg: (commandId: string, argId: string) => void

  // Structs
  addStruct: (struct: PluginStruct) => void
  updateStruct: (id: string, struct: Partial<PluginStruct>) => void
  removeStruct: (id: string) => void
  addStructParam: (structId: string, param: PluginParameter) => void
  updateStructParam: (structId: string, paramId: string, param: Partial<PluginParameter>) => void
  removeStructParam: (structId: string, paramId: string) => void

  // Multi-plugin; `base` is the file the tab was read from
  openPlugin: (plugin: PluginDefinition, base?: FileBase) => void
  closePlugin: (id: string) => void
  setActivePlugin: (id: string) => void

  // Code
  setCustomCode: (code: string) => void

  // File text of an imported tab loaded again from `base`, the project's file
  reattachSource: (
    id: string,
    rawSource: string,
    parsed: PluginDefinition,
    options: { keepTab: boolean; base: FileBase }
  ) => void
  recordSaves: (records: SaveRecord[]) => void

  // State
  setDirty: (isDirty: boolean) => void
}

type PluginPersisted = Pick<
  PluginState,
  | 'plugin'
  | 'openPlugins'
  | 'activePluginId'
  | 'isDirty'
  | 'savedPath'
  | 'dirtyByPluginId'
  | 'savedPathsByPluginId'
  | 'baselineByPluginId'
  | 'baseByPluginId'
>

/**
A tab written to `path`: `saved` is the definition the code was generated from.
*/
export interface SaveRecord {
  id: string
  saved: PluginDefinition
  path: string
  sha256: string
  written: string
}

/**
A v1.6.0 tab with a code body was imported; it keeps no code body from now on.
*/
function migrateImported(definition: unknown): unknown {
  if (!isRecord(definition)) return definition
  const { codeBody, ...rest } = definition
  if (
    typeof codeBody === 'string' &&
    !Object.hasOwn(rest, 'importedFrom') &&
    isRecord(rest['meta']) &&
    typeof rest['meta']['name'] === 'string'
  ) {
    rest['importedFrom'] = `${rest['meta']['name']}.js`
  }
  return rest
}

const PLUGIN_MIGRATIONS: readonly MigrationStep[] = [
  (state) => state,
  (state) => ({
    ...state,
    plugin: migrateImported(state['plugin']),
    openPlugins: Array.isArray(state['openPlugins'])
      ? state['openPlugins'].map((tab: unknown) => migrateImported(tab))
      : state['openPlugins']
  }),
  // A tab's saved path is the file it last saved, its contents then unknown
  (state) => {
    const saved = isRecord(state['savedPathsByPluginId']) ? state['savedPathsByPluginId'] : {}
    const bases = isRecord(state['baseByPluginId']) ? state['baseByPluginId'] : {}
    const added = Object.entries(saved)
      .filter(([id]) => !Object.hasOwn(bases, id))
      .map(([id, path]) => [id, { path, sha256: null }])
    return { ...state, baseByPluginId: { ...bases, ...Object.fromEntries(added) } }
  }
]

// This store's maps keyed by an open tab's plugin id; closing a tab removes its entry from each.
// The ui store's tab-keyed maps are cleared by its clearRawModeForPlugin.
const TAB_KEYED_MAPS = [
  'dirtyByPluginId',
  'savedPathsByPluginId',
  'baselineByPluginId',
  'baseByPluginId'
] as const
type TabKeyedMaps = Pick<PluginState, (typeof TAB_KEYED_MAPS)[number]>

/**
Every tab-keyed map with only the entries whose plugin id `shouldKeep` accepts.
*/
function filterTabMaps(maps: TabKeyedMaps, shouldKeep: (id: string) => boolean): TabKeyedMaps {
  const kept = <T>(map: Record<string, T>): Record<string, T> =>
    Object.fromEntries(Object.entries(map).filter(([id]) => shouldKeep(id)))
  return {
    dirtyByPluginId: kept(maps.dirtyByPluginId),
    savedPathsByPluginId: kept(maps.savedPathsByPluginId),
    baselineByPluginId: kept(maps.baselineByPluginId),
    baseByPluginId: kept(maps.baseByPluginId)
  }
}

/**
Drops the saved entries of tabs that were closed without their entries being cleared.
*/
function pruneClosedTabs(state: PluginState): PluginState {
  const open = new Set(state.openPlugins.map((p) => p.id))
  for (const name of TAB_KEYED_MAPS) {
    const closed = Object.keys(state[name]).filter((id) => !open.has(id))
    if (closed.length > 0) {
      log.debug(`Dropped ${String(closed.length)} closed-tab entries from ${name}`)
    }
  }
  return { ...state, ...filterTabMaps(state, (id) => open.has(id)) }
}

const OPTIONAL_STRING_FIELDS = ['codeBody', 'customCode', 'rawSource', 'importedFrom'] as const

const checkStringList = checkArrayOf(checkString)
const checkParameters = checkArrayOf(checkSavedParameter)

// A note group: `dir` and `data` are kept as text and `require` as true or false; any other is named
const checkNoteParam: FieldCheck<NoteParam> = (value, drop) => {
  if (!isRecord(value)) return
  const { name, type, dir, data, require: required } = value
  if (typeof name !== 'string' || typeof type !== 'string') return
  const noteParam: NoteParam = { name, type }
  if (typeof dir === 'string') noteParam.dir = dir
  else if (dir !== undefined) drop([{ key: 'dir' }])
  if (typeof data === 'string') noteParam.data = data
  else if (data !== undefined) drop([{ key: 'data' }])
  if (typeof required === 'boolean') noteParam.require = required
  else if (required !== undefined) drop([{ key: 'require' }])
  return noteParam
}

const checkLocalized: FieldCheck<LocalizedContent> = (value) =>
  isRecord(value) &&
  ['description', 'help'].every((key) => value[key] === undefined || typeof value[key] === 'string')
    ? value
    : undefined

/**
`meta` as the editors read it: a field of the wrong type takes its default, or is left out when
optional, and is named through `drop`. Saved keys keep their order; unknown keys are kept.
*/
function checkMeta(
  meta: Record<string, unknown>,
  name: string,
  drop: (path: FieldPath) => void
): PluginMeta {
  const checked = new Map(Object.entries(meta))
  const run = <T>(field: string, check: FieldCheck<T>): T | undefined => {
    const value = check(checked.get(field), (path) => {
      drop([{ key: field }, ...path])
    })
    if (value === undefined) drop([{ key: field }])
    return value
  }
  const required = <T>(field: string, check: FieldCheck<T>, fallback: T): T => {
    const value = run(field, check) ?? fallback
    checked.set(field, value)
    return value
  }
  const optional = <T>(field: string, check: FieldCheck<T>): T | undefined => {
    if (!checked.has(field)) return undefined
    const value = run(field, check)
    if (value === undefined) checked.delete(field)
    else checked.set(field, value)
    return value
  }
  const version = required('version', checkString, '')
  const author = required('author', checkString, '')
  const description = required('description', checkString, '')
  const help = required('help', checkString, '')
  const url = required('url', checkString, '')
  const target = required('target', checkString, '')
  const dependencies = required('dependencies', checkStringList, [])
  const orderAfter = optional('orderAfter', checkStringList)
  const orderBefore = optional('orderBefore', checkStringList)
  const requiredAssets = optional('requiredAssets', checkStringList)
  const noteParams = optional('noteParams', checkArrayOf(checkNoteParam))
  const localizations = optional('localizations', checkRecordOf(checkLocalized))
  return {
    ...Object.fromEntries(checked),
    name,
    version,
    author,
    description,
    help,
    url,
    target,
    dependencies,
    ...(orderAfter !== undefined && { orderAfter }),
    ...(orderBefore !== undefined && { orderBefore }),
    ...(requiredAssets !== undefined && { requiredAssets }),
    ...(noteParams !== undefined && { noteParams }),
    ...(localizations !== undefined && { localizations })
  }
}

const idOf = (value: Record<string, unknown>): string =>
  typeof value['id'] === 'string' ? value['id'] : crypto.randomUUID()

const checkCommand: FieldCheck<PluginCommand> = (value, drop) => {
  if (!isRecord(value) || typeof value['name'] !== 'string') return
  const args = checkParameters(value['args'], (path) => {
    drop([{ key: 'args' }, ...path])
  })
  if (args === undefined) return
  for (const field of ['text', 'desc']) if (typeof value[field] !== 'string') drop([{ key: field }])
  return {
    id: idOf(value),
    name: value['name'],
    text: typeof value['text'] === 'string' ? value['text'] : value['name'],
    desc: typeof value['desc'] === 'string' ? value['desc'] : '',
    args
  }
}

const checkStruct: FieldCheck<PluginStruct> = (value, drop) => {
  if (!isRecord(value) || typeof value['name'] !== 'string') return
  const parameters = checkParameters(value['parameters'], (path) => {
    drop([{ key: 'parameters' }, ...path])
  })
  return parameters === undefined ? undefined : { id: idOf(value), name: value['name'], parameters }
}

/**
The plugin name a saved tab shows, if it has one, to name it when it cannot be loaded.
*/
const tabName = (value: unknown): string | undefined =>
  isRecord(value) && isRecord(value['meta']) && typeof value['meta']['name'] === 'string'
    ? value['meta']['name']
    : undefined

const checkParameterList = checkEach(checkSavedParameter)
const checkCommandList = checkEach(checkCommand)
const checkStructList = checkEach(checkStruct)

/**
A saved plugin definition: rejected unless every editor can read it, elements one by one. Saved
keys keep their order; an optional text field of the wrong type is left out.
*/
const checkDefinition: FieldCheck<PluginDefinition> = (value, drop) => {
  if (!isRecord(value)) return
  const { id, meta, parameters, commands, structs } = value
  const name = tabName(value)
  if (
    typeof id !== 'string' ||
    name === undefined ||
    !isRecord(meta) ||
    !Array.isArray(parameters) ||
    !Array.isArray(commands) ||
    !Array.isArray(structs)
  ) {
    return
  }
  const within = (field: string) => (path: FieldPath) => {
    drop([{ key: field }, ...path])
  }
  const checked = {
    id,
    meta: checkMeta(meta, name, within('meta')),
    parameters: checkParameterList(parameters, within('parameters')),
    commands: checkCommandList(commands, within('commands')),
    structs: checkStructList(structs, within('structs'))
  }
  const wrong = new Set<string>(
    OPTIONAL_STRING_FIELDS.filter(
      (field) => Object.hasOwn(value, field) && typeof value[field] !== 'string'
    )
  )
  for (const field of wrong) drop([{ key: field }])
  const kept = Object.entries(value).filter(([field]) => !wrong.has(field))
  return { ...Object.fromEntries(kept), ...checked }
}

const checkBaseline: FieldCheck<PluginBaseline> = (value, drop) => {
  const definition = checkDefinition(value, drop)
  return definition === undefined ? undefined : toBaseline(definition)
}

const checkFileBase: FieldCheck<FileBase> = (value) =>
  isRecord(value) &&
  typeof value['path'] === 'string' &&
  (typeof value['sha256'] === 'string' || value['sha256'] === null)
    ? { path: value['path'], sha256: value['sha256'] }
    : undefined

/**
A definition as saved: the code body is not kept, it is part of the file text.
*/
function toStored(plugin: PluginDefinition): PluginDefinition {
  const stored = { ...plugin }
  delete stored.codeBody
  return stored
}

function upsertOpenPlugin(
  openPlugins: PluginDefinition[],
  plugin: PluginDefinition
): PluginDefinition[] {
  const index = openPlugins.findIndex((candidate) => candidate.id === plugin.id)
  if (index === -1) {
    return [...openPlugins, plugin]
  }

  const next = [...openPlugins]
  next[index] = plugin
  return next
}

function isPluginDirty(
  dirtyByPluginId: Record<string, boolean>,
  pluginId: string | null,
  isDirtyUnlessMarked = false
): boolean {
  return pluginId !== null && pluginId !== '' && (dirtyByPluginId[pluginId] ?? isDirtyUnlessMarked)
}

function getPluginSavedPath(
  savedPathsByPluginId: Record<string, string>,
  pluginId: string | null,
  fallback: string | null = null
): string | null {
  return pluginId === null || pluginId === '' ? null : (savedPathsByPluginId[pluginId] ?? fallback)
}

function markPluginDirty(
  dirtyByPluginId: Record<string, boolean>,
  pluginId: string,
  isDirty: boolean
): Record<string, boolean> {
  if (isDirty) {
    return { ...dirtyByPluginId, [pluginId]: true }
  }

  if (!Object.hasOwn(dirtyByPluginId, pluginId)) {
    return dirtyByPluginId
  }

  return Object.fromEntries(Object.entries(dirtyByPluginId).filter(([id]) => id !== pluginId))
}

/**
Applies an edit to a parameter or argument. A changed type drops the `@type` text it was
imported with, so the generated `@type` follows the edit.
*/
function editParameter(param: PluginParameter, edit: Partial<PluginParameter>): PluginParameter {
  const isRetyped = (['type', 'arrayType', 'structType'] as const).some(
    (key) => Object.hasOwn(edit, key) && edit[key] !== param[key]
  )
  return isRetyped ? { ...param, rawType: undefined, ...edit } : { ...param, ...edit }
}

/**
Sets the file text of an open tab, in the tab list and on the active plugin; not an edit.
*/
function withRawSource(
  state: PluginState,
  id: string,
  rawSource: string
): Pick<PluginState, 'openPlugins' | 'plugin'> {
  return {
    openPlugins: state.openPlugins.map((p) => (p.id === id ? { ...p, rawSource } : p)),
    plugin: state.plugin.id === id ? { ...state.plugin, rawSource } : state.plugin
  }
}

function updateActivePluginState(
  state: PluginState,
  update: (plugin: PluginDefinition) => PluginDefinition
): Partial<PluginState> {
  const nextPlugin = update(state.plugin)
  return {
    plugin: nextPlugin,
    openPlugins: upsertOpenPlugin(state.openPlugins, nextPlugin),
    isDirty: true,
    dirtyByPluginId: markPluginDirty(state.dirtyByPluginId, nextPlugin.id, true)
  }
}

type SetPluginState = (update: (state: PluginState) => Partial<PluginState>) => void
type EditActivePlugin = (update: (plugin: PluginDefinition) => PluginDefinition) => void

const editActive =
  (set: SetPluginState): EditActivePlugin =>
  (update) => {
    set((state) => updateActivePluginState(state, update))
  }

function parameterActions(
  set: SetPluginState
): Pick<
  PluginState,
  'addParameter' | 'updateParameter' | 'removeParameter' | 'removeParameters' | 'reorderParameters'
> {
  const edit = editActive(set)
  return {
    addParameter: (param) => {
      edit((plugin) => ({ ...plugin, parameters: [...plugin.parameters, param] }))
    },
    updateParameter: (id, param) => {
      edit((plugin) => ({
        ...plugin,
        parameters: plugin.parameters.map((p) => (p.id === id ? editParameter(p, param) : p))
      }))
    },
    removeParameter: (id) => {
      edit((plugin) => ({ ...plugin, parameters: plugin.parameters.filter((p) => p.id !== id) }))
    },
    removeParameters: (ids) => {
      set((state) => {
        if (ids.length === 0) return {}
        const idSet = new Set(ids)
        const filtered = state.plugin.parameters.filter((p) => !idSet.has(p.id))
        return filtered.length === state.plugin.parameters.length
          ? {}
          : updateActivePluginState(state, (plugin) => ({ ...plugin, parameters: filtered }))
      })
    },
    reorderParameters: (fromIndex, toIndex) => {
      set((state) => {
        const { parameters } = state.plugin
        if (
          fromIndex < 0 ||
          fromIndex >= parameters.length ||
          toIndex < 0 ||
          toIndex >= parameters.length
        )
          return {}
        const params = [...parameters]
        params.splice(toIndex, 0, ...params.splice(fromIndex, 1))
        return updateActivePluginState(state, (plugin) => ({ ...plugin, parameters: params }))
      })
    }
  }
}

function commandActions(
  set: SetPluginState
): Pick<
  PluginState,
  | 'addCommand'
  | 'updateCommand'
  | 'removeCommand'
  | 'addCommandArg'
  | 'updateCommandArg'
  | 'removeCommandArg'
> {
  const edit = editActive(set)
  return {
    addCommand: (command) => {
      edit((plugin) => ({ ...plugin, commands: [...plugin.commands, command] }))
    },
    updateCommand: (id, command) => {
      edit((plugin) => ({
        ...plugin,
        commands: plugin.commands.map((c) => (c.id === id ? { ...c, ...command } : c))
      }))
    },
    removeCommand: (id) => {
      edit((plugin) => ({ ...plugin, commands: plugin.commands.filter((c) => c.id !== id) }))
    },
    addCommandArg: (commandId, arg) => {
      edit((plugin) => ({
        ...plugin,
        commands: plugin.commands.map((c) =>
          c.id === commandId ? { ...c, args: [...c.args, arg] } : c
        )
      }))
    },
    updateCommandArg: (commandId, argId, arg) => {
      edit((plugin) => ({
        ...plugin,
        commands: plugin.commands.map((c) =>
          c.id === commandId
            ? { ...c, args: c.args.map((a) => (a.id === argId ? editParameter(a, arg) : a)) }
            : c
        )
      }))
    },
    removeCommandArg: (commandId, argId) => {
      edit((plugin) => ({
        ...plugin,
        commands: plugin.commands.map((c) =>
          c.id === commandId ? { ...c, args: c.args.filter((a) => a.id !== argId) } : c
        )
      }))
    }
  }
}

function structActions(
  set: SetPluginState
): Pick<
  PluginState,
  | 'addStruct'
  | 'updateStruct'
  | 'removeStruct'
  | 'addStructParam'
  | 'updateStructParam'
  | 'removeStructParam'
> {
  const edit = editActive(set)
  return {
    addStruct: (struct) => {
      edit((plugin) => ({ ...plugin, structs: [...plugin.structs, struct] }))
    },
    updateStruct: (id, struct) => {
      edit((plugin) => ({
        ...plugin,
        structs: plugin.structs.map((s) => (s.id === id ? { ...s, ...struct } : s))
      }))
    },
    removeStruct: (id) => {
      edit((plugin) => ({ ...plugin, structs: plugin.structs.filter((s) => s.id !== id) }))
    },
    addStructParam: (structId, param) => {
      edit((plugin) => ({
        ...plugin,
        structs: plugin.structs.map((s) =>
          s.id === structId ? { ...s, parameters: [...s.parameters, param] } : s
        )
      }))
    },
    updateStructParam: (structId, paramId, param) => {
      edit((plugin) => ({
        ...plugin,
        structs: plugin.structs.map((s) =>
          s.id === structId
            ? {
                ...s,
                parameters: s.parameters.map((p) =>
                  p.id === paramId ? editParameter(p, param) : p
                )
              }
            : s
        )
      }))
    },
    removeStructParam: (structId, paramId) => {
      edit((plugin) => ({
        ...plugin,
        structs: plugin.structs.map((s) =>
          s.id === structId ? { ...s, parameters: s.parameters.filter((p) => p.id !== paramId) } : s
        )
      }))
    }
  }
}

function tabActions(
  set: SetPluginState
): Pick<PluginState, 'openPlugin' | 'closePlugin' | 'setActivePlugin'> {
  return {
    openPlugin: (plugin, base) => {
      set((state) => {
        const shouldRecordBaseline =
          isImported(plugin) &&
          plugin.rawSource !== undefined &&
          plugin.rawSource !== '' &&
          !Object.hasOwn(state.baselineByPluginId, plugin.id)
        return {
          ...(shouldRecordBaseline && {
            baselineByPluginId: { ...state.baselineByPluginId, [plugin.id]: toBaseline(plugin) }
          }),
          ...(base !== undefined && {
            baseByPluginId: { ...state.baseByPluginId, [plugin.id]: base }
          }),
          openPlugins: upsertOpenPlugin(state.openPlugins, plugin),
          activePluginId: plugin.id,
          plugin,
          isDirty: isPluginDirty(state.dirtyByPluginId, plugin.id),
          savedPath: getPluginSavedPath(state.savedPathsByPluginId, plugin.id)
        }
      })
    },
    closePlugin: (id) => {
      // Clean up raw mode and history BEFORE state switch (synchronous)
      useUIStore.getState().clearRawModeForPlugin(id)
      useHistoryStore.getState().clear()
      set((state) => {
        const newOpenPlugins = state.openPlugins.filter((p) => p.id !== id)
        const maps = filterTabMaps(state, (key) => key !== id)
        const newActive =
          state.activePluginId === id ? (newOpenPlugins.at(-1)?.id ?? null) : state.activePluginId
        const { defaultAuthor } = useSettingsStore.getState()
        const newPlugin =
          newActive !== null && newActive !== '' && newOpenPlugins.length > 0
            ? (newOpenPlugins.find((p) => p.id === newActive) ?? createEmptyPlugin(defaultAuthor))
            : createEmptyPlugin(defaultAuthor)
        return {
          openPlugins: newOpenPlugins,
          activePluginId: newActive,
          plugin: newPlugin,
          isDirty: isPluginDirty(maps.dirtyByPluginId, newActive),
          savedPath: getPluginSavedPath(maps.savedPathsByPluginId, newActive),
          ...maps
        }
      })
    },
    setActivePlugin: (id) => {
      set((state) => {
        const syncedOpenPlugins =
          state.activePluginId !== null &&
          state.activePluginId !== '' &&
          state.plugin.id === state.activePluginId
            ? upsertOpenPlugin(state.openPlugins, state.plugin)
            : state.openPlugins
        const plugin = syncedOpenPlugins.find((p) => p.id === id)
        if (plugin) {
          // Sync history to new plugin context before state switch
          useHistoryStore.getState().setActivePluginId(id)
          return {
            openPlugins: syncedOpenPlugins,
            activePluginId: id,
            plugin,
            isDirty: isPluginDirty(state.dirtyByPluginId, id),
            savedPath: getPluginSavedPath(state.savedPathsByPluginId, id)
          }
        }
        return {}
      })
    }
  }
}

function fileActions(set: SetPluginState): Pick<PluginState, 'reattachSource' | 'recordSaves'> {
  return {
    reattachSource: (id, rawSource, parsed, { keepTab, base }) => {
      set((state) => {
        const tab = state.openPlugins.find((p) => p.id === id)
        if (tab === undefined) return {}
        const { importedFrom } = tab
        const fileName = (importedFrom ?? '').replace(/\.js$/i, '')
        const fromFile: PluginDefinition = {
          ...parsed,
          id,
          ...(importedFrom !== undefined && { importedFrom }),
          meta: { ...parsed.meta, name: fileName },
          rawSource
        }
        const baselineByPluginId = { ...state.baselineByPluginId, [id]: toBaseline(fromFile) }
        const baseByPluginId = { ...state.baseByPluginId, [id]: base }
        if (keepTab) {
          // The tab's values now count as edits to the file
          return {
            ...withRawSource(state, id, rawSource),
            baselineByPluginId,
            baseByPluginId,
            dirtyByPluginId: markPluginDirty(state.dirtyByPluginId, id, true),
            ...(state.plugin.id === id && { isDirty: true })
          }
        }
        return {
          openPlugins: upsertOpenPlugin(state.openPlugins, fromFile),
          ...(state.plugin.id === id && { plugin: fromFile, isDirty: false }),
          baselineByPluginId,
          baseByPluginId,
          dirtyByPluginId: markPluginDirty(state.dirtyByPluginId, id, false)
        }
      })
    },
    recordSaves: (records) => {
      set((state) => {
        let { openPlugins, plugin } = state
        const cleaned = new Set<string>()
        const savedPathsByPluginId = { ...state.savedPathsByPluginId }
        const baseByPluginId = { ...state.baseByPluginId }
        const baselineByPluginId = { ...state.baselineByPluginId }
        for (const { id, saved, path, sha256, written } of records) {
          const tab = plugin.id === id ? plugin : openPlugins.find((p) => p.id === id)
          if (tab === undefined) continue
          savedPathsByPluginId[id] = path
          baseByPluginId[id] = { path, sha256 }
          // An edit made while the file was written is not in it
          if (tab === saved) cleaned.add(id)
          if (!isImported(tab)) {
            continue
          }

          ;({ openPlugins, plugin } = withRawSource({ ...state, openPlugins, plugin }, id, written))
          baselineByPluginId[id] = toBaseline(saved)
        }
        const dirtyByPluginId = Object.fromEntries(
          Object.entries(state.dirtyByPluginId).filter(([id]) => !cleaned.has(id))
        )
        const isActiveSaved = records.some((r) => r.id === plugin.id)
        return {
          openPlugins,
          plugin,
          dirtyByPluginId,
          savedPathsByPluginId,
          baseByPluginId,
          baselineByPluginId,
          ...(isActiveSaved && {
            isDirty: isPluginDirty(dirtyByPluginId, plugin.id),
            savedPath: getPluginSavedPath(savedPathsByPluginId, plugin.id)
          })
        }
      })
    }
  }
}

const PLUGIN_PERSIST = definePersist<PluginState, PluginPersisted>({
  name: 'mz-plugin-studio-plugin',
  area: 'Open plugins',
  migrations: PLUGIN_MIGRATIONS,
  fields: {
    plugin: checkDefinition,
    openPlugins: checkArrayOf(checkDefinition, tabName),
    activePluginId: checkStringOrNull,
    isDirty: checkBoolean,
    savedPath: checkStringOrNull,
    dirtyByPluginId: checkRecordOf(checkBoolean),
    savedPathsByPluginId: checkRecordOf(checkString),
    baselineByPluginId: checkRecordOf(checkBaseline),
    baseByPluginId: checkRecordOf(checkFileBase)
  },
  labels: {
    plugin: 'the active plugin',
    openPlugins: { all: 'open plugin tabs', one: 'open plugin' },
    activePluginId: 'the active tab',
    isDirty: "the active plugin's unsaved-changes mark",
    savedPath: "the active plugin's file path",
    dirtyByPluginId: { all: 'unsaved-changes marks', one: 'unsaved-changes mark of tab' },
    savedPathsByPluginId: { all: 'saved file paths', one: 'saved file path of tab' },
    baselineByPluginId: { all: 'last-saved copies', one: 'last-saved copy of tab' },
    baseByPluginId: { all: 'files read or saved', one: 'file read or saved by tab' },
    // inside a plugin definition
    meta: '',
    parameters: { all: 'parameters', one: 'parameter' },
    commands: { all: 'commands', one: 'command' },
    args: { all: 'arguments', one: 'argument' },
    structs: { all: 'structs', one: 'struct' },
    noteParams: { all: 'note parameters', one: 'note parameter' },
    localizations: { all: 'translations', one: 'translation' },
    url: 'URL',
    orderAfter: 'load-after list',
    orderBefore: 'load-before list',
    rawSource: 'file text',
    importedFrom: 'source file name',
    ...PARAMETER_LABELS
  },
  partialize: (state) => ({
    plugin: toStored(state.plugin),
    openPlugins: state.openPlugins.map((tab) => toStored(tab)),
    activePluginId: state.activePluginId,
    isDirty: state.isDirty,
    savedPath: state.savedPath,
    dirtyByPluginId: state.dirtyByPluginId,
    savedPathsByPluginId: state.savedPathsByPluginId,
    baselineByPluginId: state.baselineByPluginId,
    baseByPluginId: state.baseByPluginId
  }),
  prune: pruneClosedTabs
})

export const usePluginStore = create<PluginState>()(
  persist(
    (set) => ({
      plugin: createEmptyPlugin(),
      openPlugins: [],
      activePluginId: null,
      isDirty: false,
      savedPath: null,
      dirtyByPluginId: {},
      savedPathsByPluginId: {},
      baselineByPluginId: {},
      baseByPluginId: {},

      setPlugin: (plugin, isDirty) =>
        set((state) => ({
          plugin,
          activePluginId: plugin.id,
          openPlugins: upsertOpenPlugin(state.openPlugins, plugin),
          ...(isDirty !== undefined && {
            dirtyByPluginId: markPluginDirty(state.dirtyByPluginId, plugin.id, isDirty)
          }),
          isDirty:
            isDirty ??
            isPluginDirty(
              state.dirtyByPluginId,
              plugin.id,
              state.activePluginId === plugin.id && state.isDirty
            ),
          savedPath: getPluginSavedPath(
            state.savedPathsByPluginId,
            plugin.id,
            state.activePluginId === plugin.id ? state.savedPath : null
          )
        })),
      updateMeta: (meta) =>
        set((state) =>
          updateActivePluginState(state, (plugin) => ({
            ...plugin,
            meta: { ...plugin.meta, ...meta }
          }))
        ),
      ...parameterActions(set),
      ...commandActions(set),
      ...structActions(set),
      // Multi-plugin
      ...tabActions(set),
      setCustomCode: (code) =>
        set((state) =>
          updateActivePluginState(state, (plugin) => ({
            ...plugin,
            customCode: code
          }))
        ),
      ...fileActions(set),

      // State
      setDirty: (isDirty) =>
        set((state) => ({
          isDirty,
          dirtyByPluginId: markPluginDirty(state.dirtyByPluginId, state.plugin.id, isDirty)
        }))
    }),
    PLUGIN_PERSIST
  )
)

// The ui store keeps a raw-mode switch per tab; once the open tabs have loaded, drop the
// switches of tabs no longer open. Nothing is saved when every switch belongs to an open tab.
function pruneRawMode(): void {
  const open = new Set(usePluginStore.getState().openPlugins.map((p) => p.id))
  const raw = useUIStore.getState().rawModeByPluginId
  const kept = Object.entries(raw).filter(([id]) => open.has(id))
  if (kept.length === Object.keys(raw).length) return
  useUIStore.setState({ rawModeByPluginId: Object.fromEntries(kept) })
}

if (usePluginStore.persist.hasHydrated()) pruneRawMode()
else usePluginStore.persist.onFinishHydration(pruneRawMode)
