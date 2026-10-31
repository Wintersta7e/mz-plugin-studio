// Main registers one handler per invoke channel and one listener per send channel, and each of
// them answers only the app's own page: the window's main frame showing the renderer entry.
import { join, resolve } from 'path'
import { pathToFileURL } from 'url'
import log from 'electron-log/main'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createInvokeHandlers, createSendListeners } from '../../src/main/ipc/handlers'
import type { DialogPort, MainDeps } from '../../src/main/ipc/handlers'
import {
  createSenderCheck,
  handleAll,
  onAll,
  type RendererEntry
} from '../../src/main/ipc/registration'
import { INVOKE_CHANNELS, SEND_CHANNELS } from '../../src/shared/ipc-types'
import { createFakeRegistrar, createFakeWindow, type FakeFrame } from '../helpers/fake-ipc'

vi.mock('electron', () => ({ ipcMain: {} }))

type FakeWindow = ReturnType<typeof createFakeWindow>

const rendererDir = resolve('/Synthetic_App/resources/out/renderer')
const entry = join(rendererDir, 'index.html')
const entryUrl = pathToFileURL(entry).href

const dialog = {
  showOpenDialog: vi.fn(),
  showSaveDialog: vi.fn(),
  showMessageBox: vi.fn()
}
const deps: MainDeps = {
  dialog: dialog as unknown as DialogPort,
  getWindow: vi.fn(() => null),
  openLogFolder: vi.fn(async () => {}),
  setLogLevel: vi.fn()
}
const handlers = createInvokeHandlers(deps)
const listeners = createSendListeners(deps)
/** Everything a request reaches once it is admitted */
const bodies = [
  ...INVOKE_CHANNELS.flatMap((c) => [vi.spyOn(handlers[c], 'check'), vi.spyOn(handlers[c], 'run')]),
  ...SEND_CHANNELS.flatMap((c) => [vi.spyOn(listeners[c], 'check'), vi.spyOn(listeners[c], 'run')]),
  dialog.showOpenDialog,
  dialog.showSaveDialog,
  dialog.showMessageBox,
  vi.mocked(deps.getWindow),
  vi.mocked(deps.openLogFolder),
  vi.mocked(deps.setLogLevel)
]

const appWindow = createFakeWindow(entryUrl)
let window: FakeWindow | null = appWindow
const ipc = createFakeRegistrar(appWindow.webContents.mainFrame)
const isTrustedSender = createSenderCheck(() => window, { kind: 'file', path: entry })
const invokeCount = handleAll(handlers, isTrustedSender, ipc.registrar)
const sendCount = onAll(listeners, isTrustedSender, ipc.registrar)

/** Senders other than the app's page: each sets up the window and returns the sending frame */
const untrusted: { name: string; frame: () => FakeFrame | null }[] = [
  { name: 'no frame', frame: () => null },
  { name: 'a frame other than the main frame', frame: () => ({ url: entryUrl }) },
  {
    name: 'no window',
    frame: () => {
      window = null
      return appWindow.webContents.mainFrame
    }
  },
  {
    name: 'the main frame at another file',
    frame: () => {
      window = createFakeWindow(pathToFileURL(join(rendererDir, 'other.html')).href)
      return window.webContents.mainFrame
    }
  },
  {
    name: 'the main frame at a web page',
    frame: () => {
      window = createFakeWindow('https://example.invalid/')
      return window.webContents.mainFrame
    }
  },
  {
    name: 'the main frame whose address cannot be read',
    frame: () => {
      const frame = {
        get url(): string {
          throw new Error('frame is gone')
        }
      }
      window = { webContents: { mainFrame: frame } }
      return frame
    }
  }
]

let cases = 0

beforeEach(() => {
  window = appWindow
  vi.mocked(log.warn).mockClear()
  for (const spy of bodies) spy.mockClear()
})

function reached(): number {
  return bodies.reduce((sum, spy) => sum + spy.mock.calls.length, 0)
}

/** Whether a check for `entry` admits the main frame of a window showing `url` */
function admits(target: RendererEntry, url: string, platform?: NodeJS.Platform): boolean {
  const win = createFakeWindow(url)
  const check = createSenderCheck(() => win, target, platform)
  cases++
  return check({ senderFrame: win.webContents.mainFrame })
}

