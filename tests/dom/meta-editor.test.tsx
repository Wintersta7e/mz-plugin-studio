// The meta tab: generating help text over text already there asks first, and the plugin name of
// a plugin loaded from a file cannot be changed.
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MetaEditor } from '../../src/renderer/src/components/plugin/MetaEditor'
import { usePluginStore, useUIStore } from '../../src/renderer/src/stores'
import { createEmptyPlugin } from '../../src/renderer/src/types/plugin'
import { createFakeApi } from '../helpers/fake-api'
import { resetStores } from './support/reset-stores'

const HELP = 'Help written by hand'

/** Clicks Auto-generate with the message dialog answering `answer`; returns the dialog mock. */
function generateAnswering(answer: number) {
  const message = vi.fn(async () => answer)
  window.api = createFakeApi({ dialog: { message } })
  render(<MetaEditor />)
  fireEvent.click(screen.getByTitle('Auto-generate help text from plugin metadata'))
  return message
}

describe('meta editor help text', () => {
  beforeEach(() => {
    resetStores()
    act(() => {
      usePluginStore.getState().openPlugin(createEmptyPlugin())
      usePluginStore.getState().updateMeta({ help: HELP })
    })
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('replacing help text asks with Cancel as the default', async () => {
    const confirm = vi.spyOn(window, 'confirm')
    const message = generateAnswering(0)
    await waitFor(() => expect(message).toHaveBeenCalledTimes(1))
    expect(message).toHaveBeenCalledWith({
      type: 'question',
      title: 'Replace help text',
      message: 'This will replace the existing help text. Continue?',
      buttons: ['Cancel', 'Replace']
    })
    await act(async () => {})
    expect(usePluginStore.getState().plugin.meta.help).toBe(HELP)
    expect(confirm).not.toHaveBeenCalled()
  })

  it('choosing Replace replaces the help text', async () => {
    generateAnswering(1)
    await waitFor(() => expect(usePluginStore.getState().plugin.meta.help).not.toBe(HELP))
  })
})

describe('meta editor plugin name', () => {
  const NAME_NOTICE =
    'Loaded from Loaded.js: the name is the file name. To save a copy under another name, use Export in the preview.'

  beforeEach(() => {
    resetStores()
    window.api = createFakeApi()
  })

  afterEach(() => {
    cleanup()
  })

  it('is read-only for a plugin loaded from a file, raw mode on or off', () => {
    const plugin = { ...createEmptyPlugin(), importedFrom: 'Loaded.js' }
    act(() => usePluginStore.getState().openPlugin(plugin))
    const { rerender } = render(<MetaEditor />)
    const notice =
      'Loaded from Loaded.js: the plugin name is the file name, so it cannot be changed here.'
    expect(screen.getByLabelText('Plugin Name')).toHaveAttribute('readonly')
    expect(screen.getByLabelText('Plugin Name')).toHaveAttribute('title', notice)
    act(() => useUIStore.getState().setRawModeForPlugin(plugin.id, false))
    rerender(<MetaEditor />)
    expect(screen.getByLabelText('Plugin Name')).toHaveAttribute('readonly')
    expect(screen.getByLabelText('Plugin Name')).toHaveAttribute('title', notice)
  })

  it('says under the name of a plugin loaded from a file why it cannot change', () => {
    act(() =>
      usePluginStore.getState().openPlugin({ ...createEmptyPlugin(), importedFrom: 'Loaded.js' })
    )
    render(<MetaEditor />)
    expect(screen.getByText(NAME_NOTICE)).toBeInTheDocument()
  })

  it('is editable for a plugin made in the app', () => {
    act(() => usePluginStore.getState().openPlugin(createEmptyPlugin()))
    render(<MetaEditor />)
    expect(screen.queryByText(NAME_NOTICE)).toBeNull()
    const name = screen.getByLabelText('Plugin Name')
    expect(name).not.toHaveAttribute('readonly')
    fireEvent.change(name, { target: { value: 'Renamed' } })
    expect(usePluginStore.getState().plugin.meta.name).toBe('Renamed')
  })
})
