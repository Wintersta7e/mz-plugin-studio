// Opening a project from the keyboard (Ctrl+O): a folder that cannot be opened shows a message
// naming the folder and the reason, and leaves the project store's error set.
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
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
    useToastStore.getState().dismissAll()
    vi.unstubAllGlobals()
  })

  it('a folder that is not a project shows the folder and the reason', async () => {
    await openFolder({
      validate: vi.fn(async () => ({
        valid: false,
        error: 'Missing required file: data/System.json'
      }))
    })
    const message =
      'Could not open "/fixture/not-a-project": not an RPG Maker MZ project ' +
      '(Missing required file: data/System.json).'
    expect(await screen.findByText(message)).toBeTruthy()
    expect(screen.getByRole('status').textContent).toContain(message)
    expect(useToastStore.getState().toasts).toMatchObject([
      { type: 'error', message, duration: 10_000 }
    ])
    expect(useProjectStore.getState().error).toBe('Missing required file: data/System.json')
    expect(useProjectStore.getState().project).toBeNull()
  })

  it('a project that fails to load shows the folder and the reason', async () => {
    await openFolder({
      validate: vi.fn(async () => ({ valid: true })),
      load: vi.fn(async () => {
        throw new Error('Unexpected end of JSON input')
      })
    })
    const message = 'Could not open "/fixture/not-a-project": Unexpected end of JSON input'
    expect(await screen.findByText(message)).toBeTruthy()
    expect(screen.getByRole('status').textContent).toContain(message)
    expect(useToastStore.getState().toasts).toMatchObject([
      { type: 'error', message, duration: 10_000 }
    ])
    expect(useProjectStore.getState().error).toBe('Error: Unexpected end of JSON input')
    expect(useProjectStore.getState().project).toBeNull()
  })

  it('a load that rejects with a value that is not an Error shows that value', async () => {
    await openFolder({
      validate: vi.fn(async () => ({ valid: true })),
      load: vi.fn(() => Promise.reject('data folder unreadable'))
    })
    const message = 'Could not open "/fixture/not-a-project": data folder unreadable'
    expect(await screen.findByText(message)).toBeTruthy()
  })
})
