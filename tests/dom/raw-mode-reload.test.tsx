// Reload from project: an imported tab whose file text did not come back after a restart gets it
// again from the project. A tab with no unsaved edits takes the file as it is now; a tab with
// edits asks whether to replace them with the file or keep them.
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { createElement } from 'react'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest'
import { PluginParser } from '../../src/main/services/pluginParser'
import type * as StoresModule from '../../src/renderer/src/stores'
import type * as RawModeModule from '../../src/renderer/src/lib/raw-mode'
import { toBaseline, type PluginDefinition } from '../../src/shared/types/plugin'
import { createFakeApi } from '../helpers/fake-api'
import { fixturePath } from '../helpers/fixture-project'
import { readV160Payloads } from '../helpers/persist-v160'
import { seed } from './support/load-persisted'
import { envelopeOf, recordOf, savedStateOf } from './support/persisted-state'
import { previewShown } from './support/preview'

type Api = Window['api']
type Parse = Api['plugin']['parse']
type ReadRaw = Api['plugin']['readRaw']
type Message = Api['dialog']['message']

const payloads = readV160Payloads()
const TAB = '00000000-0000-4000-8000-000000000013'
const FILE = 'Fixture_HandWritten.js'
const PROJECT = '/fixture/mz-project'
const TEXT = readFileSync(fixturePath('js', 'plugins', FILE), 'utf8')
const RELOAD = 'Reload from project'
const PATH = `${PROJECT}/js/plugins/${FILE}`
const QUESTION = {
  type: 'question',
  title: 'Reload from project?',
  message: `${PATH} may not match this tab: the tab was read by an older version of the app, or the file changed since it was opened. Replace the tab with the file, dropping its unsaved edits, or keep the tab's values and apply them to the reloaded file?`,
  buttons: ['Cancel', 'Replace with file', 'Keep tab values']
}

type Stores = typeof StoresModule

/**
Imports the app afresh over what localStorage holds and shows the imported tab, edited.
*/
async function startApp(api: Api, hasProject: boolean): Promise<Stores> {
  vi.stubGlobal('api', api)
  vi.resetModules()
  const { default: App } = await import('../../src/renderer/src/App')
  const stores = await import('../../src/renderer/src/stores')
  render(createElement(App))
  const project = { ...(await api.project.load(PROJECT)), path: PROJECT }
  act(() => {
    if (hasProject) stores.useProjectStore.setState({ project })
    stores.usePluginStore.getState().setActivePlugin(TAB)
    stores.useUIStore.getState().setPreviewCollapsed(false)
    stores.usePluginStore.getState().updateMeta({ description: 'Edited before reload' })
  })
  await previewShown()
  return stores
}

/**
The stores and reload/save functions of a fresh import, with the fixture project open.
*/
async function startStores(api: Api): Promise<{ stores: Stores; rawMode: typeof RawModeModule }> {
  vi.stubGlobal('api', api)
  vi.resetModules()
  const stores = await import('../../src/renderer/src/stores')
  const rawMode = await import('../../src/renderer/src/lib/raw-mode')
  stores.useProjectStore.setState({
    project: { ...(await api.project.load(PROJECT)), path: PROJECT }
  })
  return { stores, rawMode }
}

// The main-process parser behind the async `parse` the renderer calls
function mainParse(): Mock<Parse> {
  // The inner mock turns the parser's result into the promise the call answers with
  const reply = vi.fn<Parse>()
  return vi.fn<Parse>(async (content) => {
    reply.mockResolvedValueOnce(PluginParser.parsePlugin(content))
    return reply(content)
  })
}

// What the first `parse` call answered with
function firstParsed(parse: Mock<Parse>): PluginDefinition {
  const settled = parse.mock.settledResults.at(0)
  if (settled?.type !== 'fulfilled') throw new Error('the plugin was not parsed')
  return settled.value
}

/**
An api whose project holds `text` and whose dialogs answer "Replace with file".
*/
const apiReading = (text: string): Api =>
  createFakeApi({
    plugin: {
      readRaw: vi.fn<ReadRaw>().mockResolvedValue({ content: text, path: '', sha256: '' }),
      parse: mainParse()
    },
    dialog: { message: vi.fn<Message>().mockResolvedValue(1) }
  })

