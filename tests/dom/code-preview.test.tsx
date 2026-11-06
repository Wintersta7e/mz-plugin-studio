// Export from the code preview, and the banner above the code. Behind `window.api` sit the
// main-process save dialog and save functions, writing to a fresh temporary folder.
import { access, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { SaveDialogOptions, SaveDialogReturnValue } from 'electron'
import { authorize } from '../../src/main/file-access'
import { showSaveFileDialog } from '../../src/main/ipc/dialog'
import { readFileByPath, savePluginFile, savePluginToPath } from '../../src/main/ipc/plugin'
import { CodePreview } from '../../src/renderer/src/components/preview/CodePreview'
import { ToastContainer } from '../../src/renderer/src/components/ui/toast'
import { generateTypeDeclaration } from '../../src/renderer/src/lib/exportFormats'
import { generatePlugin } from '../../src/renderer/src/lib/generator'
import { savePlugin } from '../../src/renderer/src/lib/save-plugin'
import {
  usePluginStore,
  useProjectStore,
  useToastStore,
  useUIStore
} from '../../src/renderer/src/stores'
import {
  createEmptyCommand,
  createEmptyParameter,
  createEmptyPlugin,
  type PluginMeta
} from '../../src/renderer/src/types/plugin'
import { ACCESS_DENIED, IPC_CHANNELS } from '../../src/shared/ipc-types'
import { loadFixture } from '../golden/corpus/raw-mode'
import { createFakeApi } from '../helpers/fake-api'
import { viaIpc } from './support/main-api'
import { resetStores } from './support/reset-stores'

type Api = Window['api']
type ReadFile = (file: string) => Promise<string>

// The fresh temporary folder of the running test
const temporary = { root: '' }

const fileIn = (...parts: string[]): string => path.join(temporary.root, ...parts)

async function setUp(): Promise<void> {
  resetStores()
  temporary.root = await mkdtemp(path.join(tmpdir(), 'code-preview-'))
  const plugin = createEmptyPlugin()
  usePluginStore.getState().openPlugin({ ...plugin, meta: { ...plugin.meta, name: 'Alpha' } })
}

async function tearDown(): Promise<void> {
  vi.unstubAllGlobals()
  await rm(temporary.root, { recursive: true, force: true })
}

/**
Wires `window.api` to the main-process save functions, rejecting as `ipcRenderer.invoke` does;
`saveFile` answers `chosen`, an export waits for `gate` when given.
*/
function wireMainSave(
  chosen: string,
  { throughDialog = true, gate }: { throughDialog?: boolean; gate?: Promise<unknown> } = {}
): void {
  const dialog = {
    showSaveDialog: vi
      .fn<(options: SaveDialogOptions) => Promise<SaveDialogReturnValue>>()
      .mockResolvedValue({ canceled: false, filePath: chosen })
  }
  const save = viaIpc(IPC_CHANNELS.PLUGIN_SAVE, savePluginFile)
  const saveToPath = viaIpc(
    IPC_CHANNELS.PLUGIN_SAVE_TO_PATH,
    async (...args: Parameters<typeof savePluginToPath>) => {
      await gate
      return savePluginToPath(...args)
    }
  )
  vi.stubGlobal(
    'api',
    createFakeApi({
      dialog: {
        saveFile: throughDialog
          ? vi.fn<Api['dialog']['saveFile']>(async (options) =>
              showSaveFileDialog(dialog, options ?? {})
            )
          : vi.fn<Api['dialog']['saveFile']>().mockResolvedValue(chosen)
      },
      plugin: {
        save: vi.fn<typeof savePluginFile>(save),
        saveToPath: vi.fn<typeof savePluginToPath>(saveToPath)
      }
    })
  )
}

const clickExport = (): void => {
  fireEvent.click(screen.getByRole('button', { name: 'Export' }))
}

const clickExportDts = (): void => {
  fireEvent.click(screen.getByTitle('Export in other formats'))
  fireEvent.click(screen.getByText('Export .d.ts'))
}

const editMeta = (meta: Partial<PluginMeta>): void => {
  act(() => {
    usePluginStore.getState().updateMeta(meta)
  })
}

const errorToasts = (): string[] =>
  useToastStore
    .getState()
    .toasts.filter((t) => t.type === 'error')
    .map((t) => t.message)

const successToasts = (): string[] =>
  useToastStore
    .getState()
    .toasts.filter((t) => t.type === 'success')
    .map((t) => t.message)

// Waits until `file` holds `text`
const fileHolds = async (file: string, text: string): Promise<void> =>
  waitFor(async () => {
    await expect(readFile(file, 'utf8')).resolves.toBe(text)
  })

// Waits until one export or save has said it succeeded
const successShown = async (): Promise<void> =>
  waitFor(() => {
    expect(successToasts()).toHaveLength(1)
  })

// Waits until the error toasts are exactly `messages`
const errorsShown = async (...messages: string[]): Promise<void> =>
  waitFor(() => {
    expect(errorToasts()).toStrictEqual(messages)
  })

const notWritten = async (file: string): Promise<void> => {
  await expect(access(file)).rejects.toMatchObject({ code: 'ENOENT' })
}

// Lets the answer of a message dialog reach the code that asked
const settle = async (): Promise<void> => {
  await act(async () => {
    await Promise.resolve()
  })
}

describe('code preview export with no project: written files', () => {
  beforeEach(setUp)

  afterEach(tearDown)

  it('writes the generated plugin to the path chosen in the save dialog', async () => {
    expect.hasAssertions()

    const target = fileIn('Alpha.js')
    wireMainSave(target)
    render(<CodePreview />)
    clickExport()
    await fileHolds(target, generatePlugin(usePluginStore.getState().plugin))
  })

  it('writes the type declarations from the other formats menu', async () => {
    expect.hasAssertions()

    const target = fileIn('Alpha.d.ts')
    wireMainSave(target)
    render(<CodePreview />)
    clickExportDts()
    await fileHolds(target, generateTypeDeclaration(usePluginStore.getState().plugin))
  })

  it('says what the type declarations declare otherwise than the plugin names it', async () => {
    expect.hasAssertions()

    const target = fileIn('My-Plugin.d.ts')
    wireMainSave(target)
    editMeta({ name: 'My-Plugin' })
    render(<CodePreview />)
    clickExportDts()
    await waitFor(() => {
      expect(useToastStore.getState().toasts).toHaveLength(1)
    })

    expect(useToastStore.getState().toasts.at(0)).toMatchObject({
      type: 'warning',
      message:
        'Exported, with 1 change to fit TypeScript: plugin name "My-Plugin" is declared as My_Plugin'
    })
  })

  it('writes the plugin again on a second export to the same path', async () => {
    expect.hasAssertions()

    const target = fileIn('Alpha.js')
    wireMainSave(target)
    render(<CodePreview />)
    clickExport()
    await fileHolds(target, generatePlugin(usePluginStore.getState().plugin))
    editMeta({ description: 'Exported again' })
    const expected = generatePlugin(usePluginStore.getState().plugin)
    clickExport()
    await fileHolds(target, expected)

    expect(errorToasts()).toStrictEqual([])
    expect(globalThis.api.dialog.message).not.toHaveBeenCalled()
  })

  it('an edit made while Export is in flight stays unsaved', async () => {
    expect.hasAssertions()

    const target = fileIn('Alpha.js')
    const gate = Promise.withResolvers<null>()
    wireMainSave(target, { gate: gate.promise })
    const { id } = usePluginStore.getState().plugin
    render(<CodePreview />)
    clickExport()
    await waitFor(() => {
      expect(globalThis.api.plugin.saveToPath).toHaveBeenCalledTimes(1)
    })
    editMeta({ description: 'edited during save' })
    await act(async () => {
      gate.resolve(null)
      await gate.promise
    })
    await waitFor(() => {
      expect(successToasts()).toStrictEqual([`Exported to ${target}`])
    })

    const state = usePluginStore.getState()

    expect(state.plugin.meta.description).toBe('edited during save')
    expect(state.dirtyByPluginId[id]).toBe(true)
    expect(state.savedPathsByPluginId[id]).toBe(target)
  })
})

describe('code preview export with no project: overwrites and refusals', () => {
  beforeEach(setUp)

  afterEach(tearDown)

  it('asks before exporting over its own file changed on disk; Cancel leaves the file', async () => {
    expect.hasAssertions()

    const target = fileIn('Alpha.js')
    wireMainSave(target)
    render(<CodePreview />)
    clickExport()
    await successShown()
    await writeFile(target, '// changed elsewhere\n')
    clickExport()
    await waitFor(() => {
      expect(globalThis.api.dialog.message).toHaveBeenCalledTimes(1)
    })

    expect(vi.mocked(globalThis.api.dialog.message).mock.calls).toStrictEqual([
      [
        {
          type: 'warning',
          title: 'Overwrite file?',
          message: `"${target}" has changed on disk since this tab last read or saved it. Overwrite it?`,
          buttons: ['Cancel', 'Overwrite']
        }
      ]
    ])

    await settle()

    await expect(readFile(target, 'utf8')).resolves.toBe('// changed elsewhere\n')
    expect(successToasts()).toHaveLength(1)
  })

  it('shows an error and writes nothing when the chosen file type cannot be saved', async () => {
    expect.hasAssertions()

    const target = fileIn('Alpha.exe')
    wireMainSave(target)
    render(<CodePreview />)
    clickExport()
    await waitFor(() => {
      expect(errorToasts()).toHaveLength(1)
    })

    expect(errorToasts().at(0)).toMatch(/^Export failed: /u)

    await notWritten(target)
  })

  it.each([
    ['Export', 'Alpha.js', clickExport],
    ['Export .d.ts', 'Alpha.d.ts', clickExportDts]
  ])(
    '%s shows an error and writes nothing for a path no save dialog returned',
    async (_label, name, click) => {
      expect.hasAssertions()

      const target = fileIn(name)
      wireMainSave(target, { throughDialog: false })
      render(<CodePreview />)
      click()
      await errorsShown(`Export failed: ${ACCESS_DENIED}${target} was not chosen in a save dialog`)
      await notWritten(target)
    }
  )
})

describe('code preview export under another file name', () => {
  const RENAMED = {
    type: 'warning',
    title: 'File name differs from plugin name',
    message:
      '"Renamed.js" is not named after the plugin "Alpha". RPG Maker MZ finds a plugin\'s commands by its exact file name and its parameters by its file name in any letter case, so its commands would not work in a game. Save anyway?',
    buttons: ['Cancel', 'Choose another file', 'Save anyway']
  }

  beforeEach(async () => {
    await setUp()
    act(() => {
      usePluginStore.getState().addCommand(createEmptyCommand())
    })
  })

  afterEach(tearDown)

  it('asks first; Cancel writes nothing', async () => {
    expect.hasAssertions()

    const target = fileIn('Renamed.js')
    wireMainSave(target)
    render(<CodePreview />)
    clickExport()
    await waitFor(() => {
      expect(globalThis.api.dialog.message).toHaveBeenCalledWith(RENAMED)
    })
    await settle()

    expect(globalThis.api.plugin.saveToPath).not.toHaveBeenCalled()

    await notWritten(target)

    expect(successToasts()).toStrictEqual([])
  })

  it('asks first; Save anyway writes the file once', async () => {
    expect.hasAssertions()

    const target = fileIn('Renamed.js')
    wireMainSave(target)
    vi.mocked(globalThis.api.dialog.message).mockResolvedValueOnce(2)
    render(<CodePreview />)
    clickExport()
    await successShown()

    expect(vi.mocked(globalThis.api.dialog.message).mock.calls).toStrictEqual([[RENAMED]])
    expect(globalThis.api.plugin.saveToPath).toHaveBeenCalledTimes(1)
    await expect(readFile(target, 'utf8')).resolves.toBe(
      generatePlugin(usePluginStore.getState().plugin)
    )
  })

  it('does not ask for a file named after the plugin', async () => {
    expect.hasAssertions()

    const target = fileIn('Alpha.js')
    wireMainSave(target)
    render(<CodePreview />)
    clickExport()
    await successShown()

    expect(globalThis.api.dialog.message).not.toHaveBeenCalled()
  })
})

const PROJECT = '/fixture/mz-project'

async function openProject(project = PROJECT): Promise<void> {
  const loaded = { ...(await globalThis.api.project.load(PROJECT)), path: project }
  act(() => {
    useProjectStore.getState().setProject(loaded)
  })
}

// The active tab's state for `id`: unsaved, the file it was last read from, where it saves
const tabState = (id: string): unknown[] => {
  const state = usePluginStore.getState()
  return [state.dirtyByPluginId[id], state.baseByPluginId[id], state.savedPathsByPluginId[id]]
}

// Saves tab `id` again: no dialog asks, `file` holds `expected` and the tab is saved
async function saveAsksNothing(id: string, file: string, expected: string): Promise<void> {
  await act(async () => savePlugin(id, 'save'))

  expect(globalThis.api.dialog.message).not.toHaveBeenCalled()

  const written = await readFile(file, 'utf8')

  expect([written, tabState(id).at(0)]).toStrictEqual([expected, undefined])
}

describe('code preview export', () => {
  beforeEach(setUp)

  afterEach(tearDown)

  it('export writes a copy and leaves the tab unsaved and saving into the project', async () => {
    expect.hasAssertions()

    const projectFile = fileIn('project', 'js', 'plugins', 'Alpha.js')
    const exported = fileIn('out', 'Alpha.js')
    wireMainSave(exported)
    await openProject(fileIn('project'))
    const { id } = usePluginStore.getState().plugin
    await act(async () => savePlugin(id, 'save'))
    const saved = await readFile(projectFile, 'utf8')
    editMeta({ description: 'edited' })
    const expected = generatePlugin(usePluginStore.getState().plugin)
    render(<CodePreview />)

    clickExport()
    await waitFor(() => {
      expect(successToasts()).toContain(`Exported to ${exported}`)
    })

    await expect(
      Promise.all([readFile(exported, 'utf8'), readFile(projectFile, 'utf8')])
    ).resolves.toStrictEqual([expected, saved])
    expect(tabState(id)).toMatchObject([true, { path: projectFile }, projectFile])

    await saveAsksNothing(id, projectFile, expected)
  })

  it("export to the tab's own project file saves the tab, so the next save asks nothing", async () => {
    expect.hasAssertions()

    const projectFile = fileIn('project', 'js', 'plugins', 'Alpha.js')
    wireMainSave(projectFile)
    await openProject(fileIn('project'))
    const { id } = usePluginStore.getState().plugin
    await act(async () => savePlugin(id, 'save'))
    editMeta({ description: 'edited' })
    const exported = generatePlugin(usePluginStore.getState().plugin)
    render(<CodePreview />)

    clickExport()
    await waitFor(() => {
      expect(successToasts()).toStrictEqual(['Plugin saved', 'Plugin saved'])
    })

    await expect(readFile(projectFile, 'utf8')).resolves.toBe(exported)
    expect(tabState(id).slice(0, 2)).toMatchObject([undefined, { path: projectFile }])

    editMeta({ description: 'edited again' })
    const expected = generatePlugin(usePluginStore.getState().plugin)
    await saveAsksNothing(id, projectFile, expected)
  })

  it('export asks for a path also with a project open, and writes there', async () => {
    expect.hasAssertions()

    const chosen = fileIn('Chosen.js')
    wireMainSave(chosen)
    const { plugin, dialog } = globalThis.api
    await openProject()
    const expected = generatePlugin(usePluginStore.getState().plugin)
    render(<CodePreview />)

    clickExport()
    await successShown()

    await expect(readFile(chosen, 'utf8')).resolves.toBe(expected)
    expect(vi.mocked(dialog.saveFile).mock.calls).toStrictEqual([
      [{ defaultPath: 'Alpha.js', filters: [{ name: 'JavaScript Files', extensions: ['js'] }] }]
    ])
    expect(Math.min(...vi.mocked(dialog.saveFile).mock.invocationCallOrder)).toBeLessThan(
      Math.min(...vi.mocked(plugin.saveToPath).mock.invocationCallOrder)
    )
    expect(plugin.save).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Diff' })).toBeDisabled()
  })
})

const SAVED = '/saved/Alpha.js'
const CHOSEN = '/chosen/Alpha.js'
const NOTICE = "The saved file can't be opened automatically. Choose it to compare."
const LAST_COPY = 'Left: the copy this app last read or wrote'

// Main's own refusal of a file it may not read without a dialog
const denied = (file: string): never => {
  authorize('granted-read', file)
  throw new Error(`${file} should have been refused`)
}

// The saved file is out of read-by-path's reach; `chosen` answers the Choose file dialog
function wireDeniedSave(
  chosen: string | null,
  readChosen: ReadFile = vi.fn<ReadFile>().mockResolvedValue('// chosen')
): void {
  const readByPath = viaIpc(IPC_CHANNELS.PLUGIN_READ_BY_PATH, async (file: string) =>
    file === SAVED ? denied(file) : readChosen(file)
  )
  vi.stubGlobal(
    'api',
    createFakeApi({
      plugin: { readByPath: vi.fn<ReadFile>(readByPath) },
      dialog: { openFile: vi.fn<Api['dialog']['openFile']>().mockResolvedValue(chosen) }
    })
  )
  usePluginStore.setState({ savedPath: SAVED })
}

const clickDiff = (): void => {
  fireEvent.click(screen.getByRole('button', { name: 'Diff' }))
}

describe('code preview diff: reading the saved file', () => {
  beforeEach(setUp)

  afterEach(tearDown)

  it('says why the saved file cannot be compared when it is not UTF-8', async () => {
    expect.hasAssertions()

    const saved = fileIn('Alpha.js')
    // Shift_JIS text, which is not valid UTF-8
    await writeFile(saved, Buffer.from([0x2f, 0x2f, 0x83, 0x65, 0x83, 0x58]))
    const readByPath = viaIpc(IPC_CHANNELS.PLUGIN_READ_BY_PATH, readFileByPath)
    vi.stubGlobal('api', createFakeApi({ plugin: { readByPath: vi.fn<ReadFile>(readByPath) } }))
    usePluginStore.setState({ savedPath: saved })
    render(<CodePreview />)
    clickDiff()
    await errorsShown(
      "Could not compare with the saved file: Alpha.js is not UTF-8. The app reads only UTF-8 files, so it can save a plugin's text back unchanged; convert it to UTF-8 and try again"
    )
  })

  it('compares with the copy last read or written when the saved file is out of reach', async () => {
    expect.hasAssertions()

    wireDeniedSave(null)
    usePluginStore.setState((s) => ({ plugin: { ...s.plugin, rawSource: '// raw' } }))
    render(<CodePreview />)
    clickDiff()
    const lastCopy = await screen.findByText(LAST_COPY)

    expect(lastCopy).toBeInTheDocument()
    expect(screen.getByTestId('monaco-diff-original')).toHaveValue('// raw')
    expect(errorToasts()).toStrictEqual([])
  })

  it('asks for the saved file when it is out of reach and no copy was kept', async () => {
    expect.hasAssertions()

    wireDeniedSave(CHOSEN)
    render(<CodePreview />)
    clickDiff()
    const notice = await screen.findByText(NOTICE)

    expect(notice).toBeInTheDocument()
    expect(screen.queryByTestId('monaco-diff-original')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Choose file' }))
    await waitFor(() => {
      expect(screen.getByTestId('monaco-diff-original')).toHaveValue('// chosen')
    })

    expect([
      vi.mocked(globalThis.api.dialog.openFile).mock.calls,
      vi.mocked(globalThis.api.plugin.readByPath).mock.lastCall
    ]).toStrictEqual([[[{ filters: [{ name: 'JavaScript', extensions: ['js'] }] }]], [CHOSEN]])
    expect([
      screen.queryByText(NOTICE),
      screen.queryByText(LAST_COPY),
      errorToasts()
    ]).toStrictEqual([null, null, []])
  })

  it('keeps the notice when Choose file is cancelled', async () => {
    expect.hasAssertions()

    wireDeniedSave(null)
    render(<CodePreview />)
    clickDiff()
    fireEvent.click(await screen.findByRole('button', { name: 'Choose file' }))
    await waitFor(() => {
      expect(globalThis.api.dialog.openFile).toHaveBeenCalledTimes(1)
    })

    expect(screen.getByText(NOTICE)).toBeInTheDocument()
    expect(globalThis.api.plugin.readByPath).toHaveBeenCalledTimes(1)
    expect(errorToasts()).toStrictEqual([])
  })

  it('keeps the notice and says why when the chosen file cannot be read', async () => {
    expect.hasAssertions()

    wireDeniedSave(CHOSEN, vi.fn<ReadFile>().mockRejectedValue(new Error('Alpha.js is not UTF-8')))
    render(<CodePreview />)
    clickDiff()
    fireEvent.click(await screen.findByRole('button', { name: 'Choose file' }))
    await errorsShown("Couldn't open the chosen file: Alpha.js is not UTF-8")

    expect(screen.getByText(NOTICE)).toBeInTheDocument()
    expect(screen.queryByTestId('monaco-diff-original')).not.toBeInTheDocument()
  })
})

// Makes another plugin, Beta, the active tab
function switchToBeta(): void {
  const beta = createEmptyPlugin()
  act(() => {
    usePluginStore.getState().openPlugin({ ...beta, meta: { ...beta.meta, name: 'Beta' } })
  })
}

describe('code preview diff: switching tabs', () => {
  beforeEach(setUp)

  afterEach(tearDown)

  it("does not show one plugin's kept copy against another plugin's tab", async () => {
    expect.hasAssertions()

    wireDeniedSave(null)
    usePluginStore.setState((s) => ({ plugin: { ...s.plugin, rawSource: '// Alpha copy' } }))
    render(<CodePreview />)
    clickDiff()
    const lastCopy = await screen.findByText(LAST_COPY)

    expect(lastCopy).toBeInTheDocument()

    switchToBeta()

    expect(screen.queryByText(LAST_COPY)).not.toBeInTheDocument()
    expect(screen.queryByTestId('monaco-diff-original')).not.toBeInTheDocument()
  })

  it("does not show one plugin's Choose file panel on another plugin's tab", async () => {
    expect.hasAssertions()

    wireDeniedSave(CHOSEN)
    render(<CodePreview />)
    clickDiff()
    const notice = await screen.findByText(NOTICE)

    expect(notice).toBeInTheDocument()

    switchToBeta()

    expect(screen.queryByText(NOTICE)).not.toBeInTheDocument()
  })

  it('does not show a saved file read for one plugin after another plugin became active', async () => {
    expect.hasAssertions()

    const read = Promise.withResolvers<string>()
    vi.stubGlobal(
      'api',
      createFakeApi({
        plugin: { readByPath: vi.fn<ReadFile>().mockReturnValue(read.promise) }
      })
    )
    usePluginStore.setState({ savedPath: SAVED })
    render(<CodePreview />)
    clickDiff()
    await waitFor(() => {
      expect(globalThis.api.plugin.readByPath).toHaveBeenCalledWith(SAVED)
    })
    switchToBeta()
    await act(async () => {
      read.resolve('// Alpha on disk')
      await read.promise
    })

    expect(screen.queryByTestId('monaco-diff-original')).not.toBeInTheDocument()
  })
})

const FILE = 'Fixture_HandWritten.js'
const RELOAD = 'Reload from project'

const missingText = `This plugin's file text (${FILE}) is not loaded — plugins opened in an older version of the app did not keep it. Open its project and click Reload from project to restore it. Until then, raw mode cannot save it.`

// Opens `file` as an imported tab, without its file text unless `withSource`
function openImported(file: string, { withSource }: { withSource: boolean }): void {
  const plugin = { ...loadFixture(file), importedFrom: file }
  if (!withSource) delete plugin.rawSource
  usePluginStore.getState().openPlugin(plugin)
}

// The banner holding `text`: the status or alert row the text is shown in
const bannerOf = async (text: string): Promise<HTMLElement> => {
  const message = await screen.findByText(text)
  const banner = [...screen.queryAllByRole('status'), ...screen.queryAllByRole('alert')].find(
    (row) => row.contains(message)
  )
  if (banner === undefined) throw new Error(`no banner holds ${text}`)
  return banner
}

// A disabled button ignores the pointer, so its hover hint sits on an ancestor that does not:
// the elements titled `hint`, outermost first
const titled = (hint: string): HTMLElement[] => screen.getAllByTitle(hint)

// Opens FILE without its file text and no project; returns the banner's reload button
async function reloadWithoutProject(): Promise<HTMLElement> {
  openImported(FILE, { withSource: false })
  render(<CodePreview />)
  await bannerOf(missingText)
  return screen.getByRole('button', { name: RELOAD })
}

describe('code preview banner', () => {
  beforeEach(setUp)

  afterEach(tearDown)

  it('names the remedy as a warning when the file text is not loaded', async () => {
    expect.hasAssertions()

    vi.stubGlobal('api', createFakeApi())
    useProjectStore.setState({ project: await globalThis.api.project.load('/fixture/mz-project') })
    openImported(FILE, { withSource: false })
    render(<CodePreview />)
    const banner = await bannerOf(missingText)

    expect(banner).toHaveAttribute('role', 'status')
    expect(banner).toHaveClass('bg-yellow-500/10', 'text-warning-text')
    expect(banner).not.toHaveClass('text-destructive-text')

    const button = screen.getByRole('button', { name: RELOAD })

    expect(button).toBeEnabled()
    expect(button).not.toHaveAttribute('title')
  })

  it('without a project the reload button is disabled and says why', async () => {
    expect.hasAssertions()

    vi.stubGlobal('api', createFakeApi())
    const button = await reloadWithoutProject()

    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('title', 'Open the project first.')
  })

  it('without a project the reload hint shows on hover over the disabled button and describes it', async () => {
    expect.hasAssertions()

    vi.stubGlobal('api', createFakeApi())
    const button = await reloadWithoutProject()

    expect(button).toBeDisabled()
    expect(button).toHaveAccessibleDescription('Open the project first.')

    const [hinted, ...inner] = titled('Open the project first.')

    expect(inner).toStrictEqual([button])
    expect(hinted).toContainElement(button)
    expect(hinted).toBeEnabled()
  })

  it('offers the reload when the file text is loaded but the file as last read is not', async () => {
    expect.hasAssertions()

    vi.stubGlobal('api', createFakeApi())
    useProjectStore.setState({ project: await globalThis.api.project.load('/fixture/mz-project') })
    openImported(FILE, { withSource: true })
    usePluginStore.setState({ baselineByPluginId: {} })
    render(<CodePreview />)
    const reload = await screen.findByRole('button', { name: RELOAD })

    expect(reload).toBeEnabled()

    const banner = await bannerOf(
      `The app's copy of ${FILE} as it was last read is missing, so raw mode cannot tell what changed. Open its project and click Reload from project to restore it. Until then, raw mode cannot save it.`
    )

    expect(banner).toHaveAttribute('role', 'status')
  })

  it('shows no reload banner with raw mode off', async () => {
    expect.hasAssertions()

    vi.stubGlobal('api', createFakeApi())
    openImported(FILE, { withSource: false })
    useUIStore.getState().setRawModeForPlugin(usePluginStore.getState().plugin.id, false)
    render(<CodePreview />)
    await screen.findByText('Generated Code')

    expect(screen.queryByText(missingText)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: RELOAD })).not.toBeInTheDocument()
  })

  it('shows a save that raw mode refuses as an error', async () => {
    expect.hasAssertions()

    vi.stubGlobal('api', createFakeApi())
    openImported('Fixture_NoBlock.js', { withSource: true })
    render(<CodePreview />)
    editMeta({ description: 'Edited description' })
    const banner = await bannerOf(
      'Header changes cannot be saved: Fixture_NoBlock.js has no main annotation block (/*: or /*:en). Undo the header changes, or turn raw mode off to save regenerated code.'
    )

    expect(banner).toHaveAttribute('role', 'alert')
    expect(banner).toHaveClass('bg-destructive/10', 'text-destructive-text')
    expect(banner).not.toHaveClass('text-warning-text')
    expect(screen.queryByRole('button', { name: RELOAD })).not.toBeInTheDocument()
  })
})

