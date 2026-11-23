import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  HISTORY_QUIET_MS,
  HISTORY_TAB_LIMIT,
  HISTORY_TOTAL_LIMIT,
  startHistoryRecording,
  useHistoryStore,
  type HistorySnapshot
} from '../../src/renderer/src/stores/history-store'
import { usePluginStore } from '../../src/renderer/src/stores/plugin-store'
import {
  createEmptyPlugin,
  type PluginDefinition,
  type PluginParameter
} from '../../src/renderer/src/types/plugin'
import { resetStores } from './support/reset-stores'

function createPlugin(name: string): PluginDefinition {
  const plugin = createEmptyPlugin()
  plugin.meta.name = name
  return plugin
}

// The plugin the app shows now
const shown = (): PluginDefinition => usePluginStore.getState().plugin

// What the app records once edits to the tab shown pause
function record(): void {
  useHistoryStore.getState().push(shown())
}

// One edit to the tab shown, recorded
function editShown(description: string): void {
  usePluginStore.getState().updateMeta({ description })
  record()
}

// One undo step, its result shown as the app shows it
function undoShown(): void {
  const result = useHistoryStore.getState().undo(shown())
  if (result) usePluginStore.getState().setPlugin({ ...result }, true)
}

function stackOf(id: string): {
  past: readonly HistorySnapshot[]
  future: readonly HistorySnapshot[]
} {
  return useHistoryStore.getState().stacks[id] ?? { past: [], future: [] }
}

const descriptions = (entries: readonly HistorySnapshot[]): string[] =>
  entries.map((entry) => entry.meta.description)

// A version of `plugin` that differs in its description only
const withDescription = (plugin: PluginDefinition, description: string): PluginDefinition => ({
  ...plugin,
  meta: { ...plugin.meta, description }
})

// Opens tabs A and B, then gives A, shown, one recorded edit to undo
function openAWithAnEditAndB(): { a: PluginDefinition; b: PluginDefinition } {
  const b = createPlugin('B')
  const a = createPlugin('A')
  usePluginStore.getState().openPlugin(b)
  usePluginStore.getState().openPlugin(a)
  record()
  editShown('edit in A')
  return { a, b }
}

describe('undo history across a tab switch', () => {
  beforeEach(resetStores)

  it('switching to another tab and back keeps the first tab’s undo', () => {
    const { a, b } = openAWithAnEditAndB()
    usePluginStore.getState().setActivePlugin(b.id)
    usePluginStore.getState().setActivePlugin(a.id)
    undoShown()

    expect({ id: shown().id, description: shown().meta.description }).toStrictEqual({
      id: a.id,
      description: ''
    })
  })

  it('edits and undo in the second tab never change the first tab’s history', () => {
    const { a, b } = openAWithAnEditAndB()
    const historyOfA = stackOf(a.id)
    usePluginStore.getState().setActivePlugin(b.id)
    record()
    editShown('edit in B')
    undoShown()
    usePluginStore.getState().setActivePlugin(a.id)

    expect({
      isAUnchanged: stackOf(a.id) === historyOfA,
      a: descriptions(stackOf(a.id).past),
      b: { past: descriptions(stackOf(b.id).past), future: descriptions(stackOf(b.id).future) }
    }).toStrictEqual({
      isAUnchanged: true,
      a: ['', 'edit in A'],
      b: { past: [''], future: ['edit in B'] }
    })
  })
})

// Pushes `count` different states of the tab `plugin`, numbered from 0
function pushEdits(plugin: PluginDefinition, count: number): void {
  for (let index = 0; index < count; index++) {
    useHistoryStore.getState().push(withDescription(plugin, `edit ${String(index)}`))
  }
}

