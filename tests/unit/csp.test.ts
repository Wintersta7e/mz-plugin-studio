// The Content Security Policy module: its two policies, its purity, its single holder, and the
// filter that keeps the page's `file:` requests inside the renderer folder
import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import * as ts from 'typescript'
import type { Session } from 'electron'
import {
  DEV_SERVER_CSP,
  PRODUCTION_CSP,
  buildCsp,
  installFileRequestFilter,
  isFileRequestAllowed
} from '../../src/main/csp'

const ROOT = fileURLToPath(new URL('../..', import.meta.url))
const SRC = path.join(ROOT, 'src')
const MODULE = path.join(SRC, 'main', 'csp.ts')
const INDEX = path.join(SRC, 'main', 'index.ts')

// A policy string starts with its default-src directive
const POLICY_MARK = 'default-src'

const PRODUCTION =
  "default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; worker-src blob:; base-uri 'none'; form-action 'none'; object-src 'none'; frame-ancestors 'none'"
const DEV_SERVER =
  "default-src 'none'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src 'self' ws://localhost:*; worker-src 'self'; base-uri 'none'; form-action 'none'; object-src 'none'; frame-ancestors 'none'"

// url, renderer root, platform, allowed
const FILTER_CASES: [string, string, NodeJS.Platform, boolean][] = [
  ['file:///app/out/renderer/index.html', '/app/out/renderer', 'linux', true],
  ['file:///app/out/renderer/assets/editor.worker-x.js', '/app/out/renderer', 'linux', true],
  ['file:///app/out/renderer-other/x.js', '/app/out/renderer', 'linux', false],
  ['file:///app/out/main/index.js', '/app/out/renderer', 'linux', false],
  ['file:///app/out/renderer/../../etc/x', '/app/out/renderer', 'linux', false],
  ['file:///etc/passwd', '/app/out/renderer', 'linux', false],
  ['file:///C:/App/out/renderer/index.html', 'c:\\app\\OUT\\renderer', 'win32', true],
  ['file:///C:/Other/x.js', 'c:\\app\\OUT\\renderer', 'win32', false],
  ['file://server/share/x.js', 'c:\\app\\OUT\\renderer', 'win32', false],
  ['file://server/share/x.js', '/app/out/renderer', 'linux', false],
  ['not a url', '/app/out/renderer', 'linux', false]
]

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(directory, entry.name)
    return entry.isDirectory() ? sourceFiles(file) : file
  })
}

function byCodeUnit(left: string, right: string): number {
  if (left === right) return 0
  return left < right ? -1 : 1
}

/**
True for a value carrying the request hook that `installFileRequestFilter` calls
*/
function hasRequestHook(value: unknown): value is Session {
  return typeof value === 'object' && value !== null && 'webRequest' in value
}

/**
A session whose request hook records its filter and listener
*/
function fakeSession() {
  type Listener = (
    details: { url: string },
    callback: (response: { cancel: boolean }) => void
  ) => void

  const recorded: { filter?: unknown; listener?: Listener } = {}
  const session: unknown = {
    webRequest: {
      onBeforeRequest(filter: unknown, listener: Listener) {
        recorded.filter = filter
        recorded.listener = listener
      }
    }
  }
  if (!hasRequestHook(session)) throw new Error('the fake session has no request hook')
  return { session, recorded }
}

describe('the Content Security Policy module', () => {
  it('builds the production and dev-server policies exactly', () => {
    expect(PRODUCTION_CSP).toBe(PRODUCTION)
    expect(DEV_SERVER_CSP).toBe(DEV_SERVER)
    expect([buildCsp({ devServer: false }), buildCsp({ devServer: true })]).toStrictEqual([
      PRODUCTION_CSP,
      DEV_SERVER_CSP
    ])
    // Both deny by default and name no remote source of any kind
    expect(
      [PRODUCTION_CSP, DEV_SERVER_CSP].filter(
        (policy) =>
          !policy.includes("default-src 'none'") ||
          policy.includes('https:') ||
          policy.includes('http:')
      )
    ).toStrictEqual([])

    const workerSource = PRODUCTION_CSP.split('; ').find((d) => d.startsWith('worker-src'))

    expect(workerSource).toBe('worker-src blob:')

    process.stdout.write('csp: strings 2\n')
  })

  it('runs nothing at import and imports only types from electron', () => {
    const source = ts.createSourceFile(MODULE, readFileSync(MODULE, 'utf8'), ts.ScriptTarget.Latest)
    const statements = [...source.statements]
    process.stdout.write(`csp module: statements checked ${String(statements.length)}\n`)

    expect(statements.length).toBeGreaterThan(0)

    const runtimeElectronImports = statements
      .filter((statement): statement is ts.ImportDeclaration => ts.isImportDeclaration(statement))
      .filter(
        ({ moduleSpecifier }) =>
          ts.isStringLiteral(moduleSpecifier) && moduleSpecifier.text === 'electron'
      )
      .map((statement) => statement.getText(source))
      .filter((text) => !text.startsWith('import type '))

    expect(runtimeElectronImports).toStrictEqual([])

    // Declarations only: no statement that runs on import
    const running = statements
      .filter(
        (statement) =>
          !ts.isImportDeclaration(statement) &&
          !ts.isFunctionDeclaration(statement) &&
          !ts.isVariableStatement(statement) &&
          !ts.isInterfaceDeclaration(statement) &&
          !ts.isTypeAliasDeclaration(statement)
      )
      .map((statement) => statement.getText(source))

    expect(running).toStrictEqual([])
  })

  it('is the only source file holding a policy string', () => {
    const files = sourceFiles(SRC)
    const holders = files
      .filter((file) => readFileSync(file, 'utf8').includes(POLICY_MARK))
      .map((file) => path.relative(ROOT, file).replaceAll('\\', '/'))
    process.stdout.write(
      `csp: files scanned ${String(files.length)}, holders ${String(holders.length)}\n`
    )

    expect(files.length).toBeGreaterThan(0)
    expect(holders).toStrictEqual(['src/main/csp.ts'])

    const imports = readFileSync(INDEX, 'utf8')
      .matchAll(/import \{([^}]*)\} from '\.\/csp'/g)
      .toArray()
    const names = imports.flatMap(([, list = '']) => list.split(',').map((name) => name.trim()))

    expect(names.toSorted(byCodeUnit)).toStrictEqual([
      'DEV_SERVER_CSP',
      'PRODUCTION_CSP',
      'installFileRequestFilter'
    ])
  })
})

describe('file request filter', () => {
  it('allows only paths inside the renderer folder', () => {
    const wrong = FILTER_CASES.filter(
      ([url, root, platform, allowed]) => isFileRequestAllowed(url, root, platform) !== allowed
    ).map(([url, root, platform]) => `${platform} ${url} under ${root}`)

    expect(wrong).toStrictEqual([])

    process.stdout.write(`csp: filter cases ${String(FILTER_CASES.length)}\n`)
  })

  it('cancels every file request the predicate rejects', () => {
    const { session, recorded } = fakeSession()
    installFileRequestFilter(session, '/app/out/renderer')

    expect(recorded.filter).toStrictEqual({ urls: ['file://*/*'] })

    const answers: { cancel: boolean }[] = []
    recorded.listener?.({ url: 'file:///app/out/renderer/index.html' }, (response) => {
      answers.push(response)
    })
    recorded.listener?.({ url: 'file:///etc/passwd' }, (response) => {
      answers.push(response)
    })

    expect(answers).toStrictEqual([{ cancel: false }, { cancel: true }])
  })
})
