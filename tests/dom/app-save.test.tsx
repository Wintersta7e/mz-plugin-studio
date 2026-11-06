// Saving from the keyboard: Ctrl+S saves the active tab into the open project, Save All
// (Ctrl+Shift+S) every unsaved tab. Behind `window.api` sit the main-process save and load
// functions, writing to a fresh temporary project, so every conflict is the file check's own.
import { createHash } from 'node:crypto'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  type Mock,
  vi
} from 'vitest'
import App from '../../src/renderer/src/App'
import { createDialogHandlers, type DialogPort } from '../../src/main/ipc/dialog'
import { savePluginFile } from '../../src/main/ipc/plugin'
import { generatePlugin } from '../../src/renderer/src/lib/generator'
import { reloadFromProject } from '../../src/renderer/src/lib/raw-mode'
import {
  useHistoryStore,
  usePluginStore,
  useProjectStore,
  useToastStore
} from '../../src/renderer/src/stores'
import {
  createEmptyCommand,
  createEmptyParameter,
  createEmptyPlugin,
  type PluginDefinition,
  toBaseline
} from '../../src/renderer/src/types/plugin'
import {
  IPC_CHANNELS,
  type MessageDialogOptions,
  type SaveConflict
} from '../../src/shared/ipc-types'
import { afterAllTests } from '../helpers/after-all-tests'
import { copyFixtureProject } from '../helpers/fixture-project'
import { LOAD_PREVIEW_TIMEOUT_MS, loadPreview } from './support/load-preview'
import { createMainApi, viaIpc } from './support/main-api'
import { resetStores } from './support/reset-stores'

type Api = Window['api']

const FILE = 'Fixture_HandWritten.js'

// Each case renders the whole app, which takes seconds on a cold start
const APP_TIMEOUT = { timeout: 30_000 }

// The fresh temporary project of the running test
const temporary = { root: '' }
const cleanups: string[] = []

const sha = (bytes: string | Buffer): string => createHash('sha256').update(bytes).digest('hex')

const fileIn = (name: string, project = temporary.root): string =>
  path.join(project, 'js', 'plugins', name)

async function setUp(): Promise<void> {
  resetStores()
  // The build defines this; the status bar shows it.
  vi.stubGlobal('__APP_VERSION__', '0.0.0-test')
  temporary.root = await mkdtemp(path.join(tmpdir(), 'app-save-'))
}

async function tearDown(): Promise<void> {
  vi.unstubAllGlobals()
  await rm(temporary.root, { recursive: true, force: true })
  for (const directory of cleanups.splice(0)) await rm(directory, { recursive: true, force: true })
}

async function openProject(project = temporary.root): Promise<void> {
  const loaded = { ...(await globalThis.api.project.load(project)), path: project }
  act(() => {
    useProjectStore.getState().setProject(loaded)
  })
}

const editMeta = (meta: Partial<PluginDefinition['meta']>): void => {
  act(() => {
    usePluginStore.getState().updateMeta(meta)
  })
}

const activate = (id: string): void => {
  act(() => {
    usePluginStore.getState().setActivePlugin(id)
  })
}

// Opens a new plugin as the active tab; a `name` is typed into it, which leaves it unsaved.
function openTab(name?: string, description?: string): string {
  const plugin = createEmptyPlugin()
  act(() => {
    usePluginStore.getState().openPlugin(plugin)
    if (name !== undefined) usePluginStore.getState().updateMeta({ name })
    if (description !== undefined) usePluginStore.getState().updateMeta({ description })
  })
  return plugin.id
}

// Opens `file` of `project` as the plugin browser does: the tab and the file it was read from.
async function openFromProject(project: string, file: string): Promise<string> {
  const loaded = await globalThis.api.plugin.load(project, file)
  act(() => {
    usePluginStore
      .getState()
      .openPlugin(loaded.plugin, { path: loaded.path, sha256: loaded.sha256 })
  })
  return loaded.plugin.id
}

// The open tab `id`; throws when no tab has it.
function openTabOf(id: string): PluginDefinition {
  const found = usePluginStore.getState().openPlugins.find((open) => open.id === id)
  if (found === undefined) throw new Error(`no open tab ${id}`)
  return found
}

async function copyProject(): Promise<string> {
  const project = await copyFixtureProject()
  cleanups.push(path.dirname(project))
  return project
}

// A save into the project that waits for `gate` before it reaches main.
const heldSave = (gate: Promise<unknown>): Mock<typeof savePluginFile> =>
  vi.fn<typeof savePluginFile>(async (...args) => {
    await gate
    return savePluginFile(...args)
  })

// Main's save into the project, as the renderer reaches it, failing for Gamma.js as a full disk does.
const saveFailingGamma = (): Mock<typeof savePluginFile> =>
  vi.fn<typeof savePluginFile>(
    viaIpc(IPC_CHANNELS.PLUGIN_SAVE, async (...args: Parameters<typeof savePluginFile>) => {
      if (args[1] === 'Gamma.js') throw new Error('disk full')
      return savePluginFile(...args)
    })
  )

// Main's dialog methods for a handler whose argument check is the only part a test runs.
const notOpened = (): never => {
  throw new Error('the test opens no dialog')
}
const NO_DIALOGS: DialogPort = {
  showOpenDialog: notOpened,
  showSaveDialog: notOpened,
  showMessageBox: notOpened
}

const pressSave = (): void => {
  fireEvent.keyDown(globalThis.window, { key: 's', code: 'KeyS', ctrlKey: true })
}

const pressSaveAll = (): void => {
  fireEvent.keyDown(globalThis.window, { key: 'S', code: 'KeyS', ctrlKey: true, shiftKey: true })
}

