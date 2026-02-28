import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { useToastStore } from '../src/renderer/src/stores/toastStore'

describe('toastStore', () => {
  beforeEach(() => {
    useToastStore.getState().dismissAll()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('adds a toast with auto-generated id', () => {
    useToastStore.getState().addToast({ type: 'success', message: 'Saved!' })
    const toasts = useToastStore.getState().toasts
    expect(toasts).toHaveLength(1)
    expect(toasts[0].type).toBe('success')
    expect(toasts[0].message).toBe('Saved!')
    expect(toasts[0].id).toBeDefined()
  })

  it('supports all toast types', () => {
    const { addToast } = useToastStore.getState()
    addToast({ type: 'success', message: 'ok' })
    addToast({ type: 'error', message: 'fail' })
    addToast({ type: 'info', message: 'note' })
    addToast({ type: 'warning', message: 'warn' })
    expect(useToastStore.getState().toasts).toHaveLength(4)
  })

  it('dismisses a toast by id', () => {
    useToastStore.getState().addToast({ type: 'info', message: 'Test' })
    const id = useToastStore.getState().toasts[0].id
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
    const { addToast } = useToastStore.getState()
    for (let i = 0; i < 7; i++) {
      addToast({ type: 'info', message: `Toast ${i}` })
    }
    expect(useToastStore.getState().toasts).toHaveLength(5)
  })

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
    vi.advanceTimersByTime(10000)
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
    const { addToast } = useToastStore.getState()
    for (let i = 0; i < 7; i++) {
      addToast({ type: 'info', message: `Toast ${i}` })
    }
    const toasts = useToastStore.getState().toasts
    expect(toasts[0].message).toBe('Toast 2')
    expect(toasts[4].message).toBe('Toast 6')
  })

  it('negative duration creates persistent toast', () => {
    useToastStore.getState().addToast({ type: 'warning', message: 'Persist', duration: -1 })
    vi.advanceTimersByTime(60000)
    expect(useToastStore.getState().toasts).toHaveLength(1)
  })

  it('createdAt is a valid timestamp', () => {
    const before = Date.now()
    useToastStore.getState().addToast({ type: 'info', message: 'Timestamp' })
    const after = Date.now()
    const toast = useToastStore.getState().toasts[0]
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
    expect(useToastStore.getState().toasts[0].message).toBe('Long')

    vi.advanceTimersByTime(4000)
    expect(useToastStore.getState().toasts).toHaveLength(0)
  })

  it('manual dismiss clears the auto-dismiss timer', () => {
    useToastStore.getState().addToast({ type: 'info', message: 'Test', duration: 3000 })
    const id = useToastStore.getState().toasts[0].id
    useToastStore.getState().dismiss(id)
    expect(useToastStore.getState().toasts).toHaveLength(0)
    // Timer should have been cleared — no error when it fires
    vi.advanceTimersByTime(5000)
    expect(useToastStore.getState().toasts).toHaveLength(0)
  })
})
