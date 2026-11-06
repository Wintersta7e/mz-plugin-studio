// What read-by-path may read: a file under the open project's js/plugins folder, or a file the
// user chose in an open or save dialog this session; a UNC path only when chosen in a dialog.
// Each case starts from fresh main modules, as a new app session does.
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import type { OpenDialogReturnValue, SaveDialogReturnValue } from 'electron'
import { afterAll, afterEach, describe, expect, it, vi } from 'vitest'
import type * as FileAccess from '../../src/main/file-access'
import { afterAllTests } from '../helpers/after-all-tests'
import { copyFixtureProject } from '../helpers/fixture-project'

vi.mock<{ ipcMain: object }>(import('electron'), () => ({ ipcMain: {} }))

const DENIED = "Access denied: not in the open project's plugins folder or chosen in a dialog"

const counted = { rows: 0, describes: 0 }

/**
Fresh main modules registered on a stand-in for `ipcMain`, the dialogs answering what the
test queued
*/
async function session() {
  vi.resetModules()
  const access: typeof FileAccess = await import('../../src/main/file-access')
  const { registerMainHandlers } = await import('../helpers/fake-ipc')
  const dialog = {
    showOpenDialog: vi
      .fn<(...args: unknown[]) => Promise<OpenDialogReturnValue>>()
      .mockRejectedValue(new Error('no answer queued for showOpenDialog')),
    showSaveDialog: vi
      .fn<(...args: unknown[]) => Promise<SaveDialogReturnValue>>()
      .mockRejectedValue(new Error('no answer queued for showSaveDialog'))
  }
  const ipc = registerMainHandlers(dialog)
  const read = async (file: string): Promise<unknown> => {
    counted.rows += 1
    return await ipc.invoke('plugin:read-by-path', file)
  }
  const chooseInOpenDialog = (file: string): void => {
    dialog.showOpenDialog.mockResolvedValueOnce({ canceled: false, filePaths: [file] })
  }
  return {
    access,
    read,
    /**
    Opens `folder` as the project, chosen in the folder dialog
    */
    openProject: async (folder: string): Promise<void> => {
      chooseInOpenDialog(folder)
      await ipc.invoke('dialog:open-folder')
      await ipc.invoke('project:load', folder)
    },
    openFile: async (file: string): Promise<unknown> => {
      chooseInOpenDialog(file)
      return await ipc.invoke('dialog:open-file', {})
    },
    saveFile: async (file: string): Promise<unknown> => {
      dialog.showSaveDialog.mockResolvedValueOnce({ canceled: false, filePath: file })
      return await ipc.invoke('dialog:save-file', {})
    }
  }
}

const pluginFile = (project: string): string =>
  path.join(project, 'js', 'plugins', 'Synthetic_Read.js')

/**
Folders the running test made, removed after it
*/
const made: string[] = []

/**
A fresh copy of the fixture project holding one plugin, and a folder outside it
*/
async function folders(): Promise<{ project: string; outside: string }> {
  const project = await copyFixtureProject()
  made.push(path.dirname(project))
  await writeFile(pluginFile(project), '// in project\n')
  const outside = await mkdtemp(path.join(tmpdir(), 'read-scope-'))
  made.push(outside)
  await mkdir(path.join(outside, 'outside'))
  return { project, outside }
}

async function removeMade(): Promise<void> {
  for (const folder of made.splice(0)) await rm(folder, { recursive: true, force: true })
}

// Describe blocks run in shuffled order: the count prints once the last of them ends
const DESCRIBES = 2

function rowProblems(): string[] {
  counted.describes += 1
  if (counted.describes < DESCRIBES) return []
  process.stdout.write(`read scope: rows ${String(counted.rows)}\n`)
  return counted.rows > 0 ? [] : ['no read-by-path row ran']
}

describe('read scope: project and dialogs', () => {
  afterEach(removeMade)

  afterAll(afterAllTests(rowProblems))

  it("refuses the project's plugins before a project is loaded", async () => {
    expect.assertions(1)

    const { project } = await folders()
    const { read } = await session()

    await expect(read(pluginFile(project))).rejects.toThrow(DENIED)
  })

  it("reads the open project's plugins and nothing else of the disk", async () => {
    expect.assertions(4)

    const { project, outside } = await folders()
    const { read, openProject } = await session()
    await openProject(project)
    const out = path.join(outside, 'outside', 'Synthetic_Out.js')
    await writeFile(out, '// out\n')

    await expect(read(pluginFile(project))).resolves.toBe('// in project\n')
    await expect(read(out)).rejects.toThrow(DENIED)
    await expect(read(path.join(project, 'data', 'System.json'))).rejects.toThrow(DENIED)
    await expect(read(path.join(project, 'js', 'plugins.js'))).rejects.toThrow(DENIED)
  })

  it('reads a file chosen in the open dialog or the save dialog', async () => {
    expect.assertions(4)

    const { outside } = await folders()
    const { read, openFile, saveFile } = await session()
    const chosen = path.join(outside, 'outside', 'Synthetic_Chosen.js')
    const savedTo = path.join(outside, 'outside', 'Synthetic_Saved.js')
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
    expect.assertions(2)

    const { outside } = await folders()
    const { read, openFile, access } = await session()
    const text = path.join(outside, 'outside', 'Synthetic_Notes.txt')
    await writeFile(text, 'notes\n')
    await openFile(text)

    await expect(read(text)).rejects.toThrow('File extension ".txt" is not allowed')
    expect(() => {
      access.authorize('granted-read', text.replace(/\.txt$/, '.js'))
    }).toThrow(DENIED)
  })
})

describe('read scope: win32 paths', () => {
  afterAll(afterAllTests(rowProblems))

  it('compares win32 paths case-insensitively and needs a dialog for a UNC path', async () => {
    expect.assertions(1)

    const { access } = await session()
    const win = path.win32
    // 'allowed', 'denied' for the refusal, or the text of any other error
    const outcome = (file: string): string => {
      counted.rows += 1
      try {
        access.authorize('granted-read', file, win)
        return 'allowed'
      } catch (error) {
        const text = String(error)
        return text.includes(DENIED) ? 'denied' : text
      }
    }
    access.setCurrentProjectRoot('C:\\Games\\Proj', win)
    const inProject = [
      'C:\\Games\\Proj\\js\\plugins\\a.js',
      'c:\\games\\proj\\JS\\Plugins\\a.js',
      'C:\\Games\\Proj\\js\\plugins\\sub\\a.js',
      'C:\\Games\\Proj\\data\\a.json',
      'C:\\Games\\Proj\\js\\plugins-old\\a.js',
      'C:\\Games\\Proj2\\js\\plugins\\a.js',
      'C:\\Other\\a.js',
      '\\\\host\\share\\x.js'
    ].map((file) => outcome(file))

    access.recordReadGrant('\\\\host\\share\\x.js', win)
    const granted = outcome('\\\\HOST\\share\\X.js')

    access.setCurrentProjectRoot('\\\\host\\share\\Proj', win)
    const uncProject = [
      '\\\\host\\share\\Proj\\js\\plugins\\a.js',
      '//host/share/Proj/js/plugins/a.js'
    ].map((file) => outcome(file))

    expect({ inProject, granted, uncProject }).toStrictEqual({
      inProject: [
        'allowed',
        'allowed',
        'allowed',
        'denied',
        'denied',
        'denied',
        'denied',
        'denied'
      ],
      granted: 'allowed',
      uncProject: ['denied', 'denied']
    })
  })
})
