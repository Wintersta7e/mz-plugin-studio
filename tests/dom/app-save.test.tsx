// Saving from the keyboard: Ctrl+S saves the active tab into the open project, Save All
// (Ctrl+Shift+S) every unsaved tab. Behind `window.api` sits a fake whose saves the test answers.
import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../../src/renderer/src/App'
import { usePluginStore, useProjectStore, useToastStore } from '../../src/renderer/src/stores'
import { createEmptyPlugin } from '../../src/renderer/src/types/plugin'
import { createFakeApi } from '../helpers/fake-api'
import { resetStores } from './support/reset-stores'

const PROJECT = '/fixture/mz-project'

type SaveResult = { success: boolean; path: string }

const savedAs = (filename: string): SaveResult => ({
  success: true,
  path: `${PROJECT}/js/plugins/${filename}`
})

/** A fake api whose plugin saves succeed unless `save` is given. */
function savingApi(
  save = vi.fn(async (_project: string, filename: string) => savedAs(filename))
): Window['api'] {
  return createFakeApi({ plugin: { save } })
}

async function openProject(): Promise<void> {
  const project = { ...(await window.api.project.load(PROJECT)), path: PROJECT }
  act(() => useProjectStore.getState().setProject(project))
}

/** Opens a new plugin as the active tab; a `name` is typed into it, which leaves it unsaved. */
function openTab(name?: string): string {
  const plugin = createEmptyPlugin()
  act(() => {
    usePluginStore.getState().openPlugin(plugin)
    if (name !== undefined) usePluginStore.getState().updateMeta({ name })
  })
  return plugin.id
}

function deferred<T>(): { promise: Promise<T>; resolve: (value: T) => void } {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((r) => (resolve = r))
  return { promise, resolve }
}

const pressSave = (): void => {
  fireEvent.keyDown(window, { key: 's', code: 'KeyS', ctrlKey: true })
}

const pressSaveAll = (): void => {
  fireEvent.keyDown(window, { key: 'S', code: 'KeyS', ctrlKey: true, shiftKey: true })
}

const savedFiles = (): string[] =>
  vi.mocked(window.api.plugin.save).mock.calls.map((call) => call[1])

const toasts = (): string[] => useToastStore.getState().toasts.map((t) => `${t.type}: ${t.message}`)

const isDirty = (id: string): boolean => usePluginStore.getState().dirtyByPluginId[id] ?? false

// Each case renders the whole app, which takes seconds on a cold start
describe('saving from the keyboard', { timeout: 30_000 }, () => {
  beforeEach(() => {
    resetStores()
    // The build defines this; the status bar shows it.
    vi.stubGlobal('__APP_VERSION__', '0.0.0-test')
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('two new plugins with the default name save to the same file without asking', async () => {
    window.api = savingApi()
    await openProject()
    const tabs = [openTab(), openTab()]
    render(<App />)
    for (const [i, id] of tabs.entries()) {
      act(() => usePluginStore.getState().setActivePlugin(id))
      pressSave()
      await waitFor(() =>
        expect(toasts().filter((t) => t === 'success: Plugin saved')).toHaveLength(i + 1)
      )
      // Lets the save finish before the next key press
      await act(async () => {})
    }
    expect(savedFiles()).toEqual(['NewPlugin.js', 'NewPlugin.js'])
    expect(vi.mocked(window.api.plugin.save).mock.calls.map((call) => call[0])).toEqual([
      PROJECT,
      PROJECT
    ])
    expect(window.api.dialog.message).not.toHaveBeenCalled()
  })

  it('Ctrl+S without a project writes nothing and opens no dialog', async () => {
    window.api = savingApi()
    const id = openTab('Alpha')
    render(<App />)
    pressSave()
    await act(async () => {})
    expect(isDirty(id)).toBe(true)
    expect(window.api.plugin.save).not.toHaveBeenCalled()
    expect(window.api.plugin.saveToPath).not.toHaveBeenCalled()
    expect(window.api.dialog.saveFile).not.toHaveBeenCalled()
    expect(window.api.dialog.message).not.toHaveBeenCalled()
  })

  it.each([
    ['Ctrl+S', pressSave, 'success: Plugin saved'],
    ['Save All', pressSaveAll, 'success: 1 plugin saved']
  ])('an edit made while %s is in flight is marked saved', async (_label, press, toast) => {
    const pending = deferred<SaveResult>()
    window.api = savingApi(vi.fn(() => pending.promise))
    await openProject()
    const id = openTab('Alpha')
    render(<App />)
    press()
    await waitFor(() => expect(window.api.plugin.save).toHaveBeenCalledTimes(1))
    act(() => usePluginStore.getState().updateMeta({ description: 'edited during save' }))
    expect(isDirty(id)).toBe(true)
    await act(async () => pending.resolve(savedAs('Alpha.js')))
    await waitFor(() => expect(toasts()).toContain(toast))
    expect(usePluginStore.getState().plugin.meta.description).toBe('edited during save')
    expect(isDirty(id)).toBe(false)
  })

  it('Save All saves every dirty tab and reports failures by count', async () => {
    window.api = savingApi(
      vi.fn(async (_project: string, filename: string) => {
        if (filename === 'Beta.js') throw new Error('disk full')
        return savedAs(filename)
      })
    )
    await openProject()
    const [alpha, beta, gamma] = [openTab('Alpha'), openTab('Beta'), openTab('Gamma')]
    render(<App />)
    pressSaveAll()
    await waitFor(() => expect(toasts()).toEqual(['warning: Saved 2, failed 1']))
    expect(savedFiles().sort()).toEqual(['Alpha.js', 'Beta.js', 'Gamma.js'])
    expect([alpha, beta, gamma].map(isDirty)).toEqual([false, true, false])
  })
})
