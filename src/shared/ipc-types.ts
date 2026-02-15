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

  // Plugin
  PLUGIN_SAVE: 'plugin:save',
  PLUGIN_SAVE_TO_PATH: 'plugin:save-to-path',
  PLUGIN_LOAD: 'plugin:load',
  PLUGIN_PARSE: 'plugin:parse',
  PLUGIN_READ_RAW: 'plugin:read-raw',
  PLUGIN_LIST: 'plugin:list',

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
} as const

export type IpcChannel = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS]
