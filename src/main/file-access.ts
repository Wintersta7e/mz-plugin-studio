import path from 'path'
import { isAllowedExtension, type PlatformPath } from '../shared/path-safety'

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
