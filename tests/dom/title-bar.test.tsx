// The title bar's close button: it asks main to close the window, and main asks about unsaved
// changes in any open tab, so the button itself never prompts.
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
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
