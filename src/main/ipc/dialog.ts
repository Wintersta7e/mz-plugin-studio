import type { Dialog } from 'electron'
import log from 'electron-log/main'
import type { MessageDialogOptions, OpenFileOptions, SaveFileOptions } from '../../shared/ipc-types'
import { recordProjectRoot, recordReadGrant, recordWriteGrant } from '../file-access'
import { checkFilters, invalidArguments, isRecord } from './arguments'
import type { InvokeHandlers } from './registration'

/**
 * Shows the save dialog; returns the chosen path, or null when cancelled.
 * The chosen path becomes writable by save-to-path and readable by read-by-path for the rest of
 * the session.
 */
export async function showSaveFileDialog(
  dialog: Pick<Dialog, 'showSaveDialog'>,
  options: SaveFileOptions
): Promise<string | null> {
  const result = await dialog.showSaveDialog({
    defaultPath: options.defaultPath,
    filters: options.filters || [{ name: 'JavaScript', extensions: ['js'] }],
    // Windows and macOS always ask before replacing a file; Linux only with this
    properties: ['showOverwriteConfirmation']
  })

  if (result.canceled || !result.filePath) {
    log.debug('[dialog:save-file] Cancelled')
    return null
  }

  log.info(`[dialog:save-file] Selected: ${result.filePath}`)
  recordWriteGrant(result.filePath)
  recordReadGrant(result.filePath)
  return result.filePath
}

/**
 * Shows a message box; returns the index of the button the user chose. A Cancel button is both
 * the Enter and the Esc button unless the caller names others, so no key press discards work.
 */
export async function showMessageDialog(
  dialog: Pick<Dialog, 'showMessageBox'>,
  options: MessageDialogOptions
): Promise<number> {
  log.debug(`[dialog:message] ${options.type || 'info'}: ${options.message}`)
  const buttons = options.buttons || ['OK']
  const cancel = buttons.indexOf('Cancel')
  const defaultId = options.defaultId ?? (cancel >= 0 ? cancel : undefined)
  const cancelId = options.cancelId ?? (cancel >= 0 ? cancel : undefined)
  const result = await dialog.showMessageBox({
    type: options.type || 'info',
    title: options.title || 'MZ Plugin Studio',
    message: options.message,
    buttons,
    ...(defaultId !== undefined && { defaultId }),
    ...(cancelId !== undefined && { cancelId })
  })

  return result.response
}

/**
 * Shows the folder picker; returns the chosen folder, or null when cancelled.
 * The chosen folder becomes a project folder `project:load` opens without asking.
 */
export async function openFolderDialog(
  dialog: Pick<Dialog, 'showOpenDialog'>
): Promise<string | null> {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory'],
    title: 'Select RPG Maker MZ Project Folder'
  })

  if (result.canceled || result.filePaths.length === 0) {
    log.debug('[dialog:open-folder] Cancelled')
    return null
  }

  log.info(`[dialog:open-folder] Selected: ${result.filePaths[0]}`)
  await recordProjectRoot(result.filePaths[0])
  return result.filePaths[0]
}

/**
 * Shows the file picker; returns the chosen file, or null when cancelled.
 * The chosen file becomes readable by read-by-path for the rest of the session.
 */
export async function openFileDialog(
  dialog: Pick<Dialog, 'showOpenDialog'>,
  options: OpenFileOptions
): Promise<string | null> {
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: options.filters || [{ name: 'JavaScript', extensions: ['js'] }]
  })

  if (result.canceled || result.filePaths.length === 0) {
    log.debug('[dialog:open-file] Cancelled')
    return null
  }

  log.info(`[dialog:open-file] Selected: ${result.filePaths[0]}`)
  recordReadGrant(result.filePaths[0])
  return result.filePaths[0]
}

const MESSAGE_TYPES = ['none', 'info', 'error', 'question', 'warning'] as const

type MessageType = (typeof MESSAGE_TYPES)[number]

const isMessageType = (value: unknown): value is MessageType =>
  MESSAGE_TYPES.some((type) => type === value)

/** Message box options of the documented shape: 1-4 buttons, button ids within them */
function checkMessageOptions(value: unknown): MessageDialogOptions {
  function fail(): never {
    throw invalidArguments('dialog:message')
  }
  if (!isRecord(value)) fail()
  const { type, title, message, buttons, defaultId, cancelId } = value
  if (typeof message !== 'string') fail()
  if (type !== undefined && !isMessageType(type)) fail()
  if (title !== undefined && typeof title !== 'string') fail()
  if (buttons !== undefined) {
    if (!Array.isArray(buttons) || buttons.length < 1 || buttons.length > 4) fail()
    if (!buttons.every((b): b is string => typeof b === 'string')) fail()
  }
  const count = buttons === undefined ? 1 : buttons.length
  const buttonId = (id: unknown): number | undefined => {
    if (id === undefined) return undefined
    if (typeof id !== 'number' || !Number.isInteger(id) || id < 0 || id >= count) fail()
    return id
  }
  const defaultButton = buttonId(defaultId)
  const cancelButton = buttonId(cancelId)
  return {
    message,
    ...(type !== undefined && { type }),
    ...(title !== undefined && { title }),
    ...(buttons !== undefined && { buttons: [...buttons] }),
    ...(defaultButton !== undefined && { defaultId: defaultButton }),
    ...(cancelButton !== undefined && { cancelId: cancelButton })
  }
}

/** Save dialog options: a string default path and well-formed filters; anything else dropped */
function checkSaveFileOptions(value: unknown): SaveFileOptions {
  if (!isRecord(value)) return {}
  const { defaultPath, filters: rawFilters } = value
  const filters = checkFilters(rawFilters)
  return {
    ...(typeof defaultPath === 'string' && { defaultPath }),
    ...(filters !== undefined && { filters })
  }
}

/** Open dialog options: well-formed filters only; anything else dropped */
function checkOpenFileOptions(value: unknown): OpenFileOptions {
  if (!isRecord(value)) return {}
  const { filters: rawFilters } = value
  const filters = checkFilters(rawFilters)
  return filters !== undefined ? { filters } : {}
}

/** The methods of Electron's `dialog` the handlers call */
export type DialogPort = Pick<Dialog, 'showOpenDialog' | 'showSaveDialog' | 'showMessageBox'>

type DialogChannel =
  | 'dialog:open-folder'
  | 'dialog:save-file'
  | 'dialog:open-file'
  | 'dialog:message'

/** Each handler reads `dialog`'s method when it runs, so a method replaced later is the one used */
export function createDialogHandlers(dialog: DialogPort): Pick<InvokeHandlers, DialogChannel> {
  return {
    'dialog:open-folder': {
      access: 'none',
      check: () => [],
      run: () => openFolderDialog(dialog)
    },
    'dialog:save-file': {
      access: 'none',
      check: (raw) => [checkSaveFileOptions(raw[0])],
      run: (options = {}) => showSaveFileDialog(dialog, options)
    },
    'dialog:open-file': {
      access: 'none',
      check: (raw) => [checkOpenFileOptions(raw[0])],
      run: (options = {}) => openFileDialog(dialog, options)
    },
    'dialog:message': {
      access: 'none',
      check: (raw) => [checkMessageOptions(raw[0])],
      run: (options) => showMessageDialog(dialog, options)
    }
  }
}
