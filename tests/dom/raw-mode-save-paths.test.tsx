// Saving an imported plugin through every save path of the app: Ctrl+S, Save All and the
// preview's Export button. The app starts over the state v1.6.0 saved, whose second tab was
// imported and comes back without its file text.
import { readFileSync } from 'fs'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'fs/promises'
import { tmpdir } from 'os'
import { dirname, join } from 'path'
import { createElement } from 'react'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PluginParser } from '../../src/main/services/pluginParser'
import { generatePlugin } from '../../src/renderer/src/lib/generator'
import type * as StoresModule from '../../src/renderer/src/stores'
import type { PluginDefinition } from '../../src/shared/types/plugin'
import { createFakeApi } from '../helpers/fake-api'
import { fixturePath } from '../helpers/fixture-project'
import { readV160Payloads } from '../helpers/persist-v160'
import { seed } from './support/load-persisted'
import { createMainApi } from './support/main-api'

const payloads = readV160Payloads()
const TAB = '00000000-0000-4000-8000-000000000013'
// v1.6.0 saved this tab, which is not imported, to its file
const SAVED_TAB = '00000000-0000-4000-8000-000000000004'
const FILE = 'Fixture_HandWritten.js'
const PROJECT = '/fixture/mz-project'
const SOURCE_MISSING = `Not saved: the original file ${FILE} is not loaded. Reload it from the project, or turn raw mode off to save regenerated code.`
const RAW_ON = "Raw mode ON: the file's own code and unchanged blocks are kept"
const RAW_OFF = 'Raw mode OFF: the whole plugin is regenerated from the editor'

type Stores = typeof StoresModule

/** Imports the app afresh over what localStorage holds, opens the project and shows the tab. */
async function startApp(api: Window['api'], path = PROJECT): Promise<Stores> {
  window.api = api
  vi.resetModules()
  const { default: App } = await import('../../src/renderer/src/App')
  const stores = await import('../../src/renderer/src/stores')
  render(createElement(App))
  const project = { ...(await api.project.load(PROJECT)), path }
  act(() => {
    stores.useProjectStore.setState({ project })
    stores.usePluginStore.getState().setActivePlugin(TAB)
    stores.useUIStore.getState().setPreviewCollapsed(false)
  })
  return stores
}

function savingApi(answers: number[] = []): Window['api'] {
  return createFakeApi({
    plugin: {
      save: vi.fn(async (_project: string, filename: string) => ({
        success: true as const,
        path: `${PROJECT}/js/plugins/${filename}`,
        sha256: ''
      })),
      saveToPath: vi.fn(async (path: string) => ({ success: true as const, path, sha256: '' }))
    },
    dialog: {
      message: vi.fn(async () => answers.shift() ?? 0),
      saveFile: vi.fn(async () => `/chosen/${FILE}`)
    }
  })
}

const press = (code: string, shiftKey = false): void => {
  fireEvent.keyDown(window, { code, ctrlKey: true, shiftKey })
}

const savedFiles = (api: Window['api']): string[] =>
  vi.mocked(api.plugin.save).mock.calls.map((call) => call[1])

const toastsOf = (stores: Stores): string[] =>
  stores.useToastStore.getState().toasts.map((t) => `${t.type}: ${t.message}`)

