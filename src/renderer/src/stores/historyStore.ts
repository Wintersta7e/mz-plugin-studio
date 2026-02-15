import { create } from 'zustand'
import type { PluginDefinition } from '../types/plugin'
import { usePluginStore } from './pluginStore'

interface HistoryEntry {
  plugin: PluginDefinition
  timestamp: number
}

interface HistoryState {
  past: HistoryEntry[]
  future: HistoryEntry[]

  push: (plugin: PluginDefinition) => void
  undo: () => PluginDefinition | null
  redo: () => PluginDefinition | null
  clear: () => void
  canUndo: () => boolean
  canRedo: () => boolean
}

export const useHistoryStore = create<HistoryState>()((set, get) => ({
  past: [],
  future: [],

  push: (plugin) =>
    set((state) => ({
      past: [...state.past.slice(-49), { plugin, timestamp: Date.now() }],
      future: []
    })),

  undo: () => {
    const { past, future } = get()
    if (past.length === 0) return null

    const previous = past[past.length - 1]
    const currentPlugin = usePluginStore.getState().plugin

    set({
      past: past.slice(0, -1),
      future: [{ plugin: currentPlugin, timestamp: Date.now() }, ...future]
    })

    return previous.plugin
  },

  redo: () => {
    const { past, future } = get()
    if (future.length === 0) return null

    const next = future[0]
    const currentPlugin = usePluginStore.getState().plugin

    set({
      past: [...past, { plugin: currentPlugin, timestamp: Date.now() }],
      future: future.slice(1)
    })

    return next.plugin
  },

  clear: () => set({ past: [], future: [] }),
  canUndo: () => get().past.length > 0,
  canRedo: () => get().future.length > 0
}))
