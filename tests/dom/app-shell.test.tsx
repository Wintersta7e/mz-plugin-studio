// Opening a project from the keyboard (Ctrl+O): a folder that cannot be opened shows a message
// naming the folder and the reason, and leaves the project store's error set. A project that
// opens offers to reload the imported tabs whose file text is not loaded in one action.
import { readFileSync } from 'fs'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../../src/renderer/src/App'
import { PluginParser } from '../../src/main/services/pluginParser'
import { usePluginStore, useProjectStore, useToastStore } from '../../src/renderer/src/stores'
import type { PluginDefinition } from '../../src/renderer/src/types/plugin'
import { createFakeApi } from '../helpers/fake-api'
import type { FakeApiOverrides } from '../helpers/fake-api'
import { fixturePath } from '../helpers/fixture-project'
import { createMainApi } from './support/main-api'
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

describe(
  'opening a project with imported tabs whose file text is not loaded',
  { timeout: 30_000 },
  () => {
    const PROJECT = fixturePath()
    const FILES = ['Fixture_HandWritten.js', 'Fixture_Structs.js']
    const textOf = (file: string): string =>
      readFileSync(fixturePath('js', 'plugins', file), 'utf-8')
    const tab = (id: string): PluginDefinition | undefined =>
      usePluginStore.getState().openPlugins.find((p) => p.id === id)

    /** Opens `file` as a tab saved by an older version: imported, without its file text. */
    function openStaleTab(file: string, importedFrom = file): string {
      const { rawSource: _rawSource, ...stale } = PluginParser.parsePlugin(textOf(file), file)
      act(() => usePluginStore.getState().openPlugin({ ...stale, importedFrom }))
      return stale.id
    }

    /** Renders the app over the fixture project, whose plugin folder lists `FILES`, and opens it. */
    async function openFixtureProject(answers: number[] = []): Promise<void> {
      const project = await createFakeApi().project.load(PROJECT)
      window.api = createMainApi({
        answers,
        overrides: {
          dialog: { openFolder: vi.fn(async () => PROJECT) },
          project: {
            validate: vi.fn(async () => ({ valid: true })),
            load: vi.fn(async () => ({ ...project, path: PROJECT }))
          },
          plugin: { list: vi.fn(async () => [...FILES, 'Fixture_JaOnly.js']) }
        }
      })
      render(<App />)
      act(() => {
        fireEvent.keyDown(window, { key: 'o', code: 'KeyO', ctrlKey: true })
      })
      await waitFor(() => expect(useProjectStore.getState().project?.path).toBe(PROJECT))
    }

    beforeEach(() => {
      resetStores()
      vi.stubGlobal('__APP_VERSION__', '0.0.0-test')
    })

    afterEach(() => {
      cleanup()
      useToastStore.getState().dismissAll()
      vi.unstubAllGlobals()
    })

    it('one action reloads every such tab whose file is in the project', async () => {
      const ids = FILES.map((file) => openStaleTab(file))
      const elsewhere = openStaleTab(FILES[0], 'Fixture_Elsewhere.js')
      await openFixtureProject()
      fireEvent.click(
        await screen.findByRole('button', { name: 'Reload 2 plugins from this project' })
      )
      await waitFor(() => {
        for (const [i, id] of ids.entries()) expect(tab(id)?.rawSource).toBe(textOf(FILES[i]))
      })
      expect(tab(elsewhere)?.rawSource).toBeUndefined()
      expect(window.api.dialog.message).not.toHaveBeenCalled()
      expect(window.api.plugin.readRaw).toHaveBeenCalledTimes(2)
    })

    it('a tab with unsaved edits asks first, and Cancel keeps it as it is', async () => {
      const [clean, edited] = FILES.map((file) => openStaleTab(file))
      act(() => usePluginStore.getState().updateMeta({ description: 'Edited before reload' }))
      await openFixtureProject([0])
      fireEvent.click(
        await screen.findByRole('button', { name: 'Reload 2 plugins from this project' })
      )
      await waitFor(() => expect(tab(clean)?.rawSource).toBe(textOf(FILES[0])))
      await waitFor(() => expect(window.api.dialog.message).toHaveBeenCalledTimes(1))
      const options = vi.mocked(window.api.dialog.message).mock.calls[0][0]
      expect(options).toMatchObject({ title: 'Reload from project?', defaultId: 0, cancelId: 0 })
      expect(options.buttons?.[0]).toBe('Cancel')
      expect(tab(edited)?.rawSource).toBeUndefined()
      expect(tab(edited)?.meta.description).toBe('Edited before reload')
    })

    it('offers nothing when no such tab has its file in the project', async () => {
      openStaleTab(FILES[0], 'Fixture_Elsewhere.js')
      await openFixtureProject()
      await waitFor(() => expect(window.api.plugin.list).toHaveBeenCalledWith(PROJECT))
      expect(screen.queryByRole('button', { name: /plugins? from this project/ })).toBeNull()
    })
  }
)
