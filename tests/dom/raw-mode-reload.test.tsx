// Reload from project: an imported tab whose file text did not come back after a restart gets it
// again from the project. A tab with no unsaved edits takes the file as it is now; a tab with
// edits asks whether to replace them with the file or keep them.
import { readFileSync } from 'fs'
import { join } from 'path'
import { createElement } from 'react'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PluginParser } from '../../src/main/services/pluginParser'
import type * as StoresModule from '../../src/renderer/src/stores'
import type * as RawModeModule from '../../src/renderer/src/lib/raw-mode'
import { toBaseline } from '../../src/shared/types/plugin'
import type { PluginDefinition } from '../../src/shared/types/plugin'
import { createFakeApi } from '../helpers/fake-api'
import { fixturePath } from '../helpers/fixture-project'
import { readV160Payloads } from '../helpers/persist-v160'
import { seed } from './support/load-persisted'

const payloads = readV160Payloads()
const TAB = '00000000-0000-4000-8000-000000000013'
const FILE = 'Fixture_HandWritten.js'
const PROJECT = '/fixture/mz-project'
const TEXT = readFileSync(fixturePath('js', 'plugins', FILE), 'utf-8')
const RELOAD = 'Reload from project'
const PATH = `${PROJECT}/js/plugins/${FILE}`
const QUESTION = {
  type: 'question',
  title: 'Reload from project?',
  message: `${PATH} may not match this tab: the tab was read by an older version of the app, or the file changed since it was opened. Replace the tab with the file, dropping its unsaved edits, or keep the tab's values and apply them to the reloaded file?`,
  buttons: ['Cancel', 'Replace with file', 'Keep tab values']
}

type Stores = typeof StoresModule

/** Imports the app afresh over what localStorage holds and shows the imported tab, edited. */
async function startApp(api: Window['api'], withProject: boolean): Promise<Stores> {
  window.api = api
  vi.resetModules()
  const { default: App } = await import('../../src/renderer/src/App')
  const stores = await import('../../src/renderer/src/stores')
  render(createElement(App))
  const project = { ...(await api.project.load(PROJECT)), path: PROJECT }
  act(() => {
    if (withProject) stores.useProjectStore.setState({ project })
    stores.usePluginStore.getState().setActivePlugin(TAB)
    stores.useUIStore.getState().setPreviewCollapsed(false)
    stores.usePluginStore.getState().updateMeta({ description: 'Edited before reload' })
  })
  return stores
}

/** The stores and reload/save functions of a fresh import, with the fixture project open. */
async function startStores(
  api: Window['api']
): Promise<{ stores: Stores; rawMode: typeof RawModeModule }> {
  window.api = api
  vi.resetModules()
  const stores = await import('../../src/renderer/src/stores')
  const rawMode = await import('../../src/renderer/src/lib/raw-mode')
  stores.useProjectStore.setState({
    project: { ...(await api.project.load(PROJECT)), path: PROJECT }
  })
  return { stores, rawMode }
}

/** An api whose project holds `text` and whose dialogs answer `answer`. */
const apiReading = (text: string, answer = 1): Window['api'] =>
  createFakeApi({
    plugin: {
      readRaw: vi.fn(async () => ({ content: text, path: '', sha256: '' })),
      parse: vi.fn(async (content: string) => PluginParser.parsePlugin(content))
    },
    dialog: { message: vi.fn(async () => answer) }
  })

/**
 * The tab v1.6.1 kept for `name`: that version's parser output (copied from its golden), with
 * ids and without the file text, saved with no unsaved edits.
 */
function seedOlderTab(name: string): string {
  const json = readFileSync(
    join(process.cwd(), 'tests/fixtures/persisted/older-parser', `${name}.json`),
    'utf8'
  ).replace(/<id:(\d+)>/g, (_, n: string) => `00000000-0000-4000-8000-1${n.padStart(11, '0')}`)
  const { rawSource: _rawSource, ...tab } = JSON.parse(json) as PluginDefinition
  const stored = JSON.parse(payloads['mz-plugin-studio-plugin'] as string)
  stored.state = {
    ...stored.state,
    plugin: tab,
    openPlugins: [tab],
    activePluginId: tab.id,
    isDirty: false,
    savedPath: null,
    dirtyByPluginId: {},
    savedPathsByPluginId: {}
  }
  seed({ ...payloads, 'mz-plugin-studio-plugin': JSON.stringify(stored) })
  return tab.id
}

