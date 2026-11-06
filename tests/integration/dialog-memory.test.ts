// Where the dialogs open, through the registered handlers: the folder dialog beside the project
// the renderer suggests, every dialog in the folder its kind last chose while it is still there,
// kept across restarts in the user data folder, and a plugin's save and open dialogs in the open
// project's plugins folder. Each case starts from fresh main modules, as a restart does.
import type * as Fs from 'node:fs'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import type {
  BaseWindow,
  OpenDialogOptions,
  OpenDialogReturnValue,
  SaveDialogOptions,
  SaveDialogReturnValue
} from 'electron'
import { afterAll, afterEach, describe, expect, it, vi } from 'vitest'
import type * as AtomicWrite from '../../src/main/atomic-write'
import { afterAllTests } from '../helpers/after-all-tests'
import { copyFixtureProject } from '../helpers/fixture-project'

vi.mock<{ ipcMain: object }>(import('electron'), () => ({ ipcMain: {} }))

const { statSync } = vi.hoisted(() => ({ statSync: vi.fn<typeof Fs.statSync>() }))
// One mock for both names: the runner treats `fs` and `node:fs` as the same module
vi.mock<Record<string, unknown>>(import('node:fs'), async (importOriginal) => {
  const fs = await importOriginal<typeof Fs>()
  statSync.mockImplementation(fs.statSync)
  return { ...fs, default: { ...fs, statSync }, statSync }
})

const FOLDERS_FILE = 'dialog-folders.json'

type SaveArguments = [BaseWindow, SaveDialogOptions] | [SaveDialogOptions]

/**
The options of a dialog call, with or without its window
*/
function optionsOf<T>(args: [BaseWindow, T] | [T]): T {
  return args.length === 1 ? args[0] : args[1]
}

// Describe blocks run in shuffled order: the count prints once the last of them ends
const counted = { cases: 0, describes: 0 }
const DESCRIBES = 6

/**
How many dialog calls the tests checked, once every describe below has run, and that some ran
*/
function caseProblems(): string[] {
  counted.describes += 1
  if (counted.describes < DESCRIBES) return []
  process.stdout.write(`dialog memory: cases ${String(counted.cases)}\n`)
  return counted.cases > 0 ? [] : ['no dialog case ran']
}

const roots: string[] = []

/**
A fresh folder holding two projects' parent folders and a folder of parameter files
*/
async function freshRoot(): Promise<string> {
  const root = await mkdtemp(path.join(tmpdir(), 'dialog-memory-'))
  roots.push(root)
  await mkdir(path.join(root, 'Games', 'Proj'), { recursive: true })
  await mkdir(path.join(root, 'B', 'Proj2'), { recursive: true })
  await mkdir(path.join(root, 'params'), { recursive: true })
  return root
}

async function removeRoots(): Promise<void> {
  await Promise.all(
    roots.splice(0).map(async (root) => {
      await rm(root, { recursive: true, force: true })
    })
  )
}

/**
Fresh main modules on a stand-in for `ipcMain`, keeping what lasts across restarts in `userData`
when given; the dialogs record their options and answer from queues
*/
async function session(userData?: string) {
  vi.resetModules()
  const { registerMainHandlers } = await import('../helpers/fake-ipc')
  const { default: log } = await import('electron-log/main')
  if (userData !== undefined) {
    const access = await import('../../src/main/file-access')
    access.setProjectRootsDirectory(userData)
  }
  const opens: OpenDialogReturnValue[] = []
  const saves: SaveDialogReturnValue[] = []
  const recorded: { method: string; options: OpenDialogOptions | SaveDialogOptions }[] = []
  type OpenArguments = [BaseWindow, OpenDialogOptions] | [OpenDialogOptions]
  const dialog = {
    showOpenDialog: async (...args: OpenArguments): Promise<OpenDialogReturnValue> => {
      recorded.push({ method: 'showOpenDialog', options: optionsOf(args) })
      await Promise.resolve()
      return opens.shift() ?? { canceled: true, filePaths: [] }
    },
    showSaveDialog: async (...args: SaveArguments): Promise<SaveDialogReturnValue> => {
      recorded.push({ method: 'showSaveDialog', options: optionsOf(args) })
      await Promise.resolve()
      return saves.shift() ?? { canceled: true, filePath: '' }
    }
  }
  const ipc = registerMainHandlers(dialog)
  /**
  The options of the dialog the call on `channel` showed
  */
  const shown = async (
    channel: string,
    ...args: unknown[]
  ): Promise<OpenDialogOptions | SaveDialogOptions> => {
    counted.cases += 1
    const before = recorded.length
    await ipc.invoke(channel, ...args)
    const last = recorded.at(-1)

    expect(recorded).toHaveLength(before + 1)

    if (last === undefined) throw new Error(`${channel} showed no dialog`)
    return last.options
  }
  return { ipc, dialog, log, opens, saves, shown }
}

