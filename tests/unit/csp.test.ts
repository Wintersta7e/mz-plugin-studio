// The Content Security Policy module: its two policies, its purity, its single holder, and the
// filter that keeps the page's `file:` requests inside the renderer folder
import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync } from 'fs'
import { join, relative } from 'path'
import { fileURLToPath } from 'url'
import ts from 'typescript'
import type { Session } from 'electron'
import {
  DEV_SERVER_CSP,
  PRODUCTION_CSP,
  buildCsp,
  installFileRequestFilter,
  isFileRequestAllowed
} from '../../src/main/csp'

const ROOT = fileURLToPath(new URL('../..', import.meta.url))
const SRC = join(ROOT, 'src')
const MODULE = join(SRC, 'main', 'csp.ts')
const INDEX = join(SRC, 'main', 'index.ts')

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

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    return entry.isDirectory() ? sourceFiles(path) : [path]
  })
}

type Listener = (
  details: { url: string },
  callback: (response: { cancel: boolean }) => void
) => void

/** A session whose request hook records its filter and listener */
function fakeSession() {
  const recorded: { filter?: unknown; listener?: Listener } = {}
  const session = {
    webRequest: {
      onBeforeRequest(filter: unknown, listener: Listener) {
        recorded.filter = filter
        recorded.listener = listener
      }
    }
  }
  return { session: session as unknown as Session, recorded }
}

describe('Content Security Policy module', () => {
  it('builds the production and dev-server policies exactly', () => {
    expect(PRODUCTION_CSP).toBe(PRODUCTION)
    expect(DEV_SERVER_CSP).toBe(DEV_SERVER)
    expect(buildCsp({ devServer: false })).toBe(PRODUCTION_CSP)
    expect(buildCsp({ devServer: true })).toBe(DEV_SERVER_CSP)
    for (const policy of [PRODUCTION_CSP, DEV_SERVER_CSP]) {
      expect(policy).toContain("default-src 'none'")
      // No remote source of any kind
      expect(policy).not.toContain('https:')
      expect(policy).not.toContain('http:')
    }
    const workerSrc = PRODUCTION_CSP.split('; ').find((d) => d.startsWith('worker-src'))
    expect(workerSrc).toBe('worker-src blob:')
    console.log('csp: strings 2')
  })

  it('runs nothing at import and imports only types from electron', () => {
    const source = ts.createSourceFile(MODULE, readFileSync(MODULE, 'utf8'), ts.ScriptTarget.Latest)
    const statements = [...source.statements]
    console.log(`csp module: statements checked ${statements.length}`)
    expect(statements.length).toBeGreaterThan(0)
    for (const statement of statements) {
      const text = statement.getText(source)
      if (ts.isImportDeclaration(statement)) {
        const from = (statement.moduleSpecifier as ts.StringLiteral).text
        if (from === 'electron') expect(text, 'a runtime electron import').toMatch(/^import type /)
        continue
      }
      // Declarations only: no statement that runs on import
      expect(
        ts.isFunctionDeclaration(statement) ||
          ts.isVariableStatement(statement) ||
          ts.isInterfaceDeclaration(statement) ||
          ts.isTypeAliasDeclaration(statement),
        `a statement that runs on import: ${text}`
      ).toBe(true)
    }
  })

  it('is the only source file holding a policy string', () => {
    const files = sourceFiles(SRC)
    const holders = files
      .filter((file) => readFileSync(file, 'utf8').includes(POLICY_MARK))
      .map((file) => relative(ROOT, file).split('\\').join('/'))
    console.log(`csp: files scanned ${files.length}, holders ${holders.length}`)
    expect(files.length).toBeGreaterThan(0)
    expect(holders).toEqual(['src/main/csp.ts'])

    const imports = [...readFileSync(INDEX, 'utf8').matchAll(/import \{([^}]*)\} from '\.\/csp'/g)]
    const names = imports.flatMap((match) => match[1].split(',').map((name) => name.trim()))
    expect(names.sort()).toEqual(['DEV_SERVER_CSP', 'PRODUCTION_CSP', 'installFileRequestFilter'])
  })
})

describe('file request filter', () => {
  it('allows only paths inside the renderer folder', () => {
    for (const [url, root, platform, allowed] of FILTER_CASES) {
      expect(isFileRequestAllowed(url, root, platform), `${platform} ${url} under ${root}`).toBe(
        allowed
      )
    }
    console.log(`csp: filter cases ${FILTER_CASES.length}`)
  })

  it('cancels every file request the predicate rejects', () => {
    const { session, recorded } = fakeSession()
    installFileRequestFilter(session, '/app/out/renderer')
    expect(recorded.filter).toEqual({ urls: ['file://*/*'] })
    const answers: { cancel: boolean }[] = []
    recorded.listener?.({ url: 'file:///app/out/renderer/index.html' }, (r) => answers.push(r))
    recorded.listener?.({ url: 'file:///etc/passwd' }, (r) => answers.push(r))
    expect(answers).toEqual([{ cancel: false }, { cancel: true }])
  })
})
