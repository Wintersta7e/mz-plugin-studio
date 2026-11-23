// What the app shows after loading the values each earlier release saved: tabs, the active tab,
// dirty marks, saved paths and file bases, each derived here from the release's own payload; and
// how the active plugin saved beside the tabs is folded into them, rule by rule.
import { afterAll, describe, expect, it } from 'vitest'
import { PERSISTED_KEYS, readPayloads, type PersistedKey } from '../helpers/persisted-payloads'
import { loadStores, seed } from './support/load-persisted'
import {
  envelopeOf,
  recordOf,
  recordsOf,
  savedStateOf,
  typedStores
} from './support/persisted-state'

const RELEASES = ['v1.6.0', 'v1.9.0'] as const

interface Shown {
  tabs: unknown[]
  active: unknown
  dirty: string[]
  savedPaths: Record<string, unknown>
  bases: Record<string, unknown>
}

const only = (map: Record<string, unknown>, ids: unknown[]): Record<string, unknown> =>
  Object.fromEntries(Object.entries(map).filter(([id]) => ids.includes(id)))

// A base as JSON text of its hash, so a hash of unknown content reads `null`.
const basesShown = (map: Record<string, unknown>): Record<string, unknown> =>
  Object.fromEntries(
    Object.entries(map).map(([id, base]) => {
      const { path, sha256 } = recordOf(base, 'base')
      return [id, { path, sha256: JSON.stringify(sha256) }]
    })
  )

const dirtyIds = (map: Record<string, unknown>, ids: unknown[]): string[] =>
  Object.keys(only(map, ids)).filter((id) => map[id] === true)

// The payload's own fields, as the release that wrote them showed them. A release without file
// bases had a base of unknown content for every saved path.
function expectedFrom(state: Record<string, unknown>): Shown {
  const tabs = recordsOf(state['openPlugins'], 'open plugins').map((tab) => tab['id'])
  const savedPaths = only(recordOf(state['savedPathsByPluginId'], 'saved paths'), tabs)
  const bases =
    state['baseByPluginId'] === undefined
      ? Object.fromEntries(
          Object.entries(savedPaths).map(([id, path]) => [id, { path, sha256: 'null' }])
        )
      : basesShown(only(recordOf(state['baseByPluginId'], 'bases'), tabs))
  return {
    tabs,
    active: state['activePluginId'],
    dirty: dirtyIds(recordOf(state['dirtyByPluginId'], 'dirty'), tabs),
    savedPaths,
    bases
  }
}

function shownBy(state: Record<string, unknown>): Shown {
  const tabs = recordsOf(state['openPlugins'], 'open plugins').map((tab) => tab['id'])
  return {
    tabs,
    active: state['activePluginId'],
    dirty: dirtyIds(recordOf(state['dirtyByPluginId'], 'dirty'), tabs),
    savedPaths: recordOf(state['savedPathsByPluginId'], 'saved paths'),
    bases: basesShown(recordOf(state['baseByPluginId'], 'bases'))
  }
}

describe('loading earlier saved state through the migration chain', () => {
  const loaded: string[] = []

  afterAll(() => {
    process.stdout.write(`${loaded.join('\n')}\n`)
  })

  it.each(RELEASES)('shows the tabs %s saved', async (release) => {
    expect.hasAssertions()

    const payloads = readPayloads(release)
    const present = PERSISTED_KEYS.filter((key) => payloads[key] !== undefined)
    const count = `keys loaded ${String(present.length)}/${String(PERSISTED_KEYS.length)}`
    loaded.push(`${release}: ${count}`)

    expect(present, `${release} ${count}`).toStrictEqual(PERSISTED_KEYS)

    seed(payloads)
    const stores = await loadStores()
    for (const key of PERSISTED_KEYS) {
      expect(stores[key].persist.hasHydrated(), `${release} ${key} hydrated`).toBe(true)
    }
    const expected = expectedFrom(
      savedStateOf(payloads['mz-plugin-studio-plugin'], `${release} plugin payload`)
    )

    expect(expected.tabs.length, `${release} tabs`).toBeGreaterThan(0)
    expect(shownBy(stores['mz-plugin-studio-plugin'].getState())).toStrictEqual(expected)
  })
})

