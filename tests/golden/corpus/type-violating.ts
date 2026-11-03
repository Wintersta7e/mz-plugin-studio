// Inputs of the wrong type, pinned before strictness edits change how the code that reads them
// is typed: template values of another JavaScript type than the field declares, `null` and
// arrays in every field, and parameter files whose defaults are not the declared type.
import {
  getTemplate,
  type TemplateField
} from '../../../src/renderer/src/lib/generator/templates/index'
import type { TemplateCase } from './templates'

// A value of another JavaScript type than each field type holds.
const WRONG_TYPE: Record<TemplateField['type'], unknown> = {
  text: 42,
  'class-select': 42,
  'method-select': 42,
  'key-select': 42,
  number: 'abc',
  boolean: 'yes',
  select: 7
}

// Every field of the template set by `value`.
function everyField(id: string, value: (field: TemplateField) => unknown): Record<string, unknown> {
  const fields = getTemplate(id)?.fields ?? []
  return Object.fromEntries(fields.map((field) => [field.id, value(field)]))
}

// The type-violating cases of one template, pinned in a golden file of their own.
export function typeViolatingTemplateCases(id: string): TemplateCase[] {
  return [
    {
      name: 'type-violating: wrong types',
      values: everyField(id, (field) => WRONG_TYPE[field.type]),
      hostile: null
    },
    { name: 'type-violating: null', values: everyField(id, () => null), hostile: null },
    { name: 'type-violating: arrays', values: everyField(id, () => ['a', 'b']), hostile: null }
  ]
}

export interface TypeViolatingDefaultCase {
  // Golden stem under `generator/`.
  name: string
  // The parameter file's text, read through the import path.
  content: string
}

// One default value per case, set on a parameter of each type below.
const DEFAULTS: [string, unknown][] = [
  ['number-5', 5],
  ['number-0', 0],
  ['number-fraction', 1.5],
  ['true', true],
  ['false', false],
  ['null', null],
  ['array', ['a', 'b']],
  ['object', { k: 1 }]
]

const OPTIONS = [
  { value: 'fast', text: 'Fast' },
  { value: 'slow', text: 'Slow' }
]

const parameter = (name: string, type: string, value: unknown): Record<string, unknown> => ({
  name,
  text: name,
  desc: `A ${type} parameter.`,
  type,
  default: value,
  ...(type === 'select' && { options: OPTIONS })
})

const file = (parameters: Record<string, unknown>[]): string =>
  JSON.stringify({ version: 1, source: 'Fixture_Defaults', parameters })

export const typeViolatingDefaultCases: TypeViolatingDefaultCase[] = [
  ...DEFAULTS.map(([label, value]) => ({
    name: `type-violating-default-${label}`,
    content: file([
      parameter('Label', 'string', value),
      parameter('Count', 'number', value),
      parameter('Enabled', 'boolean', value),
      parameter('Mode', 'select', value)
    ])
  })),
  // A parameter whose type is a number: skipped by name, beside one that loads.
  {
    name: 'type-violating-param-type',
    content: file([
      { ...parameter('Broken', 'string', 'x'), type: 7 },
      parameter('Label', 'string', 'Hello')
    ])
  }
]
