import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  checkBoolean,
  checkFiniteNumber,
  checkRecordOf,
  checkString,
  definePersist,
  isRecord,
  type MigrationStep
} from './persist'

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
  setPreviewCollapsed: (isCollapsed: boolean) => void
  togglePreview: () => void
  setRawModeForPlugin: (pluginId: string, isEnabled: boolean) => void
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

/**
The record without `key`; the same record when it has no such key.
*/
function without<T>(record: Record<string, T>, key: string): Record<string, T> {
  return Object.hasOwn(record, key)
    ? Object.fromEntries(Object.entries(record).filter(([entry]) => entry !== key))
    : record
}

const UI_MIGRATIONS: readonly MigrationStep[] = [
  (state) => state,
  // Raw mode is on for imported plugins unless the user turns it off; v1.6.0 stored false
  // for plugins it had restored without their file text, so those entries are dropped.
  (state) =>
    isRecord(state['rawModeByPluginId'])
      ? {
          ...state,
          rawModeByPluginId: Object.fromEntries(
            Object.entries(state['rawModeByPluginId']).filter(([, on]) => on !== false)
          )
        }
      : state
]

const UI_PERSIST = definePersist<UIState, Pick<UIState, PersistedField>>({
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
  labels: {
    sidebarWidth: 'sidebar width',
    previewWidth: 'preview width',
    previewCollapsed: 'collapsed preview',
    lastTemplateCategory: 'last template category',
    rawModeByPluginId: { all: 'raw mode switches', one: 'raw mode switch of tab' }
  },
  partialize: (state) => ({
    sidebarWidth: state.sidebarWidth,
    previewWidth: state.previewWidth,
    previewCollapsed: state.previewCollapsed,
    lastTemplateCategory: state.lastTemplateCategory,
    rawModeByPluginId: state.rawModeByPluginId
  })
})

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
      setRawModeForPlugin: (pluginId, isEnabled) =>
        set((state) => {
          const next: Partial<UIState> = {}
          if (state.rawModeByPluginId[pluginId] !== isEnabled) {
            next.rawModeByPluginId = { ...state.rawModeByPluginId, [pluginId]: isEnabled }
          }
          // Turning raw mode off asks again before the next save regenerates the file
          if (!isEnabled && Object.hasOwn(state.structuralSaveConfirmedByPluginId, pluginId)) {
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
            !Object.hasOwn(state.rawModeByPluginId, pluginId) &&
            !Object.hasOwn(state.structuralSaveConfirmedByPluginId, pluginId)
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
    UI_PERSIST
  )
)
