import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  PluginDefinition,
  PluginParameter,
  PluginCommand,
  PluginStruct
} from '../types/plugin'
import { createEmptyPlugin } from '../types/plugin'

interface PluginState {
  plugin: PluginDefinition
  openPlugins: PluginDefinition[]
  activePluginId: string | null
  isDirty: boolean
  savedPath: string | null
  dirtyByPluginId: Record<string, boolean>
  savedPathsByPluginId: Record<string, string>

  setPlugin: (plugin: PluginDefinition) => void
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

  // Multi-plugin
  openPlugin: (plugin: PluginDefinition) => void
  closePlugin: (id: string) => void
  setActivePlugin: (id: string) => void

  // Code
  setCustomCode: (code: string) => void

  // State
  setDirty: (dirty: boolean) => void
  setSavedPath: (path: string | null) => void
  resetPlugin: () => void
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

function setPluginSavedPath(
  savedPathsByPluginId: Record<string, string>,
  pluginId: string,
  savedPath: string | null
): Record<string, string> {
  if (savedPath) {
    return { ...savedPathsByPluginId, [pluginId]: savedPath }
  }

  if (!(pluginId in savedPathsByPluginId)) {
    return savedPathsByPluginId
  }

  const next = { ...savedPathsByPluginId }
  delete next[pluginId]
  return next
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

      setPlugin: (plugin) =>
        set((state) => ({
          plugin,
          activePluginId: plugin.id,
          openPlugins: upsertOpenPlugin(state.openPlugins, plugin),
          isDirty: getPluginDirty(
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
            parameters: plugin.parameters.map((p) => (p.id === id ? { ...p, ...param } : p))
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
          const params = [...state.plugin.parameters]
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
                ? { ...c, args: c.args.map((a) => (a.id === argId ? { ...a, ...arg } : a)) }
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
                    parameters: s.parameters.map((p) => (p.id === paramId ? { ...p, ...param } : p))
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
      openPlugin: (plugin) =>
        set((state) => {
          return {
            openPlugins: upsertOpenPlugin(state.openPlugins, plugin),
            activePluginId: plugin.id,
            plugin,
            isDirty: getPluginDirty(state.dirtyByPluginId, plugin.id),
            savedPath: getPluginSavedPath(state.savedPathsByPluginId, plugin.id)
          }
        }),
      closePlugin: (id) => {
        // Clean up raw mode and history BEFORE state switch (avoids async race)
        import('./uiStore').then(({ useUIStore }) => {
          useUIStore.getState().clearRawModeForPlugin(id)
        })
        import('./historyStore').then(({ useHistoryStore }) => {
          useHistoryStore.getState().clear()
        })
        set((state) => {
          const newOpenPlugins = state.openPlugins.filter((p) => p.id !== id)
          const dirtyByPluginId = markPluginDirty(state.dirtyByPluginId, id, false)
          const savedPathsByPluginId = setPluginSavedPath(state.savedPathsByPluginId, id, null)
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
            isDirty: getPluginDirty(dirtyByPluginId, newActive),
            savedPath: getPluginSavedPath(savedPathsByPluginId, newActive),
            dirtyByPluginId,
            savedPathsByPluginId
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
            // Clear undo history when switching plugins (imported lazily to avoid circular deps)
            import('./historyStore').then(({ useHistoryStore }) => {
              useHistoryStore.getState().setActivePluginId(id)
            })
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

      // State
      setDirty: (isDirty) =>
        set((state) => ({
          isDirty,
          dirtyByPluginId: markPluginDirty(state.dirtyByPluginId, state.plugin.id, isDirty)
        })),
      setSavedPath: (savedPath) =>
        set((state) => ({
          savedPath,
          savedPathsByPluginId: setPluginSavedPath(
            state.savedPathsByPluginId,
            state.plugin.id,
            savedPath
          )
        })),
      resetPlugin: () =>
        set({
          plugin: createEmptyPlugin(),
          openPlugins: [],
          activePluginId: null,
          isDirty: false,
          savedPath: null,
          dirtyByPluginId: {},
          savedPathsByPluginId: {}
        })
    }),
    {
      name: 'mz-plugin-studio-plugin',
      partialize: (state) => ({
        plugin: { ...state.plugin, rawSource: undefined },
        openPlugins: state.openPlugins.map((p) => ({ ...p, rawSource: undefined })),
        activePluginId: state.activePluginId,
        isDirty: state.isDirty,
        savedPath: state.savedPath,
        dirtyByPluginId: state.dirtyByPluginId,
        savedPathsByPluginId: state.savedPathsByPluginId
      })
    }
  )
)
