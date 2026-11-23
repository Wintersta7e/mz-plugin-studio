// How the plugin store keeps its open tabs: an index naming the tabs in order and the active one,
// and one key per tab holding its definition, unsaved mark, saved path, last-saved copy and file.
// A flush writes only the tabs that changed, then the index, then removes the keys of closed tabs,
// so a flush cut off at any write still loads each tab whole.
import {
  isRecord,
  schemaOf,
  type FieldPath,
  type SavedKeys,
  type StorageCodec,
  type WritePlan,
  type WriteStep
} from './persist'

const INDEX_KEY = 'mz-plugin-studio-plugin'

/**
@internal exported for tests
*/
export const TAB_KEY_PREFIX = `${INDEX_KEY}.tab.`

/**
Every id the app makes matches; only an id that does can name a key, so a tab key never ends like
a backup or equals another key.
*/
export const PLUGIN_ID_PATTERN = /^[\da-z-]{1,64}$/i

const tabKeyOf = (id: string): string => TAB_KEY_PREFIX + id

// The tab-keyed maps of the stored state, each holding a tab's part of its key
const TAB_PARTS = [
  ['savedPath', 'savedPathsByPluginId'],
  ['baseline', 'baselineByPluginId'],
  ['base', 'baseByPluginId']
] as const

// What one tab key holds, as the store holds it; the writer compares each part by identity
interface TabSlice {
  definition: Record<string, unknown>
  dirty: boolean
  savedPath: unknown
  baseline: unknown
  base: unknown
}

const isSameSlice = (a: TabSlice | undefined, b: TabSlice): boolean =>
  a?.definition === b.definition &&
  a.dirty === b.dirty &&
  a.savedPath === b.savedPath &&
  a.baseline === b.baseline &&
  a.base === b.base

const mapOf = (value: unknown): Record<string, unknown> => (isRecord(value) ? value : {})

const listOf = (value: unknown): unknown[] => {
  if (!Array.isArray(value)) return []
  const list: unknown[] = value
  return list
}

// The record without `key`
const without = (record: Record<string, unknown>, key: string): Record<string, unknown> =>
  Object.fromEntries(Object.entries(record).filter(([entry]) => entry !== key))

// Each open tab an id can name, in tab order, with its parts
function slicesOf(state: Record<string, unknown>): [string, TabSlice][] {
  const dirty = mapOf(state['dirtyByPluginId'])
  const parts = TAB_PARTS.map(([, map]) => mapOf(state[map]))
  return listOf(state['openPlugins']).flatMap((definition): [string, TabSlice][] => {
    if (!isRecord(definition)) return []
    const { id } = definition
    if (typeof id !== 'string' || !PLUGIN_ID_PATTERN.test(id)) return []
    const [savedPath, baseline, base] = parts.map((map) => map[id])
    return [[id, { definition, dirty: dirty[id] === true, savedPath, baseline, base }]]
  })
}

// A tab key's text; the code body is part of the file text and is not kept
function tabText(schema: unknown, slice: TabSlice): string {
  const { dirty, savedPath, baseline, base } = slice
  return JSON.stringify({
    schemaVersion: schema,
    tab: { definition: without(slice.definition, 'codeBody'), dirty, savedPath, baseline, base }
  })
}

// A tab key's contents when it holds a tab record for `id`
function parseTab(
  raw: string,
  id: string
): { schema: number; tab: Record<string, unknown> } | undefined {
  let value: unknown
  try {
    value = JSON.parse(raw)
  } catch {
    return undefined
  }
  if (!isRecord(value) || !isRecord(value['tab'])) return undefined
  const { definition } = value['tab']
  return isRecord(definition) && definition['id'] === id
    ? { schema: schemaOf(value), tab: value['tab'] }
    : undefined
}

// The plugin name a tab shows, if it has one
const nameOf = (definition: unknown): string | undefined => {
  const meta = isRecord(definition) ? definition['meta'] : undefined
  return isRecord(meta) && typeof meta['name'] === 'string' ? meta['name'] : undefined
}

const byCodeUnits = (a: string, b: string): number => {
  if (a < b) return -1
  return a > b ? 1 : 0
}

// The ids of every tab key storage holds, in code-unit order
const storedTabIds = (saved: SavedKeys): string[] =>
  saved
    .keys()
    .filter((key) => key.startsWith(TAB_KEY_PREFIX))
    .map((key) => key.slice(TAB_KEY_PREFIX.length))
    .filter((id) => PLUGIN_ID_PATTERN.test(id))
    .toSorted(byCodeUnits)

