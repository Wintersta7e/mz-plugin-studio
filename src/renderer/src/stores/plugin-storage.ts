// How the plugin store keeps its open tabs: an index naming the tabs in order and the active one,
// one key per tab holding its definition, unsaved mark, saved path and file, and for a tab with
// file text a content key holding that text and the last-saved copy, numbered so a new one is
// written beside the old. A flush writes the changed content keys, then the tabs that changed,
// then the index, then removes the keys of closed tabs and replaced content, so a flush cut off at
// any write still loads each tab whole.
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

/**
@internal exported for tests
*/
export const CONTENT_KEY_PREFIX = `${INDEX_KEY}.src.`

const tabKeyOf = (id: string): string => TAB_KEY_PREFIX + id

const contentKeyOf = (id: string, number: number): string =>
  `${CONTENT_KEY_PREFIX}${id}.${String(number)}`

// The id and number a content key names, if it is one
function contentKeyParts(key: string): { id: string; number: number } | undefined {
  if (!key.startsWith(CONTENT_KEY_PREFIX)) return undefined
  const match = /^(.+)\.([1-9]\d{0,15})$/.exec(key.slice(CONTENT_KEY_PREFIX.length))
  const [, id, number] = match ?? []
  return id !== undefined && PLUGIN_ID_PATTERN.test(id) ? { id, number: Number(number) } : undefined
}

// The tab-keyed maps of the stored state, each holding a tab's part of its key
const TAB_PARTS = [
  ['savedPath', 'savedPathsByPluginId'],
  ['base', 'baseByPluginId']
] as const

// What one tab key and its content key hold, as the store holds it; the writer compares each part
// by identity
interface TabSlice {
  definition: Record<string, unknown>
  dirty: boolean
  savedPath: unknown
  base: unknown
  rawSource: unknown
  baseline: unknown
}

const isSameSlice = (a: TabSlice | undefined, b: TabSlice): boolean =>
  a?.definition === b.definition &&
  a.dirty === b.dirty &&
  a.savedPath === b.savedPath &&
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
  const baselines = mapOf(state['baselineByPluginId'])
  const parts = TAB_PARTS.map(([, map]) => mapOf(state[map]))
  return listOf(state['openPlugins']).flatMap((definition): [string, TabSlice][] => {
    if (!isRecord(definition)) return []
    const { id, rawSource } = definition
    if (typeof id !== 'string' || !PLUGIN_ID_PATTERN.test(id)) return []
    const [savedPath, base] = parts.map((map) => map[id])
    const baseline = baselines[id]
    return [[id, { definition, dirty: dirty[id] === true, savedPath, base, rawSource, baseline }]]
  })
}

const hasContent = (slice: TabSlice): boolean =>
  slice.rawSource !== undefined || slice.baseline !== undefined

// A tab key's text, naming the content key that holds its file text; the code body is part of the
// file text and is not kept
function tabText(schema: unknown, slice: TabSlice, content: number | undefined): string {
  const { dirty, savedPath, base } = slice
  const definition = without(without(slice.definition, 'codeBody'), 'rawSource')
  return JSON.stringify({
    schemaVersion: schema,
    tab: { definition, dirty, savedPath, base, content }
  })
}

const contentText = (schema: unknown, slice: TabSlice): string =>
  JSON.stringify({ schemaVersion: schema, rawSource: slice.rawSource, baseline: slice.baseline })

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
// A content key known to hold a tab's file text: by the parts it was written from, or by its text
// when it was only read
interface HeldContent {
  number: number
  slice?: TabSlice
  text?: string | undefined
}

interface Memo {
  // each tab's parts as last written, and the content key its tab key names
  written: Map<string, { slice: TabSlice; content: number | undefined }>
  stored: Set<string> // ids whose tab key this store wrote or read
  loaded: Map<string, string> // text of each tab key read intact and not yet written
  indexText: string | undefined
  orphans: Set<string> // ids of tab keys to remove at the next write
  contents: Map<string, HeldContent> // the newest content key of each tab
  contentKeys: Map<string, string> // content keys this store wrote or read, with their tab's id
  highest: Map<string, number> // the highest content key number storage holds for each id
  contentOrphans: Set<string> // content keys to remove at the next write
  // read at the last load: tab and content keys no index lists, and the key each loaded tab and
  // file text came from
  unlisted: string[]
  unlistedContent: string[]
  sources: (string | undefined)[]
  sourceById: Map<string, string>
  contentSourceById: Map<string, string>
  recovered: FieldPath[] // the tabs opened from their keys with no index to list them
}

