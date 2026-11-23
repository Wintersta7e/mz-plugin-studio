// The plugin store keeps an index of its tabs and one key per tab. A flush cut off at any write
// still loads every tab whole, from before or after that flush; a damaged tab key is backed up and
// reported while the other tabs load; tab keys no index lists are removed only under an index this
// version wrote and read cleanly.
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type * as Persist from '../../src/renderer/src/stores/persist'
import { createEmptyPlugin } from '../../src/renderer/src/types/plugin'
import { readPayloads } from '../helpers/persisted-payloads'
import { flushStores, loadStores, seed } from './support/load-persisted'
import {
  envelopeOf,
  recordOf,
  storedPluginState,
  typedStores,
  type TypedStores
} from './support/persisted-state'

const INDEX = 'mz-plugin-studio-plugin'
const BACKUP = `${INDEX}.backup`
const tabKey = (id: string): string => `${INDEX}.tab.${id}`

// The real storage calls, bound before any test wraps them
const realSetItem = Storage.prototype.setItem.bind(localStorage)
const realRemoveItem = Storage.prototype.removeItem.bind(localStorage)

const plugin = (id: string, name: string) => {
  const empty = createEmptyPlugin()
  return { ...empty, id, meta: { ...empty.meta, name } }
}

// Every key storage holds, with its text
function storage(): Record<string, string> {
  return Object.fromEntries(
    Object.keys(localStorage).map((key) => [key, localStorage.getItem(key) ?? ''])
  )
}

const byCodeUnit = (a: string, b: string): number => {
  if (a < b) return -1
  return a > b ? 1 : 0
}

const tabKeys = (): string[] =>
  Object.keys(localStorage)
    .filter((key) => key.startsWith(`${INDEX}.tab.`))
    .toSorted(byCodeUnit)

async function load(): Promise<TypedStores & { persist: typeof Persist }> {
  const stores = await typedStores(await loadStores())
  const persist = await import('../../src/renderer/src/stores/persist')
  return { ...stores, persist }
}

// Each open tab's stored parts after a load, as one text per tab id
function tabsShown(state: ReturnType<TypedStores['plugin']['getState']>): Map<string, string> {
  return new Map(
    state.openPlugins.map((tab) => [
      tab.id,
      JSON.stringify({
        definition: tab,
        dirty: state.dirtyByPluginId[tab.id] === true,
        savedPath: state.savedPathsByPluginId[tab.id],
        baseline: state.baselineByPluginId[tab.id],
        base: state.baseByPluginId[tab.id]
      })
    ])
  )
}

type CutMode = 'process gone' | 'storage full'

// Storage writes and removals from now on: the first `landing` land. In 'process gone' every
// later one is lost; in 'storage full' the next one throws a full quota and the rest of that flush
// lands. Returns how many were made and a switch that loses every later one.
function cutWrites(
  landing: number,
  mode: CutMode
): { count: () => number; endProcess: () => void } {
  const writes = { count: 0, isGone: false }
  const land = (write: () => void): void => {
    writes.count += 1
    if (writes.isGone) return
    if (writes.count <= landing) {
      write()
      return
    }
    if (mode === 'process gone') return
    if (writes.count === landing + 1) throw new DOMException('full', 'QuotaExceededError')
    write()
  }
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation((key: string, value: string) => {
    land(() => {
      realSetItem(key, value)
    })
  })
  vi.spyOn(Storage.prototype, 'removeItem').mockImplementation((key: string) => {
    land(() => {
      realRemoveItem(key)
    })
  })
  return {
    count: () => writes.count,
    endProcess: () => {
      writes.isGone = true
    }
  }
}

interface CutCase {
  name: string
  mode: CutMode
  // the storage the case starts from
  start: () => Record<string, string>
  // the changes whose flush is cut
  change: (stores: TypedStores) => void
}

// Tabs A to D, A active and B unsaved, as this version writes them
async function fourTabs(): Promise<Record<string, string>> {
  seed({})
  const { plugin: store } = await load()
  for (const name of ['A', 'B', 'C', 'D']) store.getState().openPlugin(plugin(`tab-${name}`, name))
  store.getState().setActivePlugin('tab-B')
  store.getState().setDirty(true)
  store.getState().setActivePlugin('tab-A')
  flushStores()
  return storage()
}

