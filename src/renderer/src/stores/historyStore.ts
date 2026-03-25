import { create } from 'zustand'
import type { PluginDefinition } from '../types/plugin'
import { usePluginStore } from './pluginStore'

/** Lightweight fingerprint to detect duplicate consecutive pushes */
function pluginFingerprint(plugin: PluginDefinition): string {
  return JSON.stringify({
    id: plugin.id,
    meta: plugin.meta,
    params: plugin.parameters.map((p) => ({
      n: p.name,
      t: p.type,
      d: p.default,
      desc: p.desc,
      parent: p.parent,
      options: p.options
    })),
    cmds: plugin.commands.map((c) => ({
      n: c.name,
      d: c.desc,
      args: c.args.map((a) => ({ n: a.name, t: a.type, d: a.default }))
    })),
    structs: plugin.structs.map((s) => ({
      n: s.name,
      params: s.parameters.map((p) => ({ n: p.name, t: p.type, d: p.default }))
    })),
    code: plugin.customCode?.length ?? 0
  })
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
      // Strip rawSource to avoid retaining large strings in history

      const { rawSource: _raw, ...pluginSnapshot } = plugin
      const entry = { plugin: pluginSnapshot as PluginDefinition, timestamp: Date.now() }

      // If plugin switched without explicit setActivePluginId, clear history
      if (state.activePluginId !== null && plugin.id !== state.activePluginId) {
        return {
          past: [entry],
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
        past: [...state.past.slice(-49), entry],
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

  clear: () => set({ past: [], future: [], activePluginId: null }),
  canUndo: () => get().past.length > 0,
  canRedo: () => get().future.length > 0
}))