/**
The tab v1.6.1 kept for `name`: that version's parser output (copied from its golden), with
ids and without the file text, saved with no unsaved edits.
*/
function seedOlderTab(name: string): string {
  const json = readFileSync(
    path.join(process.cwd(), 'tests/fixtures/persisted/older-parser', `${name}.json`),
    'utf8'
  ).replaceAll(/<id:(\d+)>/g, (_, n: string) => `00000000-0000-4000-8000-1${n.padStart(11, '0')}`)
  const parsed: unknown = JSON.parse(json)
  const tab = Object.fromEntries(
    Object.entries(recordOf(parsed, `${name}.json`)).filter(([key]) => key !== 'rawSource')
  )
  const { id } = tab
  if (typeof id !== 'string') throw new TypeError(`${name}.json has no string id`)
  const raw = payloads['mz-plugin-studio-plugin']
  const state = {
    ...savedStateOf(raw, 'the plugin payload'),
    plugin: tab,
    openPlugins: [tab],
    activePluginId: id,
    isDirty: false,
    savedPath: null,
    dirtyByPluginId: {},
    savedPathsByPluginId: {}
  }
  const stored = { ...envelopeOf(raw, 'the plugin payload'), state }
  seed({ ...payloads, 'mz-plugin-studio-plugin': JSON.stringify(stored) })
  return id
}

function setUp(): void {
  seed(payloads)
  vi.stubGlobal('__APP_VERSION__', '0.0.0-test')
}

function tearDown(): void {
  vi.unstubAllGlobals()
}

describe('reloading an imported plugin from the project: keeping the tab values', () => {
  beforeEach(setUp)

  afterEach(tearDown)

  it('keeping the tab values brings back the file text and its baseline', async () => {
    expect.hasAssertions()

    const parse = mainParse()
    const api = createFakeApi({
      plugin: {
        readRaw: vi
          .fn<ReadRaw>()
          .mockResolvedValue({ content: TEXT, path: PATH, sha256: 'sha-of-file' }),
        parse
      },
      dialog: { message: vi.fn<Message>().mockResolvedValue(2) }
    })
    const stores = await startApp(api, true)
    const tab = (): PluginDefinition => stores.usePluginStore.getState().plugin

    // Saved by v1.6.0, so the tab knows its file but not what it held
    expect({
      rawSource: tab().rawSource,
      base: stores.usePluginStore.getState().baseByPluginId[TAB]
    }).toStrictEqual({ rawSource: undefined, base: { path: PATH, sha256: null } })

    fireEvent.click(await screen.findByRole('button', { name: RELOAD }))
    await waitFor(() => {
      expect(tab().rawSource).toBe(TEXT)
    })

    const loaded = firstParsed(parse)
    const state = stores.usePluginStore.getState()

    expect({
      asked: vi.mocked(api.dialog.message).mock.calls,
      read: vi.mocked(api.plugin.readRaw).mock.calls,
      baseline: state.baselineByPluginId[TAB],
      base: state.baseByPluginId[TAB],
      description: tab().meta.description,
      isDirty: state.dirtyByPluginId[TAB],
      openRawSource: state.openPlugins.find((p) => p.id === TAB)?.rawSource
    }).toStrictEqual({
      asked: [[QUESTION]],
      read: [[PROJECT, FILE]],
      baseline: toBaseline({
        ...loaded,
        id: TAB,
        importedFrom: FILE,
        meta: { ...loaded.meta, name: 'Fixture_HandWritten' }
      }),
      base: { path: PATH, sha256: 'sha-of-file' },
      description: 'Edited before reload',
      isDirty: true,
      openRawSource: TEXT
    })

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: RELOAD })).not.toBeInTheDocument()
    })
  }, 60_000)
})

describe('reloading an imported plugin from the project: replacing or cancelling', () => {
  beforeEach(setUp)

  afterEach(tearDown)

  it('replacing the tab with the file drops its edits and saves the file as it is', async () => {
    expect.hasAssertions()

    const api = apiReading(TEXT)
    const stores = await startApp(api, true)
    fireEvent.click(await screen.findByRole('button', { name: RELOAD }))
    await waitFor(() => {
      expect(stores.usePluginStore.getState().plugin.rawSource).toBe(TEXT)
    })

    expect(api.dialog.message).toHaveBeenCalledWith(QUESTION)

    const { plugin, isDirty, dirtyByPluginId } = stores.usePluginStore.getState()

    expect({
      id: plugin.id,
      importedFrom: plugin.importedFrom,
      keepsEdit: plugin.meta.description === 'Edited before reload',
      isDirty,
      isTabDirty: dirtyByPluginId[TAB]
    }).toStrictEqual({
      id: TAB,
      importedFrom: FILE,
      keepsEdit: false,
      isDirty: false,
      isTabDirty: undefined
    })

    const { prepareSave } = await import('../../src/renderer/src/lib/raw-mode')

    await expect(prepareSave(TAB, { ask: false })).resolves.toMatchObject({
      status: 'ready',
      code: TEXT
    })
  }, 60_000)

  it('cancelling the confirmation reads nothing', async () => {
    expect.hasAssertions()

    const api = createFakeApi({ dialog: { message: vi.fn<Message>().mockResolvedValue(0) } })
    const stores = await startApp(api, true)
    fireEvent.click(await screen.findByRole('button', { name: RELOAD }))
    await waitFor(() => {
      expect(api.dialog.message).toHaveBeenCalledTimes(1)
    })
    // Lets the answer's handling finish before checking that it read nothing
    await act(async () => {
      await Promise.resolve()
    })

    expect(api.plugin.readRaw).not.toHaveBeenCalled()
    expect(stores.usePluginStore.getState().plugin.rawSource).toBeUndefined()
  }, 60_000)
})

