// What the app loads from the values v1.6.0 saved: each store is imported afresh over the
// captured localStorage, so the real persist middleware hydrates it.
import { readFileSync } from 'node:fs'
import { beforeEach, describe, expect, it } from 'vitest'
import { PluginParser } from '../../src/main/services/pluginParser'
import { generatePluginOutput, isRawMode } from '../../src/renderer/src/lib/plugin-output'
import { toBaseline, type PluginDefinition } from '../../src/shared/types/plugin'
import { fixturePath } from '../helpers/fixture-project'
import { PERSISTED_KEYS, readV160Payloads, type PersistedKey } from '../helpers/persist-v160'
import {
  flushPrune,
  loadStores,
  seed,
  writeAll,
  type PersistedHook
} from './support/load-persisted'
import {
  envelopeOf,
  recordOf,
  recordsOf,
  savedStateOf,
  typedStores
} from './support/persisted-state'

const payloads = readV160Payloads()
const PLUGIN_KEY = 'mz-plugin-studio-plugin'
const IMPORTED_SAVED = '00000000-0000-4000-8000-000000000013'
const IMPORTED_UNSHOWN = '00000000-0000-4000-8000-000000000029'

// The schema each store writes now.
const SCHEMA: Record<PersistedKey, number> = {
  'mz-plugin-studio-plugin': 3,
  'mz-plugin-studio-ui': 2,
  'mz-plugin-studio-settings': 1,
  'mz-plugin-studio-project': 1,
  'mz-plugin-studio-templates': 1
}

const stateOf = (key: PersistedKey): Record<string, unknown> => savedStateOf(payloads[key], key)

// The v1.6.0 field values of every store, as loaded now.
function persistedFields(
  stores: Record<PersistedKey, PersistedHook>
): Record<string, Record<string, unknown>> {
  const fields: Record<string, Record<string, unknown>> = {}
  for (const key of PERSISTED_KEYS) {
    const state = stores[key].getState()
    fields[key] = Object.fromEntries(Object.keys(stateOf(key)).map((f) => [f, state[f]]))
  }
  return fields
}

// A v1.6.0 tab with a code body was imported from `<name>.js`; the code body is not kept.
function asImported(tab: Record<string, unknown>): Record<string, unknown> {
  const { codeBody, meta, ...rest } = tab
  if (typeof codeBody !== 'string') return tab
  const { name } = recordOf(meta, 'tab meta')
  if (typeof name !== 'string') throw new TypeError('a tab without a name')
  return { ...rest, meta, importedFrom: `${name}.js` }
}

type Params = Record<string, unknown>[]

// v1.6.0 saved a cleared number limit as null; the parameter check leaves it out.
function withoutNullLimits(params: Params): Params {
  return params.map((p) => Object.fromEntries(Object.entries(p).filter(([, v]) => v !== null)))
}

// A v1.6.0 tab as loaded now: imported tabs named, each parameter through the parameter check.
function loadedTab(tab: Record<string, unknown>): Record<string, unknown> {
  const { parameters, commands, structs } = tab
  return {
    ...asImported(tab),
    parameters: withoutNullLimits(recordsOf(parameters, 'parameters')),
    commands: recordsOf(commands, 'commands').map(({ args, ...command }) => ({
      ...command,
      args: withoutNullLimits(recordsOf(args, 'arguments'))
    })),
    structs: recordsOf(structs, 'structs').map(({ parameters: fields, ...struct }) => ({
      ...struct,
      parameters: withoutNullLimits(recordsOf(fields, 'struct fields'))
    }))
  }
}

// What a v1.6.0 field value loads as now.
function expectedField(field: string, value: unknown): unknown {
  if (field === 'parameterPresets') {
    return Object.fromEntries(
      Object.entries(recordOf(value, field)).map(([name, params]) => [
        name,
        withoutNullLimits(recordsOf(params, name))
      ])
    )
  }
  if (field === 'plugin') return loadedTab(recordOf(value, field))
  if (field === 'openPlugins') return recordsOf(value, field).map((tab) => loadedTab(tab))
  if (field === 'rawModeByPluginId') {
    return Object.fromEntries(
      Object.entries(recordOf(value, field)).filter(([, on]) => on !== false)
    )
  }
  return value
}

// The saved plugin state with `change` applied, as an envelope persist reads
function changedPluginState(
  change: (state: Record<string, unknown>) => Record<string, unknown>
): string {
  const envelope = envelopeOf(payloads[PLUGIN_KEY], PLUGIN_KEY)
  return JSON.stringify({ ...envelope, state: change(stateOf(PLUGIN_KEY)) })
}

// The first element of a list; a missing list or element fails by name
function firstOf<T>(items: T[] | undefined, what: string): T {
  const first = items?.at(0)
  if (first === undefined) throw new Error(`no ${what}`)
  return first
}

