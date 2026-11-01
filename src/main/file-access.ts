import { readFile } from 'fs/promises'
import path from 'path'
import log from 'electron-log/main'
import { replaceFile } from './atomic-write'
import { accessDenied } from '../shared/ipc-types'
import {
  assertSafeFilePath,
  assertSafeProjectPath,
  isAllowedExtension,
  isUncText,
  type PlatformPath
} from '../shared/path-safety'

/**
 * What a channel may touch: a project folder to load, the open project, a file chosen in a save
 * dialog, a file to read, or nothing on disk
 */
export type AccessClass =
  | 'project-load'
  | 'current-project'
  | 'granted-write'
  | 'granted-read'
  | 'none'

/** Paths returned by a save dialog this session; kept until the app quits, never consumed */
const writeGrants = new Set<string>()

/** The resolved path, case-folded on win32 where file names are case-insensitive */
export function grantKey(filePath: string, pathImpl: PlatformPath = path): string {
  const resolved = pathImpl.resolve(filePath)
  return pathImpl.sep === '\\' ? resolved.toLowerCase() : resolved
}

/** Allow later writes to a path the user chose in a save dialog (allowed extensions only) */
export function recordWriteGrant(filePath: string, pathImpl: PlatformPath = path): void {
  if (isAllowedExtension(filePath, pathImpl)) {
    writeGrants.add(grantKey(filePath, pathImpl))
  }
}

/** Throws unless a save dialog returned this path during the session */
export function assertWriteGranted(filePath: string, pathImpl: PlatformPath = path): void {
  if (!writeGrants.has(grantKey(filePath, pathImpl))) {
    throw accessDenied(`${filePath} was not chosen in a save dialog`)
  }
}

/** Paths returned by an open or save dialog this session; kept until the app quits */
const readGrants = new Set<string>()

/** Allow later reads of a path the user chose in a file dialog (allowed extensions only) */
export function recordReadGrant(filePath: string, pathImpl: PlatformPath = path): void {
  if (isAllowedExtension(filePath, pathImpl)) {
    readGrants.add(grantKey(filePath, pathImpl))
  }
}

/**
 * Throws unless the path was chosen in a file dialog this session, or is a file under the open
 * project's `js/plugins` folder. A UNC path needs the dialog, also under a UNC project.
 */
function assertReadAllowed(filePath: string, pathImpl: PlatformPath): void {
  if (readGrants.has(grantKey(filePath, pathImpl))) return
  const root = getCurrentProjectRoot()
  if (root !== null && !isUncText(filePath)) {
    const plugins = grantKey(pathImpl.join(root, 'js', 'plugins'), pathImpl)
    const relative = pathImpl.relative(plugins, grantKey(filePath, pathImpl))
    const outside =
      relative === '' ||
      relative === '..' ||
      relative.startsWith(`..${pathImpl.sep}`) ||
      pathImpl.isAbsolute(relative)
    if (!outside) return
  }
  throw accessDenied("not in the open project's plugins folder or chosen in a dialog")
}

/** The file in the app's user data folder that keeps the granted project folders */
export const PROJECT_ROOTS_FILE = 'project-roots.json'

/** How many granted project folders the file keeps, most recently used first */
export const MAX_PROJECT_ROOTS = 20

/** Project folders granted this session, as grant keys */
const sessionRoots = new Set<string>()

/** The folder holding the granted project folders file; null keeps grants for the session only */
let rootsDir: string | null = null

/** Writes of the granted project folders file, one after another */
let persisting: Promise<void> = Promise.resolve()

/** The project folder `project:load` last loaded; the project channels act only on it */
let currentProjectRoot: string | null = null

/** Keep granted project folders across restarts in `dir` (the app's user data folder) */
export function setProjectRootsDir(dir: string): void {
  rootsDir = dir
}

/** The folder `setProjectRootsDir` set, where main keeps what lasts across restarts; null before */
export function getProjectRootsDir(): string | null {
  return rootsDir
}

const reasonOf = (error: unknown): string =>
  error instanceof Error ? error.message : String(error)

/** The granted project folders kept in `dir`; a missing or unreadable file grants none */
async function readPersistedRoots(dir: string): Promise<string[]> {
  const file = path.join(dir, PROJECT_ROOTS_FILE)
  let text: string
  try {
    text = await readFile(file, 'utf8')
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      log.warn(`[file-access] Could not read ${file}: ${reasonOf(error)}`)
    }
    return []
  }
  try {
    const roots: unknown = (JSON.parse(text) as { roots?: unknown } | null)?.roots
    if (!Array.isArray(roots)) throw new Error('no list of project folders')
    return roots.filter((root): root is string => typeof root === 'string')
  } catch (error) {
    log.warn(`[file-access] Ignoring ${file}: ${reasonOf(error)}`)
    return []
  }
}

/**
 * Grant a project folder the user chose in the folder dialog or confirmed opening; it moves to
 * the front of the kept list. A failed write is logged and the grant still holds this session.
 */
export async function recordProjectRoot(
  projectPath: string,
  pathImpl: PlatformPath = path
): Promise<void> {
  const resolved = pathImpl.resolve(projectPath)
  const key = grantKey(resolved, pathImpl)
  sessionRoots.add(key)
  const dir = rootsDir
  if (dir === null) return
  persisting = persisting.then(async () => {
    const kept = await readPersistedRoots(dir)
    const roots = [resolved, ...kept.filter((root) => grantKey(root, pathImpl) !== key)].slice(
      0,
      MAX_PROJECT_ROOTS
    )
    const file = path.join(dir, PROJECT_ROOTS_FILE)
    try {
      // Another app instance may save at the same moment: each writes its own temporary file
      await replaceFile(file, Buffer.from(`${JSON.stringify({ roots }, null, 2)}\n`), false)
    } catch (error) {
      log.warn(`[file-access] Could not save ${file}: ${reasonOf(error)}`)
    }
  })
  await persisting
}

/** Whether the folder was granted this session or kept from an earlier one */
export async function isProjectRootGranted(
  projectPath: string,
  pathImpl: PlatformPath = path
): Promise<boolean> {
  const key = grantKey(projectPath, pathImpl)
  if (sessionRoots.has(key)) return true
  if (rootsDir === null) return false
  const kept = await readPersistedRoots(rootsDir)
  return kept.some((root) => grantKey(root, pathImpl) === key)
}

/** Make `projectPath` the open project, after `project:load` loaded it */
export function setCurrentProjectRoot(projectPath: string, pathImpl: PlatformPath = path): void {
  currentProjectRoot = pathImpl.resolve(projectPath)
}

/** The open project's folder, or null before a project is loaded */
export function getCurrentProjectRoot(): string | null {
  return currentProjectRoot
}

/** Throws unless `target`, the request's first argument, is within what `access` allows */
export function authorize(
  access: AccessClass,
  target: unknown,
  pathImpl: PlatformPath = path
): void {
  switch (access) {
    case 'project-load':
      assertSafeProjectPath(target as string, pathImpl)
      return
    case 'current-project': {
      assertSafeProjectPath(target as string, pathImpl)
      const root = getCurrentProjectRoot()
      if (root === null) throw accessDenied('no project is open')
      if (grantKey(target as string, pathImpl) !== grantKey(root, pathImpl)) {
        throw accessDenied('not the open project')
      }
      return
    }
    case 'granted-write':
      assertSafeFilePath(target as string, pathImpl)
      assertWriteGranted(target as string, pathImpl)
      return
    case 'granted-read':
      assertSafeFilePath(target as string, pathImpl)
      assertReadAllowed(target as string, pathImpl)
      return
    case 'none':
      return
  }
}
