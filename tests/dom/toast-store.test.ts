import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { useToastStore } from '../../src/renderer/src/stores/toastStore'
import { resetStores } from './support/reset-stores'

function toastAt(index: number): ReturnType<typeof useToastStore.getState>['toasts'][number] {
  const toast = useToastStore.getState().toasts.at(index)
  if (toast === undefined) throw new Error(`missing toast at ${String(index)}`)
  return toast
}

// Adds `Toast 0` to `Toast 6`, two more than the store keeps.
function addSevenToasts(): void {
  const { addToast } = useToastStore.getState()
  for (let index = 0; index < 7; index++) {
    addToast({ type: 'info', message: `Toast ${String(index)}` })
  }
}

function setUp(): void {
  useToastStore.getState().dismissAll()
  vi.useFakeTimers()
}

function tearDown(): void {
  vi.useRealTimers()
}

describe('toastStore: basic operations', () => {
  beforeEach(setUp)

  afterEach(tearDown)

  it('adds a toast with auto-generated id', () => {
    useToastStore.getState().addToast({ type: 'success', message: 'Saved!' })
    const toasts = useToastStore.getState().toasts

    expect(toasts).toHaveLength(1)
    expect(toastAt(0).type).toBe('success')
    expect(toastAt(0).message).toBe('Saved!')
    expect(toastAt(0).id).toBeDefined()
  })

  it('supports all toast types', () => {
    const { addToast } = useToastStore.getState()
    addToast({ type: 'success', message: 'ok' })
    addToast({ type: 'error', message: 'fail' })
    addToast({ type: 'warning', message: 'warn' })
    addToast({ type: 'info', message: 'note' })
    const toasts = useToastStore.getState().toasts

    expect(toasts).toHaveLength(4)
    expect(toasts.map((t) => t.type)).toStrictEqual(['success', 'error', 'warning', 'info'])
  })

  it('dismisses a toast by id', () => {
    useToastStore.getState().addToast({ type: 'info', message: 'Test' })
    const id = toastAt(0).id
    useToastStore.getState().dismiss(id)

    expect(useToastStore.getState().toasts).toHaveLength(0)
  })

  it('dismisses all toasts', () => {
    const { addToast, dismissAll } = useToastStore.getState()
    addToast({ type: 'info', message: '1' })
    addToast({ type: 'info', message: '2' })
    dismissAll()

    expect(useToastStore.getState().toasts).toHaveLength(0)
  })

  it('limits max toasts to 5', () => {
    addSevenToasts()

    expect(useToastStore.getState().toasts).toHaveLength(5)
  })
})

describe('toastStore: countdowns and capacity', () => {
  beforeEach(setUp)

  afterEach(tearDown)

  it('auto-dismisses after duration', () => {
    useToastStore.getState().addToast({ type: 'success', message: 'Auto', duration: 3000 })

    expect(useToastStore.getState().toasts).toHaveLength(1)

    vi.advanceTimersByTime(3100)

    expect(useToastStore.getState().toasts).toHaveLength(0)
  })

  it('uses default duration of 3000ms', () => {
    useToastStore.getState().addToast({ type: 'info', message: 'Default' })
    vi.advanceTimersByTime(2900)

    expect(useToastStore.getState().toasts).toHaveLength(1)

    vi.advanceTimersByTime(200)

    expect(useToastStore.getState().toasts).toHaveLength(0)
  })

  it('does not auto-dismiss when duration is 0 (persistent)', () => {
    useToastStore.getState().addToast({ type: 'error', message: 'Sticky', duration: 0 })
    vi.advanceTimersByTime(10_000)

    expect(useToastStore.getState().toasts).toHaveLength(1)
  })

  it('dismiss with non-existent ID is a no-op', () => {
    useToastStore.getState().addToast({ type: 'info', message: 'Test' })
    useToastStore.getState().dismiss('non-existent-id')

    expect(useToastStore.getState().toasts).toHaveLength(1)
  })

  it('dismissAll cancels pending auto-dismiss timers', () => {
    const { addToast, dismissAll } = useToastStore.getState()
    addToast({ type: 'info', message: '1', duration: 3000 })
    addToast({ type: 'info', message: '2', duration: 3000 })
    dismissAll()

    expect(useToastStore.getState().toasts).toHaveLength(0)

    // Advance past original timer — should not throw or add toasts back
    vi.advanceTimersByTime(5000)

    expect(useToastStore.getState().toasts).toHaveLength(0)
  })

  it('eviction preserves newest toasts', () => {
    addSevenToasts()

    expect(toastAt(0).message).toBe('Toast 2')
    expect(toastAt(4).message).toBe('Toast 6')
  })

  it('negative duration creates persistent toast', () => {
    useToastStore.getState().addToast({ type: 'warning', message: 'Persist', duration: -1 })
    vi.advanceTimersByTime(60_000)

    expect(useToastStore.getState().toasts).toHaveLength(1)
  })
})

