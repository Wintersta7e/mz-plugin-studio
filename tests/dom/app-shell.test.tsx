// Opening a project from the keyboard (Ctrl+O): a folder that cannot be opened leaves the
// project store's error set.
import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../../src/renderer/src/App'
import { useProjectStore, useToastStore } from '../../src/renderer/src/stores'
import { createFakeApi } from '../helpers/fake-api'
import type { FakeApiOverrides } from '../helpers/fake-api'
import { resetStores } from './support/reset-stores'

const FOLDER = '/fixture/not-a-project'

/** Renders the app with `project` behind the fake api and opens `FOLDER` with Ctrl+O. */
async function openFolder(project: FakeApiOverrides['project']): Promise<void> {
  window.api = createFakeApi({ dialog: { openFolder: vi.fn(async () => FOLDER) }, project })
  render(<App />)
  act(() => {
    fireEvent.keyDown(window, { key: 'o', code: 'KeyO', ctrlKey: true })
  })
  await waitFor(() => expect(useProjectStore.getState().isLoading).toBe(false))
  await waitFor(() => expect(useProjectStore.getState().error).not.toBeNull())
}

// Each case renders the whole app, which takes seconds on a cold start
describe('opening a project', { timeout: 30_000 }, () => {
  beforeEach(() => {
    resetStores()
    // The build defines this; the status bar shows it.
    vi.stubGlobal('__APP_VERSION__', '0.0.0-test')
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('a folder that is not a project sets an error nobody shows', async () => {
    await openFolder({
      validate: vi.fn(async () => ({
        valid: false,
        error: 'Missing required file: data/System.json'
      }))
    })
    expect(useProjectStore.getState().error).toBe('Missing required file: data/System.json')
    expect(useProjectStore.getState().project).toBeNull()
    expect(useToastStore.getState().toasts).toEqual([])
  })

  it('a project that fails to load sets an error nobody shows', async () => {
    await openFolder({
      validate: vi.fn(async () => ({ valid: true })),
      load: vi.fn(async () => {
        throw new Error('Unexpected end of JSON input')
      })
    })
    expect(useProjectStore.getState().error).toBe('Error: Unexpected end of JSON input')
    expect(useProjectStore.getState().project).toBeNull()
    expect(useToastStore.getState().toasts).toEqual([])
  })
})
