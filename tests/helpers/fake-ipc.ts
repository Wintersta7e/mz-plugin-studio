// A stand-in for `ipcMain`: records what main registers and calls it as a window's request would.
// A test importing this file mocks `electron` (the registration module imports `ipcMain`).
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { vi } from 'vitest'
import {
  createInvokeHandlers,
  createSendListeners,
  type DialogPort,
  type MainDeps as MainDependencies
} from '../../src/main/ipc/handlers'
import {
  createSenderCheck,
  handleAll,
  onAll,
  type Registrar,
  type SenderCheck,
  type SenderEvent
} from '../../src/main/ipc/registration'

/**
The part of a frame the sender check reads
*/
export interface FakeFrame {
  url: string
}

/**
A window whose main frame shows `url`
*/
export function createFakeWindow(url: string): { webContents: { mainFrame: FakeFrame } } {
  return { webContents: { mainFrame: { url } } }
}

/**
The app's window at a synthetic renderer entry, and a sender check that trusts its main frame
*/
export function createAppPage(): { frame: FakeFrame; isTrustedSender: SenderCheck } {
  const entry = path.resolve('/Synthetic_App/out/renderer/index.html')
  const window = createFakeWindow(pathToFileURL(entry).href)
  const isTrustedSender = createSenderCheck(() => window, { kind: 'file', path: entry })
  return { frame: window.webContents.mainFrame, isTrustedSender }
}

export interface FakeRegistrar {
  registrar: Registrar
  handled: string[]
  listened: string[]
  /**
  Calls as a request from `defaultFrame`
  */
  invoke(channel: string, ...args: unknown[]): Promise<unknown>
  send(channel: string, ...args: unknown[]): void
  invokeFrom(frame: FakeFrame | null, channel: string, ...args: unknown[]): Promise<unknown>
  sendFrom(frame: FakeFrame | null, channel: string, ...args: unknown[]): void
}

export function createFakeRegistrar(defaultFrame: FakeFrame | null = null): FakeRegistrar {
  type Listener = (event: SenderEvent, ...args: unknown[]) => unknown
  const handlers = new Map<string, Listener>()
  const listeners = new Map<string, Listener>()
  const handled: string[] = []
  const listened: string[] = []
  const invokeFrom = async (
    frame: FakeFrame | null,
    channel: string,
    ...args: unknown[]
  ): Promise<unknown> => {
    const handler = handlers.get(channel)
    if (handler === undefined) throw new Error(`no handler for ${channel}`)
    return await handler({ senderFrame: frame }, ...args)
  }
  const sendFrom = (frame: FakeFrame | null, channel: string, ...args: unknown[]): void => {
    const listener = listeners.get(channel)
    if (listener === undefined) throw new Error(`no listener for ${channel}`)
    listener({ senderFrame: frame }, ...args)
  }
  return {
    registrar: {
      handle(channel, listener) {
        handlers.set(channel, listener)
        handled.push(channel)
      },
      on(channel, listener) {
        listeners.set(channel, listener)
        listened.push(channel)
      }
    },
    handled,
    listened,
    invoke: async (channel, ...args) => invokeFrom(defaultFrame, channel, ...args),
    send: (channel, ...args) => {
      sendFrom(defaultFrame, channel, ...args)
    },
    invokeFrom,
    sendFrom
  }
}

/**
A dialog method the test left out: calling it fails the request
*/
function unanswered(name: keyof DialogPort): () => never {
  return () => {
    throw new Error(`the test's dialog has no ${name}`)
  }
}

/**
Main's handlers and listeners registered on a fresh stand-in, called from the app page, `dialog` answering the dialogs
*/
export function registerMainHandlers(dialog: Partial<DialogPort> = {}): FakeRegistrar {
  // Read when called, so a method the test replaces later is the one used
  const port: DialogPort = {
    get showOpenDialog() {
      return dialog.showOpenDialog ?? unanswered('showOpenDialog')
    },
    get showSaveDialog() {
      return dialog.showSaveDialog ?? unanswered('showSaveDialog')
    },
    get showMessageBox() {
      return dialog.showMessageBox ?? unanswered('showMessageBox')
    }
  }
  const dependencies: MainDependencies = {
    dialog: port,
    getWindow: () => null,
    openLogFolder: vi.fn<MainDependencies['openLogFolder']>().mockResolvedValue(),
    setLogLevel: vi.fn<MainDependencies['setLogLevel']>()
  }
  const page = createAppPage()
  const fake = createFakeRegistrar(page.frame)
  handleAll(createInvokeHandlers(dependencies), page.isTrustedSender, fake.registrar)
  onAll(createSendListeners(dependencies), page.isTrustedSender, fake.registrar)
  return fake
}
