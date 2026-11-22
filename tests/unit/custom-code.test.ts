// Where inserted template code goes in the plugin's own code when no editor places it: after a
// blank line below code already there, or as the whole text when there is none.
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { appendTemplateCode } from '../../src/renderer/src/lib/generator/custom-code'

const CODE = 'const inserted = 1;'

describe(appendTemplateCode, () => {
  it.each([
    { before: '', after: CODE },
    { before: '  \n', after: CODE },
    { before: 'a', after: `a\n\n${CODE}` },
    { before: 'a\n', after: `a\n\n\n${CODE}` }
  ])('appends to $before as $after', ({ before, after }) => {
    expect(appendTemplateCode(before, CODE)).toBe(after)
  })

  it('reads no other module', () => {
    const source = readFileSync('src/renderer/src/lib/generator/custom-code.ts', 'utf8')
    const imports = source.match(/\bimport\b|\brequire\s*\(|\bfrom\s+['"]/g) ?? []

    expect(imports, `imports: ${String(imports.length)}`).toStrictEqual([])
  })
})
