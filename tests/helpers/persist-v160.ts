// The five persist option blocks of tag v1.6.0, copied from
// src/renderer/src/stores/{pluginStore,uiStore,settingsStore,projectStore,templateStore}.ts at
// that tag, each around v1.6.0's initial values of the persisted fields; the pruning callbacks
// are reshaped to this repository's lint rules, with the same reads and writes. The stores stand
// in for v1.6.0 reading and writing back what a newer build saved (downgrade checks).
import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { create, type StoreApi, type UseBoundStore } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  createEmptyPlugin,
  type PluginDefinition,
  type PluginParameter
} from '../../src/shared/types/plugin'

export type PersistedKey =
  | 'mz-plugin-studio-project'
  | 'mz-plugin-studio-templates'
  | 'mz-plugin-studio-ui'
  | 'mz-plugin-studio-settings'
  | 'mz-plugin-studio-plugin'

export const PERSISTED_KEYS: readonly PersistedKey[] = [
  'mz-plugin-studio-project',
  'mz-plugin-studio-templates',
  'mz-plugin-studio-ui',
  'mz-plugin-studio-settings',
  'mz-plugin-studio-plugin'
]

const PAYLOAD_DIR = path.join(process.cwd(), 'tests/fixtures/persisted/v1.6.0')

/**
The captured v1.6.0 values found on disk, by key (exact strings).
*/
export function readV160Payloads(): Partial<Record<PersistedKey, string>> {
  const payloads: Partial<Record<PersistedKey, string>> = {}
  for (const file of readdirSync(PAYLOAD_DIR)) {
    const name = file.replace(/\.json$/, '')
    const key = PERSISTED_KEYS.find((known) => known === name)
    if (key !== undefined) payloads[key] = readFileSync(path.join(PAYLOAD_DIR, file), 'utf8')
  }
  return payloads
}

/**
What the downgrade checks call on each store: a write-back that changes nothing.
*/
interface V160Store {
  setState(partial: Record<string, never>): void
}

interface PluginState {
  plugin: PluginDefinition
  openPlugins: PluginDefinition[]
  activePluginId: string | null
  isDirty: boolean
  savedPath: string | null
  dirtyByPluginId: Record<string, boolean>
  savedPathsByPluginId: Record<string, string>
}

interface UIState {
  sidebarWidth: number
  previewWidth: number
  rawModeByPluginId: Record<string, boolean>
  previewCollapsed: boolean
  lastTemplateCategory: string
}

interface SettingsState {
  theme: 'dark' | 'light'
  editorFontSize: number
  editorWordWrap: boolean
  editorMinimap: boolean
  editorLineNumbers: boolean
  defaultAuthor: string
  parameterPresets: Record<string, PluginParameter[]>
  debugLogging: boolean
}

interface ProjectState {
  recentProjects: string[]
}

interface TemplateStoreState {
  favorites: string[]
  recentlyUsed: { id: string; timestamp: number }[]
}

type PluginStore = UseBoundStore<StoreApi<PluginState>>
type UIStore = UseBoundStore<StoreApi<UIState>>

/**
The entries of `map` whose key is a live plugin id, in their order.
*/
function liveEntries<T>(map: Record<string, T>, liveIds: Set<string>): Record<string, T> {
  return Object.fromEntries(Object.entries(map).filter(([id]) => liveIds.has(id)))
}

