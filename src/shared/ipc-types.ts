// Shared IPC channel definitions
// Used by main, preload, and renderer processes
import type { PluginDefinition } from './types/plugin'

export const IPC_CHANNELS = {
  // Project
  PROJECT_VALIDATE: 'project:validate',
  PROJECT_LOAD: 'project:load',
  PROJECT_GET_SWITCHES: 'project:get-switches',
  PROJECT_GET_VARIABLES: 'project:get-variables',
  PROJECT_GET_ACTORS: 'project:get-actors',
  PROJECT_GET_ITEMS: 'project:get-items',
  PROJECT_GET_MAPS: 'project:get-maps',
  PROJECT_GET_PLUGINS: 'project:get-plugins',
  PROJECT_GET_SKILLS: 'project:get-skills',
  PROJECT_GET_WEAPONS: 'project:get-weapons',
  PROJECT_GET_ARMORS: 'project:get-armors',
  PROJECT_GET_ENEMIES: 'project:get-enemies',
  PROJECT_GET_STATES: 'project:get-states',
  PROJECT_GET_ANIMATIONS: 'project:get-animations',
  PROJECT_GET_TILESETS: 'project:get-tilesets',
  PROJECT_GET_COMMON_EVENTS: 'project:get-common-events',
  PROJECT_GET_CLASSES: 'project:get-classes',
  PROJECT_GET_TROOPS: 'project:get-troops',

  // Plugin
  PLUGIN_SAVE: 'plugin:save',
  PLUGIN_SAVE_TO_PATH: 'plugin:save-to-path',
  PLUGIN_LOAD: 'plugin:load',
  PLUGIN_PARSE: 'plugin:parse',
  PLUGIN_READ_RAW: 'plugin:read-raw',
  PLUGIN_LIST: 'plugin:list',
  PLUGIN_READ_BY_PATH: 'plugin:read-by-path',
  PLUGIN_SCAN_HEADERS: 'plugin:scan-headers',

  // Dialog
  DIALOG_OPEN_FOLDER: 'dialog:open-folder',
  DIALOG_SAVE_FILE: 'dialog:save-file',
  DIALOG_OPEN_FILE: 'dialog:open-file',
  DIALOG_MESSAGE: 'dialog:message',

  // Window
  WINDOW_MINIMIZE: 'window-minimize',
  WINDOW_MAXIMIZE: 'window-maximize',
  WINDOW_CLOSE: 'window-close',
  WINDOW_IS_MAXIMIZED: 'window-is-maximized',
  WINDOW_MAXIMIZED_CHANGED: 'window-maximized-changed',

  // Logging
  LOG_OPEN_FOLDER: 'log:open-folder',
  LOG_SET_LEVEL: 'log:set-level'
} as const

export type IpcChannel = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS]

/** Scanned plugin header from MZ annotation block — shared across main/renderer */
export interface ScannedPluginHeader {
  filename: string
  name: string
  base: string[]
  orderAfter: string[]
  orderBefore: string[]
  overrides: string[]
}

/** The file a tab was read from or last saved to; `sha256` null = unknown (migrated) */
export interface FileBase {
  path: string
  sha256: string | null
}

export type SaveConflict = 'exists-unrelated' | 'changed-on-disk' | 'would-break'

/** What a save checks before replacing an existing file; `force` can only skip `would-break` */
export interface SaveGuard {
  base: FileBase | null
  force?: Array<'would-break'>
  checkSyntax: boolean
}

export interface SyntaxProblem {
  message: string
  line: number | null
}

export type SaveResult =
  | { success: true; path: string; sha256: string; syntaxWarning?: SyntaxProblem }
  | {
      success: false
      path: string
      conflict: SaveConflict
      diskSha256: string
      syntaxError?: SyntaxProblem
    }

export interface LoadedPlugin {
  plugin: PluginDefinition
  path: string
  sha256: string
}

export interface RawPluginFile {
  content: string
  path: string
  sha256: string
}

export interface MessageDialogOptions {
  type?: 'none' | 'info' | 'error' | 'question' | 'warning'
  title?: string
  message: string
  buttons?: string[]
  /** The button Enter chooses */
  defaultId?: number
  /** The button Escape or closing the dialog chooses */
  cancelId?: number
}
