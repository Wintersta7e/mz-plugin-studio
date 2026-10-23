import { type IpcMain, type IpcMainInvokeEvent } from 'electron'
import { createHash, randomBytes } from 'crypto'
import { constants } from 'fs'
import { access, mkdir, open, readFile, readdir, realpath, rename, rm, stat } from 'fs/promises'
import path, { join, dirname } from 'path'
import log from 'electron-log/main'
import { PluginParser } from '../services/pluginParser'
import { compileCheck } from '../services/syntax-check'
import { IPC_CHANNELS } from '../../shared/ipc-types'
import type {
  LoadedPlugin,
  RawPluginFile,
  SaveConflict,
  SaveGuard,
  SaveResult,
  ScannedPluginHeader,
  SyntaxProblem
} from '../../shared/ipc-types'
import { extractOverrides } from '../../shared/override-extractor'
import {
  assertSafeFilePath,
  assertSafeFilename,
  assertSafeProjectPath
} from '../../shared/path-safety'
import { assertWriteGranted, grantKey } from '../file-access'

/** Lowercase hex sha256 of `bytes` */
export function sha256Hex(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex')
}

/** Whether two paths name one file: case-insensitive on win32, as the write grants compare */
export function samePath(
  a: string,
  b: string,
  platform: NodeJS.Platform = process.platform
): boolean {
  const impl = platform === 'win32' ? path.win32 : path.posix
  return grantKey(a, impl) === grantKey(b, impl)
}

/** The file's bytes, or null when it does not exist; any other read error is thrown */
async function readExisting(target: string): Promise<Buffer | null> {
  try {
    return await readFile(target)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null
    throw error
  }
}

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
async function replaceFile(target: string, bytes: Uint8Array, exists: boolean): Promise<void> {
  const dest = exists ? await realpath(target) : target
  // A rename replaces a read-only file on POSIX, so refuse it here as a direct write would
  if (exists) await access(dest, constants.W_OK)
  // On Windows a mode can only mark a file read-only, which would block the rename
  const mode = exists && process.platform !== 'win32' ? (await stat(dest)).mode & 0o7777 : null
  const suffix = `${process.pid}-${randomBytes(4).toString('hex')}`
  const temp = join(dirname(dest), `.${path.basename(dest)}.${suffix}.tmp`)
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
      log.warn('[plugin] could not remove temporary file', temp, cleanup)
    )
    throw error
  }
}

/**
 * Writes `content` to `target` unless `guard` finds a reason to ask first; then nothing is
 * written and the result names the conflict and the sha256 of the bytes on disk. Without a
 * guard the file is written unchecked. Another program writing between the read and the write
 * is not detected.
 */
async function writeGuarded(
  target: string,
  content: string,
  guard: SaveGuard | undefined,
  kind: 'project' | 'path'
): Promise<SaveResult> {
  const disk = await readExisting(target)
  const filename = path.basename(target)
  const problem = guard !== undefined ? compileCheck(content, filename) : null
  if (disk !== null && guard !== undefined) {
    const diskSha256 = sha256Hex(disk)
    const refuse = (conflict: SaveConflict, syntaxError?: SyntaxProblem): SaveResult => ({
      success: false,
      path: target,
      conflict,
      diskSha256,
      ...(syntaxError !== undefined && { syntaxError })
    })
    const base = guard.base
    if (base !== null && samePath(base.path, target) && base.sha256 !== diskSha256) {
      return refuse('changed-on-disk')
    }
    if (kind === 'project' && (base === null || !samePath(base.path, target))) {
      return refuse('exists-unrelated')
    }
    if (
      problem !== null &&
      guard.overwriteBroken !== true &&
      // Only whether the file on disk compiles matters here, so a lossy decode is enough
      compileCheck(disk.toString('utf-8'), filename) === null
    ) {
      return refuse('would-break', problem)
    }
  }
  if (disk === null) await mkdir(dirname(target), { recursive: true })
  const bytes = Buffer.from(content, 'utf-8')
  await replaceFile(target, bytes, disk !== null)
  return {
    success: true,
    path: target,
    sha256: sha256Hex(bytes),
    ...(problem !== null && { syntaxWarning: problem })
  }
}

