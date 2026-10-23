// Saving from the keyboard: Ctrl+S saves the active tab into the open project, Save All
// (Ctrl+Shift+S) every unsaved tab. Behind `window.api` sit the main-process save and load
// functions, writing to a fresh temporary project, so every conflict is the file check's own.
import { createHash } from 'crypto'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'fs/promises'
import { tmpdir } from 'os'
import { dirname, join } from 'path'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../../src/renderer/src/App'
import { savePluginFile } from '../../src/main/ipc/plugin'
import { generatePlugin } from '../../src/renderer/src/lib/generator'
import { reloadFromProject } from '../../src/renderer/src/lib/raw-mode'
import {
  useHistoryStore,
  usePluginStore,
  useProjectStore,
  useToastStore
} from '../../src/renderer/src/stores'
import { createEmptyPlugin, toBaseline } from '../../src/renderer/src/types/plugin'
import type { PluginDefinition } from '../../src/renderer/src/types/plugin'
import { IPC_CHANNELS } from '../../src/shared/ipc-types'
import type { MessageDialogOptions, SaveConflict } from '../../src/shared/ipc-types'
import { copyFixtureProject } from '../helpers/fixture-project'
import { createMainApi, viaIpc } from './support/main-api'
import { resetStores } from './support/reset-stores'

const FILE = 'Fixture_HandWritten.js'

let root: string
const cleanups: string[] = []

const sha = (bytes: string | Buffer): string => createHash('sha256').update(bytes).digest('hex')

const fileIn = (name: string, project = root): string => join(project, 'js', 'plugins', name)

async function openProject(path = root): Promise<void> {
  const project = { ...(await window.api.project.load(path)), path }
  act(() => useProjectStore.getState().setProject(project))
}

/** Opens a new plugin as the active tab; a `name` is typed into it, which leaves it unsaved. */
function openTab(name?: string, description?: string): string {
  const plugin = createEmptyPlugin()
  act(() => {
    usePluginStore.getState().openPlugin(plugin)
    if (name !== undefined) usePluginStore.getState().updateMeta({ name })
    if (description !== undefined) usePluginStore.getState().updateMeta({ description })
  })
  return plugin.id
}

/** Opens `file` of `project` as the plugin browser does: the tab and the file it was read from. */
async function openFromProject(project: string, file: string): Promise<string> {
  const loaded = await window.api.plugin.load(project, file)
  act(() => {
    usePluginStore.getState().openPlugin(loaded.plugin)
    usePluginStore
      .getState()
      .setBase(loaded.plugin.id, { path: loaded.path, sha256: loaded.sha256 })
  })
  return loaded.plugin.id
}

async function copyProject(): Promise<string> {
  const project = await copyFixtureProject()
  cleanups.push(dirname(project))
  return project
}

function deferred<T>(): { promise: Promise<T>; resolve: (value: T) => void } {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((r) => (resolve = r))
  return { promise, resolve }
}

/** A save into the project that waits for `gate` before it reaches main. */
const heldSave = (gate: Promise<void>) =>
  vi.fn(async (...args: Parameters<typeof savePluginFile>) => {
    await gate
    return savePluginFile(...args)
  })

const pressSave = (): void => {
  fireEvent.keyDown(window, { key: 's', code: 'KeyS', ctrlKey: true })
}

const pressSaveAll = (): void => {
  fireEvent.keyDown(window, { key: 'S', code: 'KeyS', ctrlKey: true, shiftKey: true })
}

const pressUndo = (): void => {
  fireEvent.keyDown(window, { key: 'z', code: 'KeyZ', ctrlKey: true })
}

const pressRedo = (): void => {
  fireEvent.keyDown(window, { key: 'Z', code: 'KeyZ', ctrlKey: true, shiftKey: true })
}

/** Waits for the app's delayed history record to hold `count` states of the tab. */
const historyHolds = (count: number): Promise<void> =>
  waitFor(() => expect(useHistoryStore.getState().past).toHaveLength(count))

/** Lets a save that is not waiting on the test run to its end. */
const settle = async (): Promise<void> => {
  for (let i = 0; i < 5; i++) await act(async () => {})
}

const toasts = (): string[] => useToastStore.getState().toasts.map((t) => `${t.type}: ${t.message}`)

const plugin = (): PluginDefinition => usePluginStore.getState().plugin

const isDirty = (id: string): boolean => usePluginStore.getState().dirtyByPluginId[id] ?? false

const guards = () => vi.mocked(window.api.plugin.save).mock.calls.map((call) => call[3])

const messages = (): MessageDialogOptions[] =>
  vi.mocked(window.api.dialog.message).mock.calls.map((call) => call[0])

