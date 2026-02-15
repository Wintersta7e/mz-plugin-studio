/// <reference types="vite/client" />

interface ProjectAPI {
  validate: (path: string) => Promise<{ valid: boolean; error?: string }>
  load: (path: string) => Promise<import('./types/mz').MZProject>
  getSwitches: (path: string) => Promise<import('./types/mz').MZSwitch[]>
  getVariables: (path: string) => Promise<import('./types/mz').MZVariable[]>
  getActors: (path: string) => Promise<import('./types/mz').MZActor[]>
  getItems: (path: string) => Promise<import('./types/mz').MZItem[]>
  getMaps: (path: string) => Promise<import('./types/mz').MZMapInfo[]>
  getPlugins: (path: string) => Promise<import('./types/mz').MZPluginEntry[]>
  getSkills: (path: string) => Promise<import('./types/mz').MZSkill[]>
  getWeapons: (path: string) => Promise<import('./types/mz').MZWeapon[]>
  getArmors: (path: string) => Promise<import('./types/mz').MZArmor[]>
  getEnemies: (path: string) => Promise<import('./types/mz').MZEnemy[]>
  getStates: (path: string) => Promise<import('./types/mz').MZState[]>
  getAnimations: (path: string) => Promise<import('./types/mz').MZAnimation[]>
  getTilesets: (path: string) => Promise<import('./types/mz').MZTileset[]>
  getCommonEvents: (path: string) => Promise<import('./types/mz').MZCommonEvent[]>
  getClasses: (path: string) => Promise<import('./types/mz').MZClass[]>
  getTroops: (path: string) => Promise<import('./types/mz').MZTroop[]>
}

interface PluginAPI {
  save: (
    projectPath: string,
    filename: string,
    content: string
  ) => Promise<{ success: boolean; path: string }>
  saveToPath: (
    filePath: string,
    content: string
  ) => Promise<{ success: boolean; path: string }>
  load: (projectPath: string, filename: string) => Promise<import('./types/plugin').PluginDefinition>
  parse: (content: string) => Promise<import('./types/plugin').PluginDefinition>
  readRaw: (projectPath: string, filename: string) => Promise<string>
  list: (projectPath: string) => Promise<string[]>
}

interface DialogAPI {
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

interface WindowAPI {
  minimize: () => void
  maximize: () => void
  close: () => void
  forceClose: () => void
  isMaximized: () => Promise<boolean>
  onMaximizeChange: (callback: (isMaximized: boolean) => void) => () => void
}

interface UpdateAPI {
  onUpdateAvailable: (
    callback: (info: { version: string; releaseNotes?: string }) => void
  ) => () => void
  onUpdateDownloaded: (callback: () => void) => () => void
  downloadUpdate: () => Promise<void>
  installUpdate: () => Promise<void>
}

interface API {
  project: ProjectAPI
  plugin: PluginAPI
  dialog: DialogAPI
  window: WindowAPI
  update: UpdateAPI
}

declare global {
  interface Window {
    api: API
  }
}

export {}
