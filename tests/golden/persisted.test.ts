// The exact saved form of each store, empty and populated, pinned before schema versioning
// changes it.
import { describe, it, expect, vi } from 'vitest'
import { normaliseIds } from './corpus/normalise'
import { POPULATED, persistedStores } from './corpus/persisted'

interface StoreHook {
  setState(partial: Record<string, unknown>): void
}

const stores = persistedStores()

describe('persisted store goldens', () => {
  it('finds every persisted store and a populated state for each', () => {
    const keys = stores.map((s) => s.key)
    console.log(`persisted keys ${keys.filter((k) => k in POPULATED).length}/${keys.length}`)
    expect(keys.length).toBeGreaterThan(0)
    expect(new Set(keys).size).toBe(keys.length)
    expect([...keys].sort()).toEqual(Object.keys(POPULATED).sort())
  })

  for (const { key, modulePath, exportName } of stores) {
    for (const state of ['default', 'populated'] as const) {
      it(`${key}: ${state}`, async () => {
        localStorage.clear()
        vi.resetModules()
        const module = (await import(modulePath)) as Record<string, StoreHook>
        module[exportName].setState(state === 'default' ? {} : POPULATED[key])
        const raw = localStorage.getItem(key)
        expect(raw, `${key} wrote nothing`).not.toBeNull()
        await expect(normaliseIds(raw!) + '\n').toMatchFileSnapshot(
          `__golden__/persisted/${key}.${state}.json`
        )
      })
    }
  }
})