describe('saving an imported plugin', () => {
  beforeEach(() => {
    seed(payloads)
    // The build defines this; the status bar shows it.
    vi.stubGlobal('__APP_VERSION__', '0.0.0-test')
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('no save path writes a tab in raw mode whose file text is not loaded', async () => {
    const api = savingApi()
    const stores = await startApp(api)
    let checked = 0

    // The app's own copy of the logger, imported afresh with it
    const { default: log } = await import('electron-log/renderer')
    const durations = (): number[] =>
      stores.useToastStore.getState().toasts.map((toast) => toast.duration)

    press('KeyS')
    await waitFor(() => expect(toastsOf(stores)).toContain(`error: ${SOURCE_MISSING}`))
    expect(savedFiles(api)).toEqual([])
    expect(durations()[0]).toBeGreaterThanOrEqual(10_000)
    expect(log.warn).toHaveBeenCalledWith('[save] refused', FILE, 'source-missing')
    checked++

    stores.useToastStore.setState({ toasts: [] })
    press('KeyS', true)
    await waitFor(() =>
      expect(toastsOf(stores)).toEqual([
        'warning: Saved 1. Not saved, file text not loaded (reload it from the project): Fixture_HandWritten.'
      ])
    )
    expect(durations()[0]).toBeGreaterThanOrEqual(10_000)
    expect(savedFiles(api)).toEqual(['NewPlugin.js'])
    expect(log.warn).toHaveBeenCalledTimes(2)
    checked++

    stores.useToastStore.setState({ toasts: [] })
    fireEvent.click(await screen.findByRole('button', { name: 'Export' }))
    await waitFor(() => expect(toastsOf(stores)).toEqual([`error: ${SOURCE_MISSING}`]))
    expect(savedFiles(api)).toEqual(['NewPlugin.js'])
    expect(api.dialog.saveFile).not.toHaveBeenCalled()
    expect(api.plugin.saveToPath).not.toHaveBeenCalled()
    checked++

    console.log(`save paths checked ${checked}`)
    expect(checked).toBe(3)
  }, 60_000)

  it('turning raw mode off asks before the first save that regenerates the file', async () => {
    const answers = [0, 2]
    const api = savingApi(answers)
    let stores = await startApp(api)
    const tab = (): PluginDefinition => stores.usePluginStore.getState().plugin
    const asked = (): number => vi.mocked(api.dialog.message).mock.calls.length

    fireEvent.click(await screen.findByTitle(RAW_ON))
    await screen.findByTitle(RAW_OFF)

    press('KeyS')
    await waitFor(() => expect(asked()).toBe(1))
    const options = vi.mocked(api.dialog.message).mock.calls[0][0]
    expect(options).toEqual({
      type: 'warning',
      title: 'Save without raw mode?',
      message: `Saving ${FILE} with raw mode off regenerates the whole file: code outside the Code tab will be removed from it.`,
      buttons: ['Cancel', 'Show Diff', 'Save']
    })
    await waitFor(() => expect(answers).toEqual([2]))
    await act(async () => {})
    expect(savedFiles(api)).toEqual([])

    press('KeyS')
    await waitFor(() => expect(savedFiles(api)).toEqual([FILE]))
    // v1.6.0 saved this tab to its file, so the save checks against that file
    expect(vi.mocked(api.plugin.save).mock.calls[0]).toEqual([
      PROJECT,
      FILE,
      generatePlugin(tab()),
      { base: { path: `${PROJECT}/js/plugins/${FILE}`, sha256: null } }
    ])
    expect(asked()).toBe(2)

    await waitFor(() => expect(toastsOf(stores)).toContain('success: Plugin saved'))
    press('KeyS')
    await waitFor(() => expect(savedFiles(api)).toEqual([FILE, FILE]))
    expect(asked()).toBe(2)

    fireEvent.click(screen.getByTitle(RAW_OFF))
    fireEvent.click(await screen.findByTitle(RAW_ON))
    await screen.findByTitle(RAW_OFF)
    press('KeyS')
    await waitFor(() => expect(asked()).toBe(3))
    await act(async () => {})
    expect(savedFiles(api)).toEqual([FILE, FILE])

    // A restart keeps raw mode off but asks again.
    cleanup()
    answers.push(1)
    stores = await startApp(api)
    await screen.findByTitle(RAW_OFF)
    press('KeyS')
    await waitFor(() => expect(asked()).toBe(4))
    const diff = await screen.findByTestId('monaco-diff-modified')
    expect((diff as HTMLTextAreaElement).value).toBe(generatePlugin(tab()))
    expect(stores.useUIStore.getState().diffRequestPluginId).toBeNull()
    expect(savedFiles(api)).toEqual([FILE, FILE])
  }, 90_000)

  it('every save into the project makes what it wrote the file text and baseline of the tab; Export writes a copy', async () => {
    const api = savingApi()
    const stores = await startApp(api)
    const text = readFileSync(fixturePath('js', 'plugins', FILE), 'utf-8')
    const opened = { ...PluginParser.parsePlugin(text, FILE), importedFrom: FILE }
    act(() => stores.usePluginStore.getState().openPlugin(opened))
    const state = () => stores.usePluginStore.getState()
    const writes = (): string[] => [
      ...vi.mocked(api.plugin.save).mock.calls.map((call) => call[2]),
      ...vi.mocked(api.plugin.saveToPath).mock.calls.map((call) => call[1])
    ]
    const saves: [string, () => void][] = [
      ['Ctrl+S', () => press('KeyS')],
      ['Save All', () => press('KeyS', true)]
    ]
    let checked = 0
    for (const [path, run] of saves) {
      const description = `Saved by ${path}`
      act(() => state().updateMeta({ description }))
      run()
      await waitFor(() => expect(state().plugin.rawSource).toContain(description))
      const written = writes().find((code) => code.includes(description))
      expect(state().plugin.rawSource, path).toBe(written)
      expect(state().baselineByPluginId[opened.id].meta.description, path).toBe(description)
      expect(written?.startsWith(text.slice(0, text.indexOf('/*:')))).toBe(true)
      checked++
    }
    const before = state().plugin.rawSource
    act(() => state().updateMeta({ description: 'Saved by Export' }))
    fireEvent.click(screen.getByRole('button', { name: 'Export' }))
    await waitFor(() =>
      expect(writes().some((code) => code.includes('Saved by Export'))).toBe(true)
    )
    await act(async () => {})
    expect(state().plugin.rawSource).toBe(before)
    expect(state().baselineByPluginId[opened.id].meta.description).toBe('Saved by Save All')
    expect(state().dirtyByPluginId[opened.id]).toBe(true)
    checked++
    console.log(`save paths checked ${checked}`)
    expect(checked).toBe(3)
  }, 90_000)

  it('Save All names a tab last saved by v1.6.0 as unconfirmed, not changed on disk', async () => {
    const project = await mkdtemp(join(tmpdir(), 'save-all-upgrade-'))
    try {
      const file = join(project, 'js', 'plugins', 'Synthetic_Tool.js')
      await mkdir(dirname(file), { recursive: true })
      await writeFile(file, '// saved by v1.6.0\n')
      const persisted = JSON.parse(payloads['mz-plugin-studio-plugin'] as string)
      persisted.state.savedPathsByPluginId[SAVED_TAB] = file
      persisted.state.dirtyByPluginId[SAVED_TAB] = true
      seed({ ...payloads, 'mz-plugin-studio-plugin': JSON.stringify(persisted) })
      const api = createMainApi()
      const stores = await startApp(api, project)
      expect(stores.usePluginStore.getState().baseByPluginId[SAVED_TAB]).toEqual({
        path: file,
        sha256: null
      })

      press('KeyS', true)
      await waitFor(() => expect(toastsOf(stores)).toHaveLength(1))
      const report = toastsOf(stores)[0]
      expect(report).not.toContain('changed on disk')
      expect(report).toContain(
        'Not saved, cannot confirm the file is unchanged (save it with Ctrl+S to confirm): Synthetic_Tool.'
      )
      expect(await readFile(file, 'utf8')).toBe('// saved by v1.6.0\n')
      expect(api.dialog.message).not.toHaveBeenCalled()
    } finally {
      await rm(project, { recursive: true, force: true })
    }
  }, 60_000)
})
