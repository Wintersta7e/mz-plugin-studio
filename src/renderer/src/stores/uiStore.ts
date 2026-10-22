import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  checkBoolean,
  checkFiniteNumber,
  checkRecordOf,
  checkString,
  definePersist,
  isRecord
} from './persist'
import type { MigrationStep } from './persist'
import { usePluginStore } from './pluginStore'

interface UIState {
  sidebarWidth: number
  previewWidth: number
  activeTab: 'meta' | 'parameters' | 'commands' | 'structs' | 'code' | 'preview'
  selectedParameterId: string | null
  selectedCommandId: string | null
  selectedStructId: string | null
  mainView: 'editor' | 'analysis'
  rawModeByPluginId: Record<string, boolean>
  // Imported plugins whose save without raw mode was confirmed this session (not persisted)
  structuralSaveConfirmedByPluginId: Record<string, true>
  // A plugin whose diff the preview opens next (not persisted)
  diffRequestPluginId: string | null
  previewCollapsed: boolean
  lastTemplateCategory: string

  setSidebarWidth: (width: number) => void
  setPreviewWidth: (width: number) => void
  setActiveTab: (tab: UIState['activeTab']) => void
  setSelectedParameterId: (id: string | null) => void
  setSelectedCommandId: (id: string | null) => void
  setSelectedStructId: (id: string | null) => void
  setMainView: (view: UIState['mainView']) => void
  setLastTemplateCategory: (cat: string) => void
  setPreviewCollapsed: (collapsed: boolean) => void
  togglePreview: () => void
  setRawModeForPlugin: (pluginId: string, enabled: boolean) => void
  clearRawModeForPlugin: (pluginId: string) => void
  confirmStructuralSave: (pluginId: string) => void
  requestDiff: (pluginId: string) => void
  clearDiffRequest: () => void
}

type PersistedField =
  | 'sidebarWidth'
  | 'previewWidth'
  | 'previewCollapsed'
  | 'lastTemplateCategory'
  | 'rawModeByPluginId'

/** The record without `key`; the same record when it has no such key. */
function without<T>(record: Record<string, T>, key: string): Record<string, T> {
  if (!(key in record)) return record
  const next = { ...record }
  delete next[key]
  return next
}

const UI_MIGRATIONS: readonly MigrationStep[] = [
  (state) => state,
  // Raw mode is on for imported plugins unless the user turns it off; v1.6.0 stored false
  // for plugins it had restored without their file text, so those entries are dropped.
  (state) =>
    isRecord(state.rawModeByPluginId)
      ? {
          ...state,
          rawModeByPluginId: Object.fromEntries(
            Object.entries(state.rawModeByPluginId).filter(([, on]) => on !== false)
          )
        }
      : state
]

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarWidth: 280,
      previewWidth: 500,
      activeTab: 'meta',
      selectedParameterId: null,
      selectedCommandId: null,
      selectedStructId: null,
      mainView: 'editor',
      rawModeByPluginId: {},
      structuralSaveConfirmedByPluginId: {},
      diffRequestPluginId: null,
      previewCollapsed: false,
      lastTemplateCategory: 'method-alias',

      setSidebarWidth: (sidebarWidth) => set({ sidebarWidth }),
      setPreviewWidth: (previewWidth) =>
        set({ previewWidth: Math.max(300, Math.min(1200, previewWidth)) }),
      setActiveTab: (activeTab) => set({ activeTab }),
      setSelectedParameterId: (selectedParameterId) => set({ selectedParameterId }),
      setSelectedCommandId: (selectedCommandId) => set({ selectedCommandId }),
      setSelectedStructId: (selectedStructId) => set({ selectedStructId }),
      setMainView: (mainView) => set({ mainView }),
      setLastTemplateCategory: (lastTemplateCategory) => set({ lastTemplateCategory }),
      setPreviewCollapsed: (previewCollapsed) => set({ previewCollapsed }),
      togglePreview: () => set((state) => ({ previewCollapsed: !state.previewCollapsed })),
      setRawModeForPlugin: (pluginId, enabled) =>
        set((state) => {
          const next: Partial<UIState> = {}
          if (state.rawModeByPluginId[pluginId] !== enabled) {
            next.rawModeByPluginId = { ...state.rawModeByPluginId, [pluginId]: enabled }
          }
          // Turning raw mode off asks again before the next save regenerates the file
          if (!enabled && pluginId in state.structuralSaveConfirmedByPluginId) {
            next.structuralSaveConfirmedByPluginId = without(
              state.structuralSaveConfirmedByPluginId,
              pluginId
            )
          }
          return next
        }),
      clearRawModeForPlugin: (pluginId) =>
        set((state) => {
          if (
            !(pluginId in state.rawModeByPluginId) &&
            !(pluginId in state.structuralSaveConfirmedByPluginId)
          ) {
            return {}
          }
          return {
            rawModeByPluginId: without(state.rawModeByPluginId, pluginId),
            structuralSaveConfirmedByPluginId: without(
              state.structuralSaveConfirmedByPluginId,
              pluginId
            )
          }
        }),
      confirmStructuralSave: (pluginId) =>
        set((state) => ({
          structuralSaveConfirmedByPluginId: {
            ...state.structuralSaveConfirmedByPluginId,
            [pluginId]: true
          }
        })),
      // The preview shows the diff, so it opens when collapsed
      requestDiff: (pluginId) => set({ diffRequestPluginId: pluginId, previewCollapsed: false }),
      clearDiffRequest: () => set({ diffRequestPluginId: null })
    }),
    definePersist<UIState, Pick<UIState, PersistedField>>({
      name: 'mz-plugin-studio-ui',
      area: 'Layout',
      migrations: UI_MIGRATIONS,
      fields: {
        sidebarWidth: checkFiniteNumber,
        previewWidth: checkFiniteNumber,
        previewCollapsed: checkBoolean,
        lastTemplateCategory: checkString,
        rawModeByPluginId: checkRecordOf(checkBoolean)
      },
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
    })
  )
)
