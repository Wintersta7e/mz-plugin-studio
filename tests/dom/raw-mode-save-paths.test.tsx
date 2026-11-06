// Saving an imported plugin through every save path of the app: Ctrl+S, Save All and the
// preview's Export button. The app starts over the state v1.6.0 saved, whose second tab was
// imported and comes back without its file text.
import { readFileSync } from 'node:fs'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { createElement } from 'react'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
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
import { previewShown } from './support/preview'
import { envelopeOf, recordOf } from './support/persisted-state'

const payloads = readV160Payloads()
const TAB = '00000000-0000-4000-8000-000000000013'
// v1.6.0 saved this tab, which is not imported, to its file
const SAVED_TAB = '00000000-0000-4000-8000-000000000004'
const FILE = 'Fixture_HandWritten.js'
const PROJECT = '/fixture/mz-project'
const SOURCE_MISSING = `Not saved: the original file ${FILE} is not loaded. Reload it from the project, or turn raw mode off to save regenerated code.`
const RAW_ON = "Raw mode ON: the file's own code and unchanged blocks are kept"
const RAW_OFF = 'Raw mode OFF: the whole plugin is regenerated from the editor'
const REGENERATION_PROMPT = {
  type: 'warning',
  title: 'Save without raw mode?',
  message: `Saving ${FILE} with raw mode off regenerates the whole file: code outside the Code tab will be removed from it.`,
  buttons: ['Cancel', 'Show Diff', 'Save']
}

type Stores = typeof StoresModule

/**
Imports the app afresh over what localStorage holds, opens the project and shows the tab.
*/
async function startApp(
  api: Window['api'],
  projectPath = PROJECT
): Promise<{ stores: Stores; unmount: () => void }> {
  vi.stubGlobal('api', api)
  vi.resetModules()
  const { default: App } = await import('../../src/renderer/src/App')
  const stores = await import('../../src/renderer/src/stores')
  const { unmount } = render(createElement(App))
  const project = { ...(await api.project.load(PROJECT)), path: projectPath }
  act(() => {
    stores.useProjectStore.setState({ project })
    stores.usePluginStore.getState().setActivePlugin(TAB)
    stores.useUIStore.getState().setPreviewCollapsed(false)
  })
  await previewShown()
  return { stores, unmount }
}

function savingApi(answers: number[] = []): Window['api'] {
  return createFakeApi({
    plugin: {
      save: vi
        .fn<Window['api']['plugin']['save']>()
        .mockImplementation(async (_project, filename) => {
          await Promise.resolve()
          return { success: true, path: `${PROJECT}/js/plugins/${filename}`, sha256: '' }
        }),
      saveToPath: vi
        .fn<Window['api']['plugin']['saveToPath']>()
        .mockImplementation(async (savePath) => {
          await Promise.resolve()
          return { success: true, path: savePath, sha256: '' }
        })
    },
    dialog: {
      message: vi.fn<Window['api']['dialog']['message']>().mockImplementation(async () => {
        const answer = answers.shift() ?? 0
        await Promise.resolve()
        return answer
      }),
      saveFile: vi.fn<Window['api']['dialog']['saveFile']>().mockResolvedValue(`/chosen/${FILE}`)
    }
  })
}

const press = (isShiftKey = false): void => {
  const view = document.defaultView
  if (view === null) throw new Error('document has no window')
  fireEvent.keyDown(view, { code: 'KeyS', ctrlKey: true, shiftKey: isShiftKey })
}

const SAVE_ACTIONS: [string, () => void][] = [
  [
    'Ctrl+S',
    () => {
      press()
    }
  ],
  [
    'Save All',
    () => {
      press(true)
    }
  ]
]

function expectedSaveCall(tab: PluginDefinition): unknown[] {
  return [
    PROJECT,
    FILE,
    generatePlugin(tab),
    { base: { path: `${PROJECT}/js/plugins/${FILE}`, sha256: null } }
  ]
}

function baselineDescription(stores: Stores, pluginId: string): string | undefined {
  const baselines = stores.usePluginStore.getState().baselineByPluginId
  return new Map(Object.entries(baselines)).get(pluginId)?.meta.description
}

async function settle(): Promise<void> {
  await act(async () => {
    await Promise.resolve()
  })
}

