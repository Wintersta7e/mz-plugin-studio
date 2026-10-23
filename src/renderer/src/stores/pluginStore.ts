import log from 'electron-log/renderer'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  LocalizedContent,
  NoteParam,
  PluginBaseline,
  PluginDefinition,
  PluginMeta,
  PluginParameter,
  PluginCommand,
  PluginStruct
} from '../types/plugin'
import { createEmptyPlugin, toBaseline } from '../types/plugin'
import type { FileBase } from '../../../shared/ipc-types'
import { checkSavedParameter, PARAMETER_LABELS } from '../lib/param-io'
import { isImported } from '../lib/plugin-output'
import {
  checkArrayOf,
  checkBoolean,
  checkRecordOf,
  checkString,
  checkStringOrNull,
  definePersist,
  isRecord
} from './persist'
import type { FieldCheck, FieldPath, MigrationStep } from './persist'
// Cross-store imports — safe because getState() is only called at runtime (inside
// store actions), never during module initialization. ESM circular bindings resolve
// by the time any user interaction triggers these actions.
import { useUIStore } from './uiStore'
import { useHistoryStore } from './historyStore'

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

  // `dirty` also sets the tab's unsaved state in the same update (undo and redo)
  setPlugin: (plugin: PluginDefinition, dirty?: boolean) => void
  updateMeta: (meta: Partial<PluginDefinition['meta']>) => void

  // Parameters
  addParameter: (param: PluginParameter) => void
  updateParameter: (id: string, param: Partial<PluginParameter>) => void
  removeParameter: (id: string) => void
  removeParameters: (ids: string[]) => void
  reorderParameters: (fromIndex: number, toIndex: number) => void

  // Commands
  addCommand: (cmd: PluginCommand) => void
  updateCommand: (id: string, cmd: Partial<PluginCommand>) => void
  removeCommand: (id: string) => void
  addCommandArg: (cmdId: string, arg: PluginParameter) => void
  updateCommandArg: (cmdId: string, argId: string, arg: Partial<PluginParameter>) => void
  removeCommandArg: (cmdId: string, argId: string) => void

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
  setDirty: (dirty: boolean) => void
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

/** A tab written to `path`: `saved` is the definition the code was generated from. */
export interface SaveRecord {
  id: string
  saved: PluginDefinition
  path: string
  sha256: string
  written: string
}

/** A v1.6.0 tab with a code body was imported; it keeps no code body from now on. */
function migrateImported(def: unknown): unknown {
  if (!isRecord(def)) return def
  const { codeBody, ...rest } = def
  if (
    typeof codeBody === 'string' &&
    !Object.hasOwn(rest, 'importedFrom') &&
    isRecord(rest.meta) &&
    typeof rest.meta.name === 'string'
  ) {
    rest.importedFrom = `${rest.meta.name}.js`
  }
  return rest
}