// The one element of a list; anything else fails by name
function onlyOf<T>(items: T[], what: string): T {
  if (items.length !== 1) throw new Error(`expected one ${what}, got ${String(items.length)}`)
  return firstOf(items, what)
}

// The schema number each store wrote
const schemaOf = (written: Record<PersistedKey, string>, key: PersistedKey): unknown => {
  const { schemaVersion } = savedStateOf(written[key], key)
  return schemaVersion
}

// What v1.6.0 writes back: every saved state without its schema number
function withoutSchemaNumber(written: Record<PersistedKey, string>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(written).map(([key, raw]) => {
      const state = Object.entries(savedStateOf(raw, key)).filter(
        ([field]) => field !== 'schemaVersion'
      )
      return [key, JSON.stringify({ ...envelopeOf(raw, key), state: Object.fromEntries(state) })]
    })
  )
}

function setUp(): void {
  localStorage.clear()
}

describe('loading the state v1.6.0 saved: every store', () => {
  beforeEach(setUp)

  it('each saved store loads every field and writes its current schema', async () => {
    expect.hasAssertions()

    const keys = PERSISTED_KEYS.filter((key) => payloads[key] !== undefined)
    seed(payloads)
    const stores = await loadStores()
    await flushPrune()
    const loaded: Record<string, unknown> = {}
    const expected: Record<string, unknown> = {}
    for (const key of keys) {
      const state = stores[key].getState()
      const saved = Object.entries(stateOf(key))
      for (const [field, value] of saved) {
        loaded[`${key}.${field}`] = state[field]
        expected[`${key}.${field}`] = expectedField(field, value)
      }
    }

    expect(loaded).toStrictEqual(expected)
    expect(keys.map((key) => stores[key].persist.getOptions().version)).toStrictEqual(
      keys.map(() => 0)
    )

    const written = writeAll(stores)

    expect(keys.map((key) => [key, schemaOf(written, key)])).toStrictEqual(
      keys.map((key) => [key, SCHEMA[key]])
    )

    const fields = Object.keys(loaded).length
    process.stdout.write(
      `keys ${String(keys.length)}/${String(PERSISTED_KEYS.length)}, fields ${String(fields)}\n`
    )

    expect(keys).toHaveLength(5)
  })

  it('loading what this version wrote changes nothing, with or without its schema number', async () => {
    expect.hasAssertions()

    seed(payloads)
    const first = await loadStores()
    await flushPrune()
    const loaded = persistedFields(first)
    const written = writeAll(first)

    seed(written)
    const second = await loadStores()
    await flushPrune()

    expect([persistedFields(second), writeAll(second)]).toStrictEqual([loaded, written])

    // v1.6.0 writes the fields back without the schema number, so every step runs again.
    seed(withoutSchemaNumber(written))
    const third = await loadStores()
    await flushPrune()

    expect(persistedFields(third)).toStrictEqual(loaded)
  })
})

describe('loading the state v1.6.0 saved: imported and saved tabs', () => {
  beforeEach(setUp)

  it('an imported tab v1.6.0 saved comes back imported, in raw mode, with its file missing', async () => {
    expect.hasAssertions()

    seed(payloads)
    const { plugin, ui } = await typedStores(await loadStores())
    await flushPrune()
    const tab = onlyOf(
      plugin.getState().openPlugins.filter((p) => p.id === IMPORTED_SAVED),
      'saved imported tab'
    )

    expect(tab.importedFrom).toBe('Fixture_HandWritten.js')
    expect(tab).not.toHaveProperty('codeBody')
    expect(tab).not.toHaveProperty('rawSource')
    expect(isRawMode(tab, ui.getState().rawModeByPluginId[tab.id])).toBe(true)
    expect(generatePluginOutput(tab, true, null)).toMatchObject({
      ok: false,
      refusal: 'source-missing'
    })
  })

  it('each tab v1.6.0 saved to a file has that file as the one it last saved, contents unknown', async () => {
    expect.hasAssertions()

    seed(payloads)
    const { plugin } = await typedStores(await loadStores())
    await flushPrune()
    const state = plugin.getState()
    const { savedPathsByPluginId } = stateOf(PLUGIN_KEY)
    const saved = recordOf(savedPathsByPluginId, 'saved paths')

    expect(Object.keys(saved)).toHaveLength(2)
    expect(state.baseByPluginId).toStrictEqual(
      Object.fromEntries(Object.entries(saved).map(([id, path]) => [id, { path, sha256: null }]))
    )

    const unsaved = state.openPlugins.filter((p) => !Object.hasOwn(saved, p.id))

    expect(unsaved.map((p) => p.meta.name)).toContain('NewPlugin')
  })

  it('a file entry already saved is kept and a damaged one is dropped', async () => {
    expect.hasAssertions()

    const { savedPathsByPluginId } = stateOf(PLUGIN_KEY)
    const ids = Object.keys(recordOf(savedPathsByPluginId, 'saved paths'))
    const kept = firstOf(ids, 'saved path')
    const damaged = firstOf(ids.slice(1), 'second saved path')
    const keptBase = { path: '/fixture/mz-project/js/plugins/Synthetic_Tool.js', sha256: 'ab' }
    const changed = changedPluginState((state) => ({
      ...state,
      baseByPluginId: { [kept]: keptBase, [damaged]: { path: 3, sha256: null } }
    }))
    seed({ ...payloads, [PLUGIN_KEY]: changed })
    const { plugin } = await typedStores(await loadStores())
    await flushPrune()

    expect(plugin.getState().baseByPluginId).toStrictEqual({ [kept]: keptBase })
  })
})

