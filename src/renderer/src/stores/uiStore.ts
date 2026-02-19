import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface UIState {
  sidebarWidth: number
  previewWidth: number
  activeTab: 'meta' | 'parameters' | 'commands' | 'structs' | 'code' | 'preview'
  selectedParameterId: string | null
  selectedCommandId: string | null
  selectedStructId: string | null
  mainView: 'editor' | 'analysis'

  setSidebarWidth: (width: number) => void
  setPreviewWidth: (width: number) => void
  setActiveTab: (tab: UIState['activeTab']) => void
  setSelectedParameterId: (id: string | null) => void
  setSelectedCommandId: (id: string | null) => void
  setSelectedStructId: (id: string | null) => void
  setMainView: (view: UIState['mainView']) => void
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
      mainView: 'editor',

      setSidebarWidth: (sidebarWidth) => set({ sidebarWidth }),
      setPreviewWidth: (previewWidth) =>
        set({ previewWidth: Math.max(300, Math.min(1200, previewWidth)) }),
      setActiveTab: (activeTab) => set({ activeTab }),
      setSelectedParameterId: (selectedParameterId) => set({ selectedParameterId }),
      setSelectedCommandId: (selectedCommandId) => set({ selectedCommandId }),
      setSelectedStructId: (selectedStructId) => set({ selectedStructId }),
      setMainView: (mainView) => set({ mainView })
    }),
    {
      name: 'mz-plugin-studio-ui',
      partialize: (state) => ({
        sidebarWidth: state.sidebarWidth,
        previewWidth: state.previewWidth
      })
    }
  )
)