const FOUR_TABS: { value?: Record<string, string> } = {}

const IMPORTED_TAB = 'tab-I'
const FILE_TEXT = '/*:\n * @target MZ\n * @plugindesc Synthetic imported plugin\n */\n'
const FILE_PATH = '/fixture/mz-project/js/plugins/Synthetic_Imported.js'

// Tab A and an imported tab holding its file text, the imported one active, as this version
// writes them
async function importedTabs(): Promise<Record<string, string>> {
  seed({})
  const { plugin: store } = await load()
  store.getState().openPlugin(plugin('tab-A', 'A'))
  store.getState().openPlugin({
    ...plugin(IMPORTED_TAB, 'I'),
    rawSource: FILE_TEXT,
    importedFrom: 'Synthetic_Imported.js'
  })
  flushStores()
  return storage()
}

const IMPORTED: { value?: Record<string, string> } = {}

const CUT_CASES: CutCase[] = [
  {
    name: 'a flush that changes two tabs, closes a third and switches the active tab',
    mode: 'process gone',
    start: () => FOUR_TABS.value ?? {},
    change: ({ plugin: store }) => {
      store.getState().updateMeta({ description: 'later A' })
      store.getState().setActivePlugin('tab-B')
      store.getState().updateMeta({ description: 'later B' })
      store.getState().closePlugin('tab-C')
      store.getState().setActivePlugin('tab-D')
    }
  },
  ...(['process gone', 'storage full'] as const).map((mode) => ({
    name: `the first flush of a v1.9.0 state, ${mode}`,
    mode,
    start: () => {
      return Object.fromEntries(Object.entries(readPayloads('v1.9.0')))
    },
    change: ({ plugin: store }: TypedStores) => {
      store.getState().updateMeta({ description: 'later active' })
      store.getState().setActivePlugin('00000000-0000-4000-8000-000000000101')
      store.getState().updateMeta({ description: 'later saved' })
    }
  })),
  {
    name: 'a save of an imported tab',
    mode: 'process gone',
    start: () => IMPORTED.value ?? {},
    change: ({ plugin: store }) => {
      store.getState().updateMeta({ description: 'saved later' })
      const saved = store.getState().plugin
      store.getState().recordSaves([
        {
          id: IMPORTED_TAB,
          saved,
          path: FILE_PATH,
          sha256: 'a'.repeat(64),
          written: `${FILE_TEXT}// saved later\n`
        }
      ])
    }
  }
]

// Loads `start`, makes the case's changes and flushes them with only `landing` writes landing,
// then loads what storage holds; returns the tabs shown and how many writes the flush made
async function cutAt(
  cutCase: CutCase,
  landing: number
): Promise<{ ids: string[]; tabs: Map<string, string>; writes: number }> {
  seed(cutCase.start())
  cutCase.change(await load())
  const writes = cutWrites(landing, cutCase.mode)
  try {
    flushStores()
    writes.endProcess()
    // what the replaced stores still hold is lost with the process
    flushStores()
  } finally {
    vi.restoreAllMocks()
  }
  const count = writes.count()
  const { plugin: store } = await load()
  const state = store.getState()
  return { ids: state.openPlugins.map((tab) => tab.id), tabs: tabsShown(state), writes: count }
}

const cuts: string[] = []

const clearStorage = (): void => {
  localStorage.clear()
}

const restoreMocks = (): void => {
  vi.restoreAllMocks()
}

