import { create } from 'zustand'
import type { PluginDefinition } from '../types/plugin'
import { usePluginStore } from './pluginStore'

/** Plugin snapshot stored in history — rawSource is always stripped to save memory (R3-07) */
type HistoryPluginSnapshot = Omit<PluginDefinition, 'rawSource'> & { rawSource?: undefined }

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
  plugin: HistoryPluginSnapshot
  timestamp: number
  fingerprint: string
}

interface HistoryState {
  past: HistoryEntry[]
  future: HistoryEntry[]
  /** The plugin ID that current history entries belong to */
  activePluginId: string | null

  push: (plugin: PluginDefinition) => void
  undo: () => HistoryPluginSnapshot | null
  redo: () => HistoryPluginSnapshot | null
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
      const fp = pluginFingerprint(plugin)
      const entry: HistoryEntry = {
        plugin: pluginSnapshot as HistoryPluginSnapshot,
        timestamp: Date.now(),
        fingerprint: fp
      }

      // If plugin switched without explicit setActivePluginId, clear history
      if (state.activePluginId !== null && plugin.id !== state.activePluginId) {
        return {
          past: [entry],
          future: [],
          activePluginId: plugin.id
        }
      }
      // Skip duplicate consecutive pushes (compare cached fingerprints — avoids double serialization)
      const last = state.past[state.past.length - 1]
      if (last && last.fingerprint === fp) {
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
    const { rawSource: _raw, ...snapshot } = currentPlugin

    set({
      past: past.slice(0, -1),
      future: [
        {
          plugin: snapshot as HistoryPluginSnapshot,
          timestamp: Date.now(),
          fingerprint: pluginFingerprint(currentPlugin)
        },
        ...future
      ]
    })

    return previous.plugin
  },

  redo: () => {
    const { past, future } = get()
    if (future.length === 0) return null

    const next = future[0]
    const currentPlugin = usePluginStore.getState().plugin
    const { rawSource: _raw, ...snapshot } = currentPlugin

    set({
      past: [
        ...past,
        {
          plugin: snapshot as HistoryPluginSnapshot,
          timestamp: Date.now(),
          fingerprint: pluginFingerprint(currentPlugin)
        }
      ],
      future: future.slice(1)
    })

    return next.plugin
  },

  clear: () => set({ past: [], future: [], activePluginId: null }),
  canUndo: () => get().past.length > 0,
  canRedo: () => get().future.length > 0
}))