const checkedKinds = new Set<SaveConflict>()
let dialogsChecked = 0

/** The `index`th message dialog, checked as a save conflict's. */
function conflictDialog(index: number, kind: SaveConflict): MessageDialogOptions {
  const options = messages()[index]
  expect(options.title).toBe('Overwrite file?')
  checkedKinds.add(kind)
  dialogsChecked++
  return options
}

const escaped = (text: string): string => text.replace(/[\\^$.*+?()[\]{}|/]/g, '\\$&')

// Each case renders the whole app, which takes seconds on a cold start
describe('saving from the keyboard', { timeout: 30_000 }, () => {
  beforeEach(async () => {
    resetStores()
    // The build defines this; the status bar shows it.
    vi.stubGlobal('__APP_VERSION__', '0.0.0-test')
    root = await mkdtemp(join(tmpdir(), 'app-save-'))
  })

  afterEach(async () => {
    cleanup()
    vi.unstubAllGlobals()
    await rm(root, { recursive: true, force: true })
    for (const dir of cleanups.splice(0)) await rm(dir, { recursive: true, force: true })
  })

  it("a second new plugin with the default name asks before replacing the first one's file", async () => {
    window.api = createMainApi()
    await openProject()
    const first = openTab()
    const second = openTab(undefined, 'The second plugin')
    render(<App />)
    act(() => usePluginStore.getState().setActivePlugin(first))
    pressSave()
    await waitFor(() => expect(toasts()).toEqual(['success: Plugin saved']))
    const written = await readFile(fileIn('NewPlugin.js'), 'utf8')

    act(() => usePluginStore.getState().setActivePlugin(second))
    pressSave()
    await waitFor(() => expect(messages()).toHaveLength(1))
    await settle()
    const options = conflictDialog(0, 'exists-unrelated')
    expect(options.message).toBe(
      `"${fileIn('NewPlugin.js')}" already exists and was not opened or saved by this tab. Overwrite it?`
    )
    expect(options.buttons).toEqual(['Cancel', 'Overwrite'])
    expect(await readFile(fileIn('NewPlugin.js'), 'utf8')).toBe(written)
    expect(isDirty(second)).toBe(true)
    expect(usePluginStore.getState().baseByPluginId[second]).toBeUndefined()
    expect(toasts()).toEqual(['success: Plugin saved'])
  })

  it('Ctrl+S without a project asks where to save and writes there', async () => {
    const target = join(root, 'Chosen.js')
    window.api = createMainApi({ chosen: () => target })
    const id = openTab('Alpha')
    render(<App />)
    pressSave()
    await waitFor(() => expect(toasts()).toEqual(['success: Plugin saved']))
    expect(window.api.dialog.saveFile).toHaveBeenCalledWith({
      defaultPath: 'Alpha.js',
      filters: [{ name: 'JavaScript Files', extensions: ['js'] }]
    })
    const bytes = await readFile(target)
    expect(bytes.toString('utf8')).toBe(generatePlugin(plugin()))
    expect(isDirty(id)).toBe(false)
    expect(usePluginStore.getState().savedPathsByPluginId[id]).toBe(target)
    expect(usePluginStore.getState().baseByPluginId[id]).toEqual({
      path: target,
      sha256: sha(bytes)
    })
  })

  it('one Ctrl+S writes the open plugins to storage once', async () => {
    window.api = createMainApi()
    await openProject()
    openTab('Alpha')
    render(<App />)
    await settle()
    const setItem = vi.spyOn(Storage.prototype, 'setItem')
    pressSave()
    await waitFor(() => expect(toasts()).toEqual(['success: Plugin saved']))
    await settle()
    const writes = setItem.mock.calls.filter(([key]) => key === 'mz-plugin-studio-plugin')
    setItem.mockRestore()
    expect(writes).toHaveLength(1)
  })

  it.each([
    ['Ctrl+S', pressSave, 'success: Plugin saved'],
    ['Save All', pressSaveAll, 'success: 1 plugin saved']
  ])('an edit made while %s is in flight stays unsaved', async (_label, press, toast) => {
    const gate = deferred<void>()
    window.api = createMainApi({ overrides: { plugin: { save: heldSave(gate.promise) } } })
    await openProject()
    const id = openTab('Alpha')
    render(<App />)
    press()
    await waitFor(() => expect(window.api.plugin.save).toHaveBeenCalledTimes(1))
    act(() => usePluginStore.getState().updateMeta({ description: 'edited during save' }))
    await act(async () => gate.resolve())
    await waitFor(() => expect(toasts()).toContain(toast))
    expect(plugin().meta.description).toBe('edited during save')
    expect(isDirty(id)).toBe(true)
    const bytes = await readFile(fileIn('Alpha.js'))
    expect(usePluginStore.getState().baseByPluginId[id]).toEqual({
      path: fileIn('Alpha.js'),
      sha256: sha(bytes)
    })
  })

  it('Save All skips a tab whose file it did not write, names it and every tab not saved in one report and saves the rest', async () => {
    await mkdir(join(root, 'js', 'plugins'), { recursive: true })
    await writeFile(fileIn('Beta.js'), 'unrelated')
    window.api = createMainApi({
      overrides: {
        plugin: {
          save: vi.fn(
            viaIpc(IPC_CHANNELS.PLUGIN_SAVE, async (...args: Parameters<typeof savePluginFile>) => {
              if (args[1] === 'Gamma.js') throw new Error('disk full')
              return savePluginFile(...args)
            })
          )
        }
      }
    })
    await openProject()
    const [alpha, beta, gamma, unnamed] = [
      openTab('Alpha'),
      openTab('Beta'),
      openTab('Gamma'),
      openTab('')
    ]
    render(<App />)
    pressSaveAll()
    await waitFor(() =>
      expect(toasts()).toEqual([
        'warning: Saved 1, failed 1. Not saved, a different file with this name exists: Beta. Not saved, no plugin name: 1 tab. Failed: Gamma (disk full).'
      ])
    )
    expect(useToastStore.getState().toasts[0].duration).toBeGreaterThanOrEqual(10_000)
    expect(await readFile(fileIn('Beta.js'), 'utf8')).toBe('unrelated')
    expect(await readFile(fileIn('Alpha.js'), 'utf8')).toContain('@target MZ')
    expect([alpha, beta, gamma, unnamed].map(isDirty)).toEqual([false, true, true, true])
    expect(window.api.dialog.message).not.toHaveBeenCalled()
  })

  it('Save All of two new plugins with one name saves the first and skips the second', async () => {
    window.api = createMainApi()
    await openProject()
    const first = openTab('NewPlugin', 'The first plugin')
    const second = openTab('NewPlugin', 'The second plugin')
    const firstCode = generatePlugin(usePluginStore.getState().openPlugins[0])
    render(<App />)
    pressSaveAll()
    await waitFor(() =>
      expect(toasts()).toEqual([
        'warning: Saved 1. Not saved, a different file with this name exists: NewPlugin.'
      ])
    )
    expect(await readFile(fileIn('NewPlugin.js'), 'utf8')).toBe(firstCode)
    expect([first, second].map(isDirty)).toEqual([false, true])
  })

  it('a tab opened from the plugin browser and saved records the file it wrote', async () => {
    const project = await copyProject()
    window.api = createMainApi({ overrides: { plugin: { list: vi.fn(async () => [FILE]) } } })
    await openProject(project)
    render(<App />)
    fireEvent.keyDown(window, { key: 'E', code: 'KeyE', ctrlKey: true, shiftKey: true })
    fireEvent.click(await screen.findByTitle(FILE))
    await waitFor(() => expect(plugin().importedFrom).toBe(FILE))
    const id = plugin().id
    act(() => usePluginStore.getState().updateMeta({ description: 'Edited and saved' }))
    const saved = plugin()
    pressSave()
    await waitFor(() => expect(toasts()).toEqual(['success: Plugin saved']))
    const onDisk = await readFile(fileIn(FILE, project))
    const state = usePluginStore.getState()
    expect(onDisk.toString('utf8')).toContain('Edited and saved')
    expect(state.plugin.rawSource).toBe(onDisk.toString('utf8'))
    expect(state.baselineByPluginId[id]).toEqual(toBaseline(saved))
    expect(state.baseByPluginId[id]).toEqual({ path: fileIn(FILE, project), sha256: sha(onDisk) })
    expect(isDirty(id)).toBe(false)
  })

  it('a tab loaded from a file cannot be renamed, and Ctrl+S writes the file it came from', async () => {
    const project = await copyProject()
    window.api = createMainApi()
    await openProject(project)
    const id = await openFromProject(project, FILE)
    render(<App />)
    expect(screen.getByLabelText('Plugin Name')).toHaveAttribute('readonly')
    // A name that differs from the file, as a tab restored from an older version can hold
    act(() => usePluginStore.getState().updateMeta({ name: 'Renamed', description: 'Kept' }))
    pressSave()
    await waitFor(() => expect(toasts()).toEqual(['success: Plugin saved']))
    expect(vi.mocked(window.api.plugin.save).mock.calls.map((call) => call[1])).toEqual([FILE])
    expect(await readFile(fileIn(FILE, project), 'utf8')).toContain('Kept')
    await expect(readFile(fileIn('Renamed.js', project))).rejects.toThrow(/ENOENT/)
    expect(isDirty(id)).toBe(false)
  })

  it("a tab read from another project asks before replacing the open project's file", async () => {
    const first = await copyProject()
    const second = await copyProject()
    window.api = createMainApi()
    const id = await openFromProject(first, FILE)
    act(() => usePluginStore.getState().updateMeta({ description: 'Edited in the first' }))
    await openProject(second)
    const firstBytes = await readFile(fileIn(FILE, first))
    const secondBytes = await readFile(fileIn(FILE, second))
    render(<App />)
    pressSave()
    await waitFor(() => expect(messages()).toHaveLength(1))
    await settle()
    const options = conflictDialog(0, 'exists-unrelated')
    expect(options.message).toBe(
      `"${fileIn(FILE, second)}" already exists and was not opened or saved by this tab. Overwrite it?`
    )
    expect(await readFile(fileIn(FILE, second))).toEqual(secondBytes)
    expect(await readFile(fileIn(FILE, first))).toEqual(firstBytes)
    expect(isDirty(id)).toBe(true)
    expect(usePluginStore.getState().baseByPluginId[id]?.path).toBe(fileIn(FILE, first))
  })

  it('Reload of a tab read from another project asks first, and Cancel reads nothing', async () => {
    const first = await copyProject()
    const second = await copyProject()
    window.api = createMainApi()
    const id = await openFromProject(first, FILE)
    await openProject(second)
    expect(await act(() => reloadFromProject(id))).toBe(false)
    expect(messages()).toEqual([
      {
        type: 'question',
        title: 'Reload from another project?',
        message: `This tab was last read from or saved to ${fileIn(FILE, first)}, which is not in the open project's plugins folder. Reload it from ${fileIn(FILE, second)} instead?`,
        buttons: ['Cancel', 'Reload']
      }
    ])
    expect(window.api.plugin.readRaw).not.toHaveBeenCalled()
    expect(usePluginStore.getState().baseByPluginId[id]?.path).toBe(fileIn(FILE, first))
  })

  it("Reload of a tab read from another project, confirmed, takes the open project's file", async () => {
    const first = await copyProject()
    const second = await copyProject()
    const text = `${await readFile(fileIn(FILE, second), 'utf8')}// the second copy\n`
    await writeFile(fileIn(FILE, second), text)
    window.api = createMainApi({ answers: [1] })
    const id = await openFromProject(first, FILE)
    await openProject(second)
    expect(await act(() => reloadFromProject(id))).toBe(true)
    expect(messages()).toHaveLength(1)
    expect(plugin().rawSource).toBe(text)
    expect(usePluginStore.getState().baseByPluginId[id]).toEqual({
      path: fileIn(FILE, second),
      sha256: sha(text)
    })
  })

  it('Reload of a tab in the open project, or with no file recorded, does not ask', async () => {
    const project = await copyProject()
    window.api = createMainApi()
    await openProject(project)
    const read = await openFromProject(project, FILE)
    expect(await act(() => reloadFromProject(read))).toBe(true)
    const loaded = await window.api.plugin.load(project, FILE)
    act(() => usePluginStore.getState().openPlugin(loaded.plugin))
    expect(await act(() => reloadFromProject(loaded.plugin.id))).toBe(true)
    expect(messages()).toEqual([])
    expect(usePluginStore.getState().baseByPluginId[loaded.plugin.id]?.path).toBe(
      fileIn(FILE, project)
    )
  })

  it('a file changed on disk while its prompt is open is asked about again', async () => {
    const project = await copyProject()
    const path = fileIn(FILE, project)
    const text = await readFile(path, 'utf8')
    const changed = `${text}\n// changed elsewhere\n`
    const changedAgain = `${text}\n// changed elsewhere again\n`
    let asked = 0
    window.api = createMainApi({
      overrides: {
        dialog: {
          message: vi.fn(async () => {
            asked++
            if (asked > 1) return 0
            await writeFile(path, changedAgain)
            return 1
          })
        }
      }
    })
    await openProject(project)
    const id = await openFromProject(project, FILE)
    render(<App />)
    await writeFile(path, changed)
    act(() => usePluginStore.getState().updateMeta({ description: 'Edited' }))
    pressSave()
    await waitFor(() => expect(messages()).toHaveLength(2))
    await settle()
    for (const index of [0, 1]) {
      const options = conflictDialog(index, 'changed-on-disk')
      expect(options.message).toBe(
        `"${path}" has changed on disk since this tab last read or saved it. Overwrite it?`
      )
      expect(options.buttons).toEqual(['Cancel', 'Overwrite', 'Reload from project'])
    }
    expect(guards()).toEqual([
      { base: { path, sha256: sha(text) } },
      { base: { path, sha256: sha(changed) } }
    ])
    expect(guards()[1]).not.toHaveProperty('overwriteBroken')
    expect(await readFile(path, 'utf8')).toBe(changedAgain)
    expect(isDirty(id)).toBe(true)
  })

  it('Overwrite on a file this tab did not write retries against the bytes it was shown', async () => {
    await mkdir(join(root, 'js', 'plugins'), { recursive: true })
    await writeFile(fileIn('Alpha.js'), '// old file\n')
    window.api = createMainApi({ answers: [1] })
    await openProject()
    const id = openTab('Alpha')
    render(<App />)
    pressSave()
    await waitFor(() => expect(toasts()).toEqual(['success: Plugin saved']))
    conflictDialog(0, 'exists-unrelated')
    expect(guards()).toEqual([
      { base: null },
      { base: { path: fileIn('Alpha.js'), sha256: sha('// old file\n') } }
    ])
    expect(guards()[1]).not.toHaveProperty('overwriteBroken')
    const bytes = await readFile(fileIn('Alpha.js'))
    expect(bytes.toString('utf8')).toBe(generatePlugin(plugin()))
    expect(usePluginStore.getState().baseByPluginId[id]).toEqual({
      path: fileIn('Alpha.js'),
      sha256: sha(bytes)
    })
  })

  it('Overwrite on code that would stop the file compiling skips only that check', async () => {
    window.api = createMainApi({ answers: [1] })
    await openProject()
    const id = openTab('Alpha')
    render(<App />)
    pressSave()
    await waitFor(() => expect(toasts()).toEqual(['success: Plugin saved']))
    const compiling = await readFile(fileIn('Alpha.js'))
    act(() => usePluginStore.getState().setCustomCode('let broken = ;'))
    pressSave()
    await waitFor(() => expect(toasts()).toHaveLength(3))
    const options = conflictDialog(0, 'would-break')
    expect(options.message).toMatch(
      new RegExp(
        `^Saving would stop "${escaped(fileIn('Alpha.js'))}" from compiling \\(line \\d+: .+\\)\\. Overwrite it anyway\\?$`
      )
    )
    const base = { path: fileIn('Alpha.js'), sha256: sha(compiling) }
    expect(guards().slice(1)).toEqual([{ base }, { base, overwriteBroken: true }])
    expect(toasts()[1]).toBe('success: Plugin saved')
    expect(toasts()[2]).toMatch(/^warning: Saved, but the file does not compile \(line \d+\): .+/)
    expect(await readFile(fileIn('Alpha.js'), 'utf8')).toContain('let broken = ;')
    expect(isDirty(id)).toBe(false)
  })

  it('undo after a save marks the tab unsaved', async () => {
    window.api = createMainApi({ chosen: () => join(root, 'Chosen.js') })
    const id = openTab()
    render(<App />)
    await historyHolds(1)
    act(() => usePluginStore.getState().updateMeta({ name: 'Alpha' }))
    await historyHolds(2)
    pressSave()
    await waitFor(() => expect(toasts()).toEqual(['success: Plugin saved']))
    expect(isDirty(id)).toBe(false)
    pressUndo()
    expect(useHistoryStore.getState().future).toHaveLength(1)
    expect(isDirty(id)).toBe(true)
  })

  it('redo after a save marks the tab unsaved', async () => {
    window.api = createMainApi({ chosen: () => join(root, 'Chosen.js') })
    const id = openTab()
    render(<App />)
    await historyHolds(1)
    act(() => usePluginStore.getState().updateMeta({ name: 'Alpha' }))
    await historyHolds(2)
    pressUndo()
    pressSave()
    await waitFor(() => expect(toasts()).toEqual(['success: Plugin saved']))
    expect(isDirty(id)).toBe(false)
    pressRedo()
    expect(useHistoryStore.getState().future).toHaveLength(0)
    expect(isDirty(id)).toBe(true)
  })

  it('checked the dialog of every save conflict', () => {
    console.log(`save conflict dialogs checked ${dialogsChecked}`)
    expect(dialogsChecked).toBeGreaterThan(0)
    expect([...checkedKinds].sort()).toEqual(['changed-on-disk', 'exists-unrelated', 'would-break'])
  })
})
