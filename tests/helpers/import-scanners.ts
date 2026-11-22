// The import scanners the dependency audits once declared each on their own; scripts/import-reader.mjs
// now holds the one reader, so an audit script that declares one of them reads imports twice.
import { readFileSync } from 'node:fs'
import path from 'node:path'

const IMPORT_SCANNERS = [
  'importSpecifiers',
  'importAt',
  'statementAt',
  'stylesheetAt',
  'importQuote',
  'clauseQuote',
  'callQuote',
  'quoted',
  'spacesBefore',
  'readImports',
  'fromStatements',
  'sourceAt',
  'clauseStep',
  'clauseSource',
  'blockCommentSource',
  'isTypeOnly',
  'skip',
  'isAt'
]

/**
The import scanners `script` declares and whether it imports the shared reader, as the one line an
owner case asserts: its count reads 0 and `true` when the script reads imports only through it.
*/
export function ownImportScanners(script: string): string {
  const source = readFileSync(path.resolve(script), 'utf8')
  const declared = IMPORT_SCANNERS.filter((name) =>
    new RegExp(String.raw`\b(?:function\s+${name}\b|(?:const|let)\s+${name}\s*=)`).test(source)
  )
  const doesImportReader = source.includes("from './import-reader.mjs'")
  return (
    `import scanners declared in ${script}: ${String(declared.length)} of ` +
    `${String(IMPORT_SCANNERS.length)} counted (${declared.join(', ')}); ` +
    `shared reader imported: ${String(doesImportReader)}`
  )
}
