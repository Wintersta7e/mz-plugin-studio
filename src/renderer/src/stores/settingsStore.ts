import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { checkSavedParameter, PARAMETER_LABELS } from '../lib/param-io'
import type { PluginParameter } from '../types/plugin'
import {
  checkArrayOf,
  checkBoolean,
  checkFiniteNumber,
  checkOneOf,
  checkRecordOf,
  checkString,
  definePersist,
  type MigrationStep
} from './persist'

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
  setDebugLogging: (isEnabled: boolean) => void
  // Setters
  setTheme: (theme: 'dark' | 'light') => void
  setEditorFontSize: (size: number) => void
  setEditorWordWrap: (isWrapped: boolean) => void
  setEditorMinimap: (isShown: boolean) => void
  setEditorLineNumbers: (areShown: boolean) => void
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

// Schema 1 began checking each preset parameter; that check is the field check, run on every load.
const SETTINGS_MIGRATIONS: readonly MigrationStep[] = [(state) => state]

const clampFontSize = (size: number): number =>
  Math.max(10, Math.min(24, Number.isFinite(size) ? size : 10))

// The preload's log bridge; absent where the renderer runs without the app's preload (tests)
interface LogLevelBridge {
  log?: { setLevel?: (isDebug: boolean) => void }
}

function logBridge(): LogLevelBridge | undefined {
  return globalThis.api
}

function setMainLogLevel(isDebug: boolean): void {
  if (logBridge()?.log?.setLevel !== undefined) globalThis.api.log.setLevel(isDebug)
}

const SETTINGS_PERSIST = definePersist<SettingsState, SettingsPersisted>({
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
    parameterPresets: checkRecordOf(checkArrayOf(checkSavedParameter)),
    debugLogging: checkBoolean
  },
  labels: {
    theme: 'theme',
    editorFontSize: 'editor font size',
    editorWordWrap: 'word wrap',
    editorMinimap: 'minimap',
    editorLineNumbers: 'line numbers',
    defaultAuthor: 'default author',
    parameterPresets: { all: 'parameter presets', one: 'parameter preset' },
    debugLogging: 'debug logging',
    ...PARAMETER_LABELS
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
      setEditorFontSize: (size) => set({ editorFontSize: clampFontSize(size) }),
      setEditorWordWrap: (isWrapped) => set({ editorWordWrap: isWrapped }),
      setEditorMinimap: (isShown) => set({ editorMinimap: isShown }),
      setEditorLineNumbers: (areShown) => set({ editorLineNumbers: areShown }),
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
        set((state) => ({
          parameterPresets: Object.fromEntries(
            Object.entries(state.parameterPresets).filter(([preset]) => preset !== name)
          )
        })),

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

      setDebugLogging: (isEnabled) => {
        set({ debugLogging: isEnabled })
        setMainLogLevel(isEnabled)
      }
    }),
    SETTINGS_PERSIST
  )
)

// Sync persisted debug logging state to main process on startup
if (useSettingsStore.getState().debugLogging) setMainLogLevel(true)
