// Opening saved state in v1.6.0 again: its own persist options read each captured value and
// write it back unchanged, and what it writes back over this version's state loads again here.
import { readFileSync } from 'fs'
import { beforeEach, describe, expect, it } from 'vitest'
import { PluginParser } from '../../src/main/services/pluginParser'
import { isImported } from '../../src/renderer/src/lib/plugin-output'
import type { FileBase } from '../../src/shared/ipc-types'
import type { PluginDefinition } from '../../src/shared/types/plugin'
import { fixturePath } from '../helpers/fixture-project'
import { PERSISTED_KEYS, createV160Stores, readV160Payloads } from '../helpers/persist-v160'
import { flushPrune, loadStores, seed, writeAll } from './support/load-persisted'

const payloads = readV160Payloads()

const tabsOf = (state: Record<string, unknown>): PluginDefinition[] =>
  state.openPlugins as PluginDefinition[]

const tabIds = (state: Record<string, unknown>): string[] => tabsOf(state).map((p) => p.id)

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
    // A tab imported in this version, so the saved state holds its file text, baseline and file.
    const file = 'Fixture_HandWritten.js'
    const text = readFileSync(fixturePath('js', 'plugins', file), 'utf-8')
    const plugin = current['mz-plugin-studio-plugin'].getState() as unknown as {
      openPlugin(def: PluginDefinition, base: FileBase): void
    }
    const opened = { ...PluginParser.parsePlugin(text, file), importedFrom: file }
    plugin.openPlugin(opened, { path: fixturePath('js', 'plugins', file), sha256: 'ab' })
    const savedPaths = current['mz-plugin-studio-plugin'].getState().savedPathsByPluginId as Record<
      string,
      string
    >
    expect(Object.keys(savedPaths)).toHaveLength(2)
    const before = Object.fromEntries(
      PERSISTED_KEYS.map((key) => [key, JSON.stringify(current[key].getState())])
    )
    const beforeTabs = tabsOf(current['mz-plugin-studio-plugin'].getState())
    const written = writeAll(current)
    expect(written['mz-plugin-studio-plugin']).toContain('"rawSource"')
    expect(written['mz-plugin-studio-plugin']).toContain('"baselineByPluginId"')
    expect(written['mz-plugin-studio-plugin']).toContain('"baseByPluginId"')

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
    expect(downgraded['mz-plugin-studio-plugin']).not.toContain('"rawSource"')
    expect(downgraded['mz-plugin-studio-plugin']).not.toContain('"baselineByPluginId"')
    expect(downgraded['mz-plugin-studio-plugin']).not.toContain('"baseByPluginId"')

    seed(downgraded)
    const again = await loadStores()
    await flushPrune()
    for (const key of PERSISTED_KEYS) {
      if (key === 'mz-plugin-studio-plugin') continue
      expect(JSON.stringify(again[key].getState()), key).toBe(before[key])
    }
    const pluginState = again['mz-plugin-studio-plugin'].getState()
    const tabs = tabsOf(pluginState)
    expect(tabs.map((p) => p.id)).toEqual(beforeTabs.map((p) => p.id))
    expect(tabs.map((p) => p.importedFrom)).toEqual(beforeTabs.map((p) => p.importedFrom))
    expect(tabs.filter(isImported).map((p) => 'rawSource' in p)).toEqual([false, false, false])
    expect(pluginState.baselineByPluginId).toEqual({})
    // The file each tab last saved comes back from its saved path, contents unknown
    expect(pluginState.baseByPluginId).toEqual(
      Object.fromEntries(
        Object.entries(savedPaths).map(([id, path]) => [id, { path, sha256: null }])
      )
    )
    expect(tabIds(pluginState).slice(0, -1)).toEqual(
      tabIds(JSON.parse(payloads['mz-plugin-studio-plugin'] as string).state)
    )
    console.log(`keys ${PERSISTED_KEYS.length}/${PERSISTED_KEYS.length}`)
  })
})