const SAVED_TAB = '00000000-0000-4000-8000-000000000101'
const IMPORTED_TAB = '00000000-0000-4000-8000-000000000102'
const ACTIVE_TAB = '00000000-0000-4000-8000-000000000103'
const FILE_OF = (name: string): string => `/fixture/mz-project/js/plugins/${name}.js`

// The v1.9.0 set with its plugin payload's state replaced by what `change` makes of it
function withPluginState(
  change: (state: Record<string, unknown>) => Record<string, unknown>
): Partial<Record<PersistedKey, string>> {
  const payloads = readPayloads('v1.9.0')
  const key = 'mz-plugin-studio-plugin'
  const envelope = envelopeOf(payloads[key], 'v1.9.0 plugin payload')
  const state = change(savedStateOf(payloads[key], 'v1.9.0 plugin payload'))
  return { ...payloads, [key]: JSON.stringify({ ...envelope, state }) }
}

// The saved tab `id` of a saved state
function savedTabOf(state: Record<string, unknown>, id: string): Record<string, unknown> {
  const tab = recordsOf(state['openPlugins'], 'open plugins').find((t) => t['id'] === id)
  return recordOf(tab, `tab ${id}`)
}

const withDescription = (tab: Record<string, unknown>, description: string) => ({
  ...tab,
  meta: { ...recordOf(tab['meta'], 'meta'), description }
})

const without = (map: unknown, id: string): Record<string, unknown> =>
  Object.fromEntries(Object.entries(recordOf(map, 'map')).filter(([key]) => key !== id))

interface Loaded {
  tabs: string[]
  descriptions: Record<string, unknown>
  dirty: string[]
  savedPaths: Record<string, unknown>
  bases: Record<string, unknown>
  baselines: string[]
  rawMode: Record<string, boolean>
}

async function loaded(payloads: Partial<Record<PersistedKey, string>>): Promise<Loaded> {
  seed(payloads)
  const { plugin, ui } = await typedStores(await loadStores())
  const state = plugin.getState()
  return {
    tabs: state.openPlugins.map((tab) => tab.id),
    descriptions: Object.fromEntries(state.openPlugins.map((t) => [t.id, t.meta.description])),
    dirty: Object.keys(state.dirtyByPluginId).filter((id) => state.dirtyByPluginId[id] === true),
    savedPaths: state.savedPathsByPluginId,
    bases: state.baseByPluginId,
    baselines: Object.keys(state.baselineByPluginId),
    rawMode: ui.getState().rawModeByPluginId
  }
}

const ID_PATTERN = /^[\da-z-]{1,64}$/i
const FOREIGN_ID = 'imported tab #2'

interface FoldRow {
  name: string
  payloads: () => Partial<Record<PersistedKey, string>>
  check: (shown: Loaded) => void
}

