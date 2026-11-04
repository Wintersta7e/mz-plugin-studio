import path from 'node:path'

/**
The path module or one of its flavours, `path.posix` and `path.win32`
*/
export type PlatformPath = typeof path

/**
Allowed file extensions for read/write-by-path operations
*/
const ALLOWED_EXTENSIONS = new Set(['.js', '.mzparams', '.json', '.md', '.ts'])

/**
Win32 absolute paths the guard accepts: drive-absolute `C:\` and UNC `\\host\share`
*/
const WIN32_DRIVE_ABSOLUTE = /^[A-Z]:[\\/]/i
const WIN32_UNC = /^[\\/]{2}[^\\/?.]/
const WIN32_DRIVE = /^[A-Z]:/i

/**
A name Windows opens as a device in any folder: CON, PRN, AUX, NUL, CONIN$, CONOUT$, COM1-9,
LPT1-9 and COM or LPT with a superscript 1-3, in any case, also with spaces after it or an
extension (`NUL.js`, `aux .js`). COM0 and LPT0 are not on Node's own list for `path.win32`.
*/
const WIN32_DEVICE_NAME =
  /^(?:con|prn|aux|nul|conin\$|conout\$|(?:com|lpt)[1-9\u00B9\u00B2\u00B3]) *(?:\..*)?$/i

/**
Whether the text starts with two separators: a network path (`\\host\share`, `//host/share`)
or a Windows device path (`\\?\`, `\\.\`). Decided from the text alone, as looking a network
path up sends the user's Windows credentials to its host.
*/
export function isUncText(p: string): boolean {
  return /^[\\/]{2}/.test(p)
}

function isWin32(pathImpl: PlatformPath): boolean {
  return pathImpl.sep === '\\'
}

/**
Check the raw input before anything resolves it: a non-empty string without NUL,
absolute under `pathImpl`, and with no '..' segment. On win32 the resolved path also has no
':' after the drive and no device name segment. Returns the resolved path.
*/
function resolveCheckedPath(p: string, pathImpl: PlatformPath): string {
  if (typeof p !== 'string' || p === '' || p.includes('\0')) {
    throw new Error('Invalid path: expected a non-empty path without NUL characters')
  }
  // On win32 this also rejects device paths (\\?\, \\.\), drive-relative C:x and rooted \x
  const isAbsolute =
    pathImpl.isAbsolute(p) &&
    (!isWin32(pathImpl) || WIN32_DRIVE_ABSOLUTE.test(p) || WIN32_UNC.test(p))
  if (!isAbsolute) {
    throw new Error('Invalid path: must be an absolute path')
  }
  if (p.split(/[\\/]/).includes('..')) {
    throw new Error("Invalid path: '..' segments are not allowed")
  }
  const resolved = pathImpl.resolve(p)
  if (isWin32(pathImpl)) {
    // Elsewhere a ':' opens an alternate data stream on NTFS (x.js:hidden.js)
    if (resolved.replace(WIN32_DRIVE, '').includes(':')) {
      throw new Error("Invalid path: ':' is allowed only after the drive letter")
    }
    const device = resolved.split(/[\\/]/).find((segment) => WIN32_DEVICE_NAME.test(segment))
    if (device !== undefined) {
      throw new Error(`Invalid path: ${JSON.stringify(device)} is a device name on Windows`)
    }
  }
  return resolved
}

/**
Whether the file's extension is one that read/write-by-path operations accept
*/
export function isAllowedExtension(filePath: string, pathImpl: PlatformPath = path): boolean {
  return ALLOWED_EXTENSIONS.has(pathImpl.extname(filePath).toLowerCase())
}

/**
Validate that a file path is safe for read/write operations.
- Absolute, with no '..' segment, checked before resolving
- Restricts to allowed file extensions
*/
export function assertSafeFilePath(filePath: string, pathImpl: PlatformPath = path): void {
  const resolved = resolveCheckedPath(filePath, pathImpl)
  if (!isAllowedExtension(resolved, pathImpl)) {
    const extension = pathImpl.extname(resolved).toLowerCase()
    throw new Error(
      `File extension "${extension}" is not allowed. Allowed: ${[...ALLOWED_EXTENSIONS].join(', ')}`
    )
  }
}

/**
Validate that a filename is a simple name (no path separators, NUL, ':', traversal or Windows
device name). It is checked for both platforms, so `_pathImpl` does not change the result.
*/
export function assertSafeFilename(filename: string, _pathImpl: PlatformPath = path): void {
  // ':' would open an alternate data stream on NTFS (x.js:ads.js)
  if (typeof filename !== 'string' || filename.includes('\0') || filename.includes(':')) {
    throw new Error(`Invalid filename: ${JSON.stringify(filename)}`)
  }
  if (/[\\/]/.test(filename) || filename === '.' || filename === '..') {
    throw new Error('Invalid filename: must not contain path separators or traversal')
  }
  if (WIN32_DEVICE_NAME.test(filename)) {
    throw new Error(`Invalid filename: ${JSON.stringify(filename)} is a device name on Windows`)
  }
  if (!filename.endsWith('.js')) {
    throw new Error('Invalid filename: must have .js extension')
  }
}

/**
Validate that a project path is safe: absolute, no '..' segment, and not a drive or
filesystem root (handlers create and read folders under the project path).
*/
export function assertSafeProjectPath(projectPath: string, pathImpl: PlatformPath = path): void {
  const resolved = resolveCheckedPath(projectPath, pathImpl)
  if (pathImpl.parse(resolved).root === resolved) {
    throw new Error('Invalid path: a drive or filesystem root cannot be a project folder')
  }
}
