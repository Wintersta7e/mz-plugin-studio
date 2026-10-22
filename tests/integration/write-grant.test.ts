// The save dialog and the save-to-path write, called directly and through their IPC registrations,
// each test on a fresh temporary folder. A path is written only after a save dialog returned it.
import { access, mkdtemp, readFile, rm } from 'fs/promises'
import { tmpdir } from 'os'
import path, { join } from 'path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Dialog, IpcMain, SaveDialogOptions } from 'electron'
import { assertWriteGranted, recordWriteGrant } from '../../src/main/file-access'
import { setupDialogHandlers, showSaveFileDialog } from '../../src/main/ipc/dialog'
import { savePluginToPath, setupPluginHandlers, sha256Hex } from '../../src/main/ipc/plugin'
import { IPC_CHANNELS } from '../../src/shared/ipc-types'

let tmp: string

beforeEach(async () => {
  tmp = await mkdtemp(join(tmpdir(), 'write-grant-'))
})

afterEach(async () => {
  await rm(tmp, { recursive: true, force: true })
})

/** A save dialog that answers `filePath`, or is cancelled when it is null. */
function fakeDialog(filePath: string | null) {
  return {
    showSaveDialog: vi.fn(async (_options: SaveDialogOptions) =>
      filePath === null ? { canceled: true, filePath: '' } : { canceled: false, filePath }
    )
  }
}

/** Registers the dialog and plugin handlers on a stand-in for `ipcMain`; returns an invoker. */
function registerHandlers(dialog: ReturnType<typeof fakeDialog>) {
  type Handler = (event: unknown, ...args: unknown[]) => unknown
  const handlers = new Map<string, Handler>()
  const ipcMain = { handle: (channel: string, fn: Handler) => handlers.set(channel, fn) }
  setupDialogHandlers(ipcMain as unknown as IpcMain, dialog as unknown as Dialog)
  setupPluginHandlers(ipcMain as unknown as IpcMain)
  return (channel: string, ...args: unknown[]) => handlers.get(channel)!({}, ...args)
}

describe('save to path', () => {
  it('refuses a path that was not chosen in a save dialog and creates nothing', async () => {
    const target = join(tmp, 'out', 'a.js')
    await expect(savePluginToPath(target, 'x')).rejects.toThrow(/^Access denied: /)
    await expect(access(join(tmp, 'out'))).rejects.toMatchObject({ code: 'ENOENT' })
  })

  it('writes a path the save dialog returned, and writes it again', async () => {
    const chosen = join(tmp, 'Alpha.js')
    expect(await showSaveFileDialog(fakeDialog(chosen), {})).toBe(chosen)
    await savePluginToPath(chosen, 'first')
    expect(await readFile(chosen, 'utf8')).toBe('first')
    await expect(savePluginToPath(chosen, 'second')).resolves.toEqual({
      success: true,
      path: chosen,
      sha256: sha256Hex(Buffer.from('second'))
    })
    expect(await readFile(chosen, 'utf8')).toBe('second')
  })

  it('never grants a path whose file type cannot be saved', async () => {
    const chosen = join(tmp, 'x.exe')
    expect(await showSaveFileDialog(fakeDialog(chosen), {})).toBe(chosen)
    expect(() => assertWriteGranted(chosen)).toThrow(/^Access denied: /)
  })

  it('matches a Windows path without regard to case', () => {
    recordWriteGrant('C:\\Out\\A.js', path.win32)
    expect(() => assertWriteGranted('c:\\out\\a.js', path.win32)).not.toThrow()
  })

  it('matches a POSIX path with its case', () => {
    recordWriteGrant('/grants/A.js', path.posix)
    expect(() => assertWriteGranted('/grants/A.js', path.posix)).not.toThrow()
    expect(() => assertWriteGranted('/grants/a.js', path.posix)).toThrow(
      'Access denied: /grants/a.js was not chosen in a save dialog'
    )
  })
})

describe('save dialog', () => {
  it('returns the chosen path, and null when cancelled', async () => {
    const chosen = join(tmp, 'Alpha.js')
    expect(await showSaveFileDialog(fakeDialog(chosen), {})).toBe(chosen)
    expect(await showSaveFileDialog(fakeDialog(null), {})).toBeNull()
  })

  it('offers JavaScript files when the caller names no filter', async () => {
    const dialog = fakeDialog(join(tmp, 'Alpha.js'))
    await showSaveFileDialog(dialog, { defaultPath: 'Alpha.js' })
    expect(dialog.showSaveDialog).toHaveBeenCalledWith({
      defaultPath: 'Alpha.js',
      filters: [{ name: 'JavaScript', extensions: ['js'] }],
      properties: ['showOverwriteConfirmation']
    })
  })
})

describe('registered handlers', () => {
  it('save to the path the save dialog returned', async () => {
    const chosen = join(tmp, 'Alpha.js')
    const invoke = registerHandlers(fakeDialog(chosen))
    const filePath = await invoke(IPC_CHANNELS.DIALOG_SAVE_FILE, { defaultPath: 'Alpha.js' })
    expect(filePath).toBe(chosen)
    await invoke(IPC_CHANNELS.PLUGIN_SAVE_TO_PATH, filePath, 'code')
    expect(await readFile(chosen, 'utf8')).toBe('code')
  })

  it('refuse a path the save dialog did not return', async () => {
    const invoke = registerHandlers(fakeDialog(join(tmp, 'Alpha.js')))
    await invoke(IPC_CHANNELS.DIALOG_SAVE_FILE, { defaultPath: 'Alpha.js' })
    const other = join(tmp, 'Other.js')
    await expect(invoke(IPC_CHANNELS.PLUGIN_SAVE_TO_PATH, other, 'code')).rejects.toThrow(
      `Access denied: ${other} was not chosen in a save dialog`
    )
    await expect(access(other)).rejects.toMatchObject({ code: 'ENOENT' })
  })
})
