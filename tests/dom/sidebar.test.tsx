// The sidebar's tab list: closing a tab with unsaved changes asks first.
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Sidebar } from '../../src/renderer/src/components/layout/Sidebar'
import { usePluginStore } from '../../src/renderer/src/stores'
import { createEmptyPlugin } from '../../src/renderer/src/types/plugin'
import { createFakeApi } from '../helpers/fake-api'
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
