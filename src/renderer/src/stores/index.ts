import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { MZProject, MZSwitch, MZVariable, MZActor, MZItem } from '../types/mz'
import type {
  PluginDefinition,
  PluginParameter,
  PluginCommand,
  PluginStruct
} from '../types/plugin'
import { createEmptyPlugin, setSettingsGetter } from '../types/plugin'

// Project Store
interface ProjectState {
  project: MZProject | null
  recentProjects: string[]
  isLoading: boolean
  error: string | null
  switches: MZSwitch[]
  variables: MZVariable[]
  actors: MZActor[]
  items: MZItem[]

  setProject: (project: MZProject | null) => void
  addRecentProject: (path: string) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  setSwitches: (switches: MZSwitch[]) => void
  setVariables: (variables: MZVariable[]) => void
  setActors: (actors: MZActor[]) => void
  setItems: (items: MZItem[]) => void
  clearProject: () => void
}

export const useProjectStore = create<ProjectState>()(
  persist(
    (set) => ({
      project: null,
      recentProjects: [],
      isLoading: false,
      error: null,
      switches: [],
      variables: [],
      actors: [],
      items: [],

      setProject: (project) => set({ project, error: null }),
      addRecentProject: (path) =>
        set((state) => ({
          recentProjects: [path, ...state.recentProjects.filter((p) => p !== path)].slice(0, 10)
        })),
      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),
      setSwitches: (switches) => set({ switches }),
      setVariables: (variables) => set({ variables }),
      setActors: (actors) => set({ actors }),
      setItems: (items) => set({ items }),
      clearProject: () =>
        set({
          project: null,
          switches: [],
          variables: [],
          actors: [],
          items: [],
          error: null
        })
    }),
    {
      name: 'mz-plugin-studio-project',
      partialize: (state) => ({ recentProjects: state.recentProjects })
    }
  )
)

// Plugin Store
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
                ? { ...s, parameters: s.parameters.map((p) => (p.id === paramId ? { ...p, ...param } : p)) }
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
              s.id === structId ? { ...s, parameters: s.parameters.filter((p) => p.id !== paramId) } : s
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

// History Store for undo/redo
interface HistoryEntry {
  plugin: PluginDefinition
  timestamp: number
}

interface HistoryState {
  past: HistoryEntry[]
  future: HistoryEntry[]

  push: (plugin: PluginDefinition) => void
  undo: () => PluginDefinition | null
  redo: () => PluginDefinition | null
  clear: () => void
  canUndo: () => boolean
  canRedo: () => boolean
}

export const useHistoryStore = create<HistoryState>()((set, get) => ({
  past: [],
  future: [],

  push: (plugin) =>
    set((state) => ({
      past: [...state.past.slice(-49), { plugin, timestamp: Date.now() }],
      future: []
    })),

  undo: () => {
    const { past, future } = get()
    if (past.length === 0) return null

    const previous = past[past.length - 1]
    const currentPlugin = usePluginStore.getState().plugin

    set({
      past: past.slice(0, -1),
      future: [{ plugin: currentPlugin, timestamp: Date.now() }, ...future]
    })

    return previous.plugin
  },

  redo: () => {
    const { past, future } = get()
    if (future.length === 0) return null

    const next = future[0]
    const currentPlugin = usePluginStore.getState().plugin

    set({
      past: [...past, { plugin: currentPlugin, timestamp: Date.now() }],
      future: future.slice(1)
    })

    return next.plugin
  },

  clear: () => set({ past: [], future: [] }),
  canUndo: () => get().past.length > 0,
  canRedo: () => get().future.length > 0
}))

// UI Store
interface UIState {
  sidebarWidth: number
  previewWidth: number
  activeTab: 'meta' | 'parameters' | 'commands' | 'structs' | 'code' | 'preview'
  selectedParameterId: string | null
  selectedCommandId: string | null
  selectedStructId: string | null

  setSidebarWidth: (width: number) => void
  setPreviewWidth: (width: number) => void
  setActiveTab: (tab: UIState['activeTab']) => void
  setSelectedParameterId: (id: string | null) => void
  setSelectedCommandId: (id: string | null) => void
  setSelectedStructId: (id: string | null) => void
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarWidth: 280,
      previewWidth: 500,
      activeTab: 'meta',
      selectedParameterId: null,
      selectedCommandId: null,
      selectedStructId: null,

      setSidebarWidth: (sidebarWidth) => set({ sidebarWidth }),
      setPreviewWidth: (previewWidth) => set({ previewWidth: Math.max(300, Math.min(1200, previewWidth)) }),
      setActiveTab: (activeTab) => set({ activeTab }),
      setSelectedParameterId: (selectedParameterId) => set({ selectedParameterId }),
      setSelectedCommandId: (selectedCommandId) => set({ selectedCommandId }),
      setSelectedStructId: (selectedStructId) => set({ selectedStructId })
    }),
    {
      name: 'mz-plugin-studio-ui',
      partialize: (state) => ({ sidebarWidth: state.sidebarWidth, previewWidth: state.previewWidth })
    }
  )
)

// Settings Store
interface SettingsState {
  // Editor
  editorFontSize: number
  editorWordWrap: boolean
  editorMinimap: boolean
  editorLineNumbers: boolean
  // Defaults
  defaultAuthor: string
  // Setters
  setEditorFontSize: (size: number) => void
  setEditorWordWrap: (wrap: boolean) => void
  setEditorMinimap: (minimap: boolean) => void
  setEditorLineNumbers: (lineNumbers: boolean) => void
  setDefaultAuthor: (author: string) => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      editorFontSize: 13,
      editorWordWrap: true,
      editorMinimap: false,
      editorLineNumbers: true,
      defaultAuthor: '',

      setEditorFontSize: (size) => set({ editorFontSize: Math.max(10, Math.min(24, size)) }),
      setEditorWordWrap: (wrap) => set({ editorWordWrap: wrap }),
      setEditorMinimap: (minimap) => set({ editorMinimap: minimap }),
      setEditorLineNumbers: (lineNumbers) => set({ editorLineNumbers: lineNumbers }),
      setDefaultAuthor: (author) => set({ defaultAuthor: author })
    }),
    {
      name: 'mz-plugin-studio-settings'
    }
  )
)

// Wire up settings getter so createEmptyPlugin() can use defaults
setSettingsGetter(() => {
  const state = useSettingsStore.getState()
  return { defaultAuthor: state.defaultAuthor }
})

// Template Store - Favorites and Recently Used
interface TemplateStoreState {
  favorites: string[] // template IDs
  recentlyUsed: { id: string; timestamp: number }[] // last 10

  toggleFavorite: (id: string) => void
  addToRecent: (id: string) => void
  isFavorite: (id: string) => boolean
  clearRecent: () => void
}

export const useTemplateStore = create<TemplateStoreState>()(
  persist(
    (set, get) => ({
      favorites: [],
      recentlyUsed: [],

      toggleFavorite: (id) =>
        set((state) => ({
          favorites: state.favorites.includes(id)
            ? state.favorites.filter((f) => f !== id)
            : [...state.favorites, id]
        })),

      addToRecent: (id) =>
        set((state) => ({
          recentlyUsed: [
            { id, timestamp: Date.now() },
            ...state.recentlyUsed.filter((r) => r.id !== id)
          ].slice(0, 10)
        })),

      isFavorite: (id) => get().favorites.includes(id),
      clearRecent: () => set({ recentlyUsed: [] })
    }),
    {
      name: 'mz-plugin-studio-templates',
      partialize: (state) => ({
        favorites: state.favorites,
        recentlyUsed: state.recentlyUsed
      })
    }
  )
)
