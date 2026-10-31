// Every member the preload exposes on `window.api` must be called somewhere in the renderer:
// an uncalled member is a channel the page can use that the app itself never needs.
import { describe, it, expect, vi } from 'vitest'
import { readdirSync, readFileSync } from 'fs'
import { join, relative } from 'path'
import ts from 'typescript'

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
        node.expression.expression.expression.text === 'window' &&
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
})
