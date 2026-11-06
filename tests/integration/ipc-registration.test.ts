// Main registers one handler per invoke channel and one listener per send channel, and each of
// them answers only the app's own page: the window's main frame showing the renderer entry.
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import type { MessageBoxReturnValue, OpenDialogReturnValue, SaveDialogReturnValue } from 'electron'
import log from 'electron-log/main'
import { afterAll, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest'
import {
  createInvokeHandlers,
  createSendListeners,
  type MainDependencies
} from '../../src/main/ipc/handlers'
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

vi.mock<{ ipcMain: object }>(import('electron'), () => ({ ipcMain: {} }))

type FakeWindow = ReturnType<typeof createFakeWindow>

const rendererDirectory = path.resolve('/Synthetic_App/resources/out/renderer')
const entry = path.join(rendererDirectory, 'index.html')
const entryUrl = pathToFileURL(entry).href

const showOpenDialog = vi.fn<(...args: unknown[]) => Promise<OpenDialogReturnValue>>()
const showSaveDialog = vi.fn<(...args: unknown[]) => Promise<SaveDialogReturnValue>>()
const showMessageBox = vi.fn<(...args: unknown[]) => Promise<MessageBoxReturnValue>>()
const getWindow = vi.fn<MainDependencies['getWindow']>()
const openLogFolder = vi.fn<MainDependencies['openLogFolder']>().mockResolvedValue()
const setLogLevel = vi.fn<MainDependencies['setLogLevel']>()
const dependencies: MainDependencies = {
  dialog: { showOpenDialog, showSaveDialog, showMessageBox },
  getWindow,
  openLogFolder,
  setLogLevel
}
const handlers = createInvokeHandlers(dependencies)
const listeners = createSendListeners(dependencies)
/**
Everything a request reaches once it is admitted
*/
const bodies = [
  ...INVOKE_CHANNELS.flatMap((c) => [vi.spyOn(handlers[c], 'check'), vi.spyOn(handlers[c], 'run')]),
  ...SEND_CHANNELS.flatMap((c) => [vi.spyOn(listeners[c], 'check'), vi.spyOn(listeners[c], 'run')]),
  showOpenDialog,
  showSaveDialog,
  showMessageBox,
  getWindow,
  openLogFolder,
  setLogLevel
]
const warn: MockInstance<(...params: unknown[]) => void> = vi.mocked(log.warn)
const logError: MockInstance<(...params: unknown[]) => void> = vi.mocked(log.error)

const appWindow = createFakeWindow(entryUrl)
/**
The window the sender check reads; each test starts at the app's window
*/
const shown: { window: FakeWindow | undefined } = { window: appWindow }
const ipc = createFakeRegistrar(appWindow.webContents.mainFrame)
const isTrustedSender = createSenderCheck(() => shown.window, { kind: 'file', path: entry })
const invokeCount = handleAll(handlers, isTrustedSender, ipc.registrar)
const sendCount = onAll(listeners, isTrustedSender, ipc.registrar)

/**
Senders other than the app's page: each sets up the window and returns the sending frame
*/
const untrusted: { name: string; frame: () => FakeFrame | null }[] = [
  { name: 'no frame', frame: () => null },
  { name: 'a frame other than the main frame', frame: () => ({ url: entryUrl }) },
  {
    name: 'no window',
    frame: () => {
      shown.window = undefined
      return appWindow.webContents.mainFrame
    }
  },
  {
    name: 'the main frame at another file',
    frame: () => {
      const window = createFakeWindow(
        pathToFileURL(path.join(rendererDirectory, 'other.html')).href
      )
      shown.window = window
      return window.webContents.mainFrame
    }
  },
  {
    name: 'the main frame at a web page',
    frame: () => {
      const window = createFakeWindow('https://example.invalid/')
      shown.window = window
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
      shown.window = { webContents: { mainFrame: frame } }
      return frame
    }
  }
]

function resetSender(): void {
  shown.window = appWindow
  warn.mockClear()
  for (const spy of bodies) spy.mockClear()
}

/**
The warnings about this request, without the one logged the first time a sender is refused
*/
function refusals(): unknown[][] {
  return warn.mock.calls.filter(
    (call) => !String(call[0]).startsWith('[ipc] Refused requests from ')
  )
}

function reached(): number {
  return bodies.reduce((sum, spy) => sum + spy.mock.calls.length, 0)
}

/**
How the request ended: `answered`, or the message it was refused with
*/
async function outcome(frame: FakeFrame | null, channel: string): Promise<string> {
  try {
    await ipc.invokeFrom(frame, channel)
    return 'answered'
  } catch (error) {
    return error instanceof Error ? error.message : String(error)
  }
}

// Describe blocks run in shuffled order: the count prints once the last of them ends
const counted = { cases: 0, describes: 0 }
const DESCRIBES = 2

/**
How many sender cases the tests ran, once every describe below has run, and that some ran
*/
function caseProblems(): string[] {
  counted.describes += 1
  if (counted.describes < DESCRIBES) return []
  process.stdout.write(`sender cases ${String(counted.cases)}\n`)
  return counted.cases > 0 ? [] : ['no sender case ran']
}

/**
Whether a check for `entry` admits the main frame of a window showing `url`
*/
function isAdmitted(target: RendererEntry, url: string, platform?: NodeJS.Platform): boolean {
  const window = createFakeWindow(url)
  const isTrusted = createSenderCheck(() => window, target, platform)
  counted.cases += 1
  return isTrusted({ senderFrame: window.webContents.mainFrame })
}

function win32EntryUrl(file: string): string {
  return `file:///C:/Games/Synthetic%20App/resources/app.asar/out/renderer/${file}`
}

describe('ipc registration: registered channels', () => {
  beforeEach(resetSender)

  afterAll(afterAllTests(caseProblems))

  it('registers one handler per invoke channel and one listener per send channel', () => {
    process.stdout.write(
      `handle registrations ${String(ipc.handled.length)}/${String(INVOKE_CHANNELS.length)}, ` +
        `on registrations ${String(ipc.listened.length)}/${String(SEND_CHANNELS.length)}\n`
    )

    expect(INVOKE_CHANNELS.length).toBeGreaterThan(0)
    expect(SEND_CHANNELS.length).toBeGreaterThan(0)
    expect(ipc.handled).toStrictEqual([...INVOKE_CHANNELS])
    expect(ipc.listened).toStrictEqual([...SEND_CHANNELS])
    expect([invokeCount, sendCount]).toStrictEqual([INVOKE_CHANNELS.length, SEND_CHANNELS.length])
  })

  it('refuses a request on every invoke channel from any sender but the app page', async () => {
    expect.hasAssertions()

    for (const channel of INVOKE_CHANNELS) {
      for (const sender of untrusted) {
        resetSender()
        const result = await outcome(sender.frame(), channel)

        expect({
          channel,
          sender: sender.name,
          result,
          warned: refusals(),
          reached: reached()
        }).toStrictEqual({
          channel,
          sender: sender.name,
          result: 'Access denied: sender',
          warned: [[`[ipc] refused ${channel}: Access denied: sender`]],
          reached: 0
        })

        counted.cases += 1
      }
    }
  })

  it('drops a message on every send channel from any sender but the app page', () => {
    for (const channel of SEND_CHANNELS) {
      for (const sender of untrusted) {
        resetSender()
        ipc.sendFrom(sender.frame(), channel, true)

        expect({
          channel,
          sender: sender.name,
          warned: refusals(),
          reached: reached()
        }).toStrictEqual({
          channel,
          sender: sender.name,
          warned: [[`[ipc] Dropped ${channel}: sender is not the app page`]],
          reached: 0
        })

        counted.cases += 1
      }
    }
  })

  it('answers the app page', async () => {
    expect.assertions(4)

    await expect(ipc.invoke('window-is-maximized')).resolves.toBe(false)
    expect(handlers['window-is-maximized'].run).toHaveBeenCalledTimes(1)

    ipc.send('log:set-level', true)

    expect(setLogLevel).toHaveBeenCalledWith('debug')
    expect(warn).not.toHaveBeenCalled()

    counted.cases += 2
  })
})

describe('ipc registration: sender check', () => {
  beforeEach(resetSender)

  afterAll(afterAllTests(caseProblems))

  it('admits the renderer entry file however its directory is spelled', () => {
    const spaced = path.resolve('/Synthetic App/Fixture é/renderer/index.html')

    expect([
      isAdmitted({ kind: 'file', path: spaced }, pathToFileURL(spaced).href),
      isAdmitted({ kind: 'file', path: entry }, entryUrl),
      isAdmitted({ kind: 'file', path: entry }, `${entryUrl}?x=1#top`),
      isAdmitted({ kind: 'file', path: spaced }, entryUrl),
      isAdmitted({ kind: 'file', path: entry }, `https://example.invalid${entry}`),
      isAdmitted({ kind: 'file', path: entry }, 'not a url')
    ]).toStrictEqual([true, true, true, false, false, false])
  })

  it('compares a win32 entry case-insensitively', () => {
    const win32: RendererEntry = {
      kind: 'file',
      path: 'C:\\Games\\Synthetic App\\resources\\app.asar\\out\\renderer\\index.html'
    }

    expect(isAdmitted(win32, win32EntryUrl('index.html'), 'win32')).toBe(true)
    expect(isAdmitted(win32, win32EntryUrl('index.html').toLowerCase(), 'win32')).toBe(true)
    expect(isAdmitted(win32, win32EntryUrl('other.html'), 'win32')).toBe(false)
    expect(isAdmitted(win32, 'file://server/share/index.html', 'win32')).toBe(false)
  })

  it('admits only the dev server origin in development', () => {
    const developmentServer: RendererEntry = { kind: 'dev-server', origin: 'http://localhost:5173' }

    expect(isAdmitted(developmentServer, 'http://localhost:5173/src/x')).toBe(true)
    expect(isAdmitted(developmentServer, 'http://localhost:5173/')).toBe(true)
    expect(isAdmitted(developmentServer, 'http://localhost:5174/')).toBe(false)
    expect(isAdmitted(developmentServer, 'https://localhost:5173/')).toBe(false)
    expect(isAdmitted(developmentServer, entryUrl)).toBe(false)
  })

  it('logs each refused sender address once, without its query, with the page it expected', () => {
    let window = createFakeWindow('https://example.invalid/page?token=synthetic#top')
    const isTrusted = createSenderCheck(() => window, { kind: 'file', path: entry })
    const isTrustedNow = (): boolean => isTrusted({ senderFrame: window.webContents.mainFrame })
    const other = pathToFileURL(path.join(rendererDirectory, 'other.html')).href
    warn.mockClear()
    const admitted = [isTrustedNow(), isTrustedNow()]
    window = createFakeWindow('https://example.invalid/page?token=other')
    admitted.push(isTrustedNow())
    window = createFakeWindow(other)
    admitted.push(isTrustedNow())

    expect(admitted).toStrictEqual([false, false, false, false])
    expect(warn.mock.calls).toStrictEqual([
      [`[ipc] Refused requests from https://example.invalid/page: the app page is ${entry}`],
      [`[ipc] Refused requests from ${other}: the app page is ${entry}`]
    ])

    counted.cases += 4
  })

  it('refuses a frame without a text address as one whose address cannot be read', () => {
    const isTrusted = createSenderCheck(() => appWindow, { kind: 'file', path: entry })
    warn.mockClear()

    expect(isTrusted({ senderFrame: {} })).toBe(false)
    expect(isTrusted({ senderFrame: { url: 42 } })).toBe(false)
    expect(warn).toHaveBeenCalledExactlyOnceWith(
      `[ipc] Refused requests from a frame whose address cannot be read: the app page is ${entry}`
    )
  })
})

type HostListener = (event: SenderEvent, ...args: unknown[]) => unknown

/**
A stand-in for `ipcMain` that, like it, refuses a second handler on one channel
*/
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
      const logListeners = listeners.get(LOG_CHANNEL) ?? []
      for (const listener of logListeners) listener({ senderFrame: frame }, ...args)
    }
  }
}

