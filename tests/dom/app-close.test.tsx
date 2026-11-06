// Closing the window: the app holds back the page's unload while any open tab has unsaved
// changes, which is what makes Electron ask before the window closes.
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeAll, beforeEach, describe, expect, it, type Mock, vi } from 'vitest'
import App from '../../src/renderer/src/App'
import { usePluginStore, useProjectStore } from '../../src/renderer/src/stores'
import { createEmptyPlugin } from '../../src/renderer/src/types/plugin'
import type { MessageDialogOptions, SaveResult } from '../../src/shared/ipc-types'
import { createFakeApi, sampleProject } from '../helpers/fake-api'
import { LOAD_PREVIEW_TIMEOUT_MS, loadPreview } from './support/load-preview'
import { resetStores } from './support/reset-stores'

// Opens a tab and makes it active; a `name` typed into it leaves it unsaved.
function openTab(name?: string): string {
  const plugin = createEmptyPlugin()
  act(() => {
    usePluginStore.getState().openPlugin(plugin)
    if (name !== undefined) usePluginStore.getState().updateMeta({ name })
  })
  return plugin.id
}

// Whether the app held back an unload of the page.
function isUnloadHeldBack(): boolean {
  const event = new Event('beforeunload', { cancelable: true })
  globalThis.dispatchEvent(event)
  return event.defaultPrevented
}

// Main's answer to a save of `filename` into the project that wrote it.
const written = (filename: string): SaveResult => ({
  success: true,
  path: `/project/js/plugins/${filename}`,
  sha256: 'a1'
})

// Main's answer to a save of Beta.js whose file changed on disk since the tab last read it.
const BETA_CHANGED_ON_DISK: SaveResult = {
  success: false,
  conflict: 'changed-on-disk',
  path: '/project/js/plugins/Beta.js',
  diskSha256: 'd2'
}

// The app on the project with two unsaved tabs, Alpha then Beta; Save All writes them one after
// another in tab order, and main answers the two saves with `alpha` and `beta`
function renderUnsavedPair(alpha: SaveResult, beta: SaveResult): void {
  const save = vi
    .fn<Window['api']['plugin']['save']>()
    .mockResolvedValueOnce(alpha)
    .mockResolvedValueOnce(beta)
  vi.stubGlobal('api', createFakeApi({ plugin: { save } }))
  act(() => {
    useProjectStore.getState().setProject(sampleProject('/project'))
  })
  openTab('Alpha')
  openTab('Beta')
  render(<App />)
}

// A tab-close question answered Cancel, then Close Without Saving, then Cancel to any other
const cancelThenClose = (): Mock<Window['api']['dialog']['message']> =>
  vi
    .fn<Window['api']['dialog']['message']>()
    .mockResolvedValue(0)
    .mockResolvedValueOnce(0)
    .mockResolvedValueOnce(1)

// Main makes Cancel the default and the Escape answer; the sidebar passes neither
function expectCancelLeftToMain(options: MessageDialogOptions | undefined): void {
  expect(options?.buttons).toContain('Cancel')
  expect(options).not.toHaveProperty('defaultId')
  expect(options).not.toHaveProperty('cancelId')
}

// Each case renders the whole app, which takes seconds on a cold start
describe('closing the window', { timeout: 30_000 }, () => {
  beforeAll(loadPreview, LOAD_PREVIEW_TIMEOUT_MS)

  beforeEach(() => {
    resetStores()
    // The build defines this; the status bar shows it.
    vi.stubGlobal('__APP_VERSION__', '0.0.0-test')
    vi.stubGlobal('api', createFakeApi())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('closing the window with only a background tab unsaved is held back', () => {
    const background = openTab('Edited')
    openTab()
    render(<App />)

    expect(usePluginStore.getState().dirtyByPluginId[background]).toBe(true)
    expect(usePluginStore.getState().isDirty).toBe(false)
    expect(isUnloadHeldBack()).toBe(true)
  })

  it('closing the window with no unsaved tab goes ahead', () => {
    openTab()
    render(<App />)

    expect(isUnloadHeldBack()).toBe(false)
  })

  it('closing the window with only the active tab unsaved is held back', () => {
    openTab()
    openTab('Edited')
    render(<App />)

    expect(screen.getByText('(modified)')).toBeInTheDocument()
    expect(isUnloadHeldBack()).toBe(true)
  })

  it('after Save All writes every unsaved tab, closing the window goes ahead', async () => {
    expect.assertions(2)

    const user = userEvent.setup()
    renderUnsavedPair(written('Alpha.js'), written('Beta.js'))

    expect(isUnloadHeldBack()).toBe(true)

    await user.keyboard('{Control>}{Shift>}S{/Shift}{/Control}')
    await screen.findByText('2 plugins saved')

    expect(isUnloadHeldBack()).toBe(false)
  })

  it('after Save All skips a tab, closing the window is still held back', async () => {
    expect.assertions(2)

    const user = userEvent.setup()
    renderUnsavedPair(written('Alpha.js'), BETA_CHANGED_ON_DISK)
    await user.keyboard('{Control>}{Shift>}S{/Shift}{/Control}')
    await screen.findByText('Saved 1. Not saved, changed on disk: Beta.')

    expect(globalThis.api.dialog.message).not.toHaveBeenCalled()
    expect(isUnloadHeldBack()).toBe(true)
  })

  it('the close button with a background tab unsaved asks main to close and prompts nothing itself', async () => {
    expect.assertions(2)

    const user = userEvent.setup()
    openTab('Edited')
    openTab()
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Close window' }))

    expect(globalThis.api.window.close).toHaveBeenCalledTimes(1)
    expect(globalThis.api.dialog.message).not.toHaveBeenCalled()
  })

  it('closing an unsaved tab asks first; Cancel keeps it and the window held back, Close Without Saving lets the window close', async () => {
    expect.hasAssertions()

    const user = userEvent.setup()
    const message = cancelThenClose()
    vi.stubGlobal('api', createFakeApi({ dialog: { message } }))
    openTab('Beta')
    openTab()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Close Beta' }))
    await waitFor(() => {
      expect(message).toHaveBeenCalledTimes(1)
    })
    expectCancelLeftToMain(message.mock.calls.at(0)?.[0])

    expect(screen.getByRole('button', { name: 'Close Beta' })).toBeInTheDocument()
    expect(isUnloadHeldBack()).toBe(true)

    await user.click(screen.getByRole('button', { name: 'Close Beta' }))
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: 'Close Beta' })).not.toBeInTheDocument()
    })

    expect(isUnloadHeldBack()).toBe(false)
  })
})