describe('undo history limits', () => {
  beforeEach(resetStores)

  it('one tab keeps its newest steps up to the tab limit', () => {
    const plugin = createPlugin('A')
    pushEdits(plugin, 60)
    const kept = stackOf(plugin.id).past

    expect(kept, `kept ${String(kept.length)} of 60`).toHaveLength(HISTORY_TAB_LIMIT)
    expect(kept[0]?.meta.description).toBe('edit 10')
    expect(HISTORY_TAB_LIMIT).toBe(50)
  })

  it('all tabs keep the total limit, dropping the oldest steps of the tab pushed least recently', () => {
    const tabs = ['A', 'B', 'C', 'D', 'E'].map((name) => createPlugin(name))
    for (const tab of tabs.slice(0, 4)) pushEdits(tab, 41)
    // A was pushed least recently, so the 14 steps past the total come out of A
    pushEdits(tabs[4] ?? createPlugin('none'), 50)
    const counts = tabs.map((tab) => stackOf(tab.id).past.length)
    const total = counts.reduce((sum, count) => sum + count, 0)

    expect({ counts, total }, `total ${String(total)}`).toStrictEqual({
      counts: [27, 41, 41, 41, 50],
      total: HISTORY_TOTAL_LIMIT
    })
    expect(stackOf(tabs[0]?.id ?? '').past[0]?.meta.description).toBe('edit 14')
    expect(HISTORY_TOTAL_LIMIT).toBe(200)
  })
})

describe('undo history entries', () => {
  beforeEach(resetStores)

  it('an entry is the tab without its file text, sharing its parts, with no text copy or time', () => {
    const plugin = { ...createPlugin('A'), rawSource: '/* file text */' }
    useHistoryStore.getState().push(plugin)
    const entry = stackOf(plugin.id).past[0]

    expect({
      keys: Object.keys(entry ?? {}),
      sharesParameters: entry?.parameters === plugin.parameters,
      sharesMeta: entry?.meta === plugin.meta
    }).toStrictEqual({
      keys: Object.keys(plugin).filter((key) => key !== 'rawSource'),
      sharesParameters: true,
      sharesMeta: true
    })
  })

  it('states that differ only in key order or a key left undefined are one step', () => {
    const parameter: PluginParameter = {
      id: 'p',
      name: 'speed',
      text: 'Speed',
      desc: '',
      type: 'number',
      default: 1
    }
    const plugin = { ...createPlugin('A'), parameters: [parameter] }
    const { meta, ...rest } = plugin
    const { name, ...metaRest } = meta
    const reordered: PluginDefinition = {
      meta: { ...metaRest, name },
      ...rest,
      parameters: [{ ...parameter, min: undefined }]
    }
    useHistoryStore.getState().push(plugin)
    useHistoryStore.getState().push(reordered)

    expect(stackOf(plugin.id).past).toHaveLength(1)
  })
})

// An imported tab A: its file text and the file it was read from
function openImported(): PluginDefinition {
  const plugin: PluginDefinition = {
    ...createPlugin('A'),
    importedFrom: 'A.js',
    rawSource: '/* A as read */'
  }
  usePluginStore.getState().openPlugin(plugin)
  return plugin
}

const FILE_BASE = { path: '/fixture/mz-project/js/plugins/A.js', sha256: '0'.repeat(64) }

const FROM_FILE = 'from the file'

// The project's file of the tab shown read again, with a description of its own
function reloadFromFile(): void {
  const plugin = shown()
  usePluginStore
    .getState()
    .reattachSource(plugin.id, '/* A as read again */', withDescription(plugin, FROM_FILE), {
      keepTab: false,
      base: FILE_BASE
    })
}

// Shows a state from the history as the app does: with the file text of the tab shown
function showKeepingFile(result: HistorySnapshot | null): void {
  if (result === null) return
  const { rawSource } = shown()
  usePluginStore
    .getState()
    .setPlugin(rawSource === undefined ? { ...result } : { ...result, rawSource }, true)
}

const undoKeepingFile = (): void => {
  showKeepingFile(useHistoryStore.getState().undo(shown()))
}

const redoKeepingFile = (): void => {
  showKeepingFile(useHistoryStore.getState().redo(shown()))
}

const pushCount = (): number => useHistoryStore.getState().pushes

// The recorder a test started, stopped after the test
const recording = {
  stop: () => {
    // nothing records before a test starts the recorder
  }
}

const startRecording = (): void => {
  recording.stop = startHistoryRecording(usePluginStore)
}

function setUpRecording(): void {
  resetStores()
  vi.useFakeTimers()
}

