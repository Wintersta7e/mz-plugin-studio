// The preload's three IPC helpers forward to Electron's renderer IPC unchanged, and the preload
// entry exposes the window API once.
import { describe, it, expect, vi } from 'vitest'

const electron = vi.hoisted(() => ({
  ipcRenderer: {
    invoke: vi.fn(),
    send: vi.fn(),
    on: vi.fn(),
    removeListener: vi.fn()
  },
  contextBridge: { exposeInMainWorld: vi.fn() }
}))

vi.mock('electron', () => electron)

import { invoke, send, subscribe } from '../../src/preload/ipc'

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

  it('exposes the window API once as api', async () => {
    vi.resetModules()
    electron.contextBridge.exposeInMainWorld.mockClear()
    await import('../../src/preload/index')

    expect(electron.contextBridge.exposeInMainWorld).toHaveBeenCalledTimes(1)
    expect(electron.contextBridge.exposeInMainWorld.mock.calls[0][0]).toBe('api')
  })
})