describe('reloading an imported plugin from the project: failures', () => {
  beforeEach(setUp)

  afterEach(tearDown)

  it('a file that cannot be read is reported and changes nothing', async () => {
    expect.hasAssertions()

    // The shape ipcRenderer.invoke rejects with when the main-process handler throws
    const refusal = new Error("Error invoking remote method 'plugin:read-raw': Error: missing")
    const api = createFakeApi({
      plugin: { readRaw: vi.fn<ReadRaw>().mockRejectedValue(refusal) },
      dialog: { message: vi.fn<Message>().mockResolvedValue(1) }
    })
    const stores = await startApp(api, true)
    fireEvent.click(await screen.findByRole('button', { name: RELOAD }))
    await waitFor(() => {
      expect(stores.useToastStore.getState().toasts).toContainEqual(
        expect.objectContaining({
          type: 'error',
          message: `Could not read ${PATH}: missing`,
          duration: 10_000
        })
      )
    })

    expect(stores.usePluginStore.getState().plugin.rawSource).toBeUndefined()

    // The app's own copy of the logger, imported afresh with it
    const { default: log } = await import('electron-log/renderer')

    expect(log.error).toHaveBeenCalledWith('[reload]', PATH, refusal)
    expect(stores.usePluginStore.getState().baseByPluginId[TAB]).toStrictEqual({
      path: PATH,
      sha256: null
    })
  }, 60_000)

  it('without a project the button is disabled and says why', async () => {
    expect.hasAssertions()

    const api = createFakeApi()
    await startApp(api, false)
    const button = await screen.findByRole('button', { name: RELOAD })

    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('title', 'Open the project first.')
  }, 60_000)
})

describe('reloading a tab with no unsaved edits', () => {
  afterEach(tearDown)

  // The older parser misread these files (a CRLF licence preamble, a Japanese block first), so
  // the tab's values differ from what the file says without anyone having edited them
  it.each(['Fixture_HandWritten_CRLF', 'Fixture_JaFirst'])(
    'takes %s as the file is, without asking, when the tab was read by an older version',
    async (name) => {
      expect.hasAssertions()

      const id = seedOlderTab(name)
      const text = readFileSync(fixturePath('js', 'plugins', `${name}.js`), 'utf8')
      const api = apiReading(text)
      const { stores, rawMode } = await startStores(api)

      expect(stores.usePluginStore.getState().plugin.rawSource).toBeUndefined()

      await expect(rawMode.reloadFromProject(id)).resolves.toBe(true)
      await expect(rawMode.prepareSave(id, { ask: false })).resolves.toMatchObject({
        status: 'ready',
        code: text
      })

      expect(api.dialog.message).not.toHaveBeenCalled()

      const { plugin, dirtyByPluginId } = stores.usePluginStore.getState()

      expect({ plugin, isTabDirty: dirtyByPluginId[id] }).toMatchObject({
        plugin: { id, importedFrom: `${name}.js`, rawSource: text },
        isTabDirty: undefined
      })
    }
  )

  it('takes a file that changed since the tab was opened', async () => {
    expect.hasAssertions()

    const v1 = `/*:\n * @target MZ\n * @plugindesc Fixture v1\n * @param A\n * @default 1\n */\n(() => {\n    const params = PluginManager.parameters('Fixture');\n    window.a = Number(params['A']);\n})();\n`
    const v2 = `/*:\n * @target MZ\n * @plugindesc Fixture v2\n * @param A\n * @default 1\n *\n * @param B\n * @type struct<Opt>\n * @default {}\n */\n(() => {\n    const params = PluginManager.parameters('Fixture');\n    window.a = Number(params['A']);\n    window.b = JSON.parse(params['B']);\n})();\n`
    seed({})
    const api = apiReading(v2)
    const { stores, rawMode } = await startStores(api)
    const opened = { ...PluginParser.parsePlugin(v1, 'Fixture.js'), importedFrom: 'Fixture.js' }
    stores.usePluginStore.getState().openPlugin(opened)

    await expect(rawMode.reloadFromProject(opened.id)).resolves.toBe(true)
    await expect(rawMode.prepareSave(opened.id, { ask: false })).resolves.toMatchObject({
      status: 'ready',
      code: v2
    })

    expect(api.dialog.message).not.toHaveBeenCalled()
  })
})
