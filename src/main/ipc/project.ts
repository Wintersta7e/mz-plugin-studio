import { IpcMain, IpcMainInvokeEvent } from 'electron'
import { ProjectParser } from '../services/projectParser'
import { IPC_CHANNELS } from '../../shared/ipc-types'

export function setupProjectHandlers(ipcMain: IpcMain): void {
  ipcMain.handle(
    IPC_CHANNELS.PROJECT_VALIDATE,
    async (_event: IpcMainInvokeEvent, path: string) => {
      return ProjectParser.validateProject(path)
    }
  )

  ipcMain.handle(IPC_CHANNELS.PROJECT_LOAD, async (_event: IpcMainInvokeEvent, path: string) => {
    return ProjectParser.parseProject(path)
  })

  ipcMain.handle(
    IPC_CHANNELS.PROJECT_GET_SWITCHES,
    async (_event: IpcMainInvokeEvent, path: string) => {
      return ProjectParser.getSwitches(path)
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.PROJECT_GET_VARIABLES,
    async (_event: IpcMainInvokeEvent, path: string) => {
      return ProjectParser.getVariables(path)
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.PROJECT_GET_ACTORS,
    async (_event: IpcMainInvokeEvent, path: string) => {
      return ProjectParser.getActors(path)
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.PROJECT_GET_ITEMS,
    async (_event: IpcMainInvokeEvent, path: string) => {
      return ProjectParser.getItems(path)
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.PROJECT_GET_MAPS,
    async (_event: IpcMainInvokeEvent, path: string) => {
      return ProjectParser.getMaps(path)
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.PROJECT_GET_PLUGINS,
    async (_event: IpcMainInvokeEvent, path: string) => {
      return ProjectParser.getPlugins(path)
    }
  )

  // Data array channels
  const DATA_CHANNELS = [
    { channel: IPC_CHANNELS.PROJECT_GET_SKILLS, method: 'getSkills' as const },
    { channel: IPC_CHANNELS.PROJECT_GET_WEAPONS, method: 'getWeapons' as const },
    { channel: IPC_CHANNELS.PROJECT_GET_ARMORS, method: 'getArmors' as const },
    { channel: IPC_CHANNELS.PROJECT_GET_ENEMIES, method: 'getEnemies' as const },
    { channel: IPC_CHANNELS.PROJECT_GET_STATES, method: 'getStates' as const },
    { channel: IPC_CHANNELS.PROJECT_GET_ANIMATIONS, method: 'getAnimations' as const },
    { channel: IPC_CHANNELS.PROJECT_GET_TILESETS, method: 'getTilesets' as const },
    { channel: IPC_CHANNELS.PROJECT_GET_COMMON_EVENTS, method: 'getCommonEvents' as const },
    { channel: IPC_CHANNELS.PROJECT_GET_CLASSES, method: 'getClasses' as const },
    { channel: IPC_CHANNELS.PROJECT_GET_TROOPS, method: 'getTroops' as const }
  ] as const

  for (const { channel, method } of DATA_CHANNELS) {
    ipcMain.handle(channel, async (_event: IpcMainInvokeEvent, path: string) => {
      return ProjectParser[method](path)
    })
  }
}
