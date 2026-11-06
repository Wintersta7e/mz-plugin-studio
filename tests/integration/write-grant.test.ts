// The save dialog and the save-to-path write, called directly and through their IPC registrations,
// each test on a fresh temporary folder. A path is written only after a save dialog returned it.
import { access, mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { SaveDialogReturnValue } from 'electron'
import { assertWriteGranted, recordWriteGrant } from '../../src/main/file-access'
import { showSaveFileDialog } from '../../src/main/ipc/dialog'
import { savePluginToPath, sha256Hex } from '../../src/main/ipc/plugin'
import { IPC_CHANNELS } from '../../src/shared/ipc-types'
import { registerMainHandlers } from '../helpers/fake-ipc'

vi.mock<{ ipcMain: object }>(import('electron'), () => ({ ipcMain: {} }))

/**
Folders the running test made, removed after it
*/
const made: string[] = []

async function freshFolder(): Promise<string> {
  const folder = await mkdtemp(path.join(tmpdir(), 'write-grant-'))
  made.push(folder)
  return folder
}

async function removeMade(): Promise<void> {
  for (const folder of made.splice(0)) await rm(folder, { recursive: true, force: true })
}

/**
A save dialog that answers `filePath`, or is cancelled when there is none
*/
function fakeDialog(filePath?: string) {
  const answer: SaveDialogReturnValue =
    filePath === undefined ? { canceled: true, filePath: '' } : { canceled: false, filePath }
  return {
    showSaveDialog: vi
      .fn<(...args: unknown[]) => Promise<SaveDialogReturnValue>>()
      .mockResolvedValue(answer)
  }
}

/**
Registers the dialog and plugin handlers on a stand-in for `ipcMain`; returns an invoker
*/
function registerHandlers(dialog: ReturnType<typeof fakeDialog>) {
  const ipc = registerMainHandlers(dialog)
  return async (channel: string, ...args: unknown[]): Promise<unknown> =>
    await ipc.invoke(channel, ...args)
}

describe('save to path', () => {
  afterEach(removeMade)

  it('refuses a path that was not chosen in a save dialog and creates nothing', async () => {
    expect.assertions(2)

    const folder = await freshFolder()
    const target = path.join(folder, 'out', 'a.js')

    await expect(savePluginToPath(target, 'x')).rejects.toThrow(/^Access denied: /)
    await expect(access(path.join(folder, 'out'))).rejects.toMatchObject({ code: 'ENOENT' })
  })

  it('writes a path the save dialog returned, and writes it again', async () => {
    expect.assertions(4)

    const chosen = path.join(await freshFolder(), 'Alpha.js')

    await expect(showSaveFileDialog(fakeDialog(chosen), {})).resolves.toBe(chosen)

    await savePluginToPath(chosen, 'first')

    await expect(readFile(chosen, 'utf8')).resolves.toBe('first')
    await expect(savePluginToPath(chosen, 'second')).resolves.toStrictEqual({
      success: true,
      path: chosen,
      sha256: sha256Hex(Buffer.from('second'))
    })
    await expect(readFile(chosen, 'utf8')).resolves.toBe('second')
  })

  it('never grants a path whose file type cannot be saved', async () => {
    expect.assertions(2)

    const chosen = path.join(await freshFolder(), 'x.exe')

    await expect(showSaveFileDialog(fakeDialog(chosen), {})).resolves.toBe(chosen)
    expect(() => {
      assertWriteGranted(chosen)
    }).toThrow(/^Access denied: /)
  })

  it('matches a Windows path without regard to case', () => {
    recordWriteGrant('C:\\Out\\A.js', path.win32)

    expect(() => {
      assertWriteGranted('c:\\out\\a.js', path.win32)
    }).not.toThrow()
  })

  it('matches a POSIX path with its case', () => {
    recordWriteGrant('/grants/A.js', path.posix)

    expect(() => {
      assertWriteGranted('/grants/A.js', path.posix)
    }).not.toThrow()
    expect(() => {
      assertWriteGranted('/grants/a.js', path.posix)
    }).toThrow('Access denied: /grants/a.js was not chosen in a save dialog')
  })
})

describe('save dialog', () => {
  afterEach(removeMade)

  it('returns the chosen path, and null when cancelled', async () => {
    expect.assertions(2)

    const chosen = path.join(await freshFolder(), 'Alpha.js')

    await expect(showSaveFileDialog(fakeDialog(chosen), {})).resolves.toBe(chosen)
    await expect(showSaveFileDialog(fakeDialog(), {})).resolves.toBeNull()
  })

  it('offers JavaScript files when the caller names no filter', async () => {
    expect.assertions(1)

    const dialog = fakeDialog(path.join(await freshFolder(), 'Alpha.js'))
    await showSaveFileDialog(dialog, { defaultPath: 'Alpha.js' })

    expect(dialog.showSaveDialog).toHaveBeenCalledWith({
      defaultPath: 'Alpha.js',
      filters: [{ name: 'JavaScript', extensions: ['js'] }],
      properties: ['showOverwriteConfirmation']
    })
  })
})

describe('registered handlers', () => {
  afterEach(removeMade)

  it('save to the path the save dialog returned', async () => {
    expect.assertions(2)

    const chosen = path.join(await freshFolder(), 'Alpha.js')
    const invoke = registerHandlers(fakeDialog(chosen))
    const filePath = await invoke(IPC_CHANNELS.DIALOG_SAVE_FILE, { defaultPath: 'Alpha.js' })

    expect(filePath).toBe(chosen)

    await invoke(IPC_CHANNELS.PLUGIN_SAVE_TO_PATH, filePath, 'code')

    await expect(readFile(chosen, 'utf8')).resolves.toBe('code')
  })

  it('refuse a path the save dialog did not return', async () => {
    expect.assertions(2)

    const folder = await freshFolder()
    const invoke = registerHandlers(fakeDialog(path.join(folder, 'Alpha.js')))
    await invoke(IPC_CHANNELS.DIALOG_SAVE_FILE, { defaultPath: 'Alpha.js' })
    const other = path.join(folder, 'Other.js')

    await expect(invoke(IPC_CHANNELS.PLUGIN_SAVE_TO_PATH, other, 'code')).rejects.toThrow(
      `Access denied: ${other} was not chosen in a save dialog`
    )
    await expect(access(other)).rejects.toMatchObject({ code: 'ENOENT' })
  })
})