/**
 * Writes `content` to `filePath`, a path chosen in a save dialog; creates its folder when missing.
 * The dialog already asked about replacing the file, so a guard checks only the base and syntax.
 */
export async function savePluginToPath(
  filePath: string,
  content: string,
  guard?: SaveGuard
): Promise<SaveResult> {
  assertSafeFilePath(filePath)
  assertWriteGranted(filePath)
  log.debug(`[plugin:save-to-path] ${filePath}`)
  const result = await writeGuarded(filePath, content, guard, 'path')
  if (result.success) log.info(`[plugin:save-to-path] Saved to ${filePath}`)
  return result
}

/** A file whose bytes are not UTF-8, so its text could not be saved back unchanged */
class NotUtf8Error extends Error {}

// Keeps a byte order mark in the text, so a save writes it back
const utf8 = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true })

/** Reads a file's bytes as UTF-8 text with their sha256; bytes that are not UTF-8 are refused */
async function readWithSha(filePath: string): Promise<{ content: string; sha256: string }> {
  const bytes = await readFile(filePath)
  let content: string
  try {
    content = utf8.decode(bytes)
  } catch {
    const name = path.basename(filePath)
    log.warn(`[plugin] ${name} is not UTF-8:`, filePath)
    throw new NotUtf8Error(
      `${name} is not UTF-8. The app reads only UTF-8 files, so it can save a plugin's text back unchanged; convert it to UTF-8 and try again`
    )
  }
  return { content, sha256: sha256Hex(bytes) }
}

/** Parses `js/plugins/<filename>` of a project, recording the file it came from */
export async function loadPluginFile(projectPath: string, filename: string): Promise<LoadedPlugin> {
  assertSafeProjectPath(projectPath)
  assertSafeFilename(filename)
  const pluginPath = join(projectPath, 'js', 'plugins', filename)
  try {
    const { content, sha256 } = await readWithSha(pluginPath)
    const result = PluginParser.parsePlugin(content, filename)
    log.info(
      `[plugin:load] ${filename} — params: ${result.parameters.length}, commands: ${result.commands.length}`
    )
    return { plugin: { ...result, importedFrom: filename }, path: pluginPath, sha256 }
  } catch (error) {
    if (!(error instanceof NotUtf8Error))
      log.error(`[plugin:load] Failed to load ${filename}:`, error)
    throw new Error(
      `Failed to load plugin "${filename}": ${error instanceof Error ? error.message : String(error)}`
    )
  }
}

/**
 * Writes `content` to `js/plugins/<filename>` of a project; creates the folder when missing.
 * An existing file is replaced only when it is the guard's base, unchanged.
 */
export async function savePluginFile(
  projectPath: string,
  filename: string,
  content: string,
  guard: SaveGuard
): Promise<SaveResult> {
  assertSafeProjectPath(projectPath)
  assertSafeFilename(filename)
  log.debug(`[plugin:save] ${filename} to ${projectPath}`)
  const pluginPath = join(projectPath, 'js', 'plugins', filename)
  const result = await writeGuarded(pluginPath, content, guard, 'project')
  if (result.success) log.info(`[plugin:save] Saved ${filename} to ${pluginPath}`)
  return result
}

/** Reads the text of `js/plugins/<filename>` of a project with the sha256 of its bytes */
export async function readRawPlugin(projectPath: string, filename: string): Promise<RawPluginFile> {
  assertSafeProjectPath(projectPath)
  assertSafeFilename(filename)
  log.debug(`[plugin:read-raw] ${filename}`)
  const pluginPath = join(projectPath, 'js', 'plugins', filename)
  return { ...(await readWithSha(pluginPath)), path: pluginPath }
}

/** Reads the text of a file the user picked, or a tab's saved file */
export async function readFileByPath(filePath: string): Promise<string> {
  assertSafeFilePath(filePath)
  log.debug(`[plugin:read-by-path] ${filePath}`)
  return (await readWithSha(filePath)).content
}

