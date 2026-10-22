// What the app does today with saved data it cannot read, and with a full storage quota.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const KEY = 'mz-plugin-studio-settings'

async function loadSettingsStore() {
  vi.resetModules()
  return (await import('../../src/renderer/src/stores/settingsStore')).useSettingsStore
}

describe('damaged saved state', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('unreadable saved data loads defaults and is overwritten at the next change', async () => {
    localStorage.setItem(KEY, '{"state":')
    const useSettingsStore = await loadSettingsStore()
    const initial = useSettingsStore.getInitialState()
    expect(useSettingsStore.getState()).toEqual(initial)
    expect(useSettingsStore.getState().theme).toBe('dark')
    expect(localStorage.getItem(`${KEY}.backup`)).toBeNull()
    expect(localStorage.getItem(KEY)).toBe('{"state":')

    useSettingsStore.getState().setTheme('light')
    const stored = JSON.parse(localStorage.getItem(KEY) as string) as {
      state: { theme: string }
    }
    expect(stored.state.theme).toBe('light')
    expect(Object.keys(localStorage)).toEqual([KEY])
  })

  it('a full storage quota throws out of set', async () => {
    const useSettingsStore = await loadSettingsStore()
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('full', 'QuotaExceededError')
    })
    expect(() => useSettingsStore.getState().setTheme('light')).toThrow('full')
  })
})
