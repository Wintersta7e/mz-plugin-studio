import { IpcMain, IpcMainInvokeEvent } from 'electron'
import { ProjectParser } from '../services/projectParser'
import { IPC_CHANNELS } from '../../shared/ipc-types'

export function setupProjectHandlers(ipcMain: IpcMain): void {
  ipcMain.handle(IPC_CHANNELS.PROJECT_VALIDATE, async (_event: IpcMainInvokeEvent, path: string) => {
    return ProjectParser.validateProject(path)
  })

  ipcMain.handle(IPC_CHANNELS.PROJECT_LOAD, async (_event: IpcMainInvokeEvent, path: string) => {
    return ProjectParser.parseProject(path)
  })

  ipcMain.handle(IPC_CHANNELS.PROJECT_GET_SWITCHES, async (_event: IpcMainInvokeEvent, path: string) => {
    return ProjectParser.getSwitches(path)
  })

  ipcMain.handle(IPC_CHANNELS.PROJECT_GET_VARIABLES, async (_event: IpcMainInvokeEvent, path: string) => {
    return ProjectParser.getVariables(path)
  })

  ipcMain.handle(IPC_CHANNELS.PROJECT_GET_ACTORS, async (_event: IpcMainInvokeEvent, path: string) => {
    return ProjectParser.getActors(path)
  })

  ipcMain.handle(IPC_CHANNELS.PROJECT_GET_ITEMS, async (_event: IpcMainInvokeEvent, path: string) => {
    return ProjectParser.getItems(path)
  })

  ipcMain.handle(IPC_CHANNELS.PROJECT_GET_MAPS, async (_event: IpcMainInvokeEvent, path: string) => {
    return ProjectParser.getMaps(path)
  })

  ipcMain.handle(IPC_CHANNELS.PROJECT_GET_PLUGINS, async (_event: IpcMainInvokeEvent, path: string) => {
    return ProjectParser.getPlugins(path)
  })
}
