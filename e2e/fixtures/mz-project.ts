// The user's MZ project, as the runtime test reaches it: checked, walked for links, copied, and
// compared with its own manifest when the copy is gone; every write goes to the copy. Also starts
// the engine on the copy, once per boot. Imports no test library, so the unit suite calls the
// same functions the fixtures do.
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import {
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync
} from 'node:fs'
import { readFile } from 'node:fs/promises'
import { createServer, type ServerResponse } from 'node:http'
import path from 'node:path'
import { unsafeFileNameReason } from '../../src/shared/file-name'
import type { PluginParameter } from '../../src/shared/types/plugin'
import { isWithin, killTree, removeDirectory } from './teardown'

/**
Files every MZ project folder holds, relative to it.
*/
export const REQUIRED_FILES: readonly string[] = [
  'index.html',
  'js/main.js',
  'data/System.json',
  'package.json'
]

export interface Manifest {
  /**
  Every file by its path relative to the project, with `/` between segments.
  */
  files: Map<string, { size: number; mtimeNs: bigint }>
}

/**
Throws naming the first required file `source` lacks.
*/
export function requireProjectFiles(source: string): void {
  const missing = REQUIRED_FILES.find(
    (file) => lstatSync(path.join(source, file), { throwIfNoEntry: false })?.isFile() !== true
  )
  if (missing !== undefined) throw new Error(`not an MZ project folder: no ${missing}`)
}

/**
Every file under `source`, walked without following a link: a symbolic link or a junction
anywhere fails the walk naming it, and so does a folder that holds no file.
*/
export function takeManifest(source: string): Manifest {
  const files: Manifest['files'] = new Map()
  const walk = (relative: string): void => {
    const names = readdirSync(path.join(source, relative))
    for (const name of names) {
      const entry = relative === '' ? name : `${relative}/${name}`
      const stats = lstatSync(path.join(source, entry), { bigint: true })
      if (stats.isSymbolicLink()) throw new Error(`linked entry in the MZ project: ${entry}`)
      if (stats.isDirectory()) walk(entry)
      else files.set(entry, { size: Number(stats.size), mtimeNs: stats.mtimeNs })
    }
  }
  walk('')
  if (files.size === 0) throw new Error('the MZ project folder holds no file')
  return { files }
}

/**
Paths whose size or modification time differ between the manifests, or that only one holds.
*/
export function compareManifests(before: Manifest, after: Manifest): string[] {
  const paths = new Set([...before.files.keys(), ...after.files.keys()])
  return [...paths]
    .filter((file) => {
      const was = before.files.get(file)
      const is = after.files.get(file)
      return was?.size !== is?.size || was?.mtimeNs !== is?.mtimeNs
    })
    .toSorted((a, b) => a.localeCompare(b))
}

/**
`target` with its deepest existing ancestor resolved through any link.
*/
function resolvedTarget(target: string): string {
  let existing = path.resolve(target)
  while (!existsSync(existing) && path.dirname(existing) !== existing) {
    existing = path.dirname(existing)
  }
  return path.join(realpathSync(existing), path.relative(existing, path.resolve(target)))
}

/**
Copies `source` to `target` after the link walk; a target inside the source is refused before
anything is written.
*/
export function copyProject(source: string, target: string): void {
  if (isWithin(resolvedTarget(target), realpathSync(source))) {
    throw new Error('the copy of the MZ project would lie inside the project')
  }
  takeManifest(source)
  cpSync(source, target, { recursive: true })
}

/**
Deletes the copy without following links; on Windows a held copy names its holder.
*/
export async function removeCopy(copy: string): Promise<void> {
  await removeDirectory(copy)
}

