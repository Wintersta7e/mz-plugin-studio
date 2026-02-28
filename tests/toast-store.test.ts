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
})
