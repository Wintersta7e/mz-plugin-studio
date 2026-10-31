// The preload's IPC helpers forward to Electron's renderer IPC unchanged, and the preload entry
// exposes the window API once and the page logger's bridge to main, asking main nothing as it loads.
import { describe, it, expect, vi } from 'vitest'

const electron = vi.hoisted(() => ({
  ipcRenderer: {
    invoke: vi.fn(),
    send: vi.fn(),
    sendSync: vi.fn(),
    on: vi.fn(),
    removeListener: vi.fn()
  },
  contextBridge: { exposeInMainWorld: vi.fn() }
}))

vi.mock('electron', () => electron)

import { invoke, send, subscribe } from '../../src/preload/ipc'

/** Loads the preload entry afresh and returns what it exposed, by name */
async function loadPreload(): Promise<Map<string, unknown>> {
  vi.resetModules()
  vi.clearAllMocks()
  await import('../../src/preload/index')
  return new Map(
    electron.contextBridge.exposeInMainWorld.mock.calls.map(
      ([key, value]) => [key, value] as [string, unknown]
    )
  )
}

describe('preload ipc', () => {
  it('invoke forwards the channel and arguments and returns the reply', () => {
    const reply = Promise.resolve(['Synthetic_Plugin.js'])
    electron.ipcRenderer.invoke.mockReturnValueOnce(reply)

    expect(invoke('plugin:list', '/p')).toBe(reply)
    expect(electron.ipcRenderer.invoke).toHaveBeenCalledWith('plugin:list', '/p')
  })

  it('send forwards the channel and arguments', () => {
    send('log:set-level', true)
    expect(electron.ipcRenderer.send).toHaveBeenCalledWith('log:set-level', true)
  })

  it('subscribe passes the arguments without the event and removes the same listener', () => {
    const callback = vi.fn()
    const unsubscribe = subscribe('window-maximized-changed', callback)

    expect(electron.ipcRenderer.on).toHaveBeenCalledTimes(1)
    const [channel, listener] = electron.ipcRenderer.on.mock.calls[0]
    expect(channel).toBe('window-maximized-changed')
    listener({ sender: 'event' }, true)
    expect(callback).toHaveBeenCalledWith(true)

    unsubscribe()
    expect(electron.ipcRenderer.removeListener).toHaveBeenCalledWith(
      'window-maximized-changed',
      listener
    )
  })

  it('exposes the window API and the log bridge once each', async () => {
    const exposed = await loadPreload()

    expect(electron.contextBridge.exposeInMainWorld).toHaveBeenCalledTimes(2)
    expect([...exposed.keys()]).toEqual(['api', '__electronLog'])
  })

  it('asks main nothing while it loads', async () => {
    await loadPreload()

    expect(electron.ipcRenderer.invoke).not.toHaveBeenCalled()
    expect(electron.ipcRenderer.send).not.toHaveBeenCalled()
    expect(electron.ipcRenderer.sendSync).not.toHaveBeenCalled()
  })

  it("sends each of the page logger's lines to main once, unchanged", async () => {
    const bridge = (await loadPreload()).get('__electronLog') as {
      sendToMain(message: unknown): void
    }
    const line = { data: ['a synthetic line'], level: 'info', logId: 'default' }

    bridge.sendToMain(line)
    expect(electron.ipcRenderer.send.mock.calls).toEqual([['__ELECTRON_LOG__', line]])
  })

  it("passes main's log lines to the page logger as electron-log's page script did", async () => {
    await loadPreload()
    const postMessage = vi.fn()
    vi.stubGlobal('window', { postMessage })
    try {
      const [[channel, listener]] = electron.ipcRenderer.on.mock.calls
      expect(channel).toBe('__ELECTRON_LOG_IPC__')
      listener({ sender: 'event' }, { data: ['a synthetic line'], level: 'warn' })
      expect(postMessage.mock.calls).toEqual([
        [{ cmd: 'message', data: ['a synthetic line'], level: 'warn' }]
      ])
    } finally {
      vi.unstubAllGlobals()
    }
  })
})