/**
The file of dialog folders in `userData`; a dialog answers before it is written
*/
async function readFoldersFile(userData: string): Promise<unknown> {
  const file: unknown = JSON.parse(await readFile(path.join(userData, FOLDERS_FILE), 'utf8'))
  return file
}

const PARAMS = [{ name: 'MZ Parameters', extensions: ['mzparams'] }]
const MD = [{ name: 'Markdown Files', extensions: ['md'] }]

describe('dialog memory: suggested folders', () => {
  afterEach(removeRoots)

  afterAll(afterAllTests(caseProblems))

  it('opens the folder dialog beside the suggested project, then where it last chose', async () => {
    expect.hasAssertions()

    const root = await freshRoot()
    const { opens, shown } = await session()
    const seed = path.join(root, 'Games', 'Proj')
    opens.push({ canceled: false, filePaths: [path.join(root, 'B', 'Proj2')] })
    const first = await shown('dialog:open-folder', { defaultPath: seed })

    expect(first.defaultPath).toBe(path.join(root, 'Games'))

    // A folder chosen once is where the next folder dialog without a suggestion opens
    const next = await shown('dialog:open-folder')

    expect(next.defaultPath).toBe(path.join(root, 'B'))

    // That one was cancelled: the folder stays
    const third = await shown('dialog:open-folder', {})

    expect(third.defaultPath).toBe(path.join(root, 'B'))
  })

  it('opens without a default when the suggested parent is gone and nothing was chosen', async () => {
    expect.hasAssertions()

    const root = await freshRoot()
    const { shown } = await session()
    const options = await shown('dialog:open-folder', {
      defaultPath: path.join(root, 'Gone', 'Proj')
    })

    expect(options).not.toHaveProperty('defaultPath')
  })

  it('never opens at a network path the renderer suggests', async () => {
    expect.hasAssertions()

    const { shown } = await session()
    for (const defaultPath of ['\\\\server\\share\\Proj', '//server/share/Proj']) {
      const options = await shown('dialog:open-folder', { defaultPath })

      expect(options).not.toHaveProperty('defaultPath')
    }
  })

  it('checks the suggested folder without blocking the main process', async () => {
    expect.hasAssertions()

    const root = await freshRoot()
    const { shown } = await session()
    statSync.mockClear()
    const beside = await shown('dialog:open-folder', {
      defaultPath: path.join(root, 'Games', 'Proj')
    })

    expect(beside.defaultPath).toBe(path.join(root, 'Games'))

    const gone = await shown('dialog:open-folder', { defaultPath: path.join(root, 'Gone', 'Proj') })

    expect(gone).not.toHaveProperty('defaultPath')
    expect(statSync).not.toHaveBeenCalled()
  })
})

