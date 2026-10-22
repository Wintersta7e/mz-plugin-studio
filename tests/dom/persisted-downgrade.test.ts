// Opening saved state in v1.6.0 again: its own persist options read each captured value and
// write it back unchanged.
import { beforeEach, describe, expect, it } from 'vitest'
import { PERSISTED_KEYS, createV160Stores, readV160Payloads } from '../helpers/persist-v160'

const payloads = readV160Payloads()

describe('downgrade to v1.6.0', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it("v1.6.0's options write each captured payload back unchanged", async () => {
    const keys = PERSISTED_KEYS.filter((key) => payloads[key] !== undefined)
    for (const key of keys) localStorage.setItem(key, payloads[key] as string)
    const stores = createV160Stores()
    // The ui store prunes raw-mode entries one tick after loading.
    await new Promise((resolve) => setTimeout(resolve, 0))
    for (const key of keys) {
      stores[key].setState({})
      expect(localStorage.getItem(key), key).toBe(payloads[key])
    }
    console.log(`keys ${keys.length}/${PERSISTED_KEYS.length}`)
    expect(keys).toHaveLength(5)
  })
})
