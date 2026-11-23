// Imports every persisted store afresh, so each hydrates from what localStorage holds now.
import { vi } from 'vitest'
import { flushPersistedState, isRecord } from '../../../src/renderer/src/stores/persist'
import type * as Persist from '../../../src/renderer/src/stores/persist'
import { TAB_KEY_PREFIX } from '../../../src/renderer/src/stores/plugin-storage'
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

// The writer the stores imported after the last `resetStoreModules` write through
const loaded: { writer?: typeof Persist } = {}

/**
Writes every change still pending in the stores the test imported and in the ones imported after
the last `resetStoreModules`.
*/
export function flushStores(): void {
  flushPersistedState()
  loaded.writer?.flushPersistedState()
}

/**
Restores every stubbed global once the stores have written what they hold: a write asks main,
through the stubbed `api`, to put it on disk, so a write left for later would find no `api`.
*/
export function unstubGlobals(): void {
  flushStores()
  vi.unstubAllGlobals()
}

/**
`vi.resetModules()`, once the store modules imported so far have written what they hold and
removed their page listeners, so no replaced copy writes into a later test's storage.
*/
export async function resetStoreModules(): Promise<void> {
  flushStores()
  loaded.writer?.stopUnloadListeners()
  vi.resetModules()
  // the store modules imported next share this copy
  loaded.writer = await import('../../../src/renderer/src/stores/persist')
}

export function seed(values: Partial<Record<PersistedKey, string>>): void {
  // a pending write would land on top of the seed
  flushStores()
  localStorage.clear()
  for (const [key, value] of Object.entries(values)) localStorage.setItem(key, value)
}

/**
Imports every persisted store afresh; each hydrates from localStorage on import.
*/
export async function loadStores(): Promise<Record<PersistedKey, PersistedHook>> {
  await resetStoreModules()
  const plugin = await import('../../../src/renderer/src/stores/plugin-store')
  const ui = await import('../../../src/renderer/src/stores/ui-store')
  const settings = await import('../../../src/renderer/src/stores/settings-store')
  const project = await import('../../../src/renderer/src/stores/project-store')
  const templates = await import('../../../src/renderer/src/stores/template-store')
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
Has every store write its state and returns what each wrote: its key's text, and the text of each
tab key the plugin store keeps beside its own.
*/
export function writeAll(
  stores: Record<PersistedKey, PersistedHook>
): Record<PersistedKey, string> & Partial<Record<string, string>> {
  const written: Record<PersistedKey, string> = {
    'mz-plugin-studio-plugin': '',
    'mz-plugin-studio-ui': '',
    'mz-plugin-studio-settings': '',
    'mz-plugin-studio-project': '',
    'mz-plugin-studio-templates': ''
  }
  for (const key of PERSISTED_KEYS) {
    stores[key].setState({})
    flushStores()
    const value = localStorage.getItem(key)
    if (value === null) throw new Error(`store ${key} did not persist`)
    written[key] = value
  }
  const tabKeys = Object.keys(localStorage).filter((key) => key.startsWith(TAB_KEY_PREFIX))
  return {
    ...written,
    ...Object.fromEntries(tabKeys.map((key) => [key, localStorage.getItem(key) ?? '']))
  }
}
