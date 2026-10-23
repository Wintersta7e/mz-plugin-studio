import { create } from 'zustand'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

/** A button on a toast; clicking it runs `run` and dismisses the toast. */
export interface ToastAction {
  label: string
  run: () => void
}

export interface Toast {
  id: string
  type: ToastType
  message: string
  duration: number
  createdAt: number
  action?: ToastAction
}

interface AddToastInput {
  type: ToastType
  message: string
  duration?: number
  action?: ToastAction
}

// Past this, the oldest timed toasts without an action make room; the others stay until dismissed
const MAX_TOASTS = 5

// Long enough to read an error, a refusal, a Save All report or why a project did not open
export const NOTICE_MS = 10_000

interface ToastState {
  toasts: Toast[]
  addToast: (input: AddToastInput) => void
  dismiss: (id: string) => void
  dismissAll: () => void
  /** Stops a timed toast's countdown while the user reads or uses it. */
  pause: (id: string) => void
  /** Restarts a paused toast's countdown with the time it had left. */
  resume: (id: string) => void
}

let counter = 0

// Each timed toast's countdown: `handle` is null while paused, with `left` ms to go
interface Countdown {
  handle: ReturnType<typeof setTimeout> | null
  endsAt: number
  left: number
}
const timerMap = new Map<string, Countdown>()

const evictable = (toast: Toast): boolean => toast.duration > 0 && toast.action === undefined

function stopCountdown(id: string): void {
  const handle = timerMap.get(id)?.handle
  if (handle) clearTimeout(handle)
  timerMap.delete(id)
}

export const useToastStore = create<ToastState>((set, get) => {
  const startCountdown = (id: string, ms: number): void => {
    const handle = setTimeout(() => {
      timerMap.delete(id)
      get().dismiss(id)
    }, ms)
    timerMap.set(id, { handle, endsAt: Date.now() + ms, left: ms })
  }

  return {
    toasts: [],

    addToast: (input) => {
      const id = `toast-${++counter}-${Date.now()}`
      const duration = input.duration ?? 3000
      const toast: Toast = {
        id,
        type: input.type,
        message: input.message,
        duration,
        createdAt: Date.now(),
        ...(input.action && { action: input.action })
      }

      set((state) => {
        const next = [...state.toasts, toast]
        // Oldest first, so the newest timed toasts are the ones kept; the new one always shows
        let excess = next.length - MAX_TOASTS
        if (excess <= 0) return { toasts: next }
        return {
          toasts: next.filter((t) => {
            if (excess <= 0 || !evictable(t) || t === toast) return true
            excess--
            stopCountdown(t.id)
            return false
          })
        }
      })

      if (duration > 0) startCountdown(id, duration)
    },

    dismiss: (id) => {
      stopCountdown(id)
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }))
    },

    dismissAll: () => {
      for (const id of [...timerMap.keys()]) stopCountdown(id)
      set({ toasts: [] })
    },

    pause: (id) => {
      const countdown = timerMap.get(id)
      if (countdown?.handle == null) return
      clearTimeout(countdown.handle)
      timerMap.set(id, { ...countdown, handle: null, left: countdown.endsAt - Date.now() })
    },

    resume: (id) => {
      const countdown = timerMap.get(id)
      if (countdown === undefined || countdown.handle !== null) return
      startCountdown(id, Math.max(0, countdown.left))
    }
  }
})
