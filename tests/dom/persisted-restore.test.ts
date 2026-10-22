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
      'Layout: the saved data could not be read, so defaults were loaded; a copy was kept as mz-plugin-studio-ui.backup. Settings: theme had unexpected values and were reset.'
    )

    cleanup()
    render(createElement(App))
    expect(useToastStore.getState().toasts).toHaveLength(1)
  }, 30_000)
})