const frame = appWindow.webContents.mainFrame
/*
What electron-log registers on import: a listener writing log lines, and a handler for the
options request of the script it loads into pages, which main does not load
*/
const writeLine = vi.fn<HostListener>()
const answerOptions = vi.fn<HostListener>(() => ({}))

function routed(): ReturnType<typeof createLogHost> {
  const fake = createLogHost()
  fake.host.on(LOG_CHANNEL, writeLine)
  fake.host.handle(LOG_CHANNEL, answerOptions)
  routeLogChannel(isTrustedSender, fake.host)
  return fake
}

function line(fields: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    data: ['a synthetic line'],
    date: '2026-01-01T00:00:00.000Z',
    level: 'info',
    logId: 'default',
    variables: { processType: 'renderer' },
    ...fields
  }
}

function resetLogChannel(): void {
  resetSender()
  writeLine.mockClear()
  answerOptions.mockClear()
  logError.mockClear()
}

function byText(a: string, b: string): number {
  return a.localeCompare(b)
}

describe("electron-log's channel: routing", () => {
  beforeEach(resetLogChannel)

  it('registers a checked listener in place of the unchecked one, and no handler', () => {
    const fake = routed()
    handleAll(handlers, isTrustedSender, fake.host)
    onAll(listeners, isTrustedSender, fake.host)

    // The page asks main nothing on this channel, so electron-log's handler is only taken off
    expect(fake.handlers.keys().toArray().toSorted(byText)).toStrictEqual(
      [...INVOKE_CHANNELS].toSorted(byText)
    )
    expect(fake.listeners.keys().toArray().toSorted(byText)).toStrictEqual(
      [...SEND_CHANNELS, LOG_CHANNEL].toSorted(byText)
    )
    expect(fake.listeners.get(LOG_CHANNEL)).toHaveLength(1)
    expect(fake.listeners.get(LOG_CHANNEL)).not.toContain(writeLine)
    expect(logError).not.toHaveBeenCalled()
  })

  it('refuses log lines from any sender but the app page', () => {
    const fake = routed()
    for (const sender of untrusted) {
      shown.window = appWindow
      warn.mockClear()
      fake.sendFrom(sender.frame(), line())

      expect({ sender: sender.name, warned: refusals() }).toStrictEqual({
        sender: sender.name,
        warned: [[`[ipc] refused ${LOG_CHANNEL}: Access denied: sender`]]
      })
    }

    expect(writeLine).not.toHaveBeenCalled()
  })

  it("passes the app page's log line on to electron-log unchanged", () => {
    const fake = routed()
    warn.mockClear()
    const scoped = line({ scope: 'store', data: ['a synthetic line', { nested: [1, 2] }] })
    const bare = { __proto__: null, ...line() }
    fake.sendFrom(frame, scoped)
    fake.sendFrom(frame, bare)

    expect(writeLine.mock.calls).toStrictEqual([
      [{ senderFrame: frame }, scoped],
      [{ senderFrame: frame }, bare]
    ])
    expect(writeLine.mock.calls[0]?.[1]).toBe(scoped)
    expect(warn).not.toHaveBeenCalled()
  })

  it('says so when electron-log registered no listener to write the lines', () => {
    const fake = createLogHost()
    routeLogChannel(isTrustedSender, fake.host)

    expect(logError.mock.calls).toStrictEqual([
      [`[ipc] electron-log has no listener on ${LOG_CHANNEL}: page log lines are lost`]
    ])
  })
})

/**
A value that holds itself
*/
function cyclicValue(): { self?: unknown } {
  const value: { self?: unknown } = {}
  value.self = value
  return value
}

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
  { name: 'a cyclic value', args: [line({ data: [cyclicValue()] })] },
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

describe("electron-log's channel: invalid lines", () => {
  beforeEach(resetLogChannel)

  it.each(refusedLines)('drops $name without throwing', ({ args }) => {
    const fake = routed()
    warn.mockClear()

    expect(() => {
      fake.sendFrom(frame, ...args)
    }).not.toThrow()
    expect(writeLine).not.toHaveBeenCalled()
    expect(refusals()).toStrictEqual([
      [`[ipc] refused ${LOG_CHANNEL}: Invalid arguments: ${LOG_CHANNEL}`]
    ])
  })
})
