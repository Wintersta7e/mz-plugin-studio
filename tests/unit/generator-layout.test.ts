// The generator is split by concern: its entry module only re-exports the modules that hold the
// code, and one module alone reads the JavaScript parser.
import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import * as ts from 'typescript'
import { describe, expect, it } from 'vitest'

const SOURCE_ROOT = path.join(import.meta.dirname, '../../src')
const ENTRY = path.join(SOURCE_ROOT, 'renderer/src/lib/generator/index.ts')
const PARSER_OWNER = 'renderer/src/lib/generator/parse.ts'

const sourceFile = (file: string): ts.SourceFile =>
  ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true)

const isReExport = (statement: ts.Statement): boolean =>
  ts.isExportDeclaration(statement) && statement.moduleSpecifier !== undefined

// The module names a file imports from or re-exports from.
const modulesRead = (file: ts.SourceFile): string[] =>
  file.statements.flatMap((statement) =>
    (ts.isImportDeclaration(statement) || ts.isExportDeclaration(statement)) &&
    statement.moduleSpecifier !== undefined &&
    ts.isStringLiteral(statement.moduleSpecifier)
      ? [statement.moduleSpecifier.text]
      : []
  )

const isParser = (specifier: string): boolean =>
  specifier === 'acorn' || specifier.startsWith('acorn/')

describe('generator layout', () => {
  it('holds only re-exports in the generator entry module', () => {
    const { statements } = sourceFile(ENTRY)
    const others = statements
      .filter((statement) => !isReExport(statement))
      .map((statement) => statement.getText().split('\n', 1).at(0))

    expect(
      statements.length,
      `statements: ${String(statements.length)}, not a re-export: ${String(others.length)}`
    ).toBeGreaterThan(0)
    expect(
      others,
      `statements: ${String(statements.length)}, not a re-export: ${String(others.length)}`
    ).toStrictEqual([])
  })

  it('reads the JavaScript parser in one module only', () => {
    const files = readdirSync(SOURCE_ROOT, { recursive: true, encoding: 'utf8' })
      .filter((p) => /\.tsx?$/u.test(p))
      .map((p) => p.split(path.sep).join('/'))
    const importers = files
      .filter((p) =>
        modulesRead(sourceFile(path.join(SOURCE_ROOT, p))).some((specifier) => isParser(specifier))
      )
      .toSorted((a, b) => a.localeCompare(b))

    expect(files.length).toBeGreaterThan(0)
    expect(
      importers,
      `acorn importers: ${String(importers.length)} (${importers.join(', ')}) of ${String(files.length)} scanned`
    ).toStrictEqual([PARSER_OWNER])
  })
})