const FOLD_ROWS: FoldRow[] = [
  {
    name: 'the active plugin replaces its open tab',
    payloads: () =>
      withPluginState((state) => ({
        ...state,
        plugin: withDescription(savedTabOf(state, ACTIVE_TAB), 'shown in the editor')
      })),
    check: (shown) => {
      expect(shown.tabs).toStrictEqual([SAVED_TAB, IMPORTED_TAB, ACTIVE_TAB])
      expect(shown.descriptions[ACTIVE_TAB]).toBe('shown in the editor')
    }
  },
  {
    name: 'the active plugin missing from the tabs is appended',
    payloads: () =>
      withPluginState((state) => ({
        ...state,
        plugin: savedTabOf(state, SAVED_TAB),
        activePluginId: SAVED_TAB,
        openPlugins: recordsOf(state['openPlugins'], 'tabs').filter((t) => t['id'] !== SAVED_TAB)
      })),
    check: (shown) => {
      expect(shown.tabs).toStrictEqual([IMPORTED_TAB, ACTIVE_TAB, SAVED_TAB])
    }
  },
  {
    name: 'a plugin that is not the active tab is discarded',
    payloads: () =>
      withPluginState((state) => ({
        ...state,
        plugin: withDescription(savedTabOf(state, ACTIVE_TAB), 'never shown'),
        activePluginId: SAVED_TAB
      })),
    check: (shown) => {
      expect(shown.tabs).toStrictEqual([SAVED_TAB, IMPORTED_TAB, ACTIVE_TAB])
      expect(shown.descriptions[ACTIVE_TAB]).not.toBe('never shown')
    }
  },
  {
    name: 'the unsaved mark of the active plugin moves to its tab',
    payloads: () =>
      withPluginState((state) => ({
        ...state,
        isDirty: true,
        dirtyByPluginId: without(state['dirtyByPluginId'], ACTIVE_TAB)
      })),
    check: (shown) => {
      expect(shown.dirty).toStrictEqual([IMPORTED_TAB, ACTIVE_TAB])
    }
  },
  {
    name: 'the saved path of the active plugin moves to its tab and keeps its file',
    payloads: () =>
      withPluginState((state) => ({
        ...state,
        plugin: savedTabOf(state, IMPORTED_TAB),
        activePluginId: IMPORTED_TAB,
        savedPath: FILE_OF('Synthetic_Imported')
      })),
    check: (shown) => {
      expect(shown.savedPaths[IMPORTED_TAB]).toBe(FILE_OF('Synthetic_Imported'))
      expect(recordOf(shown.bases[IMPORTED_TAB], 'base')['sha256']).toMatch(/^[\da-f]{64}$/)
    }
  },
  {
    name: 'the saved path of the active plugin without a file gets one of unknown contents',
    payloads: () => withPluginState((state) => ({ ...state, savedPath: FILE_OF('NewPlugin') })),
    check: (shown) => {
      expect(shown.savedPaths[ACTIVE_TAB]).toBe(FILE_OF('NewPlugin'))

      const base = recordOf(shown.bases[ACTIVE_TAB], 'the file of the active tab')

      expect([Object.keys(base), base['path']]).toStrictEqual([
        ['path', 'sha256'],
        FILE_OF('NewPlugin')
      ])
      expect(base['sha256']).toBeNull()
    }
  },
  {
    name: 'a tab id no saved key can be named by is replaced everywhere, raw mode included',
    payloads: () =>
      Object.fromEntries(
        Object.entries(readPayloads('v1.9.0')).map(([key, raw]) => [
          key,
          raw.replaceAll(IMPORTED_TAB, () => FOREIGN_ID)
        ])
      ),
    check: (shown) => {
      const replaced = shown.tabs[1] ?? ''

      expect(shown.tabs).toStrictEqual([SAVED_TAB, replaced, ACTIVE_TAB])
      expect(replaced).toMatch(ID_PATTERN)
      expect({
        dirty: shown.dirty.includes(replaced),
        base: Object.hasOwn(shown.bases, replaced),
        baseline: shown.baselines,
        rawMode: shown.rawMode
      }).toStrictEqual({
        dirty: true,
        base: true,
        baseline: [replaced],
        rawMode: { [replaced]: true }
      })
      expect(JSON.stringify(shown)).not.toContain(FOREIGN_ID)
    }
  }
]

describe('folding the active plugin into the open tabs', () => {
  afterAll(() => {
    process.stdout.write(`fold rows ${String(FOLD_ROWS.length)}\n`)
  })

  it('has rows to fold', () => {
    expect(FOLD_ROWS.length, `fold rows ${String(FOLD_ROWS.length)}`).toBeGreaterThan(0)
  })

  it.each(FOLD_ROWS)('$name', async ({ payloads, check }) => {
    expect.hasAssertions()

    check(await loaded(payloads()))
  })
})
