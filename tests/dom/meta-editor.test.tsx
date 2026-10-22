// The meta tab's help text: generating it over text already there asks first.
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MetaEditor } from '../../src/renderer/src/components/plugin/MetaEditor'
import { usePluginStore } from '../../src/renderer/src/stores'
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
      buttons: ['Cancel', 'Replace'],
      defaultId: 0,
      cancelId: 0
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
