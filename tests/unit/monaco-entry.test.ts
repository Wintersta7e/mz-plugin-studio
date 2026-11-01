// The code editor is bundled through one setup module: the renderer entry imports it first and
// alone, every other source file imports the editor's types only, and its notices ship
import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync } from 'fs'
import { join, relative } from 'path'
import { fileURLToPath } from 'url'
import ts from 'typescript'

const ROOT = fileURLToPath(new URL('../..', import.meta.url))
const SRC = join(ROOT, 'src')
const SETUP_NAME = 'monaco-setup'
const ENTRY = 'src/renderer/src/main.tsx'
const SETUP = 'src/renderer/src/lib/monaco-setup.ts'
const NOTICES_MARK = 'THIRD-PARTY SOFTWARE NOTICES AND INFORMATION'

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) return sourceFiles(path)
    return /\.(ts|tsx)$/.test(entry.name) ? [path] : []
  })
}

const rel = (file: string): string => relative(ROOT, file).split('\\').join('/')

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

const isEditorPackage = (from: string): boolean =>
  from === 'monaco-editor' || from.startsWith('monaco-editor/')

describe('code editor entry', () => {
  it('is imported first by the renderer entry and nowhere else', () => {
    const files = sourceFiles(SRC)
    const importers = files.filter(
      (file) => rel(file) !== SETUP && readFileSync(file, 'utf8').includes(SETUP_NAME)
    )
    console.log(`monaco entry: src files scanned ${files.length}, importers ${importers.length}`)
    expect(files.length).toBeGreaterThan(0)
    expect(importers.map(rel)).toEqual([ENTRY])
    expect(readFileSync(join(ROOT, SETUP), 'utf8')).not.toContain(SETUP_NAME)
    expect(imports(parse(join(ROOT, ENTRY)))[0]?.from).toBe('./lib/monaco-setup')
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
