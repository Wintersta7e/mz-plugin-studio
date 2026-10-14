// Plugin definitions whose generated plugin and every export format are pinned: full coverage
// of parameter types and metadata, a fixed fixture, one entry per known output defect, and
// definitions with hostile text in every string field.
import {
  generateCommandSkeleton,
  generateHeaderOnly,
  generateParameterComment,
  generateRawMode,
  validatePlugin
} from '../../../src/renderer/src/lib/generator/index'
import {
  generateHelpText,
  generatePluginsJsonEntry,
  generateReadme,
  generateTypeDeclaration
} from '../../../src/renderer/src/lib/exportFormats'
import { serializeParams } from '../../../src/renderer/src/lib/param-io'
import { ALL_PARAM_TYPES } from '../../../src/shared/types/plugin'
import type { ParamType, PluginDefinition, PluginParameter } from '../../../src/shared/types/plugin'
import { COMMENT_PAYLOADS } from '../../helpers/hostile'
import { oneLine } from './normalise'

/** Every property required, through nested objects and array items. */
export type HostileComplete<T> = T extends (infer U)[]
  ? HostileComplete<U>[]
  : T extends object
    ? { [K in keyof T]-?: HostileComplete<T[K]> }
    : T

// codeBody, customCode and rawSource are emitted as code by design and are the round-trip
// surface, so a payload there says nothing about escaping.
export type HostileDefinition = HostileComplete<
  Omit<PluginDefinition, 'codeBody' | 'customCode' | 'rawSource'>
>

export interface GeneratorEntry {
  name: string
  def: PluginDefinition
}

function hostileParameter(
  payload: string,
  type: ParamType,
  name = payload
): HostileComplete<PluginParameter> {
  return {
    id: name,
    name,
    text: `Text ${payload}`,
    desc: payload,
    type,
    default: payload,
    min: 1,
    max: 10,
    decimals: 0,
    options: [{ value: `Value ${payload}`, text: `Option ${payload}` }],
    structType: payload,
    arrayType: 'string',
    dir: payload,
    require: true,
    parent: payload,
    rawType: payload,
    onLabel: payload,
    offLabel: payload
  }
}

/**
 * One of everything, every string leaf carrying `payload` except a parameter's `type` and
 * `arrayType`. Each `text` differs from its `name` and each option `value` from its `text`,
 * because the generator emits `@text` and `@value` only then. The parameter slots use
 * different types so that each type-specific annotation is emitted somewhere; the command
 * has a second argument because only a select or combo argument emits its options.
 */
export function hostileDefinition(payload: string): HostileDefinition {
  return {
    id: payload,
    meta: {
      name: payload,
      version: payload,
      author: payload,
      description: payload,
      help: payload,
      url: payload,
      target: payload,
      dependencies: [payload],
      orderAfter: [payload],
      orderBefore: [payload],
      noteParams: [{ name: payload, type: payload, dir: payload, data: payload, require: true }],
      requiredAssets: [payload],
      localizations: { ja: { description: payload, help: payload } }
    },
    parameters: [hostileParameter(payload, 'select')],
    commands: [
      {
        id: payload,
        name: payload,
        text: `Text ${payload}`,
        desc: payload,
        args: [
          hostileParameter(payload, 'boolean'),
          hostileParameter(payload, 'combo', `Combo${payload}`)
        ]
      }
    ],
    structs: [{ id: payload, name: payload, parameters: [hostileParameter(payload, 'file')] }]
  }
}

const PARAMETER_LISTS = new Set(['parameters', 'args'])
const EXEMPT_KEYS = new Set(['type', 'arrayType'])

/** Counts string leaves, and those carrying `payload`; a parameter's type keys are exempt. */
export function countHostileLeaves(
  def: unknown,
  payload: string
): { holding: number; total: number } {
  const counts = { holding: 0, total: 0 }
  const visit = (value: unknown, key: string): void => {
    if (typeof value === 'string') {
      counts.total++
      if (value.includes(payload)) counts.holding++
    } else if (Array.isArray(value)) {
      for (const item of value) visit(item, key)
    } else if (typeof value === 'object' && value !== null) {
      const parameter = PARAMETER_LISTS.has(key)
      for (const [k, v] of Object.entries(value)) {
        if (!(parameter && EXEMPT_KEYS.has(k))) visit(v, k)
      }
    }
  }
  visit(def, '')
  return counts
}

// --- Full coverage ---------------------------------------------------------------------

