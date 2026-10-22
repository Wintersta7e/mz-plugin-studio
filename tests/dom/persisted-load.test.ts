// What the app loads from the values v1.6.0 saved: each store is imported afresh over the
// captured localStorage, so the real persist middleware hydrates it.
import { readFileSync } from 'fs'
import { beforeEach, describe, expect, it } from 'vitest'
import { PluginParser } from '../../src/main/services/pluginParser'
import { generatePluginOutput, isRawMode } from '../../src/renderer/src/lib/plugin-output'
import { toBaseline } from '../../src/shared/types/plugin'
import type { PluginBaseline, PluginDefinition } from '../../src/shared/types/plugin'
import { fixturePath } from '../helpers/fixture-project'
import { PERSISTED_KEYS, readV160Payloads } from '../helpers/persist-v160'
import type { PersistedKey } from '../helpers/persist-v160'
import { flushPrune, loadStores, seed, writeAll } from './support/load-persisted'
import type { PersistedHook } from './support/load-persisted'

const payloads = readV160Payloads()
const IMPORTED_SAVED = '00000000-0000-4000-8000-000000000013'
const IMPORTED_UNSHOWN = '00000000-0000-4000-8000-000000000029'

// The schema each store writes now.
const SCHEMA: Record<PersistedKey, number> = {
  'mz-plugin-studio-plugin': 2,
  'mz-plugin-studio-ui': 2,
  'mz-plugin-studio-settings': 1,
  'mz-plugin-studio-project': 1,
  'mz-plugin-studio-templates': 1
}

const stateOf = (key: PersistedKey): Record<string, unknown> =>
  (JSON.parse(payloads[key] as string) as { state: Record<string, unknown> }).state

/** The v1.6.0 field values of every store, as loaded now. */
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

/** A v1.6.0 tab with a code body was imported from `<name>.js`; the code body is not kept. */
function asImported(tab: Record<string, unknown>): Record<string, unknown> {
  if (typeof tab.codeBody !== 'string') return tab
  const { codeBody: _codeBody, ...rest } = tab
  return { ...rest, importedFrom: `${(tab.meta as { name: string }).name}.js` }
}

type Params = Record<string, unknown>[]

/** What a v1.6.0 field value loads as now. */
function expectedField(field: string, value: unknown): unknown {
  if (field === 'parameterPresets') {
    return Object.fromEntries(
      Object.entries(value as Record<string, Params>).map(([name, params]) => [
        name,
        withoutNullLimits(params)
      ])
    )
  }
  if (field === 'plugin') return loadedTab(value as Record<string, unknown>)
  if (field === 'openPlugins') return (value as Params).map(loadedTab)
  if (field === 'rawModeByPluginId') {
    return Object.fromEntries(Object.entries(value as object).filter(([, on]) => on !== false))
  }
  return value
}

/** v1.6.0 saved a cleared number limit as null; the parameter check leaves it out. */
function withoutNullLimits(params: Params): Params {
  return params.map((p) => Object.fromEntries(Object.entries(p).filter(([, v]) => v !== null)))
}

/** A v1.6.0 tab as loaded now: imported tabs named, each parameter through the parameter check. */
function loadedTab(tab: Record<string, unknown>): Record<string, unknown> {
  return {
    ...asImported(tab),
    parameters: withoutNullLimits(tab.parameters as Params),
    commands: (tab.commands as Params).map((c) => ({
      ...c,
      args: withoutNullLimits(c.args as Params)
    })),
    structs: (tab.structs as Params).map((s) => ({
      ...s,
      parameters: withoutNullLimits(s.parameters as Params)
    }))
  }
}