const emptyMemo = (): Memo => ({
  written: new Map(),
  stored: new Set(),
  loaded: new Map(),
  indexText: undefined,
  orphans: new Set(),
  contents: new Map(),
  contentKeys: new Map(),
  highest: new Map(),
  contentOrphans: new Set(),
  unlisted: [],
  unlistedContent: [],
  sources: [],
  sourceById: new Map(),
  contentSourceById: new Map(),
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
    ['baselineByPluginId', tab['baseline']],
    ...TAB_PARTS.map(([part, map]): [string, unknown] => [map, tab[part]])
  ]
  for (const [map, value] of parts) {
    const entries = state[map] ?? {}
    if (!isRecord(entries)) continue
    const others = without(entries, id)
    state[map] = value === undefined ? others : { ...others, [id]: value }
  }
}

// The file text and last-saved copy the tab key of `id` names in `tab`: undefined when it names
// none, the text to keep as a backup when the content key is missing or holds no content
function readContent(
  memo: Memo,
  saved: SavedKeys,
  id: string,
  tab: Record<string, unknown>,
  tabRaw: string
): { content: Record<string, unknown> } | { lost: string } | undefined {
  const { content: number } = tab
  if (number === undefined) return undefined
  if (typeof number !== 'number') return { lost: tabRaw }
  const key = contentKeyOf(id, number)
  const raw = saved.read(key)
  if (raw === null) return { lost: tabRaw }
  let value: unknown
  try {
    value = JSON.parse(raw)
  } catch {
    return { lost: raw }
  }
  if (!isRecord(value)) return { lost: raw }
  const schema = schemaOf(value)
  if (schema > saved.schema) saved.report('newer-schema', saved.backUp(raw))
  else if (schema === saved.schema) memo.contents.set(id, { number, text: raw })
  memo.contentKeys.set(key, id)
  memo.contentSourceById.set(id, key)
  return { content: value }
}

// `tab` with the file text and last-saved copy of `content` in place of the number naming them
function withContent(
  tab: Record<string, unknown>,
  content: Record<string, unknown> | undefined
): Record<string, unknown> {
  const definition = mapOf(tab['definition'])
  const rawSource = content?.['rawSource']
  return {
    ...without(tab, 'content'),
    definition: rawSource === undefined ? definition : { ...definition, rawSource },
    baseline: content?.['baseline']
  }
}

type TabRead = { tab: Record<string, unknown>; lost?: string } | { damaged: string } | undefined

// A tab read from its key: undefined when the key is missing, its text when it holds no tab;
// `lost` is the text to back up when its file text could not be read
function readTab(memo: Memo, saved: SavedKeys, id: string): TabRead {
  const raw = saved.read(tabKeyOf(id))
  if (raw === null) return undefined
  const parsed = parseTab(raw, id)
  if (parsed === undefined) return { damaged: raw }
  memo.stored.add(id)
  if (parsed.schema > saved.schema) saved.report('newer-schema', saved.backUp(raw))
  else if (parsed.schema === saved.schema) memo.loaded.set(id, raw)
  const read = readContent(memo, saved, id, parsed.tab, raw)
  return read !== undefined && 'lost' in read
    ? { tab: withContent(parsed.tab, undefined), lost: read.lost }
    : { tab: withContent(parsed.tab, read?.content) }
}

// The place of a tab's file text in the state, for a report
const fileTextAt = (position: number): FieldPath => [
  { key: 'openPlugins' },
  { index: position },
  { key: 'rawSource' }
]

// Whether a loaded field at `path` was read from a tab's content key: its last-saved copy or its
// file text
function isContentPath([first, , inside]: FieldPath): boolean {
  const isBaseline = first !== undefined && 'key' in first && first.key === 'baselineByPluginId'
  return isBaseline || (inside !== undefined && 'key' in inside && inside.key === 'rawSource')
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
      if (read.lost === undefined) continue
      saved.report('entries-dropped', saved.backUp(read.lost), [fileTextAt(position)])
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
    memo.unlistedContent = saved
      .keys()
      .filter((key) => contentKeyParts(key) !== undefined && !memo.contentKeys.has(key))
  }
  return state
}

