// The template registry: one list built from every category's templates in the dialog's order,
// reached through the registry module alone, each id defined once.
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  createTemplateRegistry,
  getAllTemplates,
  type CodeTemplate
} from '../../src/renderer/src/lib/generator/templates/index'

// The templates the dialog listed before the registry was built from static lists: their number
// and the SHA-256 of their ids joined by line breaks, in listing order.
const TEMPLATE_COUNT = 36
const TEMPLATE_IDS_SHA256 = '6f1535a03a6c38c6ee9170f536a4c337df1eaaf66f0ab433051280d79d023d66'

// The registry module and the two modules every category reads; any other module under the
// templates directory is a category module.
const NOT_CATEGORY = new Set(['index', 'types', 'values'])

const sampleTemplate = (name: string): CodeTemplate => ({
  id: 'sample',
  category: 'method-alias',
  name,
  description: 'A sample template',
  icon: 'GitBranch',
  fields: [],
  generate: () => `// ${name}`
})

describe('template registry', () => {
  it('lists every template in the dialog order from the registry module alone', () => {
    const ids = getAllTemplates().map((template) => template.id)
    const hash = createHash('sha256').update(ids.join('\n')).digest('hex')

    expect({ count: ids.length, hash }).toStrictEqual({
      count: TEMPLATE_COUNT,
      hash: TEMPLATE_IDS_SHA256
    })
  })

  it('refuses a template id defined twice', () => {
    expect(() =>
      createTemplateRegistry([sampleTemplate('First'), sampleTemplate('Second')])
    ).toThrow('Template id "sample" is defined twice')
  })

  it('leaves the dialog no import of a category module', () => {
    const source = readFileSync('src/renderer/src/components/plugin/TemplateInserter.tsx', 'utf8')
    const modules = source
      .matchAll(/['"][./]*lib\/generator\/templates(?:\/([^'"/]+))?['"]/g)
      .map((match) => match[1] ?? 'index')
      .toArray()
    const categoryImports = modules.filter((name) => !NOT_CATEGORY.has(name))
    process.stdout.write(
      `template dialog: template modules imported ${String(modules.length)}, category imports ${String(categoryImports.length)}\n`
    )

    expect(modules.length, 'template modules imported: 0').toBeGreaterThan(0)
    expect(categoryImports, `category imports: ${String(categoryImports.length)}`).toStrictEqual([])
  })
})
