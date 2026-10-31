// The preload's only use of Electron's renderer IPC: each helper is typed by the channel's
// entry in the contract, so a call with the wrong arguments does not compile. The log helpers
// carry electron-log's lines, which main checks on arrival.
import { ipcRenderer, type IpcRendererEvent } from 'electron'
import {
  LOG_CHANNEL,
  MAIN_LOG_CHANNEL,
  type EventArgs,
  type EventChannel,
  type InvokeArgs,
  type InvokeChannel,
  type InvokeResult,
  type SendArgs,
  type SendChannel
} from '../shared/ipc-types'

/** A log line as electron-log passes it between the page and main */
export type LogLine = Record<string, unknown>

/** Sends one of the page logger's lines to main */
export function sendLogLine(line: LogLine): void {
  ipcRenderer.send(LOG_CHANNEL, line)
}

/** Calls `callback` with each of its own log lines main sends the page */
export function onMainLogLine(callback: (line: LogLine) => void): void {
  ipcRenderer.on(MAIN_LOG_CHANNEL, (_event: IpcRendererEvent, line: LogLine) => callback(line))
}

export function invoke<C extends InvokeChannel>(
  channel: C,
  ...args: InvokeArgs<C>
): Promise<InvokeResult<C>> {
  return ipcRenderer.invoke(channel, ...args)
}

export function send<C extends SendChannel>(channel: C, ...args: SendArgs<C>): void {
  ipcRenderer.send(channel, ...args)
}

/** Calls `callback` with each event's arguments; the returned function stops it */
export function subscribe<C extends EventChannel>(
  channel: C,
  callback: (...args: EventArgs<C>) => void
): () => void {
  const listener = (_event: IpcRendererEvent, ...args: unknown[]): void =>
    callback(...(args as EventArgs<C>))
  ipcRenderer.on(channel, listener)
  return () => {
    ipcRenderer.removeListener(channel, listener)
  }
}