const pressUndo = (): void => {
  fireEvent.keyDown(globalThis.window, { key: 'z', code: 'KeyZ', ctrlKey: true })
}

const pressRedo = (): void => {
  fireEvent.keyDown(globalThis.window, { key: 'Z', code: 'KeyZ', ctrlKey: true, shiftKey: true })
}

// Lets a save that is not waiting on the test run to its end.
async function settle(): Promise<void> {
  for (let round = 0; round < 5; round++) {
    await act(async () => {
      await Promise.resolve()
    })
  }
}

const toasts = (): string[] => useToastStore.getState().toasts.map((t) => `${t.type}: ${t.message}`)

// How many times `run` writes the open plugins to storage.
async function pluginWrites(run: () => unknown): Promise<number> {
  const setItem = vi.spyOn(Storage.prototype, 'setItem')
  try {
    await run()
    await settle()
    return setItem.mock.calls.filter(([key]) => key === 'mz-plugin-studio-plugin').length
  } finally {
    setItem.mockRestore()
  }
}

const plugin = (): PluginDefinition => usePluginStore.getState().plugin

const isDirty = (id: string): boolean => usePluginStore.getState().dirtyByPluginId[id] ?? false

const baseOf = (id: string) => usePluginStore.getState().baseByPluginId[id]

const saveCalls = () => vi.mocked(globalThis.api.plugin.save).mock.calls

const guards = () => saveCalls().map((call) => call[3])

const messages = (): MessageDialogOptions[] =>
  vi.mocked(globalThis.api.dialog.message).mock.calls.map((call) => call[0])

// Waits for the app's delayed history record to hold `count` states of the tab.
const historyHolds = async (count: number): Promise<void> => {
  await waitFor(() => {
    expect(useHistoryStore.getState().past).toHaveLength(count)
  })
}

// Waits until the toasts shown are `shown`.
const toastsShow = async (shown: string[]): Promise<void> => {
  await waitFor(() => {
    expect(toasts()).toStrictEqual(shown)
  })
}

// Waits until `count` toasts are shown.
const toastCount = async (count: number): Promise<void> => {
  await waitFor(() => {
    expect(toasts()).toHaveLength(count)
  })
}

// Waits until the app has asked `count` message dialogs.
const messagesShown = async (count: number): Promise<void> => {
  await waitFor(() => {
    expect(messages()).toHaveLength(count)
  })
}

// Waits until the app has asked main for `count` saves into the project.
const savesAsked = async (count: number): Promise<void> => {
  await waitFor(() => {
    expect(globalThis.api.plugin.save).toHaveBeenCalledTimes(count)
  })
}

// Waits until the app has opened the save dialog `count` times.
const saveDialogsOpened = async (count: number): Promise<void> => {
  await waitFor(() => {
    expect(globalThis.api.dialog.saveFile).toHaveBeenCalledTimes(count)
  })
}

// Waits until the title bar no longer marks the active tab unsaved.
const modifiedMarkGone = async (): Promise<void> => {
  await waitFor(() => {
    expect(screen.queryByText('(modified)')).not.toBeInTheDocument()
  })
}

// The combobox showing a value that starts with `text`; throws when none does.
function comboboxShowing(text: string): HTMLElement {
  const found = screen.getAllByRole('combobox').find((box) => box.textContent.startsWith(text))
  if (found === undefined) throw new Error(`no combobox shows ${text}`)
  return found
}

const escaped = (text: string): string => text.replace(/[\\^$.*+?()[\]{}|/]/g, '\\$&')

// Checks the save conflict dialogs the tests of one suite show. After the suite it prints how
// many it checked, and fails when that is none or a kind of `kinds` had no dialog checked.
function conflictChecks(kinds: readonly SaveConflict[]): {
  dialog: (index: number, kind: SaveConflict) => MessageDialogOptions
  afterAll: () => void
} {
  const checkedKinds = new Set<SaveConflict>()
  let checked = 0
  return {
    // The `index`th message dialog, checked as a save conflict's.
    dialog(index, kind) {
      const options = messages().at(index)
      if (options === undefined) throw new Error(`no message dialog ${String(index)}`)

      expect(options.title).toBe('Overwrite file?')
      // Main makes Cancel the default and the Escape answer; the routine passes neither
      expect(options.buttons).toContain('Cancel')
      expect(options).not.toHaveProperty('defaultId')
      expect(options).not.toHaveProperty('cancelId')

      checkedKinds.add(kind)
      checked++
      return options
    },
    afterAll: afterAllTests(() => {
      process.stdout.write(`save conflict dialogs checked ${String(checked)}\n`)
      const unchecked = kinds.filter((kind) => !checkedKinds.has(kind))
      return [
        ...(checked === 0 ? ['no save conflict dialog was checked'] : []),
        ...unchecked.map((kind) => `the ${kind} dialog was not checked`)
      ]
    })
  }
}

const SAVE_FILTERS = [{ name: 'JavaScript Files', extensions: ['js'] }]

// The question before a save to a file not named after the plugin "Alpha".
const RENAMED = {
  type: 'warning',
  title: 'File name differs from plugin name',
  message:
    '"Chosen.js" is not named after the plugin "Alpha". RPG Maker MZ finds a plugin\'s commands by its exact file name and its parameters by its file name in any letter case, so its commands and parameters would not work in a game. Save anyway?',
  buttons: ['Cancel', 'Choose another file', 'Save anyway']
}

// Opens the unsaved plugin "Alpha" with a command and a parameter.
function openWithBoth(): string {
  const id = openTab('Alpha')
  act(() => {
    usePluginStore.getState().addCommand(createEmptyCommand())
    usePluginStore.getState().addParameter(createEmptyParameter())
  })
  return id
}

