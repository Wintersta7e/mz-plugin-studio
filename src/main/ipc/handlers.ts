// Every channel's handler, assembled from the modules that hold their bodies. Main builds the deps
// from Electron; tests build them from stand-ins.
import type { BrowserWindow } from 'electron'
import log from 'electron-log/main'
import { createDialogHandlers, type DialogPort } from './dialog'
import { pluginHandlers } from './plugin'
import { createProjectHandlers } from './project'
import type { InvokeHandlers, SendListeners } from './registration'

export type WindowPort = Pick<
  BrowserWindow,
  'minimize' | 'maximize' | 'unmaximize' | 'isMaximized' | 'close'
>

export interface MainDeps {
  dialog: DialogPort
  getWindow: () => WindowPort | null
  openLogFolder: () => Promise<void>
  setLogLevel: (level: 'debug' | 'info') => void
}

export function createInvokeHandlers(dependencies: MainDeps): InvokeHandlers {
  return {
    ...createProjectHandlers(dependencies.dialog),
    ...pluginHandlers,
    ...createDialogHandlers(dependencies.dialog),
    'window-is-maximized': {
      access: 'none',
      check: () => [],
      run: () => dependencies.getWindow()?.isMaximized() ?? false
    },
    'log:open-folder': {
      access: 'none',
      check: () => [],
      run: async () => dependencies.openLogFolder()
    }
  } satisfies InvokeHandlers
}

export function createSendListeners(dependencies: MainDeps): SendListeners {
  return {
    'window-minimize': {
      check: () => [],
      run: () => {
        dependencies.getWindow()?.minimize()
      }
    },
    'window-maximize': {
      check: () => [],
      run: () => {
        const win = dependencies.getWindow()
        if (win?.isMaximized()) {
          win.unmaximize()
        } else {
          win?.maximize()
        }
      }
    },
    'window-close': {
      check: () => [],
      run: () => {
        dependencies.getWindow()?.close()
      }
    },
    'log:set-level': {
      check: (raw) => [raw[0] === true],
      run: (debug) => {
        const level = debug ? 'debug' : 'info'
        dependencies.setLogLevel(level)
        log.info(`Log level changed to: ${level}`)
      }
    }
  }
}

export { type DialogPort } from './dialog'
