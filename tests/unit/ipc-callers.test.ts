// Every member the preload exposes on `window.api` must be called somewhere in the renderer:
// an uncalled member is a channel the page can use that the app itself never needs.
import { describe, it, expect, vi } from 'vitest'
import { readdirSync, readFileSync } from 'fs'
import { join, relative } from 'path'
import ts from 'typescript'
import { createInvokeHandlers, createSendListeners } from '../../src/main/ipc/handlers'
import type { MainDeps } from '../../src/main/ipc/handlers'
import {
  EVENT_CHANNELS,
  INVOKE_CHANNELS,
  IPC_CHANNELS,
  SEND_CHANNELS
} from '../../src/shared/ipc-types'

// Recorded by the mock itself: call history is cleared before each test, the import runs once
const exposed = vi.hoisted(() => ({ api: undefined as unknown }))

vi.mock('electron', () => ({
  contextBridge: {
    exposeInMainWorld: vi.fn((key: string, value: unknown) => {
      if (key === 'api') exposed.api = value
    })
  },
  ipcRenderer: { invoke: vi.fn(), send: vi.fn(), on: vi.fn(), removeListener: vi.fn() }
}))

await import('../../src/preload/index')

/** Members exposed without a renderer caller on purpose; every entry must stay uncalled */
const ALLOW_UNCALLED: readonly string[] = []

const RENDERER = join(process.cwd(), 'src/renderer/src')
const MAIN = join(process.cwd(), 'src/main')

function exposedMembers(): string[] {
  const api = (exposed.api ?? {}) as Record<string, Record<string, unknown>>
  return Object.entries(api).flatMap(([namespace, members]) =>
    Object.entries(members)
      .filter(([, value]) => typeof value === 'function')
      .map(([key]) => `${namespace}.${key}`)
  )
}

function rendererFiles(): string[] {
  return (readdirSync(RENDERER, { recursive: true }) as string[])
    .filter((p) => /\.tsx?$/.test(p))
    .map((p) => join(RENDERER, p))
}

function mainFiles(): string[] {
  return (readdirSync(MAIN, { recursive: true }) as string[])
    .filter((p) => p.endsWith('.ts'))
    .map((p) => join(MAIN, p))
}

/** Channels named by `emit(target, IPC_CHANNELS.<X> | '<literal>', ...)` calls in `files` */
function emittedChannels(files: string[]): Set<string> {
  const constants: Record<string, string> = IPC_CHANNELS
  const emitted = new Set<string>()
  for (const file of files) {
    const sf = ts.createSourceFile(file, readFileSync(file, 'utf-8'), ts.ScriptTarget.Latest, true)
    const visit = (node: ts.Node): void => {
      if (
        ts.isCallExpression(node) &&
        ts.isIdentifier(node.expression) &&
        node.expression.text === 'emit' &&
        node.arguments.length >= 2
      ) {
        const channel = node.arguments[1]
        if (ts.isStringLiteral(channel)) emitted.add(channel.text)
        if (
          ts.isPropertyAccessExpression(channel) &&
          ts.isIdentifier(channel.expression) &&
          channel.expression.text === 'IPC_CHANNELS' &&
          constants[channel.name.text] !== undefined
        ) {
          emitted.add(constants[channel.name.text])
        }
      }
      ts.forEachChild(node, visit)
    }
    visit(sf)
  }
  return emitted
}

const fakeDeps = {
  dialog: {},
  getWindow: () => null,
  openLogFolder: async () => {},
  setLogLevel: () => {}
} as unknown as MainDeps

/** `window.api.<namespace>.<key>` uses, keyed by member, with each site as file:line */
function rendererCallers(files: string[]): Map<string, string[]> {
  const callers = new Map<string, string[]>()
  for (const file of files) {
    const kind = file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS
    const sf = ts.createSourceFile(
      file,
      readFileSync(file, 'utf-8'),
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
        (node.expression.expression.expression.text === 'window' ||
          node.expression.expression.expression.text === 'globalThis') &&
        node.expression.expression.name.text === 'api'
      ) {
        const member = `${node.expression.name.text}.${node.name.text}`
        const line = sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1
        const sites = callers.get(member) ?? []
        sites.push(`${relative(process.cwd(), file)}:${line}`)
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

    console.log(
      `ipc callers: members ${members.length}, called ${called.length}, ` +
        `renderer files scanned ${files.length}, allow-listed ${ALLOW_UNCALLED.length}`
    )

    expect(members.length).toBeGreaterThan(0)
    expect(files.length).toBeGreaterThan(0)
    expect(uncalled).toEqual([])
    expect(staleAllowed).toEqual([])
  })

  it('gives every channel a main handler, listener or emitter', () => {
    const handlers = Object.keys(createInvokeHandlers(fakeDeps))
    const listeners = Object.keys(createSendListeners(fakeDeps))
    const files = mainFiles()
    const emitted = emittedChannels(files)
    const emitters = EVENT_CHANNELS.filter((c) => emitted.has(c))

    console.log(
      `handlers ${handlers.length}/${INVOKE_CHANNELS.length}, ` +
        `listeners ${listeners.length}/${SEND_CHANNELS.length}, ` +
        `emitters ${emitters.length}/${EVENT_CHANNELS.length}, main files scanned ${files.length}`
    )

    expect(files.length).toBeGreaterThan(0)
    expect(handlers.sort()).toEqual([...INVOKE_CHANNELS].sort())
    expect(listeners.sort()).toEqual([...SEND_CHANNELS].sort())
    expect(emitters).toEqual([...EVENT_CHANNELS])
  })
})
