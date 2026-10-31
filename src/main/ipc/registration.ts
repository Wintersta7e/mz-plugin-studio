// The one place main registers IPC, electron-log's `__ELECTRON_LOG__` channel included: every
// request must come from the app's own page and pass its channel's argument check (for a contract
// channel, also its access class) before its handler runs, and every refusal is logged once
// without the request's content.
import { fileURLToPath } from 'url'
import { ipcMain, type WebContents } from 'electron'
import log from 'electron-log/main'
import { authorize, type AccessClass } from '../file-access'
import { samePath } from './plugin'
import {
  INVOKE_CHANNELS,
  LOG_CHANNEL,
  SEND_CHANNELS,
  accessDenied,
  type EventArgs,
  type EventChannel,
  type InvokeArgs,
  type InvokeChannel,
  type InvokeResult,
  type SendArgs,
  type SendChannel
} from '../../shared/ipc-types'

import { invalidArguments } from './arguments'

export { invalidArguments } from './arguments'
export { LOG_CHANNEL } from '../../shared/ipc-types'

/** Longest logger name or scope a log line may carry; a scope pads every later line to its length */
const MAX_LOG_NAME = 64
/** Most values one log line may carry */
const MAX_LOG_VALUES = 100
/** Longest log line, measured as JSON */
const MAX_LOG_LENGTH = 256 * 1024

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

/** How many distinct refused senders a check logs; a page cycling addresses cannot flood the log */
const MAX_LOGGED_SENDERS = 20

/**
 * Trusts only the main frame of the window `getWindow` returns, showing `entry`. A file entry is
 * compared by its decoded path, so any percent-encoding of the same file matches. Each refused
 * sender is logged once with the page expected, so the log shows why the app answers nothing.
 */
export function createSenderCheck(
  getWindow: () => { webContents: { mainFrame: unknown } } | null,
  entry: RendererEntry,
  platform: NodeJS.Platform = process.platform
): SenderCheck {
  const expected = entry.kind === 'file' ? entry.path : entry.origin
  const logged = new Set<string>()
  const refuse = (sender: string): false => {
    if (!logged.has(sender) && logged.size < MAX_LOGGED_SENDERS) {
      logged.add(sender)
      log.warn(`[ipc] Refused requests from ${sender}: the app page is ${expected}`)
    }
    return false
  }
  return (event) => {
    let sender = 'a frame whose address cannot be read'
    try {
      const frame = event.senderFrame
      if (frame === null) return refuse('no frame')
      const url = new URL((frame as { url: string }).url)
      // The address without its query or fragment, which may hold anything the page put there
      sender = `${url.protocol}//${url.host}${url.pathname}`
      if (frame !== getWindow()?.webContents.mainFrame) {
        return refuse(`a frame other than the main frame at ${sender}`)
      }
      if (entry.kind === 'dev-server') return url.origin === entry.origin || refuse(sender)
      if (url.protocol !== 'file:') return refuse(sender)
      const file = fileURLToPath(url, { windows: platform === 'win32' })
      return samePath(file, entry.path, platform) || refuse(sender)
    } catch {
      return refuse(sender)
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
      if (!isTrustedSender(event)) throw accessDenied('sender')
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

/** The part of `ipcMain` that holds electron-log's own registration on its channel */
export interface LogChannelHost extends Registrar {
  listeners(channel: string): unknown[]
  removeAllListeners(channel: string): unknown
  removeHandler(channel: string): void
}

type LogListener = (event: SenderEvent, message: unknown) => void

/** The fields of a log line the checks read */
interface LogFields {
  logId?: unknown
  scope?: unknown
  data?: unknown
}

function isPlainObject(value: unknown): value is LogFields {
  if (typeof value !== 'object' || value === null) return false
  const proto: unknown = Object.getPrototypeOf(value)
  return proto === Object.prototype || proto === null
}

/**
 * A logger name or scope: absent, or a short string naming no property every object has.
 * electron-log looks loggers up by name in a plain object, so `__proto__` or `toString` would
 * reach an object's own machinery and throw in main.
 */
function isLogName(value: unknown): boolean {
  return (
    value === undefined ||
    (typeof value === 'string' &&
      value.length <= MAX_LOG_NAME &&
      !(value in Object.prototype) &&
      value !== 'prototype')
  )
}

/** The length of `value` as JSON, or Infinity when it has none (a cycle, a BigInt) */
function jsonLength(value: unknown): number {
  try {
    return JSON.stringify(value).length
  } catch {
    return Infinity
  }
}

/** Throws `invalidArguments` unless `raw` is one log line as electron-log's page logger sends it */
function checkLogLine(raw: readonly unknown[]): void {
  const [line] = raw
  if (
    raw.length !== 1 ||
    !isPlainObject(line) ||
    // A command asks main to report an error, possibly in a dialog; only log lines are taken
    'cmd' in line ||
    !isLogName(line.logId) ||
    !isLogName(line.scope) ||
    !Array.isArray(line.data) ||
    line.data.length > MAX_LOG_VALUES ||
    jsonLength(line) > MAX_LOG_LENGTH
  ) {
    throw invalidArguments(LOG_CHANNEL)
  }
}

/**
 * Puts electron-log's channel behind the sender check: takes off the listener and handler
 * electron-log registers when it loads and registers a checked listener in their place. An
 * admitted log line goes on to electron-log's own listener, which writes it as before. No handler
 * takes the old one's place: only the script electron-log loads into pages asked it anything, and
 * main does not load that script.
 */
export function routeLogChannel(
  isTrustedSender: SenderCheck,
  host: LogChannelHost = ipcMain
): void {
  const forward = host.listeners(LOG_CHANNEL) as LogListener[]
  if (forward.length === 0) {
    log.error(`[ipc] electron-log has no listener on ${LOG_CHANNEL}: page log lines are lost`)
  }
  host.removeAllListeners(LOG_CHANNEL)
  host.removeHandler(LOG_CHANNEL)
  host.on(LOG_CHANNEL, (event, ...raw) => {
    try {
      admit(LOG_CHANNEL, () => {
        if (!isTrustedSender(event)) throw accessDenied('sender')
        checkLogLine(raw)
      })
    } catch {
      // Already logged; a throw from a listener would be an uncaught exception in main
      return
    }
    for (const listener of forward) listener(event, raw[0])
  })
}

/** Sends an event to a window */
export function emit<C extends EventChannel>(
  target: Pick<WebContents, 'send'>,
  channel: C,
  ...args: EventArgs<C>
): void {
  target.send(channel, ...args)
}
