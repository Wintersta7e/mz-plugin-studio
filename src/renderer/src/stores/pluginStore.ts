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

export const usePluginStore = create<PluginState>()(
  persist(
    (set) => ({
      plugin: createEmptyPlugin(),
      openPlugins: [],
      activePluginId: null,
      isDirty: false,
      savedPath: null,

      setPlugin: (plugin) => set({ plugin, isDirty: false }),
      updateMeta: (meta) =>
        set((state) => ({
          plugin: { ...state.plugin, meta: { ...state.plugin.meta, ...meta } },
          isDirty: true
        })),

      // Parameters
      addParameter: (param) =>
        set((state) => ({
          plugin: { ...state.plugin, parameters: [...state.plugin.parameters, param] },
          isDirty: true
        })),
      updateParameter: (id, param) =>
        set((state) => ({
          plugin: {
            ...state.plugin,
            parameters: state.plugin.parameters.map((p) => (p.id === id ? { ...p, ...param } : p))
          },
          isDirty: true
        })),
      removeParameter: (id) =>
        set((state) => ({
          plugin: {
            ...state.plugin,
            parameters: state.plugin.parameters.filter((p) => p.id !== id)
          },
          isDirty: true
        })),
      removeParameters: (ids) =>
        set((state) => {
          if (ids.length === 0) return {}
          const idSet = new Set(ids)
          const filtered = state.plugin.parameters.filter((p) => !idSet.has(p.id))
          if (filtered.length === state.plugin.parameters.length) return {}
          return {
            plugin: { ...state.plugin, parameters: filtered },
            isDirty: true
          }
        }),
      reorderParameters: (fromIndex, toIndex) =>
        set((state) => {
          const params = [...state.plugin.parameters]
          const [moved] = params.splice(fromIndex, 1)
          params.splice(toIndex, 0, moved)
          return { plugin: { ...state.plugin, parameters: params }, isDirty: true }
        }),

      // Commands
      addCommand: (cmd) =>
        set((state) => ({
          plugin: { ...state.plugin, commands: [...state.plugin.commands, cmd] },
          isDirty: true
        })),
      updateCommand: (id, cmd) =>
        set((state) => ({
          plugin: {
            ...state.plugin,
            commands: state.plugin.commands.map((c) => (c.id === id ? { ...c, ...cmd } : c))
          },
          isDirty: true
        })),
      removeCommand: (id) =>
        set((state) => ({
          plugin: {
            ...state.plugin,
            commands: state.plugin.commands.filter((c) => c.id !== id)
          },
          isDirty: true
        })),
      addCommandArg: (cmdId, arg) =>
        set((state) => ({
          plugin: {
            ...state.plugin,
            commands: state.plugin.commands.map((c) =>
              c.id === cmdId ? { ...c, args: [...c.args, arg] } : c
            )
          },
          isDirty: true
        })),
      updateCommandArg: (cmdId, argId, arg) =>
        set((state) => ({
          plugin: {
            ...state.plugin,
            commands: state.plugin.commands.map((c) =>
              c.id === cmdId
                ? { ...c, args: c.args.map((a) => (a.id === argId ? { ...a, ...arg } : a)) }
                : c
            )
          },
          isDirty: true
        })),
      removeCommandArg: (cmdId, argId) =>
        set((state) => ({
          plugin: {
            ...state.plugin,
            commands: state.plugin.commands.map((c) =>
              c.id === cmdId ? { ...c, args: c.args.filter((a) => a.id !== argId) } : c
            )
          },
          isDirty: true
        })),

      // Structs
      addStruct: (struct) =>
        set((state) => ({
          plugin: { ...state.plugin, structs: [...state.plugin.structs, struct] },
          isDirty: true
        })),
      updateStruct: (id, struct) =>
        set((state) => ({
          plugin: {
            ...state.plugin,
            structs: state.plugin.structs.map((s) => (s.id === id ? { ...s, ...struct } : s))
          },
          isDirty: true
        })),
      removeStruct: (id) =>
        set((state) => ({
          plugin: {
            ...state.plugin,
            structs: state.plugin.structs.filter((s) => s.id !== id)
          },
          isDirty: true
        })),
      addStructParam: (structId, param) =>
        set((state) => ({
          plugin: {
            ...state.plugin,
            structs: state.plugin.structs.map((s) =>
              s.id === structId ? { ...s, parameters: [...s.parameters, param] } : s
            )
          },
          isDirty: true
        })),
      updateStructParam: (structId, paramId, param) =>
        set((state) => ({
          plugin: {
            ...state.plugin,
            structs: state.plugin.structs.map((s) =>
              s.id === structId
                ? {
                    ...s,
                    parameters: s.parameters.map((p) => (p.id === paramId ? { ...p, ...param } : p))
                  }
                : s
            )
          },
          isDirty: true
        })),
      removeStructParam: (structId, paramId) =>
        set((state) => ({
          plugin: {
            ...state.plugin,
            structs: state.plugin.structs.map((s) =>
              s.id === structId
                ? { ...s, parameters: s.parameters.filter((p) => p.id !== paramId) }
                : s
            )
          },
          isDirty: true
        })),

      // Multi-plugin
      openPlugin: (plugin) =>
        set((state) => {
          const existing = state.openPlugins.find((p) => p.id === plugin.id)
          if (existing) {
            return { activePluginId: plugin.id, plugin }
          }
          return {
            openPlugins: [...state.openPlugins, plugin],
            activePluginId: plugin.id,
            plugin
          }
        }),
      closePlugin: (id) =>
        set((state) => {
          const newOpenPlugins = state.openPlugins.filter((p) => p.id !== id)
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
            isDirty: false
          }
        }),
      setActivePlugin: (id) =>
        set((state) => {
          const plugin = state.openPlugins.find((p) => p.id === id)
          if (plugin) {
            return { activePluginId: id, plugin }
          }
          return {}
        }),

      // Code
      setCustomCode: (code) =>
        set((state) => ({
          plugin: { ...state.plugin, customCode: code },
          isDirty: true
        })),

      // State
      setDirty: (isDirty) => set({ isDirty }),
      setSavedPath: (savedPath) => set({ savedPath }),
      resetPlugin: () => set({ plugin: createEmptyPlugin(), isDirty: false, savedPath: null })
    }),
    {
      name: 'mz-plugin-studio-plugin',
      partialize: (state) => ({
        plugin: state.plugin,
        openPlugins: state.openPlugins,
        activePluginId: state.activePluginId,
        savedPath: state.savedPath
      })
    }
  )
)
