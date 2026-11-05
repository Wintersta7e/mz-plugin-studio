// Raw IPC skips the sender, argument and file-access checks the two wrappers apply, so lint
// refuses it in every source file except those wrappers.
import { existsSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { ESLint } from 'eslint'
import { describe, expect, it } from 'vitest'

const ROOT = process.cwd()
const WRAPPERS = ['src/main/ipc/registration.ts', 'src/preload/ipc.ts']
const IMPORTS = 'no-restricted-imports'
const SYNTAX = 'no-restricted-syntax'

const eslint = new ESLint({ cwd: ROOT })

function byCodeUnit(left: string, right: string): number {
  if (left === right) return 0
  return left < right ? -1 : 1
}

/**
The restriction rules that report on `source` linted as the file at `filePath`.
*/
async function restrictions(source: string, filePath: string): Promise<string[]> {
  const results = await eslint.lintText(source, { filePath: path.join(ROOT, filePath) })
  const ids = results
    .flatMap((result) => result.messages)
    .map((m) => m.ruleId)
    .filter((id): id is string => id === IMPORTS || id === SYNTAX)
  return [...new Set(ids)].toSorted(byCodeUnit)
}

const RENDERER_INVOKE = "import { ipcRenderer } from 'electron'\nipcRenderer.invoke('x')\n"
const MAIN_HANDLE = "import { ipcMain } from 'electron'\nipcMain.handle('x', () => 1)\n"
const WINDOW_SEND =
  "declare const win: { webContents: { send(c: string): void } }\nwin.webContents.send('x')\n"
const TYPE_IMPORT = "import type { IpcMain } from 'electron'\nexport type Probe = IpcMain\n"

const CASES: { name: string; source: string; filePath: string; rules: string[] }[] = [
  {
    name: 'ipcRenderer in the renderer',
    source: RENDERER_INVOKE,
    filePath: 'src/renderer/src/main.tsx',
    rules: [IMPORTS, SYNTAX]
  },
  {
    name: 'ipcMain in main',
    source: MAIN_HANDLE,
    filePath: 'src/main/index.ts',
    rules: [IMPORTS, SYNTAX]
  },
  { name: 'webContents.send', source: WINDOW_SEND, filePath: 'src/main/index.ts', rules: [SYNTAX] },
  {
    name: 'the IpcMain type',
    source: TYPE_IMPORT,
    filePath: 'src/main/index.ts',
    rules: [IMPORTS]
  },
  {
    name: 'an aliased ipcMain',
    source: "import { ipcMain as bus } from 'electron'\nbus.on('x', () => undefined)\n",
    filePath: 'src/main/index.ts',
    rules: [IMPORTS]
  },
  {
    name: 'an optional webContents.send',
    source:
      "declare const win: { webContents: { send(c: string): void } } | null\nwin?.webContents.send('x')\n",
    filePath: 'src/main/index.ts',
    rules: [SYNTAX]
  },
  {
    name: 'send on a webContents variable',
    source: "declare const webContents: { send(c: string): void }\nwebContents.send('x')\n",
    filePath: 'src/main/index.ts',
    rules: [SYNTAX]
  },
  {
    name: 'sending back to the sender',
    source: "declare const event: { sender: { send(c: string): void } }\nevent.sender.send('x')\n",
    filePath: 'src/main/index.ts',
    rules: [SYNTAX]
  },
  {
    name: 'an event reply',
    source: "declare const event: { reply(c: string): void }\nevent.reply('x')\n",
    filePath: 'src/main/index.ts',
    rules: [SYNTAX]
  },
  {
    name: 'ipcMain through require',
    source:
      "declare const require: (m: string) => any\nrequire('electron').ipcMain.handle('x', () => 1)\n",
    filePath: 'src/main/index.ts',
    rules: [SYNTAX]
  },
  {
    name: 'ipcRenderer destructured from require',
    source:
      "declare const require: (m: string) => any\nconst { ipcRenderer } = require('electron')\nexport { ipcRenderer }\n",
    filePath: 'src/preload/index.ts',
    rules: [SYNTAX]
  },
  {
    name: 'an unrelated send',
    source: "declare const socket: { send(c: string): void }\nsocket.send('x')\n",
    filePath: 'src/main/index.ts',
    rules: []
  },
  {
    name: "a window's own ipc",
    source:
      "declare const win: { webContents: { ipc: { handle(c: string, f: () => number): void } } }\nwin.webContents.ipc.handle('x', () => 1)\n",
    filePath: 'src/main/index.ts',
    rules: [SYNTAX]
  },
  {
    name: "a frame's own ipc",
    source:
      "declare const win: { webContents: { mainFrame: { ipc: { on(c: string, f: () => void): void } } } }\nwin.webContents.mainFrame.ipc.on('x', () => undefined)\n",
    filePath: 'src/main/index.ts',
    rules: [SYNTAX]
  },
  {
    name: 'send on the main frame',
    source:
      "declare const win: { webContents: { mainFrame: { send(c: string): void } } }\nwin.webContents.mainFrame.send('x')\n",
    filePath: 'src/main/index.ts',
    rules: [SYNTAX]
  },
  {
    name: "send on a request's frame",
    source:
      "declare const event: { senderFrame: { send(c: string): void } }\nevent.senderFrame.send('x')\n",
    filePath: 'src/main/index.ts',
    rules: [SYNTAX]
  },
  {
    name: 'webContents.sendToFrame',
    source:
      "declare const win: { webContents: { sendToFrame(f: number, c: string): void } }\nwin.webContents.sendToFrame(1, 'x')\n",
    filePath: 'src/main/index.ts',
    rules: [SYNTAX]
  },
  {
    name: 'webContents.postMessage',
    source:
      "declare const win: { webContents: { postMessage(c: string, m: unknown): void } }\nwin.webContents.postMessage('x', 1)\n",
    filePath: 'src/main/index.ts',
    rules: [SYNTAX]
  },
  {
    name: 'postMessage on the main frame',
    source:
      "declare const mainFrame: { postMessage(c: string, m: unknown): void }\nmainFrame.postMessage('x', 1)\n",
    filePath: 'src/main/index.ts',
    rules: [SYNTAX]
  },
  {
    name: 'ipcMain on a default import',
    source: "import electron from 'electron'\nelectron.ipcMain.handle('x', () => 1)\n",
    filePath: 'src/main/index.ts',
    rules: [SYNTAX]
  },
  {
    name: 'ipcMain on a namespace import',
    source: "import * as electron from 'electron'\nelectron.ipcMain.handle('x', () => 1)\n",
    filePath: 'src/main/index.ts',
    rules: [IMPORTS, SYNTAX]
  },
  {
    name: 'ipcRenderer destructured from a default import',
    source: "import electron from 'electron'\nexport const { ipcRenderer } = electron\n",
    filePath: 'src/preload/index.ts',
    rules: [SYNTAX]
  },
  {
    name: 'ipcMain destructured from a dynamic import',
    source:
      "export async function probe(): Promise<void> {\n  const { ipcMain: bus } = await import('electron')\n  bus.handle('x', () => 1)\n}\n",
    filePath: 'src/main/index.ts',
    rules: [SYNTAX]
  },
  {
    name: 'ipcMain on a dynamic import',
    source:
      "export async function probe(): Promise<void> {\n  ;(await import('electron')).ipcMain.handle('x', () => 1)\n}\n",
    filePath: 'src/main/index.ts',
    rules: [SYNTAX]
  },
  {
    name: "the page's own postMessage",
    source:
      "window.postMessage('x', '*')\nwindow.parent.postMessage('x', '*')\ndeclare const worker: Worker\nworker.postMessage('x')\n",
    filePath: 'src/renderer/src/main.tsx',
    rules: []
  }
]

/**
Every TypeScript source file under src/, relative to the repository root.
*/
function sourceFiles(): string[] {
  return readdirSync(path.join(ROOT, 'src'), { recursive: true, encoding: 'utf8' })
    .filter((p) => /\.tsx?$/.test(p))
    .map((p) => `src/${p.replaceAll('\\', '/')}`)
    .toSorted(byCodeUnit)
}

/**
Reads `key` of `value` when it is an object, so the calculated config is read through `unknown`.
*/
function member(value: unknown, key: PropertyKey): unknown {
  return typeof value === 'object' && value !== null ? Reflect.get(value, key) : undefined
}

describe('raw IPC lint ban', () => {
  it.each(CASES)('reports $name', { timeout: 60_000 }, async ({ source, filePath, rules }) => {
    await expect(restrictions(source, filePath)).resolves.toStrictEqual(rules)
  })

  it.each(WRAPPERS)('allows raw IPC in %s', { timeout: 60_000 }, async (wrapper) => {
    const sources = [RENDERER_INVOKE, MAIN_HANDLE, WINDOW_SEND, TYPE_IMPORT]

    await expect(
      Promise.all(sources.map(async (source) => restrictions(source, wrapper)))
    ).resolves.toStrictEqual([[], [], [], []])
  })

  it('exempts exactly the two wrappers among the source files', { timeout: 60_000 }, async () => {
    const files = sourceFiles()
    const exempt: string[] = []
    for (const file of files) {
      const config: unknown = await eslint.calculateConfigForFile(path.join(ROOT, file))
      const severity = member(member(member(config, 'rules'), SYNTAX), 0)
      if (severity !== 2 && severity !== 'error') exempt.push(file)
    }
    process.stdout.write(
      `ipc ban: files scanned ${String(files.length)}, exempt ${String(exempt.length)}\n`
    )

    expect(files.length).toBeGreaterThan(0)

    expect(WRAPPERS.filter((wrapper) => !existsSync(path.join(ROOT, wrapper)))).toStrictEqual([])

    expect(exempt).toStrictEqual(WRAPPERS.toSorted(byCodeUnit))
  })
})
