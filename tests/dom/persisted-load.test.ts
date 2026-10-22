// What the app loads from the values v1.6.0 saved: each store is imported afresh over the
// captured localStorage, so the real persist middleware hydrates it.
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { generatePlugin } from '../../src/renderer/src/lib/generator'
import { generatePluginOutput } from '../../src/renderer/src/lib/plugin-output'
import type { PluginDefinition } from '../../src/shared/types/plugin'
import { PERSISTED_KEYS, readV160Payloads } from '../helpers/persist-v160'
import type { PersistedKey } from '../helpers/persist-v160'

interface PersistedHook {
  getState(): Record<string, unknown>
  persist: { getOptions(): { version?: number }; hasHydrated(): boolean }
}

const payloads = readV160Payloads()
const IMPORTED_SAVED = '00000000-0000-4000-8000-000000000013'
const IMPORTED_UNSHOWN = '00000000-0000-4000-8000-000000000029'

function seed(values: Partial<Record<PersistedKey, string>>): void {
  localStorage.clear()
  for (const [key, value] of Object.entries(values)) localStorage.setItem(key, value)
}

/** Imports every persisted store afresh; each hydrates from localStorage on import. */
async function loadStores(): Promise<Record<PersistedKey, PersistedHook>> {
  vi.resetModules()
  const plugin = await import('../../src/renderer/src/stores/pluginStore')
  const ui = await import('../../src/renderer/src/stores/uiStore')
  const settings = await import('../../src/renderer/src/stores/settingsStore')
  const project = await import('../../src/renderer/src/stores/projectStore')
  const templates = await import('../../src/renderer/src/stores/templateStore')
  return {
    'mz-plugin-studio-plugin': plugin.usePluginStore as unknown as PersistedHook,
    'mz-plugin-studio-ui': ui.useUIStore as unknown as PersistedHook,
    'mz-plugin-studio-settings': settings.useSettingsStore as unknown as PersistedHook,
    'mz-plugin-studio-project': project.useProjectStore as unknown as PersistedHook,
    'mz-plugin-studio-templates': templates.useTemplateStore as unknown as PersistedHook
  }
}

/** Lets the ui store's deferred prune of raw-mode entries run. */
const flushPrune = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0))

const stateOf = (key: PersistedKey): Record<string, unknown> =>
  (JSON.parse(payloads[key] as string) as { state: Record<string, unknown> }).state

describe('loading the state v1.6.0 saved', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('each saved store loads every field', async () => {
    const keys = PERSISTED_KEYS.filter((key) => payloads[key] !== undefined)
    seed(payloads)
    const stores = await loadStores()
    await flushPrune()
    let fields = 0
    for (const key of keys) {
      const state = stores[key].getState()
      for (const [field, value] of Object.entries(stateOf(key))) {
        expect(state[field], `${key}.${field}`).toEqual(value)
        fields++
      }
      expect(stores[key].persist.getOptions().version, key).toBe(0)
    }
    console.log(`keys ${keys.length}/${PERSISTED_KEYS.length}, fields ${fields}`)
    expect(keys).toHaveLength(5)
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

  it('entries of closed tabs survive loading and hydration never finishes', async () => {
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
    expect(plugin.getState().dirtyByPluginId).toHaveProperty('stale-tab', true)
    expect(plugin.getState().savedPathsByPluginId).toHaveProperty(
      'stale-tab',
      '/fixture/mz-project/js/plugins/Stale.js'
    )
    expect(plugin.persist.hasHydrated()).toBe(false)
  })

  it('presets load as stored', async () => {
    seed(payloads)
    const stores = await loadStores()
    const presets = stores['mz-plugin-studio-settings'].getState().parameterPresets as Record<
      string,
      { min?: number | null }[]
    >
    expect(presets['Synthetic movement'][0].min).toBeNull()
    expect(presets).toEqual(stateOf('mz-plugin-studio-settings').parameterPresets)
  })
})