function tearDownRecording(): void {
  recording.stop()
  vi.useRealTimers()
}

describe('undo history recording', () => {
  beforeEach(setUpRecording)

  afterEach(tearDownRecording)

  it('records every open tab at start, a new tab at once and an edit once edits to its tab pause', () => {
    const a = createPlugin('A')
    usePluginStore.getState().openPlugin(a)
    startRecording()
    const b = createPlugin('B')
    usePluginStore.getState().openPlugin(b)
    const atOpen = { a: stackOf(a.id).past.length, b: stackOf(b.id).past.length }
    usePluginStore.getState().updateMeta({ description: 'first' })
    vi.advanceTimersByTime(HISTORY_QUIET_MS - 100)
    usePluginStore.getState().updateMeta({ description: 'second' })
    vi.advanceTimersByTime(HISTORY_QUIET_MS - 100)
    const beforePause = descriptions(stackOf(b.id).past)
    vi.advanceTimersByTime(100)

    expect({ atOpen, beforePause, after: descriptions(stackOf(b.id).past) }).toStrictEqual({
      atOpen: { a: 1, b: 1 },
      beforePause: [''],
      after: ['', 'second']
    })
    expect(HISTORY_QUIET_MS).toBe(500)
  })

  it('a save that changes only the file text records nothing', () => {
    const a = openImported()
    startRecording()
    const before = pushCount()
    usePluginStore.getState().recordSaves([
      {
        id: a.id,
        saved: shown(),
        path: FILE_BASE.path,
        sha256: FILE_BASE.sha256,
        written: '/* A saved */'
      }
    ])
    vi.advanceTimersByTime(HISTORY_QUIET_MS * 2)

    expect({ fileText: shown().rawSource, pushes: pushCount() - before }).toStrictEqual({
      fileText: '/* A saved */',
      pushes: 0
    })
  })

  it('undo then redo records nothing', () => {
    const a = createPlugin('A')
    usePluginStore.getState().openPlugin(a)
    startRecording()
    usePluginStore.getState().updateMeta({ description: 'edit' })
    vi.advanceTimersByTime(HISTORY_QUIET_MS)
    const before = pushCount()
    undoKeepingFile()
    vi.advanceTimersByTime(HISTORY_QUIET_MS * 2)
    redoKeepingFile()
    vi.advanceTimersByTime(HISTORY_QUIET_MS * 2)

    expect({
      pushes: pushCount() - before,
      shown: shown().meta.description,
      past: descriptions(stackOf(a.id).past)
    }).toStrictEqual({ pushes: 0, shown: 'edit', past: ['', 'edit'] })
  })
})

describe('undo history around a reload from the project', () => {
  beforeEach(setUpRecording)

  afterEach(tearDownRecording)

  it('a reload from the project during an edit’s quiet period records the edit, then the reload', () => {
    const a = openImported()
    startRecording()
    usePluginStore.getState().updateMeta({ description: 'edit' })
    vi.advanceTimersByTime(HISTORY_QUIET_MS - 100)
    reloadFromFile()
    const recorded = descriptions(stackOf(a.id).past)
    vi.advanceTimersByTime(HISTORY_QUIET_MS * 2)
    const afterPause = descriptions(stackOf(a.id).past)
    undoKeepingFile()
    const firstUndo = shown().meta.description
    undoKeepingFile()

    expect({ recorded, afterPause, firstUndo, secondUndo: shown().meta.description }).toStrictEqual(
      {
        recorded: ['', 'edit', FROM_FILE],
        afterPause: ['', 'edit', FROM_FILE],
        firstUndo: 'edit',
        secondUndo: ''
      }
    )
  })

  it('a reload from the project alone is one undo step, recorded at once', () => {
    const a = openImported()
    startRecording()
    const before = pushCount()
    reloadFromFile()
    const atOnce = descriptions(stackOf(a.id).past)
    vi.advanceTimersByTime(HISTORY_QUIET_MS * 2)

    expect({
      atOnce,
      pushes: pushCount() - before,
      past: descriptions(stackOf(a.id).past)
    }).toStrictEqual({ atOnce: ['', FROM_FILE], pushes: 1, past: ['', FROM_FILE] })
  })
})
