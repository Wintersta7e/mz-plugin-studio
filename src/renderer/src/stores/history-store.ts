import { create, type StoreApi } from 'zustand'
import type { PluginDefinition } from '../types/plugin'
import { isRecord } from './persist'

/**
A state of a tab kept in its undo history: the definition without its file text, sharing every
nested part with the store.
*/
export type HistorySnapshot = Omit<PluginDefinition, 'rawSource'>

interface HistoryStack {
  past: HistorySnapshot[]
  future: HistorySnapshot[]
  // When the tab was last pushed, counted in pushes, to find the tab pushed least recently
  lastPush: number
}

/**
@internal exported for tests
*/
export const HISTORY_TAB_LIMIT = 50
/**
@internal exported for tests
*/
export const HISTORY_TOTAL_LIMIT = 200
// How long edits to a tab pause before its state is recorded as one undo step
/**
@internal exported for tests
*/
export const HISTORY_QUIET_MS = 500

// A tab's change waiting for edits to that tab to pause, by plugin id
interface PendingChange {
  timer: ReturnType<typeof setTimeout>
  plugin: PluginDefinition
}
const pending = new Map<string, PendingChange>()

function dropPending(id: string): PendingChange | undefined {
  const change = pending.get(id)
  if (change !== undefined) {
    clearTimeout(change.timer)
    pending.delete(id)
  }
  return change
}

function snapshotOf(plugin: PluginDefinition): HistorySnapshot {
  // The file text is left out, not kept as `undefined`, so the snapshot has the plugin's other keys
  const snapshot = { ...plugin }
  delete snapshot.rawSource
  return snapshot
}

const isList = (value: unknown): value is readonly unknown[] => Array.isArray(value)

const definedKeys = (value: Record<string, unknown>): string[] =>
  Object.keys(value).filter((key) => value[key] !== undefined)

/**
Whether two values hold the same state: shared parts are the same at once, a key whose value is
`undefined` counts as absent, and key order does not matter.
*/
function isSameValue(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true
  if (isList(a) || isList(b)) {
    return (
      isList(a) &&
      isList(b) &&
      a.length === b.length &&
      a.every((item, index) => isSameValue(item, b[index]))
    )
  }
  if (!isRecord(a) || !isRecord(b)) return false
  const keys = definedKeys(a)
  return keys.length === definedKeys(b).length && keys.every((key) => isSameValue(a[key], b[key]))
}

/**
Whether `entry` holds exactly `plugin`, apart from the file text history never keeps.
*/
const doesShow = (entry: HistorySnapshot, plugin: PluginDefinition): boolean =>
  isSameValue(entry, snapshotOf(plugin))

// Over the total, takes the oldest steps of the tab pushed least recently, then of the next one
function evictOverTotal(stacks: Record<string, HistoryStack>): Record<string, HistoryStack> {
  let excess = -HISTORY_TOTAL_LIMIT
  for (const stack of Object.values(stacks)) excess += stack.past.length
  const next = { ...stacks }
  const byLastPush = Object.entries(stacks).toSorted(([, a], [, b]) => a.lastPush - b.lastPush)
  for (const [id, stack] of byLastPush) {
    if (excess <= 0) break
    const dropped = Math.min(excess, stack.past.length)
    next[id] = { ...stack, past: stack.past.slice(dropped) }
    excess -= dropped
  }
  return next
}

interface HistoryState {
  // Each open tab's history by its plugin id, in memory only
  stacks: Record<string, HistoryStack>
  pushes: number

  push: (plugin: PluginDefinition) => void
  undo: (current: PluginDefinition) => HistorySnapshot | null
  redo: (current: PluginDefinition) => HistorySnapshot | null
  /**
  Drops the history of the plugin `id`, as when that plugin's tab closes
  */
  forget: (id: string) => void
}

export const useHistoryStore = create<HistoryState>()((set, get) => ({
  stacks: {},
  pushes: 0,

  push: (plugin) => {
    const { stacks, pushes } = get()
    const stack = stacks[plugin.id]
    const top = stack?.past.at(-1)
    // A push of the state recorded last is skipped
    if (top !== undefined && doesShow(top, plugin)) return
    const past = [...(stack?.past ?? []), snapshotOf(plugin)].slice(-HISTORY_TAB_LIMIT)
    set({
      stacks: evictOverTotal({ ...stacks, [plugin.id]: { past, future: [], lastPush: pushes } }),
      pushes: pushes + 1
    })
  },

  // The app records each state once edits pause, so the newest entry of `past` is the state
  // shown unless an edit is still waiting to be recorded
  undo: (current) => {
    const { stacks } = get()
    const stack = stacks[current.id]
    if (stack === undefined) return null
    const top = stack.past.at(-1)
    const isShown = top !== undefined && doesShow(top, current)
    const earlier = isShown ? stack.past.slice(0, -1) : stack.past
    const previous = earlier.at(-1)
    if (previous === undefined) return null

    // `previous` stays the newest entry: it is the state shown from now on
    const shownEntry = isShown ? top : snapshotOf(current)
    set({
      stacks: {
        ...stacks,
        [current.id]: { ...stack, past: earlier, future: [shownEntry, ...stack.future] }
      }
    })
    return previous
  },

  redo: (current) => {
    const { stacks } = get()
    const stack = stacks[current.id]
    const next = stack?.future.at(0)
    if (stack === undefined || next === undefined) return null

    const top = stack.past.at(-1)
    const unrecorded = top !== undefined && doesShow(top, current) ? [] : [snapshotOf(current)]
    set({
      stacks: {
        ...stacks,
        [current.id]: {
          ...stack,
          past: [...stack.past, ...unrecorded, next],
          future: stack.future.slice(1)
        }
      }
    })
    return next
  },

  forget: (id) => {
    dropPending(id)
    const { [id]: forgotten, ...rest } = get().stacks
    if (forgotten !== undefined) set({ stacks: rest })
  }
}))

/**
Records the change of tab `id` still waiting for its edits to pause, at once, as a step of its
own.
*/
export function commitPending(id: string): void {
  const change = dropPending(id)
  if (change !== undefined) useHistoryStore.getState().push(change.plugin)
}

type RecordedStore = Pick<
  StoreApi<{ openPlugins: readonly PluginDefinition[] }>,
  'getState' | 'subscribe'
>

/**
Records the undo history of every open tab of `source`: each tab's state at start, a tab opened
later at once, and a changed tab once edits to it pause for `HISTORY_QUIET_MS`. Returns the stop.
*/
export function startHistoryRecording(source: RecordedStore): () => void {
  let seen = new Map<string, PluginDefinition>()
  const record = (openPlugins: readonly PluginDefinition[]): void => {
    const next = new Map<string, PluginDefinition>()
    for (const tab of openPlugins) {
      next.set(tab.id, tab)
      const before = seen.get(tab.id)
      if (before === undefined) {
        dropPending(tab.id)
        useHistoryStore.getState().push(tab)
      } else if (before !== tab) {
        dropPending(tab.id)
        const timer = setTimeout(() => {
          commitPending(tab.id)
        }, HISTORY_QUIET_MS)
        pending.set(tab.id, { timer, plugin: tab })
      }
    }
    for (const id of seen.keys()) if (!next.has(id)) dropPending(id)
    seen = next
  }

  record(source.getState().openPlugins)
  const unsubscribe = source.subscribe((state, previous) => {
    if (state.openPlugins !== previous.openPlugins) record(state.openPlugins)
  })
  return () => {
    unsubscribe()
    for (const id of seen.keys()) dropPending(id)
  }
}