// What the codec knows about storage: what it wrote and what the last load read
interface Memo {
  written: Map<string, TabSlice> // each tab's parts as last written
  stored: Set<string> // ids whose tab key this store wrote or read
  loaded: Map<string, string> // text of each tab key read intact and not yet written
  indexText: string | undefined
  orphans: Set<string> // ids of tab keys to remove at the next write
  // read at the last load: tab keys no index lists, and the key each loaded tab came from
  unlisted: string[]
  sources: (string | undefined)[]
  sourceById: Map<string, string>
  recovered: FieldPath[] // the tabs opened from their keys with no index to list them
}

const emptyMemo = (): Memo => ({
  written: new Map(),
  stored: new Set(),
  loaded: new Map(),
  indexText: undefined,
  orphans: new Set(),
  unlisted: [],
  sources: [],
  sourceById: new Map(),
  recovered: []
})

// Puts a tab read from its key into `state` at position `at`, its parts into the tab-keyed maps
function placeTab(
  state: Record<string, unknown>,
  at: number,
  id: string,
  tab: Record<string, unknown>
): void {
  const tabs = listOf(state['openPlugins'])
  tabs[at] = tab['definition']
  state['openPlugins'] = tabs
  const parts: [string, unknown][] = [
    ['dirtyByPluginId', tab['dirty'] === false ? undefined : tab['dirty']],
    ...TAB_PARTS.map(([part, map]): [string, unknown] => [map, tab[part]])
  ]
  for (const [map, value] of parts) {
    const entries = state[map] ?? {}
    if (!isRecord(entries)) continue
    const others = without(entries, id)
    state[map] = value === undefined ? others : { ...others, [id]: value }
  }
}

type TabRead = { tab: Record<string, unknown> } | { damaged: string } | undefined

// A tab read from its key: undefined when the key is missing, its text when it holds no tab
function readTab(memo: Memo, saved: SavedKeys, id: string): TabRead {
  const raw = saved.read(tabKeyOf(id))
  if (raw === null) return undefined
  const parsed = parseTab(raw, id)
  if (parsed === undefined) return { damaged: raw }
  memo.stored.add(id)
  if (parsed.schema > saved.schema) saved.report('newer-schema', saved.backUp(raw))
  else if (parsed.schema === saved.schema) memo.loaded.set(id, raw)
  return { tab: parsed.tab }
}

// Appends a tab read from its own key to the open tabs of `state`
function addTab(
  memo: Memo,
  state: Record<string, unknown>,
  id: string,
  tab: Record<string, unknown>
): void {
  placeTab(state, memo.sources.length, id, tab)
  memo.sources.push(tabKeyOf(id))
  memo.sourceById.set(id, tabKeyOf(id))
}

// Tabs in the order the index lists them, each from its own key
function decodeSplit(
  memo: Memo,
  index: Record<string, unknown>,
  listed: unknown[],
  saved: SavedKeys
): Record<string, unknown> {
  const state: Record<string, unknown> = {
    schemaVersion: schemaOf(index),
    openPlugins: [],
    activePluginId: index['activePluginId']
  }
  const missing: FieldPath[] = []
  let isClean = true
  for (const [position, id] of listed.entries()) {
    const at: FieldPath = [{ key: 'openPlugins' }, { index: position }]
    const read =
      typeof id === 'string' && PLUGIN_ID_PATTERN.test(id) ? readTab(memo, saved, id) : undefined
    if (typeof id !== 'string' || read === undefined) {
      missing.push(at)
    } else if ('damaged' in read) {
      saved.report('entries-dropped', saved.backUp(read.damaged), [at])
    } else {
      addTab(memo, state, id, read.tab)
      continue
    }
    isClean = false
  }
  const raw = saved.read(INDEX_KEY)
  if (raw !== null && missing.length > 0) {
    saved.report('entries-dropped', saved.backUp(raw), missing)
  }
  memo.indexText = raw ?? undefined
  if (isClean && schemaOf(index) === saved.schema) {
    const listedIds = new Set(listed)
    memo.unlisted = storedTabIds(saved).filter((id) => !listedIds.has(id))
  }
  return state
}

