// The Open Project control suggests the most recent project, so the folder dialog opens beside it.
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../../src/renderer/src/App'
import { useProjectStore, useToastStore } from '../../src/renderer/src/stores'
import { createFakeApi } from '../helpers/fake-api'
import { resetStores } from './support/reset-stores'

describe('open project', { timeout: 30_000 }, () => {
  beforeEach(() => {
    resetStores()
    vi.stubGlobal('__APP_VERSION__', '0.0.0-test')
  })

  afterEach(() => {
    cleanup()
    useToastStore.getState().dismissAll()
    vi.unstubAllGlobals()
  })

  it.each([
    [['/fixture/Recent Game', '/fixture/Older Game'], '/fixture/Recent Game'],
    [[], undefined]
  ])('with recent projects %j suggests %s', async (recentProjects, expected) => {
    useProjectStore.setState({ recentProjects })
    window.api = createFakeApi()
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: 'Open Project' }))
    expect(window.api.dialog.openFolder).toHaveBeenCalledExactlyOnceWith({ defaultPath: expected })
  })
})