function typedParameter(type: ParamType, prefix: string): PluginParameter {
  const param: PluginParameter = {
    id: `${prefix}-${type}`,
    name: `${prefix}_${type}`,
    text: `${prefix} ${type}`,
    desc: `A ${type} value.`,
    type,
    default: ''
  }
  switch (type) {
    case 'number':
      return { ...param, default: 3, min: 0, max: 10, decimals: 1 }
    case 'boolean':
      return { ...param, default: true, onLabel: 'Yes', offLabel: 'No' }
    case 'select':
    case 'combo':
      return {
        ...param,
        default: 'first',
        options: [
          { value: 'first', text: 'First' },
          { value: 'second', text: 'Second' }
        ]
      }
    case 'struct':
      return { ...param, structType: 'T', default: '{"x":"1"}' }
    case 'array':
      return { ...param, arrayType: 'number', default: '["1","2"]' }
    case 'file':
      return { ...param, dir: 'img/pictures/', default: 'Fixture_Picture' }
    case 'string':
    case 'note':
    case 'text':
    case 'hidden':
    case 'color':
    case 'location':
      return { ...param, default: type === 'note' ? '"Line"' : '' }
    default:
      return { ...param, default: 1 }
  }
}

const TYPES = [...ALL_PARAM_TYPES] as ParamType[]

const allParamTypes: PluginDefinition = {
  id: 'all-param-types',
  meta: {
    name: 'Fixture_AllParamTypes',
    version: '1.0.0',
    author: 'Example Author',
    description: 'Every parameter type',
    help: 'One parameter, struct field and command argument of each type.',
    url: 'https://example.invalid/all-param-types',
    target: 'MZ',
    dependencies: []
  },
  parameters: TYPES.map((type) => typedParameter(type, 'param')),
  commands: [
    {
      id: 'cmd',
      name: 'cmd',
      text: 'Command',
      desc: 'Takes one argument of each type.',
      args: TYPES.map((type) => typedParameter(type, 'arg'))
    }
  ],
  structs: [
    { id: 'S', name: 'S', parameters: TYPES.map((type) => typedParameter(type, 'field')) },
    {
      id: 'T',
      name: 'T',
      parameters: [{ id: 'x', name: 'x', text: 'X', desc: '', type: 'number', default: 0 }]
    }
  ]
}

const metaFull: PluginDefinition = {
  id: 'meta-full',
  meta: {
    name: 'Fixture_MetaFull',
    version: '2.1.0',
    author: 'Example Author',
    description: 'Every metadata field',
    help: 'First help line.\nSecond help line.',
    url: 'https://example.invalid/meta-full',
    target: 'MZ',
    dependencies: ['Fixture_Base'],
    orderAfter: ['Fixture_Before'],
    orderBefore: ['Fixture_After'],
    noteParams: [
      { name: 'Portrait', type: 'file', dir: 'img/pictures/', data: 'actors', require: true }
    ],
    requiredAssets: ['img/pictures/Fixture_Asset'],
    localizations: { ja: { description: '説明', help: 'ヘルプの一行目\nヘルプの二行目' } }
  },
  parameters: [],
  commands: [],
  structs: []
}

// The definition Fixture_Generated.js was written from; the two must stay byte-identical.
const fixtureGenerated: PluginDefinition = {
  id: 'fixture-generated',
  meta: {
    name: 'Fixture_Generated',
    version: '1.0.0',
    author: 'Example Author',
    description: 'Generated fixture plugin',
    help: 'Generated from a fixed definition.',
    url: 'https://example.invalid/fixture-generated',
    target: 'MZ',
    dependencies: []
  },
  parameters: [
    {
      id: 'speed',
      name: 'Speed',
      text: 'Speed',
      desc: 'Frames between two updates.',
      type: 'number',
      default: 5,
      min: 1,
      max: 10
    },
    {
      id: 'label',
      name: 'Label',
      text: 'Label',
      desc: 'Text to show.',
      type: 'string',
      default: 'Hello'
    },
    {
      id: 'points',
      name: 'Points',
      text: 'Points',
      desc: 'Positions to visit.',
      type: 'array',
      arrayType: 'struct',
      structType: 'Point',
      default: '[]'
    }
  ],
  commands: [
    {
      id: 'show-label',
      name: 'ShowLabel',
      text: 'Show Label',
      desc: 'Shows the label.',
      args: [
        {
          id: 'times',
          name: 'times',
          text: 'Times',
          desc: 'How often the label is shown.',
          type: 'number',
          default: 1
        }
      ]
    }
  ],
  structs: [
    {
      id: 'point',
      name: 'Point',
      parameters: [
        { id: 'x', name: 'x', text: 'X', desc: '', type: 'number', default: 0 },
        { id: 'y', name: 'y', text: 'Y', desc: '', type: 'number', default: 0 }
      ]
    }
  ]
}

