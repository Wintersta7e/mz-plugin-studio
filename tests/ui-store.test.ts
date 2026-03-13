// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { useUIStore } from '../src/renderer/src/stores/uiStore'

function resetUIStore() {
  localStorage.clear()
  useUIStore.setState(useUIStore.getInitialState(), true)
}

describe('uiStore raw mode state', () => {
  beforeEach(() => {
    resetUIStore()
  })

  it('stores raw mode by plugin id and supports clearing closed plugin state', () => {
    useUIStore.getState().setRawModeForPlugin('plugin-a', true)
    useUIStore.getState().setRawModeForPlugin('plugin-b', false)

    expect(useUIStore.getState().getRawModeForPlugin('plugin-a')).toBe(true)
    expect(useUIStore.getState().getRawModeForPlugin('plugin-b', true)).toBe(false)
    expect(useUIStore.getState().getRawModeForPlugin('missing-plugin', true)).toBe(true)

    useUIStore.getState().clearRawModeForPlugin('plugin-a')
    expect(useUIStore.getState().getRawModeForPlugin('plugin-a')).toBe(false)
  })

  it('clamps preview width and persists only the intended ui fields', () => {
    useUIStore.getState().setSidebarWidth(360)
    useUIStore.getState().setPreviewWidth(120)
    useUIStore.getState().setActiveTab('preview')
    useUIStore.getState().setMainView('analysis')
    useUIStore.getState().setSelectedParameterId('param-1')
    useUIStore.getState().setRawModeForPlugin('plugin-a', true)

    expect(useUIStore.getState().previewWidth).toBe(300)

    useUIStore.getState().setPreviewWidth(1800)
    expect(useUIStore.getState().previewWidth).toBe(1200)

    const persisted = JSON.parse(localStorage.getItem('mz-plugin-studio-ui') ?? '{}')
    expect(persisted.state).toEqual({
      sidebarWidth: 360,
      previewWidth: 1200,
      rawModeByPluginId: { 'plugin-a': true }
    })
    expect(persisted.state).not.toHaveProperty('activeTab')
    expect(persisted.state).not.toHaveProperty('mainView')
    expect(persisted.state).not.toHaveProperty('selectedParameterId')
  })

  it('keeps raw mode unchanged when setting the same value or clearing an unknown plugin', () => {
    useUIStore.getState().setRawModeForPlugin('plugin-a', true)
    useUIStore.getState().setRawModeForPlugin('plugin-a', true)
    useUIStore.getState().clearRawModeForPlugin('missing-plugin')

    expect(useUIStore.getState().rawModeByPluginId).toEqual({ 'plugin-a': true })
  })
})
