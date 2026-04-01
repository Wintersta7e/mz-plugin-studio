import { create } from 'zustand'
import { persist } from 'zustand/middleware'
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
  getRawModeForPlugin: (pluginId: string, fallback?: boolean) => boolean
  setRawModeForPlugin: (pluginId: string, enabled: boolean) => void
  clearRawModeForPlugin: (pluginId: string) => void
}

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      sidebarWidth: 280,
      previewWidth: 500,
      activeTab: 'meta',
      selectedParameterId: null,
      selectedCommandId: null,
      selectedStructId: null,
      mainView: 'editor',
      rawModeByPluginId: {},
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
      getRawModeForPlugin: (pluginId, fallback = false) =>
        get().rawModeByPluginId[pluginId] ?? fallback,
      setRawModeForPlugin: (pluginId, enabled) =>
        set((state) => {
          if (state.rawModeByPluginId[pluginId] === enabled) {
            return {}
          }
          return {
            rawModeByPluginId: {
              ...state.rawModeByPluginId,
              [pluginId]: enabled
            }
          }
        }),
      clearRawModeForPlugin: (pluginId) =>
        set((state) => {
          if (!(pluginId in state.rawModeByPluginId)) {
            return {}
          }
          const next = { ...state.rawModeByPluginId }
          delete next[pluginId]
          return { rawModeByPluginId: next }
        })
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
