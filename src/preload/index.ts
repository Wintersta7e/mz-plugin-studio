import { contextBridge } from 'electron'
import { IPC_CHANNELS, type API } from '../shared/ipc-types'
import { invoke, onMainLogLine, send, sendLogLine, subscribe } from './ipc'

const api: API = {
  project: {
    validate: (path) => invoke(IPC_CHANNELS.PROJECT_VALIDATE, path),
    load: (path) => invoke(IPC_CHANNELS.PROJECT_LOAD, path)
  },
  plugin: {
    save: (projectPath, filename, content, guard) =>
      invoke(IPC_CHANNELS.PLUGIN_SAVE, projectPath, filename, content, guard),
    saveToPath: (filePath, content, guard) =>
      invoke(IPC_CHANNELS.PLUGIN_SAVE_TO_PATH, filePath, content, guard),
    load: (projectPath, filename) => invoke(IPC_CHANNELS.PLUGIN_LOAD, projectPath, filename),
    parse: (content) => invoke(IPC_CHANNELS.PLUGIN_PARSE, content),
    readRaw: (projectPath, filename) => invoke(IPC_CHANNELS.PLUGIN_READ_RAW, projectPath, filename),
    list: (projectPath) => invoke(IPC_CHANNELS.PLUGIN_LIST, projectPath),
    readByPath: (filePath) => invoke(IPC_CHANNELS.PLUGIN_READ_BY_PATH, filePath),
    scanHeaders: (projectPath) => invoke(IPC_CHANNELS.PLUGIN_SCAN_HEADERS, projectPath)
  },
  dialog: {
    openFolder: () => invoke(IPC_CHANNELS.DIALOG_OPEN_FOLDER),
    // The main handlers read fields of `options`, so it is never sent missing
    saveFile: (options = {}) => invoke(IPC_CHANNELS.DIALOG_SAVE_FILE, options),
    openFile: (options = {}) => invoke(IPC_CHANNELS.DIALOG_OPEN_FILE, options),
    message: (options) => invoke(IPC_CHANNELS.DIALOG_MESSAGE, options)
  },
  window: {
    minimize: () => send(IPC_CHANNELS.WINDOW_MINIMIZE),
    maximize: () => send(IPC_CHANNELS.WINDOW_MAXIMIZE),
    close: () => send(IPC_CHANNELS.WINDOW_CLOSE),
    isMaximized: () => invoke(IPC_CHANNELS.WINDOW_IS_MAXIMIZED),
    onMaximizeChange: (callback) => subscribe(IPC_CHANNELS.WINDOW_MAXIMIZED_CHANGED, callback)
  },
  log: {
    openFolder: () => invoke(IPC_CHANNELS.LOG_OPEN_FOLDER),
    setLevel: (debug) => send(IPC_CHANNELS.LOG_SET_LEVEL, debug)
  }
}

contextBridge.exposeInMainWorld('api', api)

// The page logger (electron-log's renderer entry) writes through this bridge. It asks main
// nothing while the page loads: a request then would come before main can tell which page sent it.
contextBridge.exposeInMainWorld('__electronLog', {
  sendToMain: (line: Record<string, unknown>) => sendLogLine(line)
})
// The page logger prints main's own lines, which main sends only in development
onMainLogLine((line) => window.postMessage({ cmd: 'message', ...line }))