describe('dialog memory: kinds of file', () => {
  afterEach(removeRoots)

  afterAll(afterAllTests(caseProblems))

  it('opens a file dialog where the same kind of file was last chosen', async () => {
    expect.hasAssertions()

    const root = await freshRoot()
    const { opens, shown } = await session()
    const params = [{ name: 'MZ Parameters', extensions: ['mzparams'] }]
    const unchosen = await shown('dialog:open-file', { filters: params })

    expect(unchosen).not.toHaveProperty('defaultPath')

    opens.push({ canceled: false, filePaths: [path.join(root, 'params', 'Synthetic.mzparams')] })
    await shown('dialog:open-file', { filters: params })

    const again = await shown('dialog:open-file', { filters: params })

    expect(again.defaultPath).toBe(path.join(root, 'params'))

    const script = await shown('dialog:open-file', {})

    expect(script).not.toHaveProperty('defaultPath')

    // The window cannot pick the folder
    const asked = await shown('dialog:open-file', {
      defaultPath: path.join(root, 'B'),
      filters: params
    })

    expect(asked.defaultPath).toBe(path.join(root, 'params'))
  })

  it("saves and opens a plugin in the open project's plugins folder", async () => {
    expect.hasAssertions()

    const root = await freshRoot()
    const project = await copyFixtureProject()
    try {
      const { ipc, opens, saves, shown } = await session()
      opens.push({ canceled: false, filePaths: [project] })
      await shown('dialog:open-folder')
      await ipc.invoke('project:load', project)

      const plugin = await shown('dialog:save-file', { defaultPath: 'Name.js' })

      expect(plugin.defaultPath).toBe(path.join(project, 'js', 'plugins', 'Name.js'))

      const script = await shown('dialog:open-file', {})

      expect(script.defaultPath).toBe(path.join(project, 'js', 'plugins'))

      // Other kinds open where their kind last saved, beside nothing before that
      const md = [{ name: 'Markdown Files', extensions: ['md'] }]
      const readme = await shown('dialog:save-file', { defaultPath: 'Name_README.md', filters: md })

      expect(readme.defaultPath).toBe('Name_README.md')

      saves.push({ canceled: false, filePath: path.join(root, 'B', 'Name_README.md') })
      await shown('dialog:save-file', { defaultPath: 'Name_README.md', filters: md })
      const next = await shown('dialog:save-file', { defaultPath: 'Other_README.md', filters: md })

      expect(next.defaultPath).toBe(path.join(root, 'B', 'Other_README.md'))
    } finally {
      await rm(path.dirname(project), { recursive: true, force: true })
    }
  })
})

describe('dialog memory: after a restart', () => {
  afterEach(removeRoots)

  afterAll(afterAllTests(caseProblems))

  it('opens each kind of dialog where it last chose after a restart', async () => {
    expect.hasAssertions()

    const root = await freshRoot()
    const userData = await mkdtemp(path.join(root, 'user-data-'))
    const first = await session(userData)
    first.opens.push({
      canceled: false,
      filePaths: [path.join(root, 'params', 'Synthetic.mzparams')]
    })
    await first.shown('dialog:open-file', { filters: PARAMS })
    first.opens.push({ canceled: false, filePaths: [path.join(root, 'B', 'Proj2')] })
    await first.shown('dialog:open-folder')
    first.saves.push({ canceled: false, filePath: path.join(root, 'B', 'Name_README.md') })
    await first.shown('dialog:save-file', { defaultPath: 'Name_README.md', filters: MD })
    // A plugin opened from one folder and saved to another
    first.opens.push({
      canceled: false,
      filePaths: [path.join(root, 'Games', 'Proj', 'Opened.js')]
    })
    await first.shown('dialog:open-file', {})
    first.saves.push({ canceled: false, filePath: path.join(root, 'params', 'Saved.js') })
    await first.shown('dialog:save-file', { defaultPath: 'Saved.js' })
    await vi.waitFor(async () => {
      await expect(readFoldersFile(userData)).resolves.toStrictEqual({
        folders: {
          'open-file:.mzparams': path.join(root, 'params'),
          'open-folder': path.join(root, 'B'),
          'save-file:.md': path.join(root, 'B'),
          'open-file:.js': path.join(root, 'Games', 'Proj'),
          'save-file:.js': path.join(root, 'params')
        }
      })
    })

    const second = await session(userData)
    const reopened = {
      params: await second.shown('dialog:open-file', { filters: PARAMS }),
      folder: await second.shown('dialog:open-folder'),
      readme: await second.shown('dialog:save-file', {
        defaultPath: 'Other_README.md',
        filters: MD
      }),
      // Open and save of one type keep separate folders
      script: await second.shown('dialog:open-file', {}),
      plugin: await second.shown('dialog:save-file', { defaultPath: 'Next.js' })
    }

    expect(reopened).toMatchObject({
      params: { defaultPath: path.join(root, 'params') },
      folder: { defaultPath: path.join(root, 'B') },
      readme: { defaultPath: path.join(root, 'B', 'Other_README.md') },
      script: { defaultPath: path.join(root, 'Games', 'Proj') },
      plugin: { defaultPath: path.join(root, 'params', 'Next.js') }
    })
    expect(second.log.warn).not.toHaveBeenCalledWith(expect.stringMatching(/^\[dialog\]/))
  })

  it('opens without a default after a restart when the folder a kind last chose is gone', async () => {
    expect.hasAssertions()

    const root = await freshRoot()
    const userData = await mkdtemp(path.join(root, 'user-data-'))
    const gone = path.join(root, 'Gone')
    const folders = { 'open-file:.mzparams': gone, 'open-folder': gone, 'save-file:.md': gone }
    await writeFile(path.join(userData, FOLDERS_FILE), JSON.stringify({ folders }))
    const s = await session(userData)
    const params = await s.shown('dialog:open-file', { filters: PARAMS })
    const folder = await s.shown('dialog:open-folder')

    expect(params).not.toHaveProperty('defaultPath')
    expect(folder).not.toHaveProperty('defaultPath')

    const readme = await s.shown('dialog:save-file', {
      defaultPath: 'Name_README.md',
      filters: MD
    })

    expect(readme.defaultPath).toBe('Name_README.md')
  })
})

