import { IpcMain, IpcMainInvokeEvent, Dialog } from 'electron'
import { IPC_CHANNELS } from '../../shared/ipc-types'

export function setupDialogHandlers(ipcMain: IpcMain, dialog: Dialog): void {
  ipcMain.handle(IPC_CHANNELS.DIALOG_OPEN_FOLDER, async (_event: IpcMainInvokeEvent) => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
      title: 'Select RPG Maker MZ Project Folder'
    })

    if (result.canceled || result.filePaths.length === 0) {
      return null
    }

    return result.filePaths[0]
  })

  ipcMain.handle(
    IPC_CHANNELS.DIALOG_SAVE_FILE,
    async (
      _event: IpcMainInvokeEvent,
      options: { defaultPath?: string; filters?: { name: string; extensions: string[] }[] }
    ) => {
      const result = await dialog.showSaveDialog({
        defaultPath: options.defaultPath,
        filters: options.filters || [{ name: 'JavaScript', extensions: ['js'] }]
      })

      if (result.canceled || !result.filePath) {
        return null
      }

      return result.filePath
    }
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
        return null
      }

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
      }
    ) => {
      const result = await dialog.showMessageBox({
        type: options.type || 'info',
        title: options.title || 'MZ Plugin Studio',
        message: options.message,
        buttons: options.buttons || ['OK']
      })

      return result.response
    }
  )
}
