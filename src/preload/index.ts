import { contextBridge, ipcRenderer } from 'electron'

export interface ProjectAPI {
  validate: (path: string) => Promise<{ valid: boolean; error?: string }>
  load: (path: string) => Promise<import('../renderer/src/types/mz').MZProject>
  getSwitches: (
    path: string
  ) => Promise<import('../renderer/src/types/mz').MZSwitch[]>
  getVariables: (
    path: string
  ) => Promise<import('../renderer/src/types/mz').MZVariable[]>
  getActors: (path: string) => Promise<import('../renderer/src/types/mz').MZActor[]>
  getItems: (path: string) => Promise<import('../renderer/src/types/mz').MZItem[]>
  getMaps: (path: string) => Promise<import('../renderer/src/types/mz').MZMapInfo[]>
  getPlugins: (
    path: string
  ) => Promise<import('../renderer/src/types/mz').MZPluginEntry[]>
}

export interface PluginAPI {
  save: (
    projectPath: string,
    filename: string,
    content: string
  ) => Promise<{ success: boolean; path: string }>
  saveToPath: (
    filePath: string,
    content: string
  ) => Promise<{ success: boolean; path: string }>
  load: (
    projectPath: string,
    filename: string
  ) => Promise<import('../renderer/src/types/plugin').PluginDefinition>
  parse: (
    content: string
  ) => Promise<import('../renderer/src/types/plugin').PluginDefinition>
  readRaw: (projectPath: string, filename: string) => Promise<string>
  list: (projectPath: string) => Promise<string[]>
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

const projectApi: ProjectAPI = {
  validate: (path) => ipcRenderer.invoke('project:validate', path),
  load: (path) => ipcRenderer.invoke('project:load', path),
  getSwitches: (path) => ipcRenderer.invoke('project:get-switches', path),
  getVariables: (path) => ipcRenderer.invoke('project:get-variables', path),
  getActors: (path) => ipcRenderer.invoke('project:get-actors', path),
  getItems: (path) => ipcRenderer.invoke('project:get-items', path),
  getMaps: (path) => ipcRenderer.invoke('project:get-maps', path),
  getPlugins: (path) => ipcRenderer.invoke('project:get-plugins', path)
}

const pluginApi: PluginAPI = {
  save: (projectPath, filename, content) =>
    ipcRenderer.invoke('plugin:save', projectPath, filename, content),
  saveToPath: (filePath, content) =>
    ipcRenderer.invoke('plugin:save-to-path', filePath, content),
  load: (projectPath, filename) =>
    ipcRenderer.invoke('plugin:load', projectPath, filename),
  parse: (content) => ipcRenderer.invoke('plugin:parse', content),
  readRaw: (projectPath, filename) =>
    ipcRenderer.invoke('plugin:read-raw', projectPath, filename),
  list: (projectPath) => ipcRenderer.invoke('plugin:list', projectPath)
}

const dialogApi: DialogAPI = {
  openFolder: () => ipcRenderer.invoke('dialog:open-folder'),
  saveFile: (options = {}) => ipcRenderer.invoke('dialog:save-file', options),
  openFile: (options = {}) => ipcRenderer.invoke('dialog:open-file', options),
  message: (options) => ipcRenderer.invoke('dialog:message', options)
}

const windowApi: WindowAPI = {
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),
  forceClose: () => ipcRenderer.send('window-force-close'),
  isMaximized: () => ipcRenderer.invoke('window-is-maximized'),
  onMaximizeChange: (callback) => {
    const handler = (_event: unknown, isMaximized: boolean) => callback(isMaximized)
    ipcRenderer.on('window-maximized-changed', handler)
    return () => ipcRenderer.removeListener('window-maximized-changed', handler)
  }
}

contextBridge.exposeInMainWorld('api', {
  project: projectApi,
  plugin: pluginApi,
  dialog: dialogApi,
  window: windowApi
})

// Export types for renderer
export type API = {
  project: ProjectAPI
  plugin: PluginAPI
  dialog: DialogAPI
  window: WindowAPI
}
