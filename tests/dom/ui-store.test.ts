import { beforeEach, describe, expect, it } from 'vitest'
import { useUIStore } from '../../src/renderer/src/stores/uiStore'

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
    expect(useUIStore.getState().rawModeByPluginId).toEqual({
      'plugin-a': true,
      'plugin-b': false
    })

    useUIStore.getState().clearRawModeForPlugin('plugin-a')
    expect(useUIStore.getState().rawModeByPluginId).toEqual({ 'plugin-b': false })
  })

  it('keeps a confirmed save without raw mode until raw mode is turned off again or cleared', () => {
    const ui = (): ReturnType<typeof useUIStore.getState> => useUIStore.getState()
    ui().setRawModeForPlugin('plugin-a', false)
    ui().confirmStructuralSave('plugin-a')
    ui().confirmStructuralSave('plugin-b')
    expect(ui().structuralSaveConfirmedByPluginId).toEqual({ 'plugin-a': true, 'plugin-b': true })

    ui().setRawModeForPlugin('plugin-a', true)
    expect(ui().structuralSaveConfirmedByPluginId).toHaveProperty('plugin-a')
    ui().setRawModeForPlugin('plugin-a', false)
    expect(ui().structuralSaveConfirmedByPluginId).not.toHaveProperty('plugin-a')

    ui().clearRawModeForPlugin('plugin-b')
    expect(ui().structuralSaveConfirmedByPluginId).toEqual({})
    expect(localStorage.getItem('mz-plugin-studio-ui')).not.toContain('structuralSave')
  })

  it('holds one diff request until it is cleared, and shows the preview for it', () => {
    useUIStore.getState().setPreviewCollapsed(true)
    useUIStore.getState().requestDiff('plugin-a')
    expect(useUIStore.getState().diffRequestPluginId).toBe('plugin-a')
    expect(useUIStore.getState().previewCollapsed).toBe(false)
    useUIStore.getState().clearDiffRequest()
    expect(useUIStore.getState().diffRequestPluginId).toBeNull()
    expect(localStorage.getItem('mz-plugin-studio-ui')).not.toContain('diffRequest')
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
      previewCollapsed: false,
      lastTemplateCategory: 'method-alias',
      rawModeByPluginId: { 'plugin-a': true },
      schemaVersion: 2
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
