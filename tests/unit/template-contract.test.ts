// Every template reads its values by the types of its own fields: no category module takes them
// as an untyped record, and a value of another type than its field never reaches the code.
import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { getTemplate } from '../../src/renderer/src/lib/generator/templates/index'

const TEMPLATES_DIR = 'src/renderer/src/lib/generator/templates'

// The registry module and the two modules every category reads; any other module under the
// templates directory is a category module.
const NOT_CATEGORY = new Set(['index', 'types', 'values'])

// What leaves a template's values untyped: an untyped record (in a code or check signature, or as
// the type of the values a helper reads), a value read by a string key, and a template declared
// as the erased type rather than through `defineTemplate`.
const UNTYPED = [/Record<string, unknown>/g, /\bvalues\[['"]/g, /:\s*CodeTemplate\s*=/g]

const categoryModules = (): string[] =>
  readdirSync(TEMPLATES_DIR)
    .filter((name) => name.endsWith('.ts') && !NOT_CATEGORY.has(path.basename(name, '.ts')))
    .toSorted((a, b) => a.localeCompare(b))

const untypedIn = (source: string): number =>
  UNTYPED.reduce((count, pattern) => count + source.matchAll(pattern).toArray().length, 0)

describe('template contract', () => {
  it('types the values of every category module from its own fields', () => {
    const modules = categoryModules()
    const counts = modules.map((name): [string, number] => [
      name,
      untypedIn(readFileSync(path.join(TEMPLATES_DIR, name), 'utf8'))
    ])
    const untyped = counts.filter(([, count]) => count > 0)
    const total = untyped.reduce((sum, [, count]) => sum + count, 0)

    expect(
      modules.length,
      `scanned: ${String(modules.length)}, untyped: ${String(total)}`
    ).toBeGreaterThan(0)
    expect(untyped, `scanned: ${String(modules.length)}, untyped: ${String(total)}`).toStrictEqual(
      []
    )
  })

  it('refuses a value of another type than its field instead of writing it into the code', () => {
    const template = getTemplate('audio-bgm-control')

    expect(template).toBeDefined()
    expect(() => template?.generate({ operation: 7 })).toThrow(TypeError)
  })

  it('names the field whose value is of another type', () => {
    expect(() => getTemplate('audio-bgm-control')?.generate({ operation: 7 })).toThrow(
      'Field "Operation" must be text'
    )
  })
})