const EXPORTED = '/exports/Alpha.js'

const preview = (): string => {
  const editor = screen.getByTestId('monaco-editor')
  if (!(editor instanceof HTMLTextAreaElement)) throw new TypeError('the preview is no text area')
  return editor.value
}

// Waits until the preview shows `text`
const previewHolds = async (text: string): Promise<void> =>
  waitFor(() => {
    expect(preview()).toContain(text)
  })

const diffButton = (): HTMLElement => screen.getByRole('button', { name: 'Diff' })

// The save dialog answers `/exports/<name>` in turn, and each write there succeeds
function fakeExport(names: string[] = ['Alpha.js']): void {
  const saveFile = vi.fn<Api['dialog']['saveFile']>()
  const saveToPath = vi.fn<Api['plugin']['saveToPath']>()
  for (const name of names) {
    saveFile.mockResolvedValueOnce(`/exports/${name}`)
    saveToPath.mockResolvedValueOnce({ success: true, path: `/exports/${name}`, sha256: 'a1' })
  }
  vi.stubGlobal(
    'api',
    createFakeApi({
      dialog: { saveFile },
      plugin: { saveToPath, readByPath: vi.fn<ReadFile>().mockResolvedValue('// on disk') }
    })
  )
}

describe('code preview panel: raw mode', () => {
  beforeEach(setUp)

  afterEach(tearDown)

  it('shows the description in the code; Raw is unavailable for a plugin made in the app', async () => {
    expect.hasAssertions()

    vi.stubGlobal('api', createFakeApi())
    editMeta({ description: 'Moves things' })
    render(<CodePreview />)
    await previewHolds('@plugindesc Moves things')
    const raw = screen.getByRole('button', { name: 'Raw' })

    expect(raw).toBeDisabled()
    expect(raw).toHaveAttribute(
      'title',
      'Raw mode unavailable: plugin was not imported from a file'
    )
  })

  it.each([
    ['Raw', 'Raw mode unavailable: plugin was not imported from a file'],
    ['Diff', 'Diff unavailable: no saved version to compare']
  ])('the hint of a disabled %s button shows on hover and describes it', (name, hint) => {
    vi.stubGlobal('api', createFakeApi())
    render(<CodePreview />)
    const button = screen.getByRole('button', { name })

    expect(button).toBeDisabled()
    expect(button).toHaveAccessibleDescription(hint)

    const [hinted, ...inner] = titled(hint)

    expect(inner).toStrictEqual([button])
    expect(hinted).toContainElement(button)
    expect(hinted).toBeEnabled()
  })

  it('raw switches an imported plugin between its file text and the generated code', async () => {
    expect.hasAssertions()

    const user = userEvent.setup()
    vi.stubGlobal('api', createFakeApi())
    const empty = createEmptyPlugin()
    const imported = {
      ...empty,
      meta: { ...empty.meta, name: 'Alpha' },
      importedFrom: 'Alpha.js'
    }
    const rawSource = `${generatePlugin(imported)}\n// body-kept\n`
    act(() => {
      usePluginStore.getState().openPlugin({ ...imported, rawSource })
    })
    render(<CodePreview />)
    await previewHolds('// body-kept')

    await user.click(screen.getByRole('button', { name: 'Raw ON' }))

    expect(screen.getByRole('button', { name: 'Raw' })).toBeInTheDocument()

    await waitFor(() => {
      expect(preview()).toBe(generatePlugin({ ...imported, rawSource }))
    })

    expect(preview()).not.toContain('// body-kept')

    await user.click(screen.getByRole('button', { name: 'Raw' }))

    expect(screen.getByRole('button', { name: 'Raw ON' })).toBeInTheDocument()

    await previewHolds('// body-kept')
  })
})

