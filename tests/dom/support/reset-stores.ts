// Puts every store back to the state it was created with and empties persisted storage, so each
// test starts from a fresh app.
import type { StoreApi } from 'zustand'
import {
  useHistoryStore,
  usePluginStore,
  useProjectStore,
  useSettingsStore,
  useTemplateStore,
  useToastStore,
  useUIStore
} from '../../../src/renderer/src/stores'

function resetterOf<T>(store: StoreApi<T>): () => void {
  const initial = store.getInitialState()
  return () => store.setState(initial, true)
}

// Captured at module load, before any test changes a store.
const RESETTERS = [
  resetterOf(useHistoryStore),
  resetterOf(usePluginStore),
  resetterOf(useProjectStore),
  resetterOf(useSettingsStore),
  resetterOf(useTemplateStore),
  resetterOf(useToastStore),
  resetterOf(useUIStore)
]

export function resetStores(): void {
  for (const reset of RESETTERS) reset()
  localStorage.clear()
}
