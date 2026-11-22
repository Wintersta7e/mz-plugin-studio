// The project header scan that feeds the dependency analyzer, called through its IPC registration
// over a temporary project folder. It reads @base, @orderAfter and @orderBefore as the importer does.
import { spawn } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { chmod, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import log from 'electron-log/main'
import * as ts from 'typescript'
import { afterEach, describe, expect, it, vi, type MockInstance } from 'vitest'
import { setCurrentProjectRoot } from '../../src/main/file-access'
import { IPC_CHANNELS, type ScannedPluginHeader } from '../../src/shared/ipc-types'
import { registerMainHandlers } from '../helpers/fake-ipc'
import { sourceFiles } from '../helpers/source-files'

vi.mock<{ ipcMain: object }>(import('electron'), () => ({ ipcMain: {} }))

const warn: MockInstance<(...params: unknown[]) => void> = vi.mocked(log.warn)

/**
Project folders the running test made, removed after it
*/
const projects: string[] = []

async function removeProjects(): Promise<void> {
  for (const project of projects.splice(0)) await rm(project, { recursive: true, force: true })
}

function isHeader(value: unknown): value is ScannedPluginHeader {
  return (
    typeof value === 'object' &&
    value !== null &&
    'filename' in value &&
    typeof value.filename === 'string'
  )
}

function isList(value: unknown): value is readonly unknown[] {
  return Array.isArray(value)
}

function isHeaderList(value: unknown): value is ScannedPluginHeader[] {
  return isList(value) && value.every((entry) => isHeader(entry))
}

/**
A fresh project whose plugins folder holds `files`: text, raw bytes, or a folder for `'folder'`
*/
async function projectWith(files: Record<string, string | Uint8Array>): Promise<string> {
  const project = await mkdtemp(path.join(tmpdir(), 'scan-headers-'))
  projects.push(project)
  await mkdir(path.join(project, 'js', 'plugins'), { recursive: true })
  for (const [name, content] of Object.entries(files)) {
    const file = path.join(project, 'js', 'plugins', name)
    await (content === 'folder' ? mkdir(file) : writeFile(file, content))
  }
  return project
}

/**
Writes `files` into a fresh project's plugins folder and runs the scan over it
*/
async function scan(files: Record<string, string>): Promise<ScannedPluginHeader[]> {
  const project = await projectWith(files)
  const ipc = registerMainHandlers()
  // The scan acts only on the open project; this folder holds plugins only, so it is set directly
  setCurrentProjectRoot(project)
  const results = await ipc.invoke(IPC_CHANNELS.PLUGIN_SCAN_HEADERS, project)
  if (!isHeaderList(results)) throw new Error('the scan did not answer a list of plugin headers')
  return results.toSorted((a, b) => a.filename.localeCompare(b.filename))
}

const order = (h: ScannedPluginHeader) => [h.filename, h.base, h.orderAfter, h.orderBefore]

describe('scan headers', () => {
  afterEach(removeProjects)

  it('reads load-order tags that start a line', async () => {
    expect.assertions(1)

    const results = await scan({
      'Demo.js':
        '/*:\n * @target MZ\n * @base CoreLib\n * @orderAfter CoreLib\n * @orderBefore Last\n */\n',
      'Bare.js': '/*:\n@target MZ\n@base CoreLib\n*/\n'
    })

    expect(results.map((header) => order(header))).toStrictEqual([
      ['Bare.js', ['CoreLib'], [], []],
      ['Demo.js', ['CoreLib'], ['CoreLib'], ['Last']]
    ])
  })

  it('reads no dependency from help text, a guarded help line or an empty tag', async () => {
    expect.assertions(1)

    const results = await scan({
      'Mention.js':
        '/*:\n * @target MZ\n * @help\n * Requires @base CoreLib, @orderAfter A and @orderBefore B\n */\n',
      'Guarded.js': '/*:\n * @target MZ\n * @help\n * \u{200B}@base CoreLib\n */\n',
      'Empty.js': '/*:\n * @base\n * @orderAfter\n * @orderBefore\n * @target MZ\n */\n'
    })

    expect(results.map((header) => order(header))).toStrictEqual([
      ['Empty.js', [], [], []],
      ['Guarded.js', [], [], []],
      ['Mention.js', [], [], []]
    ])
  })
})

const POWERSHELL = path.win32.join(
  process.env['SystemRoot'] ?? String.raw`C:\Windows`,
  'System32',
  'WindowsPowerShell',
  'v1.0',
  'powershell.exe'
)

// Opens the file with no sharing and holds it until its input closes
const HOLD_SCRIPT = [
  "$held = [System.IO.File]::Open($env:HELD_FILE, 'Open', 'Read', 'None')",
  "[Console]::Out.WriteLine('held')",
  '[Console]::In.ReadLine() | Out-Null',
  '$held.Close()'
].join('; ')

/**
Makes `file` unreadable until the returned release runs: no permissions on Linux and macOS,
held open with no sharing by a child process on Windows
*/
async function holdUnreadable(file: string): Promise<() => Promise<void>> {
  if (process.platform !== 'win32') {
    await chmod(file, 0o000)
    return async () => {
      await chmod(file, 0o644)
    }
  }
  const child = spawn(POWERSHELL, ['-NoProfile', '-NonInteractive', '-Command', HOLD_SCRIPT], {
    env: { ...process.env, HELD_FILE: file },
    stdio: ['pipe', 'pipe', 'inherit']
  })
  const exited = new Promise<void>((resolve) => {
    child.once('exit', () => {
      resolve()
    })
  })
  await new Promise<void>((resolve, reject) => {
    child.stdout.on('data', (chunk: Buffer) => {
      if (String(chunk).includes('held')) resolve()
    })
    child.once('exit', () => {
      reject(new Error(`the process holding ${file} ended before it held the file`))
    })
  })
  return async () => {
    child.stdin.end()
    await exited
  }
}

/**
Releases of the files the running test made unreadable, run after it
*/
const held: (() => Promise<void>)[] = []

async function releaseHeld(): Promise<void> {
  for (const release of held.splice(0)) await release()
}

/**
Runs the scan over `project` as the open project: each header's load order, and the files it
logged as left out
*/
async function scanProject(project: string): Promise<{ scanned: unknown[][]; leftOut: string[] }> {
  const ipc = registerMainHandlers()
  setCurrentProjectRoot(project)
  const before = warn.mock.calls.length
  const headers = await ipc.invoke(IPC_CHANNELS.PLUGIN_SCAN_HEADERS, project)
  if (!isHeaderList(headers)) throw new Error('the scan did not answer a list of plugin headers')
  const leftOut = warn.mock.calls
    .slice(before)
    .map((call) => String(call[0]))
    .filter((line) => line.startsWith('[plugin:scan-headers] Left out'))
  return { scanned: headers.map((header) => order(header)), leftOut }
}

const VALID =
  '/*:\n * @target MZ\n * @base CoreLib\n */\nScene_Map.prototype.update = function () {}\n'

/**
`new TextDecoder(` and `decodeUtf8Strict(` sites in the main process's sources, read by the
TypeScript compiler
*/
function mainSites(): { decoders: number; decodeCalls: number } {
  const names: string[] = []
  const collect = (node: ts.Node): void => {
    const isNew = ts.isNewExpression(node)
    if ((isNew || ts.isCallExpression(node)) && ts.isIdentifier(node.expression)) {
      names.push(`${isNew ? 'new ' : ''}${node.expression.text}`)
    }
    ts.forEachChild(node, collect)
  }
  const files = sourceFiles(path.join(process.cwd(), 'src', 'main'), /\.ts$/)
  for (const file of files) {
    collect(ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true))
  }
  return {
    decoders: names.filter((name) => name === 'new TextDecoder').length,
    decodeCalls: names.filter((name) => name === 'decodeUtf8Strict').length
  }
}

