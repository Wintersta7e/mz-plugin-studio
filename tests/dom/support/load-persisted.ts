// Imports every persisted store afresh, so each hydrates from what localStorage holds now.
import { vi } from 'vitest'
import { isRecord } from '../../../src/renderer/src/stores/persist'
import { PERSISTED_KEYS, type PersistedKey } from '../../helpers/persist-v160'

export interface PersistedHook {
  getState(): Record<string, unknown>
  setState(partial: Record<string, unknown>): void
  persist: { getOptions(): { version?: number }; hasHydrated(): boolean }
}

function isPersistedHook(value: unknown): value is PersistedHook {
  return (
    typeof value === 'function' &&
    'getState' in value &&
    'setState' in value &&
    'persist' in value &&
    isRecord(value.persist) &&
    typeof value.getState === 'function' &&
    typeof value.setState === 'function' &&
    typeof Reflect.get(value.persist, 'getOptions') === 'function' &&
    typeof Reflect.get(value.persist, 'hasHydrated') === 'function'
  )
}

function persistedHook(value: unknown): PersistedHook {
  if (isPersistedHook(value)) return value
  throw new TypeError('persisted store hook has no persist API')
}

export function seed(values: Partial<Record<PersistedKey, string>>): void {
  localStorage.clear()
  for (const [key, value] of Object.entries(values)) localStorage.setItem(key, value)
}

/**
Imports every persisted store afresh; each hydrates from localStorage on import.
*/
export async function loadStores(): Promise<Record<PersistedKey, PersistedHook>> {
  vi.resetModules()
  const plugin = await import('../../../src/renderer/src/stores/pluginStore')
  const ui = await import('../../../src/renderer/src/stores/uiStore')
  const settings = await import('../../../src/renderer/src/stores/settingsStore')
  const project = await import('../../../src/renderer/src/stores/projectStore')
  const templates = await import('../../../src/renderer/src/stores/templateStore')
  return {
    'mz-plugin-studio-plugin': persistedHook(plugin.usePluginStore),
    'mz-plugin-studio-ui': persistedHook(ui.useUIStore),
    'mz-plugin-studio-settings': persistedHook(settings.useSettingsStore),
    'mz-plugin-studio-project': persistedHook(project.useProjectStore),
    'mz-plugin-studio-templates': persistedHook(templates.useTemplateStore)
  }
}

/**
Lets the ui store's deferred prune of raw-mode entries run.
*/
export const flushPrune = async (): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, 0))

/**
Has every store write its state and returns what each wrote.
*/
export function writeAll(
  stores: Record<PersistedKey, PersistedHook>
): Record<PersistedKey, string> {
  const written: Record<PersistedKey, string> = {
    'mz-plugin-studio-plugin': '',
    'mz-plugin-studio-ui': '',
    'mz-plugin-studio-settings': '',
    'mz-plugin-studio-project': '',
    'mz-plugin-studio-templates': ''
  }
  for (const key of PERSISTED_KEYS) {
    stores[key].setState({})
    const value = localStorage.getItem(key)
    if (value === null) throw new Error(`store ${key} did not persist`)
    written[key] = value
  }
  return written
}
