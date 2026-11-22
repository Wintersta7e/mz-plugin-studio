import { createHash } from 'node:crypto'
import { mkdir, readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import log from 'electron-log/main'
import { PluginParser } from '../services/plugin-parser'
import { compileCheck } from '../services/syntax-check'
import type { PluginDefinition } from '../../shared/types/plugin'
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
import { replaceFile } from '../atomic-write'
import { assertWriteGranted, grantKey, isFileNotFound } from '../file-access'
import { checkSaveGuard, stringArg } from './arguments'
import type { InvokeHandlers } from './registration'

/**
Lowercase hex sha256 of `bytes`
@internal exported for tests
*/
export function sha256Hex(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex')
}

/**
Whether two paths name one file: case-insensitive on win32, as the write grants compare
*/
export function isSamePath(
  a: string,
  b: string,
  platform: NodeJS.Platform = process.platform
): boolean {
  const impl = platform === 'win32' ? path.win32 : path.posix
  return grantKey(a, impl) === grantKey(b, impl)
}

/**
The file's bytes, or null when it does not exist; any other read error is thrown
*/
async function readExisting(target: string): Promise<Buffer | null> {
  try {
    return await readFile(target)
  } catch (error) {
    if (isFileNotFound(error)) return null
    throw error
  }
}

/**
Writes `content` to `target` unless `guard` finds a reason to ask first; then nothing is
written and the result names the conflict and the sha256 of the bytes on disk. Without a
guard the file is written unchecked. Another program writing between the read and the write
is not detected.
*/
async function writeGuarded(
  target: string,
  content: string,
  guard: SaveGuard | undefined,
  kind: 'project' | 'path'
): Promise<SaveResult> {
  const disk = await readExisting(target)
  const filename = path.basename(target)
  const problem = guard === undefined ? null : compileCheck(content, filename)
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
    if (base !== null && isSamePath(base.path, target) && base.sha256 !== diskSha256) {
      return refuse('changed-on-disk')
    }
    if (kind === 'project' && (base === null || !isSamePath(base.path, target))) {
      return refuse('exists-unrelated')
    }
    if (
      problem !== null &&
      guard.overwriteBroken !== true &&
      // Only whether the file on disk compiles matters here, so a lossy decode is enough
      compileCheck(disk.toString('utf8'), filename) === null
    ) {
      return refuse('would-break', problem)
    }
  }
  if (disk === null) await mkdir(path.dirname(target), { recursive: true })
  const bytes = Buffer.from(content, 'utf8')
  await replaceFile(target, bytes, disk !== null)
  return {
    success: true,
    path: target,
    sha256: sha256Hex(bytes),
    ...(problem !== null && { syntaxWarning: problem })
  }
}

/**
Writes `content` to `filePath`, a path chosen in a save dialog; creates its folder when missing.
The dialog already asked about replacing the file, so a guard checks only the base and syntax.
@internal exported for tests
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

/**
A file whose bytes are not UTF-8, so its text could not be saved back unchanged
*/
class NotUtf8Error extends Error {}

// Keeps a byte order mark in the text, so a save writes it back
const utf8 = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true })

/**
The text of a file's bytes, which must be UTF-8; a byte order mark stays in the text.
Throws `NotUtf8Error` naming the file for any other bytes.
*/
function decodeUtf8Strict(bytes: Uint8Array, filePath: string): string {
  try {
    return utf8.decode(bytes)
  } catch {
    throw new NotUtf8Error(
      `${path.basename(filePath)} is not UTF-8. The app reads only UTF-8 files, so it can save a plugin's text back unchanged; convert it to UTF-8 and try again`
    )
  }
}

/**
Reads a file's bytes as UTF-8 text with their sha256; bytes that are not UTF-8 are refused
*/
async function readWithSha(filePath: string): Promise<{ content: string; sha256: string }> {
  const bytes = await readFile(filePath)
  try {
    return { content: decodeUtf8Strict(bytes, filePath), sha256: sha256Hex(bytes) }
  } catch (error) {
    log.warn(`[plugin] ${path.basename(filePath)} is not UTF-8:`, filePath)
    throw error
  }
}

