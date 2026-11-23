// Saved state is written by one coalescing writer: a change waits for the edits to pause, nothing
// is serialized while a key is typed, and a write that fails stays pending and is reported.
import { createElement } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import log from 'electron-log/renderer'
import { ParameterBuilder } from '../../src/renderer/src/components/plugin/ParameterBuilder'
import {
  usePluginStore,
  useSettingsStore,
  useToastStore,
  useUIStore
} from '../../src/renderer/src/stores'
import {
  FLUSH_MAX_DELAY_MS,
  FLUSH_QUIET_MS,
  flushPersistedState,
  isRecord
} from '../../src/renderer/src/stores/persist'
import { createEmptyPlugin } from '../../src/renderer/src/types/plugin'
import { createFakeApi } from '../helpers/fake-api'
import { PERSISTED_KEYS, type PersistedKey } from '../helpers/persisted-payloads'
import { resetStoreModules } from './support/load-persisted'
import { resetStores } from './support/reset-stores'

const SETTINGS = 'mz-plugin-studio-settings'
const UI = 'mz-plugin-studio-ui'

const logError: MockInstance<(...params: unknown[]) => void> = vi.mocked(log.error)

// The real write, bound before the spy below wraps it
const realSetItem = Storage.prototype.setItem.bind(localStorage)

// Every write to storage; each test starts with none recorded
const storageWrites = vi.spyOn(Storage.prototype, 'setItem')

// Writes of `key` since the test started
const writesOf = (key: string): number => storageWrites.mock.calls.filter(([k]) => k === key).length

// One line per saved key: how often it was written
const writeLines = (): string =>
  PERSISTED_KEYS.map((key: PersistedKey) => `writes ${key} ${String(writesOf(key))}`).join('\n')

// Every write of the settings throws `error`; other writes go through
function failSettingsWrites(error: Error): void {
  storageWrites.mockImplementation((k: string, value: string) => {
    if (k === SETTINGS) throw error
    realSetItem(k, value)
  })
}

// Writes go through again
function restoreWrites(): void {
  storageWrites.mockImplementation((k: string, value: string) => {
    realSetItem(k, value)
  })
}

function savedTheme(): unknown {
  const raw = localStorage.getItem(SETTINGS)
  const parsed: unknown = raw === null ? undefined : JSON.parse(raw)
  const state = isRecord(parsed) ? parsed['state'] : undefined
  return isRecord(state) ? state['theme'] : undefined
}

function setUp(): void {
  vi.useFakeTimers()
  restoreWrites()
  resetStores()
  storageWrites.mockClear()
}

function tearDown(): void {
  process.stdout.write(`${writeLines()}\n`)
  restoreWrites()
  flushPersistedState()
  vi.useRealTimers()
}

describe('saved state writer: cadence', () => {
  beforeEach(setUp)

  afterEach(tearDown)

  it('writes a change once the edits have paused for the quiet time', () => {
    useSettingsStore.getState().setTheme('light')
    vi.advanceTimersByTime(FLUSH_QUIET_MS - 1)

    expect(writesOf(SETTINGS)).toBe(0)

    vi.advanceTimersByTime(1)

    expect(writesOf(SETTINGS)).toBe(1)
    expect(savedTheme()).toBe('light')
  })

  it('writes changes that never pause by the longest delay after the first', () => {
    const step = 100
    for (let elapsed = 0; elapsed < FLUSH_MAX_DELAY_MS; elapsed += step) {
      useSettingsStore.getState().setEditorFontSize(10 + ((elapsed / step) % 10))
      vi.advanceTimersByTime(step - 1)

      expect(writesOf(SETTINGS)).toBe(0)

      vi.advanceTimersByTime(1)
    }

    expect(writesOf(SETTINGS)).toBe(1)
  })

  it('never writes a key with nothing pending', () => {
    useSettingsStore.getState().setTheme('light')
    vi.advanceTimersByTime(FLUSH_MAX_DELAY_MS)
    flushPersistedState()
    vi.advanceTimersByTime(FLUSH_MAX_DELAY_MS * 2)

    expect(writeLines()).toBe(
      PERSISTED_KEYS.map((key) => `writes ${key} ${key === SETTINGS ? '1' : '0'}`).join('\n')
    )
  })

  it('writes a pending key before it is read back', async () => {
    expect.hasAssertions()

    useSettingsStore.getState().setTheme('light')

    expect(writesOf(SETTINGS)).toBe(0)

    await useSettingsStore.persist.rehydrate()

    expect(writesOf(SETTINGS)).toBe(1)
    expect(savedTheme()).toBe('light')
    expect(useSettingsStore.getState().theme).toBe('light')
  })

  it('writes every pending key at once when asked', () => {
    useSettingsStore.getState().setTheme('light')
    useUIStore.getState().setSidebarWidth(321)
    flushPersistedState()

    expect([writesOf(SETTINGS), writesOf(UI)]).toStrictEqual([1, 1])
  })
})

