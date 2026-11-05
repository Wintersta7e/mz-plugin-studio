import { readFile } from 'node:fs/promises'
import path from 'node:path'
import log from 'electron-log/main'
import { replaceFile } from './atomic-write'
import { isRecord } from './ipc/arguments'
import { accessDenied } from '../shared/ipc-types'
import {
  assertSafeFilePath,
  assertSafeProjectPath,
  isAllowedExtension,
  isUncText,
  type PlatformPath
} from '../shared/path-safety'

/**
What a channel may touch: a project folder to load, the open project, a file chosen in a save
dialog, a file to read, or nothing on disk
*/
export type AccessClass =
  | 'project-load'
  | 'current-project'
  | 'granted-write'
  | 'granted-read'
  | 'none'

/**
Paths returned by a save dialog this session; kept until the app quits, never consumed
*/
const writeGrants = new Set<string>()

/**
The resolved path, case-folded on win32 where file names are case-insensitive
*/
export function grantKey(filePath: string, pathImpl: PlatformPath = path): string {
  const resolved = pathImpl.resolve(filePath)
  return pathImpl.sep === '\\' ? resolved.toLowerCase() : resolved
}

/**
Allow later writes to a path the user chose in a save dialog (allowed extensions only)
*/
export function recordWriteGrant(filePath: string, pathImpl: PlatformPath = path): void {
  if (isAllowedExtension(filePath, pathImpl)) {
    writeGrants.add(grantKey(filePath, pathImpl))
  }
}

/**
Throws unless a save dialog returned this path during the session
*/
export function assertWriteGranted(filePath: string, pathImpl: PlatformPath = path): void {
  if (!writeGrants.has(grantKey(filePath, pathImpl))) {
    throw accessDenied(`${filePath} was not chosen in a save dialog`)
  }
}

/**
Paths returned by an open or save dialog this session; kept until the app quits
*/
const readGrants = new Set<string>()

/**
Allow later reads of a path the user chose in a file dialog (allowed extensions only)
*/
export function recordReadGrant(filePath: string, pathImpl: PlatformPath = path): void {
  if (isAllowedExtension(filePath, pathImpl)) {
    readGrants.add(grantKey(filePath, pathImpl))
  }
}

/**
Throws unless the path was chosen in a file dialog this session, or is a file under the open
project's `js/plugins` folder. A UNC path needs the dialog, also under a UNC project.
*/
function assertReadAllowed(filePath: string, pathImpl: PlatformPath): void {
  if (readGrants.has(grantKey(filePath, pathImpl))) return
  const root = getCurrentProjectRoot()
  if (root !== undefined && !isUncText(filePath)) {
    const plugins = grantKey(pathImpl.join(root, 'js', 'plugins'), pathImpl)
    const relative = pathImpl.relative(plugins, grantKey(filePath, pathImpl))
    const isOutside =
      relative === '' ||
      relative === '..' ||
      relative.startsWith(`..${pathImpl.sep}`) ||
      pathImpl.isAbsolute(relative)
    if (!isOutside) return
  }
  throw accessDenied("not in the open project's plugins folder or chosen in a dialog")
}

/**
The file in the app's user data folder that keeps the granted project folders
*/
export const PROJECT_ROOTS_FILE = 'project-roots.json'

/**
How many granted project folders the file keeps, most recently used first
*/
export const MAX_PROJECT_ROOTS = 20

/**
Project folders granted this session, as grant keys
*/
const sessionRoots = new Set<string>()

/**
What main keeps for the session, set as the app starts and as projects load
*/
const session: {
  /**
  The folder holding the granted project folders file; none keeps grants for the session only
  */
  rootsDirectory?: string
  /**
  Writes of the granted project folders file, one after another
  */
  persisting: Promise<void>
  /**
  The project folder `project:load` last loaded; the project channels act only on it
  */
  currentProjectRoot?: string
} = { persisting: Promise.resolve() }

/**
Keep granted project folders across restarts in `directory` (the app's user data folder)
*/
export function setProjectRootsDirectory(directory: string): void {
  session.rootsDirectory = directory
}

/**
The folder `setProjectRootsDirectory` set, where main keeps what lasts across restarts;
undefined before
*/
export function getProjectRootsDirectory(): string | undefined {
  return session.rootsDirectory
}

