// The five persist option blocks of tag v1.6.0, copied verbatim from
// src/renderer/src/stores/{pluginStore,uiStore,settingsStore,projectStore,templateStore}.ts at
// that tag, each around v1.6.0's initial values of the persisted fields. The stores stand in
// for v1.6.0 reading and writing back what a newer build saved (downgrade checks).
import { readdirSync, readFileSync } from 'fs'
import { join } from 'path'
import { create } from 'zustand'
import type { StoreApi, UseBoundStore } from 'zustand'
import { persist } from 'zustand/middleware'
import { createEmptyPlugin } from '../../src/shared/types/plugin'
import type { PluginDefinition, PluginParameter } from '../../src/shared/types/plugin'

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

const PAYLOAD_DIR = join(process.cwd(), 'tests/fixtures/persisted/v1.6.0')

/** The captured v1.6.0 values found on disk, by key (exact strings). */
export function readV160Payloads(): Partial<Record<PersistedKey, string>> {
  const payloads: Partial<Record<PersistedKey, string>> = {}
  for (const file of readdirSync(PAYLOAD_DIR)) {
    const key = file.replace(/\.json$/, '') as PersistedKey
    if (PERSISTED_KEYS.includes(key)) payloads[key] = readFileSync(join(PAYLOAD_DIR, file), 'utf8')
  }
  return payloads
}

type AnyStore = UseBoundStore<StoreApi<Record<string, unknown>>>

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

/** Fresh v1.6.0 stores; each hydrates from localStorage as it is created. */
export function createV160Stores(): Record<PersistedKey, AnyStore> {
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
        onRehydrateStorage: () => (state) => {
          if (!state) return
          const liveIds = new Set(state.openPlugins.map((p) => p.id))
          let dirtyChanged = false
          let pathsChanged = false
          const nextDirty = { ...state.dirtyByPluginId }
          const nextPaths = { ...state.savedPathsByPluginId }
          for (const key of Object.keys(nextDirty)) {
            if (!liveIds.has(key)) {
              delete nextDirty[key]
              dirtyChanged = true
            }
          }
          for (const key of Object.keys(nextPaths)) {
            if (!liveIds.has(key)) {
              delete nextPaths[key]
              pathsChanged = true
            }
          }
          if (dirtyChanged || pathsChanged) {
            usePluginStore.setState({
              ...(dirtyChanged ? { dirtyByPluginId: nextDirty } : {}),
              ...(pathsChanged ? { savedPathsByPluginId: nextPaths } : {})
            })
          }
        }
      }
    )
  )

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
        onRehydrateStorage: () => (state) => {
          if (!state) return
          // Defer to next tick so pluginStore is fully hydrated first
          setTimeout(() => {
            try {
              const liveIds = new Set(usePluginStore.getState().openPlugins.map((p) => p.id))
              const raw = useUIStore.getState().rawModeByPluginId
              const stale = Object.keys(raw).filter((k) => !liveIds.has(k))
              if (stale.length === 0) return
              const next = { ...raw }
              for (const key of stale) delete next[key]
              useUIStore.setState({ rawModeByPluginId: next })
            } catch {
              // pluginStore not available (e.g. in tests) — skip pruning
            }
          }, 0)
        }
      }
    )
  )

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
    'mz-plugin-studio-plugin': usePluginStore as unknown as AnyStore,
    'mz-plugin-studio-ui': useUIStore as unknown as AnyStore,
    'mz-plugin-studio-settings': useSettingsStore as unknown as AnyStore,
    'mz-plugin-studio-project': useProjectStore as unknown as AnyStore,
    'mz-plugin-studio-templates': useTemplateStore as unknown as AnyStore
  }
}
