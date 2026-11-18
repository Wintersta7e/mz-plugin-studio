// The TypeScript programs are the configs the root tsconfig.json references, in its order; every
// test that names a program reads them here, so no copy of the list can go stale.
import { readFileSync } from 'node:fs'
import path from 'node:path'

export interface TypeScriptProgram {
  // `tsconfig.node.json` is `node`; a folder's own `tools/tsconfig.json` is `tools`
  name: string
  // Relative to the repository root
  config: string
}

const isList = (value: unknown): value is unknown[] => Array.isArray(value)
const member = (value: unknown, key: string): unknown =>
  typeof value === 'object' && value !== null ? Reflect.get(value, key) : undefined

const nameOf = (config: string): string => {
  const base = path.posix.basename(config)
  return base === 'tsconfig.json'
    ? path.posix.basename(path.posix.dirname(config))
    : base.replace(/^tsconfig\.(.+)\.json$/, '$1')
}

export function typeScriptPrograms(root: string): TypeScriptProgram[] {
  const parsed: unknown = JSON.parse(readFileSync(path.join(root, 'tsconfig.json'), 'utf8'))
  const references = member(parsed, 'references')
  if (!isList(references)) throw new Error('tsconfig.json: no references')
  return references.map((reference) => {
    const target = member(reference, 'path')
    if (typeof target !== 'string') throw new TypeError('tsconfig.json: a reference without a path')
    const config = path.posix.normalize(target)
    return { name: nameOf(config), config }
  })
}