// A plugin whose code reads its own name from the file it is loaded from.
const SELF_NAMED_SOURCE = [
  '/*:',
  ' * @target MZ',
  ' * @plugindesc Reads its name from its file',
  ' * @param Speed',
  ' * @default 1',
  ' * @command Show',
  ' */',
  '(() => {',
  '  const name = document.currentScript.src.match(/([^/]+)\\.js$/)[1];',
  '  const params = PluginManager.parameters(name);',
  "  PluginManager.registerCommand(name, 'Show', () => {});",
  '})();',
  ''
].join('\n')

describe('app save: ctrl+S into a project', APP_TIMEOUT, () => {
  const conflicts = conflictChecks(['exists-unrelated'])

  beforeAll(loadPreview, LOAD_PREVIEW_TIMEOUT_MS)

  beforeEach(setUp)

  afterEach(tearDown)

  afterAll(conflicts.afterAll)

  it("a second new plugin with the default name asks before replacing the first one's file", async () => {
    expect.hasAssertions()

    vi.stubGlobal('api', createMainApi())
    await openProject()
    const first = openTab()
    const second = openTab(undefined, 'The second plugin')
    render(<App />)
    activate(first)
    pressSave()
    await toastsShow(['success: Plugin saved'])
    const written = await readFile(fileIn('NewPlugin.js'), 'utf8')
    activate(second)
    pressSave()
    await messagesShown(1)
    await settle()
    const options = conflicts.dialog(0, 'exists-unrelated')

    expect(options).toMatchObject({
      message: `"${fileIn('NewPlugin.js')}" is not the file this tab last opened or saved. Overwrite it?`,
      buttons: ['Cancel', 'Overwrite']
    })
    await expect(readFile(fileIn('NewPlugin.js'), 'utf8')).resolves.toBe(written)
    expect({ isDirty: isDirty(second), base: baseOf(second) }).toStrictEqual({
      isDirty: true,
      base: undefined
    })
    // Cancel tries no second write: one save for each tab
    expect({ toasts: toasts(), saves: saveCalls().length }).toStrictEqual({
      toasts: ['success: Plugin saved'],
      saves: 2
    })
    expect(screen.getByText('(modified)')).toBeInTheDocument()
  })

  it('ctrl+S writes the tab into the project, and the next one is checked against what it wrote', async () => {
    expect.hasAssertions()

    const user = userEvent.setup()
    vi.stubGlobal('api', createMainApi())
    await openProject()
    openTab('Alpha')
    render(<App />)

    expect(screen.getByText('(modified)')).toBeInTheDocument()

    const code = generatePlugin(plugin())
    await user.keyboard('{Control>}s{/Control}')
    await screen.findByText('Plugin saved')

    expect(globalThis.api.plugin.save).toHaveBeenCalledWith(temporary.root, 'Alpha.js', code, {
      base: null
    })
    expect(screen.queryByText('(modified)')).not.toBeInTheDocument()

    const first = await readFile(fileIn('Alpha.js'))
    await user.type(screen.getByLabelText('Author'), 'Someone')

    expect(screen.getByText('(modified)')).toBeInTheDocument()

    await user.keyboard('{Control>}s{/Control}')
    await savesAsked(2)

    expect(guards().at(1)).toStrictEqual({ base: { path: fileIn('Alpha.js'), sha256: sha(first) } })

    await modifiedMarkGone()
  })
})

describe('app save: ctrl+S without a project', APP_TIMEOUT, () => {
  beforeAll(loadPreview, LOAD_PREVIEW_TIMEOUT_MS)

  beforeEach(setUp)

  afterEach(tearDown)

  it('ctrl+S without a project writes nothing when the save dialog is closed, and the file chosen next time', async () => {
    expect.hasAssertions()

    const user = userEvent.setup()
    const target = path.join(temporary.root, 'Alpha.js')
    const chosen = [null, target]
    vi.stubGlobal('api', createMainApi({ chosen: () => chosen.shift() ?? null }))
    openTab('Alpha')
    render(<App />)
    await user.keyboard('{Control>}s{/Control}')
    await saveDialogsOpened(1)
    await settle()

    expect(globalThis.api.plugin.saveToPath).not.toHaveBeenCalled()
    expect(globalThis.api.plugin.save).not.toHaveBeenCalled()
    expect(screen.getByText('(modified)')).toBeInTheDocument()

    const code = generatePlugin(plugin())
    await user.keyboard('{Control>}s{/Control}')
    await screen.findByText('Plugin saved')

    expect(globalThis.api.plugin.saveToPath).toHaveBeenCalledWith(target, code, { base: null })
    expect(screen.queryByText('(modified)')).not.toBeInTheDocument()
  })

  it('ctrl+S without a project asks where to save and writes there', async () => {
    expect.hasAssertions()

    const target = path.join(temporary.root, 'Chosen.js')
    vi.stubGlobal('api', createMainApi({ chosen: () => target }))
    const id = openTab('Alpha')
    render(<App />)
    pressSave()
    await toastsShow(['success: Plugin saved'])

    expect(globalThis.api.dialog.saveFile).toHaveBeenCalledWith({
      defaultPath: 'Alpha.js',
      filters: SAVE_FILTERS
    })

    const bytes = await readFile(target)

    expect(bytes.toString('utf8')).toBe(generatePlugin(plugin()))
    expect(isDirty(id)).toBe(false)
    expect(usePluginStore.getState().savedPathsByPluginId[id]).toBe(target)
    expect(baseOf(id)).toStrictEqual({ path: target, sha256: sha(bytes) })
  })
})

