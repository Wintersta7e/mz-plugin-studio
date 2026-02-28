// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ToastContainer } from '../src/renderer/src/components/ui/toast'
import { useToastStore } from '../src/renderer/src/stores/toastStore'

describe('ToastContainer UI', () => {
  beforeEach(() => {
    useToastStore.getState().dismissAll()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders empty container when no toasts', () => {
    const { container } = render(<ToastContainer />)
    expect(container.querySelector('.fixed')).toBeInTheDocument()
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
    const { container } = render(<ToastContainer />)
    // Progress bar has the h-0.5 class — should not exist for duration=0
    expect(container.querySelector('.h-0\\.5')).not.toBeInTheDocument()
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