export function setupPluginHandlers(ipcMain: IpcMain): void {
  ipcMain.handle(
    IPC_CHANNELS.PLUGIN_SAVE,
    (
      _event: IpcMainInvokeEvent,
      projectPath: string,
      filename: string,
      content: string,
      guard: SaveGuard
    ) => savePluginFile(projectPath, filename, content, guard)
  )

  ipcMain.handle(
    IPC_CHANNELS.PLUGIN_LOAD,
    (_event: IpcMainInvokeEvent, projectPath: string, filename: string) =>
      loadPluginFile(projectPath, filename)
  )

  ipcMain.handle(IPC_CHANNELS.PLUGIN_PARSE, async (_event: IpcMainInvokeEvent, content: string) => {
    log.debug('[plugin:parse] Parsing plugin content')
    try {
      return PluginParser.parsePlugin(content)
    } catch (error) {
      log.error('[plugin:parse] Failed to parse plugin:', error)
      throw new Error(
        `Failed to parse plugin: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  })

  ipcMain.handle(
    IPC_CHANNELS.PLUGIN_READ_RAW,
    (_event: IpcMainInvokeEvent, projectPath: string, filename: string) =>
      readRawPlugin(projectPath, filename)
  )

  ipcMain.handle(
    IPC_CHANNELS.PLUGIN_LIST,
    async (_event: IpcMainInvokeEvent, projectPath: string) => {
      assertSafeProjectPath(projectPath)
      const pluginsDir = join(projectPath, 'js', 'plugins')
      try {
        const files = await readdir(pluginsDir)
        const jsPlugins = files.filter((f: string) => f.endsWith('.js') && !f.startsWith('_'))
        log.debug(`[plugin:list] Found ${jsPlugins.length} plugins in ${projectPath}`)
        return jsPlugins
      } catch {
        log.debug(`[plugin:list] No plugins directory at ${projectPath}`)
        return []
      }
    }
  )

  ipcMain.handle(IPC_CHANNELS.PLUGIN_READ_BY_PATH, (_event: IpcMainInvokeEvent, filePath: string) =>
    readFileByPath(filePath)
  )

  ipcMain.handle(
    IPC_CHANNELS.PLUGIN_SAVE_TO_PATH,
    (_event: IpcMainInvokeEvent, filePath: string, content: string, guard?: SaveGuard) =>
      savePluginToPath(filePath, content, guard)
  )

  ipcMain.handle(
    IPC_CHANNELS.PLUGIN_SCAN_HEADERS,
    async (_event: IpcMainInvokeEvent, projectPath: string): Promise<ScannedPluginHeader[]> => {
      assertSafeProjectPath(projectPath)
      const pluginsDir = join(projectPath, 'js', 'plugins')
      try {
        const files = await readdir(pluginsDir)
        const jsFiles = files.filter((f: string) => f.endsWith('.js') && !f.startsWith('_'))

        // Read all plugin files in parallel for faster scanning (PERF-02)
        const results: ScannedPluginHeader[] = await Promise.all(
          jsFiles.map(async (file) => {
            const filePath = join(pluginsDir, file)
            const content = await readFile(filePath, 'utf-8')

            // Only read the MZ annotation block (/*: ... */)
            const headerMatch = content.match(/\/\*:[\s\S]*?\*\//)
            const header = headerMatch ? headerMatch[0] : ''

            const baseEntries: string[] = []
            const orderAfterEntries: string[] = []
            const orderBeforeEntries: string[] = []

            const baseRegex = /@base\s+(\S+)/g
            let match: RegExpExecArray | null
            while ((match = baseRegex.exec(header)) !== null) {
              baseEntries.push(match[1])
            }

            const orderAfterRegex = /@orderAfter\s+(\S+)/g
            while ((match = orderAfterRegex.exec(header)) !== null) {
              orderAfterEntries.push(match[1])
            }

            const orderBeforeRegex = /@orderBefore\s+(\S+)/g
            while ((match = orderBeforeRegex.exec(header)) !== null) {
              orderBeforeEntries.push(match[1])
            }

            return {
              filename: file,
              name: file.replace(/\.js$/, ''),
              base: baseEntries,
              orderAfter: orderAfterEntries,
              orderBefore: orderBeforeEntries,
              overrides: extractOverrides(content)
            }
          })
        )

        log.info(`[plugin:scan-headers] Scanned ${results.length} plugins in ${projectPath}`)
        return results
      } catch (error) {
        log.error(`[plugin:scan-headers] Failed to scan ${projectPath}:`, error)
        return []
      }
    }
  )
}
