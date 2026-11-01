// Where the dialogs open, through the registered handlers: the folder dialog beside the project
// the renderer suggests, every dialog in the folder its kind last chose, kept across restarts in
// the user data folder, and a plugin's save and open dialogs in the open project's plugins folder.
// Each case starts from fresh main modules, as a restart does.
import type * as Fs from 'fs'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'fs/promises'
import { tmpdir } from 'os'
import { dirname, join } from 'path'
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { DialogPort } from '../../src/main/ipc/handlers'
import { copyFixtureProject } from '../helpers/fixture-project'

vi.mock('electron', () => ({ ipcMain: {} }))

const { statSync } = vi.hoisted(() => ({ statSync: vi.fn() }))
vi.mock('fs', async (importOriginal) => {
  const fs = await importOriginal<typeof Fs>()
  statSync.mockImplementation(fs.statSync)
  return { ...fs, default: { ...fs, statSync }, statSync }
})

const FOLDERS_FILE = 'dialog-folders.json'

let cases = 0
let root: string

type OpenAnswer = { canceled: boolean; filePaths: string[] }
type SaveAnswer = { canceled: boolean; filePath?: string }

/**
 * Fresh main modules on a stand-in for `ipcMain`, keeping what lasts across restarts in `userData`
 * when given; the dialogs record their options and answer from queues
 */
async function session(userData?: string) {
  vi.resetModules()
  const { registerMainHandlers } = await import('../helpers/fake-ipc')
  const log = (await import('electron-log/main')).default
  if (userData !== undefined) {
    const access = await import('../../src/main/file-access')
    access.setProjectRootsDir(userData)
  }
  const opens: OpenAnswer[] = []
  const saves: SaveAnswer[] = []
  const recorded: { method: string; options: Record<string, unknown> }[] = []
  const dialog = {
    showOpenDialog: async (options: Record<string, unknown>) => {
      recorded.push({ method: 'showOpenDialog', options })
      return opens.shift() ?? { canceled: true, filePaths: [] }
    },
    showSaveDialog: async (options: Record<string, unknown>) => {
      recorded.push({ method: 'showSaveDialog', options })
      return saves.shift() ?? { canceled: true }
    }
  }
  const ipc = registerMainHandlers(dialog as unknown as Partial<DialogPort>)
  /** The options of the dialog the call showed */
  const shown = async (call: () => Promise<unknown>): Promise<Record<string, unknown>> => {
    cases++
    const before = recorded.length
    await call()
    expect(recorded.length).toBe(before + 1)
    return recorded[recorded.length - 1].options
  }
  return { ipc, dialog, log, opens, saves, shown }
}

const PARAMS = [{ name: 'MZ Parameters', extensions: ['mzparams'] }]
const MD = [{ name: 'Markdown Files', extensions: ['md'] }]

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'dialog-memory-'))
  await mkdir(join(root, 'Games', 'Proj'), { recursive: true })
  await mkdir(join(root, 'B', 'Proj2'), { recursive: true })
  await mkdir(join(root, 'params'), { recursive: true })
})

afterEach(async () => {
  await rm(root, { recursive: true, force: true })
})

afterAll(() => {
  console.log(`dialog memory: cases ${cases}`)
  expect(cases).toBeGreaterThan(0)
})

