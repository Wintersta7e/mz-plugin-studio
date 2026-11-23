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
