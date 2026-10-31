// The one place main registers IPC: every request must come from the app's own page and pass its
// channel's argument check and access class before its handler runs, and every refusal is logged
// once without the request's content.
import { fileURLToPath } from 'url'
import { ipcMain, type WebContents } from 'electron'
import log from 'electron-log/main'
import { authorize, type AccessClass } from '../file-access'
import { samePath } from './plugin'
import {
  INVOKE_CHANNELS,
  SEND_CHANNELS,
  type EventArgs,
  type EventChannel,
  type InvokeArgs,
  type InvokeChannel,
  type InvokeResult,
  type SendArgs,
  type SendChannel
} from '../../shared/ipc-types'

export { invalidArguments } from './arguments'

export interface Handler<C extends InvokeChannel> {
  access: AccessClass
  /** The arguments as the handler takes them; throws `invalidArguments(channel)` */
  check(raw: readonly unknown[]): InvokeArgs<C>
  run(...args: InvokeArgs<C>): InvokeResult<C> | Promise<InvokeResult<C>>
}

export interface Listener<C extends SendChannel> {
  /** Never throws: maps any input to a safe value */
  check(raw: readonly unknown[]): SendArgs<C>
  run(...args: SendArgs<C>): void
}

export type InvokeHandlers = { [C in InvokeChannel]: Handler<C> }
export type SendListeners = { [C in SendChannel]: Listener<C> }

export interface SenderEvent {
  readonly senderFrame: unknown
}

/** The page the window loads: the packaged renderer file, or the dev server in development */
export type RendererEntry = { kind: 'file'; path: string } | { kind: 'dev-server'; origin: string }

/** Whether a request comes from the app's own page */
export type SenderCheck = (event: SenderEvent) => boolean

/**
 * Trusts only the main frame of the window `getWindow` returns, showing `entry`. A file entry is
 * compared by its decoded path, so any percent-encoding of the same file matches.
 */
export function createSenderCheck(
  getWindow: () => { webContents: { mainFrame: unknown } } | null,
  entry: RendererEntry,
  platform: NodeJS.Platform = process.platform
): SenderCheck {
  return (event) => {
    try {
      const frame = event.senderFrame
      if (frame === null || frame !== getWindow()?.webContents.mainFrame) return false
      const url = new URL((frame as { url: string }).url)
      if (entry.kind === 'dev-server') return url.origin === entry.origin
      if (url.protocol !== 'file:') return false
      const file = fileURLToPath(url, { windows: platform === 'win32' })
      return samePath(file, entry.path, platform)
    } catch {
      return false
    }
  }
}

export interface Registrar {
  handle(channel: string, listener: (event: SenderEvent, ...args: unknown[]) => unknown): void
  on(channel: string, listener: (event: SenderEvent, ...args: unknown[]) => void): void
}

/** Runs `step`; a throw is logged as the channel's refusal and rethrown */
function admit<T>(channel: string, step: () => T): T {
  try {
    return step()
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    log.warn(`[ipc] refused ${channel}: ${reason}`)
    throw error
  }
}

export function handle<C extends InvokeChannel>(
  channel: C,
  handler: Handler<C>,
  isTrustedSender: SenderCheck,
  registrar: Registrar = ipcMain
): void {
  registrar.handle(channel, async (event, ...raw) => {
    const args = admit(channel, () => {
      if (!isTrustedSender(event)) throw new Error('Access denied: sender')
      const checked = handler.check(raw)
      const list: readonly unknown[] = checked
      authorize(handler.access, list[0])
      return checked
    })
    return handler.run(...args)
  })
}

export function on<C extends SendChannel>(
  channel: C,
  listener: Listener<C>,
  isTrustedSender: SenderCheck,
  registrar: Registrar = ipcMain
): void {
  registrar.on(channel, (event, ...raw) => {
    if (!isTrustedSender(event)) {
      log.warn(`[ipc] Dropped ${channel}: sender is not the app page`)
      return
    }
    listener.run(...listener.check(raw))
  })
}

/** Registers a handler for every invoke channel; returns how many were registered */
export function handleAll(
  handlers: InvokeHandlers,
  isTrustedSender: SenderCheck,
  registrar: Registrar = ipcMain
): number {
  let count = 0
  const register = <C extends InvokeChannel>(channel: C): void => {
    handle(channel, handlers[channel], isTrustedSender, registrar)
    count++
  }
  INVOKE_CHANNELS.forEach(register)
  return count
}

/** Registers a listener for every send channel; returns how many were registered */
export function onAll(
  listeners: SendListeners,
  isTrustedSender: SenderCheck,
  registrar: Registrar = ipcMain
): number {
  let count = 0
  const register = <C extends SendChannel>(channel: C): void => {
    on(channel, listeners[channel], isTrustedSender, registrar)
    count++
  }
  SEND_CHANNELS.forEach(register)
  return count
}

/** Sends an event to a window */
export function emit<C extends EventChannel>(
  target: Pick<WebContents, 'send'>,
  channel: C,
  ...args: EventArgs<C>
): void {
  target.send(channel, ...args)
}