// No index to trust: every intact tab key is opened, and none is removed
function decodeAdopted(memo: Memo, saved: SavedKeys): Record<string, unknown> | undefined {
  const adopted = storedTabIds(saved).flatMap((id) => {
    const read = readTab(memo, saved, id)
    return read === undefined || 'damaged' in read ? [] : { id, tab: read.tab }
  })
  if (adopted.length === 0) return undefined
  const state: Record<string, unknown> = {
    schemaVersion: saved.schema,
    openPlugins: [],
    activePluginId: adopted[0]?.id
  }
  for (const [at, { id, tab }] of adopted.entries()) {
    addTab(memo, state, id, tab)
    const name = nameOf(tab['definition'])
    memo.recovered.push([
      { key: 'openPlugins' },
      name === undefined ? { index: at } : { index: at, name }
    ])
  }
  return state
}

// An index an earlier version wrote, holding every tab: a tab key written by a flush the process
// did not finish is newer than the tab it holds
function decodeMonolithic(
  memo: Memo,
  index: Record<string, unknown>,
  saved: SavedKeys
): Record<string, unknown> {
  const tabs = [...listOf(index['openPlugins'])]
  const state: Record<string, unknown> = {
    ...index,
    ...(Array.isArray(index['openPlugins']) && { openPlugins: tabs })
  }
  for (const [at, entry] of tabs.entries()) {
    const id = isRecord(entry) ? entry['id'] : undefined
    if (typeof id !== 'string' || !PLUGIN_ID_PATTERN.test(id)) continue
    const raw = saved.read(tabKeyOf(id))
    const parsed = raw === null ? undefined : parseTab(raw, id)
    if (raw === null || parsed?.schema !== saved.schema) continue
    placeTab(state, at, id, parsed.tab)
    memo.stored.add(id)
    memo.loaded.set(id, raw)
    memo.sources[at] = tabKeyOf(id)
    memo.sourceById.set(id, tabKeyOf(id))
    if (id !== state['activePluginId']) continue
    delete state['plugin']
    delete state['isDirty']
    delete state['savedPath']
  }
  return state
}

// The writes that store `state`: changed tab keys, then the index, then closed tabs' removals
function encodePlan(memo: Memo, state: Record<string, unknown>): WritePlan {
  const schema = state['schemaVersion']
  const slices = slicesOf(state)
  const open = new Set(slices.map(([id]) => id))
  const tabSteps = slices
    .filter(([id, slice]) => !isSameSlice(memo.written.get(id), slice))
    .map(([id, slice]): WriteStep => ({
      key: tabKeyOf(id),
      text: () => tabText(schema, slice),
      holds: memo.loaded.get(id),
      onWritten: () => {
        memo.written.set(id, slice)
        memo.loaded.delete(id)
        memo.stored.add(id)
        memo.orphans.delete(id)
      }
    }))
  const indexText = JSON.stringify({
    state: { schemaVersion: schema, tabIds: [...open], activePluginId: state['activePluginId'] },
    version: 0
  })
  const indexSteps: WriteStep[] =
    indexText === memo.indexText
      ? []
      : [
          {
            key: INDEX_KEY,
            text: () => indexText,
            onWritten: () => {
              memo.indexText = indexText
            }
          }
        ]
  const removals = [...memo.stored.union(memo.orphans).difference(open)].map((id): WriteStep => ({
    key: tabKeyOf(id),
    remove: true,
    onWritten: () => {
      memo.stored.delete(id)
      memo.orphans.delete(id)
      memo.written.delete(id)
    }
  }))
  return [tabSteps, indexSteps, removals]
}

/**
The plugin store's storage: an index key and one key per open tab.
*/
export function pluginStorage(): StorageCodec {
  const held = { memo: emptyMemo() }
  return {
    encode: (state) => encodePlan(held.memo, state),

    decode: (index, saved) => {
      const memo = emptyMemo()
      held.memo = memo
      if (index === undefined) return decodeAdopted(memo, saved)
      const { tabIds } = index
      return Array.isArray(tabIds)
        ? decodeSplit(memo, index, tabIds, saved)
        : decodeMonolithic(memo, index, saved)
    },

    // a tab read from its own key: its place in the open tabs, or its entry in a tab-keyed map
    sourceOf: ([, step]) => {
      if (step === undefined || 'key' in step) return INDEX_KEY
      const { memo } = held
      const source = 'index' in step ? memo.sources[step.index] : memo.sourceById.get(step.entry)
      return source ?? INDEX_KEY
    },

    recovered: () => held.memo.recovered,

    settle: (isClean) => {
      if (isClean) held.memo.orphans = new Set(held.memo.unlisted)
    }
  }
}
