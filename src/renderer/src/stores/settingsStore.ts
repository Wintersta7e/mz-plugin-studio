import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { setSettingsGetter } from '../types/plugin'

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
