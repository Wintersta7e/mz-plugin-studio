// Raw-mode switches saved for tabs that are no longer open are dropped when the stores load,
// both from the ui store's state and from what it saved; a load with none to drop saves nothing.
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { isRecord } from '../../src/renderer/src/stores/persist'
import { createEmptyPlugin } from '../../src/shared/types/plugin'
import { flushPrune, seed } from './support/load-persisted'

const UI_KEY = 'mz-plugin-studio-ui'

const openTab = { ...createEmptyPlugin(), id: 'A' }

// Tab A is open; Z was closed, but an unsaved-changes mark of Z is still saved.
const pluginPayload = JSON.stringify({
  state: {
    plugin: openTab,
    openPlugins: [openTab],
    activePluginId: 'A',
    isDirty: false,
    dirtyByPluginId: { Z: true },
    savedPathsByPluginId: {},
    baselineByPluginId: {},
    baseByPluginId: {},
    schemaVersion: 3
  },
  version: 0
})

function uiPayload(rawModeByPluginId: Record<string, boolean>): string {
  return JSON.stringify({
    state: {
      sidebarWidth: 320,
      previewWidth: 640,
      previewCollapsed: false,
      lastTemplateCategory: 'audio-system',
      rawModeByPluginId,
      schemaVersion: 2
    },
    version: 0
  })
}

function storedRawMode(): unknown {
  const stored: unknown = JSON.parse(localStorage.getItem(UI_KEY) ?? '{}')
  if (!isRecord(stored)) return undefined
  const { state } = stored
  if (!isRecord(state)) return undefined
  const { rawModeByPluginId } = state
  return rawModeByPluginId
}

describe('raw-mode switches of closed tabs on load', () => {
  // The first import of the stores in a run is compiled module by module, so a timer can run
  // between two store modules, a gap the app's bundle never has. Compile them once up front.
  beforeAll(async () => {
    localStorage.clear()
    await import('../../src/renderer/src/stores/index')
    await flushPrune()
  })

  beforeEach(() => {
    vi.resetModules()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('drops the closed tab when every store loads', async () => {
    expect.assertions(2)

    seed({ 'mz-plugin-studio-plugin': pluginPayload, [UI_KEY]: uiPayload({ A: true, Z: true }) })
    const { useUIStore } = await import('../../src/renderer/src/stores/index')
    await flushPrune()

    expect(useUIStore.getState().rawModeByPluginId).toStrictEqual({ A: true })
    expect(storedRawMode()).toStrictEqual({ A: true })
  })

  it('drops the closed tab when only the plugin store is loaded', async () => {
    expect.assertions(2)

    seed({ 'mz-plugin-studio-plugin': pluginPayload, [UI_KEY]: uiPayload({ A: true, Z: true }) })
    await import('../../src/renderer/src/stores/pluginStore')
    const { useUIStore } = await import('../../src/renderer/src/stores/uiStore')
    await flushPrune()

    expect(useUIStore.getState().rawModeByPluginId).toStrictEqual({ A: true })
    expect(storedRawMode()).toStrictEqual({ A: true })
  })

  it('saves nothing when no open tab was closed', async () => {
    expect.assertions(2)

    seed({ 'mz-plugin-studio-plugin': pluginPayload, [UI_KEY]: uiPayload({ A: true }) })
    const setItem = vi.spyOn(Storage.prototype, 'setItem')
    const { useUIStore } = await import('../../src/renderer/src/stores/index')
    await flushPrune()
    const uiWrites = setItem.mock.calls.filter(([key]) => key === UI_KEY).length
    process.stdout.write(`-ui writes: ${String(uiWrites)}\n`)

    expect(uiWrites).toBe(0)
    expect(useUIStore.getState().rawModeByPluginId).toStrictEqual({ A: true })
  })
})
