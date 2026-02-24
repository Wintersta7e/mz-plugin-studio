import { autoUpdater } from 'electron-updater'
import { BrowserWindow, ipcMain } from 'electron'
import log from 'electron-log/main'
import { IPC_CHANNELS } from '../shared/ipc-types'

export function setupAutoUpdater(mainWindow: BrowserWindow): void {
  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = true
  log.info('[updater] Auto-updater initialized')

  autoUpdater.on('update-available', (info) => {
    log.info(`[updater] Update available: v${info.version}`)
    mainWindow.webContents.send(IPC_CHANNELS.UPDATE_AVAILABLE, {
      version: info.version,
      releaseNotes: info.releaseNotes
    })
  })

  autoUpdater.on('update-downloaded', () => {
    log.info('[updater] Update downloaded, will install on quit')
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
    autoUpdater.checkForUpdates().catch((err) => {
      log.debug(`[updater] Update check skipped: ${err?.message || err}`)
    })
  }, 5000)
}
