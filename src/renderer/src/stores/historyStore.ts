import { create } from 'zustand'
import type { PluginDefinition } from '../types/plugin'
import { usePluginStore } from './pluginStore'

/** Plugin snapshot stored in history — rawSource is always stripped to save memory (R3-07) */
type HistoryPluginSnapshot = Omit<PluginDefinition, 'rawSource'> & { rawSource?: undefined }

interface HistoryEntry {
  plugin: HistoryPluginSnapshot
  timestamp: number
  json: string // `plugin` serialized, to compare states exactly
}

function entryOf(plugin: PluginDefinition): HistoryEntry {
  // Strip rawSource to avoid retaining large strings in history
  const { rawSource: _raw, ...snapshot } = plugin
  return {
    plugin: snapshot as HistoryPluginSnapshot,
    timestamp: Date.now(),
    json: JSON.stringify(snapshot)
  }
}

/** Whether `entry` holds exactly `plugin`, apart from the file text history never keeps. */
function shows(entry: HistoryEntry, plugin: PluginDefinition): boolean {
  return entry.json === entryOf(plugin).json
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
      const entry = entryOf(plugin)

      // If plugin switched without explicit setActivePluginId, clear history
      if (state.activePluginId !== null && plugin.id !== state.activePluginId) {
        return {
          past: [entry],
          future: [],
          activePluginId: plugin.id
        }
      }
      // Skip a push of the state already recorded last
      const last = state.past[state.past.length - 1]
      if (last && last.json === entry.json) {
        return {}
      }
      return {
        past: [...state.past.slice(-49), entry],
        future: [],
        activePluginId: plugin.id
      }
    }),

  // The app records each state once edits pause, so the newest entry of `past` is the state
  // shown unless an edit is still waiting to be recorded
  undo: () => {
    const { past, future } = get()
    const current = usePluginStore.getState().plugin
    const top = past[past.length - 1]
    const shown = top !== undefined && shows(top, current)
    const earlier = shown ? past.slice(0, -1) : past
    const previous = earlier[earlier.length - 1]
    if (previous === undefined) return null

    // `previous` stays the newest entry: it is the state shown from now on
    set({ past: earlier, future: [shown ? top : entryOf(current), ...future] })
    return previous.plugin
  },

  redo: () => {
    const { past, future } = get()
    if (future.length === 0) return null

    const next = future[0]
    const top = past[past.length - 1]
    const current = usePluginStore.getState().plugin
    const unrecorded = top !== undefined && shows(top, current) ? [] : [entryOf(current)]

    set({ past: [...past, ...unrecorded, next], future: future.slice(1) })
    return next.plugin
  },

  clear: () => set({ past: [], future: [], activePluginId: null })
}))
