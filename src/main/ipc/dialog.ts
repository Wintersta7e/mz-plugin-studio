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
  getProjectRootsDirectory,
  isFileNotFound,
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
    filters: options.filters ?? [{ name: 'JavaScript', extensions: ['js'] }],
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
  const type = options.type ?? 'info'
  log.debug(`[dialog:message] ${type}: ${options.message}`)
  const buttons = options.buttons ?? ['OK']
  const cancel = buttons.indexOf('Cancel')
  const defaultId = options.defaultId ?? (cancel === -1 ? undefined : cancel)
  const cancelId = options.cancelId ?? (cancel === -1 ? undefined : cancel)
  const result = await dialog.showMessageBox({
    type,
    // An empty title shows the app's name too
    title: options.title === undefined || options.title === '' ? 'MZ Plugin Studio' : options.title,
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
async function openFolderDialog(
  dialog: Pick<Dialog, 'showOpenDialog'>,
  options: Omit<OpenFolderOptions, 'defaultPath'> & { defaultPath?: string | undefined } = {}
): Promise<string | null> {
  const result = await dialog.showOpenDialog({
    ...(options.defaultPath !== undefined && { defaultPath: options.defaultPath }),
    properties: ['openDirectory'],
    title: 'Select RPG Maker MZ Project Folder'
  })

  const selected = result.canceled ? undefined : result.filePaths[0]
  if (selected === undefined) {
    log.debug('[dialog:open-folder] Cancelled')
    return null
  }

  log.info(`[dialog:open-folder] Selected: ${selected}`)
  await recordProjectRoot(selected)
  return selected
}

/**
Shows the file picker, in `defaultPath` when main chose a folder; returns the chosen file, or
null when cancelled. The chosen file becomes readable by read-by-path for the rest of the session.
*/
async function openFileDialog(
  dialog: Pick<Dialog, 'showOpenDialog'>,
  options: Omit<OpenFileOptions, 'defaultPath'> & { defaultPath?: string | undefined }
): Promise<string | null> {
  const result = await dialog.showOpenDialog({
    ...(options.defaultPath !== undefined && { defaultPath: options.defaultPath }),
    properties: ['openFile'],
    filters: options.filters ?? [{ name: 'JavaScript', extensions: ['js'] }]
  })

  const selected = result.canceled ? undefined : result.filePaths[0]
  if (selected === undefined) {
    log.debug('[dialog:open-file] Cancelled')
    return null
  }

  log.info(`[dialog:open-file] Selected: ${selected}`)
  recordReadGrant(selected)
  return selected
}

const MESSAGE_TYPES = ['none', 'info', 'error', 'question', 'warning'] as const

type MessageType = (typeof MESSAGE_TYPES)[number]

const isMessageType = (value: unknown): value is MessageType =>
  MESSAGE_TYPES.some((type) => type === value)

function failMessageOptions(): never {
  throw invalidArguments('dialog:message')
}

/**
The buttons of a message box: 1-4 texts, or undefined for the single OK button
*/
function checkMessageButtons(buttons: unknown): string[] | undefined {
  if (buttons === undefined) return undefined
  if (!Array.isArray(buttons)) failMessageOptions()
  const list: readonly unknown[] = buttons
  if (list.length === 0 || list.length > 4) failMessageOptions()
  if (!list.every((button): button is string => typeof button === 'string')) failMessageOptions()
  return [...list]
}

/**
A button id among `count` buttons, or undefined when none is named
*/
function checkButtonId(id: unknown, count: number): number | undefined {
  if (id === undefined) return undefined
  if (typeof id !== 'number' || !Number.isSafeInteger(id) || id < 0 || id >= count) {
    failMessageOptions()
  }
  return id
}

/**
Message box options of the documented shape: 1-4 buttons, button ids within them
*/
function checkMessageOptions(value: unknown): MessageDialogOptions {
  if (!isRecord(value)) failMessageOptions()
  const { type, title, message, buttons: rawButtons, defaultId, cancelId } = value
  if (typeof message !== 'string') failMessageOptions()
  if (type !== undefined && !isMessageType(type)) failMessageOptions()
  if (title !== undefined && typeof title !== 'string') failMessageOptions()
  const buttons = checkMessageButtons(rawButtons)
  const count = buttons === undefined ? 1 : buttons.length
  const defaultButton = checkButtonId(defaultId, count)
  const cancelButton = checkButtonId(cancelId, count)
  return {
    message,
    ...(type !== undefined && { type }),
    ...(title !== undefined && { title }),
    ...(buttons !== undefined && { buttons }),
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
  const kind = classifyDialogDefault(value, pathImpl)
  const isKept =
    kind === 'filename' || (kind === 'directory-seed' && isAllowedExtension(value, pathImpl))
  return isKept ? value : undefined
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
  return channel === 'open-folder' ? channel : `${channel}:.${filters?.[0]?.extensions[0] ?? 'js'}`
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
  projectRoot: string | undefined
  /**
  Awaited, so a slow or offline drive never holds up the main process
  */
  directoryExists: (directory: string) => Promise<boolean>
}

/**
The folder the request's kind last chose, while it exists. It may come from an earlier launch:
a folder deleted since, or on a drive no longer there, would open the dialog with the folder's
name typed in.
*/
async function existingLastDirectory(request: DialogDefaultRequest): Promise<string | undefined> {
  const { lastDirectory } = request
  return lastDirectory !== undefined && (await request.directoryExists(lastDirectory))
    ? lastDirectory
    : undefined
}

/**
The open project's plugins folder for a dialog of plugins, or undefined: none open, or another kind
*/
function pluginsFolder(request: DialogDefaultRequest, pathImpl: PlatformPath): string | undefined {
  return request.kind === dialogKind(request.channel) && request.projectRoot !== undefined
    ? pathImpl.join(request.projectRoot, 'js', 'plugins')
    : undefined
}

/**
The save dialog's default path: a full path is the file Save asks again at; a file name goes in
the plugins folder or the folder last chosen, else alone
*/
async function saveDefaultPath(
  request: DialogDefaultRequest,
  pathImpl: PlatformPath
): Promise<string | undefined> {
  const { rendererValue } = request
  if (rendererValue !== undefined && pathImpl.isAbsolute(rendererValue)) return rendererValue
  const folder = pluginsFolder(request, pathImpl) ?? (await existingLastDirectory(request))
  if (folder === undefined) return rendererValue
  return rendererValue === undefined ? folder : pathImpl.join(folder, rendererValue)
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
  switch (request.channel) {
    case 'open-folder': {
      // Beside the suggested project, so its siblings show
      if (rendererValue !== undefined) {
        const parent = pathImpl.dirname(rendererValue)
        if (await request.directoryExists(parent)) return parent
      }
      return existingLastDirectory(request)
    }
    case 'open-file': {
      // A plugin, with a project open: its plugins folder, as save starts there
      const folder = pluginsFolder(request, pathImpl)
      const isOpenable = folder !== undefined && (await request.directoryExists(folder))
      return isOpenable ? folder : existingLastDirectory(request)
    }
    case 'save-file': {
      return saveDefaultPath(request, pathImpl)
    }
  }
}

/**
A folder a dialog may open in: absent and unreadable both mean none, as a default opens nothing
*/
async function isExistingDirectory(directory: string): Promise<boolean> {
  try {
    const stats = await stat(directory)
    return stats.isDirectory()
  } catch {
    return false
  }
}

/**
The file beside the granted project folders that keeps the folder each kind of dialog last chose
*/
const DIALOG_FOLDERS_FILE = 'dialog-folders.json'

/**
The file of dialog folders, or undefined while main keeps nothing across restarts
*/
function dialogFoldersFile(): string | undefined {
  const directory = getProjectRootsDirectory()
  return directory === undefined ? undefined : path.join(directory, DIALOG_FOLDERS_FILE)
}

/**
How many kinds of dialog the file keeps a folder for, the most recently chosen ones
*/
const MAX_DIALOG_FOLDERS = 32

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
    if (!isFileNotFound(error)) {
      log.warn(`[dialog] Could not read ${file}: ${reasonOf(error)}`)
    }
    return new Map()
  }
  try {
    const parsed: unknown = JSON.parse(text)
    const folders = isRecord(parsed) ? parsed['folders'] : undefined
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
keeps its files in the user data folder (`setProjectRootsDirectory`).
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
  const lastDirectory = async (kind: string): Promise<string | undefined> => {
    const chosen = chosenFolders.get(kind)
    const file = dialogFoldersFile()
    if (chosen !== undefined || file === undefined) return chosen
    const kept = await readDialogFolders(file)
    return kept.get(kind)
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
      directoryExists: isExistingDirectory
    })
  /**
  Keeps the folder of a chosen path for the next dialog of its kind, in the file too unless it
  is a folder the file does not keep (then the file keeps the kind's earlier one). The dialog
  answers without waiting for the file, which a locked file or slow drive would hold up; a
  failed write is logged and the folder still holds for this session.
  */
  const keepFolder = (kind: string, folder: string): void => {
    chosenFolders.set(kind, folder)
    const file = dialogFoldersFile()
    if (file === undefined || checkDialogFolder(folder) === undefined) return
    const previous = saving
    saving = (async () => {
      await previous
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
    })()
  }
  const remember = (kind: string, chosen: string | null): string | null => {
    if (chosen !== null) keepFolder(kind, path.dirname(chosen))
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