/**
Whether a file operation failed because the file is not there
*/
export function isFileNotFound(error: unknown): boolean {
  return error instanceof Error && 'code' in error && error.code === 'ENOENT'
}

const reasonOf = (error: unknown): string =>
  error instanceof Error ? error.message : String(error)

/**
The granted project folders kept in `directory`; a missing or unreadable file grants none
*/
async function readPersistedRoots(directory: string): Promise<string[]> {
  const file = path.join(directory, PROJECT_ROOTS_FILE)
  let text: string
  try {
    text = await readFile(file, 'utf8')
  } catch (error) {
    if (!isFileNotFound(error)) {
      log.warn(`[file-access] Could not read ${file}: ${reasonOf(error)}`)
    }
    return []
  }
  try {
    const parsed: unknown = JSON.parse(text)
    const roots = isRecord(parsed) ? parsed['roots'] : undefined
    if (!Array.isArray(roots)) throw new TypeError('no list of project folders')
    const list: readonly unknown[] = roots
    return list.filter((root): root is string => typeof root === 'string')
  } catch (error) {
    log.warn(`[file-access] Ignoring ${file}: ${reasonOf(error)}`)
    return []
  }
}

/**
Grant a project folder the user chose in the folder dialog or confirmed opening; it moves to
the front of the kept list. A failed write is logged and the grant still holds this session.
*/
export async function recordProjectRoot(
  projectPath: string,
  pathImpl: PlatformPath = path
): Promise<void> {
  const resolved = pathImpl.resolve(projectPath)
  const key = grantKey(resolved, pathImpl)
  sessionRoots.add(key)
  const directory = session.rootsDirectory
  if (directory === undefined) return
  const previous = session.persisting
  session.persisting = (async () => {
    await previous
    const kept = await readPersistedRoots(directory)
    const roots = [resolved, ...kept.filter((root) => grantKey(root, pathImpl) !== key)].slice(
      0,
      MAX_PROJECT_ROOTS
    )
    const file = path.join(directory, PROJECT_ROOTS_FILE)
    try {
      // Another app instance may save at the same moment: each writes its own temporary file
      await replaceFile(file, Buffer.from(`${JSON.stringify({ roots }, undefined, 2)}\n`), false)
    } catch (error) {
      log.warn(`[file-access] Could not save ${file}: ${reasonOf(error)}`)
    }
  })()
  await session.persisting
}

/**
Whether the folder was granted this session or kept from an earlier one
*/
export async function isProjectRootGranted(
  projectPath: string,
  pathImpl: PlatformPath = path
): Promise<boolean> {
  const key = grantKey(projectPath, pathImpl)
  if (sessionRoots.has(key)) return true
  if (session.rootsDirectory === undefined) return false
  const kept = await readPersistedRoots(session.rootsDirectory)
  return kept.some((root) => grantKey(root, pathImpl) === key)
}

/**
Make `projectPath` the open project, after `project:load` loaded it
*/
export function setCurrentProjectRoot(projectPath: string, pathImpl: PlatformPath = path): void {
  session.currentProjectRoot = pathImpl.resolve(projectPath)
}

/**
The open project's folder, or undefined before a project is loaded
*/
export function getCurrentProjectRoot(): string | undefined {
  return session.currentProjectRoot
}

/**
Throws unless `target`, the request's first argument, is within what `access` allows
*/
export function authorize(
  access: AccessClass,
  target: unknown,
  pathImpl: PlatformPath = path
): void {
  // A target that is not text fails the path checks below as an empty path does
  const targetPath = typeof target === 'string' ? target : ''
  switch (access) {
    case 'project-load': {
      assertSafeProjectPath(targetPath, pathImpl)
      return
    }
    case 'current-project': {
      assertSafeProjectPath(targetPath, pathImpl)
      const root = getCurrentProjectRoot()
      if (root === undefined) throw accessDenied('no project is open')
      if (grantKey(targetPath, pathImpl) !== grantKey(root, pathImpl)) {
        throw accessDenied('not the open project')
      }
      return
    }
    case 'granted-write': {
      assertSafeFilePath(targetPath, pathImpl)
      assertWriteGranted(targetPath, pathImpl)
      return
    }
    case 'granted-read': {
      assertSafeFilePath(targetPath, pathImpl)
      assertReadAllowed(targetPath, pathImpl)
      return
    }
    case 'none': {
      return
    }
  }
}
