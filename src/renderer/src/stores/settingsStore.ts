import log from 'electron-log/renderer'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { checkParameterShape } from '../lib/param-io'
import { setSettingsGetter } from '../types/plugin'
import type { PluginParameter } from '../types/plugin'
import {
  checkBoolean,
  checkFiniteNumber,
  checkOneOf,
  checkRecordOf,
  checkString,
  definePersist,
  isRecord
} from './persist'
import type { FieldCheck, MigrationStep } from './persist'

interface SettingsState {
  // Appearance
  theme: 'dark' | 'light'
  // Editor
  editorFontSize: number
  editorWordWrap: boolean
  editorMinimap: boolean
  editorLineNumbers: boolean
  // Defaults
  defaultAuthor: string
  // Parameter presets
  parameterPresets: Record<string, PluginParameter[]>
  // Logging
  debugLogging: boolean
  setDebugLogging: (debug: boolean) => void
  // Setters
  setTheme: (theme: 'dark' | 'light') => void
  setEditorFontSize: (size: number) => void
  setEditorWordWrap: (wrap: boolean) => void
  setEditorMinimap: (minimap: boolean) => void
  setEditorLineNumbers: (lineNumbers: boolean) => void
  setDefaultAuthor: (author: string) => void
  savePreset: (name: string, params: PluginParameter[]) => void
  deletePreset: (name: string) => void
  clearAllPresets: () => void
  resetEditorSettings: () => void
}

type SettingsPersisted = Pick<
  SettingsState,
  | 'theme'
  | 'editorFontSize'
  | 'editorWordWrap'
  | 'editorMinimap'
  | 'editorLineNumbers'
  | 'defaultAuthor'
  | 'parameterPresets'
  | 'debugLogging'
>

/** Each saved preset parameter through the same shape check as a parameter file. */
function checkPresetParameters(state: Record<string, unknown>): Record<string, unknown> {
  if (!isRecord(state.parameterPresets)) return state
  const presets: Record<string, unknown> = {}
  for (const [name, params] of Object.entries(state.parameterPresets)) {
    if (!Array.isArray(params)) {
      presets[name] = params
      continue
    }
    presets[name] = params.flatMap((value: unknown, i) => {
      const shape = checkParameterShape(value)
      if (!shape.ok) {
        log.warn(`Preset "${name}": parameter ${i} skipped (${shape.reason})`)
        return []
      }
      if (shape.dropped.length > 0) {
        log.warn(`Preset "${name}": parameter ${i} lost ${shape.dropped.join(', ')}`)
      }
      const id = isRecord(value) && typeof value.id === 'string' ? value.id : crypto.randomUUID()
      return [{ id, ...shape.parameter }]
    })
  }
  return { ...state, parameterPresets: presets }
}

export const SETTINGS_MIGRATIONS: readonly MigrationStep[] = [checkPresetParameters]

const checkPresetList: FieldCheck<PluginParameter[]> = (value) =>
  Array.isArray(value) ? (value as PluginParameter[]) : undefined

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'dark' as const,
      editorFontSize: 13,
      editorWordWrap: true,
      editorMinimap: false,
      editorLineNumbers: true,
      defaultAuthor: '',
      parameterPresets: {},
      debugLogging: false,

      setTheme: (theme) => set({ theme }),
      setEditorFontSize: (size) =>
        set({ editorFontSize: Math.max(10, Math.min(24, Number.isFinite(size) ? size : 10)) }),
      setEditorWordWrap: (wrap) => set({ editorWordWrap: wrap }),
      setEditorMinimap: (minimap) => set({ editorMinimap: minimap }),
      setEditorLineNumbers: (lineNumbers) => set({ editorLineNumbers: lineNumbers }),
      setDefaultAuthor: (author) => set({ defaultAuthor: author }),

      savePreset: (name, params) => {
        const trimmed = name.trim()
        if (!trimmed || params.length === 0) return
        set((state) => ({
          parameterPresets: {
            ...state.parameterPresets,
            [trimmed]: structuredClone(params)
          }
        }))
      },

      deletePreset: (name) =>
        set((state) => {
          const updated = { ...state.parameterPresets }
          delete updated[name]
          return { parameterPresets: updated }
        }),

      clearAllPresets: () => set({ parameterPresets: {} }),

      resetEditorSettings: () =>
        set({
          theme: 'dark',
          editorFontSize: 13,
          editorWordWrap: true,
          editorMinimap: false,
          editorLineNumbers: true,
          debugLogging: false
        }),

      setDebugLogging: (debug) => {
        set({ debugLogging: debug })
        if (typeof window !== 'undefined' && window.api?.log?.setLevel) {
          window.api.log.setLevel(debug)
        }
      }
    }),
    definePersist<SettingsState, SettingsPersisted>({
      name: 'mz-plugin-studio-settings',
      area: 'Settings',
      migrations: SETTINGS_MIGRATIONS,
      fields: {
        theme: checkOneOf(['dark', 'light'] as const),
        editorFontSize: checkFiniteNumber,
        editorWordWrap: checkBoolean,
        editorMinimap: checkBoolean,
        editorLineNumbers: checkBoolean,
        defaultAuthor: checkString,
        parameterPresets: checkRecordOf(checkPresetList),
        debugLogging: checkBoolean
      },
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
    })
  )
)

// Sync persisted debug logging state to main process on startup
// Guarded to avoid crashes in test environments where window.api is unavailable
if (typeof window !== 'undefined' && window.api?.log?.setLevel) {
  const initialDebug = useSettingsStore.getState().debugLogging
  if (initialDebug) {
    window.api.log.setLevel(true)
  }
}

// Wire up settings getter so createEmptyPlugin() can use defaults
setSettingsGetter(() => {
  const state = useSettingsStore.getState()
  return { defaultAuthor: state.defaultAuthor }
})
