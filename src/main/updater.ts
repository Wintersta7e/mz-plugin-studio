import { autoUpdater } from 'electron-updater'
import { type BrowserWindow, ipcMain } from 'electron'
import log from 'electron-log/main'
import { IPC_CHANNELS } from '../shared/ipc-types'

export function setupAutoUpdater(mainWindow: BrowserWindow): void {
  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = true
  log.info('[updater] Auto-updater initialized')

  // Defensive null checks on mainWindow — on macOS the window could be
  // destroyed while the updater is still running. This app targets Windows
  // but the guard is cheap insurance. (LEAK-06)
  autoUpdater.on('update-available', (info) => {
    log.info(`[updater] Update available: v${info.version}`)
    if (!mainWindow.isDestroyed()) {
      mainWindow.webContents.send(IPC_CHANNELS.UPDATE_AVAILABLE, {
        version: info.version,
        releaseNotes: info.releaseNotes
      })
    }
  })

  autoUpdater.on('update-downloaded', () => {
    log.info('[updater] Update downloaded, will install on quit')
    if (!mainWindow.isDestroyed()) {
      mainWindow.webContents.send(IPC_CHANNELS.UPDATE_DOWNLOADED)
    }
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
