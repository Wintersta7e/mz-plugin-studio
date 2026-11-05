import { create } from 'zustand'
import type { PluginDefinition } from '../types/plugin'

/**
Plugin snapshot stored in history — rawSource is always stripped to save memory (R3-07)
*/
type HistoryPluginSnapshot = Omit<PluginDefinition, 'rawSource'> & { rawSource?: undefined }

interface HistoryEntry {
  plugin: HistoryPluginSnapshot
  timestamp: number
  json: string // `plugin` serialized, to compare states exactly
}

function entryOf(plugin: PluginDefinition): HistoryEntry {
  // Strip rawSource to avoid retaining large strings in history; the key is left out, not kept
  // as `undefined`, so the snapshot has the plugin's other keys in their order
  const snapshot: HistoryPluginSnapshot = { ...plugin, rawSource: undefined }
  delete snapshot.rawSource
  return {
    plugin: snapshot,
    timestamp: Date.now(),
    json: JSON.stringify(snapshot)
  }
}

/**
Whether `entry` holds exactly `plugin`, apart from the file text history never keeps.
*/
function doesShow(entry: HistoryEntry, plugin: PluginDefinition): boolean {
  return entry.json === entryOf(plugin).json
}

interface HistoryState {
  past: HistoryEntry[]
  future: HistoryEntry[]
  /**
  The plugin ID that current history entries belong to
  */
  activePluginId: string | null

  push: (plugin: PluginDefinition) => void
  undo: (current: PluginDefinition) => HistoryPluginSnapshot | null
  redo: (current: PluginDefinition) => HistoryPluginSnapshot | null
  clear: () => void
  /**
  Call when switching plugins to reset history for the new context
  */
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

  push: (plugin) => {
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
      if (state.past.at(-1)?.json === entry.json) {
        return {}
      }
      return {
        past: [...state.past.slice(-49), entry],
        future: [],
        activePluginId: plugin.id
      }
    })
  },

  // The app records each state once edits pause, so the newest entry of `past` is the state
  // shown unless an edit is still waiting to be recorded
  undo: (current) => {
    const { past, future } = get()
    const top = past.at(-1)
    const isShown = top !== undefined && doesShow(top, current)
    const earlier = isShown ? past.slice(0, -1) : past
    const previous = earlier.at(-1)
    if (previous === undefined) return null

    // `previous` stays the newest entry: it is the state shown from now on
    set({ past: earlier, future: [isShown ? top : entryOf(current), ...future] })
    return previous.plugin
  },

  redo: (current) => {
    const { past, future } = get()
    const next = future.at(0)
    if (next === undefined) return null

    const top = past.at(-1)
    const unrecorded = top !== undefined && doesShow(top, current) ? [] : [entryOf(current)]

    set({ past: [...past, ...unrecorded, next], future: future.slice(1) })
    return next.plugin
  },

  clear: () => {
    set({ past: [], future: [], activePluginId: null })
  }
}))
