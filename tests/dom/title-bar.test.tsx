// The title bar's close button: it asks main to close the window, and main asks about unsaved
// changes in any open tab, so the button itself never prompts.
import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TitleBar } from '../../src/renderer/src/components/layout/TitleBar'
import { usePluginStore, useProjectStore } from '../../src/renderer/src/stores'
import { createEmptyPlugin } from '../../src/renderer/src/types/plugin'
import { createFakeApi, sampleProject } from '../helpers/fake-api'
import { resetStores } from './support/reset-stores'

/**
Opens a tab and makes it active; a `name` typed into it leaves it unsaved.
*/
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
    vi.stubGlobal('api', createFakeApi())
  })

  afterEach(vi.unstubAllGlobals)

  it('title-bar close with no unsaved tab asks main to close the window', () => {
    openTab()
    render(<TitleBar />)
    clickClose()

    expect(globalThis.api.window.close).toHaveBeenCalledTimes(1)
    expect(globalThis.api.dialog.message).not.toHaveBeenCalled()
  })

  it('title-bar close with only a background tab unsaved leaves the question to main', () => {
    const background = openTab('Edited')
    const active = openTab()
    const { dirtyByPluginId, activePluginId } = usePluginStore.getState()

    expect(dirtyByPluginId[background]).toBe(true)
    expect(activePluginId).toBe(active)

    render(<TitleBar />)
    clickClose()

    expect(globalThis.api.window.close).toHaveBeenCalledTimes(1)
    expect(globalThis.api.dialog.message).not.toHaveBeenCalled()
  })

  it('title-bar close with the active tab unsaved leaves the question to main', () => {
    openTab('Edited')
    render(<TitleBar />)
    clickClose()

    expect(globalThis.api.window.close).toHaveBeenCalledTimes(1)
    expect(globalThis.api.dialog.message).not.toHaveBeenCalled()
  })
})

/**
Renders the title bar and lets the window's first maximized answer land.
*/
async function renderTitleBar(): Promise<ReturnType<typeof render>> {
  const view = render(<TitleBar />)
  await act(async () => {
    await Promise.resolve()
  })
  return view
}

// Minimize and maximize carry no name: they are the first two buttons, in that order.
const windowButtons = (): HTMLElement[] => screen.getAllByRole('button')

function windowButton(index: number): HTMLElement {
  const button = windowButtons().at(index)
  if (button === undefined) throw new Error(`missing window button ${String(index)}`)
  return button
}

function reportMaximized(
  report: ((isMaximized: boolean) => void) | undefined,
  isMaximized: boolean
): void {
  if (report === undefined) throw new Error('maximize listener was not registered')
  report(isMaximized)
}

describe('title bar window controls', () => {
  beforeEach(() => {
    resetStores()
  })

  afterEach(vi.unstubAllGlobals)

  it('names the app, and the game once a project is open', async () => {
    expect.hasAssertions()

    vi.stubGlobal('api', createFakeApi())
    await renderTitleBar()

    expect(screen.getByText('Plugin Studio')).toBeInTheDocument()
    expect(screen.queryByText('- Sample Game')).not.toBeInTheDocument()

    act(() => {
      useProjectStore.getState().setProject(sampleProject())
    })

    expect(screen.getByText('- Sample Game')).toBeInTheDocument()
  })

  it('the first two buttons minimize and maximize the window', async () => {
    expect.hasAssertions()

    const user = userEvent.setup()
    vi.stubGlobal('api', createFakeApi())
    await renderTitleBar()
    const minimize = windowButton(0)
    const maximize = windowButton(1)

    await user.click(minimize)

    expect(globalThis.api.window.minimize).toHaveBeenCalledTimes(1)
    expect(globalThis.api.window.maximize).not.toHaveBeenCalled()

    await user.click(maximize)

    expect(globalThis.api.window.maximize).toHaveBeenCalledTimes(1)
    expect(globalThis.api.window.minimize).toHaveBeenCalledTimes(1)
  })

  it('the maximize button shows whether the window is maximized as main reports it', async () => {
    expect.hasAssertions()

    let report: ((isMaximized: boolean) => void) | undefined
    vi.stubGlobal(
      'api',
      createFakeApi({
        window: {
          isMaximized: vi.fn<Window['api']['window']['isMaximized']>().mockResolvedValue(true),
          onMaximizeChange: vi
            .fn<Window['api']['window']['onMaximizeChange']>()
            .mockImplementation((callback) => {
              report = callback
              return vi.fn<() => void>()
            })
        }
      })
    )
    await renderTitleBar()
    const maximize = windowButton(1)
    const maximized = new XMLSerializer().serializeToString(maximize)

    act(() => {
      reportMaximized(report, false)
    })
    const restored = new XMLSerializer().serializeToString(maximize)

    expect(restored).not.toBe(maximized)

    act(() => {
      reportMaximized(report, true)
    })

    expect(new XMLSerializer().serializeToString(maximize)).toBe(maximized)
  })

  it('stops listening for maximize changes when it unmounts', async () => {
    expect.hasAssertions()

    const unsubscribe = vi.fn<() => void>()
    vi.stubGlobal(
      'api',
      createFakeApi({
        window: {
          onMaximizeChange: vi
            .fn<Window['api']['window']['onMaximizeChange']>()
            .mockReturnValue(unsubscribe)
        }
      })
    )
    const { unmount } = await renderTitleBar()

    expect(unsubscribe).not.toHaveBeenCalled()

    unmount()

    expect(unsubscribe).toHaveBeenCalledTimes(1)
  })
})