/**
Parses `js/plugins/<filename>` of a project, recording the file it came from
@internal exported for tests
*/
export async function loadPluginFile(projectPath: string, filename: string): Promise<LoadedPlugin> {
  assertSafeProjectPath(projectPath)
  assertSafeFilename(filename)
  const pluginPath = path.join(projectPath, 'js', 'plugins', filename)
  try {
    const { content, sha256 } = await readWithSha(pluginPath)
    const result = PluginParser.parsePlugin(content, filename)
    log.info(
      `[plugin:load] ${filename} — params: ${String(result.parameters.length)}, commands: ${String(result.commands.length)}`
    )
    return { plugin: { ...result, importedFrom: filename }, path: pluginPath, sha256 }
  } catch (error) {
    if (!(error instanceof NotUtf8Error))
      log.error(`[plugin:load] Failed to load ${filename}:`, error)
    throw new Error(
      `Failed to load plugin "${filename}": ${error instanceof Error ? error.message : String(error)}`,
      { cause: error }
    )
  }
}

/**
Writes `content` to `js/plugins/<filename>` of a project; creates the folder when missing.
An existing file is replaced only when it is the guard's base, unchanged.
@internal exported for tests
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
  const pluginPath = path.join(projectPath, 'js', 'plugins', filename)
  const result = await writeGuarded(pluginPath, content, guard, 'project')
  if (result.success) log.info(`[plugin:save] Saved ${filename} to ${pluginPath}`)
  return result
}

/**
Reads the text of `js/plugins/<filename>` of a project with the sha256 of its bytes
@internal exported for tests
*/
export async function readRawPlugin(projectPath: string, filename: string): Promise<RawPluginFile> {
  assertSafeProjectPath(projectPath)
  assertSafeFilename(filename)
  log.debug(`[plugin:read-raw] ${filename}`)
  const pluginPath = path.join(projectPath, 'js', 'plugins', filename)
  return { ...(await readWithSha(pluginPath)), path: pluginPath }
}

/**
Reads the text of a file the user picked, or a tab's saved file
@internal exported for tests
*/
export async function readFileByPath(filePath: string): Promise<string> {
  assertSafeFilePath(filePath)
  log.debug(`[plugin:read-by-path] ${filePath}`)
  const { content } = await readWithSha(filePath)
  return content
}

/**
Parses plugin text the window holds; nothing is read from disk
*/
function parsePluginText(content: string): PluginDefinition {
  log.debug('[plugin:parse] Parsing plugin content')
  try {
    return PluginParser.parsePlugin(content)
  } catch (error) {
    log.error('[plugin:parse] Failed to parse plugin:', error)
    throw new Error(
      `Failed to parse plugin: ${error instanceof Error ? error.message : String(error)}`,
      { cause: error }
    )
  }
}

/**
The plugin files in a project's `js/plugins`, without `_`-prefixed ones; none when it is missing
*/
async function listPluginFiles(projectPath: string): Promise<string[]> {
  assertSafeProjectPath(projectPath)
  const pluginsDirectory = path.join(projectPath, 'js', 'plugins')
  try {
    const files = await readdir(pluginsDirectory)
    const jsPlugins = files.filter((f: string) => f.endsWith('.js') && !f.startsWith('_'))
    log.debug(`[plugin:list] Found ${String(jsPlugins.length)} plugins in ${projectPath}`)
    return jsPlugins
  } catch {
    log.debug(`[plugin:list] No plugins directory at ${projectPath}`)
    return []
  }
}

/**
One plugin file's header, or why the scan left the file out: a class of failure, never the
file's text or its full path
*/
type ScanFileResult =
  { ok: true; header: ScannedPluginHeader } | { ok: false; filename: string; reason: string }

function readFailure(error: unknown): string {
  if (error instanceof NotUtf8Error) return 'not UTF-8'
  const code = error instanceof Error && 'code' in error ? error.code : undefined
  return code === 'EISDIR' ? 'not a file' : 'could not be read'
}