/**
Where any of `needles` occurs in `texts` and in the files `files`, and how many of both were
scanned; a caller fails a scan of nothing.
*/
export function scanForLeaks(
  needles: readonly string[],
  texts: readonly string[],
  files: readonly string[]
): { hits: string[]; scanned: number } {
  const sought = needles.filter((needle) => needle !== '')
  const hitsIn = (text: string, where: string): string[] =>
    sought.filter((needle) => text.includes(needle)).map((needle) => `${where}: ${needle}`)
  return {
    hits: [
      ...texts.flatMap((text, index) => hitsIn(text, `text ${String(index)}`)),
      ...files.flatMap((file) => hitsIn(readFileSync(file, 'utf8'), file))
    ],
    scanned: texts.length + files.length
  }
}

const PLUGIN_LIST = 'js/plugins.js'
const COMMON_EVENTS = 'data/CommonEvents.json'
const PLUGIN_COMMAND = 357

export interface CaseInstall {
  observer: { file: string; source: string }
  plugin?: { file: string; source: string; parameters: Record<string, string> }
  /**
  Scripts the observer loads itself, written beside the plugins and listed nowhere.
  */
  scripts?: { file: string; source: string }[]
  /**
  The commands the added common event runs, in order.
  */
  commands: { name: string; args: Record<string, string> }[]
  /**
  The plugin name the event calls the commands by, when it is not the case plugin's file.
  */
  commandPlugin?: string
  /**
  Images the case's stored values name, relative to the copy; each one the copy lacks gets a
  placeholder.
  */
  images?: string[]
}

/**
A transparent PNG of one pixel: the engine loads it as it loads any picture.
*/
export const PLACEHOLDER_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR42mNgAAIAAAUAAen63NgAAAAASUVORK5CYII=',
  'base64'
)

