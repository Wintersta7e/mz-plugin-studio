// Closing the window: the app holds back the page's unload while any open tab has unsaved
// changes, which is what makes Electron ask before the window closes.
import { act, cleanup, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../../src/renderer/src/App'
import { usePluginStore } from '../../src/renderer/src/stores'
import { createEmptyPlugin } from '../../src/renderer/src/types/plugin'
import { createFakeApi } from '../helpers/fake-api'
import { resetStores } from './support/reset-stores'

/** Opens a tab and makes it active; a `name` typed into it leaves it unsaved. */
function openTab(name?: string): string {
  const plugin = createEmptyPlugin()
  act(() => {
    usePluginStore.getState().openPlugin(plugin)
    if (name !== undefined) usePluginStore.getState().updateMeta({ name })
  })
  return plugin.id
}

/** Whether the app held back an unload of the page. */
function unloadHeldBack(): boolean {
  const event = new Event('beforeunload', { cancelable: true })
  window.dispatchEvent(event)
  return event.defaultPrevented
}

// Each case renders the whole app, which takes seconds on a cold start
describe('closing the window', { timeout: 30_000 }, () => {
  beforeEach(() => {
    resetStores()
    // The build defines this; the status bar shows it.
    vi.stubGlobal('__APP_VERSION__', '0.0.0-test')
    window.api = createFakeApi()
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('closing the window with only a background tab unsaved is held back', () => {
    const background = openTab('Edited')
    openTab()
    render(<App />)
    expect(usePluginStore.getState().dirtyByPluginId[background]).toBe(true)
    expect(usePluginStore.getState().isDirty).toBe(false)
    expect(unloadHeldBack()).toBe(true)
  })

  it('closing the window with no unsaved tab goes ahead', () => {
    openTab()
    render(<App />)
    expect(unloadHeldBack()).toBe(false)
  })
})
