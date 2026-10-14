import path from 'path'

/** The path module or one of its flavours, `path.posix` and `path.win32` */
export type PlatformPath = typeof path

/** Allowed file extensions for read/write-by-path operations */
const ALLOWED_EXTENSIONS = new Set(['.js', '.mzparams', '.json', '.md', '.ts'])

/** Win32 absolute paths the guard accepts: drive-absolute `C:\` and UNC `\\host\share` */
const WIN32_DRIVE_ABSOLUTE = /^[A-Za-z]:[\\/]/
const WIN32_UNC = /^[\\/]{2}[^\\/?.]/

/**
 * Check the raw input before anything resolves it: a non-empty string without NUL,
 * absolute under `pathImpl`, and with no '..' segment. Returns the resolved path.
 */
function resolveCheckedPath(p: string, pathImpl: PlatformPath): string {
  if (typeof p !== 'string' || p === '' || p.includes('\0')) {
    throw new Error('Invalid path: expected a non-empty path without NUL characters')
  }
  // On win32 this also rejects device paths (\\?\, \\.\), drive-relative C:x and rooted \x
  const absolute =
    pathImpl.isAbsolute(p) &&
    (pathImpl.sep !== '\\' || WIN32_DRIVE_ABSOLUTE.test(p) || WIN32_UNC.test(p))
  if (!absolute) {
    throw new Error('Invalid path: must be an absolute path')
  }
  if (p.split(/[\\/]/).includes('..')) {
    throw new Error("Invalid path: '..' segments are not allowed")
  }
  return pathImpl.resolve(p)
}

/** Whether the file's extension is one that read/write-by-path operations accept */
export function isAllowedExtension(filePath: string, pathImpl: PlatformPath = path): boolean {
  return ALLOWED_EXTENSIONS.has(pathImpl.extname(filePath).toLowerCase())
}

/**
 * Validate that a file path is safe for read/write operations.
 * - Absolute, with no '..' segment, checked before resolving
 * - Restricts to allowed file extensions
 */
export function assertSafeFilePath(filePath: string, pathImpl: PlatformPath = path): void {
  const resolved = resolveCheckedPath(filePath, pathImpl)
  if (!isAllowedExtension(resolved, pathImpl)) {
    const ext = pathImpl.extname(resolved).toLowerCase()
    throw new Error(
      `File extension "${ext}" is not allowed. Allowed: ${[...ALLOWED_EXTENSIONS].join(', ')}`
    )
  }
}

/**
 * Validate that a filename is a simple name (no path separators, NUL, ':' or traversal).
 * Separators of both platforms are rejected, so `_pathImpl` does not change the result.
 */
export function assertSafeFilename(filename: string, _pathImpl: PlatformPath = path): void {
  // ':' would open an alternate data stream on NTFS (x.js:ads.js)
  if (typeof filename !== 'string' || filename.includes('\0') || filename.includes(':')) {
    throw new Error(`Invalid filename: ${JSON.stringify(filename)}`)
  }
  if (/[\\/]/.test(filename) || filename === '.' || filename === '..') {
    throw new Error('Invalid filename: must not contain path separators or traversal')
  }
  if (!filename.endsWith('.js')) {
    throw new Error('Invalid filename: must have .js extension')
  }
}

/**
 * Validate that a project path is safe: absolute, no '..' segment, and not a drive or
 * filesystem root (handlers create and read folders under the project path).
 */
export function assertSafeProjectPath(projectPath: string, pathImpl: PlatformPath = path): void {
  const resolved = resolveCheckedPath(projectPath, pathImpl)
  if (pathImpl.parse(resolved).root === resolved) {
    throw new Error('Invalid path: a drive or filesystem root cannot be a project folder')
  }
}