describe('app save: saving again without a project', APP_TIMEOUT, () => {
  beforeAll(loadPreview, LOAD_PREVIEW_TIMEOUT_MS)

  beforeEach(setUp)

  afterEach(tearDown)

  it('ctrl+S without a project asks once, then writes the chosen file without asking', async () => {
    expect.hasAssertions()

    const target = path.join(temporary.root, 'Chosen.js')
    vi.stubGlobal('api', createMainApi({ chosen: () => target }))
    const id = openTab('Alpha')
    render(<App />)
    pressSave()
    await toastsShow(['success: Plugin saved'])
    editMeta({ description: 'Second save' })
    pressSave()
    await toastCount(2)

    expect(toasts()[1]).toBe('success: Plugin saved')
    expect(globalThis.api.dialog.saveFile).toHaveBeenCalledTimes(1)
    await expect(readFile(target, 'utf8')).resolves.toBe(generatePlugin(plugin()))
    expect(isDirty(id)).toBe(false)
  })

  it('ctrl+S without a project, in a new session, offers the file the tab was saved to', async () => {
    expect.hasAssertions()

    const target = path.join(temporary.root, 'Saved.js')
    await writeFile(target, 'saved last session\n')
    vi.stubGlobal('api', createMainApi({ chosen: () => target }))
    const id = openTab('Alpha')
    act(() => {
      usePluginStore.getState().recordSaves([
        {
          id,
          saved: plugin(),
          path: target,
          sha256: sha('saved last session\n'),
          written: 'saved last session\n'
        }
      ])
    })
    editMeta({ description: 'Edited' })
    render(<App />)
    pressSave()
    await toastsShow(['success: Plugin saved'])

    expect(globalThis.api.dialog.saveFile).toHaveBeenCalledWith({
      defaultPath: target,
      filters: SAVE_FILTERS
    })
    await expect(readFile(target, 'utf8')).resolves.toBe(generatePlugin(plugin()))
  })
})

describe(
  'app save: ctrl+S without a project to a file not named after the plugin',
  APP_TIMEOUT,
  () => {
    beforeAll(loadPreview, LOAD_PREVIEW_TIMEOUT_MS)

    beforeEach(setUp)

    afterEach(tearDown)

    it('asks first; Cancel writes nothing and leaves the tab unsaved', async () => {
      expect.hasAssertions()

      const target = path.join(temporary.root, 'Chosen.js')
      vi.stubGlobal('api', createMainApi({ chosen: () => target }))
      const id = openWithBoth()
      render(<App />)
      pressSave()
      await waitFor(() => {
        expect(messages()).toStrictEqual([RENAMED])
      })
      await settle()

      expect(globalThis.api.plugin.saveToPath).not.toHaveBeenCalled()
      await expect(readFile(target)).rejects.toMatchObject({ code: 'ENOENT' })
      expect(isDirty(id)).toBe(true)
      expect(toasts()).toStrictEqual([])
    })

    it('asks first; Save anyway writes the file once', async () => {
      expect.hasAssertions()

      const target = path.join(temporary.root, 'Chosen.js')
      vi.stubGlobal('api', createMainApi({ chosen: () => target, answers: [2] }))
      const id = openWithBoth()
      render(<App />)
      pressSave()
      await toastsShow(['success: Plugin saved'])

      expect(messages()).toStrictEqual([RENAMED])
      expect(globalThis.api.plugin.saveToPath).toHaveBeenCalledTimes(1)
      await expect(readFile(target, 'utf8')).resolves.toBe(generatePlugin(plugin()))
      expect(isDirty(id)).toBe(false)
    })

    it('after Save anyway, does not ask again for that file', async () => {
      expect.hasAssertions()

      const target = path.join(temporary.root, 'Chosen.js')
      vi.stubGlobal('api', createMainApi({ chosen: () => target, answers: [2] }))
      openWithBoth()
      render(<App />)
      pressSave()
      await toastsShow(['success: Plugin saved'])
      editMeta({ description: 'Second save' })
      pressSave()
      await toastCount(2)

      expect(toasts()[1]).toBe('success: Plugin saved')
      expect(messages()).toStrictEqual([RENAMED])
      await expect(readFile(target, 'utf8')).resolves.toBe(generatePlugin(plugin()))
    })

    it('choose another file opens the save dialog at a file named after the plugin', async () => {
      expect.hasAssertions()

      const target = path.join(temporary.root, 'Chosen.js')
      const named = path.join(temporary.root, 'Alpha.js')
      const chosen = [target, named]
      vi.stubGlobal('api', createMainApi({ chosen: () => chosen.shift() ?? null, answers: [1] }))
      const id = openWithBoth()
      render(<App />)
      pressSave()
      await toastsShow(['success: Plugin saved'])

      expect(messages()).toStrictEqual([RENAMED])

      const asked = vi.mocked(globalThis.api.dialog.saveFile).mock.calls.at(1)
      // Main's check passes the remembered folder and name to the dialog unchanged
      const saveDialog = createDialogHandlers(NO_DIALOGS)['dialog:save-file']
      const expected = [{ defaultPath: named, filters: SAVE_FILTERS }]

      expect({ asked, checked: saveDialog.check(asked ?? []) }).toStrictEqual({
        asked: expected,
        checked: expected
      })
      await expect(readFile(named, 'utf8')).resolves.toBe(generatePlugin(plugin()))
      await expect(readFile(target)).rejects.toMatchObject({ code: 'ENOENT' })
      expect(usePluginStore.getState().savedPathsByPluginId[id]).toBe(named)
    })
  }
)

