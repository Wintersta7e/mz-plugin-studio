import { create } from 'zustand'
import type { PluginDefinition } from '../types/plugin'
import { usePluginStore } from './pluginStore'

/** Lightweight fingerprint to detect duplicate consecutive pushes */
function pluginFingerprint(plugin: PluginDefinition): string {
  return `${plugin.id}:${plugin.meta.name}:${plugin.parameters.length}:${plugin.commands.length}:${plugin.structs.length}:${plugin.customCode?.length ?? 0}:${plugin.meta.description?.length ?? 0}`
}

interface HistoryEntry {
  plugin: PluginDefinition
  timestamp: number
}

interface HistoryState {
  past: HistoryEntry[]
  future: HistoryEntry[]
  /** The plugin ID that current history entries belong to */
  activePluginId: string | null

  push: (plugin: PluginDefinition) => void
  undo: () => PluginDefinition | null
  redo: () => PluginDefinition | null
  clear: () => void
  canUndo: () => boolean
  canRedo: () => boolean
  /** Call when switching plugins to reset history for the new context */
  setActivePluginId: (id: string | null) => void
}

export const useHistoryStore = create<HistoryState>()((set, get) => ({
  past: [],
  future: [],
  activePluginId: null,

  setActivePluginId: (id) => {
    const { activePluginId } = get()
    if (id !== activePluginId) {
      set({ past: [], future: [], activePluginId: id })
    }
  },

  push: (plugin) =>
    set((state) => {
      // If plugin switched without explicit setActivePluginId, clear history
      if (state.activePluginId !== null && plugin.id !== state.activePluginId) {
        return {
          past: [{ plugin, timestamp: Date.now() }],
          future: [],
          activePluginId: plugin.id
        }
      }
      // Skip duplicate consecutive pushes
      const last = state.past[state.past.length - 1]
      if (last && pluginFingerprint(last.plugin) === pluginFingerprint(plugin)) {
        return {}
      }
      return {
        past: [...state.past.slice(-49), { plugin, timestamp: Date.now() }],
        future: [],
        activePluginId: plugin.id
      }
    }),

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
