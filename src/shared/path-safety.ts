import { normalize, resolve, basename, extname } from 'path'

/** Allowed file extensions for read/write-by-path operations */
const ALLOWED_EXTENSIONS = new Set(['.js', '.mzparams', '.json', '.md', '.ts'])

/**
 * Validate that a file path is safe for read/write operations.
 * - Normalizes the path to resolve traversal sequences
 * - Rejects paths with remaining '..' components
 * - Restricts to allowed file extensions
 */
export function assertSafeFilePath(filePath: string): void {
  const normalized = normalize(resolve(filePath))
  if (normalized.includes('..')) {
    throw new Error('Path traversal is not allowed')
  }
  const ext = extname(normalized).toLowerCase()
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    throw new Error(
      `File extension "${ext}" is not allowed. Allowed: ${[...ALLOWED_EXTENSIONS].join(', ')}`
    )
  }
}

/**
 * Validate that a filename is a simple name (no path separators or traversal).
 */
export function assertSafeFilename(filename: string): void {
  if (filename !== basename(filename) || filename.includes('..')) {
    throw new Error('Invalid filename: must not contain path separators or traversal')
  }
  if (!filename.endsWith('.js')) {
    throw new Error('Invalid filename: must have .js extension')
  }
}

/**
 * Validate that a project path is safe (absolute, no traversal sequences after normalization).
 */
export function assertSafeProjectPath(projectPath: string): void {
  const normalized = normalize(resolve(projectPath))
  if (normalized.includes('..')) {
    throw new Error('Path traversal is not allowed in project path')
  }
}