describe('app save: ctrl+S without a project to a file the name check passes', APP_TIMEOUT, () => {
  beforeAll(loadPreview, LOAD_PREVIEW_TIMEOUT_MS)

  beforeEach(setUp)

  afterEach(tearDown)

  it('does not ask for a loaded plugin whose code reads its own name from its file', async () => {
    expect.hasAssertions()

    await mkdir(path.dirname(fileIn('SelfNamed.js')), { recursive: true })
    await writeFile(fileIn('SelfNamed.js'), SELF_NAMED_SOURCE)
    const target = path.join(temporary.root, 'Other.js')
    vi.stubGlobal('api', createMainApi({ chosen: () => target }))
    await openFromProject(temporary.root, 'SelfNamed.js')
    render(<App />)
    pressSave()
    await toastsShow(['success: Plugin saved'])

    expect(messages()).toStrictEqual([])
    await expect(readFile(target, 'utf8')).resolves.toBe(SELF_NAMED_SOURCE)
  })

  it('does not ask for a file named after the plugin', async () => {
    expect.hasAssertions()

    const target = path.join(temporary.root, 'Alpha.js')
    vi.stubGlobal('api', createMainApi({ chosen: () => target }))
    openWithBoth()
    render(<App />)
    pressSave()
    await toastsShow(['success: Plugin saved'])

    expect(messages()).toStrictEqual([])
  })
})

describe('app save: storage writes', APP_TIMEOUT, () => {
  beforeAll(loadPreview, LOAD_PREVIEW_TIMEOUT_MS)

  beforeEach(setUp)

  afterEach(tearDown)

  it('one Ctrl+S writes the open plugins to storage once', async () => {
    expect.hasAssertions()

    vi.stubGlobal('api', createMainApi())
    await openProject()
    openTab('Alpha')
    render(<App />)
    await settle()
    const setItem = vi.spyOn(Storage.prototype, 'setItem')
    pressSave()
    await toastsShow(['success: Plugin saved'])
    await settle()
    const writes = setItem.mock.calls.filter(([key]) => key === 'mz-plugin-studio-plugin')
    setItem.mockRestore()

    expect(writes).toHaveLength(1)
  })

  it('one undo step and one redo step each write the open plugins to storage once', async () => {
    expect.hasAssertions()

    vi.stubGlobal('api', createMainApi())
    openTab()
    render(<App />)
    await historyHolds(1)
    editMeta({ name: 'Alpha' })
    await historyHolds(2)
    await settle()

    await expect(pluginWrites(pressUndo)).resolves.toBe(1)
    expect(useHistoryStore.getState().future).toHaveLength(1)
    expect(isDirty(plugin().id)).toBe(true)
    await expect(pluginWrites(pressRedo)).resolves.toBe(1)
    expect(useHistoryStore.getState().future).toHaveLength(0)
  })

  it('one reload writes the open plugins to storage once', async () => {
    expect.hasAssertions()

    const project = await copyProject()
    vi.stubGlobal('api', createMainApi())
    await openProject(project)
    const id = await openFromProject(project, FILE)
    let isReloaded = false
    const writes = await pluginWrites(async () => {
      isReloaded = await act(async () => reloadFromProject(id))
    })

    expect(isReloaded).toBe(true)
    expect(writes).toBe(1)
  })
})

describe('app save: an edit during a save', APP_TIMEOUT, () => {
  beforeAll(loadPreview, LOAD_PREVIEW_TIMEOUT_MS)

  beforeEach(setUp)

  afterEach(tearDown)

  it.each([
    ['Ctrl+S', pressSave, 'success: Plugin saved'],
    ['Save All', pressSaveAll, 'success: 1 plugin saved']
  ])('an edit made while %s is in flight stays unsaved', async (_label, press, toast) => {
    expect.hasAssertions()

    const gate = Promise.withResolvers<null>()
    vi.stubGlobal('api', createMainApi({ overrides: { plugin: { save: heldSave(gate.promise) } } }))
    await openProject()
    const id = openTab('Alpha')
    render(<App />)
    press()
    await savesAsked(1)
    editMeta({ description: 'edited during save' })
    await act(async () => {
      gate.resolve(null)
      await gate.promise
    })
    await waitFor(() => {
      expect(toasts()).toContain(toast)
    })

    expect(plugin().meta.description).toBe('edited during save')
    expect(isDirty(id)).toBe(true)

    const bytes = await readFile(fileIn('Alpha.js'))

    expect(baseOf(id)).toStrictEqual({ path: fileIn('Alpha.js'), sha256: sha(bytes) })
  })
})

