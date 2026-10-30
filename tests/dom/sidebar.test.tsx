// The sidebar's tab list: closing a tab with unsaved changes asks first.
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
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
    window.api = createFakeApi()
  })

  afterEach(cleanup)

  it('closing an unsaved tab asks with Cancel as the default', async () => {
    const plugin = createEmptyPlugin()
    act(() => {
      usePluginStore.getState().openPlugin(plugin)
      usePluginStore.getState().updateMeta({ name: 'Edited' })
    })
    render(
      <Sidebar onOpenProject={() => {}} onOpenSettings={() => {}} onOpenShortcuts={() => {}} />
    )
    fireEvent.click(screen.getByRole('button', { name: 'Close Edited' }))
    await waitFor(() => expect(window.api.dialog.message).toHaveBeenCalledTimes(1))
    const options = vi.mocked(window.api.dialog.message).mock.calls[0][0]
    expect(options.buttons).toEqual(['Cancel', 'Close Without Saving'])
    // The fake answers 0, Cancel
    expect(usePluginStore.getState().openPlugins.map((p) => p.id)).toEqual([plugin.id])
  })
})

/** Opens a saved tab named `name`; the last one opened is active. */
function openTab(name: string): void {
  const plugin = createEmptyPlugin()
  act(() => usePluginStore.getState().openPlugin({ ...plugin, meta: { ...plugin.meta, name } }))
}

/** The sidebar beside the status bar, which names the active tab. */
function renderSidebar(): Record<string, () => void> {
  const callbacks = {
    onOpenProject: vi.fn(),
    onOpenSettings: vi.fn(),
    onOpenShortcuts: vi.fn(),
    onTogglePluginBrowser: vi.fn(),
    onToggleProjectBrowser: vi.fn()
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
    window.api = createFakeApi()
    vi.stubGlobal('__APP_VERSION__', '0.0.0-test')
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('New Plugin opens a tab and makes it the active one', async () => {
    const user = userEvent.setup()
    openTab('Alpha')
    renderSidebar()
    await user.click(screen.getByRole('button', { name: 'New Plugin' }))
    expect(screen.getByRole('button', { name: 'NewPlugin' })).toBeInTheDocument()
    expect(screen.getByText('Plugin: NewPlugin')).toBeInTheDocument()
  })

  it('clicking a tab makes it the active one', async () => {
    const user = userEvent.setup()
    openTab('Alpha')
    openTab('Beta')
    renderSidebar()
    expect(screen.getByText('Plugin: Beta')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Alpha' }))
    expect(screen.getByText('Plugin: Alpha')).toBeInTheDocument()
  })

  it('a tab with unsaved changes says so in its name', () => {
    openTab('Alpha')
    act(() => usePluginStore.getState().updateMeta({ name: 'Beta' }))
    renderSidebar()
    expect(screen.getByRole('button', { name: 'Beta (unsaved changes)' })).toBeInTheDocument()
  })

  it('closing a saved tab asks nothing and removes it', async () => {
    const user = userEvent.setup()
    openTab('Alpha')
    renderSidebar()
    await user.click(screen.getByRole('button', { name: 'Close Alpha' }))
    expect(window.api.dialog.message).not.toHaveBeenCalled()
    expect(screen.queryByRole('button', { name: 'Alpha' })).not.toBeInTheDocument()
  })

  it('a tab with no name is called Untitled', () => {
    openTab('')
    renderSidebar()
    expect(screen.getByRole('button', { name: 'Untitled' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Close Untitled' })).toBeInTheDocument()
  })

  it('each rail button calls its own action once', async () => {
    const user = userEvent.setup()
    act(() => useProjectStore.getState().setProject(sampleProject()))
    const callbacks = renderSidebar()
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
