import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { setupProjectHandlers } from './ipc/project'
import { setupPluginHandlers } from './ipc/plugin'
import { setupDialogHandlers } from './ipc/dialog'
import { IPC_CHANNELS } from '../shared/ipc-types'
import { setupAutoUpdater } from './updater'

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    show: false,
    frame: false,
    titleBarStyle: 'hidden',
    autoHideMenuBar: true,
    backgroundColor: '#1e1e2e',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// Window control handlers
ipcMain.on(IPC_CHANNELS.WINDOW_MINIMIZE, () => {
  mainWindow?.minimize()
})

ipcMain.on(IPC_CHANNELS.WINDOW_MAXIMIZE, () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize()
  } else {
    mainWindow?.maximize()
  }
})

ipcMain.on(IPC_CHANNELS.WINDOW_CLOSE, () => {
  mainWindow?.close()
})

ipcMain.on(IPC_CHANNELS.WINDOW_FORCE_CLOSE, () => {
  mainWindow?.destroy()
})

ipcMain.handle(IPC_CHANNELS.WINDOW_IS_MAXIMIZED, () => {
  return mainWindow?.isMaximized()
})

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.mzpluginstudio')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // Setup IPC handlers
  setupProjectHandlers(ipcMain)
  setupPluginHandlers(ipcMain)
  setupDialogHandlers(ipcMain, dialog)

  createWindow()

  // Send maximize state changes to renderer
  mainWindow?.on('maximize', () => {
    mainWindow?.webContents.send(IPC_CHANNELS.WINDOW_MAXIMIZED_CHANGED, true)
  })
  mainWindow?.on('unmaximize', () => {
    mainWindow?.webContents.send(IPC_CHANNELS.WINDOW_MAXIMIZED_CHANGED, false)
  })

  // Setup auto-updater (only in production)
  if (mainWindow && !is.dev) {
    setupAutoUpdater(mainWindow)
  }

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
