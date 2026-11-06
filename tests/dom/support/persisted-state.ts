// Typed views of persisted state: the store hooks the last `loadStores` imported, and saved JSON
// read through checks, so a wrong shape fails by name instead of a cast hiding it.
import { isRecord } from '../../../src/renderer/src/stores/persist'
import type { usePluginStore } from '../../../src/renderer/src/stores/pluginStore'
import type { useSettingsStore } from '../../../src/renderer/src/stores/settingsStore'
import type { useUIStore } from '../../../src/renderer/src/stores/uiStore'
import type { PersistedKey } from '../../helpers/persist-v160'
import type { PersistedHook } from './load-persisted'

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

/**
The typed hooks of the store modules `loadStores` imported last: importing them again reads the
same module registry, and each must be the very hook `stores` holds.
*/
export async function typedStores(
  stores: Record<PersistedKey, PersistedHook>
): Promise<TypedStores> {
  const { usePluginStore: plugin } = await import('../../../src/renderer/src/stores/pluginStore')
  const { useUIStore: ui } = await import('../../../src/renderer/src/stores/uiStore')
  const { useSettingsStore: settings } =
    await import('../../../src/renderer/src/stores/settingsStore')
  const isSame =
    Object.is(plugin, stores['mz-plugin-studio-plugin']) &&
    Object.is(ui, stores['mz-plugin-studio-ui']) &&
    Object.is(settings, stores['mz-plugin-studio-settings'])
  if (!isSame) throw new Error('the store modules differ from the ones loaded last')
  return { plugin, ui, settings }
}