// Waits for `isDone` without asserting, so what follows checks the state once it has settled.
async function waitUntil(isDone: () => boolean): Promise<void> {
  await waitFor(() => {
    if (!isDone()) throw new Error('still waiting')
  })
}

const savedFiles = (api: Window['api']): string[] =>
  vi.mocked(api.plugin.save).mock.calls.map((call) => call[1])

const toastsOf = (stores: Stores): string[] =>
  stores.useToastStore.getState().toasts.map((t) => `${t.type}: ${t.message}`)

function first<T>(values: readonly T[]): T {
  const value = values.at(0)
  if (value === undefined) throw new Error('expected an item')
  return value
}

function setUp(): void {
  seed(payloads)
  // The build defines this; the status bar shows it.
  vi.stubGlobal('__APP_VERSION__', '0.0.0-test')
}

describe('saving an imported plugin: unavailable source', () => {
  beforeEach(setUp)

  afterEach(vi.unstubAllGlobals)

  it('no save path writes a tab in raw mode whose file text is not loaded', async () => {
    expect.hasAssertions()

    const api = savingApi()
    const { stores } = await startApp(api)
    let checked = 0

    // The app's own copy of the logger, imported afresh with it
    const { default: log } = await import('electron-log/renderer')
    const durations = (): number[] =>
      stores.useToastStore.getState().toasts.map((toast) => toast.duration)

    press()
    await waitFor(() => {
      expect({
        sourceMissing: toastsOf(stores).includes(`error: ${SOURCE_MISSING}`),
        saved: savedFiles(api),
        longNotice: (durations().at(0) ?? 0) >= 10_000
      }).toStrictEqual({ sourceMissing: true, saved: [], longNotice: true })
    })

    expect(log.warn).toHaveBeenCalledWith('[save] refused', FILE, 'source-missing')

    checked++

    act(() => {
      stores.useToastStore.setState({ toasts: [] })
    })
    press(true)
    await waitFor(() => {
      expect({
        toasts: toastsOf(stores),
        longNotice: (durations().at(0) ?? 0) >= 10_000,
        saved: savedFiles(api)
      }).toStrictEqual({
        toasts: [
          'warning: Saved 1. Not saved, file text not loaded (reload it from the project): Fixture_HandWritten.'
        ],
        longNotice: true,
        saved: ['NewPlugin.js']
      })
    })

    expect(log.warn).toHaveBeenCalledTimes(2)

    checked++

    act(() => {
      stores.useToastStore.setState({ toasts: [] })
    })
    fireEvent.click(await screen.findByRole('button', { name: 'Export' }))
    checked++
    await waitFor(() => {
      expect({
        toasts: toastsOf(stores),
        saved: savedFiles(api),
        saveDialogCalls: vi.mocked(api.dialog.saveFile).mock.calls.length,
        exportCalls: vi.mocked(api.plugin.saveToPath).mock.calls.length,
        checked
      }).toStrictEqual({
        toasts: [`error: ${SOURCE_MISSING}`],
        saved: ['NewPlugin.js'],
        saveDialogCalls: 0,
        exportCalls: 0,
        checked: 3
      })
    })

    process.stdout.write(`save paths checked ${String(checked)}\n`)
  }, 60_000)
})