describe('app save: save all', APP_TIMEOUT, () => {
  beforeAll(loadPreview, LOAD_PREVIEW_TIMEOUT_MS)

  beforeEach(setUp)

  afterEach(tearDown)

  it('save All skips a tab whose file it did not write, names it and every tab not saved in one report and saves the rest', async () => {
    expect.hasAssertions()

    await mkdir(path.join(temporary.root, 'js', 'plugins'), { recursive: true })
    await writeFile(fileIn('Beta.js'), 'unrelated')
    vi.stubGlobal('api', createMainApi({ overrides: { plugin: { save: saveFailingGamma() } } }))
    await openProject()
    const tabs = [openTab('Alpha'), openTab('Beta'), openTab('Gamma'), openTab('')]
    render(<App />)
    pressSaveAll()
    await toastsShow([
      'warning: Saved 1, failed 1. Not saved, the file there is not the one this tab last opened or saved: Beta. Not saved, no plugin name: 1 tab. Failed: Gamma (disk full).'
    ])

    expect(useToastStore.getState().toasts.at(0)?.duration).toBeGreaterThanOrEqual(10_000)
    await expect(readFile(fileIn('Beta.js'), 'utf8')).resolves.toBe('unrelated')
    await expect(readFile(fileIn('Alpha.js'), 'utf8')).resolves.toContain('@target MZ')
    expect(tabs.map((id) => isDirty(id))).toStrictEqual([false, true, true, true])
    expect(globalThis.api.dialog.message).not.toHaveBeenCalled()
  })

  it('save All of two new plugins with one name saves the first and skips the second', async () => {
    expect.hasAssertions()

    vi.stubGlobal('api', createMainApi())
    await openProject()
    const first = openTab('NewPlugin', 'The first plugin')
    const second = openTab('NewPlugin', 'The second plugin')
    const firstCode = generatePlugin(openTabOf(first))
    render(<App />)
    pressSaveAll()
    await toastsShow([
      'warning: Saved 1. Not saved, the file there is not the one this tab last opened or saved: NewPlugin.'
    ])

    await expect(readFile(fileIn('NewPlugin.js'), 'utf8')).resolves.toBe(firstCode)
    expect([first, second].map((id) => isDirty(id))).toStrictEqual([false, true])
  })
})

describe('app save: tabs read from a file', APP_TIMEOUT, () => {
  beforeAll(loadPreview, LOAD_PREVIEW_TIMEOUT_MS)

  beforeEach(setUp)

  afterEach(tearDown)

  it('a tab opened from the plugin browser and saved records the file it wrote', async () => {
    expect.hasAssertions()

    const project = await copyProject()
    const list = vi.fn<Api['plugin']['list']>().mockResolvedValue([FILE])
    vi.stubGlobal('api', createMainApi({ overrides: { plugin: { list } } }))
    await openProject(project)
    render(<App />)
    fireEvent.keyDown(globalThis.window, { key: 'E', code: 'KeyE', ctrlKey: true, shiftKey: true })
    fireEvent.click(await screen.findByTitle(FILE))
    await waitFor(() => {
      expect(plugin().importedFrom).toBe(FILE)
    })
    const id = plugin().id
    editMeta({ description: 'Edited and saved' })
    const saved = plugin()
    pressSave()
    await toastsShow(['success: Plugin saved'])
    const onDisk = await readFile(fileIn(FILE, project))
    const state = usePluginStore.getState()

    expect(onDisk.toString('utf8')).toContain('Edited and saved')
    expect(state.plugin.rawSource).toBe(onDisk.toString('utf8'))
    expect({
      baseline: state.baselineByPluginId[id],
      base: state.baseByPluginId[id],
      isDirty: isDirty(id)
    }).toStrictEqual({
      baseline: toBaseline(saved),
      base: { path: fileIn(FILE, project), sha256: sha(onDisk) },
      isDirty: false
    })
  })

  it('a tab loaded from a file cannot be renamed, and Ctrl+S writes the file it came from', async () => {
    expect.hasAssertions()

    const project = await copyProject()
    vi.stubGlobal('api', createMainApi())
    await openProject(project)
    const id = await openFromProject(project, FILE)
    render(<App />)

    expect(screen.getByLabelText('Plugin Name')).toHaveAttribute('readonly')

    // A name that differs from the file, as a tab restored from an older version can hold
    editMeta({ name: 'Renamed', description: 'Kept' })
    pressSave()
    await toastsShow(['success: Plugin saved'])

    expect(saveCalls().map((call) => call[1])).toStrictEqual([FILE])
    await expect(readFile(fileIn(FILE, project), 'utf8')).resolves.toContain('Kept')
    await expect(readFile(fileIn('Renamed.js', project))).rejects.toThrow(/ENOENT/)
    expect(isDirty(id)).toBe(false)
  })

  it('reload of a tab in the open project, or with no file recorded, does not ask', async () => {
    expect.hasAssertions()

    const project = await copyProject()
    vi.stubGlobal('api', createMainApi())
    await openProject(project)
    const read = await openFromProject(project, FILE)

    await expect(act(async () => reloadFromProject(read))).resolves.toBe(true)

    const loaded = await globalThis.api.plugin.load(project, FILE)
    act(() => {
      usePluginStore.getState().openPlugin(loaded.plugin)
    })

    await expect(act(async () => reloadFromProject(loaded.plugin.id))).resolves.toBe(true)
    expect(messages()).toStrictEqual([])
    expect(baseOf(loaded.plugin.id)).toHaveProperty('path', fileIn(FILE, project))
  })
})