// --- Known output defects: one field changed on a small definition ---------------------

function rowBase(): PluginDefinition {
  return {
    id: 'output-rows',
    meta: {
      name: 'Fixture_Rows',
      version: '1.0.0',
      author: 'Example Author',
      description: 'Output rows',
      help: '',
      url: 'https://example.invalid/rows',
      target: 'MZ',
      dependencies: []
    },
    parameters: [
      {
        id: 'label',
        name: 'Label',
        text: 'Label',
        desc: 'Text to show.',
        type: 'string',
        default: 'Hello'
      },
      {
        id: 'pair',
        name: 'Pair',
        text: 'Pair',
        desc: 'Two values.',
        type: 'struct',
        structType: 'Pair',
        default: '{"a":"b"}'
      }
    ],
    commands: [{ id: 'show', name: 'Show', text: 'Show', desc: 'Shows the label.', args: [] }],
    structs: [
      {
        id: 'pair',
        name: 'Pair',
        parameters: [{ id: 'a', name: 'a', text: 'A', desc: '', type: 'string', default: '' }]
      }
    ]
  }
}

function row(name: string, change: (def: PluginDefinition) => void): GeneratorEntry {
  const def = rowBase()
  change(def)
  return { name, def }
}

export const GENERATOR_ENTRIES: GeneratorEntry[] = [
  { name: 'all-param-types', def: allParamTypes },
  { name: 'meta-full', def: metaFull },
  { name: 'fixture-generated', def: fixtureGenerated },
  row('desc-block-comment', (def) => {
    def.meta.description = 'a */ b'
  }),
  row('param-desc-block-comment', (def) => {
    def.parameters[0].desc = 'x */ y'
  }),
  row('struct-default-block-comment', (def) => {
    def.parameters[1].default = '{"a":"*/"}'
  }),
  row('command-name-u2028', (def) => {
    def.commands[0].name = 'A\u2028B'
  }),
  row('param-name-lf', (def) => {
    def.parameters[0].name = 'a\nb'
  }),
  row('dts-description-block-comment', (def) => {
    def.parameters[0].desc = 'x */ declare const injected: 1; /* y'
  }),
  row('localization-key-comment', (def) => {
    def.meta.localizations = { 'ja */ x': { description: 'Localized description' } }
  }),
  ...COMMENT_PAYLOADS.map((p) => ({ name: `hostile-${p.name}`, def: hostileDefinition(p.text) })),
  { name: 'hostile-control', def: hostileDefinition('Safe') }
]

// A header-only source, so raw mode regenerates the annotation block around nothing else.
const HEADER_ONLY_SOURCE = '/*:\n * @target MZ\n */\n'

/** Every export format of one entry, one `// ==== case:` section each. */
export function renderExports(entry: GeneratorEntry): string {
  const { def } = entry
  const sections: [string, string][] = [
    ['generatePluginsJsonEntry', generatePluginsJsonEntry(def)],
    ['generateTypeDeclaration', generateTypeDeclaration(def)],
    ['generateReadme', generateReadme(def)],
    ['generateHelpText', generateHelpText(def)],
    ['serializeParams', serializeParams(def.parameters, def.meta.name)],
    ['generateHeaderOnly', generateHeaderOnly(def)],
    ...def.commands.map((c): [string, string] => [
      `generateCommandSkeleton ${c.name}`,
      generateCommandSkeleton(c)
    ]),
    ...def.parameters.map((p): [string, string] => [
      `generateParameterComment ${p.name}`,
      generateParameterComment(p)
    ]),
    ['validatePlugin', JSON.stringify(validatePlugin(def), null, 2)]
  ]
  if (entry.name.startsWith('hostile-')) {
    sections.push(['generateRawMode', generateRawMode({ ...def, rawSource: HEADER_ONLY_SOURCE })])
  }
  return (
    sections.map(([title, text]) => `// ==== case: ${oneLine(title)}\n${text}`).join('\n\n') + '\n'
  )
}
