// Main registers one handler per invoke channel and one listener per send channel, and each of
// them answers only the app's own page: the window's main frame showing the renderer entry.
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import log from 'electron-log/main'
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { createInvokeHandlers, createSendListeners } from '../../src/main/ipc/handlers'
import type { DialogPort, MainDependencies } from '../../src/main/ipc/handlers'
import {
  createSenderCheck,
  handleAll,
  LOG_CHANNEL,
  onAll,
  routeLogChannel,
  type LogChannelHost,
  type RendererEntry,
  type SenderEvent
} from '../../src/main/ipc/registration'
import { INVOKE_CHANNELS, SEND_CHANNELS } from '../../src/shared/ipc-types'
import { afterAllTests } from '../helpers/after-all-tests'
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
const deps: MainDependencies = {
  dialog: dialog as unknown as DialogPort,
  getWindow: vi.fn<MainDependencies['getWindow']>(),
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
let window: FakeWindow | undefined = appWindow
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
      window = undefined
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

/** The warnings about this request, without the one logged the first time a sender is refused */
function refusals(): unknown[][] {
  return vi
    .mocked(log.warn)
    .mock.calls.filter((call) => !String(call[0]).startsWith('[ipc] Refused requests from '))
}

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
  // How many sender cases the tests below ran, counted once all of them have.
  afterAll(
    afterAllTests(() => {
      console.log(`sender cases ${cases}`)
      return cases > 0 ? [] : ['no sender case ran']
    })
  )

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
        expect(refusals()).toEqual([[`[ipc] refused ${channel}: Access denied: sender`]])
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

        expect({ channel, sender: sender.name, warned: refusals() }).toEqual({
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
    expect(handlers['window-is-maximized'].run).toHaveBeenCalledTimes(1)

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

  it('logs each refused sender address once, without its query, with the page it expected', () => {
    let win = createFakeWindow('https://example.invalid/page?token=synthetic#top')
    const check = createSenderCheck(() => win, { kind: 'file', path: entry })
    const send = (): boolean => check({ senderFrame: win.webContents.mainFrame })
    vi.mocked(log.warn).mockClear()

    expect(send()).toBe(false)
    expect(send()).toBe(false)

    win = createFakeWindow('https://example.invalid/page?token=other')

    expect(send()).toBe(false)

    win = createFakeWindow(pathToFileURL(join(rendererDir, 'other.html')).href)

    expect(send()).toBe(false)
    expect(vi.mocked(log.warn).mock.calls).toEqual([
      [`[ipc] Refused requests from https://example.invalid/page: the app page is ${entry}`],
      [
        `[ipc] Refused requests from ${pathToFileURL(join(rendererDir, 'other.html')).href}: ` +
          `the app page is ${entry}`
      ]
    ])

    cases += 4
  })

  it('refuses a frame without a text address as one whose address cannot be read', () => {
    const isTrusted = createSenderCheck(() => appWindow, { kind: 'file', path: entry })
    vi.mocked(log.warn).mockClear()

    expect(isTrusted({ senderFrame: {} })).toBe(false)
    expect(isTrusted({ senderFrame: { url: 42 } })).toBe(false)
    expect(log.warn).toHaveBeenCalledExactlyOnceWith(
      `[ipc] Refused requests from a frame whose address cannot be read: the app page is ${entry}`
    )
  })
})

type HostListener = (event: SenderEvent, ...args: unknown[]) => unknown

/** A stand-in for `ipcMain` that, like it, refuses a second handler on one channel */
function createLogHost(): {
  host: LogChannelHost
  listeners: Map<string, HostListener[]>
  handlers: Map<string, HostListener>
  sendFrom(frame: FakeFrame | null, ...args: unknown[]): void
} {
  const listeners = new Map<string, HostListener[]>()
  const handlers = new Map<string, HostListener>()
  const host: LogChannelHost = {
    on(channel, listener) {
      listeners.set(channel, [...(listeners.get(channel) ?? []), listener])
    },
    handle(channel, handler) {
      if (handlers.has(channel)) throw new Error(`a second handler for ${channel}`)
      handlers.set(channel, handler)
    },
    listeners: (channel) => [...(listeners.get(channel) ?? [])],
    removeAllListeners(channel) {
      listeners.delete(channel)
    },
    removeHandler(channel) {
      handlers.delete(channel)
    }
  }
  return {
    host,
    listeners,
    handlers,
    sendFrom(frame, ...args) {
      for (const listener of listeners.get(LOG_CHANNEL) ?? [])
        listener({ senderFrame: frame }, ...args)
    }
  }
}

describe("electron-log's channel", () => {
  const frame = appWindow.webContents.mainFrame
  // What electron-log registers on import: a listener writing log lines, and a handler for the
  // options request of the script it loads into pages, which main does not load
  const writeLine = vi.fn()
  const answerOptions = vi.fn(() => ({}))
  const routed = (): ReturnType<typeof createLogHost> => {
    const fake = createLogHost()
    fake.host.on(LOG_CHANNEL, writeLine)
    fake.host.handle(LOG_CHANNEL, answerOptions)
    routeLogChannel(isTrustedSender, fake.host)
    return fake
  }
  const line = (fields: Record<string, unknown> = {}): Record<string, unknown> => ({
    data: ['a synthetic line'],
    date: '2026-01-01T00:00:00.000Z',
    level: 'info',
    logId: 'default',
    variables: { processType: 'renderer' },
    ...fields
  })
  const cyclic: Record<string, unknown> = {}
  cyclic.self = cyclic

  beforeEach(() => {
    writeLine.mockClear()
    answerOptions.mockClear()
    vi.mocked(log.error).mockClear()
  })

  it('registers a checked listener in place of the unchecked one, and no handler', () => {
    const fake = routed()
    handleAll(handlers, isTrustedSender, fake.host)
    onAll(listeners, isTrustedSender, fake.host)

    // The page asks main nothing on this channel, so electron-log's handler is only taken off
    expect([...fake.handlers.keys()].sort()).toEqual([...INVOKE_CHANNELS].sort())
    expect([...fake.listeners.keys()].sort()).toEqual([...SEND_CHANNELS, LOG_CHANNEL].sort())
    expect(fake.listeners.get(LOG_CHANNEL)).toHaveLength(1)
    expect(fake.listeners.get(LOG_CHANNEL)).not.toContain(writeLine)
    expect(vi.mocked(log.error)).not.toHaveBeenCalled()
  })

  it('refuses log lines from any sender but the app page', () => {
    const fake = routed()
    for (const sender of untrusted) {
      window = appWindow
      vi.mocked(log.warn).mockClear()
      fake.sendFrom(sender.frame(), line())

      expect({ sender: sender.name, warned: refusals() }).toEqual({
        sender: sender.name,
        warned: [[`[ipc] refused ${LOG_CHANNEL}: Access denied: sender`]]
      })
    }

    expect(writeLine).not.toHaveBeenCalled()
  })

  const refusedLines: { name: string; args: unknown[] }[] = [
    { name: 'a __proto__ logger with a scope', args: [line({ logId: '__proto__', scope: 'x' })] },
    { name: 'a constructor logger', args: [line({ logId: 'constructor', scope: 'x' })] },
    { name: 'a prototype logger', args: [line({ logId: 'prototype' })] },
    { name: 'a toString logger', args: [line({ logId: 'toString', scope: 'x' })] },
    { name: 'a __proto__ scope', args: [line({ scope: '__proto__' })] },
    { name: 'a numeric logger', args: [line({ logId: 1 })] },
    { name: 'an overlong scope', args: [line({ scope: 's'.repeat(65) })] },
    { name: 'an overlong logger name', args: [line({ logId: 'l'.repeat(65) })] },
    { name: 'data that is not a list', args: [line({ data: 'x' })] },
    { name: 'too many values', args: [line({ data: Array.from({ length: 101 }, () => 0) })] },
    { name: 'an overlong line', args: [line({ data: ['x'.repeat(256 * 1024)] })] },
    { name: 'a cyclic value', args: [line({ data: [cyclic] })] },
    { name: 'an error report command', args: [line({ cmd: 'errorHandler', showDialog: true })] },
    { name: 'a list', args: [['x']] },
    {
      name: 'a class instance',
      args: [
        new (class Line {
          data = ['x']
        })()
      ]
    },
    { name: 'a text', args: ['x'] },
    { name: 'nothing', args: [] },
    { name: 'two lines', args: [line(), line()] }
  ]

  it.each(refusedLines)('drops $name without throwing', ({ args }) => {
    const fake = routed()
    vi.mocked(log.warn).mockClear()

    expect(() => fake.sendFrom(frame, ...args)).not.toThrow()
    expect(writeLine).not.toHaveBeenCalled()
    expect(refusals()).toEqual([
      [`[ipc] refused ${LOG_CHANNEL}: Invalid arguments: ${LOG_CHANNEL}`]
    ])
  })

  it("passes the app page's log line on to electron-log unchanged", () => {
    const fake = routed()
    vi.mocked(log.warn).mockClear()
    const scoped = line({ scope: 'store', data: ['a synthetic line', { nested: [1, 2] }] })
    const bare = Object.assign(Object.create(null) as Record<string, unknown>, line())
    fake.sendFrom(frame, scoped)
    fake.sendFrom(frame, bare)

    expect(writeLine.mock.calls).toEqual([
      [{ senderFrame: frame }, scoped],
      [{ senderFrame: frame }, bare]
    ])
    expect(writeLine.mock.calls[0][1]).toBe(scoped)
    expect(vi.mocked(log.warn)).not.toHaveBeenCalled()
  })

  it('says so when electron-log registered no listener to write the lines', () => {
    const fake = createLogHost()
    routeLogChannel(isTrustedSender, fake.host)

    expect(vi.mocked(log.error).mock.calls).toEqual([
      [`[ipc] electron-log has no listener on ${LOG_CHANNEL}: page log lines are lost`]
    ])
  })
})
