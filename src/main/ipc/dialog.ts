import { readFile, stat } from 'node:fs/promises'
import path from 'node:path'
import type { Dialog } from 'electron'
import log from 'electron-log/main'
import type {
  MessageDialogOptions,
  OpenFileOptions,
  OpenFolderOptions,
  SaveFileOptions
} from '../../shared/ipc-types'
import {
  assertSafeProjectPath,
  isAllowedExtension,
  isUncText,
  type PlatformPath
} from '../../shared/path-safety'
import { replaceFile } from '../atomic-write'
import {
  getCurrentProjectRoot,
  getProjectRootsDir,
  recordProjectRoot,
  recordReadGrant,
  recordWriteGrant
} from '../file-access'
import { checkFilters, invalidArguments, isFilterExtension, isRecord } from './arguments'
import type { InvokeHandlers } from './registration'

/**
Shows the save dialog; returns the chosen path, or null when cancelled.
The chosen path becomes writable by save-to-path and readable by read-by-path for the rest of
the session.
*/
export async function showSaveFileDialog(
  dialog: Pick<Dialog, 'showSaveDialog'>,
  options: Omit<SaveFileOptions, 'defaultPath'> & { defaultPath?: string | undefined }
): Promise<string | null> {
  const result = await dialog.showSaveDialog({
    ...(options.defaultPath !== undefined && { defaultPath: options.defaultPath }),
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
Shows a message box; returns the index of the button the user chose. A Cancel button is both
the Enter and the Esc button unless the caller names others, so no key press discards work.
*/
export async function showMessageDialog(
  dialog: Pick<Dialog, 'showMessageBox'>,
  options: MessageDialogOptions
): Promise<number> {
  log.debug(`[dialog:message] ${options.type || 'info'}: ${options.message}`)
  const buttons = options.buttons || ['OK']
  const cancel = buttons.indexOf('Cancel')
  const defaultId = options.defaultId ?? (cancel === -1 ? undefined : cancel)
  const cancelId = options.cancelId ?? (cancel === -1 ? undefined : cancel)
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
Shows the folder picker; returns the chosen folder, or null when cancelled.
The chosen folder becomes a project folder `project:load` opens without asking.
*/
export async function openFolderDialog(
  dialog: Pick<Dialog, 'showOpenDialog'>,
  options: Omit<OpenFolderOptions, 'defaultPath'> & { defaultPath?: string | undefined } = {}
): Promise<string | null> {
  const result = await dialog.showOpenDialog({
    ...(options.defaultPath !== undefined && { defaultPath: options.defaultPath }),
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
Shows the file picker, in `defaultPath` when main chose a folder; returns the chosen file, or
null when cancelled. The chosen file becomes readable by read-by-path for the rest of the session.
*/
export async function openFileDialog(
  dialog: Pick<Dialog, 'showOpenDialog'>,
  options: Omit<OpenFileOptions, 'defaultPath'> & { defaultPath?: string | undefined }
): Promise<string | null> {
  const result = await dialog.showOpenDialog({
    ...(options.defaultPath !== undefined && { defaultPath: options.defaultPath }),
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

/**
Message box options of the documented shape: 1-4 buttons, button ids within them
*/
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
    if (!Array.isArray(buttons) || buttons.length === 0 || buttons.length > 4) fail()
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

/**
What a dialog may open at: a bare file name, or a folder it opens in
*/
export type DialogDefaultClass = 'filename' | 'directory-seed'

const MAX_FILENAME_LENGTH = 255

/**
The class of a dialog's default path, or null when the dialog opens without it. Decided from
the text alone, before anything looks the path up: the dialog looks its default path up before
the user acts, and looking up a network path sends the user's Windows credentials to its host.
*/
export function classifyDialogDefault(
  value: unknown,
  pathImpl: PlatformPath = path
): DialogDefaultClass | null {
  if (typeof value !== 'string' || value === '' || value.includes('\0') || isUncText(value))
    return null
  // ':' is not part of a file name: `C:x.js` is relative to the current folder of drive C
  if (!/[\\/:]/.test(value)) {
    const isNamed =
      value !== '.' &&
      value !== '..' &&
      value.length <= MAX_FILENAME_LENGTH &&
      isAllowedExtension(value, pathImpl)
    return isNamed ? 'filename' : null
  }
  if (!pathImpl.isAbsolute(value)) return null
  try {
    assertSafeProjectPath(value, pathImpl)
    return 'directory-seed'
  } catch {
    return null
  }
}

/**
The save dialog's default path: a bare file name, or a full path to a file the app may write
(Save asks again at the file it last chose); anything else is dropped.
*/
export function checkSaveDefaultPath(
  value: unknown,
  pathImpl: PlatformPath = path
): string | undefined {
  if (typeof value !== 'string') return undefined
  switch (classifyDialogDefault(value, pathImpl)) {
    case 'filename': {
      return value
    }
    case 'directory-seed': {
      return isAllowedExtension(value, pathImpl) ? value : undefined
    }
    default: {
      return undefined
    }
  }
}

/**
The folder dialog's default path: a folder it opens beside; anything else is dropped
*/
function checkOpenDefaultPath(value: unknown): string | undefined {
  return typeof value === 'string' && classifyDialogDefault(value) === 'directory-seed'
    ? value
    : undefined
}

/**
A folder the file of dialog folders keeps: one a dialog may open at, or a local drive or
filesystem root (`D:\`, `/`), which a dialog may open at though a project may not be one
*/
export function checkDialogFolder(
  value: unknown,
  pathImpl: PlatformPath = path
): string | undefined {
  if (typeof value !== 'string') return undefined
  const isDriveRoot = pathImpl.sep === '\\' ? /^[A-Z]:[\\/]$/i.test(value) : value === '/'
  return isDriveRoot || classifyDialogDefault(value, pathImpl) === 'directory-seed'
    ? value
    : undefined
}

/**
Save dialog options: a safe default path and well-formed filters; anything else dropped
*/
function checkSaveFileOptions(value: unknown): SaveFileOptions {
  if (!isRecord(value)) return {}
  const { defaultPath: rawDefaultPath, filters: rawFilters } = value
  const defaultPath = checkSaveDefaultPath(rawDefaultPath)
  const filters = checkFilters(rawFilters)
  return {
    ...(defaultPath !== undefined && { defaultPath }),
    ...(filters !== undefined && { filters })
  }
}

/**
Open dialog options: well-formed filters; anything else dropped, as main picks the folder
*/
function checkOpenFileOptions(value: unknown): OpenFileOptions {
  if (!isRecord(value)) return {}
  const filters = checkFilters(value['filters'])
  return filters === undefined ? {} : { filters }
}

/**
Folder dialog options: a folder to suggest; anything else dropped
*/
function checkOpenFolderOptions(value: unknown): OpenFolderOptions {
  if (!isRecord(value)) return {}
  const defaultPath = checkOpenDefaultPath(value['defaultPath'])
  return defaultPath === undefined ? {} : { defaultPath }
}

type DefaultingDialog = 'open-folder' | 'open-file' | 'save-file'

/**
Which dialogs share a remembered folder: the folder dialog, or the channel with the first
extension of its first filter (the handler's own filter, `.js`, when there is none).
*/
export function dialogKind(
  channel: DefaultingDialog,
  filters?: readonly { name: string; extensions: readonly string[] }[]
): string {
  if (channel === 'open-folder') return channel
  return `${channel}:.${filters?.[0]?.extensions[0] ?? 'js'}`
}

export interface DialogDefaultRequest {
  channel: DefaultingDialog
  kind: string
  /**
  The renderer's default path, after the argument check
  */
  rendererValue: string | undefined
  /**
  The folder its kind last chose, this session or an earlier one; used if it still exists
  */
  lastDirectory: string | undefined
  projectRoot: string | null
  /**
  Awaited, so a slow or offline drive never holds up the main process
  */
  directoryExists: (dir: string) => Promise<boolean>
}

/**
The default path a dialog opens with, or undefined for none: from Electron 43 a dialog without
one opens in Downloads, and the system no longer restores the folder it last showed.
*/
export async function resolveDialogDefaultPath(
  request: DialogDefaultRequest,
  pathImpl: PlatformPath = path
): Promise<string | undefined> {
  const { rendererValue } = request
  // It may come from an earlier launch: a folder deleted since, or on a drive no longer there,
  // would open the dialog with the folder's name typed in
  const lastDirectory = async (): Promise<string | undefined> =>
    request.lastDirectory !== undefined && (await request.directoryExists(request.lastDirectory))
      ? request.lastDirectory
      : undefined
  switch (request.channel) {
    case 'open-folder': {
      // Beside the suggested project, so its siblings show
      if (rendererValue !== undefined) {
        const parent = pathImpl.dirname(rendererValue)
        if (await request.directoryExists(parent)) return parent
      }
      return lastDirectory()
    }
    case 'open-file': {
      // A plugin, with a project open: its plugins folder, as save starts there
      if (request.kind === dialogKind('open-file') && request.projectRoot !== null) {
        const folder = pathImpl.join(request.projectRoot, 'js', 'plugins')
        if (await request.directoryExists(folder)) return folder
      }
      return lastDirectory()
    }
    case 'save-file': {
      // A full path is the file Save asks again at
      if (rendererValue !== undefined && pathImpl.isAbsolute(rendererValue)) return rendererValue
      const folder =
        request.kind === dialogKind('save-file') && request.projectRoot !== null
          ? pathImpl.join(request.projectRoot, 'js', 'plugins')
          : await lastDirectory()
      if (folder === undefined) return rendererValue
      return rendererValue === undefined ? folder : pathImpl.join(folder, rendererValue)
    }
  }
}

/**
A folder a dialog may open in: absent and unreadable both mean none, as a default opens nothing
*/
async function directoryExists(dir: string): Promise<boolean> {
  try {
    return (await stat(dir)).isDirectory()
  } catch {
    return false
  }
}

/**
The file beside the granted project folders that keeps the folder each kind of dialog last chose
*/
export const DIALOG_FOLDERS_FILE = 'dialog-folders.json'

/**
How many kinds of dialog the file keeps a folder for, the most recently chosen ones
*/
export const MAX_DIALOG_FOLDERS = 32

/**
A kind `dialogKind` gives for the filters the argument check lets through
*/
function isDialogKind(kind: string): boolean {
  if (kind === dialogKind('open-folder')) return true
  const extension = /^(?:open-file|save-file):\.(.+)$/.exec(kind)?.[1]
  return extension !== undefined && isFilterExtension(extension)
}

const reasonOf = (error: unknown): string =>
  error instanceof Error ? error.message : String(error)

/**
The folders kept in `file`, by kind, oldest choice first. Only known kinds and local absolute
folders are kept, as a dialog looks its folder up; a missing or unreadable file keeps none.
*/
async function readDialogFolders(file: string): Promise<Map<string, string>> {
  let text: string
  try {
    text = await readFile(file, 'utf8')
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      log.warn(`[dialog] Could not read ${file}: ${reasonOf(error)}`)
    }
    return new Map()
  }
  try {
    const folders: unknown = (JSON.parse(text) as { folders?: unknown } | null)?.folders
    if (!isRecord(folders)) throw new Error('no folders by dialog kind')
    const kept = Object.entries(folders).filter(
      (entry): entry is [string, string] =>
        isDialogKind(entry[0]) && checkDialogFolder(entry[1]) !== undefined
    )
    return new Map(kept.slice(-MAX_DIALOG_FOLDERS))
  } catch (error) {
    log.warn(`[dialog] Ignoring ${file}: ${reasonOf(error)}`)
    return new Map()
  }
}

/**
The methods of Electron's `dialog` the handlers call
*/
export type DialogPort = Pick<Dialog, 'showOpenDialog' | 'showSaveDialog' | 'showMessageBox'>

type DialogChannel =
  | 'dialog:open-folder'
  | 'dialog:save-file'
  | 'dialog:open-file'
  | 'dialog:message'

/**
Each handler reads `dialog`'s method when it runs, so a method replaced later is the one used.
The open and save dialogs open where their kind last chose, also after a restart once main
keeps its files in the user data folder (`setProjectRootsDir`).
*/
export function createDialogHandlers(dialog: DialogPort): Pick<InvokeHandlers, DialogChannel> {
  /**
  Folders chosen this session; they win over the file, which another app instance may write
  */
  const chosenFolders = new Map<string, string>()
  /**
  Writes of the folders file, one after another
  */
  let saving: Promise<void> = Promise.resolve()
  const foldersFile = (): string | null => {
    const dir = getProjectRootsDir()
    return dir === null ? null : path.join(dir, DIALOG_FOLDERS_FILE)
  }
  const lastDirectory = async (kind: string): Promise<string | undefined> => {
    const chosen = chosenFolders.get(kind)
    const file = foldersFile()
    if (chosen !== undefined || file === null) return chosen
    return (await readDialogFolders(file)).get(kind)
  }
  const defaultPath = async (
    channel: DefaultingDialog,
    kind: string,
    rendererValue: string | undefined
  ): Promise<string | undefined> =>
    resolveDialogDefaultPath({
      channel,
      kind,
      rendererValue,
      lastDirectory: await lastDirectory(kind),
      projectRoot: getCurrentProjectRoot(),
      directoryExists
    })
  /**
  Keeps the folder of a chosen path for the next dialog of its kind, in the file too unless it
  is a folder the file does not keep (then the file keeps the kind's earlier one). The dialog
  answers without waiting for the file, which a locked file or slow drive would hold up; a
  failed write is logged and the folder still holds for this session.
  */
  const remember = (kind: string, chosen: string | null): string | null => {
    if (chosen === null) return chosen
    const folder = path.dirname(chosen)
    chosenFolders.set(kind, folder)
    const file = foldersFile()
    if (file === null || checkDialogFolder(folder) === undefined) return chosen
    saving = saving.then(async () => {
      const kept = await readDialogFolders(file)
      // Re-added last, as the most recent choice
      kept.delete(kind)
      kept.set(kind, folder)
      const folders = Object.fromEntries([...kept].slice(-MAX_DIALOG_FOLDERS))
      try {
        // Another app instance may save at the same moment: each writes its own temporary file
        await replaceFile(file, Buffer.from(`${JSON.stringify({ folders }, null, 2)}\n`), false)
      } catch (error) {
        log.warn(`[dialog] Could not save ${file}: ${reasonOf(error)}`)
      }
    })
    return chosen
  }

  return {
    'dialog:open-folder': {
      access: 'none',
      check: (raw) => [checkOpenFolderOptions(raw[0])],
      run: async (options = {}) => {
        const kind = dialogKind('open-folder')
        const seed = await defaultPath('open-folder', kind, options.defaultPath)
        return remember(kind, await openFolderDialog(dialog, { defaultPath: seed }))
      }
    },
    'dialog:save-file': {
      access: 'none',
      check: (raw) => [checkSaveFileOptions(raw[0])],
      run: async (options = {}) => {
        const kind = dialogKind('save-file', options.filters)
        const seed = await defaultPath('save-file', kind, options.defaultPath)
        return remember(kind, await showSaveFileDialog(dialog, { ...options, defaultPath: seed }))
      }
    },
    'dialog:open-file': {
      access: 'none',
      check: (raw) => [checkOpenFileOptions(raw[0])],
      run: async (options = {}) => {
        const kind = dialogKind('open-file', options.filters)
        const seed = await defaultPath('open-file', kind, undefined)
        return remember(kind, await openFileDialog(dialog, { ...options, defaultPath: seed }))
      }
    },
    'dialog:message': {
      access: 'none',
      check: (raw) => [checkMessageOptions(raw[0])],
      run: async (options) => showMessageDialog(dialog, options)
    }
  }
}