describe('loading the state v1.6.0 saved', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('each saved store loads every field and writes its current schema', async () => {
    const keys = PERSISTED_KEYS.filter((key) => payloads[key] !== undefined)
    seed(payloads)
    const stores = await loadStores()
    await flushPrune()
    let fields = 0
    for (const key of keys) {
      const state = stores[key].getState()
      for (const [field, value] of Object.entries(stateOf(key))) {
        expect(state[field], `${key}.${field}`).toEqual(expectedField(field, value))
        fields++
      }
      expect(stores[key].persist.getOptions().version, key).toBe(0)
    }
    const written = writeAll(stores)
    for (const key of keys) {
      const envelope = JSON.parse(written[key]) as { state: { schemaVersion?: number } }
      expect(envelope.state.schemaVersion, key).toBe(SCHEMA[key])
    }
    console.log(`keys ${keys.length}/${PERSISTED_KEYS.length}, fields ${fields}`)
    expect(keys).toHaveLength(5)
  })

  it('loading what this version wrote changes nothing, with or without its schema number', async () => {
    seed(payloads)
    const first = await loadStores()
    await flushPrune()
    const loaded = persistedFields(first)
    const written = writeAll(first)

    seed(written)
    const second = await loadStores()
    await flushPrune()
    expect(persistedFields(second)).toEqual(loaded)
    expect(writeAll(second)).toEqual(written)

    // v1.6.0 writes the fields back without the schema number, so every step runs again.
    const unversioned = Object.fromEntries(
      Object.entries(written).map(([key, raw]) => {
        const envelope = JSON.parse(raw) as { state: Record<string, unknown> }
        delete envelope.state.schemaVersion
        return [key, JSON.stringify(envelope)]
      })
    )
    seed(unversioned)
    const third = await loadStores()
    await flushPrune()
    expect(persistedFields(third)).toEqual(loaded)
  })

  it('an imported tab v1.6.0 saved comes back imported, in raw mode, with its file missing', async () => {
    seed(payloads)
    const stores = await loadStores()
    await flushPrune()
    const tabs = stores['mz-plugin-studio-plugin'].getState().openPlugins as PluginDefinition[]
    const tab = tabs.find((p) => p.id === IMPORTED_SAVED) as PluginDefinition
    expect(tab.importedFrom).toBe('Fixture_HandWritten.js')
    expect(tab).not.toHaveProperty('codeBody')
    expect(tab).not.toHaveProperty('rawSource')
    const rawMode = stores['mz-plugin-studio-ui'].getState().rawModeByPluginId as Record<
      string,
      boolean
    >
    expect(isRawMode(tab, rawMode[tab.id])).toBe(true)
    expect(generatePluginOutput(tab, true, null)).toMatchObject({
      ok: false,
      refusal: 'source-missing'
    })
  })

  it('layout drops stored false raw-mode entries and keeps the true ones', async () => {
    seed(payloads)
    const stores = await loadStores()
    await flushPrune()
    const rawMode = stores['mz-plugin-studio-ui'].getState().rawModeByPluginId as Record<
      string,
      boolean
    >
    expect(rawMode).not.toHaveProperty(IMPORTED_SAVED)
    expect(rawMode[IMPORTED_UNSHOWN]).toBe(true)
  })

  it('an imported tab keeps its file text and raw mode across a restart', async () => {
    seed({})
    const first = await loadStores()
    const file = 'Fixture_HandWritten.js'
    const text = readFileSync(fixturePath('js', 'plugins', file), 'utf-8')
    const opened: PluginDefinition = { ...PluginParser.parsePlugin(text, file), importedFrom: file }
    const plugin = first['mz-plugin-studio-plugin'].getState() as unknown as {
      openPlugin(def: PluginDefinition): void
    }
    plugin.openPlugin(opened)
    const written = writeAll(first)
    expect(written['mz-plugin-studio-plugin']).not.toContain('codeBody')

    seed(written)
    const again = await loadStores()
    await flushPrune()
    const state = again['mz-plugin-studio-plugin'].getState()
    const tab = (state.openPlugins as PluginDefinition[])[0]
    expect(tab.rawSource).toBe(text)
    expect(tab.importedFrom).toBe(file)
    expect((state.baselineByPluginId as Record<string, PluginBaseline>)[tab.id]).toEqual(
      JSON.parse(JSON.stringify(toBaseline(opened)))
    )
    const rawMode = again['mz-plugin-studio-ui'].getState().rawModeByPluginId as Record<
      string,
      boolean
    >
    expect(isRawMode(tab, rawMode[tab.id])).toBe(true)
    const baseline = (state.baselineByPluginId as Record<string, PluginBaseline>)[tab.id]
    expect(generatePluginOutput(tab, true, baseline)).toEqual({ ok: true, code: text })
  })

  it('entries of closed tabs are dropped while loading and hydration finishes', async () => {
    const saved = JSON.parse(payloads['mz-plugin-studio-plugin'] as string) as {
      state: {
        dirtyByPluginId: Record<string, boolean>
        savedPathsByPluginId: Record<string, string>
      }
    }
    saved.state.dirtyByPluginId['stale-tab'] = true
    saved.state.savedPathsByPluginId['stale-tab'] = '/fixture/mz-project/js/plugins/Stale.js'
    seed({ ...payloads, 'mz-plugin-studio-plugin': JSON.stringify(saved) })
    const stores = await loadStores()
    await flushPrune()
    const plugin = stores['mz-plugin-studio-plugin']
    expect(plugin.getState().dirtyByPluginId).not.toHaveProperty('stale-tab')
    expect(plugin.getState().savedPathsByPluginId).not.toHaveProperty('stale-tab')
    expect(plugin.persist.hasHydrated()).toBe(true)
    expect(writeAll(stores)['mz-plugin-studio-plugin']).not.toContain('stale-tab')
  })

  it('presets load through the parameter check', async () => {
    seed(payloads)
    const stores = await loadStores()
    const presets = stores['mz-plugin-studio-settings'].getState().parameterPresets as Record<
      string,
      Record<string, unknown>[]
    >
    const stored = stateOf('mz-plugin-studio-settings').parameterPresets as Record<
      string,
      Record<string, unknown>[]
    >
    const { min, ...kept } = stored['Synthetic movement'][0]
    expect(min).toBeNull()
    expect(presets['Synthetic movement'][0]).toEqual(kept)
    expect(presets['Synthetic movement'][0]).not.toHaveProperty('min')
    expect(presets['Synthetic flags']).toEqual(stored['Synthetic flags'])
  })
})
