// What the app shows at startup about saved state it could not load as stored.
import { createElement } from 'react'
import { cleanup, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createFakeApi } from '../helpers/fake-api'

describe('restore report at startup', () => {
  beforeEach(() => {
    localStorage.clear()
    window.api = createFakeApi()
    // The build defines this; the status bar shows it.
    vi.stubGlobal('__APP_VERSION__', '0.0.0-test')
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('one toast names every store that was not loaded as stored, once', async () => {
    localStorage.setItem('mz-plugin-studio-ui', '{"state":')
    localStorage.setItem(
      'mz-plugin-studio-settings',
      JSON.stringify({ state: { theme: 'purple' }, version: 0 })
    )
    vi.resetModules()
    const { default: App } = await import('../../src/renderer/src/App')
    const { useToastStore } = await import('../../src/renderer/src/stores/toastStore')

    render(createElement(App))
    const toasts = useToastStore.getState().toasts
    expect(toasts).toHaveLength(1)
    expect(toasts[0].type).toBe('warning')
    expect(toasts[0].message).toBe(
      'Layout: the saved data could not be read, so defaults were loaded; a copy was kept as mz-plugin-studio-ui.backup. Settings: theme had unexpected values and were reset; a copy was kept as mz-plugin-studio-settings.backup. Backups can be exported or deleted in Settings > Data > Saved-state backups.'
    )

    cleanup()
    render(createElement(App))
    expect(useToastStore.getState().toasts).toHaveLength(1)
  }, 30_000)

  it('the toast names what was lost in user words, never by field name', async () => {
    const meta = { name: 'Good', version: '1', author: '', description: '', help: '', url: '' }
    const param = { id: 'p', name: 'Speed', text: 'Speed', desc: 3, type: 'number', default: '' }
    const openPlugins = [
      {
        id: 'a',
        meta: { ...meta, target: 'MZ' },
        parameters: [null, param],
        commands: [{ id: 'c', name: 'Run', args: [{ id: 'r' }] }],
        structs: [{ id: 's', name: 'Point', parameters: [param] }],
        rawSource: 5,
        codeBody: 6
      }
    ]
    const state = { plugin: openPlugins[0], openPlugins, activePluginId: 'a', schemaVersion: 2 }
    localStorage.setItem(
      'mz-plugin-studio-plugin',
      JSON.stringify({ state: { ...state, dirtyByPluginId: 5, savedPathsByPluginId: { a: 1 } } })
    )
    localStorage.setItem(
      'mz-plugin-studio-settings',
      JSON.stringify({
        state: { editorFontSize: 'big', parameterPresets: { Mixed: [{}] }, schemaVersion: 1 }
      })
    )
    localStorage.setItem(
      'mz-plugin-studio-ui',
      JSON.stringify({ state: { sidebarWidth: 'wide', rawModeByPluginId: { a: 'yes' } } })
    )
    vi.resetModules()
    const { default: App } = await import('../../src/renderer/src/App')
    const { useToastStore } = await import('../../src/renderer/src/stores/toastStore')

    render(createElement(App))
    const [toast] = useToastStore.getState().toasts
    expect(toast.message).toContain('parameter 1 of open plugin Good')
    expect(toast.message).toContain('description of parameter 1 of struct 1 of open plugin Good')
    expect(toast.message).toContain('entry 1 of parameter preset Mixed')
    // no camelCase field name and no index brackets
    expect(toast.message).not.toMatch(/[a-z][A-Z]|\[\d/)
  }, 30_000)
})
