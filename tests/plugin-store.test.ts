// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { usePluginStore } from '../src/renderer/src/stores/pluginStore'
import { createEmptyPlugin } from '../src/renderer/src/types/plugin'

function resetPluginStore() {
  localStorage.clear()
  usePluginStore.setState(usePluginStore.getInitialState(), true)
}

function createPlugin(name: string) {
  const plugin = createEmptyPlugin()
  plugin.meta.name = name
  return plugin
}

describe('pluginStore multi-plugin state', () => {
  beforeEach(() => {
    resetPluginStore()
  })

  it('keeps edits synced to the open plugin list and restores dirty state per plugin', () => {
    const alpha = createPlugin('Alpha')
    const beta = createPlugin('Beta')

    usePluginStore.getState().openPlugin(alpha)
    usePluginStore.getState().openPlugin(beta)
    usePluginStore.getState().setActivePlugin(alpha.id)
    usePluginStore.getState().updateMeta({ name: 'Alpha Updated' })

    expect(usePluginStore.getState().plugin.meta.name).toBe('Alpha Updated')
    expect(
      usePluginStore.getState().openPlugins.find((plugin) => plugin.id === alpha.id)?.meta.name
    ).toBe('Alpha Updated')
    expect(usePluginStore.getState().isDirty).toBe(true)

    usePluginStore.getState().setActivePlugin(beta.id)
    expect(usePluginStore.getState().plugin.id).toBe(beta.id)
    expect(usePluginStore.getState().isDirty).toBe(false)

    usePluginStore.getState().setActivePlugin(alpha.id)
    expect(usePluginStore.getState().plugin.meta.name).toBe('Alpha Updated')
    expect(usePluginStore.getState().isDirty).toBe(true)
  })

  it('tracks saved paths per plugin and does not clear dirty state on setPlugin', () => {
    const alpha = createPlugin('Alpha')
    const beta = createPlugin('Beta')

    usePluginStore.getState().openPlugin(alpha)
    usePluginStore.getState().updateMeta({ version: '1.1.0' })
    usePluginStore.getState().setSavedPath('/tmp/alpha.js')

    const alphaSnapshot = { ...usePluginStore.getState().plugin }
    usePluginStore.getState().setPlugin(alphaSnapshot)

    expect(usePluginStore.getState().isDirty).toBe(true)
    expect(usePluginStore.getState().savedPath).toBe('/tmp/alpha.js')

    usePluginStore.getState().openPlugin(beta)
    expect(usePluginStore.getState().savedPath).toBeNull()

    usePluginStore.getState().setSavedPath('/tmp/beta.js')
    usePluginStore.getState().setActivePlugin(alpha.id)
    expect(usePluginStore.getState().savedPath).toBe('/tmp/alpha.js')

    usePluginStore.getState().setActivePlugin(beta.id)
    expect(usePluginStore.getState().savedPath).toBe('/tmp/beta.js')
  })

  it('closes the active plugin and restores the previous tab with its saved state', () => {
    const alpha = createPlugin('Alpha')
    const beta = createPlugin('Beta')

    usePluginStore.getState().openPlugin(alpha)
    usePluginStore.getState().updateMeta({ description: 'Alpha changed' })
    usePluginStore.getState().setSavedPath('/tmp/alpha.js')

    usePluginStore.getState().openPlugin(beta)
    usePluginStore.getState().updateMeta({ description: 'Beta changed' })
    usePluginStore.getState().setSavedPath('/tmp/beta.js')

    usePluginStore.getState().closePlugin(beta.id)

    expect(usePluginStore.getState().openPlugins.map((plugin) => plugin.id)).toEqual([alpha.id])
    expect(usePluginStore.getState().activePluginId).toBe(alpha.id)
    expect(usePluginStore.getState().plugin.id).toBe(alpha.id)
    expect(usePluginStore.getState().isDirty).toBe(true)
    expect(usePluginStore.getState().savedPath).toBe('/tmp/alpha.js')
    expect(usePluginStore.getState().dirtyByPluginId).toEqual({ [alpha.id]: true })
    expect(usePluginStore.getState().savedPathsByPluginId).toEqual({
      [alpha.id]: '/tmp/alpha.js'
    })
  })

  it('clears per-plugin bookkeeping when dirty and saved path state are reset', () => {
    const alpha = createPlugin('Alpha')

    usePluginStore.getState().openPlugin(alpha)
    usePluginStore.getState().setDirty(true)
    usePluginStore.getState().setSavedPath('/tmp/alpha.js')

    expect(usePluginStore.getState().dirtyByPluginId).toEqual({ [alpha.id]: true })
    expect(usePluginStore.getState().savedPathsByPluginId).toEqual({
      [alpha.id]: '/tmp/alpha.js'
    })

    usePluginStore.getState().setDirty(false)
    usePluginStore.getState().setSavedPath(null)

    expect(usePluginStore.getState().isDirty).toBe(false)
    expect(usePluginStore.getState().savedPath).toBeNull()
    expect(usePluginStore.getState().dirtyByPluginId).toEqual({})
    expect(usePluginStore.getState().savedPathsByPluginId).toEqual({})
  })

  it('resets to a fresh editor state when the last open plugin is closed', () => {
    const alpha = createPlugin('Alpha')

    usePluginStore.getState().openPlugin(alpha)
    usePluginStore.getState().updateMeta({ description: 'Unsaved changes' })
    usePluginStore.getState().setSavedPath('/tmp/alpha.js')

    usePluginStore.getState().closePlugin(alpha.id)

    expect(usePluginStore.getState().openPlugins).toHaveLength(0)
    expect(usePluginStore.getState().activePluginId).toBeNull()
    expect(usePluginStore.getState().isDirty).toBe(false)
    expect(usePluginStore.getState().savedPath).toBeNull()
    expect(usePluginStore.getState().dirtyByPluginId).toEqual({})
    expect(usePluginStore.getState().savedPathsByPluginId).toEqual({})
    expect(usePluginStore.getState().plugin.meta.name).toBe('NewPlugin')
    expect(usePluginStore.getState().plugin.id).not.toBe(alpha.id)
  })

  it('ignores attempts to activate a plugin that is not open', () => {
    const alpha = createPlugin('Alpha')

    usePluginStore.getState().openPlugin(alpha)
    const snapshot = usePluginStore.getState()

    usePluginStore.getState().setActivePlugin('missing-plugin')

    expect(usePluginStore.getState().activePluginId).toBe(snapshot.activePluginId)
    expect(usePluginStore.getState().plugin.id).toBe(snapshot.plugin.id)
    expect(usePluginStore.getState().openPlugins).toEqual(snapshot.openPlugins)
  })
})
