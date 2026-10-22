import { type IpcMain, type IpcMainInvokeEvent, type Dialog } from 'electron'
import log from 'electron-log/main'
import { IPC_CHANNELS } from '../../shared/ipc-types'
import { recordWriteGrant } from '../file-access'

export interface SaveFileDialogOptions {
  defaultPath?: string
  filters?: { name: string; extensions: string[] }[]
}

/**
 * Shows the save dialog; returns the chosen path, or null when cancelled.
 * The chosen path becomes writable by save-to-path for the rest of the session.
 */
export async function showSaveFileDialog(
  dialog: Pick<Dialog, 'showSaveDialog'>,
  options: SaveFileDialogOptions
): Promise<string | null> {
  const result = await dialog.showSaveDialog({
    defaultPath: options.defaultPath,
    filters: options.filters || [{ name: 'JavaScript', extensions: ['js'] }]
  })

  if (result.canceled || !result.filePath) {
    log.debug('[dialog:save-file] Cancelled')
    return null
  }

  log.info(`[dialog:save-file] Selected: ${result.filePath}`)
  recordWriteGrant(result.filePath)
  return result.filePath
}

export function setupDialogHandlers(ipcMain: IpcMain, dialog: Dialog): void {
  ipcMain.handle(IPC_CHANNELS.DIALOG_OPEN_FOLDER, async (_event: IpcMainInvokeEvent) => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
      title: 'Select RPG Maker MZ Project Folder'
    })

    if (result.canceled || result.filePaths.length === 0) {
      log.debug('[dialog:open-folder] Cancelled')
      return null
    }

    log.info(`[dialog:open-folder] Selected: ${result.filePaths[0]}`)
    return result.filePaths[0]
  })

  ipcMain.handle(
    IPC_CHANNELS.DIALOG_SAVE_FILE,
    (_event: IpcMainInvokeEvent, options: SaveFileDialogOptions) =>
      showSaveFileDialog(dialog, options)
  )

  ipcMain.handle(
    IPC_CHANNELS.DIALOG_OPEN_FILE,
    async (
      _event: IpcMainInvokeEvent,
      options: { filters?: { name: string; extensions: string[] }[] }
    ) => {
      const result = await dialog.showOpenDialog({
        properties: ['openFile'],
        filters: options.filters || [{ name: 'JavaScript', extensions: ['js'] }]
      })

      if (result.canceled || result.filePaths.length === 0) {
        log.debug('[dialog:open-file] Cancelled')
        return null
      }

      log.info(`[dialog:open-file] Selected: ${result.filePaths[0]}`)
      return result.filePaths[0]
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.DIALOG_MESSAGE,
    async (
      _event: IpcMainInvokeEvent,
      options: {
        type?: 'none' | 'info' | 'error' | 'question' | 'warning'
        title?: string
        message: string
        buttons?: string[]
        defaultId?: number
      }
    ) => {
      log.debug(`[dialog:message] ${options.type || 'info'}: ${options.message}`)
      const result = await dialog.showMessageBox({
        type: options.type || 'info',
        title: options.title || 'MZ Plugin Studio',
        message: options.message,
        buttons: options.buttons || ['OK'],
        ...(options.defaultId !== undefined && { defaultId: options.defaultId })
      })

      return result.response
    }
  )
}