// No index to trust: every intact tab key is opened, and none is removed
function decodeAdopted(memo: Memo, saved: SavedKeys): Record<string, unknown> | undefined {
  const adopted = storedTabIds(saved).flatMap((id) => {
    const read = readTab(memo, saved, id)
    return read === undefined || 'damaged' in read ? [] : { id, ...read }
  })
  if (adopted.length === 0) return undefined
  const state: Record<string, unknown> = {
    schemaVersion: saved.schema,
    openPlugins: [],
    activePluginId: adopted[0]?.id
  }
  for (const [at, { id, tab, lost }] of adopted.entries()) {
    addTab(memo, state, id, tab)
    if (lost !== undefined) saved.report('entries-dropped', saved.backUp(lost), [fileTextAt(at)])
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
    // a tab key whose file text cannot be read leaves the copy the index holds
    const read = readContent(memo, saved, id, parsed.tab, raw)
    if (read !== undefined && 'lost' in read) continue
    placeTab(state, at, id, withContent(parsed.tab, read?.content))
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

// Whether the content key `held` holds the file text and last-saved copy of `slice`; a key only
// read is compared by its text once, then by the parts it holds
function isHeldContent(held: HeldContent, schema: unknown, slice: TabSlice): boolean {
  if (held.slice !== undefined) {
    return held.slice.rawSource === slice.rawSource && held.slice.baseline === slice.baseline
  }
  if (held.text !== contentText(schema, slice)) return false
  held.slice = slice
  held.text = undefined
  return true
}

// The number of the content key holding the file text of `slice` once this flush ran: the one that
// holds it already, or a new one, whose write goes into `steps`
function contentFor(
  memo: Memo,
  schema: unknown,
  [id, slice]: [string, TabSlice],
  steps: WriteStep[]
): number | undefined {
  if (!hasContent(slice)) return undefined
  const held = memo.contents.get(id)
  if (held !== undefined && isHeldContent(held, schema, slice)) return held.number
  const number = 1 + Math.max(memo.highest.get(id) ?? 0, held?.number ?? 0)
  const key = contentKeyOf(id, number)
  steps.push({
    key,
    text: () => contentText(schema, slice),
    onWritten: () => {
      memo.contents.set(id, { number, slice })
      memo.contentKeys.set(key, id)
      memo.contentOrphans.delete(key)
      memo.highest.set(id, Math.max(memo.highest.get(id) ?? 0, number))
    }
  })
  return number
}

// The removal of each content key no open tab names once this flush ran
function contentRemovals(memo: Memo, named: Set<string>): WriteStep[] {
  const unnamed = new Set(memo.contentKeys.keys()).union(memo.contentOrphans).difference(named)
  return [...unnamed].map((key) => ({
    key,
    remove: true,
    onWritten: () => {
      const id = memo.contentKeys.get(key)
      const held = id === undefined ? undefined : memo.contents.get(id)
      if (id !== undefined && held !== undefined && contentKeyOf(id, held.number) === key) {
        memo.contents.delete(id)
      }
      memo.contentKeys.delete(key)
      memo.contentOrphans.delete(key)
    }
  }))
}

// The writes that store `state`: changed content keys, then changed tab keys, then the index, then
// the removals of closed tabs' keys and of content keys no tab names
function encodePlan(memo: Memo, state: Record<string, unknown>): WritePlan {
  const schema = state['schemaVersion']
  const slices = slicesOf(state)
  const open = new Set(slices.map(([id]) => id))
  const contentSteps: WriteStep[] = []
  const named = new Set<string>()
  const tabSteps = slices.flatMap((entry): WriteStep[] => {
    const [id, slice] = entry
    const content = contentFor(memo, schema, entry, contentSteps)
    if (content !== undefined) named.add(contentKeyOf(id, content))
    const written = memo.written.get(id)
    if (written !== undefined && written.content === content && isSameSlice(written.slice, slice)) {
      return []
    }
    return [
      {
        key: tabKeyOf(id),
        text: () => tabText(schema, slice, content),
        holds: memo.loaded.get(id),
        onWritten: () => {
          memo.written.set(id, { slice, content })
          memo.loaded.delete(id)
          memo.stored.add(id)
          memo.orphans.delete(id)
        }
      }
    ]
  })
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
  return [contentSteps, tabSteps, indexSteps, [...removals, ...contentRemovals(memo, named)]]
}

/**
The plugin store's storage: an index key, one key per open tab and one per tab's file text.
*/
export function pluginStorage(): StorageCodec {
  const held = { memo: emptyMemo() }
  return {
    encode: (state) => encodePlan(held.memo, state),

    decode: (index, saved) => {
      const memo = emptyMemo()
      held.memo = memo
      // a new content key never takes the number of one storage holds already
      for (const key of saved.keys()) {
        const parts = contentKeyParts(key)
        if (parts === undefined) continue
        memo.highest.set(parts.id, Math.max(memo.highest.get(parts.id) ?? 0, parts.number))
      }
      if (index === undefined) return decodeAdopted(memo, saved)
      const { tabIds } = index
      return Array.isArray(tabIds)
        ? decodeSplit(memo, index, tabIds, saved)
        : decodeMonolithic(memo, index, saved)
    },

    // a tab read from its own key: its place in the open tabs, or its entry in a tab-keyed map; its
    // file text and last-saved copy were read from its content key
    sourceOf: (path) => {
      const [, step] = path
      if (step === undefined || 'key' in step) return INDEX_KEY
      const { memo } = held
      const source = 'index' in step ? memo.sources[step.index] : memo.sourceById.get(step.entry)
      const id = 'index' in step ? source?.slice(TAB_KEY_PREFIX.length) : step.entry
      const content =
        id !== undefined && isContentPath(path) ? memo.contentSourceById.get(id) : undefined
      return content ?? source ?? INDEX_KEY
    },

    recovered: () => held.memo.recovered,

    settle: (isClean) => {
      if (!isClean) return
      held.memo.orphans = new Set(held.memo.unlisted)
      held.memo.contentOrphans = new Set(held.memo.unlistedContent)
    }
  }
}