// A character Windows refuses in a file name, or a control character
const UNWRITABLE = /[<>"|?*\p{Cc}]/u

/**
The images `stored` names, relative to the project: each top-level file parameter of an `img/`
folder gives its value as the `.png` there that the engine requests. A value that is no plain
file name on Linux and Windows names no image, and a file of any other folder is left out: a
sound would need a real encoded stream.
*/
export function storedImages(
  parameters: readonly Pick<PluginParameter, 'name' | 'type' | 'dir' | 'parent'>[],
  stored: Readonly<Record<string, string>>
): string[] {
  const imageOf = (
    parameter: Pick<PluginParameter, 'name' | 'type' | 'dir' | 'parent'>
  ): string | undefined => {
    const value = stored[parameter.name] ?? ''
    const folder = parameter.dir ?? ''
    const isImage =
      parameter.type === 'file' && parameter.parent === undefined && folder.startsWith('img/')
    const isPlainName =
      value !== '' && unsafeFileNameReason(`${value}.js`) === undefined && !UNWRITABLE.test(value)
    return isImage && isPlainName ? path.posix.join(folder, `${value}.png`) : undefined
  }
  return parameters.map((parameter) => imageOf(parameter)).filter((image) => image !== undefined)
}

/**
The images of `images` the copy lacks; throws naming the first that is no `.png` or lies outside
the copy, before anything is written.
*/
function missingImages(copy: string, images: readonly string[] = []): string[] {
  const refused = images.find(
    (image) => !image.endsWith('.png') || !isWithin(path.join(copy, image), path.resolve(copy))
  )
  if (refused !== undefined) throw new Error(`no placeholder for the stored image ${refused}`)
  return images.filter((image) => !existsSync(path.join(copy, image)))
}

interface Stock {
  pluginList: string
  commonEvents: string
  installed: string[]
}

// Each copy's stock plugin list and common events, read before the first install wrote either
const stocks = new Map<string, Stock>()

function stockOf(copy: string): Stock {
  const key = path.resolve(copy)
  let stock = stocks.get(key)
  if (stock === undefined) {
    stock = {
      pluginList: readFileSync(path.join(key, PLUGIN_LIST), 'utf8'),
      commonEvents: readFileSync(path.join(key, COMMON_EVENTS), 'utf8'),
      installed: []
    }
    stocks.set(key, stock)
  }
  return stock
}

/**
The text before the list's opening bracket, and its entries.
*/
function readPluginList(text: string): { head: string; entries: unknown[] } {
  const open = text.indexOf('[')
  const close = text.lastIndexOf(']')
  if (open === -1 || close < open) throw new Error(`${PLUGIN_LIST} holds no plugin list`)
  const entries: unknown = JSON.parse(text.slice(open, close + 1))
  if (!Array.isArray(entries)) throw new TypeError(`${PLUGIN_LIST} holds no plugin list`)
  return { head: text.slice(0, open), entries }
}

/**
Writes the case's plugins into the copy and lists them, the observer first and the case last
after the stock entries, one entry per line as the editor writes them; appends a common event
calling each command, and a placeholder for each image the copy lacks; writes the scripts beside
the plugins, unlisted. Returns that event's id. Refuses a plugin or script file the project
holds, and an image outside the copy or not a `.png`.
*/
export function installCase(copy: string, install: CaseInstall): { commonEventId: number } {
  const stock = stockOf(copy)
  const plugins = [
    { ...install.observer, parameters: {} },
    ...(install.plugin === undefined ? [] : [install.plugin])
  ]
  const written = [...plugins, ...(install.scripts ?? [])]
  for (const plugin of written) {
    const file = `js/plugins/${plugin.file}.js`
    if (!stock.installed.includes(file) && existsSync(path.join(copy, file))) {
      throw new Error(`the MZ project already holds ${file}`)
    }
  }
  const missing = missingImages(copy, install.images)
  const list = readPluginList(stock.pluginList)
  const entry = (plugin: (typeof plugins)[number]): unknown => ({
    name: plugin.file,
    status: true,
    description: '',
    parameters: plugin.parameters
  })
  const [observer, ...rest] = plugins.map((plugin) => entry(plugin))
  const lines = [observer, ...list.entries, ...rest].map((item) => JSON.stringify(item))
  const parsed: unknown = JSON.parse(stock.commonEvents)
  if (!Array.isArray(parsed)) throw new TypeError(`${COMMON_EVENTS} holds no event list`)
  const events: unknown[] = parsed
  const commonEventId = events.length
  const pluginName = install.commandPlugin ?? install.plugin?.file ?? install.observer.file
  const event = {
    id: commonEventId,
    list: [
      ...install.commands.map((command) => ({
        code: PLUGIN_COMMAND,
        indent: 0,
        parameters: [pluginName, command.name, command.name, command.args]
      })),
      { code: 0, indent: 0, parameters: [] }
    ],
    name: 'Runtime test',
    switchId: 1,
    trigger: 0
  }
  for (const plugin of written) {
    const file = `js/plugins/${plugin.file}.js`
    writeFileSync(path.join(copy, file), plugin.source)
    if (!stock.installed.includes(file)) stock.installed.push(file)
  }
  for (const image of missing) {
    mkdirSync(path.dirname(path.join(copy, image)), { recursive: true })
    writeFileSync(path.join(copy, image), PLACEHOLDER_PNG)
    stock.installed.push(image)
  }
  writeFileSync(path.join(copy, PLUGIN_LIST), `${list.head}[\n${lines.join(',\n')}\n];\n`)
  const eventLines = [...events, event].map((item) => JSON.stringify(item))
  writeFileSync(path.join(copy, COMMON_EVENTS), `[\n${eventLines.join(',\n')}\n]`)
  return { commonEventId }
}

/**
Restores the copy's stock plugin list and common events and removes every installed file, each
placeholder image included.
*/
export function resetCopy(copy: string): void {
  const stock = stocks.get(path.resolve(copy))
  if (stock === undefined) return
  writeFileSync(path.join(copy, PLUGIN_LIST), stock.pluginList)
  writeFileSync(path.join(copy, COMMON_EVENTS), stock.commonEvents)
  for (const file of stock.installed.splice(0)) rmSync(path.join(copy, file), { force: true })
}

const CONTENT_TYPES: Readonly<Record<string, string>> = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.css': 'text/css',
  '.png': 'image/png',
  '.ogg': 'audio/ogg',
  '.m4a': 'audio/mp4',
  '.wasm': 'application/wasm',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain'
}