describe('saved state writer: failed writes', () => {
  beforeEach(setUp)

  afterEach(tearDown)

  it('keeps a key whose write failed pending and writes it at its next change', () => {
    failSettingsWrites(new Error('disk said no'))
    useSettingsStore.getState().setTheme('light')
    vi.advanceTimersByTime(FLUSH_MAX_DELAY_MS)

    expect(savedTheme()).toBeUndefined()

    restoreWrites()
    storageWrites.mockClear()
    useSettingsStore.getState().setEditorFontSize(16)
    vi.advanceTimersByTime(FLUSH_MAX_DELAY_MS)

    expect(writesOf(SETTINGS)).toBe(1)
    expect(savedTheme()).toBe('light')
  })

  it('logs a failed write that is not a full quota and shows it once', async () => {
    expect.hasAssertions()

    // A fresh copy of the writer: what it has shown is kept for the session
    vi.resetModules()
    const fresh = await import('../../src/renderer/src/stores/persist')
    const { useSettingsStore: settings } =
      await import('../../src/renderer/src/stores/settings-store')
    const { useToastStore: toasts } = await import('../../src/renderer/src/stores/toast-store')
    const error = new Error('disk said no')
    failSettingsWrites(error)
    try {
      settings.getState().setTheme('light')
      vi.advanceTimersByTime(FLUSH_MAX_DELAY_MS)
      settings.getState().setTheme('dark')
      vi.advanceTimersByTime(FLUSH_MAX_DELAY_MS)
    } finally {
      fresh.flushPersistedState()
      fresh.stopUnloadListeners()
    }

    expect(
      logError.mock.calls.filter(([text]) => text === `${SETTINGS} could not be saved:`)
    ).toStrictEqual([
      [`${SETTINGS} could not be saved:`, error],
      [`${SETTINGS} could not be saved:`, error],
      [`${SETTINGS} could not be saved:`, error]
    ])
    expect(toasts.getState().toasts).toStrictEqual([
      expect.objectContaining({
        type: 'error',
        message:
          'Recent changes to settings could not be saved (disk said no); saving is tried again at the next change. Nothing was deleted.'
      })
    ])
  })

  it('counts writes that failed on a full quota and shows them once', () => {
    failSettingsWrites(new DOMException('full', 'QuotaExceededError'))
    useSettingsStore.getState().setTheme('light')
    vi.advanceTimersByTime(FLUSH_MAX_DELAY_MS)
    useSettingsStore.getState().setTheme('dark')
    vi.advanceTimersByTime(FLUSH_MAX_DELAY_MS)
    restoreWrites()
    storageWrites.mockClear()
    useSettingsStore.getState().setTheme('light')
    vi.advanceTimersByTime(FLUSH_MAX_DELAY_MS)

    const toasts = useToastStore.getState().toasts.map(({ type, message }) => `${type}: ${message}`)

    expect(toasts).toHaveLength(1)
    expect(toasts.at(0)).toMatch(/^error: Storage is full/)
    expect(vi.mocked(log.warn)).toHaveBeenCalledWith(
      `${SETTINGS} could not be saved 1 more times while storage was full`
    )
    expect(savedTheme()).toBe('light')
  })
})

// A saved envelope or the state inside one, as the writer would serialize it
const isSavedState = (value: unknown): boolean =>
  isRecord(value) && (Object.hasOwn(value, 'schemaVersion') || isRecord(value['state']))

describe('saved state writer: typing', () => {
  beforeEach(setUp)

  afterEach(tearDown)

  it('serializes and writes nothing while a key is typed into a parameter field', () => {
    usePluginStore.getState().openPlugin(createEmptyPlugin())
    render(createElement(ParameterBuilder))
    fireEvent.click(screen.getByRole('button', { name: 'Add Parameter' }))
    flushPersistedState()
    storageWrites.mockClear()
    const stringify: MockInstance<(value: unknown) => string> = vi.spyOn(JSON, 'stringify')
    const name = screen.getByPlaceholderText('paramName')

    act(() => {
      fireEvent.change(name, { target: { value: 'NewParameters' } })
    })
    const serialized = stringify.mock.calls.filter(([value]: readonly unknown[]) =>
      isSavedState(value)
    ).length

    expect(usePluginStore.getState().plugin.parameters.at(0)?.name).toBe('NewParameters')
    expect([serialized, storageWrites.mock.calls.length]).toStrictEqual([0, 0])

    act(() => {
      vi.advanceTimersByTime(FLUSH_MAX_DELAY_MS)
    })

    expect(storageWrites.mock.calls.length).toBeGreaterThan(0)
  })
})

describe('saved state writer: disk', () => {
  // Main's write of saved state to disk, as the page asks for it
  const toDisk = vi.fn<Window['api']['storage']['flush']>()

  beforeEach(() => {
    setUp()
    toDisk.mockClear()
    vi.stubGlobal('api', createFakeApi({ storage: { flush: toDisk } }))
  })

  afterEach(() => {
    tearDown()
    vi.unstubAllGlobals()
  })

  it('asks main once to write to disk after each flush that wrote', () => {
    useSettingsStore.getState().setTheme('light')
    useUIStore.getState().setSidebarWidth(321)
    flushPersistedState()

    expect(toDisk).toHaveBeenCalledTimes(1)

    useSettingsStore.getState().setTheme('dark')
    vi.advanceTimersByTime(FLUSH_QUIET_MS)

    expect(toDisk).toHaveBeenCalledTimes(2)
  })

  it('asks main nothing after a flush that wrote nothing', () => {
    flushPersistedState()
    failSettingsWrites(new Error('disk said no'))
    useSettingsStore.getState().setTheme('light')
    vi.advanceTimersByTime(FLUSH_MAX_DELAY_MS)

    expect(toDisk).not.toHaveBeenCalled()
  })
})