/**
Reads, decodes and parses one file of a plugins folder; a failure leaves out only this file
*/
async function scanPluginFile(pluginsDirectory: string, filename: string): Promise<ScanFileResult> {
  const filePath = path.join(pluginsDirectory, filename)
  let content: string
  try {
    content = decodeUtf8Strict(await readFile(filePath), filePath)
  } catch (error) {
    return { ok: false, filename, reason: readFailure(error) }
  }
  try {
    // Read the load-order tags as the importer does, so the analyzer and editor agree
    const { meta } = PluginParser.parsePlugin(content, filename)
    return {
      ok: true,
      header: {
        filename,
        name: filename.replace(/\.js$/, ''),
        base: meta.dependencies,
        orderAfter: meta.orderAfter ?? [],
        orderBefore: meta.orderBefore ?? [],
        overrides: extractOverrides(content)
      }
    }
  } catch {
    return { ok: false, filename, reason: 'could not be parsed' }
  }
}

/**
The load-order tags and prototype overrides of every plugin file in a project, in listing
order; a file that cannot be read or parsed is left out. None when `js/plugins` is missing;
any other failure to list it rejects.
*/
async function scanPluginHeaders(projectPath: string): Promise<ScannedPluginHeader[]> {
  assertSafeProjectPath(projectPath)
  const pluginsDirectory = path.join(projectPath, 'js', 'plugins')
  let files: string[]
  try {
    files = await readdir(pluginsDirectory)
  } catch (error) {
    if (isFileNotFound(error)) {
      log.debug(`[plugin:scan-headers] No plugins directory at ${projectPath}`)
      return []
    }
    log.error(`[plugin:scan-headers] Could not list ${pluginsDirectory}:`, error)
    throw error
  }
  const jsFiles = files.filter((f: string) => f.endsWith('.js') && !f.startsWith('_'))

  // Read all plugin files in parallel for faster scanning (PERF-02)
  const results = await Promise.all(
    jsFiles.map(async (file) => scanPluginFile(pluginsDirectory, file))
  )
  const headers: ScannedPluginHeader[] = []
  for (const result of results) {
    if (result.ok) {
      headers.push(result.header)
    } else {
      log.warn(`[plugin:scan-headers] Left out ${result.filename}: ${result.reason}`)
    }
  }
  log.info(
    `[plugin:scan-headers] Scanned ${String(headers.length)} plugins, left out ${String(results.length - headers.length)}`
  )
  return headers
}

type PluginChannel =
  | 'plugin:save'
  | 'plugin:save-to-path'
  | 'plugin:load'
  | 'plugin:parse'
  | 'plugin:read-raw'
  | 'plugin:list'
  | 'plugin:read-by-path'
  | 'plugin:scan-headers'

export const pluginHandlers: Pick<InvokeHandlers, PluginChannel> = {
  'plugin:save': {
    access: 'current-project',
    check: (raw) => [
      stringArg('plugin:save', raw, 0),
      stringArg('plugin:save', raw, 1),
      stringArg('plugin:save', raw, 2),
      checkSaveGuard('plugin:save', raw[3])
    ],
    run: savePluginFile
  },
  'plugin:save-to-path': {
    access: 'granted-write',
    check: (raw) => {
      const filePath = stringArg('plugin:save-to-path', raw, 0)
      const content = stringArg('plugin:save-to-path', raw, 1)
      return raw[2] === undefined
        ? [filePath, content]
        : [filePath, content, checkSaveGuard('plugin:save-to-path', raw[2])]
    },
    run: savePluginToPath
  },
  'plugin:load': {
    access: 'current-project',
    check: (raw) => [stringArg('plugin:load', raw, 0), stringArg('plugin:load', raw, 1)],
    run: loadPluginFile
  },
  'plugin:parse': {
    access: 'none',
    check: (raw) => [stringArg('plugin:parse', raw, 0)],
    run: parsePluginText
  },
  'plugin:read-raw': {
    access: 'current-project',
    check: (raw) => [stringArg('plugin:read-raw', raw, 0), stringArg('plugin:read-raw', raw, 1)],
    run: readRawPlugin
  },
  'plugin:list': {
    access: 'current-project',
    check: (raw) => [stringArg('plugin:list', raw, 0)],
    run: listPluginFiles
  },
  'plugin:read-by-path': {
    access: 'granted-read',
    check: (raw) => [stringArg('plugin:read-by-path', raw, 0)],
    run: readFileByPath
  },
  'plugin:scan-headers': {
    access: 'current-project',
    check: (raw) => [stringArg('plugin:scan-headers', raw, 0)],
    run: scanPluginHeaders
  }
}
