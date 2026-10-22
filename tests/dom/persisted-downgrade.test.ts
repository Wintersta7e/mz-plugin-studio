// Opening saved state in v1.6.0 again: its own persist options read each captured value and
// write it back unchanged, and what it writes back over this version's state loads again here.
import { beforeEach, describe, expect, it } from 'vitest'
import type { PluginDefinition } from '../../src/shared/types/plugin'
import { PERSISTED_KEYS, createV160Stores, readV160Payloads } from '../helpers/persist-v160'
import { flushPrune, loadStores, seed, writeAll } from './support/load-persisted'

const payloads = readV160Payloads()

const tabIds = (state: Record<string, unknown>): string[] =>
  (state.openPlugins as PluginDefinition[]).map((p) => p.id)

describe('downgrade to v1.6.0', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it("v1.6.0's options write each captured payload back unchanged", async () => {
    const keys = PERSISTED_KEYS.filter((key) => payloads[key] !== undefined)
    for (const key of keys) localStorage.setItem(key, payloads[key] as string)
    const stores = createV160Stores()
    // The ui store prunes raw-mode entries one tick after loading.
    await flushPrune()
    for (const key of keys) {
      stores[key].setState({})
      expect(localStorage.getItem(key), key).toBe(payloads[key])
    }
    console.log(`keys ${keys.length}/${PERSISTED_KEYS.length}`)
    expect(keys).toHaveLength(5)
  })

  it('what v1.6.0 writes back over this version loads again without losing a tab', async () => {
    seed(payloads)
    const current = await loadStores()
    await flushPrune()
    const before = Object.fromEntries(
      PERSISTED_KEYS.map((key) => [key, JSON.stringify(current[key].getState())])
    )
    const written = writeAll(current)

    seed(written)
    const old = createV160Stores()
    await flushPrune()
    const downgraded: Record<string, string> = {}
    for (const key of PERSISTED_KEYS) {
      old[key].setState({})
      downgraded[key] = localStorage.getItem(key) as string
      // v1.6.0 drops the schema number, so the next load runs every step again.
      expect(downgraded[key], key).not.toContain('schemaVersion')
    }

    seed(downgraded)
    const again = await loadStores()
    await flushPrune()
    for (const key of PERSISTED_KEYS) {
      expect(JSON.stringify(again[key].getState()), key).toBe(before[key])
    }
    expect(tabIds(again['mz-plugin-studio-plugin'].getState())).toEqual(
      tabIds(JSON.parse(payloads['mz-plugin-studio-plugin'] as string).state)
    )
    console.log(`keys ${PERSISTED_KEYS.length}/${PERSISTED_KEYS.length}`)
  })
})