describe('saving an imported plugin: regeneration confirmation', () => {
  beforeEach(setUp)

  afterEach(vi.unstubAllGlobals)

  it('turning raw mode off asks before the first save that regenerates the file', async () => {
    expect.hasAssertions()

    const answers = [0, 2]
    const api = savingApi(answers)
    const started = await startApp(api)
    let stores = started.stores
    const { unmount } = started
    const tab = (): PluginDefinition => stores.usePluginStore.getState().plugin
    const asked = (): number => vi.mocked(api.dialog.message).mock.calls.length

    fireEvent.click(await screen.findByTitle(RAW_ON))
    await screen.findByTitle(RAW_OFF)

    press()
    // Cancel is answered; once that has settled, nothing was saved
    await waitUntil(() => asked() === 1 && answers.length === 1)
    await settle()

    expect({
      asked: asked(),
      prompt: vi.mocked(api.dialog.message).mock.calls.at(0)?.at(0),
      answers,
      saved: savedFiles(api)
    }).toStrictEqual({
      asked: 1,
      prompt: REGENERATION_PROMPT,
      answers: [2],
      saved: []
    })

    press()
    await waitFor(() => {
      // v1.6.0 saved this tab to its file, so the save checks against that file
      expect({
        saved: savedFiles(api),
        call: vi.mocked(api.plugin.save).mock.calls.at(0),
        asked: asked(),
        success: toastsOf(stores).includes('success: Plugin saved')
      }).toStrictEqual({
        saved: [FILE],
        call: expectedSaveCall(tab()),
        asked: 2,
        success: true
      })
    })
    press()
    await waitFor(() => {
      expect({ saved: savedFiles(api), asked: asked() }).toStrictEqual({
        saved: [FILE, FILE],
        asked: 2
      })
    })

    fireEvent.click(screen.getByTitle(RAW_OFF))
    fireEvent.click(await screen.findByTitle(RAW_ON))
    await screen.findByTitle(RAW_OFF)
    press()
    await waitFor(() => {
      expect({ asked: asked(), saved: savedFiles(api) }).toStrictEqual({
        asked: 3,
        saved: [FILE, FILE]
      })
    })
    await settle()

    // A restart keeps raw mode off but asks again.
    unmount()
    answers.push(1)
    ;({ stores } = await startApp(api))
    await screen.findByTitle(RAW_OFF)
    press()
    const diff = await screen.findByTestId('monaco-diff-modified')

    expect({
      asked: asked(),
      diffValue: diff instanceof HTMLTextAreaElement ? diff.value : undefined,
      diffRequest: stores.useUIStore.getState().diffRequestPluginId,
      saved: savedFiles(api)
    }).toStrictEqual({
      asked: 4,
      diffValue: generatePlugin(tab()),
      diffRequest: null,
      saved: [FILE, FILE]
    })
  }, 90_000)
})

describe('saving an imported plugin: project saves and export', () => {
  beforeEach(setUp)

  afterEach(vi.unstubAllGlobals)

  it('every save into the project makes what it wrote the file text and baseline of the tab; Export writes a copy', async () => {
    expect.hasAssertions()

    const api = savingApi()
    const { stores } = await startApp(api)
    const text = readFileSync(fixturePath('js', 'plugins', FILE), 'utf8')
    const prefix = text.slice(0, text.indexOf('/*:'))
    const opened = { ...PluginParser.parsePlugin(text, FILE), importedFrom: FILE }
    const leaving = screen.getByTestId('code-preview')
    act(() => {
      stores.usePluginStore.getState().openPlugin(opened)
    })
    const state = () => stores.usePluginStore.getState()
    const writes = (): string[] => [
      ...vi.mocked(api.plugin.save).mock.calls.map((call) => call[2]),
      ...vi.mocked(api.plugin.saveToPath).mock.calls.map((call) => call[1])
    ]
    let checked = 0
    for (const [savePath, run] of SAVE_ACTIONS) {
      const description = `Saved by ${savePath}`
      act(() => {
        state().updateMeta({ description })
      })
      run()
      await waitFor(() => {
        const written = writes().find((code) => code.includes(description))
        const raw: unknown = state().plugin.rawSource

        expect({
          rawContains: typeof raw === 'string' && raw.includes(description),
          raw,
          baseline: baselineDescription(stores, opened.id),
          prefixKept: written?.startsWith(prefix)
        }).toStrictEqual({
          rawContains: true,
          raw: written,
          baseline: description,
          prefixKept: true
        })
      })

      checked++
    }
    const before = state().plugin.rawSource
    act(() => {
      state().updateMeta({ description: 'Saved by Export' })
    })
    // Opening the plugin keyed a new view: the old one fades out first, and its Export button
    // does nothing, so wait until it has left and the new view shows its preview
    await waitFor(
      () => {
        expect(leaving.isConnected).toBe(false)
      },
      { timeout: 10_000 }
    )
    await previewShown()
    fireEvent.click(screen.getByRole('button', { name: 'Export' }))
    await waitFor(() => {
      expect(writes().some((code) => code.includes('Saved by Export'))).toBe(true)
    })
    await settle()

    checked++
    process.stdout.write(`save paths checked ${String(checked)}\n`)

    expect({
      raw: state().plugin.rawSource,
      baseline: baselineDescription(stores, opened.id),
      dirty: state().dirtyByPluginId[opened.id],
      checked
    }).toStrictEqual({ raw: before, baseline: 'Saved by Save All', dirty: true, checked: 3 })
  }, 90_000)
})

