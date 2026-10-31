// Raw IPC skips the sender, argument and file-access checks the two wrappers apply, so lint
// refuses it in every source file except those wrappers.
import { existsSync, readdirSync } from 'fs'
import { join } from 'path'
import { ESLint } from 'eslint'
import { describe, expect, it } from 'vitest'

const ROOT = process.cwd()
const WRAPPERS = ['src/main/ipc/registration.ts', 'src/preload/ipc.ts']
const IMPORTS = 'no-restricted-imports'
const SYNTAX = 'no-restricted-syntax'

const eslint = new ESLint({ cwd: ROOT })

/** The restriction rules that report on `source` linted as the file at `filePath`. */
async function restrictions(source: string, filePath: string): Promise<string[]> {
  const [result] = await eslint.lintText(source, { filePath: join(ROOT, filePath) })
  const ids = result.messages
    .map((m) => m.ruleId)
    .filter((id): id is string => id === IMPORTS || id === SYNTAX)
  return [...new Set(ids)].sort()
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
    filePath: 'src/renderer/src/probe.ts',
    rules: [IMPORTS, SYNTAX]
  },
  {
    name: 'ipcMain in main',
    source: MAIN_HANDLE,
    filePath: 'src/main/probe.ts',
    rules: [IMPORTS, SYNTAX]
  },
  { name: 'webContents.send', source: WINDOW_SEND, filePath: 'src/main/probe.ts', rules: [SYNTAX] },
  {
    name: 'the IpcMain type',
    source: TYPE_IMPORT,
    filePath: 'src/main/probe.ts',
    rules: [IMPORTS]
  },
  {
    name: 'an aliased ipcMain',
    source: "import { ipcMain as bus } from 'electron'\nbus.on('x', () => undefined)\n",
    filePath: 'src/main/probe.ts',
    rules: [IMPORTS]
  },
  {
    name: 'an optional webContents.send',
    source:
      "declare const win: { webContents: { send(c: string): void } } | null\nwin?.webContents.send('x')\n",
    filePath: 'src/main/probe.ts',
    rules: [SYNTAX]
  },
  {
    name: 'send on a webContents variable',
    source: "declare const webContents: { send(c: string): void }\nwebContents.send('x')\n",
    filePath: 'src/main/probe.ts',
    rules: [SYNTAX]
  },
  {
    name: 'sending back to the sender',
    source: "declare const event: { sender: { send(c: string): void } }\nevent.sender.send('x')\n",
    filePath: 'src/main/probe.ts',
    rules: [SYNTAX]
  },
  {
    name: 'an event reply',
    source: "declare const event: { reply(c: string): void }\nevent.reply('x')\n",
    filePath: 'src/main/probe.ts',
    rules: [SYNTAX]
  },
  {
    name: 'ipcMain through require',
    source:
      "declare const require: (m: string) => any\nrequire('electron').ipcMain.handle('x', () => 1)\n",
    filePath: 'src/main/probe.ts',
    rules: [SYNTAX]
  },
  {
    name: 'ipcRenderer destructured from require',
    source:
      "declare const require: (m: string) => any\nconst { ipcRenderer } = require('electron')\nexport { ipcRenderer }\n",
    filePath: 'src/preload/probe.ts',
    rules: [SYNTAX]
  },
  {
    name: 'an unrelated send',
    source: "declare const socket: { send(c: string): void }\nsocket.send('x')\n",
    filePath: 'src/main/probe.ts',
    rules: []
  }
]

/** Every TypeScript source file under src/, relative to the repository root. */
function sourceFiles(): string[] {
  return (readdirSync(join(ROOT, 'src'), { recursive: true }) as string[])
    .filter((p) => /\.tsx?$/.test(p))
    .map((p) => `src/${p.split('\\').join('/')}`)
    .sort()
}

describe('raw IPC lint ban', () => {
  it.each(CASES)('reports $name', { timeout: 60_000 }, async ({ source, filePath, rules }) => {
    expect(await restrictions(source, filePath)).toEqual(rules)
  })

  it.each(WRAPPERS)('allows raw IPC in %s', { timeout: 60_000 }, async (wrapper) => {
    for (const source of [RENDERER_INVOKE, MAIN_HANDLE, WINDOW_SEND, TYPE_IMPORT]) {
      expect(await restrictions(source, wrapper)).toEqual([])
    }
  })

  it('exempts exactly the two wrappers among the source files', { timeout: 60_000 }, async () => {
    const files = sourceFiles()
    const exempt: string[] = []
    for (const file of files) {
      const config = await eslint.calculateConfigForFile(join(ROOT, file))
      const severity = (config?.rules?.[SYNTAX] as unknown[] | undefined)?.[0]
      if (severity !== 2 && severity !== 'error') exempt.push(file)
    }
    console.log(`ipc ban: files scanned ${files.length}, exempt ${exempt.length}`)
    expect(files.length).toBeGreaterThan(0)
    for (const wrapper of WRAPPERS) expect(existsSync(join(ROOT, wrapper))).toBe(true)
    expect(exempt).toEqual([...WRAPPERS].sort())
  })
})
