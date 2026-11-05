// A stand-in for `ipcMain`: records what main registers and calls it as a window's request would.
// A test importing this file mocks `electron` (the registration module imports `ipcMain`).
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { createInvokeHandlers, createSendListeners } from '../../src/main/ipc/handlers'
import type { DialogPort, MainDeps } from '../../src/main/ipc/handlers'
import { createSenderCheck, handleAll, onAll } from '../../src/main/ipc/registration'
import type { Registrar, SenderCheck, SenderEvent } from '../../src/main/ipc/registration'

type Listener = (event: SenderEvent, ...args: unknown[]) => unknown

/** The part of a frame the sender check reads */
export interface FakeFrame {
  url: string
}

/** A window whose main frame shows `url` */
export function createFakeWindow(url: string): { webContents: { mainFrame: FakeFrame } } {
  return { webContents: { mainFrame: { url } } }
}

/** The app's window at a synthetic renderer entry, and a sender check that trusts its main frame */
export function createAppPage(): { frame: FakeFrame; isTrustedSender: SenderCheck } {
  const entry = resolve('/Synthetic_App/out/renderer/index.html')
  const window = createFakeWindow(pathToFileURL(entry).href)
  const isTrustedSender = createSenderCheck(() => window, { kind: 'file', path: entry })
  return { frame: window.webContents.mainFrame, isTrustedSender }
}

export interface FakeRegistrar {
  registrar: Registrar
  handled: string[]
  listened: string[]
  /** Calls as a request from `defaultFrame` */
  invoke(channel: string, ...args: unknown[]): Promise<unknown>
  send(channel: string, ...args: unknown[]): void
  invokeFrom(frame: FakeFrame | null, channel: string, ...args: unknown[]): Promise<unknown>
  sendFrom(frame: FakeFrame | null, channel: string, ...args: unknown[]): void
}

export function createFakeRegistrar(defaultFrame: FakeFrame | null = null): FakeRegistrar {
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
    return handler({ senderFrame: frame }, ...args)
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
    invoke: (channel, ...args) => invokeFrom(defaultFrame, channel, ...args),
    send: (channel, ...args) => sendFrom(defaultFrame, channel, ...args),
    invokeFrom,
    sendFrom
  }
}

/** Main's handlers and listeners registered on a fresh stand-in, called from the app page, `dialog` answering the dialogs */
export function registerMainHandlers(dialog: Partial<DialogPort> = {}): FakeRegistrar {
  const deps: MainDeps = {
    dialog: dialog as DialogPort,
    getWindow: () => null,
    openLogFolder: async () => {},
    setLogLevel: () => {}
  }
  const page = createAppPage()
  const fake = createFakeRegistrar(page.frame)
  handleAll(createInvokeHandlers(deps), page.isTrustedSender, fake.registrar)
  onAll(createSendListeners(deps), page.isTrustedSender, fake.registrar)
  return fake
}