const PLUGIN_MIGRATIONS: readonly MigrationStep[] = [
  (state) => state,
  (state) => ({
    ...state,
    plugin: migrateImported(state.plugin),
    openPlugins: Array.isArray(state.openPlugins)
      ? state.openPlugins.map(migrateImported)
      : state.openPlugins
  }),
  // A tab's saved path is the file it last saved, its contents then unknown
  (state) => {
    const saved = isRecord(state.savedPathsByPluginId) ? state.savedPathsByPluginId : {}
    const bases = isRecord(state.baseByPluginId) ? state.baseByPluginId : {}
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

/** Every tab-keyed map with only the entries whose plugin id `keep` accepts. */
function filterTabMaps(maps: TabKeyedMaps, keep: (id: string) => boolean): TabKeyedMaps {
  const next: Record<string, Record<string, unknown>> = {}
  for (const name of TAB_KEYED_MAPS) {
    next[name] = Object.fromEntries(Object.entries(maps[name]).filter(([id]) => keep(id)))
  }
  return next as TabKeyedMaps
}

/** Drops the saved entries of tabs that were closed without their entries being cleared. */
function pruneClosedTabs(persisted: PluginPersisted): PluginPersisted {
  const open = new Set(persisted.openPlugins.map((p) => p.id))
  for (const name of TAB_KEYED_MAPS) {
    const closed = Object.keys(persisted[name]).filter((id) => !open.has(id))
    if (closed.length > 0) log.debug(`Dropped ${closed.length} closed-tab entries from ${name}`)
  }
  return { ...persisted, ...filterTabMaps(persisted, (id) => open.has(id)) }
}

const OPTIONAL_STRING_FIELDS = ['codeBody', 'customCode', 'rawSource', 'importedFrom'] as const
const META_STRING_FIELDS = ['version', 'author', 'description', 'help', 'url', 'target'] as const
const META_OPTIONAL_LISTS = ['orderAfter', 'orderBefore', 'requiredAssets'] as const

const checkStringList = checkArrayOf(checkString)
const checkParameters = checkArrayOf(checkSavedParameter)

const checkNoteParam: FieldCheck<NoteParam> = (value) =>
  isRecord(value) && typeof value.name === 'string' && typeof value.type === 'string'
    ? (value as unknown as NoteParam)
    : undefined

const checkLocalized: FieldCheck<LocalizedContent> = (value) =>
  isRecord(value) &&
  ['description', 'help'].every((key) => value[key] === undefined || typeof value[key] === 'string')
    ? (value as LocalizedContent)
    : undefined

/**
 * `meta` as the editors read it: a field of the wrong type takes its default, or is left out when
 * optional, and is named through `drop`.
 */
function checkMeta(meta: Record<string, unknown>, drop: (path: FieldPath) => void): PluginMeta {
  const checked = { ...meta }
  const take = (field: string, check: FieldCheck<unknown>, fallback?: unknown): void => {
    if (fallback === undefined && !Object.hasOwn(checked, field)) return
    const value = check(checked[field], (path) => drop([{ key: field }, ...path]))
    if (value !== undefined) {
      checked[field] = value
      return
    }
    drop([{ key: field }])
    if (fallback === undefined) delete checked[field]
    else checked[field] = fallback
  }
  for (const field of META_STRING_FIELDS) take(field, checkString, '')
  take('dependencies', checkStringList, [])
  for (const field of META_OPTIONAL_LISTS) take(field, checkStringList)
  take('noteParams', checkArrayOf(checkNoteParam))
  take('localizations', checkRecordOf(checkLocalized))
  return checked as unknown as PluginMeta
}

const idOf = (value: Record<string, unknown>): string =>
  typeof value.id === 'string' ? value.id : crypto.randomUUID()

const checkCommand: FieldCheck<PluginCommand> = (value, drop) => {
  if (!isRecord(value) || typeof value.name !== 'string') return undefined
  const args = checkParameters(value.args, (path) => drop([{ key: 'args' }, ...path]))
  if (args === undefined) return undefined
  for (const field of ['text', 'desc']) if (typeof value[field] !== 'string') drop([{ key: field }])
  return {
    id: idOf(value),
    name: value.name,
    text: typeof value.text === 'string' ? value.text : value.name,
    desc: typeof value.desc === 'string' ? value.desc : '',
    args
  }
}

const checkStruct: FieldCheck<PluginStruct> = (value, drop) => {
  if (!isRecord(value) || typeof value.name !== 'string') return undefined
  const parameters = checkParameters(value.parameters, (path) =>
    drop([{ key: 'parameters' }, ...path])
  )
  return parameters === undefined ? undefined : { id: idOf(value), name: value.name, parameters }
}

/** A saved plugin definition: rejected unless every editor can read it, elements one by one. */
const checkDefinition: FieldCheck<PluginDefinition> = (value, drop) => {
  if (
    !isRecord(value) ||
    typeof value.id !== 'string' ||
    !isRecord(value.meta) ||
    typeof value.meta.name !== 'string' ||
    !Array.isArray(value.parameters) ||
    !Array.isArray(value.commands) ||
    !Array.isArray(value.structs)
  ) {
    return undefined
  }
  const within = (field: string) => (path: FieldPath) => drop([{ key: field }, ...path])
  const plugin: Record<string, unknown> = {
    ...value,
    meta: checkMeta(value.meta, within('meta')),
    parameters: checkParameters(value.parameters, within('parameters')),
    commands: checkArrayOf(checkCommand)(value.commands, within('commands')),
    structs: checkArrayOf(checkStruct)(value.structs, within('structs'))
  }
  for (const field of OPTIONAL_STRING_FIELDS) {
    if (Object.hasOwn(plugin, field) && typeof plugin[field] !== 'string') {
      delete plugin[field]
      drop([{ key: field }])
    }
  }
  return plugin as unknown as PluginDefinition
}

/** The plugin name a saved tab shows, if it has one, to name it when it cannot be loaded. */
const tabName = (value: unknown): string | undefined =>
  isRecord(value) && isRecord(value.meta) && typeof value.meta.name === 'string'
    ? value.meta.name
    : undefined

const checkBaseline: FieldCheck<PluginBaseline> = (value, drop) => {
  const def = checkDefinition(value, drop)
  return def === undefined ? undefined : toBaseline(def)
}

const checkFileBase: FieldCheck<FileBase> = (value) =>
  isRecord(value) &&
  typeof value.path === 'string' &&
  (typeof value.sha256 === 'string' || value.sha256 === null)
    ? { path: value.path, sha256: value.sha256 }
    : undefined

/** A definition as saved: the code body is not kept, it is part of the file text. */
function toStored({ codeBody: _codeBody, ...plugin }: PluginDefinition): PluginDefinition {
  return plugin
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

function getPluginDirty(
  dirtyByPluginId: Record<string, boolean>,
  pluginId: string | null,
  fallback = false
): boolean {
  if (!pluginId) return false
  return dirtyByPluginId[pluginId] ?? fallback
}

function getPluginSavedPath(
  savedPathsByPluginId: Record<string, string>,
  pluginId: string | null,
  fallback: string | null = null
): string | null {
  if (!pluginId) return null
  return savedPathsByPluginId[pluginId] ?? fallback
}

function markPluginDirty(
  dirtyByPluginId: Record<string, boolean>,
  pluginId: string,
  isDirty: boolean
): Record<string, boolean> {
  if (isDirty) {
    return { ...dirtyByPluginId, [pluginId]: true }
  }

  if (!(pluginId in dirtyByPluginId)) {
    return dirtyByPluginId
  }

  const next = { ...dirtyByPluginId }
  delete next[pluginId]
  return next
}

/**
 * Applies an edit to a parameter or argument. A changed type drops the `@type` text it was
 * imported with, so the generated `@type` follows the edit.
 */
function editParameter(param: PluginParameter, edit: Partial<PluginParameter>): PluginParameter {
  const retyped = (['type', 'arrayType', 'structType'] as const).some(
    (key) => key in edit && edit[key] !== param[key]
  )
  return retyped ? { ...param, rawType: undefined, ...edit } : { ...param, ...edit }
}

/** Sets the file text of an open tab, in the tab list and on the active plugin; not an edit. */
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

      setPlugin: (plugin, dirty) =>
        set((state) => ({
          plugin,
          activePluginId: plugin.id,
          openPlugins: upsertOpenPlugin(state.openPlugins, plugin),
          ...(dirty !== undefined && {
            dirtyByPluginId: markPluginDirty(state.dirtyByPluginId, plugin.id, dirty)
          }),
          isDirty:
            dirty ??
            getPluginDirty(
              state.dirtyByPluginId,
              plugin.id,
              state.activePluginId === plugin.id ? state.isDirty : false
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

      // Parameters
      addParameter: (param) =>
        set((state) =>
          updateActivePluginState(state, (plugin) => ({
            ...plugin,
            parameters: [...plugin.parameters, param]
          }))
        ),
      updateParameter: (id, param) =>
        set((state) =>
          updateActivePluginState(state, (plugin) => ({
            ...plugin,
            parameters: plugin.parameters.map((p) => (p.id === id ? editParameter(p, param) : p))
          }))
        ),
      removeParameter: (id) =>
        set((state) =>
          updateActivePluginState(state, (plugin) => ({
            ...plugin,
            parameters: plugin.parameters.filter((p) => p.id !== id)
          }))
        ),
      removeParameters: (ids) =>
        set((state) => {
          if (ids.length === 0) return {}
          const idSet = new Set(ids)
          const filtered = state.plugin.parameters.filter((p) => !idSet.has(p.id))
          if (filtered.length === state.plugin.parameters.length) return {}
          return updateActivePluginState(state, (plugin) => ({
            ...plugin,
            parameters: filtered
          }))
        }),
      reorderParameters: (fromIndex, toIndex) =>
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
          const [moved] = params.splice(fromIndex, 1)
          params.splice(toIndex, 0, moved)
          return updateActivePluginState(state, (plugin) => ({
            ...plugin,
            parameters: params
          }))
        }),

      // Commands
      addCommand: (cmd) =>
        set((state) =>
          updateActivePluginState(state, (plugin) => ({
            ...plugin,
            commands: [...plugin.commands, cmd]
          }))
        ),
      updateCommand: (id, cmd) =>
        set((state) =>
          updateActivePluginState(state, (plugin) => ({
            ...plugin,
            commands: plugin.commands.map((c) => (c.id === id ? { ...c, ...cmd } : c))
          }))
        ),
      removeCommand: (id) =>
        set((state) =>
          updateActivePluginState(state, (plugin) => ({
            ...plugin,
            commands: plugin.commands.filter((c) => c.id !== id)
          }))
        ),
      addCommandArg: (cmdId, arg) =>
        set((state) =>
          updateActivePluginState(state, (plugin) => ({
            ...plugin,
            commands: plugin.commands.map((c) =>
              c.id === cmdId ? { ...c, args: [...c.args, arg] } : c
            )
          }))
        ),
      updateCommandArg: (cmdId, argId, arg) =>
        set((state) =>
          updateActivePluginState(state, (plugin) => ({
            ...plugin,
            commands: plugin.commands.map((c) =>
              c.id === cmdId
                ? { ...c, args: c.args.map((a) => (a.id === argId ? editParameter(a, arg) : a)) }
                : c
            )
          }))
        ),
      removeCommandArg: (cmdId, argId) =>
        set((state) =>
          updateActivePluginState(state, (plugin) => ({
            ...plugin,
            commands: plugin.commands.map((c) =>
              c.id === cmdId ? { ...c, args: c.args.filter((a) => a.id !== argId) } : c
            )
          }))
        ),

      // Structs
      addStruct: (struct) =>
        set((state) =>
          updateActivePluginState(state, (plugin) => ({
            ...plugin,
            structs: [...plugin.structs, struct]
          }))
        ),
      updateStruct: (id, struct) =>
        set((state) =>
          updateActivePluginState(state, (plugin) => ({
            ...plugin,
            structs: plugin.structs.map((s) => (s.id === id ? { ...s, ...struct } : s))
          }))
        ),
      removeStruct: (id) =>
        set((state) =>
          updateActivePluginState(state, (plugin) => ({
            ...plugin,
            structs: plugin.structs.filter((s) => s.id !== id)
          }))
        ),
      addStructParam: (structId, param) =>
        set((state) =>
          updateActivePluginState(state, (plugin) => ({
            ...plugin,
            structs: plugin.structs.map((s) =>
              s.id === structId ? { ...s, parameters: [...s.parameters, param] } : s
            )
          }))
        ),
      updateStructParam: (structId, paramId, param) =>
        set((state) =>
          updateActivePluginState(state, (plugin) => ({
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
        ),
      removeStructParam: (structId, paramId) =>
        set((state) =>
          updateActivePluginState(state, (plugin) => ({
            ...plugin,
            structs: plugin.structs.map((s) =>
              s.id === structId
                ? { ...s, parameters: s.parameters.filter((p) => p.id !== paramId) }
                : s
            )
          }))
        ),

      // Multi-plugin
      openPlugin: (plugin, base) =>
        set((state) => {
          const recordBaseline =
            isImported(plugin) && plugin.rawSource && !(plugin.id in state.baselineByPluginId)
          return {
            ...(recordBaseline && {
              baselineByPluginId: { ...state.baselineByPluginId, [plugin.id]: toBaseline(plugin) }
            }),
            ...(base !== undefined && {
              baseByPluginId: { ...state.baseByPluginId, [plugin.id]: base }
            }),
            openPlugins: upsertOpenPlugin(state.openPlugins, plugin),
            activePluginId: plugin.id,
            plugin,
            isDirty: getPluginDirty(state.dirtyByPluginId, plugin.id),
            savedPath: getPluginSavedPath(state.savedPathsByPluginId, plugin.id)
          }
        }),
      closePlugin: (id) => {
        // Clean up raw mode and history BEFORE state switch (synchronous)
        useUIStore.getState().clearRawModeForPlugin(id)
        useHistoryStore.getState().clear()
        set((state) => {
          const newOpenPlugins = state.openPlugins.filter((p) => p.id !== id)
          const maps = filterTabMaps(state, (key) => key !== id)
          const newActive =
            state.activePluginId === id
              ? newOpenPlugins.length > 0
                ? newOpenPlugins[newOpenPlugins.length - 1].id
                : null
              : state.activePluginId
          const newPlugin =
            newActive && newOpenPlugins.length > 0
              ? newOpenPlugins.find((p) => p.id === newActive) || createEmptyPlugin()
              : createEmptyPlugin()
          return {
            openPlugins: newOpenPlugins,
            activePluginId: newActive,
            plugin: newPlugin,
            isDirty: getPluginDirty(maps.dirtyByPluginId, newActive),
            savedPath: getPluginSavedPath(maps.savedPathsByPluginId, newActive),
            ...maps
          }
        })
      },
      setActivePlugin: (id) =>
        set((state) => {
          const syncedOpenPlugins =
            state.activePluginId && state.plugin.id === state.activePluginId
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
              isDirty: getPluginDirty(state.dirtyByPluginId, id),
              savedPath: getPluginSavedPath(state.savedPathsByPluginId, id)
            }
          }
          return {}
        }),

      // Code
      setCustomCode: (code) =>
        set((state) =>
          updateActivePluginState(state, (plugin) => ({
            ...plugin,
            customCode: code
          }))
        ),

      reattachSource: (id, rawSource, parsed, { keepTab, base }) =>
        set((state) => {
          const tab = state.openPlugins.find((p) => p.id === id)
          if (tab === undefined) return {}
          const fileName = (tab.importedFrom ?? '').replace(/\.js$/i, '')
          const fromFile: PluginDefinition = {
            ...parsed,
            id,
            importedFrom: tab.importedFrom,
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
        }),
      recordSaves: (records) =>
        set((state) => {
          let { openPlugins, plugin } = state
          const dirtyByPluginId = { ...state.dirtyByPluginId }
          const savedPathsByPluginId = { ...state.savedPathsByPluginId }
          const baseByPluginId = { ...state.baseByPluginId }
          const baselineByPluginId = { ...state.baselineByPluginId }
          for (const { id, saved, path, sha256, written } of records) {
            const tab = plugin.id === id ? plugin : openPlugins.find((p) => p.id === id)
            if (tab === undefined) continue
            savedPathsByPluginId[id] = path
            baseByPluginId[id] = { path, sha256 }
            // An edit made while the file was written is not in it
            if (tab === saved) delete dirtyByPluginId[id]
            if (isImported(tab)) {
              ;({ openPlugins, plugin } = withRawSource(
                { ...state, openPlugins, plugin },
                id,
                written
              ))
              baselineByPluginId[id] = toBaseline(saved)
            }
          }
          const activeSaved = records.some((r) => r.id === plugin.id)
          return {
            openPlugins,
            plugin,
            dirtyByPluginId,
            savedPathsByPluginId,
            baseByPluginId,
            baselineByPluginId,
            ...(activeSaved && {
              isDirty: getPluginDirty(dirtyByPluginId, plugin.id),
              savedPath: getPluginSavedPath(savedPathsByPluginId, plugin.id)
            })
          }
        }),

      // State
      setDirty: (isDirty) =>
        set((state) => ({
          isDirty,
          dirtyByPluginId: markPluginDirty(state.dirtyByPluginId, state.plugin.id, isDirty)
        }))
    }),
    definePersist<PluginState, PluginPersisted>({
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
        openPlugins: state.openPlugins.map(toStored),
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
  )
)
