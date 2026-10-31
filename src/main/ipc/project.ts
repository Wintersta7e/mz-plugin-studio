import type { IpcMain, IpcMainInvokeEvent } from 'electron'
import log from 'electron-log/main'
import { ProjectParser } from '../services/projectParser'
import { IPC_CHANNELS } from '../../shared/ipc-types'
import { assertSafeProjectPath } from '../../shared/path-safety'

export function setupProjectHandlers(ipcMain: IpcMain): void {
  ipcMain.handle(
    IPC_CHANNELS.PROJECT_VALIDATE,
    async (_event: IpcMainInvokeEvent, path: string) => {
      assertSafeProjectPath(path)
      log.debug(`[project:validate] ${path}`)
      return ProjectParser.validateProject(path)
    }
  )

  ipcMain.handle(IPC_CHANNELS.PROJECT_LOAD, async (_event: IpcMainInvokeEvent, path: string) => {
    assertSafeProjectPath(path)
    try {
      const result = await ProjectParser.parseProject(path)
      log.info(
        `[project:load] "${result.gameTitle}" — ${result.actors.length} actors, ${result.items.length} items, ${result.maps.length} maps`
      )
      return result
    } catch (error) {
      log.error(`[project:load] Failed to load project at ${path}:`, error)
      throw new Error(
        `Failed to load project: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  })
}
