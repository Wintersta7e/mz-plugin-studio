// What read-by-path may read: a file under the open project's js/plugins folder, or a file the
// user chose in an open or save dialog this session; a UNC path only when chosen in a dialog.
// Each case starts from fresh main modules, as a new app session does.
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path, { dirname, join } from 'node:path'
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type * as FileAccess from '../../src/main/file-access'
import type { DialogPort } from '../../src/main/ipc/handlers'
import { copyFixtureProject } from '../helpers/fixture-project'

vi.mock('electron', () => ({ ipcMain: {} }))

const DENIED = "Access denied: not in the open project's plugins folder or chosen in a dialog"

let rows = 0
let project: string
let outside: string

/** Fresh main modules registered on a stand-in for `ipcMain`, the dialogs answering from queues */
async function session() {
  vi.resetModules()
  const access: typeof FileAccess = await import('../../src/main/file-access')
  const { registerMainHandlers } = await import('../helpers/fake-ipc')
  const opened: string[] = []
  const saved: string[] = []
  const dialog = {
    showOpenDialog: vi.fn(async () => ({ canceled: false, filePaths: [opened.shift()] })),
    showSaveDialog: vi.fn(async () => ({ canceled: false, filePath: saved.shift() }))
  }
  const ipc = registerMainHandlers(dialog as unknown as Partial<DialogPort>)
  const read = (file: string) => {
    rows++
    return ipc.invoke('plugin:read-by-path', file)
  }
  return {
    access,
    read,
    /** Opens `folder` as the project, chosen in the folder dialog */
    openProject: async (folder: string) => {
      opened.push(folder)
      await ipc.invoke('dialog:open-folder')
      await ipc.invoke('project:load', folder)
    },
    openFile: (file: string) => {
      opened.push(file)
      return ipc.invoke('dialog:open-file', {})
    },
    saveFile: (file: string) => {
      saved.push(file)
      return ipc.invoke('dialog:save-file', {})
    }
  }
}

const pluginFile = () => join(project, 'js', 'plugins', 'Synthetic_Read.js')

beforeEach(async () => {
  project = await copyFixtureProject()
  await writeFile(pluginFile(), '// in project\n')
  outside = await mkdtemp(join(tmpdir(), 'read-scope-'))
  await mkdir(join(outside, 'outside'))
})

afterEach(async () => {
  await rm(dirname(project), { recursive: true, force: true })
  await rm(outside, { recursive: true, force: true })
})

afterAll(() => {
  console.log(`read scope: rows ${rows}`)

  expect(rows).toBeGreaterThan(0)
})

describe('read scope', () => {
  it("refuses the project's plugins before a project is loaded", async () => {
    const { read } = await session()

    await expect(read(pluginFile())).rejects.toThrow(DENIED)
  })

  it("reads the open project's plugins and nothing else of the disk", async () => {
    const { read, openProject } = await session()
    await openProject(project)
    const out = join(outside, 'outside', 'Synthetic_Out.js')
    await writeFile(out, '// out\n')

    await expect(read(pluginFile())).resolves.toBe('// in project\n')
    await expect(read(out)).rejects.toThrow(DENIED)
    await expect(read(join(project, 'data', 'System.json'))).rejects.toThrow(DENIED)
    await expect(read(join(project, 'js', 'plugins.js'))).rejects.toThrow(DENIED)
  })

  it('reads a file chosen in the open dialog or the save dialog', async () => {
    const { read, openFile, saveFile } = await session()
    const chosen = join(outside, 'outside', 'Synthetic_Chosen.js')
    const savedTo = join(outside, 'outside', 'Synthetic_Saved.js')
    await writeFile(chosen, '// chosen\n')
    await writeFile(savedTo, '// saved\n')

    await expect(read(chosen)).rejects.toThrow(DENIED)
    await expect(read(savedTo)).rejects.toThrow(DENIED)

    await openFile(chosen)
    await saveFile(savedTo)

    await expect(read(chosen)).resolves.toBe('// chosen\n')
    await expect(read(savedTo)).resolves.toBe('// saved\n')
  })

  it('grants no file of an extension read-by-path never reads', async () => {
    const { read, openFile, access } = await session()
    const text = join(outside, 'outside', 'Synthetic_Notes.txt')
    await writeFile(text, 'notes\n')
    await openFile(text)

    await expect(read(text)).rejects.toThrow('File extension ".txt" is not allowed')
    expect(() => access.authorize('granted-read', text.replace(/\.txt$/, '.js'))).toThrow(DENIED)
  })

  it('compares win32 paths case-insensitively and needs a dialog for a UNC path', async () => {
    const { access } = await session()
    const win = path.win32
    const allowed = (file: string) => {
      rows++
      try {
        access.authorize('granted-read', file, win)
        return true
      } catch (error) {
        expect(String(error)).toContain(DENIED)

        return false
      }
    }
    access.setCurrentProjectRoot('C:\\Games\\Proj', win)

    expect(allowed('C:\\Games\\Proj\\js\\plugins\\a.js')).toBe(true)
    expect(allowed('c:\\games\\proj\\JS\\Plugins\\a.js')).toBe(true)
    expect(allowed('C:\\Games\\Proj\\js\\plugins\\sub\\a.js')).toBe(true)
    expect(allowed('C:\\Games\\Proj\\data\\a.json')).toBe(false)
    expect(allowed('C:\\Games\\Proj\\js\\plugins-old\\a.js')).toBe(false)
    expect(allowed('C:\\Games\\Proj2\\js\\plugins\\a.js')).toBe(false)
    expect(allowed('C:\\Other\\a.js')).toBe(false)
    expect(allowed('\\\\host\\share\\x.js')).toBe(false)

    access.recordReadGrant('\\\\host\\share\\x.js', win)

    expect(allowed('\\\\HOST\\share\\X.js')).toBe(true)

    access.setCurrentProjectRoot('\\\\host\\share\\Proj', win)

    expect(allowed('\\\\host\\share\\Proj\\js\\plugins\\a.js')).toBe(false)
    expect(allowed('//host/share/Proj/js/plugins/a.js')).toBe(false)
  })
})
