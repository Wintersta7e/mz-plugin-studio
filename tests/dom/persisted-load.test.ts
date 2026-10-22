// What the app loads from the values v1.6.0 saved: each store is imported afresh over the
// captured localStorage, so the real persist middleware hydrates it.
import { beforeEach, describe, expect, it } from 'vitest'
import { generatePlugin } from '../../src/renderer/src/lib/generator'
import { generatePluginOutput } from '../../src/renderer/src/lib/plugin-output'
import type { PluginDefinition } from '../../src/shared/types/plugin'
import { PERSISTED_KEYS, readV160Payloads } from '../helpers/persist-v160'
import type { PersistedKey } from '../helpers/persist-v160'
import { flushPrune, loadStores, seed, writeAll } from './support/load-persisted'
import type { PersistedHook } from './support/load-persisted'

const payloads = readV160Payloads()
const IMPORTED_SAVED = '00000000-0000-4000-8000-000000000013'
const IMPORTED_UNSHOWN = '00000000-0000-4000-8000-000000000029'

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

/** v1.6.0 saved a cleared number limit as null; the parameter check leaves it out. */
function withoutNullLimits(presets: unknown): unknown {
  return Object.fromEntries(
    Object.entries(presets as Record<string, Record<string, unknown>[]>).map(([name, params]) => [
      name,
      params.map((p) => Object.fromEntries(Object.entries(p).filter(([, v]) => v !== null)))
    ])
  )
}

describe('loading the state v1.6.0 saved', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('each saved store loads every field and writes schema 1', async () => {
    const keys = PERSISTED_KEYS.filter((key) => payloads[key] !== undefined)
    seed(payloads)
    const stores = await loadStores()
    await flushPrune()
    let fields = 0
    for (const key of keys) {
      const state = stores[key].getState()
      for (const [field, value] of Object.entries(stateOf(key))) {
        const expected = field === 'parameterPresets' ? withoutNullLimits(value) : value
        expect(state[field], `${key}.${field}`).toEqual(expected)
        fields++
      }
      expect(stores[key].persist.getOptions().version, key).toBe(0)
    }
    const written = writeAll(stores)
    for (const key of keys) {
      const envelope = JSON.parse(written[key]) as { state: { schemaVersion?: number } }
      expect(envelope.state.schemaVersion, key).toBe(1)
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

  it('an imported tab comes back without its file text', async () => {
    seed(payloads)
    const stores = await loadStores()
    await flushPrune()
    const tabs = stores['mz-plugin-studio-plugin'].getState().openPlugins as PluginDefinition[]
    const tab = tabs.find((p) => p.id === IMPORTED_SAVED) as PluginDefinition
    expect(tab.codeBody).toEqual(expect.any(String))
    expect(tab).not.toHaveProperty('rawSource')
    const ui = stores['mz-plugin-studio-ui'].getState() as {
      getRawModeForPlugin(id: string, fallback?: boolean): boolean
    }
    expect(generatePluginOutput(tab, ui.getRawModeForPlugin(tab.id, false))).toBe(
      generatePlugin(tab)
    )
  })

  it('layout keeps the stored false raw-mode entry', async () => {
    seed(payloads)
    const stores = await loadStores()
    await flushPrune()
    const rawMode = stores['mz-plugin-studio-ui'].getState().rawModeByPluginId as Record<
      string,
      boolean
    >
    expect(rawMode[IMPORTED_SAVED]).toBe(false)
    expect(rawMode[IMPORTED_UNSHOWN]).toBe(true)
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