/**
The policy every served file carries.
*/
export const UNLOAD_DISALLOWED = 'unload=()'

function answer(response: ServerResponse, status: number, body: Buffer | string = ''): void {
  response.writeHead(status, { 'content-length': Buffer.byteLength(body) })
  response.end(body)
}

/**
Answers a request for `url` with the file it names inside `root`: 400 when the path does not
decode, 404 when the file is outside the root or cannot be read.
*/
async function serveFile(root: string, url: string, response: ServerResponse): Promise<void> {
  const raw = url.split('?', 1).at(0) ?? '/'
  let decoded: string
  try {
    decoded = decodeURIComponent(raw)
  } catch {
    answer(response, 400)
    return
  }
  const file = path.join(root, decoded === '/' ? 'index.html' : decoded)
  if (!isWithin(file, root)) {
    answer(response, 404)
    return
  }
  let body: Buffer
  try {
    body = await readFile(file)
  } catch {
    answer(response, 404)
    return
  }
  response.setHeader(
    'content-type',
    CONTENT_TYPES[path.extname(file).toLowerCase()] ?? 'application/octet-stream'
  )
  // A current Chromium disallows unload listeners by default, which the pinned headless shell
  // does not: the engine's own listener then logs the error every boot of the copy shares
  response.setHeader('permissions-policy', UNLOAD_DISALLOWED)
  answer(response, 200, body)
}

/**
Serves the copy on a loopback port: a request path is percent-decoded first, then answered only
with a file inside the copy.
*/
export async function serveCopy(
  copy: string
): Promise<{ origin: string; close: () => Promise<void> }> {
  const root = path.resolve(copy)
  // Every outcome of a request is answered inside serveFile, which never rejects
  const server = createServer((request, response) => {
    void serveFile(root, request.url ?? '/', response)
  })
  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', resolve)
  })
  const address = server.address()
  if (address === null || typeof address === 'string') throw new Error('the server has no port')
  return {
    origin: `http://127.0.0.1:${String(address.port)}`,
    close: async () =>
      new Promise<void>((resolve, reject) => {
        server.closeAllConnections()
        server.close((error) => {
          if (error === undefined) resolve()
          else reject(error)
        })
      })
  }
}

/**
The editor's playtest command: the engine runs the copy's folder with the test option.
*/
export function nwjsCommand(exe: string, copy: string): [string, string[]] {
  return [exe, [copy, 'test']]
}

/**
Runs `command` once, after deleting a report an earlier launch left, and returns the report it
wrote at `reportFile`, parsed, or undefined when it wrote none. At `timeoutMs` it kills the command's
whole process tree.
*/
export async function launchOnce(
  command: [string, string[]],
  reportFile: string,
  timeoutMs: number
): Promise<{ report: unknown; timedOut: boolean }> {
  rmSync(reportFile, { force: true })
  const [file, args] = command
  const child = spawn(file, args, {
    // Leads its own process group off Windows, so the kill reaches every process it starts
    detached: process.platform !== 'win32',
    stdio: 'ignore'
  })
  let timer: NodeJS.Timeout | undefined
  const bound = new Promise<boolean>((resolve) => {
    timer = setTimeout(() => {
      resolve(true)
    }, timeoutMs)
  })
  const isExitTimedOut = async (): Promise<boolean> => {
    await once(child, 'exit')
    return false
  }
  try {
    const isTimedOut = await Promise.race([isExitTimedOut(), bound])
    if (isTimedOut) await killTree(child)
    const report: unknown = existsSync(reportFile)
      ? JSON.parse(readFileSync(reportFile, 'utf8'))
      : undefined
    return { report, timedOut: isTimedOut }
  } finally {
    clearTimeout(timer)
  }
}
