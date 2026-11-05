import log from 'electron-log/main'

// Initialize electron-log without the script it would load into every page: that script asks main
// for options as the page loads, before main can tell which page asks. The app's preload carries
// the page's log lines instead.
log.initialize({ preload: false })

import { app, shell, BrowserWindow, dialog, session } from 'electron'
import path from 'node:path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { createInvokeHandlers, createSendListeners, type MainDependencies } from './ipc/handlers'
import { createSenderCheck, emit, handleAll, onAll, routeLogChannel } from './ipc/registration'
import { setProjectRootsDirectory } from './file-access'
import { handleWillPreventUnload } from './close-prompt'
import { createWindowOpenHandler } from './window-open'
import { DEV_SERVER_CSP, PRODUCTION_CSP, installFileRequestFilter } from './csp'
import { DEFAULT_WINDOW_SIZE } from './window-size'
import { IPC_CHANNELS } from '../shared/ipc-types'

const windows: { main?: BrowserWindow } = {}

const RENDERER_ROOT = path.join(__dirname, '../renderer')
const RENDERER_HTML = path.join(RENDERER_ROOT, 'index.html')
const { ELECTRON_RENDERER_URL: rendererUrl = '' } = process.env
const developmentServerUrl = is.dev ? rendererUrl : ''
// Served by the dev server: its policy, its navigations and its URL. Every other load is the
// built page from disk, under the production policy and the file request filter.
const isDevelopmentServer = developmentServerUrl !== ''

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: DEFAULT_WINDOW_SIZE.width,
    height: DEFAULT_WINDOW_SIZE.height,
    minWidth: 1000,
    minHeight: 700,
    show: false,
    frame: false,
    titleBarStyle: 'hidden',
    autoHideMenuBar: true,
    backgroundColor: '#1e1e2e',
    icon: path.join(__dirname, '../../resources/icon.png'),
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false
    }
  })
  windows.main = mainWindow

  mainWindow.on('ready-to-show', () => {
    windows.main?.show()
  })

  // Block all navigation away from the app origin — prevents renderer compromise escalation
  mainWindow.webContents.on('will-navigate', (event) => {
    // The app is a single-page app — it should never navigate away from its initial URL.
    // Under the dev server, Vite HMR may trigger same-origin navigations which are safe.
    // Otherwise, block ALL navigation unconditionally.
    if (!isDevelopmentServer) {
      event.preventDefault()
    }
  })

  // The page holds back its unload while any plugin is unsaved: ask before the window closes
  const win = mainWindow
  win.webContents.on('will-prevent-unload', (event) => {
    handleWillPreventUnload(event, (options) => dialog.showMessageBoxSync(win, options))
  })

  mainWindow.webContents.setWindowOpenHandler(
    createWindowOpenHandler(async (url) => shell.openExternal(url))
  )

  if (isDevelopmentServer) {
    void mainWindow.loadURL(developmentServerUrl)
  } else {
    void mainWindow.loadFile(RENDERER_HTML)
  }
}

async function start(): Promise<void> {
  await app.whenReady()
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

  const csp = isDevelopmentServer ? DEV_SERVER_CSP : PRODUCTION_CSP
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [csp]
      }
    })
  })
  // The built page and its workers may read only the files the app ships with
  if (!isDevelopmentServer) installFileRequestFilter(session.defaultSession, RENDERER_ROOT)

  const dependencies: MainDependencies = {
    dialog,
    getWindow: () => windows.main,
    openLogFolder: async () => {
      const logPath = log.transports.file.getFile().path
      await shell.openPath(path.dirname(logPath))
    },
    setLogLevel: (level) => {
      log.transports.file.level = level
      log.transports.console.level = level
    }
  }
  // Only the app's own page, in the main window, may call main
  const isTrustedSender = createSenderCheck(
    () => windows.main,
    isDevelopmentServer
      ? { kind: 'dev-server', origin: new URL(developmentServerUrl).origin }
      : { kind: 'file', path: RENDERER_HTML }
  )
  // Project folders the user opened stay granted, and dialogs open where they last chose, across
  // restarts
  setProjectRootsDirectory(app.getPath('userData'))
  handleAll(createInvokeHandlers(dependencies), isTrustedSender)
  onAll(createSendListeners(dependencies), isTrustedSender)
  // electron-log's own channel, which it registered unchecked on import, takes the same check
  routeLogChannel(isTrustedSender)

  createWindow()
  log.info('Main window created')

  // Send maximize state changes to renderer
  windows.main?.on('maximize', () => {
    if (windows.main) emit(windows.main.webContents, IPC_CHANNELS.WINDOW_MAXIMIZED_CHANGED, true)
  })
  windows.main?.on('unmaximize', () => {
    if (windows.main) emit(windows.main.webContents, IPC_CHANNELS.WINDOW_MAXIMIZED_CHANGED, false)
  })

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
}

void start()

app.on('window-all-closed', () => {
  log.info('All windows closed, quitting')
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