describe('toastStore: identities and manual dismissal', () => {
  beforeEach(setUp)

  afterEach(tearDown)

  it('createdAt is a valid timestamp', () => {
    const before = Date.now()
    useToastStore.getState().addToast({ type: 'info', message: 'Timestamp' })
    const after = Date.now()
    const toast = toastAt(0)

    expect(toast.createdAt).toBeGreaterThanOrEqual(before)
    expect(toast.createdAt).toBeLessThanOrEqual(after)
  })

  it('generates unique IDs for concurrent toasts', () => {
    const { addToast } = useToastStore.getState()
    addToast({ type: 'info', message: 'A' })
    addToast({ type: 'info', message: 'B' })
    addToast({ type: 'info', message: 'C' })
    const ids = useToastStore.getState().toasts.map((t) => t.id)
    const unique = new Set(ids)

    expect(unique.size).toBe(3)
  })

  it('multiple toasts auto-dismiss independently', () => {
    const { addToast } = useToastStore.getState()
    addToast({ type: 'info', message: 'Short', duration: 1000 })
    addToast({ type: 'info', message: 'Long', duration: 5000 })

    expect(useToastStore.getState().toasts).toHaveLength(2)

    vi.advanceTimersByTime(1100)

    expect(useToastStore.getState().toasts).toHaveLength(1)
    expect(toastAt(0).message).toBe('Long')

    vi.advanceTimersByTime(4000)

    expect(useToastStore.getState().toasts).toHaveLength(0)
  })

  it('manual dismiss clears the auto-dismiss timer', () => {
    useToastStore.getState().addToast({ type: 'info', message: 'Test', duration: 3000 })
    const id = toastAt(0).id
    useToastStore.getState().dismiss(id)

    expect(useToastStore.getState().toasts).toHaveLength(0)

    // Timer should have been cleared — no error when it fires
    vi.advanceTimersByTime(5000)

    expect(useToastStore.getState().toasts).toHaveLength(0)
  })
})

describe('toastStore: eviction', () => {
  beforeEach(setUp)

  afterEach(tearDown)

  it('clears timers for evicted toasts when the max limit is exceeded', () => {
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout')

    for (let index = 0; index < 6; index++) {
      useToastStore
        .getState()
        .addToast({ type: 'info', message: `Toast ${String(index)}`, duration: 3000 })
    }

    expect(useToastStore.getState().toasts).toHaveLength(5)
    expect(clearTimeoutSpy).toHaveBeenCalledTimes(1)

    clearTimeoutSpy.mockRestore()
  })

  it('never evicts a persistent toast', () => {
    for (let index = 0; index < 6; index++) {
      useToastStore
        .getState()
        .addToast({ type: 'info', message: `Toast ${String(index)}`, duration: 0 })
    }

    expect(useToastStore.getState().toasts).toHaveLength(6)
  })

  it('shows a new timed toast even when persistent toasts fill the stack', () => {
    const { addToast } = useToastStore.getState()
    for (let index = 0; index < 5; index++)
      addToast({ type: 'info', message: `Toast ${String(index)}`, duration: 0 })
    addToast({ type: 'error', message: 'Save failed' })

    expect(useToastStore.getState().toasts.map((t) => t.message)).toStrictEqual([
      'Toast 0',
      'Toast 1',
      'Toast 2',
      'Toast 3',
      'Toast 4',
      'Save failed'
    ])
  })

  it('evicts the oldest timed toast without an action, keeping persistent and action toasts', () => {
    const { addToast } = useToastStore.getState()
    addToast({
      type: 'info',
      message: 'Reload',
      duration: 0,
      action: { label: 'Go', run: vi.fn<() => void>() }
    })
    addToast({
      type: 'info',
      message: 'Read me',
      duration: 10_000,
      action: { label: 'Go', run: vi.fn<() => void>() }
    })
    addToast({ type: 'warning', message: 'Storage full', duration: 0 })
    for (let index = 0; index < 5; index++)
      addToast({ type: 'error', message: `Refused ${String(index)}` })

    expect(useToastStore.getState().toasts.map((t) => t.message)).toStrictEqual([
      'Reload',
      'Read me',
      'Storage full',
      'Refused 3',
      'Refused 4'
    ])
  })
})

describe('resetStores and toast countdowns', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('a countdown started before the reset never writes the store after it', () => {
    useToastStore
      .getState()
      .addToast({ type: 'info', message: 'From an earlier test', duration: 50 })
    resetStores()
    const writes = vi.fn<() => void>()
    const unsubscribe = useToastStore.subscribe(writes)
    vi.advanceTimersByTime(100)
    unsubscribe()

    expect(writes).not.toHaveBeenCalled()
  })
})
