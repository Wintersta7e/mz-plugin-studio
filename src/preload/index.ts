import { contextBridge, ipcRenderer } from 'electron'
import { IPC_CHANNELS } from '../shared/ipc-types'

export interface ProjectAPI {
  validate: (path: string) => Promise<{ valid: boolean; error?: string }>
  load: (path: string) => Promise<import('../renderer/src/types/mz').MZProject>
  getSwitches: (path: string) => Promise<import('../renderer/src/types/mz').MZSwitch[]>
  getVariables: (path: string) => Promise<import('../renderer/src/types/mz').MZVariable[]>
  getActors: (path: string) => Promise<import('../renderer/src/types/mz').MZActor[]>
  getItems: (path: string) => Promise<import('../renderer/src/types/mz').MZItem[]>
  getMaps: (path: string) => Promise<import('../renderer/src/types/mz').MZMapInfo[]>
  getPlugins: (path: string) => Promise<import('../renderer/src/types/mz').MZPluginEntry[]>
  getSkills: (path: string) => Promise<{ id: number; name: string }[]>
  getWeapons: (path: string) => Promise<{ id: number; name: string }[]>
  getArmors: (path: string) => Promise<{ id: number; name: string }[]>
  getEnemies: (path: string) => Promise<{ id: number; name: string }[]>
  getStates: (path: string) => Promise<{ id: number; name: string }[]>
  getAnimations: (path: string) => Promise<{ id: number; name: string }[]>
  getTilesets: (path: string) => Promise<{ id: number; name: string }[]>
  getCommonEvents: (path: string) => Promise<{ id: number; name: string }[]>
  getClasses: (path: string) => Promise<{ id: number; name: string }[]>
  getTroops: (path: string) => Promise<{ id: number; name: string }[]>
}

export interface PluginAPI {
  save: (
    projectPath: string,
    filename: string,
    content: string
  ) => Promise<{ success: boolean; path: string }>
  saveToPath: (filePath: string, content: string) => Promise<{ success: boolean; path: string }>
  load: (
    projectPath: string,
    filename: string
  ) => Promise<import('../renderer/src/types/plugin').PluginDefinition>
  parse: (content: string) => Promise<import('../renderer/src/types/plugin').PluginDefinition>
  readRaw: (projectPath: string, filename: string) => Promise<string>
  list: (projectPath: string) => Promise<string[]>
  readByPath: (filePath: string) => Promise<string>
  scanHeaders: (projectPath: string) => Promise<
    {
      filename: string
      name: string
      base: string[]
      orderAfter: string[]
      orderBefore: string[]
      overrides: string[]
    }[]
  >
}

export interface DialogAPI {
  openFolder: () => Promise<string | null>
  saveFile: (options?: {
    defaultPath?: string
    filters?: { name: string; extensions: string[] }[]
  }) => Promise<string | null>
  openFile: (options?: {
    filters?: { name: string; extensions: string[] }[]
  }) => Promise<string | null>
  message: (options: {
    type?: 'none' | 'info' | 'error' | 'question' | 'warning'
    title?: string
    message: string
    buttons?: string[]
  }) => Promise<number>
}

export interface WindowAPI {
  minimize: () => void
  maximize: () => void
  close: () => void
  forceClose: () => void
  isMaximized: () => Promise<boolean>
  onMaximizeChange: (callback: (isMaximized: boolean) => void) => () => void
}

export interface UpdateAPI {
  onUpdateAvailable: (
    callback: (info: { version: string; releaseNotes?: string }) => void
  ) => () => void
  onUpdateDownloaded: (callback: () => void) => () => void
  downloadUpdate: () => Promise<void>
  installUpdate: () => Promise<void>
}

const projectApi: ProjectAPI = {
  validate: (path) => ipcRenderer.invoke(IPC_CHANNELS.PROJECT_VALIDATE, path),
  load: (path) => ipcRenderer.invoke(IPC_CHANNELS.PROJECT_LOAD, path),
  getSwitches: (path) => ipcRenderer.invoke(IPC_CHANNELS.PROJECT_GET_SWITCHES, path),
  getVariables: (path) => ipcRenderer.invoke(IPC_CHANNELS.PROJECT_GET_VARIABLES, path),
  getActors: (path) => ipcRenderer.invoke(IPC_CHANNELS.PROJECT_GET_ACTORS, path),
  getItems: (path) => ipcRenderer.invoke(IPC_CHANNELS.PROJECT_GET_ITEMS, path),
  getMaps: (path) => ipcRenderer.invoke(IPC_CHANNELS.PROJECT_GET_MAPS, path),
  getPlugins: (path) => ipcRenderer.invoke(IPC_CHANNELS.PROJECT_GET_PLUGINS, path),
  getSkills: (path) => ipcRenderer.invoke(IPC_CHANNELS.PROJECT_GET_SKILLS, path),
  getWeapons: (path) => ipcRenderer.invoke(IPC_CHANNELS.PROJECT_GET_WEAPONS, path),
  getArmors: (path) => ipcRenderer.invoke(IPC_CHANNELS.PROJECT_GET_ARMORS, path),
  getEnemies: (path) => ipcRenderer.invoke(IPC_CHANNELS.PROJECT_GET_ENEMIES, path),
  getStates: (path) => ipcRenderer.invoke(IPC_CHANNELS.PROJECT_GET_STATES, path),
  getAnimations: (path) => ipcRenderer.invoke(IPC_CHANNELS.PROJECT_GET_ANIMATIONS, path),
  getTilesets: (path) => ipcRenderer.invoke(IPC_CHANNELS.PROJECT_GET_TILESETS, path),
  getCommonEvents: (path) => ipcRenderer.invoke(IPC_CHANNELS.PROJECT_GET_COMMON_EVENTS, path),
  getClasses: (path) => ipcRenderer.invoke(IPC_CHANNELS.PROJECT_GET_CLASSES, path),
  getTroops: (path) => ipcRenderer.invoke(IPC_CHANNELS.PROJECT_GET_TROOPS, path)
}