describe('ipc registration', () => {
  it('registers one handler per invoke channel and one listener per send channel', () => {
    console.log(
      `handle registrations ${ipc.handled.length}/${INVOKE_CHANNELS.length}, ` +
        `on registrations ${ipc.listened.length}/${SEND_CHANNELS.length}`
    )
    expect(INVOKE_CHANNELS.length).toBeGreaterThan(0)
    expect(SEND_CHANNELS.length).toBeGreaterThan(0)
    expect(ipc.handled).toEqual([...INVOKE_CHANNELS])
    expect(ipc.listened).toEqual([...SEND_CHANNELS])
    expect([invokeCount, sendCount]).toEqual([INVOKE_CHANNELS.length, SEND_CHANNELS.length])
  })

  it('refuses a request on every invoke channel from any sender but the app page', async () => {
    for (const channel of INVOKE_CHANNELS) {
      for (const sender of untrusted) {
        window = appWindow
        vi.mocked(log.warn).mockClear()
        const frame = sender.frame()
        const result = await ipc.invokeFrom(frame, channel).then(
          () => 'answered',
          (error: Error) => error.message
        )
        expect({ channel, sender: sender.name, result }).toEqual({
          channel,
          sender: sender.name,
          result: 'Access denied: sender'
        })
        expect(vi.mocked(log.warn).mock.calls).toEqual([
          [`[ipc] refused ${channel}: Access denied: sender`]
        ])
        expect({ channel, sender: sender.name, reached: reached() }).toEqual({
          channel,
          sender: sender.name,
          reached: 0
        })
        cases++
      }
    }
  })

  it('drops a message on every send channel from any sender but the app page', () => {
    for (const channel of SEND_CHANNELS) {
      for (const sender of untrusted) {
        window = appWindow
        vi.mocked(log.warn).mockClear()
        ipc.sendFrom(sender.frame(), channel, true)
        expect({ channel, sender: sender.name, warned: vi.mocked(log.warn).mock.calls }).toEqual({
          channel,
          sender: sender.name,
          warned: [[`[ipc] Dropped ${channel}: sender is not the app page`]]
        })
        expect({ channel, sender: sender.name, reached: reached() }).toEqual({
          channel,
          sender: sender.name,
          reached: 0
        })
        cases++
      }
    }
  })

  it('answers the app page', async () => {
    await expect(ipc.invoke('window-is-maximized')).resolves.toBe(false)
    expect(handlers['window-is-maximized'].run).toHaveBeenCalledOnce()
    ipc.send('log:set-level', true)
    expect(deps.setLogLevel).toHaveBeenCalledWith('debug')
    expect(vi.mocked(log.warn)).not.toHaveBeenCalled()
    cases += 2
  })

  it('admits the renderer entry file however its directory is spelled', () => {
    const spaced = resolve('/Synthetic App/Fixture é/renderer/index.html')
    expect(admits({ kind: 'file', path: spaced }, pathToFileURL(spaced).href)).toBe(true)
    expect(admits({ kind: 'file', path: entry }, entryUrl)).toBe(true)
    expect(admits({ kind: 'file', path: entry }, `${entryUrl}?x=1#top`)).toBe(true)
    expect(admits({ kind: 'file', path: spaced }, entryUrl)).toBe(false)
    expect(admits({ kind: 'file', path: entry }, `https://example.invalid${entry}`)).toBe(false)
    expect(admits({ kind: 'file', path: entry }, 'not a url')).toBe(false)
  })

  it('compares a win32 entry case-insensitively', () => {
    const win32: RendererEntry = {
      kind: 'file',
      path: 'C:\\Games\\Synthetic App\\resources\\app.asar\\out\\renderer\\index.html'
    }
    const at = (file: string): string =>
      `file:///C:/Games/Synthetic%20App/resources/app.asar/out/renderer/${file}`
    expect(admits(win32, at('index.html'), 'win32')).toBe(true)
    expect(admits(win32, at('index.html').toLowerCase(), 'win32')).toBe(true)
    expect(admits(win32, at('other.html'), 'win32')).toBe(false)
    expect(admits(win32, 'file://server/share/index.html', 'win32')).toBe(false)
  })

  it('admits only the dev server origin in development', () => {
    const dev: RendererEntry = { kind: 'dev-server', origin: 'http://localhost:5173' }
    expect(admits(dev, 'http://localhost:5173/src/x')).toBe(true)
    expect(admits(dev, 'http://localhost:5173/')).toBe(true)
    expect(admits(dev, 'http://localhost:5174/')).toBe(false)
    expect(admits(dev, 'https://localhost:5173/')).toBe(false)
    expect(admits(dev, entryUrl)).toBe(false)
  })

  it('counts its sender cases', () => {
    console.log(`sender cases ${cases}`)
    expect(cases).toBeGreaterThan(0)
  })
})
