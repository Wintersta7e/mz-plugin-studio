// The save dialog and the save-to-path write, called directly and through their IPC registrations,
// each test on a fresh temporary folder.
import { mkdtemp, readFile, rm } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Dialog, IpcMain, SaveDialogOptions } from 'electron'
import { setupDialogHandlers, showSaveFileDialog } from '../../src/main/ipc/dialog'
import { savePluginToPath, setupPluginHandlers } from '../../src/main/ipc/plugin'
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
  it('writes any absolute .js path without a save dialog', async () => {
    const target = join(tmp, 'out', 'a.js')
    await expect(savePluginToPath(target, 'x')).resolves.toEqual({ success: true, path: target })
    expect(await readFile(target, 'utf8')).toBe('x')
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
      filters: [{ name: 'JavaScript', extensions: ['js'] }]
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
})
