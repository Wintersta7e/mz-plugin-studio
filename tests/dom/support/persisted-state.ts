// Typed views of persisted state: the store hooks the last `loadStores` imported, and saved JSON
// read through checks, so a wrong shape fails by name instead of a cast hiding it.
import { isRecord } from '../../../src/renderer/src/stores/persist'
import type { usePluginStore } from '../../../src/renderer/src/stores/plugin-store'
import type { useSettingsStore } from '../../../src/renderer/src/stores/settings-store'
import type { useUIStore } from '../../../src/renderer/src/stores/ui-store'
import type { PersistedKey } from '../../helpers/persist-v160'
import { flushStores, type PersistedHook } from './load-persisted'

export interface TypedStores {
  plugin: typeof usePluginStore
  ui: typeof useUIStore
  settings: typeof useSettingsStore
}

export function recordOf(value: unknown, what: string): Record<string, unknown> {
  if (!isRecord(value)) throw new TypeError(`${what} is no object`)
  return value
}

export function recordsOf(value: unknown, what: string): Record<string, unknown>[] {
  if (!Array.isArray(value)) throw new TypeError(`${what} is no list`)
  const items: unknown[] = value
  return items.map((item, index) => recordOf(item, `${what}[${String(index)}]`))
}

/**
What storage holds for `key` once the stores, imported with the test or by `loadStores`, have
written every change they hold.
*/
export function storedText(key: PersistedKey): string | null {
  flushStores()
  return localStorage.getItem(key)
}

// The envelope persist writes: `{ state, version }`
export function envelopeOf(raw: string | null | undefined, what: string): Record<string, unknown> {
  if (raw === null || raw === undefined) throw new TypeError(`${what} holds nothing`)
  const parsed: unknown = JSON.parse(raw)
  return recordOf(parsed, what)
}

export function savedStateOf(
  raw: string | null | undefined,
  what: string
): Record<string, unknown> {
  const { state } = envelopeOf(raw, what)
  return recordOf(state, `${what} state`)
}

const PLUGIN_INDEX: PersistedKey = 'mz-plugin-studio-plugin'

/**
The plugin store's saved state as one record, put together here from what storage holds once the
stores have written every change: the index's tab order and active tab, and from the key of each
tab it lists that tab's definition, unsaved mark, saved path, last-saved copy and file, in maps
keyed by tab id as the store holds them.
*/
export function storedPluginState(): Record<string, unknown> {
  const index = savedStateOf(storedText(PLUGIN_INDEX), 'the plugin index')
  const { tabIds } = index
  if (!Array.isArray(tabIds)) throw new TypeError('the plugin index lists no tabs')
  const listed: unknown[] = tabIds
  const tabs = listed.map((id) => {
    if (typeof id !== 'string') throw new TypeError('the plugin index lists a tab by no id')
    const saved = localStorage.getItem(`${PLUGIN_INDEX}.tab.${id}`)
    if (saved === null) throw new TypeError(`tab ${id} has no saved key`)
    const parsed: unknown = JSON.parse(saved)
    return { id, tab: recordOf(recordOf(parsed, `tab key ${id}`)['tab'], `tab ${id}`) }
  })
  const byTab = (field: string): Record<string, unknown> =>
    Object.fromEntries(
      tabs.flatMap(({ id, tab }) => (tab[field] === undefined ? [] : [[id, tab[field]]]))
    )
  return {
    schemaVersion: index['schemaVersion'],
    openPlugins: tabs.map(({ tab }) => tab['definition']),
    activePluginId: index['activePluginId'],
    dirtyByPluginId: Object.fromEntries(
      tabs.filter(({ tab }) => tab['dirty'] === true).map(({ id }) => [id, true])
    ),
    savedPathsByPluginId: byTab('savedPath'),
    baselineByPluginId: byTab('baseline'),
    baseByPluginId: byTab('base')
  }
}

/**
The typed hooks of the store modules `loadStores` imported last: importing them again reads the
same module registry, and each must be the very hook `stores` holds.
*/
export async function typedStores(
  stores: Record<PersistedKey, PersistedHook>
): Promise<TypedStores> {
  const { usePluginStore: plugin } = await import('../../../src/renderer/src/stores/plugin-store')
  const { useUIStore: ui } = await import('../../../src/renderer/src/stores/ui-store')
  const { useSettingsStore: settings } =
    await import('../../../src/renderer/src/stores/settings-store')
  const isSame =
    Object.is(plugin, stores['mz-plugin-studio-plugin']) &&
    Object.is(ui, stores['mz-plugin-studio-ui']) &&
    Object.is(settings, stores['mz-plugin-studio-settings'])
  if (!isSame) throw new Error('the store modules differ from the ones loaded last')
  return { plugin, ui, settings }
}