const pluginApi: PluginAPI = {
  save: (projectPath, filename, content) =>
    ipcRenderer.invoke(IPC_CHANNELS.PLUGIN_SAVE, projectPath, filename, content),
  saveToPath: (filePath, content) =>
    ipcRenderer.invoke(IPC_CHANNELS.PLUGIN_SAVE_TO_PATH, filePath, content),
  load: (projectPath, filename) =>
    ipcRenderer.invoke(IPC_CHANNELS.PLUGIN_LOAD, projectPath, filename),
  parse: (content) => ipcRenderer.invoke(IPC_CHANNELS.PLUGIN_PARSE, content),
  readRaw: (projectPath, filename) =>
    ipcRenderer.invoke(IPC_CHANNELS.PLUGIN_READ_RAW, projectPath, filename),
  list: (projectPath) => ipcRenderer.invoke(IPC_CHANNELS.PLUGIN_LIST, projectPath),
  readByPath: (filePath) => ipcRenderer.invoke(IPC_CHANNELS.PLUGIN_READ_BY_PATH, filePath),
  scanHeaders: (projectPath) => ipcRenderer.invoke(IPC_CHANNELS.PLUGIN_SCAN_HEADERS, projectPath)
}

const dialogApi: DialogAPI = {
  openFolder: () => ipcRenderer.invoke(IPC_CHANNELS.DIALOG_OPEN_FOLDER),
  saveFile: (options = {}) => ipcRenderer.invoke(IPC_CHANNELS.DIALOG_SAVE_FILE, options),
  openFile: (options = {}) => ipcRenderer.invoke(IPC_CHANNELS.DIALOG_OPEN_FILE, options),
  message: (options) => ipcRenderer.invoke(IPC_CHANNELS.DIALOG_MESSAGE, options)
}

const windowApi: WindowAPI = {
  minimize: () => ipcRenderer.send(IPC_CHANNELS.WINDOW_MINIMIZE),
  maximize: () => ipcRenderer.send(IPC_CHANNELS.WINDOW_MAXIMIZE),
  close: () => ipcRenderer.send(IPC_CHANNELS.WINDOW_CLOSE),
  forceClose: () => ipcRenderer.send(IPC_CHANNELS.WINDOW_FORCE_CLOSE),
  isMaximized: () => ipcRenderer.invoke(IPC_CHANNELS.WINDOW_IS_MAXIMIZED),
  onMaximizeChange: (callback) => {
    const handler = (_event: unknown, isMaximized: boolean) => callback(isMaximized)
    ipcRenderer.on(IPC_CHANNELS.WINDOW_MAXIMIZED_CHANGED, handler)
    return () => ipcRenderer.removeListener(IPC_CHANNELS.WINDOW_MAXIMIZED_CHANGED, handler)
  }
}

const updateApi: UpdateAPI = {
  onUpdateAvailable: (callback) => {
    const channel = IPC_CHANNELS.UPDATE_AVAILABLE
    ipcRenderer.removeAllListeners(channel)
    const handler = (_event: unknown, info: { version: string; releaseNotes?: string }) =>
      callback(info)
    ipcRenderer.on(channel, handler)
    return () => ipcRenderer.removeListener(channel, handler)
  },
  onUpdateDownloaded: (callback) => {
    const channel = IPC_CHANNELS.UPDATE_DOWNLOADED
    ipcRenderer.removeAllListeners(channel)
    const handler = () => callback()
    ipcRenderer.on(channel, handler)
    return () => ipcRenderer.removeListener(channel, handler)
  },
  downloadUpdate: () => ipcRenderer.invoke(IPC_CHANNELS.UPDATE_DOWNLOAD),
  installUpdate: () => ipcRenderer.invoke(IPC_CHANNELS.UPDATE_INSTALL)
}

contextBridge.exposeInMainWorld('api', {
  project: projectApi,
  plugin: pluginApi,
  dialog: dialogApi,
  window: windowApi,
  update: updateApi
})

// Export types for renderer
export type API = {
  project: ProjectAPI
  plugin: PluginAPI
  dialog: DialogAPI
  window: WindowAPI
  update: UpdateAPI
}