describe('app save: a tab read from another project', APP_TIMEOUT, () => {
  const conflicts = conflictChecks(['exists-unrelated'])

  beforeAll(loadPreview, LOAD_PREVIEW_TIMEOUT_MS)

  beforeEach(setUp)

  afterEach(tearDown)

  afterAll(conflicts.afterAll)

  it("a tab read from another project asks before replacing the open project's file", async () => {
    expect.hasAssertions()

    const first = await copyProject()
    const second = await copyProject()
    vi.stubGlobal('api', createMainApi())
    const id = await openFromProject(first, FILE)
    editMeta({ description: 'Edited in the first' })
    await openProject(second)
    const firstBytes = await readFile(fileIn(FILE, first))
    const secondBytes = await readFile(fileIn(FILE, second))
    render(<App />)
    pressSave()
    await messagesShown(1)
    await settle()
    const options = conflicts.dialog(0, 'exists-unrelated')

    expect(options.message).toBe(
      `"${fileIn(FILE, second)}" is not the file this tab last opened or saved. Overwrite it?`
    )
    await expect(readFile(fileIn(FILE, second))).resolves.toStrictEqual(secondBytes)
    await expect(readFile(fileIn(FILE, first))).resolves.toStrictEqual(firstBytes)
    expect(isDirty(id)).toBe(true)
    expect(baseOf(id)).toHaveProperty('path', fileIn(FILE, first))
  })

  it('reload of a tab read from another project asks first, and Cancel reads nothing', async () => {
    expect.hasAssertions()

    const first = await copyProject()
    const second = await copyProject()
    vi.stubGlobal('api', createMainApi())
    const id = await openFromProject(first, FILE)
    await openProject(second)

    await expect(act(async () => reloadFromProject(id))).resolves.toBe(false)
    expect(messages()).toStrictEqual([
      {
        type: 'question',
        title: 'Reload from another project?',
        message: `This tab was last read from or saved to ${fileIn(FILE, first)}, which is not in the open project's plugins folder. Reload it from ${fileIn(FILE, second)} instead?`,
        buttons: ['Cancel', 'Reload']
      }
    ])
    expect(globalThis.api.plugin.readRaw).not.toHaveBeenCalled()
    expect(baseOf(id)).toHaveProperty('path', fileIn(FILE, first))
  })

  it("reload of a tab read from another project, confirmed, takes the open project's file", async () => {
    expect.hasAssertions()

    const first = await copyProject()
    const second = await copyProject()
    const text = `${await readFile(fileIn(FILE, second), 'utf8')}// the second copy\n`
    await writeFile(fileIn(FILE, second), text)
    vi.stubGlobal('api', createMainApi({ answers: [1] }))
    const id = await openFromProject(first, FILE)
    await openProject(second)

    await expect(act(async () => reloadFromProject(id))).resolves.toBe(true)
    expect(messages()).toHaveLength(1)
    expect(plugin().rawSource).toBe(text)
    expect(baseOf(id)).toStrictEqual({ path: fileIn(FILE, second), sha256: sha(text) })
  })
})

describe('app save: a file changed on disk', APP_TIMEOUT, () => {
  const conflicts = conflictChecks(['changed-on-disk'])

  beforeAll(loadPreview, LOAD_PREVIEW_TIMEOUT_MS)

  beforeEach(setUp)

  afterEach(tearDown)

  afterAll(conflicts.afterAll)

  it('a file changed on disk while its prompt is open is asked about again', async () => {
    expect.hasAssertions()

    const project = await copyProject()
    const file = fileIn(FILE, project)
    const text = await readFile(file, 'utf8')
    const changed = `${text}\n// changed elsewhere\n`
    const changedAgain = `${text}\n// changed elsewhere again\n`
    let asked = 0
    const message = vi.fn<Api['dialog']['message']>(async () => {
      asked++
      if (asked > 1) return 0
      await writeFile(file, changedAgain)
      return 1
    })
    vi.stubGlobal('api', createMainApi({ overrides: { dialog: { message } } }))
    await openProject(project)
    const id = await openFromProject(project, FILE)
    render(<App />)
    await writeFile(file, changed)
    editMeta({ description: 'Edited' })
    pressSave()
    await messagesShown(2)
    await settle()
    for (const index of [0, 1]) {
      const options = conflicts.dialog(index, 'changed-on-disk')

      expect(options).toMatchObject({
        message: `"${file}" has changed on disk since this tab last read or saved it. Overwrite it?`,
        buttons: ['Cancel', 'Overwrite', 'Reload from project']
      })
    }

    // Strict equality also holds that the second save does not skip the compile check
    expect(guards()).toStrictEqual([
      { base: { path: file, sha256: sha(text) } },
      { base: { path: file, sha256: sha(changed) } }
    ])
    await expect(readFile(file, 'utf8')).resolves.toBe(changedAgain)
    expect({ isDirty: isDirty(id), saves: saveCalls().length }).toStrictEqual({
      isDirty: true,
      saves: 2
    })
    expect(screen.getByText('(modified)')).toBeInTheDocument()
  })
})

describe('app save: overwrite', APP_TIMEOUT, () => {
  const conflicts = conflictChecks(['exists-unrelated', 'would-break'])

  beforeAll(loadPreview, LOAD_PREVIEW_TIMEOUT_MS)

  beforeEach(setUp)

  afterEach(tearDown)

  afterAll(conflicts.afterAll)

  it('overwrite on a file this tab did not write retries against the bytes it was shown', async () => {
    expect.hasAssertions()

    await mkdir(path.join(temporary.root, 'js', 'plugins'), { recursive: true })
    await writeFile(fileIn('Alpha.js'), '// old file\n')
    vi.stubGlobal('api', createMainApi({ answers: [1] }))
    await openProject()
    const id = openTab('Alpha')
    render(<App />)
    pressSave()
    await toastsShow(['success: Plugin saved'])
    conflicts.dialog(0, 'exists-unrelated')

    // Strict equality also holds that the retry does not skip the compile check
    expect(guards()).toStrictEqual([
      { base: null },
      { base: { path: fileIn('Alpha.js'), sha256: sha('// old file\n') } }
    ])

    const bytes = await readFile(fileIn('Alpha.js'))

    expect(bytes.toString('utf8')).toBe(generatePlugin(plugin()))
    expect(baseOf(id)).toStrictEqual({ path: fileIn('Alpha.js'), sha256: sha(bytes) })
  })

  it('overwrite on code that would stop the file compiling skips only that check', async () => {
    expect.hasAssertions()

    vi.stubGlobal('api', createMainApi({ answers: [1] }))
    await openProject()
    const id = openTab('Alpha')
    render(<App />)
    pressSave()
    await toastsShow(['success: Plugin saved'])
    const compiling = await readFile(fileIn('Alpha.js'))
    act(() => {
      usePluginStore.getState().setCustomCode('let broken = ;')
    })
    pressSave()
    await toastCount(3)
    const options = conflicts.dialog(0, 'would-break')
    const written = await readFile(fileIn('Alpha.js'), 'utf8')
    // The prompt and the warning both name the line of the file that does not compile
    const brokenLine = written.split('\n').findIndex((line) => line.includes('let broken = ;')) + 1
    const shownFile = escaped(fileIn('Alpha.js'))

    expect(options.message).toMatch(
      new RegExp(
        String.raw`^Saving would stop "${shownFile}" from compiling \(line ${brokenLine}: .+\)\. Overwrite it anyway\?$`
      )
    )

    const base = { path: fileIn('Alpha.js'), sha256: sha(compiling) }

    expect({ guards: guards().slice(1), isDirty: isDirty(id) }).toStrictEqual({
      guards: [{ base }, { base, overwriteBroken: true }],
      isDirty: false
    })
    // The second toast, then the third, one per line
    expect(toasts().slice(1).join('\n')).toMatch(
      /^success: Plugin saved\nwarning: Saved, but the file does not compile \(line \d+\): .+/
    )
    expect(written).toContain('let broken = ;')
    expect(
      screen.getByText(new RegExp(String.raw`does not compile \(line ${brokenLine}\)`))
    ).toBeInTheDocument()
  })
})

