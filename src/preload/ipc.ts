// The preload's only use of Electron's renderer IPC: each helper is typed by the channel's
// entry in the contract, so a call with the wrong arguments does not compile.
import { ipcRenderer, type IpcRendererEvent } from 'electron'
import type {
  EventArgs,
  EventChannel,
  InvokeArgs,
  InvokeChannel,
  InvokeResult,
  SendArgs,
  SendChannel
} from '../shared/ipc-types'

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