describe('the header scan with a file it cannot read', () => {
  afterEach(async () => {
    await releaseHeld()
    await removeProjects()
  })

  it('leaves out each file it cannot read and returns the others', async () => {
    expect.assertions(1)

    const project = await projectWith({
      'Good.js': VALID,
      'Latin1.js': Uint8Array.from([0x2f, 0x2f, 0x20, 0xe9, 0x0a]),
      'x.js': 'folder',
      'Locked.js': VALID
    })
    held.push(await holdUnreadable(path.join(project, 'js', 'plugins', 'Locked.js')))

    const { scanned, leftOut } = await scanProject(project)

    expect(
      { scanned, leftOut: leftOut.toSorted((a, b) => a.localeCompare(b)) },
      `scanned ${String(scanned.length)}, left out ${String(leftOut.length)}`
    ).toStrictEqual({
      scanned: [['Good.js', ['CoreLib'], [], []]],
      leftOut: [
        '[plugin:scan-headers] Left out Latin1.js: not UTF-8',
        '[plugin:scan-headers] Left out Locked.js: could not be read',
        '[plugin:scan-headers] Left out x.js: not a file'
      ]
    })
  })

  it('scans a plugin whose file starts with a byte order mark', async () => {
    expect.assertions(1)

    const project = await projectWith({ 'Bom.js': `\u{FEFF}${VALID}` })

    const { scanned } = await scanProject(project)

    expect(scanned).toStrictEqual([['Bom.js', ['CoreLib'], [], []]])
  })

  it('answers no headers when the project has no plugins folder', async () => {
    expect.assertions(1)

    const project = await mkdtemp(path.join(tmpdir(), 'scan-headers-'))
    projects.push(project)
    await mkdir(path.join(project, 'js'))

    const { scanned } = await scanProject(project)

    expect(scanned).toStrictEqual([])
  })

  it('fails when the plugins folder is a file', async () => {
    expect.assertions(1)

    const project = await mkdtemp(path.join(tmpdir(), 'scan-headers-'))
    projects.push(project)
    await mkdir(path.join(project, 'js'))
    await writeFile(path.join(project, 'js', 'plugins'), 'not a folder\n')

    await expect(scanProject(project)).rejects.toThrow('ENOTDIR')
  })

  it('the strict decoder is one function', () => {
    expect.assertions(1)

    const { decoders, decodeCalls } = mainSites()

    expect(
      { decoders, decodeCalls },
      `strict decoders in main: ${String(decoders)}, decodeUtf8Strict( call sites: ${String(decodeCalls)}`
    ).toStrictEqual({ decoders: 1, decodeCalls: 2 })
  })
})
