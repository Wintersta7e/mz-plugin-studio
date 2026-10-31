import path from 'path'
import {
  assertSafeFilePath,
  assertSafeProjectPath,
  isAllowedExtension,
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
    throw new Error(`Access denied: ${filePath} was not chosen in a save dialog`)
  }
}

/** Throws unless `target`, the request's first argument, is within what `access` allows */
export function authorize(
  access: AccessClass,
  target: unknown,
  pathImpl: PlatformPath = path
): void {
  switch (access) {
    case 'project-load':
    case 'current-project':
      assertSafeProjectPath(target as string, pathImpl)
      return
    case 'granted-write':
      assertSafeFilePath(target as string, pathImpl)
      assertWriteGranted(target as string, pathImpl)
      return
    case 'granted-read':
      assertSafeFilePath(target as string, pathImpl)
      return
    case 'none':
      return
  }
}
