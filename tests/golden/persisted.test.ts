// The exact saved form of each store, empty and populated, pinned before schema versioning
// changes it.
import { beforeEach, describe, it, expect, vi } from 'vitest'
import { byCodeUnit, normaliseIds } from './corpus/normalise'
import { POPULATED, persistedStores } from './corpus/persisted'

interface StoreHook {
  setState(partial: Record<string, unknown>): void
  getState(): Record<string, unknown>
}

const stores = persistedStores()

// Every string `id` property in `value`, depth first (an array's entries are its items).
function ids(value: unknown): string[] {
  if (typeof value !== 'object' || value === null) return []
  const found: string[] = []
  const entries: [string, unknown][] = Object.entries(value)
  for (const [k, v] of entries) {
    if (k === 'id' && typeof v === 'string') found.push(v)
    else found.push(...ids(v))
  }
  return found
}

const isStoreHook = (value: unknown): value is StoreHook =>
  typeof value === 'function' &&
  'getState' in value &&
  typeof value.getState === 'function' &&
  'setState' in value &&
  typeof value.setState === 'function'

// The store `exportName` of a fresh copy of `modulePath`, which loads what localStorage holds.
async function freshStore(modulePath: string, exportName: string): Promise<StoreHook> {
  vi.resetModules()
  const module: unknown = await import(modulePath)
  const store: unknown =
    typeof module === 'object' && module !== null ? Reflect.get(module, exportName) : undefined
  if (!isStoreHook(store)) throw new Error(`${modulePath} exports no store ${exportName}`)
  return store
}

describe('persisted store goldens', () => {
  // The ui store's load defers a prune of raw-mode entries to the next tick, and the prune saves.
  // Let one queued by an earlier case run now, not after this case has cleared storage.
  beforeEach(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0))
  })

  it('finds every persisted store and a populated state for each', () => {
    const keys = stores.map((s) => s.key)
    const populated = keys.filter((k) => Object.hasOwn(POPULATED, k)).length
    process.stdout.write(`persisted keys ${String(populated)}/${String(keys.length)}\n`)

    expect(keys.length).toBeGreaterThan(0)
    expect(new Set(keys).size).toBe(keys.length)
    expect(keys.toSorted(byCodeUnit)).toStrictEqual(Object.keys(POPULATED).toSorted(byCodeUnit))
  })

  const savedForms = stores.flatMap((store) =>
    (['default', 'populated'] as const).map((state) => ({ ...store, state }))
  )

  it.each(savedForms)('$key: $state', async ({ key, modulePath, exportName, state }) => {
    expect.assertions(2)

    localStorage.clear()
    const store = await freshStore(modulePath, exportName)
    store.setState(state === 'default' ? {} : (POPULATED[key] ?? {}))
    const raw = localStorage.getItem(key)

    expect(raw, `${key} wrote nothing`).not.toBeNull()
    await expect(normaliseIds(raw ?? '') + '\n').toMatchFileSnapshot(
      `__golden__/persisted/${key}.${state}.json`
    )
  })

  // A restart loads the saved form back through each store's shape checks, which keep the id of
  // every plugin, parameter and entry they restore; a new id would orphan what refers to the old.
  const withIds = stores.filter(({ key }) => ids(Object.values(POPULATED[key] ?? {})).length > 0)

  it('finds stores that save ids', () => {
    expect(withIds.length).toBeGreaterThan(0)
  })

  it.each(withIds)(
    '$key: keeps every saved id across a restart',
    async ({ key, modulePath, exportName }) => {
      expect.assertions(1)

      localStorage.clear()
      const populated = POPULATED[key] ?? {}
      const saving = await freshStore(modulePath, exportName)
      saving.setState(populated)
      const loading = await freshStore(modulePath, exportName)
      const restored = loading.getState()
      const fields = Object.keys(populated)

      expect(ids(fields.map((f) => restored[f]))).toStrictEqual(
        ids(fields.map((f) => populated[f]))
      )
    }
  )
})
