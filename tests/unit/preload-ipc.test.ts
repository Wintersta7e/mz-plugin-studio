// The preload's IPC helpers forward to Electron's renderer IPC unchanged, and the preload entry
// exposes the window API once and the page logger's bridge to main, asking main nothing as it loads.
import { describe, it, expect, vi } from 'vitest'

type Listener = (event: unknown, ...args: unknown[]) => void

const electron = vi.hoisted(() => ({
  ipcRenderer: {
    invoke: vi.fn<(channel: string, ...args: unknown[]) => Promise<unknown>>(),
    send: vi.fn<(channel: string, ...args: unknown[]) => void>(),
    sendSync: vi.fn<(channel: string, ...args: unknown[]) => unknown>(),
    on: vi.fn<(channel: string, listener: Listener) => void>(),
    removeListener: vi.fn<(channel: string, listener: Listener) => void>()
  },
  contextBridge: { exposeInMainWorld: vi.fn<(key: string, value: unknown) => void>() }
}))

vi.mock<Record<'contextBridge' | 'ipcRenderer', unknown>>(import('electron'), () => electron)

import { invoke, send, subscribe } from '../../src/preload/ipc'

/**
Loads the preload entry afresh and returns what it exposed, by name
*/
async function loadPreload(): Promise<Map<string, unknown>> {
  vi.resetModules()
  vi.clearAllMocks()
  await import('../../src/preload/index')
  return new Map(electron.contextBridge.exposeInMainWorld.mock.calls)
}

/**
Calls a value's method by name with the arguments; undefined when it has no such method.
*/
function callMember(value: unknown, key: string, ...args: unknown[]): unknown {
  const method: unknown =
    typeof value === 'object' && value !== null ? Reflect.get(value, key) : undefined
  return typeof method === 'function' ? Reflect.apply(method, value, args) : undefined
}

describe('preload ipc', () => {
  it('invoke forwards the channel and arguments and resolves to the reply', async () => {
    expect.assertions(2)

    const files = ['Synthetic_Plugin.js']
    electron.ipcRenderer.invoke.mockResolvedValueOnce(files)

    await expect(invoke('plugin:list', '/p')).resolves.toBe(files)
    expect(electron.ipcRenderer.invoke).toHaveBeenCalledWith('plugin:list', '/p')
  })

  it('send forwards the channel and arguments', () => {
    send('log:set-level', true)

    expect(electron.ipcRenderer.send).toHaveBeenCalledWith('log:set-level', true)
  })

  it('subscribe passes the arguments without the event and removes the same listener', () => {
    const callback = vi.fn<(isMaximized: boolean) => void>()
    const unsubscribe = subscribe('window-maximized-changed', callback)

    expect(electron.ipcRenderer.on).toHaveBeenCalledTimes(1)

    const [channel, listener] = electron.ipcRenderer.on.mock.calls.at(0) ?? []

    expect(channel).toBe('window-maximized-changed')

    listener?.({ sender: 'event' }, true)

    expect(callback).toHaveBeenCalledWith(true)

    unsubscribe()

    expect(electron.ipcRenderer.removeListener).toHaveBeenCalledWith(
      'window-maximized-changed',
      listener
    )
  })

  it('exposes the window API and the log bridge once each', async () => {
    expect.assertions(2)

    const exposed = await loadPreload()

    expect(electron.contextBridge.exposeInMainWorld).toHaveBeenCalledTimes(2)
    expect(exposed.keys().toArray()).toStrictEqual(['api', '__electronLog'])
  })

  it('asks main nothing while it loads', async () => {
    expect.assertions(3)

    await loadPreload()

    expect(electron.ipcRenderer.invoke).not.toHaveBeenCalled()
    expect(electron.ipcRenderer.send).not.toHaveBeenCalled()
    expect(electron.ipcRenderer.sendSync).not.toHaveBeenCalled()
  })

  it("sends each of the page logger's lines to main once, unchanged", async () => {
    expect.assertions(1)

    const exposed = await loadPreload()
    const line = { data: ['a synthetic line'], level: 'info', logId: 'default' }

    callMember(exposed.get('__electronLog'), 'sendToMain', line)

    expect(electron.ipcRenderer.send.mock.calls).toStrictEqual([['__ELECTRON_LOG__', line]])
  })

  it("passes main's log lines to the page logger as electron-log's page script did", async () => {
    expect.assertions(2)

    await loadPreload()
    const postMessage = vi.fn<(message: unknown) => void>()
    vi.stubGlobal('window', { postMessage })
    try {
      const [channel, listener] = electron.ipcRenderer.on.mock.calls.at(0) ?? []

      expect(channel).toBe('__ELECTRON_LOG_IPC__')

      listener?.({ sender: 'event' }, { data: ['a synthetic line'], level: 'warn' })

      expect(postMessage.mock.calls).toStrictEqual([
        [{ cmd: 'message', data: ['a synthetic line'], level: 'warn' }]
      ])
    } finally {
      vi.unstubAllGlobals()
    }
  })
})
