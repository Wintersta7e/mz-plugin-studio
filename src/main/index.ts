import log from 'electron-log/main'

// Initialize electron-log — sets up file transport and IPC for renderer
log.initialize()

import { app, shell, BrowserWindow, dialog, session } from 'electron'
import { join, dirname } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { createInvokeHandlers, createSendListeners, type MainDeps } from './ipc/handlers'
import { emit, handleAll, onAll } from './ipc/registration'
import { handleWillPreventUnload } from './close-prompt'
import { DEV_SERVER_CSP, PRODUCTION_CSP } from './csp'
import { DEFAULT_WINDOW_SIZE } from './window-size'
import { IPC_CHANNELS } from '../shared/ipc-types'

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: DEFAULT_WINDOW_SIZE.width,
    height: DEFAULT_WINDOW_SIZE.height,
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

  // Block all navigation away from the app origin — prevents renderer compromise escalation
  mainWindow.webContents.on('will-navigate', (event) => {
    // The app is a single-page app — it should never navigate away from its initial URL.
    // In dev, Vite HMR may trigger same-origin navigations which are safe.
    // In production, block ALL navigation unconditionally.
    if (!is.dev) {
      event.preventDefault()
    }
  })

  // The page holds back its unload while any plugin is unsaved: ask before the window closes
  const win = mainWindow
  win.webContents.on('will-prevent-unload', (event) =>
    handleWillPreventUnload(event, (options) => dialog.showMessageBoxSync(win, options))
  )

  mainWindow.webContents.setWindowOpenHandler((details) => {
    try {
      const parsed = new URL(details.url)
      if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
        shell.openExternal(parsed.href)
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

  const csp = is.dev ? DEV_SERVER_CSP : PRODUCTION_CSP
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [csp]
      }
    })
  })

  const deps: MainDeps = {
    dialog,
    getWindow: () => mainWindow,
    openLogFolder: async () => {
      const logPath = log.transports.file.getFile().path
      shell.openPath(dirname(logPath))
    },
    setLogLevel: (level) => {
      log.transports.file.level = level
      log.transports.console.level = level
    }
  }
  handleAll(createInvokeHandlers(deps))
  onAll(createSendListeners(deps))

  createWindow()
  log.info('Main window created')

  // Send maximize state changes to renderer
  mainWindow?.on('maximize', () => {
    if (mainWindow) emit(mainWindow.webContents, IPC_CHANNELS.WINDOW_MAXIMIZED_CHANGED, true)
  })
  mainWindow?.on('unmaximize', () => {
    if (mainWindow) emit(mainWindow.webContents, IPC_CHANNELS.WINDOW_MAXIMIZED_CHANGED, false)
  })

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
