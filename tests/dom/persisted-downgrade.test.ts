// Opening saved state in v1.6.0 again: its own persist options read each captured value and
// write it back unchanged, and what it writes back over this version's state loads again here.
import { readFileSync } from 'node:fs'
import { beforeEach, describe, expect, it } from 'vitest'
import { PluginParser } from '../../src/main/services/pluginParser'
import { isImported } from '../../src/renderer/src/lib/plugin-output'
import { fixturePath } from '../helpers/fixture-project'
import {
  PERSISTED_KEYS,
  createV160Stores,
  readV160Payloads,
  type PersistedKey
} from '../helpers/persist-v160'
import { flushPrune, loadStores, seed, writeAll } from './support/load-persisted'
import { recordsOf, savedStateOf, typedStores } from './support/persisted-state'

const payloads = readV160Payloads()
const PLUGIN_KEY = 'mz-plugin-studio-plugin'
// The fields this version adds to the plugin store's saved state
const NEW_FIELDS = ['"rawSource"', '"baselineByPluginId"', '"baseByPluginId"']

// What localStorage holds under `key`; a missing entry fails by name
const stored = (key: string): string => {
  const value = localStorage.getItem(key)
  if (value === null) throw new Error(`nothing stored under ${key}`)
  return value
}

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

  it('what v1.6.0 writes back over this version loads again without losing a tab', async () => {
    expect.hasAssertions()

    seed(payloads)
    const current = await loadStores()
    await flushPrune()
    const { plugin } = await typedStores(current)
    // A tab imported in this version, so the saved state holds its file text, baseline and file.
    const file = 'Fixture_HandWritten.js'
    const text = readFileSync(fixturePath('js', 'plugins', file), 'utf8')
    const opened = { ...PluginParser.parsePlugin(text, file), importedFrom: file }
    plugin.getState().openPlugin(opened, { path: fixturePath('js', 'plugins', file), sha256: 'ab' })
    const savedPaths = plugin.getState().savedPathsByPluginId

    expect(Object.keys(savedPaths)).toHaveLength(2)

    const before = Object.fromEntries(
      PERSISTED_KEYS.map((key) => [key, JSON.stringify(current[key].getState())])
    )
    const beforeTabs = plugin.getState().openPlugins
    const written = writeAll(current)

    expect(newFieldsIn(written[PLUGIN_KEY])).toStrictEqual(NEW_FIELDS)

    const downgraded = await downgrade(written)

    // v1.6.0 drops the schema number, so the next load runs every step again.
    expect({
      withSchemaNumber: PERSISTED_KEYS.filter((key) => stored(key).includes('schemaVersion')),
      newFields: newFieldsIn(downgraded[PLUGIN_KEY])
    }).toStrictEqual({ withSchemaNumber: [], newFields: [] })

    seed(downgraded)
    const again = await loadStores()
    await flushPrune()
    const otherKeys = PERSISTED_KEYS.filter((key) => key !== PLUGIN_KEY)

    expect(
      Object.fromEntries(otherKeys.map((key) => [key, JSON.stringify(again[key].getState())]))
    ).toStrictEqual(Object.fromEntries(otherKeys.map((key) => [key, before[key]])))

    const { plugin: loadedAgain } = await typedStores(again)
    const pluginState = loadedAgain.getState()
    const tabs = pluginState.openPlugins

    expect({
      ids: tabs.map((p) => p.id),
      importedFrom: tabs.map((p) => p.importedFrom),
      rawSourceKept: tabs.filter(isImported).map((p) => 'rawSource' in p),
      baselines: pluginState.baselineByPluginId,
      // The file each tab last saved comes back from its saved path, contents unknown
      bases: pluginState.baseByPluginId,
      savedTabIds: tabs.slice(0, -1).map((p) => p.id)
    }).toStrictEqual({
      ids: beforeTabs.map((p) => p.id),
      importedFrom: beforeTabs.map((p) => p.importedFrom),
      rawSourceKept: [false, false, false],
      baselines: {},
      bases: Object.fromEntries(
        Object.entries(savedPaths).map(([id, path]) => [id, { path, sha256: null }])
      ),
      savedTabIds: V160_TAB_IDS
    })

    printCount(PERSISTED_KEYS.length)
  })
})