describe('loading the state v1.6.0 saved: raw mode and restarts', () => {
  beforeEach(setUp)

  it('layout drops stored false raw-mode entries and keeps the true ones', async () => {
    expect.hasAssertions()

    seed(payloads)
    const { ui } = await typedStores(await loadStores())
    await flushPrune()
    const rawMode = ui.getState().rawModeByPluginId

    expect(rawMode).not.toHaveProperty(IMPORTED_SAVED)
    expect(rawMode[IMPORTED_UNSHOWN]).toBe(true)
  })

  it('an imported tab keeps its file text and raw mode across a restart', async () => {
    expect.hasAssertions()

    seed({})
    const first = await loadStores()
    const file = 'Fixture_HandWritten.js'
    const text = readFileSync(fixturePath('js', 'plugins', file), 'utf8')
    const opened: PluginDefinition = { ...PluginParser.parsePlugin(text, file), importedFrom: file }
    const { plugin } = await typedStores(first)
    plugin.getState().openPlugin(opened)
    const written = writeAll(first)

    expect(written[PLUGIN_KEY]).not.toContain('codeBody')

    seed(written)
    const again = await typedStores(await loadStores())
    await flushPrune()
    const state = again.plugin.getState()
    const tab = onlyOf(state.openPlugins.slice(0, 1), 'first tab')
    const baseline = new Map(Object.entries(state.baselineByPluginId)).get(tab.id) ?? null
    // The baseline as storage holds it: a JSON round trip, which drops undefined fields
    const storedBaseline = JSON.stringify(toBaseline(opened))
    const roundTripped: unknown = JSON.parse(storedBaseline)

    expect([tab.rawSource, tab.importedFrom, baseline]).toStrictEqual([text, file, roundTripped])
    expect(isRawMode(tab, again.ui.getState().rawModeByPluginId[tab.id])).toBe(true)
    expect(generatePluginOutput(tab, true, baseline)).toStrictEqual({
      ok: true,
      code: text
    })
  })
})

describe('loading the state v1.6.0 saved: closed tabs and presets', () => {
  beforeEach(setUp)

  it('entries of closed tabs are dropped while loading and hydration finishes', async () => {
    expect.hasAssertions()

    const changed = changedPluginState((state) => {
      const { dirtyByPluginId, savedPathsByPluginId } = state
      return {
        ...state,
        dirtyByPluginId: { ...recordOf(dirtyByPluginId, 'dirty'), 'stale-tab': true },
        savedPathsByPluginId: {
          ...recordOf(savedPathsByPluginId, 'saved paths'),
          'stale-tab': '/fixture/mz-project/js/plugins/Stale.js'
        }
      }
    })
    seed({ ...payloads, [PLUGIN_KEY]: changed })
    const stores = await loadStores()
    await flushPrune()
    const { plugin } = await typedStores(stores)

    expect(plugin.getState().dirtyByPluginId).not.toHaveProperty('stale-tab')
    expect(plugin.getState().savedPathsByPluginId).not.toHaveProperty('stale-tab')
    expect(plugin.persist.hasHydrated()).toBe(true)
    expect(writeAll(stores)[PLUGIN_KEY]).not.toContain('stale-tab')
  })

  it('presets load through the parameter check', async () => {
    expect.hasAssertions()

    seed(payloads)
    const { settings } = await typedStores(await loadStores())
    const presets = settings.getState().parameterPresets
    const { parameterPresets } = stateOf('mz-plugin-studio-settings')
    const stored = recordOf(parameterPresets, 'presets')
    const movement = firstOf(recordsOf(stored['Synthetic movement'], 'movement preset'), 'movement')
    const { min, ...kept } = movement
    const loadedMovement = firstOf(presets['Synthetic movement'], 'loaded movement')

    expect(min).toBeNull()
    expect(loadedMovement).toStrictEqual(kept)
    expect(loadedMovement).not.toHaveProperty('min')
    expect(presets['Synthetic flags']).toStrictEqual(stored['Synthetic flags'])
  })
})