describe('saving an imported plugin: legacy save record', () => {
  beforeEach(setUp)

  afterEach(vi.unstubAllGlobals)

  it('save All names a tab last saved by v1.6.0 as unconfirmed, not changed on disk', async () => {
    expect.hasAssertions()

    const project = await mkdtemp(path.join(tmpdir(), 'save-all-upgrade-'))
    try {
      const file = path.join(project, 'js', 'plugins', 'Synthetic_Tool.js')
      await mkdir(path.dirname(file), { recursive: true })
      await writeFile(file, '// saved by v1.6.0\n')
      const persisted = envelopeOf(payloads['mz-plugin-studio-plugin'], 'plugin store')
      const state = recordOf(Reflect.get(persisted, 'state'), 'plugin state')
      recordOf(Reflect.get(state, 'savedPathsByPluginId'), 'saved paths')[SAVED_TAB] = file
      recordOf(Reflect.get(state, 'dirtyByPluginId'), 'dirty flags')[SAVED_TAB] = true
      seed({ ...payloads, 'mz-plugin-studio-plugin': JSON.stringify(persisted) })
      const api = createMainApi()
      const { stores } = await startApp(api, project)

      expect(stores.usePluginStore.getState().baseByPluginId[SAVED_TAB]).toStrictEqual({
        path: file,
        sha256: null
      })

      press(true)
      await waitFor(() => {
        expect(toastsOf(stores)).toHaveLength(1)
      })
      const report = first(toastsOf(stores))

      expect({
        changedOnDisk: report.includes('changed on disk'),
        unconfirmed: report.includes(
          'Not saved, cannot confirm the file is unchanged (save it with Ctrl+S to confirm): Synthetic_Tool.'
        )
      }).toStrictEqual({ changedOnDisk: false, unconfirmed: true })
      await expect(readFile(file, 'utf8')).resolves.toBe('// saved by v1.6.0\n')
      expect(api.dialog.message).not.toHaveBeenCalled()
    } finally {
      await rm(project, { recursive: true, force: true })
    }
  }, 60_000)
})

describe('saving an imported plugin: missing save record', () => {
  beforeEach(setUp)

  afterEach(vi.unstubAllGlobals)

  it('save All names an imported tab with no record of its file as unconfirmed, not a different file', async () => {
    expect.hasAssertions()

    const project = await mkdtemp(path.join(tmpdir(), 'save-all-no-base-'))
    try {
      const text = readFileSync(fixturePath('js', 'plugins', FILE), 'utf8')
      const file = path.join(project, 'js', 'plugins', FILE)
      await mkdir(path.dirname(file), { recursive: true })
      await writeFile(file, text)
      const api = createMainApi()
      const { stores } = await startApp(api, project)
      const opened = { ...PluginParser.parsePlugin(text, FILE), importedFrom: FILE }
      act(() => {
        stores.usePluginStore.getState().closePlugin(TAB)
        stores.usePluginStore.getState().openPlugin(opened)
        stores.usePluginStore.getState().updateMeta({ description: 'Edited' })
      })

      expect(stores.usePluginStore.getState().baseByPluginId[opened.id]).toBeUndefined()

      press(true)
      await waitFor(() => {
        expect(toastsOf(stores)).toHaveLength(1)
      })
      const report = first(toastsOf(stores))

      expect({
        differentFile: report.includes('a different file'),
        unconfirmed: report.includes(
          'Not saved, cannot confirm the file is unchanged (save it with Ctrl+S to confirm): Fixture_HandWritten.'
        )
      }).toStrictEqual({ differentFile: false, unconfirmed: true })
      await expect(readFile(file, 'utf8')).resolves.toBe(text)
      expect(api.dialog.message).not.toHaveBeenCalled()
    } finally {
      await rm(project, { recursive: true, force: true })
    }
  }, 60_000)
})
