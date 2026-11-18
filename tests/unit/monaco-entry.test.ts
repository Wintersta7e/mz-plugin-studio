// The code editor is bundled through one setup module that the editor hosts import first, so it
// loads with the first editor shown: the renderer entry never reaches it through a static import,
// every other source file imports the editor's types only, and its notices ship
import { describe, expect, it } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import * as ts from 'typescript'
import { sourceFiles } from '../helpers/source-files'

const ROOT = fileURLToPath(new URL('../..', import.meta.url))
const SRC = path.join(ROOT, 'src')
const RENDERER = path.join(SRC, 'renderer/src')
const SETUP_NAME = 'monaco-setup'
const ENTRY = 'src/renderer/src/main.tsx'
const SETUP = 'src/renderer/src/lib/monaco-setup.ts'
const HOSTS = [
  'src/renderer/src/components/plugin/CodeEditor.tsx',
  'src/renderer/src/components/preview/CodePreview.tsx',
  'src/renderer/src/components/preview/DiffView.tsx'
]
const NOTICES_MARK = 'THIRD-PARTY SOFTWARE NOTICES AND INFORMATION'
const SOURCE_FILE = /\.tsx?$/

const typeScriptSources = (): string[] => sourceFiles(SRC, SOURCE_FILE)

const relativePath = (file: string): string => path.relative(ROOT, file).replaceAll('\\', '/')

function byCodeUnit(left: string, right: string): number {
  if (left === right) return 0
  return left < right ? -1 : 1
}

function parse(file: string): ts.SourceFile {
  return ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest)
}

const specifier = (node: ts.Expression): string => (ts.isStringLiteral(node) ? node.text : '')

/**
Import and re-export declarations with their specifier and whether they carry values
*/
function imports(source: ts.SourceFile): { from: string; value: boolean }[] {
  return source.statements.flatMap((statement) => {
    if (ts.isImportDeclaration(statement)) {
      const isValue = statement.importClause?.phaseModifier !== ts.SyntaxKind.TypeKeyword
      return [{ from: specifier(statement.moduleSpecifier), value: isValue }]
    }
    return ts.isExportDeclaration(statement) && statement.moduleSpecifier !== undefined
      ? [{ from: specifier(statement.moduleSpecifier), value: !statement.isTypeOnly }]
      : []
  })
}

// The renderer's two aliases, as electron.vite.config.ts and tsconfig.web.json declare them
const RENDERER_ALIASES = ['@/', '@renderer/']
const aliasOf = (from: string): string | undefined =>
  RENDERER_ALIASES.find((alias) => from.startsWith(alias))
const isLocal = (from: string): boolean => from.startsWith('.') || aliasOf(from) !== undefined

/**
The source file a relative or renderer-alias specifier names, if it is one
*/
function resolveSource(importer: string, from: string): string | undefined {
  if (!isLocal(from)) return undefined
  const alias = aliasOf(from)
  const base =
    alias === undefined
      ? path.resolve(path.dirname(importer), from)
      : path.join(RENDERER, from.slice(alias.length))
  const candidates = ['', '.ts', '.tsx', '/index.ts', '/index.tsx'].map(
    (extension) => base + extension
  )
  return candidates.find((file) => SOURCE_FILE.test(file) && existsSync(file))
}

/**
Every source file and package the entry reaches through value imports; `import()` is not one
*/
function staticGraph(entry: string): { files: Set<string>; packages: Set<string> } {
  const files = new Set<string>()
  const packages = new Set<string>()
  const pending = [entry]
  for (let file = pending.pop(); file !== undefined; file = pending.pop()) {
    if (files.has(file)) continue
    files.add(file)
    const declarations = imports(parse(file))
    for (const { from, value } of declarations) {
      if (!value) continue
      const target = resolveSource(file, from)
      if (target !== undefined) pending.push(target)
      else if (!isLocal(from)) packages.add(from)
    }
  }
  return { files, packages }
}

const isEditorPackage = (from: string): boolean =>
  from === 'monaco-editor' || from.startsWith('monaco-editor/')

/**
A member of a value parsed from JSON; undefined when the value holds no such member.
*/
function member(value: unknown, key: string): unknown {
  return typeof value === 'object' && value !== null ? Reflect.get(value, key) : undefined
}

describe('code editor entry', () => {
  it('is imported first by each editor host and nowhere else', () => {
    const files = typeScriptSources()
    const importers = files.filter(
      (file) => relativePath(file) !== SETUP && readFileSync(file, 'utf8').includes(SETUP_NAME)
    )
    process.stdout.write(
      `monaco entry: src files scanned ${String(files.length)}, ` +
        `importers ${String(importers.length)}\n`
    )

    expect(files.length).toBeGreaterThan(0)
    expect(importers.map((file) => relativePath(file)).toSorted(byCodeUnit)).toStrictEqual(
      HOSTS.toSorted(byCodeUnit)
    )
    expect(readFileSync(path.join(ROOT, SETUP), 'utf8')).not.toContain(SETUP_NAME)

    const firstImports = HOSTS.map((host) => {
      const first = imports(parse(path.join(ROOT, host))).at(0)?.from ?? ''
      return [host, resolveSource(path.join(ROOT, host), first)]
    })

    expect(firstImports).toStrictEqual(HOSTS.map((host) => [host, path.join(ROOT, SETUP)]))
  })

  it('is not reached from the renderer entry through static imports', () => {
    const { files, packages } = staticGraph(path.join(ROOT, ENTRY))
    process.stdout.write(
      `monaco entry: files reached statically ${String(files.size)}, ` +
        `packages ${String(packages.size)}\n`
    )

    expect(files.has(path.join(ROOT, 'src/renderer/src/App.tsx'))).toBe(true)
    expect([SETUP, ...HOSTS].filter((file) => files.has(path.join(ROOT, file)))).toStrictEqual([])

    const editorPackages = [...packages].filter(
      (from) => isEditorPackage(from) || from === '@monaco-editor/react'
    )

    expect(editorPackages).toStrictEqual([])
  })

  it('keeps every other editor import type-only', () => {
    const valueImporters = typeScriptSources().filter((file) =>
      imports(parse(file)).some(({ from, value }) => value && isEditorPackage(from))
    )

    expect(valueImporters.map((file) => relativePath(file))).toStrictEqual([SETUP])
  })

  it('follows both renderer aliases to their source file', () => {
    const importer = path.join(ROOT, ENTRY)

    expect(
      ['@/lib/monaco-setup', '@renderer/lib/monaco-setup'].map((from) =>
        resolveSource(importer, from)
      )
    ).toStrictEqual([path.join(ROOT, SETUP), path.join(ROOT, SETUP)])
  })

  it('bundles the editor as a build-time package and ships its notices', () => {
    const manifest: unknown = JSON.parse(readFileSync(path.join(ROOT, 'package.json'), 'utf8'))

    expect(member(member(manifest, 'devDependencies'), 'monaco-editor')).toBeDefined()
    expect(member(member(manifest, 'dependencies'), 'monaco-editor')).toBeUndefined()
    expect(readFileSync(path.join(ROOT, 'THIRD_PARTY_LICENSES.md'), 'utf8')).toContain(NOTICES_MARK)
  })
})
