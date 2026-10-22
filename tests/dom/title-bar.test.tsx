// The title bar's close button: what it does with the open tabs' unsaved changes.
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TitleBar } from '../../src/renderer/src/components/layout/TitleBar'
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

const clickClose = (): void => {
  const buttons = screen.getAllByRole('button')
  fireEvent.click(buttons[buttons.length - 1])
}

describe('title bar close', () => {
  beforeEach(() => {
    resetStores()
    window.api = createFakeApi()
  })

  afterEach(cleanup)

  it('title-bar close with no unsaved tab force-closes', async () => {
    openTab()
    render(<TitleBar />)
    clickClose()
    await waitFor(() => expect(window.api.window.forceClose).toHaveBeenCalledTimes(1))
    expect(window.api.window.close).not.toHaveBeenCalled()
  })

  it('title-bar close with only a background tab unsaved force-closes without asking', async () => {
    const background = openTab('Edited')
    const active = openTab()
    const { dirtyByPluginId, activePluginId } = usePluginStore.getState()
    expect(dirtyByPluginId[background]).toBe(true)
    expect(activePluginId).toBe(active)
    render(<TitleBar />)
    clickClose()
    await waitFor(() => expect(window.api.window.forceClose).toHaveBeenCalledTimes(1))
    expect(window.api.dialog.message).not.toHaveBeenCalled()
  })

  it('title-bar close with the active tab unsaved asks with the destructive button first', async () => {
    openTab('Edited')
    render(<TitleBar />)
    clickClose()
    await waitFor(() => expect(window.api.dialog.message).toHaveBeenCalledTimes(1))
    const options = vi.mocked(window.api.dialog.message).mock.calls[0][0]
    expect(options.buttons?.[0]).toBe('Close Without Saving')
    expect(options).not.toHaveProperty('defaultId')
    // The fake answers 0, the destructive button
    await waitFor(() => expect(window.api.window.forceClose).toHaveBeenCalledTimes(1))
  })
})