describe('reloading an imported plugin from the project', () => {
  beforeEach(() => {
    seed(payloads)
    vi.stubGlobal('__APP_VERSION__', '0.0.0-test')
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('keeping the tab values brings back the file text and its baseline', async () => {
    let parsed: PluginDefinition | null = null
    const api = createFakeApi({
      plugin: {
        readRaw: vi.fn(async () => ({ content: TEXT, path: PATH, sha256: 'sha-of-file' })),
        parse: vi.fn(async (content: string) => (parsed = PluginParser.parsePlugin(content)))
      },
      dialog: { message: vi.fn(async () => 2) }
    })
    const stores = await startApp(api, true)
    const tab = (): PluginDefinition => stores.usePluginStore.getState().plugin
    expect(tab().rawSource).toBeUndefined()
    // Saved by v1.6.0, so the tab knows its file but not what it held
    expect(stores.usePluginStore.getState().baseByPluginId[TAB]).toEqual({
      path: PATH,
      sha256: null
    })

    fireEvent.click(await screen.findByRole('button', { name: RELOAD }))
    await waitFor(() => expect(tab().rawSource).toBe(TEXT))
    expect(api.dialog.message).toHaveBeenCalledWith(QUESTION)
    expect(api.plugin.readRaw).toHaveBeenCalledWith(PROJECT, FILE)
    expect(parsed).not.toBeNull()
    const loaded = parsed as unknown as PluginDefinition
    expect(stores.usePluginStore.getState().baselineByPluginId[TAB]).toEqual(
      toBaseline({
        ...loaded,
        id: TAB,
        importedFrom: FILE,
        meta: { ...loaded.meta, name: 'Fixture_HandWritten' }
      })
    )
    expect(stores.usePluginStore.getState().baseByPluginId[TAB]).toEqual({
      path: PATH,
      sha256: 'sha-of-file'
    })
    expect(tab().meta.description).toBe('Edited before reload')
    expect(stores.usePluginStore.getState().dirtyByPluginId[TAB]).toBe(true)
    expect(stores.usePluginStore.getState().openPlugins.find((p) => p.id === TAB)?.rawSource).toBe(
      TEXT
    )
    await waitFor(() => expect(screen.queryByRole('button', { name: RELOAD })).toBeNull())
  }, 60_000)

  it('replacing the tab with the file drops its edits and saves the file as it is', async () => {
    const api = apiReading(TEXT, 1)
    const stores = await startApp(api, true)
    fireEvent.click(await screen.findByRole('button', { name: RELOAD }))
    await waitFor(() => expect(stores.usePluginStore.getState().plugin.rawSource).toBe(TEXT))
    expect(api.dialog.message).toHaveBeenCalledWith(QUESTION)
    const state = stores.usePluginStore.getState()
    expect(state.plugin.id).toBe(TAB)
    expect(state.plugin.importedFrom).toBe(FILE)
    expect(state.plugin.meta.description).not.toBe('Edited before reload')
    expect(state.isDirty).toBe(false)
    expect(state.dirtyByPluginId[TAB]).toBeUndefined()
    const { prepareSave } = await import('../../src/renderer/src/lib/raw-mode')
    expect(await prepareSave(TAB, { ask: false })).toMatchObject({ status: 'ready', code: TEXT })
  }, 60_000)

  it('cancelling the confirmation reads nothing', async () => {
    const api = createFakeApi({ dialog: { message: vi.fn(async () => 0) } })
    const stores = await startApp(api, true)
    fireEvent.click(await screen.findByRole('button', { name: RELOAD }))
    await waitFor(() => expect(api.dialog.message).toHaveBeenCalledTimes(1))
    await act(async () => {})
    expect(api.plugin.readRaw).not.toHaveBeenCalled()
    expect(stores.usePluginStore.getState().plugin.rawSource).toBeUndefined()
  }, 60_000)

  it('a file that cannot be read is reported and changes nothing', async () => {
    // The shape ipcRenderer.invoke rejects with when the main-process handler throws
    const refusal = new Error("Error invoking remote method 'plugin:read-raw': Error: missing")
    const api = createFakeApi({
      plugin: {
        readRaw: vi.fn(async () => {
          throw refusal
        })
      },
      dialog: { message: vi.fn(async () => 1) }
    })
    const stores = await startApp(api, true)
    fireEvent.click(await screen.findByRole('button', { name: RELOAD }))
    await waitFor(() =>
      expect(stores.useToastStore.getState().toasts).toContainEqual(
        expect.objectContaining({
          type: 'error',
          message: `Could not read ${PATH}: missing`,
          duration: 10_000
        })
      )
    )
    expect(stores.usePluginStore.getState().plugin.rawSource).toBeUndefined()
    // The app's own copy of the logger, imported afresh with it
    const { default: log } = await import('electron-log/renderer')
    expect(log.error).toHaveBeenCalledWith('[reload]', PATH, refusal)
    expect(stores.usePluginStore.getState().baseByPluginId[TAB]).toEqual({
      path: PATH,
      sha256: null
    })
  }, 60_000)

  it('without a project the button is disabled and says why', async () => {
    const api = createFakeApi()
    await startApp(api, false)
    const button = await screen.findByRole('button', { name: RELOAD })
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('title', 'Open the project first.')
  }, 60_000)
})

describe('reloading a tab with no unsaved edits', () => {
  // The older parser misread these files (a CRLF licence preamble, a Japanese block first), so
  // the tab's values differ from what the file says without anyone having edited them
  it.each(['Fixture_HandWritten_CRLF', 'Fixture_JaFirst'])(
    'takes %s as the file is, without asking, when the tab was read by an older version',
    async (name) => {
      const id = seedOlderTab(name)
      const text = readFileSync(fixturePath('js', 'plugins', `${name}.js`), 'utf-8')
      const api = apiReading(text)
      const { stores, rawMode } = await startStores(api)
      expect(stores.usePluginStore.getState().plugin.rawSource).toBeUndefined()

      expect(await rawMode.reloadFromProject(id)).toBe(true)
      expect(await rawMode.prepareSave(id, { ask: false })).toMatchObject({
        status: 'ready',
        code: text
      })
      expect(api.dialog.message).not.toHaveBeenCalled()
      expect(stores.usePluginStore.getState().plugin).toMatchObject({
        id,
        importedFrom: `${name}.js`,
        rawSource: text
      })
      expect(stores.usePluginStore.getState().dirtyByPluginId[id]).toBeUndefined()
    }
  )

  it('takes a file that changed since the tab was opened', async () => {
    const v1 = `/*:\n * @target MZ\n * @plugindesc Fixture v1\n * @param A\n * @default 1\n */\n(() => {\n    const params = PluginManager.parameters('Fixture');\n    window.a = Number(params['A']);\n})();\n`
    const v2 = `/*:\n * @target MZ\n * @plugindesc Fixture v2\n * @param A\n * @default 1\n *\n * @param B\n * @type struct<Opt>\n * @default {}\n */\n(() => {\n    const params = PluginManager.parameters('Fixture');\n    window.a = Number(params['A']);\n    window.b = JSON.parse(params['B']);\n})();\n`
    seed({})
    const api = apiReading(v2)
    const { stores, rawMode } = await startStores(api)
    const opened = { ...PluginParser.parsePlugin(v1, 'Fixture.js'), importedFrom: 'Fixture.js' }
    stores.usePluginStore.getState().openPlugin(opened)

    expect(await rawMode.reloadFromProject(opened.id)).toBe(true)
    expect(await rawMode.prepareSave(opened.id, { ask: false })).toMatchObject({
      status: 'ready',
      code: v2
    })
    expect(api.dialog.message).not.toHaveBeenCalled()
  })
})
