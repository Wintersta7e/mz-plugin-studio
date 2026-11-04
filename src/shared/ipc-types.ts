// The IPC contract: every channel's name, arguments and result, stated once and used by main,
// preload and renderer. `API` (what the window sees as `window.api`) is derived from it. The
// channels outside it are electron-log's, used by the page logger through the preload's log
// bridge; main registers `LOG_CHANNEL` in `src/main/ipc/registration.ts` behind the same sender
// check, with a shape check.
import type { PluginDefinition } from './types/plugin'
import type { MZProject } from './types/mz'

/**
electron-log's channel for the page's log lines to main
*/
export const LOG_CHANNEL = '__ELECTRON_LOG__'
/**
electron-log's channel for main's log lines to the page, sent only in development
*/
export const MAIN_LOG_CHANNEL = '__ELECTRON_LOG_IPC__'

export const IPC_CHANNELS = {
  // Project
  PROJECT_VALIDATE: 'project:validate',
  PROJECT_LOAD: 'project:load',

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

/**
How the message of every request main refuses begins; the rest says why in plain words
*/
export const ACCESS_DENIED = 'Access denied: '

/**
Why main refuses a project when the user chose Cancel in the confirm before it opens
*/
export const PROJECT_OPEN_CANCELLED = 'opening the project was cancelled'

/**
The error main throws to refuse a request, for `reason`
*/
export function accessDenied(reason: string): Error {
  return new Error(`${ACCESS_DENIED}${reason}`)
}

/**
Scanned plugin header from MZ annotation block — shared across main/renderer
*/
export interface ScannedPluginHeader {
  filename: string
  name: string
  base: string[]
  orderAfter: string[]
  orderBefore: string[]
  overrides: string[]
}

/**
The file a tab was read from or last saved to; `sha256` null = unknown (migrated)
*/
export interface FileBase {
  path: string
  sha256: string | null
}

export type SaveConflict = 'exists-unrelated' | 'changed-on-disk' | 'would-break'

/**
What a save checks before replacing an existing file; a guarded save also checks the syntax.
`overwriteBroken` skips only `would-break`
*/
export interface SaveGuard {
  base: FileBase | null
  overwriteBroken?: boolean
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
  /**
  The button Enter chooses
  */
  defaultId?: number
  /**
  The button Escape or closing the dialog chooses
  */
  cancelId?: number
}

export interface ProjectValidation {
  valid: boolean
  error?: string
}

export interface FileFilter {
  name: string
  extensions: string[]
}

export interface SaveFileOptions {
  defaultPath?: string
  filters?: FileFilter[]
}

/**
Main picks the folder an open dialog starts in
*/
export interface OpenFileOptions {
  filters?: FileFilter[]
}

export interface OpenFolderOptions {
  /**
  A project folder: the dialog opens in the folder that holds it
  */
  defaultPath?: string
}

/**
Request/reply channels: the window calls, main answers; each entry is main's handler signature
*/
interface InvokeContract {
  [IPC_CHANNELS.PROJECT_VALIDATE]: (path: string) => ProjectValidation
  [IPC_CHANNELS.PROJECT_LOAD]: (path: string) => MZProject
  [IPC_CHANNELS.PLUGIN_SAVE]: (
    projectPath: string,
    filename: string,
    content: string,
    guard: SaveGuard
  ) => SaveResult
  [IPC_CHANNELS.PLUGIN_SAVE_TO_PATH]: (
    filePath: string,
    content: string,
    guard?: SaveGuard
  ) => SaveResult
  [IPC_CHANNELS.PLUGIN_LOAD]: (projectPath: string, filename: string) => LoadedPlugin
  [IPC_CHANNELS.PLUGIN_PARSE]: (content: string) => PluginDefinition
  [IPC_CHANNELS.PLUGIN_READ_RAW]: (projectPath: string, filename: string) => RawPluginFile
  [IPC_CHANNELS.PLUGIN_LIST]: (projectPath: string) => string[]
  [IPC_CHANNELS.PLUGIN_READ_BY_PATH]: (filePath: string) => string
  [IPC_CHANNELS.PLUGIN_SCAN_HEADERS]: (projectPath: string) => ScannedPluginHeader[]
  [IPC_CHANNELS.DIALOG_OPEN_FOLDER]: (options?: OpenFolderOptions) => string | null
  [IPC_CHANNELS.DIALOG_SAVE_FILE]: (options?: SaveFileOptions) => string | null
  [IPC_CHANNELS.DIALOG_OPEN_FILE]: (options?: OpenFileOptions) => string | null
  [IPC_CHANNELS.DIALOG_MESSAGE]: (options: MessageDialogOptions) => number
  [IPC_CHANNELS.WINDOW_IS_MAXIMIZED]: () => boolean
  [IPC_CHANNELS.LOG_OPEN_FOLDER]: () => void
}

/**
One-way channels from the window to main
*/
interface SendContract {
  [IPC_CHANNELS.WINDOW_MINIMIZE]: []
  [IPC_CHANNELS.WINDOW_MAXIMIZE]: []
  [IPC_CHANNELS.WINDOW_CLOSE]: []
  [IPC_CHANNELS.LOG_SET_LEVEL]: [debug: boolean]
}

/**
One-way channels from main to the window
*/
interface EventContract {
  [IPC_CHANNELS.WINDOW_MAXIMIZED_CHANGED]: [isMaximized: boolean]
}

export type InvokeChannel = keyof InvokeContract
export type SendChannel = keyof SendContract
export type EventChannel = keyof EventContract
export type InvokeArgs<C extends InvokeChannel> = Parameters<InvokeContract[C]>
export type InvokeResult<C extends InvokeChannel> = ReturnType<InvokeContract[C]>
export type SendArgs<C extends SendChannel> = SendContract[C]
export type EventArgs<C extends EventChannel> = EventContract[C]

export const INVOKE_CHANNELS = [
  IPC_CHANNELS.PROJECT_VALIDATE,
  IPC_CHANNELS.PROJECT_LOAD,
  IPC_CHANNELS.PLUGIN_SAVE,
  IPC_CHANNELS.PLUGIN_SAVE_TO_PATH,
  IPC_CHANNELS.PLUGIN_LOAD,
  IPC_CHANNELS.PLUGIN_PARSE,
  IPC_CHANNELS.PLUGIN_READ_RAW,
  IPC_CHANNELS.PLUGIN_LIST,
  IPC_CHANNELS.PLUGIN_READ_BY_PATH,
  IPC_CHANNELS.PLUGIN_SCAN_HEADERS,
  IPC_CHANNELS.DIALOG_OPEN_FOLDER,
  IPC_CHANNELS.DIALOG_SAVE_FILE,
  IPC_CHANNELS.DIALOG_OPEN_FILE,
  IPC_CHANNELS.DIALOG_MESSAGE,
  IPC_CHANNELS.WINDOW_IS_MAXIMIZED,
  IPC_CHANNELS.LOG_OPEN_FOLDER
] as const satisfies readonly InvokeChannel[]

export const SEND_CHANNELS = [
  IPC_CHANNELS.WINDOW_MINIMIZE,
  IPC_CHANNELS.WINDOW_MAXIMIZE,
  IPC_CHANNELS.WINDOW_CLOSE,
  IPC_CHANNELS.LOG_SET_LEVEL
] as const satisfies readonly SendChannel[]

export const EVENT_CHANNELS = [
  IPC_CHANNELS.WINDOW_MAXIMIZED_CHANGED
] as const satisfies readonly EventChannel[]

type Invoker<C extends InvokeChannel> = (...args: InvokeArgs<C>) => Promise<InvokeResult<C>>
type Sender<C extends SendChannel> = (...args: SendArgs<C>) => void
type Subscriber<C extends EventChannel> = (callback: (...args: EventArgs<C>) => void) => () => void

interface ProjectAPI {
  validate: Invoker<typeof IPC_CHANNELS.PROJECT_VALIDATE>
  load: Invoker<typeof IPC_CHANNELS.PROJECT_LOAD>
}

interface PluginAPI {
  save: Invoker<typeof IPC_CHANNELS.PLUGIN_SAVE>
  saveToPath: Invoker<typeof IPC_CHANNELS.PLUGIN_SAVE_TO_PATH>
  load: Invoker<typeof IPC_CHANNELS.PLUGIN_LOAD>
  parse: Invoker<typeof IPC_CHANNELS.PLUGIN_PARSE>
  readRaw: Invoker<typeof IPC_CHANNELS.PLUGIN_READ_RAW>
  list: Invoker<typeof IPC_CHANNELS.PLUGIN_LIST>
  readByPath: Invoker<typeof IPC_CHANNELS.PLUGIN_READ_BY_PATH>
  scanHeaders: Invoker<typeof IPC_CHANNELS.PLUGIN_SCAN_HEADERS>
}

interface DialogAPI {
  openFolder: Invoker<typeof IPC_CHANNELS.DIALOG_OPEN_FOLDER>
  saveFile: Invoker<typeof IPC_CHANNELS.DIALOG_SAVE_FILE>
  openFile: Invoker<typeof IPC_CHANNELS.DIALOG_OPEN_FILE>
  message: Invoker<typeof IPC_CHANNELS.DIALOG_MESSAGE>
}

interface WindowAPI {
  minimize: Sender<typeof IPC_CHANNELS.WINDOW_MINIMIZE>
  maximize: Sender<typeof IPC_CHANNELS.WINDOW_MAXIMIZE>
  close: Sender<typeof IPC_CHANNELS.WINDOW_CLOSE>
  isMaximized: Invoker<typeof IPC_CHANNELS.WINDOW_IS_MAXIMIZED>
  onMaximizeChange: Subscriber<typeof IPC_CHANNELS.WINDOW_MAXIMIZED_CHANGED>
}

interface LogAPI {
  openFolder: Invoker<typeof IPC_CHANNELS.LOG_OPEN_FOLDER>
  setLevel: Sender<typeof IPC_CHANNELS.LOG_SET_LEVEL>
}

/**
What the preload exposes as `window.api`
*/
export interface API {
  project: ProjectAPI
  plugin: PluginAPI
  dialog: DialogAPI
  window: WindowAPI
  log: LogAPI
}
