// The code editor is bundled through one setup module that the editor hosts import first, so it
// loads with the first editor shown: the renderer entry never reaches it through a static import,
// every other source file imports the editor's types only, and its notices ship
import { describe, expect, it } from 'vitest'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const ROOT = fileURLToPath(new URL('../..', import.meta.url))
const SRC = join(ROOT, 'src')
const RENDERER = join(SRC, 'renderer/src')
const SETUP_NAME = 'monaco-setup'
const ENTRY = 'src/renderer/src/main.tsx'
const SETUP = 'src/renderer/src/lib/monaco-setup.ts'
const HOSTS = [
  'src/renderer/src/components/plugin/CodeEditor.tsx',
  'src/renderer/src/components/preview/CodePreview.tsx',
  'src/renderer/src/components/preview/DiffView.tsx'
]
const NOTICES_MARK = 'THIRD-PARTY SOFTWARE NOTICES AND INFORMATION'

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) return sourceFiles(path)
    return /\.(ts|tsx)$/.test(entry.name) ? [path] : []
  })
}

const rel = (file: string): string => relative(ROOT, file).replaceAll('\\', '/')

function parse(file: string): ts.SourceFile {
  return ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest)
}

/** Import and re-export declarations with their specifier and whether they carry values */
function imports(source: ts.SourceFile): { from: string; value: boolean }[] {
  return source.statements.flatMap((statement) => {
    if (ts.isImportDeclaration(statement)) {
      const from = (statement.moduleSpecifier as ts.StringLiteral).text
      return [{ from, value: !statement.importClause?.isTypeOnly }]
    }
    if (ts.isExportDeclaration(statement) && statement.moduleSpecifier) {
      const from = (statement.moduleSpecifier as ts.StringLiteral).text
      return [{ from, value: !statement.isTypeOnly }]
    }
    return []
  })
}

const isLocal = (from: string): boolean => from.startsWith('.') || from.startsWith('@/')

/** The source file a relative or `@/` specifier names, if it is one */
function resolveSource(importer: string, from: string): string | undefined {
  if (!isLocal(from)) return undefined
  const base = from.startsWith('@/')
    ? join(RENDERER, from.slice(2))
    : resolve(dirname(importer), from)
  const candidates = ['', '.ts', '.tsx', '/index.ts', '/index.tsx'].map((ext) => base + ext)
  return candidates.find((file) => /\.(ts|tsx)$/.test(file) && existsSync(file))
}

/** Every source file and package the entry reaches through value imports; `import()` is not one */
function staticGraph(entry: string): { files: Set<string>; packages: Set<string> } {
  const files = new Set<string>()
  const packages = new Set<string>()
  const pending = [entry]
  for (let file = pending.pop(); file !== undefined; file = pending.pop()) {
    if (files.has(file)) continue
    files.add(file)
    for (const { from, value } of imports(parse(file))) {
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

describe('code editor entry', () => {
  it('is imported first by each editor host and nowhere else', () => {
    const files = sourceFiles(SRC)
    const importers = files.filter(
      (file) => rel(file) !== SETUP && readFileSync(file, 'utf8').includes(SETUP_NAME)
    )
    console.log(`monaco entry: src files scanned ${files.length}, importers ${importers.length}`)

    expect(files.length).toBeGreaterThan(0)
    expect(importers.map(rel).sort()).toEqual([...HOSTS].sort())
    expect(readFileSync(join(ROOT, SETUP), 'utf8')).not.toContain(SETUP_NAME)

    for (const host of HOSTS) {
      const first = imports(parse(join(ROOT, host)))[0]?.from ?? ''

      expect(resolveSource(join(ROOT, host), first), host).toBe(join(ROOT, SETUP))
    }
  })

  it('is not reached from the renderer entry through static imports', () => {
    const { files, packages } = staticGraph(join(ROOT, ENTRY))
    console.log(`monaco entry: files reached statically ${files.size}, packages ${packages.size}`)

    expect(files.has(join(ROOT, 'src/renderer/src/App.tsx'))).toBe(true)
    expect([SETUP, ...HOSTS].filter((file) => files.has(join(ROOT, file)))).toEqual([])

    const editorPackages = [...packages].filter(
      (from) => isEditorPackage(from) || from === '@monaco-editor/react'
    )

    expect(editorPackages).toEqual([])
  })

  it('keeps every other editor import type-only', () => {
    const valueImporters = sourceFiles(SRC).filter((file) =>
      imports(parse(file)).some(({ from, value }) => value && isEditorPackage(from))
    )

    expect(valueImporters.map(rel)).toEqual([SETUP])
  })

  it('bundles the editor as a build-time package and ships its notices', () => {
    const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')) as {
      dependencies?: Record<string, string>
      devDependencies?: Record<string, string>
    }

    expect(pkg.devDependencies?.['monaco-editor']).toBeDefined()
    expect(pkg.dependencies?.['monaco-editor']).toBeUndefined()
    expect(readFileSync(join(ROOT, 'THIRD_PARTY_LICENSES.md'), 'utf8')).toContain(NOTICES_MARK)
  })
})