describe('split saved state: a flush cut off at every write', () => {
  beforeEach(async () => {
    FOUR_TABS.value ??= await fourTabs()
    IMPORTED.value ??= await importedTabs()
    localStorage.clear()
  })

  afterEach(restoreMocks)

  afterAll(() => {
    process.stdout.write(`${cuts.join('\n')}\ncuts ${String(cuts.length)}\n`)
  })

  it.each(CUT_CASES)('$name loads each tab from before or after it', async (cutCase) => {
    expect.hasAssertions()

    // with nothing landing: a full quota at the first write would still let the rest land
    const before = await cutAt({ ...cutCase, mode: 'process gone' }, 0)
    const after = await cutAt(cutCase, Infinity)

    expect(after.writes, 'the flush writes nothing').toBeGreaterThan(0)
    expect(after.tabs, 'the flush changes no tab').not.toStrictEqual(before.tabs)

    for (let landing = 1; landing < after.writes; landing += 1) {
      const cut = await cutAt(cutCase, landing)
      cuts.push(`${cutCase.name}: cut after ${String(landing)}/${String(after.writes)}`)

      expect(new Set(cut.ids).size, `duplicate tab after ${String(landing)}`).toBe(cut.ids.length)

      for (const [id, shown] of cut.tabs) {
        expect(
          [before.tabs.get(id), after.tabs.get(id)],
          `tab ${id} after ${String(landing)}`
        ).toContain(shown)
      }
    }

    expect(cuts.length, `cuts ${String(cuts.length)}`).toBeGreaterThan(0)
  })
})

// Storage of tabs A and B as this version writes them, then `damage` applied to it
async function twoTabs(damage: (keys: Record<string, string>) => void): Promise<void> {
  seed({})
  const { plugin: store } = await load()
  store.getState().openPlugin(plugin('tab-A', 'A'))
  store.getState().openPlugin(plugin('tab-B', 'B'))
  flushStores()
  const keys = storage()
  damage(keys)
  seed(keys)
}

// The written index's state, so a test can change it
const indexState = (keys: Record<string, string>): Record<string, unknown> =>
  recordOf(envelopeOf(keys[INDEX], 'the index')['state'], 'the index state')

const withIndexState = (keys: Record<string, string>, state: Record<string, unknown>): void => {
  keys[INDEX] = JSON.stringify({ state, version: 0 })
}

// The index of `keys` written by a newer version
const newerIndex = (keys: Record<string, string>): void => {
  const state = indexState(keys)
  withIndexState(keys, { ...state, schemaVersion: Number(state['schemaVersion']) + 1 })
}

const ORPHAN = 'tab-Z'
const DAMAGED_TAB = '{"schemaVersion":'

// A tab key no index lists, copied from tab A's
const orphan = (keys: Record<string, string>): void => {
  keys[tabKey(ORPHAN)] = (keys[tabKey('tab-A')] ?? '').replaceAll('tab-A', () => ORPHAN)
}

describe('split saved state: keys no index lists', () => {
  beforeEach(clearStorage)

  afterEach(restoreMocks)

  it('removes a tab key the index does not list, once the stores write', async () => {
    expect.hasAssertions()

    await twoTabs(orphan)
    const { plugin: store } = await load()

    expect(tabKeys()).toContain(tabKey(ORPHAN))

    store.setState({})
    flushStores()

    expect(tabKeys()).toStrictEqual([tabKey('tab-A'), tabKey('tab-B')])
  })

  it('reports a listed tab whose key is missing as left out', async () => {
    expect.hasAssertions()

    await twoTabs((keys) => {
      Reflect.deleteProperty(keys, tabKey('tab-B'))
    })
    const { plugin: store, persist } = await load()

    expect(store.getState().openPlugins.map((tab) => tab.id)).toStrictEqual(['tab-A'])
    expect(persist.takeRestoreReport()).toMatchObject([
      { name: INDEX, kind: 'entries-dropped', fields: [[{ key: 'openPlugins' }, { index: 1 }]] }
    ])
  })

  it.each([
    {
      index: 'damaged',
      damage: (keys: Record<string, string>) => {
        keys[INDEX] = '{"state":'
      }
    },
    {
      index: 'missing',
      damage: (keys: Record<string, string>) => {
        Reflect.deleteProperty(keys, INDEX)
      }
    }
  ])('opens every intact tab key under a $index index and deletes none', async ({ damage }) => {
    expect.hasAssertions()

    await twoTabs((keys) => {
      damage(keys)
      keys[tabKey(ORPHAN)] = DAMAGED_TAB
    })
    const { plugin: store } = await load()
    const state = store.getState()

    expect([state.openPlugins.map((tab) => tab.id), state.activePluginId]).toStrictEqual([
      ['tab-A', 'tab-B'],
      'tab-A'
    ])

    store.setState({})
    flushStores()

    expect([tabKeys(), localStorage.getItem(tabKey(ORPHAN))]).toStrictEqual([
      [tabKey('tab-A'), tabKey('tab-B'), tabKey(ORPHAN)],
      DAMAGED_TAB
    ])
    expect(storedPluginState()['openPlugins']).toHaveLength(2)
  })

  it('names the tabs it opened from their own keys when the index cannot be read', async () => {
    expect.hasAssertions()

    await twoTabs((keys) => {
      keys[INDEX] = '{"state":'
    })
    const { persist } = await load()

    expect(persist.formatRestoreReport(persist.takeRestoreReport())).toBe(
      `Open plugins: the saved list could not be read and was rebuilt from open plugin A, open plugin B, each recovered from a key of its own; a copy was kept as ${BACKUP}. Backups can be exported or deleted in Settings > Data > Saved-state backups.`
    )
  })

  it('deletes no tab key under an index a newer version wrote', async () => {
    expect.hasAssertions()

    await twoTabs((keys) => {
      newerIndex(keys)
      orphan(keys)
    })
    const { plugin: store, persist } = await load()

    expect(persist.takeRestoreReport()).toMatchObject([{ name: INDEX, kind: 'newer-schema' }])

    store.setState({})
    flushStores()

    expect(tabKeys()).toStrictEqual([tabKey('tab-A'), tabKey('tab-B'), tabKey(ORPHAN)])
  })
})

