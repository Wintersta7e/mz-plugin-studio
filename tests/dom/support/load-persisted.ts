// Imports every persisted store afresh, so each hydrates from what localStorage holds now.
import { vi } from 'vitest'
import type { PersistedKey } from '../../helpers/persist-v160'

export interface PersistedHook {
  getState(): Record<string, unknown>
  setState(partial: Record<string, unknown>): void
  persist: { getOptions(): { version?: number }; hasHydrated(): boolean }
}

export function seed(values: Partial<Record<PersistedKey, string>>): void {
  localStorage.clear()
  for (const [key, value] of Object.entries(values)) localStorage.setItem(key, value)
}

/** Imports every persisted store afresh; each hydrates from localStorage on import. */
export async function loadStores(): Promise<Record<PersistedKey, PersistedHook>> {
  vi.resetModules()
  const plugin = await import('../../../src/renderer/src/stores/pluginStore')
  const ui = await import('../../../src/renderer/src/stores/uiStore')
  const settings = await import('../../../src/renderer/src/stores/settingsStore')
  const project = await import('../../../src/renderer/src/stores/projectStore')
  const templates = await import('../../../src/renderer/src/stores/templateStore')
  return {
    'mz-plugin-studio-plugin': plugin.usePluginStore as unknown as PersistedHook,
    'mz-plugin-studio-ui': ui.useUIStore as unknown as PersistedHook,
    'mz-plugin-studio-settings': settings.useSettingsStore as unknown as PersistedHook,
    'mz-plugin-studio-project': project.useProjectStore as unknown as PersistedHook,
    'mz-plugin-studio-templates': templates.useTemplateStore as unknown as PersistedHook
  }
}

/** Lets the ui store's deferred prune of raw-mode entries run. */
export const flushPrune = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0))

/** Has every store write its state and returns what each wrote. */
export function writeAll(
  stores: Record<PersistedKey, PersistedHook>
): Record<PersistedKey, string> {
  const written = {} as Record<PersistedKey, string>
  for (const key of Object.keys(stores) as PersistedKey[]) {
    stores[key].setState({})
    written[key] = localStorage.getItem(key) as string
  }
  return written
}
