// The options the message and save dialogs hand to Electron, recorded on stand-in dialogs.
import { describe, expect, it, vi, type Mock } from 'vitest'
import type { MessageBoxReturnValue, SaveDialogReturnValue } from 'electron'
import {
  createDialogHandlers,
  showMessageDialog,
  showSaveFileDialog
} from '../../src/main/ipc/dialog'

/**
A stand-in for the message box that answers with the first button
*/
function messageBox(): Mock<(...args: unknown[]) => Promise<MessageBoxReturnValue>> {
  return vi
    .fn<(...args: unknown[]) => Promise<MessageBoxReturnValue>>()
    .mockResolvedValue({ response: 0, checkboxChecked: false })
}

describe('dialog options', () => {
  it('dialog:message forwards defaultId and cancelId', async () => {
    expect.assertions(2)

    const showMessageBox = messageBox()
    const options = {
      message: 'Discard?',
      buttons: ['Cancel', 'Discard'],
      defaultId: 1,
      cancelId: 1
    }

    await expect(showMessageDialog({ showMessageBox }, options)).resolves.toBe(0)
    expect(showMessageBox.mock.calls).toStrictEqual([
      [expect.objectContaining({ defaultId: 1, cancelId: 1 })]
    ])
  })

  it('dialog:message makes Cancel both the Enter and the Esc button', async () => {
    expect.assertions(1)

    const showMessageBox = messageBox()
    const options = { message: 'Discard?', buttons: ['Cancel', 'Discard'] }
    await showMessageDialog({ showMessageBox }, options)

    expect(showMessageBox.mock.calls).toStrictEqual([
      [expect.objectContaining({ defaultId: 0, cancelId: 0 })]
    ])
  })

  it('dialog:message leaves both out when the caller names neither and offers no Cancel', async () => {
    expect.assertions(1)

    const showMessageBox = messageBox()
    await showMessageDialog({ showMessageBox }, { message: 'Done' })

    // The whole options object: neither defaultId nor cancelId is a key of it
    expect(showMessageBox.mock.calls).toStrictEqual([
      [{ type: 'info', title: 'MZ Plugin Studio', message: 'Done', buttons: ['OK'] }]
    ])
  })

  it('dialog:save-file asks before replacing a file on every platform', async () => {
    expect.assertions(1)

    const showSaveDialog = vi
      .fn<(...args: unknown[]) => Promise<SaveDialogReturnValue>>()
      .mockResolvedValue({ canceled: true, filePath: '' })
    await showSaveFileDialog({ showSaveDialog }, { defaultPath: 'Foo.js' })

    expect(showSaveDialog.mock.calls).toStrictEqual([
      [expect.objectContaining({ properties: ['showOverwriteConfirmation'] })]
    ])
  })

  it('dialog:message shows the title given, and the app name for an empty one', async () => {
    expect.assertions(1)

    const showMessageBox = messageBox()
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
