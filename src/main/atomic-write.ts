import { randomBytes } from 'crypto'
import { constants } from 'fs'
import { access, open, realpath, rename, rm, stat } from 'fs/promises'
import path from 'path'
import log from 'electron-log/main'

// Windows returns these for a moment while antivirus or the indexer holds a newly written file
const RENAME_LOCKED = new Set(['EPERM', 'EACCES', 'EBUSY'])
const RENAME_RETRY_MS = 3000

/** Renames `from` over `to`, retrying with a growing wait while the rename is locked */
async function renameRetrying(from: string, to: string): Promise<void> {
  const start = Date.now()
  for (let wait = 10; ; wait = Math.min(wait + 10, 100)) {
    try {
      return await rename(from, to)
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code ?? ''
      if (!RENAME_LOCKED.has(code) || Date.now() - start >= RENAME_RETRY_MS) throw error
      await new Promise((resolve) => setTimeout(resolve, wait))
    }
  }
}

/**
 * Replaces `target` with `bytes` through a temporary file beside it, so a write that fails
 * part-way leaves the file as it was. An existing target keeps its permissions, and a link is
 * written through to the file it names.
 */
export async function replaceFile(
  target: string,
  bytes: Uint8Array,
  exists: boolean
): Promise<void> {
  const dest = exists ? await realpath(target) : target
  // A rename replaces a read-only file on POSIX, so refuse it here as a direct write would
  if (exists) await access(dest, constants.W_OK)
  // On Windows a mode can only mark a file read-only, which would block the rename
  const mode = exists && process.platform !== 'win32' ? (await stat(dest)).mode & 0o7777 : null
  const suffix = `${process.pid}-${randomBytes(4).toString('hex')}`
  const temp = path.join(path.dirname(dest), `.${path.basename(dest)}.${suffix}.tmp`)
  try {
    const handle = await open(temp, 'wx')
    try {
      await handle.writeFile(bytes)
      if (mode !== null) await handle.chmod(mode)
      // On disk before the rename, so a power loss cannot leave the name on an empty file
      await handle.sync()
    } finally {
      await handle.close()
    }
    await renameRetrying(temp, dest)
  } catch (error) {
    await rm(temp, { force: true }).catch((cleanup: unknown) =>
      log.warn('[atomic-write] could not remove temporary file', temp, cleanup)
    )
    throw error
  }
}