describe('code preview panel: copy and errors', () => {
  beforeEach(setUp)

  afterEach(tearDown)

  it('the error badge opens the list naming a duplicated parameter', async () => {
    expect.hasAssertions()

    const user = userEvent.setup()
    vi.stubGlobal('api', createFakeApi())
    act(() => {
      usePluginStore.getState().addParameter({ ...createEmptyParameter(), name: 'speed' })
      usePluginStore.getState().addParameter({ ...createEmptyParameter(), name: 'speed' })
    })
    render(<CodePreview />)

    expect(screen.queryByText('Duplicate parameter name: speed')).not.toBeInTheDocument()

    await user.click(await screen.findByRole('button', { name: /^1 error\b/u }))

    expect(screen.getByText('Duplicate parameter name: speed')).toBeInTheDocument()
  })

  it('copy puts the shown code on the clipboard and says so', async () => {
    expect.hasAssertions()

    const user = userEvent.setup()
    vi.stubGlobal('api', createFakeApi())
    render(
      <>
        <CodePreview />
        <ToastContainer />
      </>
    )
    await user.click(screen.getByRole('button', { name: 'Copy' }))
    const toast = await screen.findByText('Code copied to clipboard')

    expect(toast).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Copied!' })).toBeInTheDocument()

    const code = preview()

    await expect(navigator.clipboard.readText()).resolves.toBe(code)
  })
})

