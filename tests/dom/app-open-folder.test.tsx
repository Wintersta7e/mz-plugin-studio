// The Open Project control suggests the most recent project, so the folder dialog opens beside it.
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../../src/renderer/src/App'
import { useProjectStore, useToastStore } from '../../src/renderer/src/stores'
import { createFakeApi } from '../helpers/fake-api'
import { LOAD_PREVIEW_TIMEOUT_MS, loadPreview } from './support/load-preview'
import { resetStores } from './support/reset-stores'

describe('open project', { timeout: 30_000 }, () => {
  beforeAll(loadPreview, LOAD_PREVIEW_TIMEOUT_MS)

  beforeEach(() => {
    resetStores()
    vi.stubGlobal('__APP_VERSION__', '0.0.0-test')
  })

  // The app stays mounted until the automatic cleanup after this hook, so the toasts it shows
  // are dismissed inside act
  afterEach(() => {
    act(() => {
      useToastStore.getState().dismissAll()
    })
    vi.unstubAllGlobals()
  })

  it.each([
    [['/fixture/Recent Game', '/fixture/Older Game'], '/fixture/Recent Game'],
    [[], undefined]
  ])('with recent projects %j suggests %s', async (recentProjects, expected) => {
    expect.assertions(1)

    useProjectStore.setState({ recentProjects })
    vi.stubGlobal('api', createFakeApi())
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: 'Open Project' }))

    expect(globalThis.api.dialog.openFolder).toHaveBeenCalledExactlyOnceWith({
      defaultPath: expected
    })
  })
})