function createV160PluginStore(): PluginStore {
  const usePluginStore = create<PluginState>()(
    persist(
      (): PluginState => ({
        plugin: createEmptyPlugin(),
        openPlugins: [],
        activePluginId: null,
        isDirty: false,
        savedPath: null,
        dirtyByPluginId: {},
        savedPathsByPluginId: {}
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
        }),
        // Prune stale map entries for plugins no longer in openPlugins (LEAK-05)
        onRehydrateStorage: () => pruneClosed
      }
    )
  )
  function pruneClosed(state: PluginState | undefined): void {
    if (!state) return
    const liveIds = new Set(state.openPlugins.map((p) => p.id))
    const nextDirty = liveEntries(state.dirtyByPluginId, liveIds)
    const nextPaths = liveEntries(state.savedPathsByPluginId, liveIds)
    const isDirtyChanged =
      Object.keys(nextDirty).length !== Object.keys(state.dirtyByPluginId).length
    const isPathsChanged =
      Object.keys(nextPaths).length !== Object.keys(state.savedPathsByPluginId).length
    if (isDirtyChanged || isPathsChanged) {
      usePluginStore.setState({
        ...(isDirtyChanged && { dirtyByPluginId: nextDirty }),
        ...(isPathsChanged && { savedPathsByPluginId: nextPaths })
      })
    }
  }
  return usePluginStore
}

function createV160UIStore(usePluginStore: PluginStore): UIStore {
  const useUIStore = create<UIState>()(
    persist(
      (): UIState => ({
        sidebarWidth: 280,
        previewWidth: 500,
        rawModeByPluginId: {},
        previewCollapsed: false,
        lastTemplateCategory: 'method-alias'
      }),
      {
        name: 'mz-plugin-studio-ui',
        partialize: (state) => ({
          sidebarWidth: state.sidebarWidth,
          previewWidth: state.previewWidth,
          previewCollapsed: state.previewCollapsed,
          lastTemplateCategory: state.lastTemplateCategory,
          rawModeByPluginId: state.rawModeByPluginId
        }),
        // Prune rawModeByPluginId entries for plugins no longer open (LEAK-05)
        onRehydrateStorage: () => pruneClosed
      }
    )
  )
  function pruneClosed(state: UIState | undefined): void {
    if (!state) return
    // Defer to next tick so pluginStore is fully hydrated first
    setTimeout(() => {
      try {
        const liveIds = new Set(usePluginStore.getState().openPlugins.map((p) => p.id))
        const raw = useUIStore.getState().rawModeByPluginId
        const next = liveEntries(raw, liveIds)
        if (Object.keys(next).length === Object.keys(raw).length) return
        useUIStore.setState({ rawModeByPluginId: next })
      } catch {
        // pluginStore not available (e.g. in tests) — skip pruning
      }
    }, 0)
  }
  return useUIStore
}

/**
Fresh v1.6.0 stores; each hydrates from localStorage as it is created.
*/
export function createV160Stores(): Record<PersistedKey, V160Store> {
  const usePluginStore = createV160PluginStore()
  const useUIStore = createV160UIStore(usePluginStore)

  const useSettingsStore = create<SettingsState>()(
    persist(
      (): SettingsState => ({
        theme: 'dark' as const,
        editorFontSize: 13,
        editorWordWrap: true,
        editorMinimap: false,
        editorLineNumbers: true,
        defaultAuthor: '',
        parameterPresets: {},
        debugLogging: false
      }),
      {
        name: 'mz-plugin-studio-settings',
        partialize: (state) => ({
          theme: state.theme,
          editorFontSize: state.editorFontSize,
          editorWordWrap: state.editorWordWrap,
          editorMinimap: state.editorMinimap,
          editorLineNumbers: state.editorLineNumbers,
          defaultAuthor: state.defaultAuthor,
          parameterPresets: state.parameterPresets,
          debugLogging: state.debugLogging
        })
      }
    )
  )

  const useProjectStore = create<ProjectState>()(
    persist(
      (): ProjectState => ({
        recentProjects: []
      }),
      {
        name: 'mz-plugin-studio-project',
        partialize: (state) => ({ recentProjects: state.recentProjects })
      }
    )
  )

  const useTemplateStore = create<TemplateStoreState>()(
    persist(
      (): TemplateStoreState => ({
        favorites: [],
        recentlyUsed: []
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

  return {
    'mz-plugin-studio-plugin': usePluginStore,
    'mz-plugin-studio-ui': useUIStore,
    'mz-plugin-studio-settings': useSettingsStore,
    'mz-plugin-studio-project': useProjectStore,
    'mz-plugin-studio-templates': useTemplateStore
  }
}
