import { autoUpdater } from 'electron-updater'
import { BrowserWindow, ipcMain } from 'electron'
import { IPC_CHANNELS } from '../shared/ipc-types'

export function setupAutoUpdater(mainWindow: BrowserWindow): void {
  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('update-available', (info) => {
    mainWindow.webContents.send(IPC_CHANNELS.UPDATE_AVAILABLE, {
      version: info.version,
      releaseNotes: info.releaseNotes
    })
  })

  autoUpdater.on('update-downloaded', () => {
    mainWindow.webContents.send(IPC_CHANNELS.UPDATE_DOWNLOADED)
  })

  ipcMain.handle(IPC_CHANNELS.UPDATE_DOWNLOAD, async () => {
    await autoUpdater.downloadUpdate()
  })

  ipcMain.handle(IPC_CHANNELS.UPDATE_INSTALL, () => {
    autoUpdater.quitAndInstall()
  })

  // Check for updates after a short delay (don't block startup)
  setTimeout(() => {
    autoUpdater.checkForUpdates().catch(() => {
      // Silently fail if offline or no releases configured
    })
  }, 5000)
}
