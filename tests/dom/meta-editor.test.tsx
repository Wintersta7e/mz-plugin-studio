// The meta tab's help text: generating it over text already there asks first.
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MetaEditor } from '../../src/renderer/src/components/plugin/MetaEditor'
import { usePluginStore } from '../../src/renderer/src/stores'
import { createEmptyPlugin } from '../../src/renderer/src/types/plugin'
import { createFakeApi } from '../helpers/fake-api'
import { resetStores } from './support/reset-stores'

const HELP = 'Help written by hand'

describe('meta editor help text', () => {
  beforeEach(() => {
    resetStores()
    window.api = createFakeApi()
    act(() => {
      usePluginStore.getState().openPlugin(createEmptyPlugin())
      usePluginStore.getState().updateMeta({ help: HELP })
    })
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('replacing help text asks without a default', () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    render(<MetaEditor />)
    fireEvent.click(screen.getByTitle('Auto-generate help text from plugin metadata'))
    expect(confirm).toHaveBeenCalledWith('This will replace the existing help text. Continue?')
    expect(window.api.dialog.message).not.toHaveBeenCalled()
    expect(usePluginStore.getState().plugin.meta.help).toBe(HELP)
  })
})
