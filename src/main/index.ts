import log from 'electron-log/main'

// Initialize electron-log — sets up file transport and IPC for renderer
log.initialize()

import { app, shell, BrowserWindow, ipcMain, dialog, session } from 'electron'
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
    icon: join(__dirname, '../../resources/icon.png'),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    try {
      const parsed = new URL(details.url)
      if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
        shell.openExternal(details.url)
      }
    } catch {
      // Ignore malformed URLs
    }
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

  // Configure log levels based on environment
  if (is.dev) {
    log.transports.file.level = 'debug'
    log.transports.console.level = 'debug'
  } else {
    log.transports.file.level = 'info'
    log.transports.console.level = 'info'
  }

  log.info(`MZ Plugin Studio v${app.getVersion()} starting (${is.dev ? 'dev' : 'production'})`)
  log.info(`Platform: ${process.platform} ${process.arch}`)

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // Content Security Policy — blocks injected scripts and unsafe content
  // Dev mode needs 'unsafe-inline' and 'unsafe-eval' for Vite HMR
  // Monaco editor loads from cdn.jsdelivr.net — must be allowed in script-src
  const monacoCdn = 'https://cdn.jsdelivr.net'
  const csp = is.dev
    ? `default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' ${monacoCdn}; style-src 'self' 'unsafe-inline' ${monacoCdn}; font-src 'self' data: ${monacoCdn}; img-src 'self' data:; connect-src 'self' ws: http://localhost:*; worker-src 'self' blob: ${monacoCdn}`
    : `default-src 'self'; script-src 'self' ${monacoCdn}; style-src 'self' 'unsafe-inline' ${monacoCdn}; font-src 'self' data: ${monacoCdn}; img-src 'self' data:; worker-src 'self' blob: ${monacoCdn}`
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [csp]
      }
    })
  })

  // Setup IPC handlers
  setupProjectHandlers(ipcMain)
  setupPluginHandlers(ipcMain)
  setupDialogHandlers(ipcMain, dialog)

  createWindow()
  log.info('Main window created')

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
  log.info('All windows closed, quitting')
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