describe('dialog memory', () => {
  it('opens the folder dialog beside the suggested project, then where it last chose', async () => {
    const { ipc, opens, shown } = await session()
    const seed = join(root, 'Games', 'Proj')
    opens.push({ canceled: false, filePaths: [join(root, 'B', 'Proj2')] })
    const first = await shown(() => ipc.invoke('dialog:open-folder', { defaultPath: seed }))
    expect(first.defaultPath).toBe(join(root, 'Games'))

    // A folder chosen once is where the next folder dialog without a suggestion opens
    expect((await shown(() => ipc.invoke('dialog:open-folder'))).defaultPath).toBe(join(root, 'B'))
    // That one was cancelled: the folder stays
    expect((await shown(() => ipc.invoke('dialog:open-folder', {}))).defaultPath).toBe(
      join(root, 'B')
    )
  })

  it('opens without a default when the suggested parent is gone and nothing was chosen', async () => {
    const { ipc, shown } = await session()
    const options = await shown(() =>
      ipc.invoke('dialog:open-folder', { defaultPath: join(root, 'Gone', 'Proj') })
    )
    expect(options).not.toHaveProperty('defaultPath')
  })

  it('never opens at a network path the renderer suggests', async () => {
    const { ipc, shown } = await session()
    for (const defaultPath of ['\\\\server\\share\\Proj', '//server/share/Proj']) {
      const options = await shown(() => ipc.invoke('dialog:open-folder', { defaultPath }))
      expect(options).not.toHaveProperty('defaultPath')
    }
  })

  it('opens a file dialog where the same kind of file was last chosen', async () => {
    const { ipc, opens, shown } = await session()
    const params = [{ name: 'MZ Parameters', extensions: ['mzparams'] }]
    expect(
      await shown(() => ipc.invoke('dialog:open-file', { filters: params }))
    ).not.toHaveProperty('defaultPath')
    opens.push({ canceled: false, filePaths: [join(root, 'params', 'Synthetic.mzparams')] })
    await shown(() => ipc.invoke('dialog:open-file', { filters: params }))

    const again = await shown(() => ipc.invoke('dialog:open-file', { filters: params }))
    expect(again.defaultPath).toBe(join(root, 'params'))
    const script = await shown(() => ipc.invoke('dialog:open-file', {}))
    expect(script).not.toHaveProperty('defaultPath')
    // The window cannot pick the folder
    const asked = await shown(() =>
      ipc.invoke('dialog:open-file', { defaultPath: join(root, 'B'), filters: params })
    )
    expect(asked.defaultPath).toBe(join(root, 'params'))
  })

  it("saves and opens a plugin in the open project's plugins folder", async () => {
    const project = await copyFixtureProject()
    try {
      const { ipc, opens, saves, shown } = await session()
      opens.push({ canceled: false, filePaths: [project] })
      await shown(() => ipc.invoke('dialog:open-folder'))
      await ipc.invoke('project:load', project)

      const plugin = await shown(() => ipc.invoke('dialog:save-file', { defaultPath: 'Name.js' }))
      expect(plugin.defaultPath).toBe(join(project, 'js', 'plugins', 'Name.js'))
      const script = await shown(() => ipc.invoke('dialog:open-file', {}))
      expect(script.defaultPath).toBe(join(project, 'js', 'plugins'))

      // Other kinds open where their kind last saved, beside nothing before that
      const md = [{ name: 'Markdown Files', extensions: ['md'] }]
      const readme = await shown(() =>
        ipc.invoke('dialog:save-file', { defaultPath: 'Name_README.md', filters: md })
      )
      expect(readme.defaultPath).toBe('Name_README.md')
      saves.push({ canceled: false, filePath: join(root, 'B', 'Name_README.md') })
      await shown(() =>
        ipc.invoke('dialog:save-file', { defaultPath: 'Name_README.md', filters: md })
      )
      const next = await shown(() =>
        ipc.invoke('dialog:save-file', { defaultPath: 'Other_README.md', filters: md })
      )
      expect(next.defaultPath).toBe(join(root, 'B', 'Other_README.md'))
    } finally {
      await rm(dirname(project), { recursive: true, force: true })
    }
  })

  it('checks the suggested folder without blocking the main process', async () => {
    const { ipc, shown } = await session()
    statSync.mockClear()
    const beside = await shown(() =>
      ipc.invoke('dialog:open-folder', { defaultPath: join(root, 'Games', 'Proj') })
    )
    expect(beside.defaultPath).toBe(join(root, 'Games'))
    const gone = await shown(() =>
      ipc.invoke('dialog:open-folder', { defaultPath: join(root, 'Gone', 'Proj') })
    )
    expect(gone).not.toHaveProperty('defaultPath')
    expect(statSync).not.toHaveBeenCalled()
  })

  it('opens each kind of dialog where it last chose after a restart', async () => {
    const userData = await mkdtemp(join(root, 'user-data-'))
    const first = await session(userData)
    first.opens.push({ canceled: false, filePaths: [join(root, 'params', 'Synthetic.mzparams')] })
    await first.shown(() => first.ipc.invoke('dialog:open-file', { filters: PARAMS }))
    first.opens.push({ canceled: false, filePaths: [join(root, 'B', 'Proj2')] })
    await first.shown(() => first.ipc.invoke('dialog:open-folder'))
    first.saves.push({ canceled: false, filePath: join(root, 'B', 'Name_README.md') })
    await first.shown(() =>
      first.ipc.invoke('dialog:save-file', { defaultPath: 'Name_README.md', filters: MD })
    )

    const second = await session(userData)
    const params = await second.shown(() =>
      second.ipc.invoke('dialog:open-file', { filters: PARAMS })
    )
    expect(params.defaultPath).toBe(join(root, 'params'))
    expect((await second.shown(() => second.ipc.invoke('dialog:open-folder'))).defaultPath).toBe(
      join(root, 'B')
    )
    const readme = await second.shown(() =>
      second.ipc.invoke('dialog:save-file', { defaultPath: 'Other_README.md', filters: MD })
    )
    expect(readme.defaultPath).toBe(join(root, 'B', 'Other_README.md'))
    // Open and save of one type keep separate folders
    const script = await second.shown(() => second.ipc.invoke('dialog:open-file', {}))
    expect(script).not.toHaveProperty('defaultPath')
    expect(second.log.warn).not.toHaveBeenCalledWith(expect.stringMatching(/^\[dialog\]/))
  })

  it('ignores a broken file of dialog folders, and never fails on it', async () => {
    const userData = await mkdtemp(join(root, 'user-data-'))
    for (const broken of ['not json', 'null', '[]', '{"folders": []}', '{"folders": "x"}']) {
      await writeFile(join(userData, FOLDERS_FILE), broken)
      const s = await session(userData)
      const options = await s.shown(() => s.ipc.invoke('dialog:open-file', { filters: PARAMS }))
      expect(options).not.toHaveProperty('defaultPath')
      expect(s.log.warn).toHaveBeenCalledWith(expect.stringMatching(/^\[dialog\] Ignoring /))
    }
  })

  it('keeps only local folders of known kinds from the file, and saves without the rest', async () => {
    const userData = await mkdtemp(join(root, 'user-data-'))
    const folders = {
      'open-file:.mzparams': join(root, 'params'),
      'open-folder': '\\\\server\\share\\Games',
      'save-file:.md': '//server/share/docs',
      'open-file:.json': 'relative/folder',
      'open-file:.exe': join(root, 'B'),
      'save-file:.js': 7
    }
    // A key JSON.parse keeps as an own property, which an object of folders must not take as its prototype
    const proto = `,"__proto__":${JSON.stringify(join(root, 'B'))}}}`
    await writeFile(join(userData, FOLDERS_FILE), JSON.stringify({ folders }).replace(/}}$/, proto))
    const s = await session(userData)
    const params = await s.shown(() => s.ipc.invoke('dialog:open-file', { filters: PARAMS }))
    expect(params.defaultPath).toBe(join(root, 'params'))
    expect(await s.shown(() => s.ipc.invoke('dialog:open-folder'))).not.toHaveProperty(
      'defaultPath'
    )
    const readme = await s.shown(() =>
      s.ipc.invoke('dialog:save-file', { defaultPath: 'Name_README.md', filters: MD })
    )
    expect(readme.defaultPath).toBe('Name_README.md')
    const json = [{ name: 'JSON', extensions: ['json'] }]
    expect(
      await s.shown(() => s.ipc.invoke('dialog:open-file', { filters: json }))
    ).not.toHaveProperty('defaultPath')

    s.opens.push({ canceled: false, filePaths: [join(root, 'B', 'Proj2')] })
    await s.shown(() => s.ipc.invoke('dialog:open-folder'))
    const kept = JSON.parse(await readFile(join(userData, FOLDERS_FILE), 'utf8'))
    expect(kept).toEqual({
      folders: { 'open-file:.mzparams': join(root, 'params'), 'open-folder': join(root, 'B') }
    })
  })

  it('uses the save dialog main holds when the call runs', async () => {
    const { ipc, dialog, shown } = await session()
    const replaced: Record<string, unknown>[] = []
    dialog.showSaveDialog = async (options: Record<string, unknown>) => {
      replaced.push(options)
      return { canceled: true }
    }
    cases++
    await expect(ipc.invoke('dialog:save-file', { defaultPath: 'Name.js' })).resolves.toBeNull()
    expect(replaced).toEqual([expect.objectContaining({ defaultPath: 'Name.js' })])
    // The folder dialog is still the recording one
    await shown(() => ipc.invoke('dialog:open-folder'))
  })
})
