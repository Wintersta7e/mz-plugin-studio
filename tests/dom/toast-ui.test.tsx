import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { act, render, screen, fireEvent } from '@testing-library/react'
import { ToastContainer } from '../../src/renderer/src/components/ui/toast'
import { NOTICE_MS, useToastStore } from '../../src/renderer/src/stores/toastStore'

function setUp(): void {
  useToastStore.getState().dismissAll()
  vi.useFakeTimers()
}

function tearDown(): void {
  vi.useRealTimers()
}

describe('toastContainer UI: rendering', () => {
  beforeEach(setUp)

  afterEach(tearDown)

  it('renders empty container when no toasts', () => {
    render(<ToastContainer />)

    expect(screen.getByTestId('toast-viewport')).toHaveClass('fixed')
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('renders toast with correct message', () => {
    useToastStore.getState().addToast({ type: 'success', message: 'Saved!' })
    render(<ToastContainer />)

    expect(screen.getByText('Saved!')).toBeInTheDocument()
  })

  it('dismiss button removes toast', () => {
    useToastStore.getState().addToast({ type: 'info', message: 'Dismissable', duration: 0 })
    render(<ToastContainer />)

    expect(screen.getByText('Dismissable')).toBeInTheDocument()

    const closeButton = screen.getByRole('button')
    fireEvent.click(closeButton)

    expect(useToastStore.getState().toasts).toHaveLength(0)
  })

  it('does not render progress bar for persistent toast', () => {
    useToastStore.getState().addToast({ type: 'error', message: 'Sticky', duration: 0 })
    render(<ToastContainer />)

    // Progress bar has the h-0.5 class — should not exist for duration=0
    expect(
      screen.queryByText(
        (_content, element) => element?.getAttribute('class')?.split(' ').includes('h-0.5') ?? false
      )
    ).not.toBeInTheDocument()
  })

  it('renders multiple toasts', () => {
    const { addToast } = useToastStore.getState()
    addToast({ type: 'success', message: 'First' })
    addToast({ type: 'error', message: 'Second' })
    addToast({ type: 'warning', message: 'Third' })
    render(<ToastContainer />)

    expect(screen.getByText('First')).toBeInTheDocument()
    expect(screen.getByText('Second')).toBeInTheDocument()
    expect(screen.getByText('Third')).toBeInTheDocument()
  })
})

describe('toastContainer UI: timing', () => {
  beforeEach(setUp)

  afterEach(tearDown)

  it('a toast under the pointer stays until the pointer leaves, then for the time it had left', () => {
    useToastStore.getState().addToast({ type: 'error', message: 'Read me', duration: NOTICE_MS })
    render(<ToastContainer />)
    act(() => {
      vi.advanceTimersByTime(4000)
    })
    fireEvent.pointerEnter(screen.getByText('Read me'))
    act(() => {
      vi.advanceTimersByTime(11_000)
    })

    expect(screen.getByText('Read me')).toBeInTheDocument()

    fireEvent.pointerLeave(screen.getByText('Read me'))
    act(() => {
      vi.advanceTimersByTime(5900)
    })

    expect(useToastStore.getState().toasts).toHaveLength(1)

    act(() => {
      vi.advanceTimersByTime(200)
    })

    expect(useToastStore.getState().toasts).toHaveLength(0)
  })

  it('a toast with focus inside it stays until focus leaves it', () => {
    useToastStore.getState().addToast({
      type: 'warning',
      message: 'Skipped tabs',
      duration: NOTICE_MS,
      action: { label: 'Show', run: vi.fn<() => void>() }
    })
    render(<ToastContainer />)
    const button = screen.getByRole('button', { name: 'Show' })
    const close = screen.getByRole('button', { name: 'Dismiss notification' })
    fireEvent.focusIn(button)
    act(() => {
      vi.advanceTimersByTime(11_000)
    })

    expect(screen.getByText('Skipped tabs')).toBeInTheDocument()

    // Focus moving between the toast's own buttons keeps it paused
    fireEvent.focusOut(button, { relatedTarget: close })
    fireEvent.focusIn(close)
    act(() => {
      vi.advanceTimersByTime(11_000)
    })

    expect(useToastStore.getState().toasts).toHaveLength(1)

    fireEvent.focusOut(close, { relatedTarget: document.body })
    act(() => {
      vi.advanceTimersByTime(NOTICE_MS)
    })

    expect(useToastStore.getState().toasts).toHaveLength(0)
  })
})
