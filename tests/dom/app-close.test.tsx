// Closing the window: the app holds back the page's unload while any open tab has unsaved
// changes, which is what makes Electron ask before the window closes.
import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../../src/renderer/src/App'
import { usePluginStore, useProjectStore } from '../../src/renderer/src/stores'
import { createEmptyPlugin } from '../../src/renderer/src/types/plugin'
import { createFakeApi, sampleProject } from '../helpers/fake-api'
import { LOAD_PREVIEW_TIMEOUT_MS, loadPreview } from './support/load-preview'
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
  beforeAll(loadPreview, LOAD_PREVIEW_TIMEOUT_MS)

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

  it('closing the window with only the active tab unsaved is held back', () => {
    openTab()
    openTab('Edited')
    render(<App />)

    expect(screen.getByText('(modified)')).toBeInTheDocument()
    expect(unloadHeldBack()).toBe(true)
  })

  it('after Save All writes every unsaved tab, closing the window goes ahead', async () => {
    const user = userEvent.setup()
    window.api = createFakeApi({
      plugin: {
        save: vi.fn(async (_project: string, filename: string) => ({
          success: true as const,
          path: `/project/js/plugins/${filename}`,
          sha256: 'a1'
        }))
      }
    })
    act(() => useProjectStore.getState().setProject(sampleProject('/project')))
    openTab('Alpha')
    openTab('Beta')
    render(<App />)

    expect(unloadHeldBack()).toBe(true)

    await user.keyboard('{Control>}{Shift>}S{/Shift}{/Control}')
    await screen.findByText('2 plugins saved')

    expect(unloadHeldBack()).toBe(false)
  })

  it('after Save All skips a tab, closing the window is still held back', async () => {
    const user = userEvent.setup()
    window.api = createFakeApi({
      plugin: {
        save: vi.fn(async (_project: string, filename: string) => {
          const path = `/project/js/plugins/${filename}`
          return filename === 'Beta.js'
            ? {
                success: false as const,
                conflict: 'changed-on-disk' as const,
                path,
                diskSha256: 'd2'
              }
            : { success: true as const, path, sha256: 'a1' }
        })
      }
    })
    act(() => useProjectStore.getState().setProject(sampleProject('/project')))
    openTab('Alpha')
    openTab('Beta')
    render(<App />)
    await user.keyboard('{Control>}{Shift>}S{/Shift}{/Control}')
    await screen.findByText('Saved 1. Not saved, changed on disk: Beta.')

    expect(window.api.dialog.message).not.toHaveBeenCalled()
    expect(unloadHeldBack()).toBe(true)
  })

  it('the close button with a background tab unsaved asks main to close and prompts nothing itself', async () => {
    const user = userEvent.setup()
    openTab('Edited')
    openTab()
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Close window' }))

    expect(window.api.window.close).toHaveBeenCalledTimes(1)
    expect(window.api.dialog.message).not.toHaveBeenCalled()
  })

  it('closing an unsaved tab asks first; Cancel keeps it and the window held back, Close Without Saving lets the window close', async () => {
    const user = userEvent.setup()
    const answers = [0, 1]
    window.api = createFakeApi({ dialog: { message: vi.fn(async () => answers.shift() ?? 0) } })
    openTab('Beta')
    openTab()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Close Beta' }))
    await waitFor(() => expect(window.api.dialog.message).toHaveBeenCalledTimes(1))
    const options = vi.mocked(window.api.dialog.message).mock.calls[0][0]

    // Main makes Cancel the default and the Escape answer; the sidebar passes neither
    expect(options.buttons).toContain('Cancel')
    expect(options).not.toHaveProperty('defaultId')
    expect(options).not.toHaveProperty('cancelId')
    expect(screen.getByRole('button', { name: 'Close Beta' })).toBeInTheDocument()
    expect(unloadHeldBack()).toBe(true)

    await user.click(screen.getByRole('button', { name: 'Close Beta' }))
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'Close Beta' })).not.toBeInTheDocument()
    )

    expect(unloadHeldBack()).toBe(false)
  })
})
