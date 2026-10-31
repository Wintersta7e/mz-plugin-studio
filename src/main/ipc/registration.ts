// The one place main registers IPC: every request passes its channel's argument check and access
// class before its handler runs, and every refusal is logged once without the request's content.
import { ipcMain, type WebContents } from 'electron'
import log from 'electron-log/main'
import { authorize, type AccessClass } from '../file-access'
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
  registrar: Registrar = ipcMain
): void {
  registrar.handle(channel, async (_event, ...raw) => {
    const args = admit(channel, () => {
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
  registrar: Registrar = ipcMain
): void {
  registrar.on(channel, (_event, ...raw) => {
    listener.run(...listener.check(raw))
  })
}

/** Registers a handler for every invoke channel; returns how many were registered */
export function handleAll(handlers: InvokeHandlers, registrar: Registrar = ipcMain): number {
  let count = 0
  const register = <C extends InvokeChannel>(channel: C): void => {
    handle(channel, handlers[channel], registrar)
    count++
  }
  INVOKE_CHANNELS.forEach(register)
  return count
}

/** Registers a listener for every send channel; returns how many were registered */
export function onAll(listeners: SendListeners, registrar: Registrar = ipcMain): number {
  let count = 0
  const register = <C extends SendChannel>(channel: C): void => {
    on(channel, listeners[channel], registrar)
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
