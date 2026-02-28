import { create } from 'zustand'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

export interface Toast {
  id: string
  type: ToastType
  message: string
  duration: number
  createdAt: number
}

interface AddToastInput {
  type: ToastType
  message: string
  duration?: number
}

const MAX_TOASTS = 5

interface ToastState {
  toasts: Toast[]
  addToast: (input: AddToastInput) => void
  dismiss: (id: string) => void
  dismissAll: () => void
}

let counter = 0

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],

  addToast: (input) => {
    const id = `toast-${++counter}-${Date.now()}`
    const duration = input.duration ?? 3000
    const toast: Toast = {
      id,
      type: input.type,
      message: input.message,
      duration,
      createdAt: Date.now()
    }

    set((state) => {
      const next = [...state.toasts, toast]
      return { toasts: next.length > MAX_TOASTS ? next.slice(-MAX_TOASTS) : next }
    })

    if (duration > 0) {
      setTimeout(() => {
        get().dismiss(id)
      }, duration)
    }
  },

  dismiss: (id) => {
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }))
  },

  dismissAll: () => {
    set({ toasts: [] })
  }
}))