describe('split saved state: a damaged tab key', () => {
  beforeEach(clearStorage)

  afterEach(restoreMocks)

  it.each([
    {
      damage: 'cannot be read',
      tabs: ['tab-A'],
      kind: 'entries-dropped',
      change: () => DAMAGED_TAB
    },
    {
      damage: 'was written by a newer version',
      tabs: ['tab-A', 'tab-B'],
      kind: 'newer-schema',
      change: (raw: string) => {
        const saved = recordOf(JSON.parse(raw), 'tab key')
        return JSON.stringify({ ...saved, schemaVersion: Number(saved['schemaVersion']) + 1 })
      }
    },
    {
      damage: 'holds a field of the wrong type',
      tabs: ['tab-A', 'tab-B'],
      kind: 'entries-dropped',
      change: (raw: string) => raw.replace('"parameters":[]', '"parameters":[null]')
    }
  ])(
    'a tab key that $damage is backed up and reported, and the other tabs load',
    async ({ tabs, kind, change }) => {
      expect.hasAssertions()

      const damaged: { raw?: string } = {}
      await twoTabs((keys) => {
        damaged.raw = change(keys[tabKey('tab-B')] ?? '')
        keys[tabKey('tab-B')] = damaged.raw
      })
      const { plugin: store, persist } = await load()

      expect(store.getState().openPlugins.map((tab) => tab.id)).toStrictEqual(tabs)
      expect(localStorage.getItem(BACKUP)).toBe(damaged.raw)
      expect(persist.takeRestoreReport()).toMatchObject([{ name: INDEX, kind }])
      expect(persist.listBackups().filter((backup) => backup.key === BACKUP)).toHaveLength(1)
    }
  )
})

// The key holding the imported tab's file text and last-saved copy
const contentKeys = (keys: Record<string, string>): string[] =>
  Object.keys(keys).filter((key) => key.startsWith(`${INDEX}.src.${IMPORTED_TAB}.`))

