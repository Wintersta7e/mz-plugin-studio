// A new plugin takes the default author set in Settings, whichever way it is created.
import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../../src/renderer/src/App'
import { Sidebar } from '../../src/renderer/src/components/layout/Sidebar'
import { usePluginStore, useSettingsStore } from '../../src/renderer/src/stores'
import { createEmptyPlugin } from '../../src/renderer/src/types/plugin'
import { createFakeApi } from '../helpers/fake-api'
import { LOAD_PREVIEW_TIMEOUT_MS, loadPreview } from './support/load-preview'
import { resetStores } from './support/reset-stores'

const AUTHOR = 'Example Author'

// The author of the plugin open in the editor
function activeAuthor(): string {
  return usePluginStore.getState().plugin.meta.author
}

// The app cases render the whole app, which takes seconds on a cold start
describe('default author of a new plugin', { timeout: 30_000 }, () => {
  beforeAll(loadPreview, LOAD_PREVIEW_TIMEOUT_MS)

  beforeEach(() => {
    resetStores()
    vi.stubGlobal('api', createFakeApi())
    vi.stubGlobal('__APP_VERSION__', '0.0.0-test')
    useSettingsStore.getState().setDefaultAuthor(AUTHOR)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('is set by the sidebar New Plugin button', async () => {
    expect.assertions(1)

    render(
      <Sidebar
        onOpenProject={vi.fn<() => void>()}
        onOpenSettings={vi.fn<() => void>()}
        onOpenShortcuts={vi.fn<() => void>()}
      />
    )
    await userEvent.setup().click(screen.getByRole('button', { name: 'New Plugin' }))

    expect(activeAuthor()).toBe(AUTHOR)
  })

  it('is set by Ctrl+N', async () => {
    expect.assertions(1)

    render(<App />)
    fireEvent.keyDown(document.body, { key: 'n', code: 'KeyN', ctrlKey: true })
    await screen.findByRole('tab', { name: 'Metadata' })

    expect(activeAuthor()).toBe(AUTHOR)
  })

  it('is set by New Plugin on the welcome screen', async () => {
    expect.assertions(1)

    render(<App />)
    await userEvent.setup().click(screen.getByRole('button', { name: /Start with a blank plugin/ }))
    await screen.findByRole('tab', { name: 'Metadata' })

    expect(activeAuthor()).toBe(AUTHOR)
  })

  it('is set on the empty plugin left after the last tab closes', () => {
    expect.assertions(1)

    const plugin = createEmptyPlugin()
    act(() => {
      usePluginStore.getState().openPlugin({ ...plugin, meta: { ...plugin.meta, author: 'Other' } })
      usePluginStore.getState().closePlugin(plugin.id)
    })

    expect(activeAuthor()).toBe(AUTHOR)
  })

  it('is empty on the plugin the editor starts with, before any is created', async () => {
    expect.assertions(2)

    localStorage.setItem(
      'mz-plugin-studio-settings',
      JSON.stringify({ state: { defaultAuthor: AUTHOR, schemaVersion: 1 }, version: 0 })
    )
    vi.resetModules()
    await import('../../src/renderer/src/App')
    const stores = await import('../../src/renderer/src/stores')

    expect(stores.useSettingsStore.getState().defaultAuthor).toBe(AUTHOR)
    expect(stores.usePluginStore.getInitialState().plugin.meta.author).toBe('')
  })
})