describe('dialog memory: drives and network shares', () => {
  afterEach(removeRoots)

  afterAll(afterAllTests(caseProblems))

  it('keeps a folder at the root of a drive across a restart', async () => {
    expect.hasAssertions()

    const root = await freshRoot()
    const userData = await mkdtemp(path.join(root, 'user-data-'))
    const driveRoot = path.parse(root).root
    const first = await session(userData)
    first.saves.push({ canceled: false, filePath: path.join(driveRoot, 'Plugin.js') })
    await first.shown('dialog:save-file', { defaultPath: 'Plugin.js' })
    await vi.waitFor(async () => {
      await expect(readFoldersFile(userData)).resolves.toStrictEqual({
        folders: { 'save-file:.js': driveRoot }
      })
    })

    const second = await session(userData)
    const plugin = await second.shown('dialog:save-file', { defaultPath: 'Next.js' })

    expect(plugin.defaultPath).toBe(path.join(driveRoot, 'Next.js'))
  })

  it('keeps the folder a kind chose before when it then chooses one on a network share', async () => {
    expect.hasAssertions()

    const root = await freshRoot()
    const userData = await mkdtemp(path.join(root, 'user-data-'))
    const s = await session(userData)
    s.saves.push({ canceled: false, filePath: path.join(root, 'B', 'Name_README.md') })
    await s.shown('dialog:save-file', { filters: MD })
    s.saves.push({ canceled: false, filePath: '//server/share/docs/Other_README.md' })
    await s.shown('dialog:save-file', { filters: MD })
    // Written after the network choice, so it shows what that choice left in the file
    s.opens.push({ canceled: false, filePaths: [path.join(root, 'Games', 'Proj')] })
    await s.shown('dialog:open-folder')
    await vi.waitFor(async () => {
      await expect(readFoldersFile(userData)).resolves.toStrictEqual({
        folders: {
          'save-file:.md': path.join(root, 'B'),
          'open-folder': path.join(root, 'Games')
        }
      })
    })
  })
})

