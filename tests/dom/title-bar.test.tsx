// The title bar's close button: it asks main to close the window, and main asks about unsaved
// changes in any open tab, so the button itself never prompts.
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TitleBar } from '../../src/renderer/src/components/layout/TitleBar'
import { usePluginStore, useProjectStore } from '../../src/renderer/src/stores'
import { createEmptyPlugin } from '../../src/renderer/src/types/plugin'
import { createFakeApi, sampleProject } from '../helpers/fake-api'
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

const clickClose = (): void => {
  fireEvent.click(screen.getByRole('button', { name: 'Close window' }))
}

describe('title bar close', () => {
  beforeEach(() => {
    resetStores()
    window.api = createFakeApi()
  })

  afterEach(cleanup)

  it('title-bar close with no unsaved tab asks main to close the window', () => {
    openTab()
    render(<TitleBar />)
    clickClose()
    expect(window.api.window.close).toHaveBeenCalledTimes(1)
    expect(window.api.dialog.message).not.toHaveBeenCalled()
  })

  it('title-bar close with only a background tab unsaved leaves the question to main', () => {
    const background = openTab('Edited')
    const active = openTab()
    const { dirtyByPluginId, activePluginId } = usePluginStore.getState()
    expect(dirtyByPluginId[background]).toBe(true)
    expect(activePluginId).toBe(active)
    render(<TitleBar />)
    clickClose()
    expect(window.api.window.close).toHaveBeenCalledTimes(1)
    expect(window.api.dialog.message).not.toHaveBeenCalled()
  })

  it('title-bar close with the active tab unsaved leaves the question to main', () => {
    openTab('Edited')
    render(<TitleBar />)
    clickClose()
    expect(window.api.window.close).toHaveBeenCalledTimes(1)
    expect(window.api.dialog.message).not.toHaveBeenCalled()
  })
})

/** Renders the title bar and lets the window's first maximized answer land. */
async function renderTitleBar(): Promise<ReturnType<typeof render>> {
  const view = render(<TitleBar />)
  await act(async () => {})
  return view
}

// Minimize and maximize carry no name: they are the first two buttons, in that order.
const windowButtons = (): HTMLElement[] => screen.getAllByRole('button')

describe('title bar window controls', () => {
  beforeEach(() => {
    resetStores()
  })

  afterEach(cleanup)

  it('names the app, and the game once a project is open', async () => {
    window.api = createFakeApi()
    await renderTitleBar()
    expect(screen.getByText('Plugin Studio')).toBeInTheDocument()
    expect(screen.queryByText('- Sample Game')).not.toBeInTheDocument()

    act(() => useProjectStore.getState().setProject(sampleProject()))
    expect(screen.getByText('- Sample Game')).toBeInTheDocument()
  })

  it('the first two buttons minimize and maximize the window', async () => {
    const user = userEvent.setup()
    window.api = createFakeApi()
    await renderTitleBar()
    const [minimize, maximize] = windowButtons()

    await user.click(minimize)
    expect(window.api.window.minimize).toHaveBeenCalledTimes(1)
    expect(window.api.window.maximize).not.toHaveBeenCalled()

    await user.click(maximize)
    expect(window.api.window.maximize).toHaveBeenCalledTimes(1)
    expect(window.api.window.minimize).toHaveBeenCalledTimes(1)
  })

  it('the maximize button shows whether the window is maximized as main reports it', async () => {
    let report!: (maximized: boolean) => void
    window.api = createFakeApi({
      window: {
        isMaximized: vi.fn(async () => true),
        onMaximizeChange: vi.fn((callback: (maximized: boolean) => void) => {
          report = callback
          return () => {}
        })
      }
    })
    await renderTitleBar()
    const maximize = windowButtons()[1]
    const maximized = maximize.innerHTML

    act(() => report(false))
    const restored = maximize.innerHTML
    expect(restored).not.toBe(maximized)

    act(() => report(true))
    expect(maximize.innerHTML).toBe(maximized)
  })

  it('stops listening for maximize changes when it unmounts', async () => {
    const unsubscribe = vi.fn()
    window.api = createFakeApi({ window: { onMaximizeChange: vi.fn(() => unsubscribe) } })
    const { unmount } = await renderTitleBar()
    expect(unsubscribe).not.toHaveBeenCalled()
    unmount()
    expect(unsubscribe).toHaveBeenCalledTimes(1)
  })
})
