// The options the message and save dialogs hand to Electron, recorded on stand-in dialogs.
import { describe, expect, it, vi } from 'vitest'
import type { Dialog, MessageBoxOptions, MessageBoxReturnValue, SaveDialogOptions } from 'electron'
import {
  createDialogHandlers,
  showMessageDialog,
  showSaveFileDialog
} from '../../src/main/ipc/dialog'

describe('dialog options', () => {
  it('dialog:message forwards defaultId and cancelId', async () => {
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
    expect(recorded.cancelId).toBe(1)
  })

  it('dialog:message makes Cancel both the Enter and the Esc button', async () => {
    const dialog = {
      showMessageBox: vi.fn(async (_options: MessageBoxOptions) => ({ response: 0 }))
    }
    const options = { message: 'Discard?', buttons: ['Cancel', 'Discard'] }
    await showMessageDialog(dialog as unknown as Dialog, options)
    const recorded = dialog.showMessageBox.mock.calls[0][0]

    expect(recorded.defaultId).toBe(0)
    expect(recorded.cancelId).toBe(0)
  })

  it('dialog:message leaves both out when the caller names neither and offers no Cancel', async () => {
    const dialog = {
      showMessageBox: vi.fn(async (_options: MessageBoxOptions) => ({ response: 0 }))
    }
    await showMessageDialog(dialog as unknown as Dialog, { message: 'Done' })
    const recorded = dialog.showMessageBox.mock.calls[0][0]

    expect(recorded).not.toHaveProperty('defaultId')
    expect(recorded).not.toHaveProperty('cancelId')
  })

  it('dialog:save-file asks before replacing a file on every platform', async () => {
    const dialog = {
      showSaveDialog: vi.fn(async (_options: SaveDialogOptions) => ({
        canceled: true,
        filePath: ''
      }))
    }
    await showSaveFileDialog(dialog, { defaultPath: 'Foo.js' })

    expect(dialog.showSaveDialog.mock.calls[0][0].properties).toEqual(['showOverwriteConfirmation'])
  })

  it('dialog:message shows the title given, and the app name for an empty one', async () => {
    expect.assertions(1)

    const showMessageBox = vi
      .fn<(...args: unknown[]) => Promise<MessageBoxReturnValue>>()
      .mockResolvedValue({ response: 0, checkboxChecked: false })
    await showMessageDialog({ showMessageBox }, { message: 'Saved', title: 'Export' })
    await showMessageDialog({ showMessageBox }, { message: 'Saved', title: '' })

    expect(showMessageBox.mock.calls).toStrictEqual([
      [expect.objectContaining({ title: 'Export' })],
      [expect.objectContaining({ title: 'MZ Plugin Studio' })]
    ])
  })

  it('dialog:message keeps the type and title the renderer sends', () => {
    expect.assertions(1)

    const unused = vi.fn<(...args: unknown[]) => Promise<never>>()
    const handler = createDialogHandlers({
      showOpenDialog: unused,
      showSaveDialog: unused,
      showMessageBox: unused
    })['dialog:message']

    expect(handler.check([{ message: 'Saved', type: 'warning', title: 'Export' }])).toStrictEqual([
      { message: 'Saved', type: 'warning', title: 'Export' }
    ])
  })
})