describe('split saved state: a damaged file-text key', () => {
  beforeEach(clearStorage)

  afterEach(restoreMocks)

  // Each damage changes `keys` and returns the text the store should keep as its backup
  it.each([
    {
      damage: 'is missing',
      apply: (keys: Record<string, string>, contentKey: string) => {
        Reflect.deleteProperty(keys, contentKey)
        return keys[tabKey(IMPORTED_TAB)]
      }
    },
    {
      damage: 'cannot be read',
      apply: (keys: Record<string, string>, contentKey: string) => {
        keys[contentKey] = '{"schemaVersion":'
        return keys[contentKey]
      }
    },
    {
      damage: 'holds no record',
      apply: (keys: Record<string, string>, contentKey: string) => {
        keys[contentKey] = '5'
        return keys[contentKey]
      }
    },
    {
      damage: 'is named by no number',
      apply: (keys: Record<string, string>) => {
        const raw = keys[tabKey(IMPORTED_TAB)] ?? ''
        keys[tabKey(IMPORTED_TAB)] = raw.replace(/"content":\d+/, '"content":"one"')
        return keys[tabKey(IMPORTED_TAB)]
      }
    }
  ])(
    'an imported tab whose file-text key $damage opens without its file text, reported and backed up',
    async ({ apply }) => {
      expect.hasAssertions()

      const keys = await importedTabs()
      const [contentKey, ...others] = contentKeys(keys)

      expect([contentKey, others]).toStrictEqual([expect.any(String), []])

      const backedUp = apply(keys, contentKey ?? '')
      seed(keys)
      const { plugin: store, persist } = await load()
      const state = store.getState()
      const imported = state.openPlugins.find((tab) => tab.id === IMPORTED_TAB)

      expect([
        state.openPlugins.map((tab) => tab.id),
        imported?.rawSource,
        state.baselineByPluginId[IMPORTED_TAB]
      ]).toStrictEqual([['tab-A', IMPORTED_TAB], undefined, undefined])
      expect(localStorage.getItem(BACKUP)).toBe(backedUp)
      expect(persist.takeRestoreReport()).toMatchObject([{ name: INDEX, kind: 'entries-dropped' }])
      expect(persist.listBackups().filter((backup) => backup.key === BACKUP)).toHaveLength(1)
    }
  )
})

describe('split saved state: file-text keys under other indexes and versions', () => {
  beforeEach(clearStorage)

  afterEach(restoreMocks)

  it('removes a file-text key no tab names, once the stores write', async () => {
    expect.hasAssertions()

    const keys = await importedTabs()
    const [contentKey = ''] = contentKeys(keys)
    const unnamed = `${INDEX}.src.${IMPORTED_TAB}.9`
    // a key under the same prefix that names no number is not one of the store's
    const foreign = `${INDEX}.src.${IMPORTED_TAB}.draft`
    keys[unnamed] = keys[contentKey] ?? ''
    keys[foreign] = 'kept'
    seed(keys)
    const { plugin: store } = await load()
    store.setState({})
    flushStores()

    expect(contentKeys(storage()).toSorted(byCodeUnit)).toStrictEqual(
      [contentKey, foreign].toSorted(byCodeUnit)
    )
  })

  it('opens a file-text key a newer version wrote, with its text, and reports it', async () => {
    expect.hasAssertions()

    const keys = await importedTabs()
    const [contentKey = ''] = contentKeys(keys)
    const saved = recordOf(JSON.parse(keys[contentKey] ?? ''), 'content key')
    keys[contentKey] = JSON.stringify({
      ...saved,
      schemaVersion: Number(saved['schemaVersion']) + 1
    })
    seed(keys)
    const { plugin: store, persist } = await load()
    const imported = store.getState().openPlugins.find((tab) => tab.id === IMPORTED_TAB)

    expect([imported?.rawSource, localStorage.getItem(BACKUP)]).toStrictEqual([
      FILE_TEXT,
      keys[contentKey]
    ])
    expect(persist.takeRestoreReport()).toMatchObject([{ name: INDEX, kind: 'newer-schema' }])
  })

  it('opens a tab without its file text under an index that cannot be read', async () => {
    expect.hasAssertions()

    const keys = await importedTabs()
    const [contentKey = ''] = contentKeys(keys)
    Reflect.deleteProperty(keys, contentKey)
    keys[INDEX] = '{"state":'
    seed(keys)
    const { plugin: store, persist } = await load()
    const state = store.getState()

    expect([
      state.openPlugins.map((tab) => tab.id),
      state.openPlugins.find((tab) => tab.id === IMPORTED_TAB)?.rawSource
    ]).toStrictEqual([['tab-A', IMPORTED_TAB], undefined])
    expect(persist.takeRestoreReport().map((entry) => entry.kind)).toContain('entries-dropped')
  })
})
