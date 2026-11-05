import { randomBytes } from 'node:crypto'
import { constants } from 'node:fs'
import { access, open, realpath, rename, rm, stat } from 'node:fs/promises'
import path from 'node:path'
import log from 'electron-log/main'

// Windows returns these for a moment while antivirus or the indexer holds a newly written file
const RENAME_LOCKED: ReadonlySet<unknown> = new Set(['EPERM', 'EACCES', 'EBUSY'])
const RENAME_RETRY_MS = 3000

/**
Renames `from` over `to`, retrying with a growing wait while the rename is locked
*/
async function renameRetrying(from: string, to: string): Promise<void> {
  const start = Date.now()
  for (let wait = 10; ; wait = Math.min(wait + 10, 100)) {
    try {
      await rename(from, to)
      return
    } catch (error) {
      const code = error instanceof Error && 'code' in error ? error.code : undefined
      if (!RENAME_LOCKED.has(code) || Date.now() - start >= RENAME_RETRY_MS) throw error
      await new Promise((resolve) => setTimeout(resolve, wait))
    }
  }
}

/**
Replaces `target` with `bytes` through a temporary file beside it, so a write that fails
part-way leaves the file as it was. An existing target keeps its permissions, and a link is
written through to the file it names.
*/
export async function replaceFile(
  target: string,
  bytes: Uint8Array,
  doesExist: boolean
): Promise<void> {
  const destination = doesExist ? await realpath(target) : target
  // A rename replaces a read-only file on POSIX, so refuse it here as a direct write would
  if (doesExist) await access(destination, constants.W_OK)
  // On Windows a mode can only mark a file read-only, which would block the rename
  let mode: number | undefined
  if (doesExist && process.platform !== 'win32') {
    const { mode: destinationMode } = await stat(destination)
    mode = destinationMode & 0o7777
  }
  const suffix = `${String(process.pid)}-${randomBytes(4).toString('hex')}`
  const temporary = path.join(
    path.dirname(destination),
    `.${path.basename(destination)}.${suffix}.tmp`
  )
  try {
    const handle = await open(temporary, 'wx')
    try {
      await handle.writeFile(bytes)
      if (mode !== undefined) await handle.chmod(mode)
      // On disk before the rename, so a power loss cannot leave the name on an empty file
      await handle.sync()
    } finally {
      await handle.close()
    }
    await renameRetrying(temporary, destination)
  } catch (error) {
    try {
      await rm(temporary, { force: true })
    } catch (error_) {
      log.warn('[atomic-write] could not remove temporary file', temporary, error_)
    }
    throw error
  }
}
