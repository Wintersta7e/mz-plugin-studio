// A stand-in for `ipcMain`: records what main registers and calls it as a window's request would.
// A test importing this file mocks `electron` (the registration module imports `ipcMain`).
import { createInvokeHandlers, createSendListeners } from '../../src/main/ipc/handlers'
import type { DialogPort, MainDeps } from '../../src/main/ipc/handlers'
import { handleAll, onAll } from '../../src/main/ipc/registration'
import type { Registrar, SenderEvent } from '../../src/main/ipc/registration'

type Listener = (event: SenderEvent, ...args: unknown[]) => unknown

export interface FakeRegistrar {
  registrar: Registrar
  handled: string[]
  listened: string[]
  invoke(channel: string, ...args: unknown[]): Promise<unknown>
  send(channel: string, ...args: unknown[]): void
}

export function createFakeRegistrar(): FakeRegistrar {
  const handlers = new Map<string, Listener>()
  const listeners = new Map<string, Listener>()
  const handled: string[] = []
  const listened: string[] = []
  const event: SenderEvent = { senderFrame: null }
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
    async invoke(channel, ...args) {
      const handler = handlers.get(channel)
      if (handler === undefined) throw new Error(`no handler for ${channel}`)
      return handler(event, ...args)
    },
    send(channel, ...args) {
      const listener = listeners.get(channel)
      if (listener === undefined) throw new Error(`no listener for ${channel}`)
      listener(event, ...args)
    }
  }
}

/** Main's handlers and listeners registered on a fresh stand-in, `dialog` answering the dialogs */
export function registerMainHandlers(dialog: Partial<DialogPort> = {}): FakeRegistrar {
  const deps: MainDeps = {
    dialog: dialog as DialogPort,
    getWindow: () => null,
    openLogFolder: async () => {},
    setLogLevel: () => {}
  }
  const fake = createFakeRegistrar()
  handleAll(createInvokeHandlers(deps), fake.registrar)
  onAll(createSendListeners(deps), fake.registrar)
  return fake
}
