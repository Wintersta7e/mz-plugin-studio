// The renderer reaches browser storage only through the saved-state writer, and never names the
// key main marks a carried-over profile with, neither as text nor through the constant holding it.
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import * as ts from 'typescript'
import { describe, expect, it } from 'vitest'

const RENDERER = path.join(process.cwd(), 'src/renderer/src')
const WRITER = path.join(RENDERER, 'stores/persist.ts')
const ORIGIN_MODULE = path.join(process.cwd(), 'src/shared/app-origin.ts')
const MARKER = 'mz-plugin-studio-origin-handover'
const STORAGE_NAMES = new Set(['localStorage', 'sessionStorage', 'indexedDB'])

const parse = (file: string): ts.SourceFile =>
  ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true)

function rendererFiles(): string[] {
  return readdirSync(RENDERER, { recursive: true, encoding: 'utf8' })
    .filter((file) => /\.tsx?$/.test(file))
    .map((file) => path.join(RENDERER, file))
}

const isExported = (statement: ts.VariableStatement): boolean =>
  statement.modifiers?.some(({ kind }) => kind === ts.SyntaxKind.ExportKeyword) === true

/**
The exported constants of the shared origin module whose value is the marker; undefined when the
module does not exist
*/
function markerConstants(): Set<string> | undefined {
  if (!existsSync(ORIGIN_MODULE)) return undefined
  const names = new Set<string>()
  for (const statement of parse(ORIGIN_MODULE).statements) {
    if (!ts.isVariableStatement(statement) || !isExported(statement)) continue
    for (const { name, initializer } of statement.declarationList.declarations) {
      if (initializer === undefined || !ts.isIdentifier(name)) continue
      if (ts.isStringLiteralLike(initializer) && initializer.text === MARKER) names.add(name.text)
    }
  }
  return names
}

// Whether an import specifier names the shared origin module
const isOriginModule = (specifier: string): boolean =>
  /(?:^|\/)shared\/app-origin(?:\.ts)?$/.test(specifier)

// The marker constants an import declaration brings in from the origin module
function importedMarkers(node: ts.ImportDeclaration, constants: Set<string>): string[] {
  const { moduleSpecifier, importClause } = node
  if (!ts.isStringLiteral(moduleSpecifier) || !isOriginModule(moduleSpecifier.text)) return []
  const bindings = importClause?.namedBindings
  if (bindings === undefined) return []
  // a namespace import reaches every constant
  if (ts.isNamespaceImport(bindings)) return [...constants]
  return bindings.elements
    .map(({ name, propertyName = name }) => propertyName.text)
    .filter((name) => constants.has(name))
}

interface FileCounts {
  markerHits: number
  constantImports: number
  storageUses: number
}

function scan(file: string, constants: Set<string>): FileCounts {
  const counts: FileCounts = {
    markerHits: readFileSync(file, 'utf8').split(MARKER).length - 1,
    constantImports: 0,
    storageUses: 0
  }
  const visit = (node: ts.Node): void => {
    if (ts.isImportDeclaration(node)) {
      counts.constantImports += importedMarkers(node, constants).length
    }
    const isStorageName =
      (ts.isIdentifier(node) || ts.isStringLiteralLike(node)) && STORAGE_NAMES.has(node.text)
    if (isStorageName) counts.storageUses += 1
    ts.forEachChild(node, visit)
  }
  visit(parse(file))
  return counts
}

describe('renderer storage scope', () => {
  it('only the saved-state writer reaches storage, and nothing names the carried-profile marker', () => {
    expect.hasAssertions()

    const constants = markerConstants()
    const files = rendererFiles()
    const counts = files.map((file) => ({ file, ...scan(file, constants ?? new Set()) }))
    const sum = (pick: (entry: FileCounts) => number, from = counts): number =>
      from.reduce((total, entry) => total + pick(entry), 0)
    const outside = counts.filter(({ file }) => file !== WRITER)
    const result = {
      filesScanned: files.length,
      markerHits: sum(({ markerHits }) => markerHits),
      constantImports: sum(({ constantImports }) => constantImports),
      storageOutsideWriter: outside
        .filter(({ storageUses }) => storageUses > 0)
        .map(({ file }) => path.relative(RENDERER, file)),
      storageInWriter: sum(
        ({ storageUses }) => storageUses,
        counts.filter(({ file }) => file === WRITER)
      )
    }
    process.stdout.write(
      [
        `files scanned ${String(result.filesScanned)}`,
        `marker hits ${String(result.markerHits)}`,
        `marker constant imports ${constants === undefined ? '0 (origin module absent)' : String(result.constantImports)}`,
        `storage uses outside the writer ${String(sum(({ storageUses }) => storageUses, outside))}`,
        `storage uses in the writer ${String(result.storageInWriter)}`
      ].join('\n') + '\n'
    )

    // the writer's own uses prove the scan sees storage at all
    expect({
      scansFiles: result.filesScanned > 0,
      markerHits: result.markerHits,
      constantImports: result.constantImports,
      storageOutsideWriter: result.storageOutsideWriter,
      seesTheWriter: result.storageInWriter > 0
    }).toStrictEqual({
      scansFiles: true,
      markerHits: 0,
      constantImports: 0,
      storageOutsideWriter: [],
      seesTheWriter: true
    })
  })
})
