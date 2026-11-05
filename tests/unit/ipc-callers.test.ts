// Every member the preload exposes on `window.api` must be called somewhere in the renderer:
// an uncalled member is a channel the page can use that the app itself never needs.
import { describe, it, expect, vi } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import * as ts from 'typescript'
import {
  createInvokeHandlers,
  createSendListeners,
  type MainDeps as MainDependencies
} from '../../src/main/ipc/handlers'
import {
  EVENT_CHANNELS,
  INVOKE_CHANNELS,
  IPC_CHANNELS,
  SEND_CHANNELS
} from '../../src/shared/ipc-types'

// Recorded by the mock itself: call history is cleared before each test, the import runs once
const exposed = vi.hoisted((): { api: unknown } => ({ api: undefined }))

vi.mock<Record<'contextBridge' | 'ipcRenderer', unknown>>(import('electron'), () => ({
  contextBridge: {
    exposeInMainWorld: vi.fn<(key: string, value: unknown) => void>((key, value) => {
      if (key === 'api') exposed.api = value
    })
  },
  ipcRenderer: {
    invoke: vi.fn<() => void>(),
    send: vi.fn<() => void>(),
    on: vi.fn<() => void>(),
    removeListener: vi.fn<() => void>()
  }
}))

await import('../../src/preload/index')

/**
Members exposed without a renderer caller on purpose; every entry must stay uncalled
*/
const ALLOW_UNCALLED: readonly string[] = []

const RENDERER = path.join(process.cwd(), 'src/renderer/src')
const MAIN = path.join(process.cwd(), 'src/main')

function byCodeUnit(left: string, right: string): number {
  if (left === right) return 0
  return left < right ? -1 : 1
}

function isObject(value: unknown): value is object {
  return typeof value === 'object' && value !== null
}

function exposedMembers(): string[] {
  const { api } = exposed
  if (!isObject(api)) return []
  return Object.keys(api).flatMap((namespace) => {
    const members: unknown = Reflect.get(api, namespace)
    return isObject(members)
      ? Object.keys(members)
          .filter((key) => typeof Reflect.get(members, key) === 'function')
          .map((key) => `${namespace}.${key}`)
      : []
  })
}

function rendererFiles(): string[] {
  return readdirSync(RENDERER, { recursive: true, encoding: 'utf8' })
    .filter((p) => /\.tsx?$/.test(p))
    .map((p) => path.join(RENDERER, p))
}

function mainFiles(): string[] {
  return readdirSync(MAIN, { recursive: true, encoding: 'utf8' })
    .filter((p) => p.endsWith('.ts'))
    .map((p) => path.join(MAIN, p))
}

/**
Channels named by `emit(target, IPC_CHANNELS.<X> | '<literal>', ...)` calls in `files`
*/
function emittedChannels(files: string[]): Set<string> {
  const constants: ReadonlyMap<string, string> = new Map(Object.entries(IPC_CHANNELS))
  const emitted = new Set<string>()
  for (const file of files) {
    const sf = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true)
    const visit = (node: ts.Node): void => {
      if (
        ts.isCallExpression(node) &&
        ts.isIdentifier(node.expression) &&
        node.expression.text === 'emit' &&
        node.arguments.length >= 2
      ) {
        const channel = node.arguments.at(1)
        if (channel !== undefined && ts.isStringLiteral(channel)) emitted.add(channel.text)
        const named =
          channel !== undefined &&
          ts.isPropertyAccessExpression(channel) &&
          ts.isIdentifier(channel.expression) &&
          channel.expression.text === 'IPC_CHANNELS'
            ? constants.get(channel.name.text)
            : undefined
        if (named !== undefined) emitted.add(named)
      }
      ts.forEachChild(node, visit)
    }
    visit(sf)
  }
  return emitted
}

/**
Stands in for the dependencies that do work: building the handler and listener maps calls none of them
*/
function unused(): never {
  throw new Error('a main dependency was called while listing channels')
}

const fakeDependencies: MainDependencies = {
  dialog: { showOpenDialog: unused, showSaveDialog: unused, showMessageBox: unused },
  getWindow: () => null,
  openLogFolder: unused,
  setLogLevel: unused
}

/**
`window.api.<namespace>.<key>` uses, keyed by member, with each site as file:line
*/
function rendererCallers(files: string[]): Map<string, string[]> {
  const callers = new Map<string, string[]>()
  for (const file of files) {
    const kind = file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS
    const sf = ts.createSourceFile(
      file,
      readFileSync(file, 'utf8'),
      ts.ScriptTarget.Latest,
      true,
      kind
    )
    const visit = (node: ts.Node): void => {
      if (
        ts.isPropertyAccessExpression(node) &&
        ts.isPropertyAccessExpression(node.expression) &&
        ts.isPropertyAccessExpression(node.expression.expression) &&
        ts.isIdentifier(node.expression.expression.expression) &&
        node.expression.expression.expression.text === 'window' &&
        node.expression.expression.name.text === 'api'
      ) {
        const member = `${node.expression.name.text}.${node.name.text}`
        const line = sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1
        const sites = callers.get(member) ?? []
        sites.push(`${path.relative(process.cwd(), file)}:${String(line)}`)
        callers.set(member, sites)
      }
      ts.forEachChild(node, visit)
    }
    visit(sf)
  }
  return callers
}

describe('ipc callers', () => {
  it('gives every exposed window.api member a renderer caller', () => {
    const members = exposedMembers()
    const files = rendererFiles()
    const callers = rendererCallers(files)
    const called = members.filter((m) => callers.has(m))
    const uncalled = members.filter((m) => !callers.has(m) && !ALLOW_UNCALLED.includes(m))
    const staleAllowed = ALLOW_UNCALLED.filter((m) => !members.includes(m) || callers.has(m))

    process.stdout.write(
      `ipc callers: members ${String(members.length)}, called ${String(called.length)}, ` +
        `renderer files scanned ${String(files.length)}, ` +
        `allow-listed ${String(ALLOW_UNCALLED.length)}\n`
    )

    expect(members.length).toBeGreaterThan(0)
    expect(files.length).toBeGreaterThan(0)
    expect(uncalled).toStrictEqual([])
    expect(staleAllowed).toStrictEqual([])
  })

  it('gives every channel a main handler, listener or emitter', () => {
    const handlers = Object.keys(createInvokeHandlers(fakeDependencies))
    const listeners = Object.keys(createSendListeners(fakeDependencies))
    const files = mainFiles()
    const emitted = emittedChannels(files)
    const emitters = EVENT_CHANNELS.filter((c) => emitted.has(c))

    process.stdout.write(
      `handlers ${String(handlers.length)}/${String(INVOKE_CHANNELS.length)}, ` +
        `listeners ${String(listeners.length)}/${String(SEND_CHANNELS.length)}, ` +
        `emitters ${String(emitters.length)}/${String(EVENT_CHANNELS.length)}, ` +
        `main files scanned ${String(files.length)}\n`
    )

    expect(files.length).toBeGreaterThan(0)
    expect(handlers.toSorted(byCodeUnit)).toStrictEqual(INVOKE_CHANNELS.toSorted(byCodeUnit))
    expect(listeners.toSorted(byCodeUnit)).toStrictEqual(SEND_CHANNELS.toSorted(byCodeUnit))
    expect(emitters).toStrictEqual([...EVENT_CHANNELS])
  })
})
