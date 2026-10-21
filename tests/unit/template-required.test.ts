// The template dialog lists what keeps a template from showing code. A required field left empty
// is listed once, by the shared required-field check, and not again by the template's own check.
import { describe, it, expect } from 'vitest'
import {
  getTemplate,
  validateTemplateValues
} from '../../src/renderer/src/lib/generator/templates/index'
import { baseValues, templateIds } from '../golden/corpus/templates'

describe('required template fields', () => {
  it('reports an empty required field once', () => {
    const repeated: string[] = []
    let checked = 0
    for (const id of templateIds()) {
      const base = baseValues(id)
      const before = validateTemplateValues(id, base).errors
      for (const field of getTemplate(id)!.fields.filter((f) => f.required)) {
        checked++
        // What the dialog stores for an emptied field: a number input stores Number('').
        const empty = field.type === 'number' ? 0 : ''
        const added = validateTemplateValues(id, { ...base, [field.id]: empty }).errors.filter(
          (e) => !before.includes(e)
        )
        if (added.length > 1) repeated.push(`${id}.${field.id}: ${added.join(' | ')}`)
      }
    }
    console.log(`required template fields checked: ${checked}`)
    expect(checked).toBeGreaterThan(0)
    expect(repeated).toEqual([])
  })
})
