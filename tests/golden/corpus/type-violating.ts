// Inputs of the wrong type, pinned before strictness edits change how the code that reads them
// is typed: template values of another JavaScript type than the field declares, `null` and
// arrays in every field, and parameter files whose defaults are not the declared type.
import {
  getTemplate,
  type TemplateField
} from '../../../src/renderer/src/lib/generator/templates/index'
import { baseValues, type TemplateCase } from './templates'

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

// A wrong-typed or null value in some fields, the base values in the rest. The three cases of
// every template stop at the first field read, so these reach the branches and checks after it.
const PARTIAL_CASES: Record<string, Record<string, unknown>[]> = {
  'custom-window-basic': [
    { width: null },
    { parentClass: 7, width: 'abc', height: null, addToScene: 'Scene_Map' },
    { parentClass: 'Window_Command', width: ['a', 'b'], addToScene: 'Scene_Menu' }
  ],
  'gauge-window': [
    { gaugeCount: '3', dataSource: 'variable', width: null, gaugeHeight: null },
    { gaugeCount: 3, positionX: 'abc', gaugeHeight: ['a', 'b'] },
    { gaugeCount: '3', gauge3Color2: 7 }
  ],
  'hud-overlay-window': [
    { positionY: null, opacity: null },
    { positionX: 'abc', width: ['a', 'b'], opacity: 'x' }
  ],
  'menu-command-addition': [
    { enableCondition: 'switch', switchId: null },
    { requiresActor: 'yes', enableCondition: 'switch', switchId: 'abc' }
  ],
  'menu-custom-scene': [{ includeHelp: null }],
  'menu-options-addition': [
    { persistToConfig: null },
    { optionType: 'volume', defaultValue: 42 },
    { optionType: 'volume', defaultValue: '50', persistToConfig: null },
    { optionType: 'select', defaultValue: 42, choices: null },
    { optionType: 'select', choices: 'Low, High', persistToConfig: null },
    { optionType: 'select', choices: 42 }
  ],
  'menu-title-mod': [{ modType: 'hideCommand', hideTarget: 7 }, { commandName: null }],
  'popup-notification-window': [
    { defaultDuration: null, height: null },
    { defaultDuration: 'abc', width: ['a', 'b'], position: 'center' },
    { height: 'abc', position: 'bottom' },
    { textColor: 7 }
  ]
}

const partialCaseName = (changes: Record<string, unknown>): string =>
  Object.entries(changes)
    .map(([field, value]) => `${field}=${JSON.stringify(value)}`)
    .join(',')

// The type-violating cases of one template, pinned in a golden file of their own.
export function typeViolatingTemplateCases(id: string): TemplateCase[] {
  return [
    {
      name: 'type-violating: wrong types',
      values: everyField(id, (field) => WRONG_TYPE[field.type]),
      hostile: null
    },
    { name: 'type-violating: null', values: everyField(id, () => null), hostile: null },
    { name: 'type-violating: arrays', values: everyField(id, () => ['a', 'b']), hostile: null },
    ...(PARTIAL_CASES[id] ?? []).map((changes) => ({
      name: `type-violating: ${partialCaseName(changes)}`,
      values: { ...baseValues(id), ...changes },
      hostile: null
    }))
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