describe('code preview panel: export and diff', () => {
  beforeEach(setUp)

  afterEach(tearDown)

  it('export with no project asks for a .js path, writes the shown code there and enables Diff', async () => {
    expect.hasAssertions()

    const user = userEvent.setup()
    fakeExport()
    render(<CodePreview />)

    expect(diffButton()).toBeDisabled()

    const code = preview()

    await user.click(screen.getByRole('button', { name: 'Export' }))
    await waitFor(() => {
      expect(diffButton()).toBeEnabled()
    })

    expect(globalThis.api.dialog.saveFile).toHaveBeenCalledWith({
      defaultPath: 'Alpha.js',
      filters: [{ name: 'JavaScript Files', extensions: ['js'] }]
    })
    expect(globalThis.api.plugin.saveToPath).toHaveBeenCalledWith(EXPORTED, code, { base: null })
  })

  it('each other format is written under its own name with no file check and leaves Diff off', async () => {
    expect.hasAssertions()

    const user = userEvent.setup()
    const formats: [item: string, name: string][] = [
      ['Export README.md', 'Alpha_README.md'],
      ['Export .d.ts', 'Alpha.d.ts'],
      ['Export plugins.json entry', 'Alpha_plugins-entry.json']
    ]
    fakeExport(formats.map(([, name]) => name))
    const { saveFile } = globalThis.api.dialog
    const { saveToPath } = globalThis.api.plugin
    render(<CodePreview />)

    for (const [item, name] of formats) {
      const calls = vi.mocked(saveToPath).mock.calls.length
      await user.click(screen.getByTitle('Export in other formats'))
      await user.click(screen.getByText(item))
      await waitFor(() => {
        expect(saveToPath).toHaveBeenCalledTimes(calls + 1)
      })

      expect(vi.mocked(saveFile).mock.lastCall?.[0]).toMatchObject({ defaultPath: name })
      expect(vi.mocked(saveToPath).mock.lastCall).toStrictEqual([
        `/exports/${name}`,
        expect.any(String)
      ])
    }

    expect(diffButton()).toBeDisabled()
  })

  it('a mousedown outside the formats menu closes it', async () => {
    expect.hasAssertions()

    const user = userEvent.setup()
    vi.stubGlobal('api', createFakeApi())
    render(<CodePreview />)
    await user.click(screen.getByTitle('Export in other formats'))

    expect(screen.getByText('Export README.md')).toBeInTheDocument()

    await user.click(screen.getByText('Generated Code'))

    expect(screen.queryByText('Export README.md')).not.toBeInTheDocument()
  })

  it('diff after an export compares the exported file with the shown code; Diff again goes back', async () => {
    expect.hasAssertions()

    const user = userEvent.setup()
    fakeExport()
    render(<CodePreview />)
    const code = preview()
    await user.click(screen.getByRole('button', { name: 'Export' }))
    await waitFor(() => {
      expect(diffButton()).toBeEnabled()
    })

    await user.click(diffButton())
    const original = await screen.findByTestId('monaco-diff-original')

    expect(original).toHaveValue('// on disk')
    expect(screen.getByTestId('monaco-diff-modified')).toHaveValue(code)
    expect(globalThis.api.plugin.readByPath).toHaveBeenCalledWith(EXPORTED)

    await user.click(diffButton())

    expect([screen.queryByTestId('monaco-diff-original'), preview()]).toStrictEqual([null, code])
  })
})
