// Every channel's handler, assembled from the modules that hold their bodies. Main builds the deps
// from Electron; tests build them from stand-ins.
import type { BrowserWindow } from 'electron'
import log from 'electron-log/main'
import { createDialogHandlers, type DialogPort } from './dialog'
import { pluginHandlers } from './plugin'
import { createProjectHandlers } from './project'
import type { InvokeHandlers, SendListeners } from './registration'

export type { DialogPort }

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

export function createInvokeHandlers(deps: MainDeps): InvokeHandlers {
  return {
    ...createProjectHandlers(deps.dialog),
    ...pluginHandlers,
    ...createDialogHandlers(deps.dialog),
    'window-is-maximized': {
      access: 'none',
      check: () => [],
      run: () => deps.getWindow()?.isMaximized() ?? false
    },
    'log:open-folder': {
      access: 'none',
      check: () => [],
      run: async () => deps.openLogFolder()
    }
  } satisfies InvokeHandlers
}

export function createSendListeners(deps: MainDeps): SendListeners {
  return {
    'window-minimize': {
      check: () => [],
      run: () => {
        deps.getWindow()?.minimize()
      }
    },
    'window-maximize': {
      check: () => [],
      run: () => {
        const win = deps.getWindow()
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
        deps.getWindow()?.close()
      }
    },
    'log:set-level': {
      check: (raw) => [raw[0] === true],
      run: (debug) => {
        const level = debug ? 'debug' : 'info'
        deps.setLogLevel(level)
        log.info(`Log level changed to: ${level}`)
      }
    }
  }
}