// A close whose last write of app state fails is held once per session, so main asks first

const quotaError = (): Error => new DOMException('full', 'QuotaExceededError')

/**
A fresh copy of the writer and the stores on it: what it held back is kept for the session
*/
async function freshSession(): Promise<{
  settings: typeof useSettingsStore
  toasts: typeof useToastStore
}> {
  await resetStoreModules()
  const { useSettingsStore: settings } =
    await import('../../src/renderer/src/stores/settings-store')
  const { useToastStore: toasts } = await import('../../src/renderer/src/stores/toast-store')
  return { settings, toasts }
}

// Asks the page to unload, as a close, quit or reload does; true when the page held it back
function isCloseHeld(): boolean {
  const event = new Event('beforeunload', { cancelable: true })
  dispatchEvent(event)
  return event.defaultPrevented
}

async function tearDownSession(): Promise<void> {
  restoreWrites()
  // writes what the fresh copy holds and removes its page listeners
  await resetStoreModules()
  tearDown()
  vi.unstubAllGlobals()
}

describe('saved state writer: a close after a failed write', () => {
  beforeEach(setUp)

  afterEach(tearDownSession)

  it.each([
    {
      kind: 'a full quota',
      error: quotaError,
      shown: /^Storage is full: recent changes to settings/
    },
    {
      kind: 'another error',
      error: (): Error => new Error('disk said no'),
      shown: /^Recent changes to settings could not be saved \(disk said no\)/
    }
  ])(
    'holds the first close after a write failed on $kind, and lets the next go',
    async ({ error, shown }) => {
      expect.assertions(2)

      const { settings, toasts } = await freshSession()
      failSettingsWrites(error())
      settings.getState().setTheme('light')
      vi.advanceTimersByTime(FLUSH_MAX_DELAY_MS)

      const isFirstHeld = isCloseHeld()
      const messages = toasts.getState().toasts.map(({ message }) => message)
      settings.getState().setTheme('dark')
      const isSecondHeld = isCloseHeld()

      expect([isFirstHeld, isSecondHeld]).toStrictEqual([true, false])
      expect(messages).toStrictEqual([expect.stringMatching(shown)])
    }
  )

  it('lets a close go when the last write went through', async () => {
    expect.assertions(1)

    const { settings } = await freshSession()
    failSettingsWrites(quotaError())
    settings.getState().setTheme('light')
    vi.advanceTimersByTime(FLUSH_MAX_DELAY_MS)
    restoreWrites()

    expect(isCloseHeld()).toBe(false)
  })

  it('shows the failure again at the held close once its notice was dismissed', async () => {
    expect.assertions(2)

    const { settings, toasts } = await freshSession()
    failSettingsWrites(quotaError())
    settings.getState().setTheme('light')
    vi.advanceTimersByTime(FLUSH_MAX_DELAY_MS)
    const before = toasts.getState().toasts.map(({ message }) => message)
    toasts.getState().dismissAll()

    expect(isCloseHeld()).toBe(true)
    expect(toasts.getState().toasts.map(({ message }) => message)).toStrictEqual(before)
  })
})

describe('saved state writer: a close after a failed write, in the app', () => {
  beforeEach(setUp)

  afterEach(tearDownSession)

  it('holds the close when the writer starts listening after the unsaved-tab guard', async () => {
    expect.assertions(3)

    vi.stubGlobal('__APP_VERSION__', '0.0.0-test')
    await resetStoreModules()
    const writer = await import('../../src/renderer/src/stores/persist')
    const { default: App } = await import('../../src/renderer/src/App')
    const stores = await import('../../src/renderer/src/stores')
    const registered = vi.spyOn(globalThis, 'addEventListener')
    const unloadListeners = (): number =>
      registered.mock.calls.filter(([type]) => type === 'beforeunload').length

    render(createElement(App))
    // whatever the start wrote, the writer listens again only from its next change on
    writer.stopUnloadListeners()
    const atStart = unloadListeners()
    registered.mockClear()
    failSettingsWrites(quotaError())
    act(() => {
      stores.useSettingsStore.getState().setTheme('light')
    })
    const atChange = unloadListeners()
    registered.mockRestore()
    const held = { isClose: false }
    act(() => {
      held.isClose = isCloseHeld()
    })

    expect(Object.values(stores.usePluginStore.getState().dirtyByPluginId)).not.toContain(true)
    expect([atStart, atChange]).toStrictEqual([1, 1])
    expect(held.isClose).toBe(true)
  })
})