describe('app save: undo and redo around a save', APP_TIMEOUT, () => {
  beforeAll(loadPreview, LOAD_PREVIEW_TIMEOUT_MS)

  beforeEach(setUp)

  afterEach(tearDown)

  it('undo after a save marks the tab unsaved', async () => {
    expect.hasAssertions()

    vi.stubGlobal('api', createMainApi({ chosen: () => path.join(temporary.root, 'Chosen.js') }))
    const id = openTab()
    render(<App />)
    await historyHolds(1)
    editMeta({ name: 'Alpha' })
    await historyHolds(2)
    pressSave()
    await toastsShow(['success: Plugin saved'])

    expect(isDirty(id)).toBe(false)

    pressUndo()

    expect(useHistoryStore.getState().future).toHaveLength(1)
    expect(isDirty(id)).toBe(true)
  })

  it('redo after a save marks the tab unsaved', async () => {
    expect.hasAssertions()

    vi.stubGlobal('api', createMainApi({ chosen: () => path.join(temporary.root, 'Chosen.js') }))
    const id = openTab()
    render(<App />)
    await historyHolds(1)
    editMeta({ name: 'Alpha' })
    await historyHolds(2)
    pressUndo()
    pressSave()
    await toastsShow(['success: Plugin saved'])

    expect(isDirty(id)).toBe(false)

    pressRedo()

    expect(useHistoryStore.getState().future).toHaveLength(0)
    expect(isDirty(id)).toBe(true)
  })

  it('one undo after one edit restores the state before the edit, and redo applies it again', async () => {
    expect.hasAssertions()

    vi.stubGlobal('api', createMainApi())
    openTab()
    render(<App />)
    await historyHolds(1)
    editMeta({ name: 'Alpha' })
    await historyHolds(2)
    pressUndo()

    expect(plugin().meta.name).toBe('NewPlugin')

    pressRedo()

    expect(plugin().meta.name).toBe('Alpha')
  })
})

describe('app save: undo and redo', APP_TIMEOUT, () => {
  beforeAll(loadPreview, LOAD_PREVIEW_TIMEOUT_MS)

  beforeEach(setUp)

  afterEach(tearDown)

  it('undo steps back through two edits one at a time, and redo forward again', async () => {
    expect.hasAssertions()

    vi.stubGlobal('api', createMainApi())
    openTab()
    render(<App />)
    await historyHolds(1)
    editMeta({ name: 'Alpha' })
    await historyHolds(2)
    editMeta({ name: 'Beta' })
    await historyHolds(3)
    const names: string[] = []
    for (const press of [pressUndo, pressUndo, pressUndo, pressRedo, pressRedo, pressRedo]) {
      press()
      names.push(plugin().meta.name)
    }

    expect(names).toStrictEqual(['Alpha', 'NewPlugin', 'NewPlugin', 'Alpha', 'Beta', 'Beta'])
  })

  it('undo shows the select options a parameter had before the last typed option', async () => {
    expect.hasAssertions()

    vi.stubGlobal('api', createMainApi())
    openTab()
    render(<App />)
    const user = userEvent.setup()
    await user.click(screen.getByRole('tab', { name: 'Parameters' }))
    await user.click(screen.getByRole('button', { name: 'Add Parameter' }))
    await user.click(comboboxShowing('String'))
    await user.click(await screen.findByRole('option', { name: /^Select/ }))
    const options = (): HTMLElement => screen.getByPlaceholderText(/^option1\|Option 1/)
    await user.type(options(), 'a|')
    // Outlasts the app's delay before it records an edit, so undo returns to this state
    await new Promise((resolve) => setTimeout(resolve, 600))
    await user.type(options(), 'b')

    expect(options()).toHaveValue('a|b')

    pressUndo()

    expect(options()).toHaveValue('a')
  })

  it('undo right after an edit, before it is recorded, restores the state before the edit', async () => {
    expect.hasAssertions()

    vi.stubGlobal('api', createMainApi())
    openTab()
    render(<App />)
    await historyHolds(1)
    editMeta({ name: 'Alpha' })
    pressUndo()

    expect(plugin().meta.name).toBe('NewPlugin')

    pressRedo()

    expect(plugin().meta.name).toBe('Alpha')
  })
})
