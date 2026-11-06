// The sidebar's tab list: closing a tab with unsaved changes asks first.
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Sidebar } from '../../src/renderer/src/components/layout/Sidebar'
import { StatusBar } from '../../src/renderer/src/components/layout/StatusBar'
import { usePluginStore, useProjectStore } from '../../src/renderer/src/stores'
import { createEmptyPlugin } from '../../src/renderer/src/types/plugin'
import { createFakeApi, sampleProject } from '../helpers/fake-api'
import { resetStores } from './support/reset-stores'

describe('sidebar tab close', () => {
  beforeEach(() => {
    resetStores()
    vi.stubGlobal('api', createFakeApi())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('closing an unsaved tab asks with Cancel as the default', async () => {
    expect.hasAssertions()

    const plugin = createEmptyPlugin()
    act(() => {
      usePluginStore.getState().openPlugin(plugin)
      usePluginStore.getState().updateMeta({ name: 'Edited' })
    })
    const ignored = vi.fn<() => void>()
    render(<Sidebar onOpenProject={ignored} onOpenSettings={ignored} onOpenShortcuts={ignored} />)
    fireEvent.click(screen.getByRole('button', { name: 'Close Edited' }))
    await waitFor(() => {
      expect(globalThis.api.dialog.message).toHaveBeenCalledTimes(1)
    })

    expect(vi.mocked(globalThis.api.dialog.message).mock.calls).toMatchObject([
      [{ buttons: ['Cancel', 'Close Without Saving'] }]
    ])
    // The fake answers 0, Cancel
    expect(usePluginStore.getState().openPlugins.map((p) => p.id)).toStrictEqual([plugin.id])
  })
})

/**
Opens a saved tab named `name`; the last one opened is active.
*/
function openTab(name: string): void {
  const plugin = createEmptyPlugin()
  act(() => {
    usePluginStore.getState().openPlugin({ ...plugin, meta: { ...plugin.meta, name } })
  })
}

/**
The sidebar beside the status bar, which names the active tab.
*/
function showSidebar(): Record<string, () => void> {
  const callbacks = {
    onOpenProject: vi.fn<() => void>(),
    onOpenSettings: vi.fn<() => void>(),
    onOpenShortcuts: vi.fn<() => void>(),
    onTogglePluginBrowser: vi.fn<() => void>(),
    onToggleProjectBrowser: vi.fn<() => void>()
  }
  render(
    <>
      <Sidebar {...callbacks} />
      <StatusBar />
    </>
  )
  return callbacks
}

describe('sidebar', () => {
  beforeEach(() => {
    resetStores()
    vi.stubGlobal('api', createFakeApi())
    vi.stubGlobal('__APP_VERSION__', '0.0.0-test')
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('new Plugin opens a tab and makes it the active one', async () => {
    expect.hasAssertions()

    const user = userEvent.setup()
    openTab('Alpha')
    showSidebar()
    await user.click(screen.getByRole('button', { name: 'New Plugin' }))

    expect(screen.getByRole('button', { name: 'NewPlugin' })).toBeInTheDocument()
    expect(screen.getByText('Plugin: NewPlugin')).toBeInTheDocument()
  })

  it('clicking a tab makes it the active one', async () => {
    expect.hasAssertions()

    const user = userEvent.setup()
    openTab('Alpha')
    openTab('Beta')
    showSidebar()

    expect(screen.getByText('Plugin: Beta')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Alpha' }))

    expect(screen.getByText('Plugin: Alpha')).toBeInTheDocument()
  })

  it('a tab with unsaved changes says so in its name', () => {
    openTab('Alpha')
    act(() => {
      usePluginStore.getState().updateMeta({ name: 'Beta' })
    })
    showSidebar()

    expect(screen.getByRole('button', { name: 'Beta (unsaved changes)' })).toBeInTheDocument()
  })

  it('closing a saved tab asks nothing and removes it', async () => {
    expect.hasAssertions()

    const user = userEvent.setup()
    openTab('Alpha')
    showSidebar()
    await user.click(screen.getByRole('button', { name: 'Close Alpha' }))

    expect(globalThis.api.dialog.message).not.toHaveBeenCalled()
    expect(screen.queryByRole('button', { name: 'Alpha' })).not.toBeInTheDocument()
  })

  it('a tab with no name is called Untitled', () => {
    openTab('')
    showSidebar()

    expect(screen.getByRole('button', { name: 'Untitled' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Close Untitled' })).toBeInTheDocument()
  })

  it('each rail button calls its own action once', async () => {
    expect.hasAssertions()

    const user = userEvent.setup()
    act(() => {
      useProjectStore.getState().setProject(sampleProject())
    })
    const callbacks = showSidebar()
    const buttons: [string, string][] = [
      ['Open Project', 'onOpenProject'],
      ['Settings', 'onOpenSettings'],
      ['Keyboard Shortcuts', 'onOpenShortcuts'],
      ['Plugin Browser', 'onTogglePluginBrowser'],
      ['Project Data Browser', 'onToggleProjectBrowser']
    ]
    for (const [name, callback] of buttons) {
      await user.click(screen.getByRole('button', { name }))

      expect(callbacks[callback]).toHaveBeenCalledTimes(1)
    }
    for (const callback of Object.values(callbacks)) expect(callback).toHaveBeenCalledTimes(1)
  })
})
