// Opening saved state in v1.6.0 again: its own persist options read each captured value and
// write it back unchanged, and over this version's split state it shows no tab and leaves the
// tab keys as they were.
import { readFileSync } from 'node:fs'
import { beforeEach, describe, expect, it } from 'vitest'
import { PluginParser } from '../../src/main/services/plugin-parser'
import { TAB_KEY_PREFIX } from '../../src/renderer/src/stores/plugin-storage'
import { byCodeUnit } from '../golden/corpus/normalise'
import { fixturePath } from '../helpers/fixture-project'
import {
  PERSISTED_KEYS,
  createV160Stores,
  readV160Payloads,
  type PersistedKey
} from '../helpers/persist-v160'
import { flushPrune, loadStores, seed, writeAll } from './support/load-persisted'
import { recordOf, recordsOf, savedStateOf, typedStores } from './support/persisted-state'

const payloads = readV160Payloads()
const PLUGIN_KEY = 'mz-plugin-studio-plugin'
const UI_KEY = 'mz-plugin-studio-ui'
const IMPORTED_UNSHOWN = '00000000-0000-4000-8000-000000000029'
// The fields this version adds to the plugin store's saved state
const NEW_FIELDS = ['"rawSource"', '"baselineByPluginId"', '"baseByPluginId"']
// The same fields as a tab key holds them
const NEW_TAB_FIELDS = ['"rawSource"', '"baseline"', '"base"']

// What localStorage holds under `key`; a missing entry fails by name
const stored = (key: string): string => {
  const value = localStorage.getItem(key)
  if (value === null) throw new Error(`nothing stored under ${key}`)
  return value
}

// Every tab key storage holds, with its text
const storedTabKeys = (): Record<string, string> =>
  Object.fromEntries(
    Object.keys(localStorage)
      .filter((key) => key.startsWith(TAB_KEY_PREFIX))
      .map((key) => [key, stored(key)])
  )

// The new fields that saved text holds
const newFieldsIn = (raw: string | undefined): string[] => {
  if (raw === undefined) throw new Error('no saved plugin state')
  return NEW_FIELDS.filter((field) => raw.includes(field))
}

// The tab ids v1.6.0 saved
const { openPlugins: v160Tabs } = savedStateOf(payloads[PLUGIN_KEY], 'v1.6.0 plugin')
const V160_TAB_IDS = recordsOf(v160Tabs, 'v1.6.0 tabs').map(({ id }) => id)

// Has v1.6.0's options load `written` and write it back; returns what each store wrote
async function downgrade(
  written: Record<PersistedKey, string>
): Promise<Partial<Record<PersistedKey, string>>> {
  seed(written)
  const old = createV160Stores()
  await flushPrune()
  const downgraded: Partial<Record<PersistedKey, string>> = {}
  for (const key of PERSISTED_KEYS) {
    old[key].setState({})
    downgraded[key] = stored(key)
  }
  return downgraded
}

const printCount = (keys: number): void => {
  process.stdout.write(`keys ${String(keys)}/${String(PERSISTED_KEYS.length)}\n`)
}

describe('downgrade to v1.6.0', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it("v1.6.0's options write each captured payload back unchanged", async () => {
    expect.hasAssertions()

    const keys = PERSISTED_KEYS.filter((key) => payloads[key] !== undefined)
    seed(payloads)
    const stores = createV160Stores()
    // The ui store prunes raw-mode entries one tick after loading.
    await flushPrune()
    const rewritten = Object.fromEntries(
      keys.map((key) => {
        stores[key].setState({})
        return [key, localStorage.getItem(key)]
      })
    )

    expect(rewritten).toStrictEqual(Object.fromEntries(keys.map((key) => [key, payloads[key]])))

    printCount(keys.length)

    expect(keys).toHaveLength(5)
  })

  it('v1.6.0 reading the split state shows no tab and changes no tab key', async () => {
    expect.hasAssertions()

    seed(payloads)
    const current = await loadStores()
    await flushPrune()
    const { plugin } = await typedStores(current)
    // A tab imported in this version, so its tab key holds its file text, baseline and file.
    const file = 'Fixture_HandWritten.js'
    const text = readFileSync(fixturePath('js', 'plugins', file), 'utf8')
    const opened = { ...PluginParser.parsePlugin(text, file), importedFrom: file }
    plugin.getState().openPlugin(opened, { path: fixturePath('js', 'plugins', file), sha256: 'ab' })

    expect(Object.keys(plugin.getState().savedPathsByPluginId)).toHaveLength(2)

    const before = Object.fromEntries(
      PERSISTED_KEYS.map((key) => [key, JSON.stringify(current[key].getState())])
    )
    const written = writeAll(current)
    const tabKeys = Object.fromEntries(
      Object.entries(written).filter(([key]) => key.startsWith(TAB_KEY_PREFIX))
    )

    expect([
      Object.keys(tabKeys).toSorted(byCodeUnit),
      NEW_TAB_FIELDS.filter(
        (field) => tabKeys[TAB_KEY_PREFIX + opened.id]?.includes(field) === true
      )
    ]).toStrictEqual([
      [...V160_TAB_IDS, opened.id].map((id) => TAB_KEY_PREFIX + String(id)).toSorted(byCodeUnit),
      NEW_TAB_FIELDS
    ])

    const downgraded = await downgrade(written)
    const { openPlugins: shown } = savedStateOf(downgraded[PLUGIN_KEY], 'v1.6.0 plugin')

    // v1.6.0 drops the schema number and knows no tab key: it shows no tab and leaves each key
    expect({
      withSchemaNumber: PERSISTED_KEYS.filter((key) => stored(key).includes('schemaVersion')),
      newFields: newFieldsIn(downgraded[PLUGIN_KEY]),
      shown,
      tabKeys: storedTabKeys()
    }).toStrictEqual({ withSchemaNumber: [], newFields: [], shown: [], tabKeys })

    seed({ ...tabKeys, ...downgraded })
    const again = await loadStores()
    await flushPrune()
    const otherKeys = PERSISTED_KEYS.filter((key) => key !== PLUGIN_KEY)
    // With no tab open, the layout drops every tab's raw-mode switch and keeps the rest
    const layout = recordOf(JSON.parse(before[UI_KEY] ?? ''), 'layout')
    const expected: Record<string, string> = {
      ...before,
      [UI_KEY]: JSON.stringify({ ...layout, rawModeByPluginId: {} })
    }

    expect([
      layout['rawModeByPluginId'],
      Object.fromEntries(otherKeys.map((key) => [key, JSON.stringify(again[key].getState())]))
    ]).toStrictEqual([
      { [IMPORTED_UNSHOWN]: true },
      Object.fromEntries(otherKeys.map((key) => [key, expected[key]]))
    ])

    // Back in this version, the tab list v1.6.0 saved lists no tab; the tab keys stay as they were
    const { plugin: loadedAgain } = await typedStores(again)
    writeAll(again)

    expect([loadedAgain.getState().openPlugins, storedTabKeys()]).toStrictEqual([[], tabKeys])

    printCount(PERSISTED_KEYS.length)
  })
})