describe('dialog memory: reading the file of dialog folders', () => {
  afterEach(removeRoots)

  afterAll(afterAllTests(caseProblems))

  it('ignores a broken file of dialog folders, and never fails on it', async () => {
    expect.hasAssertions()

    const root = await freshRoot()
    const userData = await mkdtemp(path.join(root, 'user-data-'))
    for (const broken of ['not json', 'null', '[]', '{"folders": []}', '{"folders": "x"}']) {
      await writeFile(path.join(userData, FOLDERS_FILE), broken)
      const s = await session(userData)
      const options = await s.shown('dialog:open-file', { filters: PARAMS })

      expect(options).not.toHaveProperty('defaultPath')
      expect(s.log.warn).toHaveBeenCalledWith(expect.stringMatching(/^\[dialog\] Ignoring /))
    }
  })

  it('keeps only local folders of known kinds from the file, and saves without the rest', async () => {
    expect.hasAssertions()

    const root = await freshRoot()
    const userData = await mkdtemp(path.join(root, 'user-data-'))
    const folders = {
      'open-file:.mzparams': path.join(root, 'params'),
      'open-folder': '\\\\server\\share\\Games',
      'save-file:.md': '//server/share/docs',
      'open-file:.json': 'relative/folder',
      'open-file:.exe': path.join(root, 'B'),
      'save-file:.js': 7
    }
    // A key JSON.parse keeps as an own property, which an object of folders must not take as its prototype
    const prototypeKey = `,"__proto__":${JSON.stringify(path.join(root, 'B'))}}}`
    await writeFile(
      path.join(userData, FOLDERS_FILE),
      JSON.stringify({ folders }).replace(/\}\}$/, () => prototypeKey)
    )
    const s = await session(userData)
    const params = await s.shown('dialog:open-file', { filters: PARAMS })
    const folder = await s.shown('dialog:open-folder')

    expect(params.defaultPath).toBe(path.join(root, 'params'))
    expect(folder).not.toHaveProperty('defaultPath')

    const readme = await s.shown('dialog:save-file', {
      defaultPath: 'Name_README.md',
      filters: MD
    })

    expect(readme.defaultPath).toBe('Name_README.md')

    const json = await s.shown('dialog:open-file', {
      filters: [{ name: 'JSON', extensions: ['json'] }]
    })

    expect(json).not.toHaveProperty('defaultPath')

    s.opens.push({ canceled: false, filePaths: [path.join(root, 'B', 'Proj2')] })
    await s.shown('dialog:open-folder')
    await vi.waitFor(async () => {
      await expect(readFoldersFile(userData)).resolves.toStrictEqual({
        folders: {
          'open-file:.mzparams': path.join(root, 'params'),
          'open-folder': path.join(root, 'B')
        }
      })
    })
  })
})

describe('dialog memory: while main writes and replaces', () => {
  afterEach(removeRoots)

  afterAll(afterAllTests(caseProblems))

  it('answers a dialog while the file of dialog folders is still being written', async () => {
    expect.hasAssertions()

    const root = await freshRoot()
    const userData = await mkdtemp(path.join(root, 'user-data-'))
    const write = Promise.withResolvers<boolean>()
    const replaceFile = vi.fn<typeof AtomicWrite.replaceFile>(async () => {
      await write.promise
    })
    vi.doMock(import('../../src/main/atomic-write'), () => ({ replaceFile }))
    try {
      const s = await session(userData)
      const chosen = path.join(root, 'B', 'Name.js')
      s.saves.push({ canceled: false, filePath: chosen })
      counted.cases += 1
      const result = s.ipc.invoke('dialog:save-file', { defaultPath: 'Name.js' })
      const waiting = new Promise<string>((resolve) => {
        setTimeout(() => {
          resolve('still waiting')
        }, 2000)
      })

      await expect(Promise.race([result, waiting])).resolves.toBe(chosen)

      // The write started and has not finished
      await vi.waitFor(() => {
        expect(replaceFile).toHaveBeenCalledWith(
          path.join(userData, FOLDERS_FILE),
          expect.anything(),
          false
        )
      })
    } finally {
      write.resolve(true)
      vi.doUnmock('../../src/main/atomic-write')
    }
  })

  it('uses the save dialog main holds when the call runs', async () => {
    expect.hasAssertions()

    const { ipc, dialog, shown } = await session()
    const replaced: SaveDialogOptions[] = []
    dialog.showSaveDialog = async (...args: SaveArguments): Promise<SaveDialogReturnValue> => {
      replaced.push(optionsOf(args))
      await Promise.resolve()
      return { canceled: true, filePath: '' }
    }
    counted.cases += 1

    await expect(ipc.invoke('dialog:save-file', { defaultPath: 'Name.js' })).resolves.toBeNull()

    expect(replaced).toStrictEqual([expect.objectContaining({ defaultPath: 'Name.js' })])

    // The folder dialog is still the recording one
    await shown('dialog:open-folder')
  })
})
