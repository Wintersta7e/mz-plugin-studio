// Shared IPC channel definitions
// Used by main, preload, and renderer processes

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
  WINDOW_FORCE_CLOSE: 'window-force-close',
  WINDOW_IS_MAXIMIZED: 'window-is-maximized',
  WINDOW_MAXIMIZED_CHANGED: 'window-maximized-changed',

  // Auto-updater
  UPDATE_AVAILABLE: 'update:available',
  UPDATE_DOWNLOADED: 'update:downloaded',
  UPDATE_DOWNLOAD: 'update:download',
  UPDATE_INSTALL: 'update:install',
} as const

export type IpcChannel = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS]

/** Scanned plugin header from MZ annotation block — shared across main/renderer */
export interface ScannedPluginHeader {
  filename: string
  name: string
  base: string[]
  orderAfter: string[]
}
