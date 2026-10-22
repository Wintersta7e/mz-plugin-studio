// The options the message and save dialogs hand to Electron, recorded on stand-in dialogs.
import { describe, expect, it, vi } from 'vitest'
import type { Dialog, MessageBoxOptions, SaveDialogOptions } from 'electron'
import { showMessageDialog, showSaveFileDialog } from '../../src/main/ipc/dialog'

describe('dialog options', () => {
  it('dialog:message forwards defaultId and drops cancelId', async () => {
    const dialog = {
      showMessageBox: vi.fn(async (_options: MessageBoxOptions) => ({ response: 0 }))
    }
    const options = {
      message: 'Discard?',
      buttons: ['Cancel', 'Discard'],
      defaultId: 1,
      cancelId: 1
    }
    await expect(showMessageDialog(dialog as unknown as Dialog, options)).resolves.toBe(0)
    const recorded = dialog.showMessageBox.mock.calls[0][0]
    expect(recorded.defaultId).toBe(1)
    expect(recorded).not.toHaveProperty('cancelId')
  })

  it('dialog:save-file asks no overwrite question of its own', async () => {
    const dialog = {
      showSaveDialog: vi.fn(async (_options: SaveDialogOptions) => ({
        canceled: true,
        filePath: ''
      }))
    }
    await showSaveFileDialog(dialog, { defaultPath: 'Foo.js' })
    expect(dialog.showSaveDialog.mock.calls[0][0]).not.toHaveProperty('properties')
  })
})
