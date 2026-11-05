// A template value of another JavaScript type than its field declares is listed as an error on
// that field, once, instead of the template's own check reading it as the declared type and
// throwing.
import { describe, it, expect } from 'vitest'
import {
  getTemplate,
  getTemplateDefaults,
  validateTemplateValues,
  type TemplateField
} from '../../src/renderer/src/lib/generator/templates/index'
import { baseValues, templateIds } from '../golden/corpus/templates'

const KIND: Record<TemplateField['type'], string> = {
  text: 'text',
  select: 'text',
  'class-select': 'text',
  'method-select': 'text',
  'key-select': 'text',
  number: 'a number',
  boolean: 'true or false'
}

const typeError = (field: TemplateField): string =>
  `Field "${field.label}" must be ${KIND[field.type]}`

function fieldsOf(id: string): TemplateField[] {
  const template = getTemplate(id)
  if (template === undefined) throw new Error(`no template ${id}`)
  return template.fields
}

function fieldOf(id: string, fieldId: string): TemplateField {
  const field = fieldsOf(id).find((f) => f.id === fieldId)
  if (field === undefined) throw new Error(`${id} has no field ${fieldId}`)
  return field
}

// The type errors among a result's errors, for the fields of one template.
function typeErrors(id: string, errors: string[]): string[] {
  const all = new Set(fieldsOf(id).map((field) => typeError(field)))
  return errors.filter((message) => all.has(message))
}

// Each place a template's own check called a string method on a value it read as text: the
// template, the field, and any other values that let the check reach that call.
const SITES: [site: string, id: string, field: string, context: Record<string, unknown>][] = [
  ['custom-window window name', 'custom-window-basic', 'windowName', {}],
  ['hud window name', 'hud-overlay-window', 'windowName', {}],
  ['popup window name', 'popup-notification-window', 'windowName', {}],
  ['gauge window name', 'gauge-window', 'windowName', {}],
  ['event spawn function name', 'map-event-spawn', 'functionName', {}],
  ['movement route function name', 'map-movement-route', 'functionName', {}],
  ['parallel process name', 'map-parallel-process', 'processName', {}],
  ['transfer hook map id', 'map-transfer-hook', 'filterMapId', {}],
  ['sprite class name', 'sprite-custom-class', 'spriteName', {}],
  ['frame animation sprite name', 'sprite-frame-animation', 'spriteName', {}],
  ['actor property name', 'actor-custom-property', 'propertyName', {}],
  ['battle state id', 'battle-state-hook', 'stateId', {}],
  ['note tag name', 'database-ext-notetag', 'tagName', {}],
  ['text code escape character', 'message-custom-text-code', 'escapeChar', {}],
  ['plugin command name', 'plugin-command-basic', 'commandName', {}],
  ['async command name', 'plugin-command-async', 'commandName', {}],
  ['validated command name', 'plugin-command-validated', 'commandName', {}],
  ['save data name', 'save-load-basic', 'dataName', {}],
  ['damage modifier value', 'battle-damage-modifier', 'modifyValue', { modifyType: 'multiply' }],
  ['note tag boolean default', 'database-ext-notetag', 'defaultValue', { valueType: 'boolean' }],
  ['note tag array default', 'database-ext-notetag', 'defaultValue', { valueType: 'array' }],
  ['save data object default', 'save-load-basic', 'defaultValue', { dataType: 'object' }],
  ['save data array default', 'save-load-basic', 'defaultValue', { dataType: 'array' }],
  ['save data boolean default', 'save-load-basic', 'defaultValue', { dataType: 'boolean' }]
]

const WRONG_VALUES: [label: string, value: unknown][] = [
  ['42', 42],
  ['an array', ['a', 'b']],
  ['true', true]
]

// Whether a value already has the field's declared type, so it is no wrong value for that field.
const isOwnType = (field: TemplateField, value: unknown): boolean =>
  (field.type === 'number' && typeof value === 'number') ||
  (field.type === 'boolean' && typeof value === 'boolean')

interface TypeCheck {
  id: string
  field: TemplateField
  label: string
  value: unknown
}

// Every template field paired with each value of another type than the field declares.
const sweep = (): TypeCheck[] =>
  templateIds().flatMap((id) =>
    fieldsOf(id).flatMap((field) =>
      WRONG_VALUES.filter(([, value]) => !isOwnType(field, value)).map(([label, value]) => ({
        id,
        field,
        label,
        value
      }))
    )
  )

// What is wrong with one check's result; undefined when the field's type error is its only one.
function problemOf({ id, field, label, value }: TypeCheck): string | undefined {
  const name = `${id}.${field.id}=${label}`
  try {
    const result = validateTemplateValues(id, { ...baseValues(id), [field.id]: value })
    const found = typeErrors(id, result.errors)
    const isRejected = !result.valid && found.length === 1 && found[0] === typeError(field)
    return isRejected ? undefined : `${name}: ${JSON.stringify(result)}`
  } catch (error) {
    return `${name}: threw ${String(error)}`
  }
}

describe('template values of the wrong type', () => {
  it.each(SITES)('%s is listed as a type error, not thrown', (_site, id, fieldId, context) => {
    const field = fieldOf(id, fieldId)
    const values = { ...baseValues(id), ...context, [fieldId]: 42 }

    expect(() => validateTemplateValues(id, values)).not.toThrow()

    const result = validateTemplateValues(id, values)

    expect(result.valid).toBe(false)
    expect(typeErrors(id, result.errors)).toStrictEqual([typeError(field)])
  })

  it('rejects every field holding a value of another type, once, without throwing', () => {
    const checks = sweep()
    const problems = checks.map((check) => problemOf(check)).filter((p) => p !== undefined)
    process.stdout.write(`type checks run ${String(checks.length)}\n`)

    expect(checks.length).toBeGreaterThan(0)
    expect(problems).toStrictEqual([])
  })

  it('lists no type error for the values the dialog seeds', () => {
    const rejected: string[] = []
    for (const id of templateIds()) {
      for (const [label, values] of [
        ['base values', baseValues(id)],
        ['defaults', getTemplateDefaults(id)]
      ] as const) {
        const found = typeErrors(id, validateTemplateValues(id, values).errors)
        if (found.length > 0) rejected.push(`${id} ${label}: ${found.join(' | ')}`)
      }
    }

    expect(rejected).toStrictEqual([])
  })

  it('lists a required field whose saved number came back from JSON as null as required', () => {
    // JSON writes a number that is not a number as null
    const lost: unknown = JSON.parse('null')
    const unnamed: string[] = []
    let checked = 0
    for (const id of templateIds()) {
      for (const field of fieldsOf(id)) {
        if (field.required !== true) continue
        checked++
        const values = { ...baseValues(id), [field.id]: lost }
        const errors = validateTemplateValues(id, values).errors
        if (!errors.includes(`Field "${field.label}" is required`))
          unnamed.push(`${id}.${field.id}`)
      }
    }
    process.stdout.write(`required fields checked with a lost value ${String(checked)}\n`)

    expect(checked).toBeGreaterThan(0)
    expect(unnamed).toStrictEqual([])
  })
})
