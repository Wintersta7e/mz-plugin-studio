import { IpcMain, IpcMainInvokeEvent } from 'electron'
import { ProjectParser } from '../services/projectParser'

export function setupProjectHandlers(ipcMain: IpcMain): void {
  ipcMain.handle('project:validate', async (_event: IpcMainInvokeEvent, path: string) => {
    return ProjectParser.validateProject(path)
  })

  ipcMain.handle('project:load', async (_event: IpcMainInvokeEvent, path: string) => {
    return ProjectParser.parseProject(path)
  })

  ipcMain.handle('project:get-switches', async (_event: IpcMainInvokeEvent, path: string) => {
    return ProjectParser.getSwitches(path)
  })

  ipcMain.handle('project:get-variables', async (_event: IpcMainInvokeEvent, path: string) => {
    return ProjectParser.getVariables(path)
  })

  ipcMain.handle('project:get-actors', async (_event: IpcMainInvokeEvent, path: string) => {
    return ProjectParser.getActors(path)
  })

  ipcMain.handle('project:get-items', async (_event: IpcMainInvokeEvent, path: string) => {
    return ProjectParser.getItems(path)
  })

  ipcMain.handle('project:get-maps', async (_event: IpcMainInvokeEvent, path: string) => {
    return ProjectParser.getMaps(path)
  })

  ipcMain.handle('project:get-plugins', async (_event: IpcMainInvokeEvent, path: string) => {
    return ProjectParser.getPlugins(path)
  })
}
