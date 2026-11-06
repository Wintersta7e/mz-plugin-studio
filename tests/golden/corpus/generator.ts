// Plugin definitions whose generated plugin and every export format are pinned: full coverage
// of parameter types and metadata, a fixed fixture, one entry per known output defect, and
// definitions with hostile text in every string field.
import {
  generateCommandSkeleton,
  generateHeaderOnly,
  generateParameterComment,
  generatePlugin,
  generateRawMode,
  validatePlugin
} from '../../../src/renderer/src/lib/generator/index'
import {
  generateHelpText,
  generatePluginsJsonEntry,
  generateReadme,
  generateTypeDeclaration
} from '../../../src/renderer/src/lib/exportFormats'
import { deserializeParams, serializeParams } from '../../../src/renderer/src/lib/param-io'
import {
  fileNameMismatch,
  generatePluginOutput,
  isRawMode
} from '../../../src/renderer/src/lib/plugin-output'
import { PluginParser } from '../../../src/main/services/pluginParser'
import {
  ALL_PARAM_TYPES,
  toBaseline,
  type ParamType,
  type PluginDefinition,
  type PluginParameter
} from '../../../src/shared/types/plugin'
import { COMMENT_PAYLOADS } from '../../helpers/hostile'
import { oneLine } from './normalise'

/**
Every property required, through nested objects and array items.
*/
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
One of everything, every string leaf carrying `payload` except a parameter's `type` and
`arrayType`. Each `text` differs from its `name` and each option `value` from its `text`,
because the generator emits `@text` and `@value` only then. The parameter slots use
different types so that each type-specific annotation is emitted somewhere; the command
has a second argument because only a select or combo argument emits its options.
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
    structs: [{ id: payload, name: payload, parameters: [hostileParameter(payload, 'file')] }],
    importedFrom: payload
  }
}

const PARAMETER_LISTS = new Set(['parameters', 'args'])
const EXEMPT_KEYS = new Set(['type', 'arrayType'])

/**
Counts string leaves, and those carrying `payload`; a parameter's type keys are exempt.
*/
export function countHostileLeaves(
  definition: unknown,
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
      const isParameter = PARAMETER_LISTS.has(key)
      for (const [k, v] of Object.entries(value)) {
        if (!(isParameter && EXEMPT_KEYS.has(k))) visit(v, k)
      }
    }
  }
  visit(definition, '')
  return counts
}

// --- Full coverage ---------------------------------------------------------------------

// What each type sets beyond the shared fields; a database type not listed takes the default 1.
const TYPED_FIELDS: Partial<Record<ParamType, Partial<PluginParameter>>> = {
  number: { default: 3, min: 0, max: 10, decimals: 1 },
  boolean: { default: true, onLabel: 'Yes', offLabel: 'No' },
  select: {
    default: 'first',
    options: [
      { value: 'first', text: 'First' },
      { value: 'second', text: 'Second' }
    ]
  },
  combo: {
    default: 'first',
    options: [
      { value: 'first', text: 'First' },
      { value: 'second', text: 'Second' }
    ]
  },
  struct: { structType: 'T', default: '{"x":"1"}' },
  array: { arrayType: 'number', default: '["1","2"]' },
  file: { dir: 'img/pictures/', default: 'Fixture_Picture' },
  string: { default: '' },
  note: { default: '"Line"' },
  text: { default: '' },
  hidden: { default: '' },
  color: { default: '' },
  location: { default: '' }
}

function typedParameter(type: ParamType, prefix: string): PluginParameter {
  const param: PluginParameter = {
    id: `${prefix}-${type}`,
    name: `${prefix}_${type}`,
    text: `${prefix} ${type}`,
    desc: `A ${type} value.`,
    type,
    default: ''
  }
  return { ...param, ...structuredClone(TYPED_FIELDS[type] ?? { default: 1 }) }
}

const TYPES = [...ALL_PARAM_TYPES].filter((type): type is ParamType => ALL_PARAM_TYPES.has(type))

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

// --- A loaded plugin holding parameters of the wrong type --------------------------------

// Not an identifier, so a declaration file repairs it into a namespace name.
const LOADED_NAME = 'Fixture-Loaded'

const LOADED_SOURCE = [
  '/*:',
  ' * @target MZ',
  ' * @plugindesc Holds imported parameters of the wrong type',
  ' * @author Example Author',
  ' * @url https://example.invalid/loaded',
  ' * @base Fixture_Base',
  ' * @orderAfter Fixture_Core',
  ' * @help Shows the label after the base plugin.',
  ' *',
  ' * @command Reset',
  ' * @text Reset Label',
  ' * @desc Clears the label.',
  ' *',
  ' * @command ShowLabel',
  ' * @text Show Label',
  ' * @desc Shows the label.',
  ' *',
  ' * @arg times',
  ' * @text Times',
  ' * @desc How often the label is shown.',
  ' * @type number',
  ' * @default 1',
  ' *',
  ' * @arg note',
  ' * @type string',
  ' */',
  '/*~struct~Point:',
  ' * @param x',
  ' * @type number',
  ' * @default 0',
  ' */',
  ''
].join('\n')

// Labels and descriptions of the wrong type, which the import replaces, every type annotation
// the formats spell out, a nested parameter and a divider.
const LOADED_PARAMETER_FILE = JSON.stringify({
  version: 1,
  source: LOADED_NAME,
  parameters: [
    { name: 'Label', text: 'Label', desc: 'Text to show.', type: 'string', default: 'Hello' },
    {
      name: 'Count',
      text: 'Count',
      desc: 7,
      type: 'number',
      default: 7,
      min: 0,
      max: 10,
      decimals: 2
    },
    { name: 'Enabled', text: 0, desc: 'Whether it shows.', type: 'boolean', default: true },
    { name: 'Empty', text: 'Empty', desc: 'No default.', type: 'string', default: '' },
    {
      name: 'Pair',
      text: 'Pair',
      desc: 'One point.',
      type: 'struct',
      structType: 'Point',
      default: '{"x":"1"}'
    },
    {
      name: 'Points',
      text: 'Points',
      desc: 'Some points.',
      type: 'array',
      arrayType: 'struct',
      structType: 'Point',
      default: '[]'
    },
    {
      name: 'Ids',
      text: 'Ids',
      desc: 'Some ids.',
      type: 'array',
      arrayType: 'number',
      default: '["1","2"]'
    },
    { name: 'Items', text: 'Items', desc: 'Any values.', type: 'array', default: '[]' },
    {
      name: 'Child',
      text: 'Child',
      desc: 'Nested.',
      type: 'string',
      default: 'x',
      parent: 'Label'
    },
    { name: '--- Section ---', text: '--- Section ---', desc: '', type: 'string', default: '' }
  ]
})

/**
The plugin file as opened, holding the parameters the import path kept of the file above.
*/
function loadedEntry(): GeneratorEntry {
  const imported = deserializeParams(LOADED_PARAMETER_FILE)
  if (!imported.success) throw new Error(`parameter file refused: ${imported.reason}`)
  const opened = PluginParser.parsePlugin(LOADED_SOURCE, `${LOADED_NAME}.js`)
  // The import path gives each parameter a random id; a golden needs a fixed one
  const parameters = imported.parameters.map((parameter, index) => ({
    ...parameter,
    id: `imported-${String(index)}`
  }))
  return {
    name: 'type-violating-loaded',
    def: { ...opened, id: 'loaded', importedFrom: `${LOADED_NAME}.js`, parameters }
  }
}

/**
What a save decides for a loaded plugin: whether raw mode is on, what it writes, and what a file
name that is not the plugin's costs it.
*/
function saveSections(definition: PluginDefinition): [string, string][] {
  const unloaded = { ...definition, rawSource: '' }
  const outputs: [string, ReturnType<typeof generatePluginOutput>][] = [
    ['file loaded', generatePluginOutput(definition, true, toBaseline(definition))],
    ['file not loaded', generatePluginOutput(unloaded, true, toBaseline(unloaded))]
  ]
  const choices = [true, false, undefined].map(
    (choice) =>
      `${String(choice)}: imported ${String(isRawMode(definition, choice))}, ` +
      `created ${String(isRawMode({}, choice))}`
  )
  // Regenerated code quotes the plugin's name, so the check goes on to the file name
  const code = generatePlugin(definition)
  const mismatches = [`${LOADED_NAME}.js`, `${LOADED_NAME.toLowerCase()}.js`, 'Other.js'].map(
    (file) => {
      const mismatch = fileNameMismatch(definition, `js/plugins/${file}`, code)
      return `${file}: ${JSON.stringify(mismatch)}`
    }
  )
  return [
    ...outputs.map(([title, output]): [string, string] => [
      `generatePluginOutput raw, ${title}`,
      output.ok ? output.code : `refused ${output.refusal}: ${output.message}`
    ]),
    ['isRawMode', choices.join('\n')],
    ['fileNameMismatch', mismatches.join('\n')]
  ]
}

// The item at `index`, which every row's base definition holds
function itemAt<T>(items: readonly T[], index: number): T {
  const item = items.at(index)
  if (item === undefined) throw new Error(`no item at ${String(index)}`)
  return item
}

function row(name: string, change: (definition: PluginDefinition) => void): GeneratorEntry {
  const definition = rowBase()
  change(definition)
  return { name, def: definition }
}

export const GENERATOR_ENTRIES: GeneratorEntry[] = [
  { name: 'all-param-types', def: allParamTypes },
  { name: 'meta-full', def: metaFull },
  { name: 'fixture-generated', def: fixtureGenerated },
  row('desc-block-comment', (definition) => {
    definition.meta.description = 'a */ b'
  }),
  row('param-desc-block-comment', (definition) => {
    itemAt(definition.parameters, 0).desc = 'x */ y'
  }),
  row('struct-default-block-comment', (definition) => {
    itemAt(definition.parameters, 1).default = '{"a":"*/"}'
  }),
  row('command-name-u2028', (definition) => {
    itemAt(definition.commands, 0).name = 'A\u{2028}B'
  }),
  row('param-name-lf', (definition) => {
    itemAt(definition.parameters, 0).name = 'a\nb'
  }),
  row('default-lf', (definition) => {
    itemAt(definition.parameters, 0).default = 'l1\nl2'
  }),
  row('desc-lf', (definition) => {
    itemAt(definition.parameters, 0).desc = 'd1\nd2'
    itemAt(definition.commands, 0).text = 't1\nt2'
  }),
  row('help-tag-line', (definition) => {
    definition.meta.help = 'Usage:\n@param injected\n@type number\nEnd'
  }),
  row('dts-description-block-comment', (definition) => {
    itemAt(definition.parameters, 0).desc = 'x */ declare const injected: 1; /* y'
  }),
  row('localization-key-comment', (definition) => {
    definition.meta.localizations = { 'ja */ x': { description: 'Localized description' } }
  }),
  row('custom-code', (definition) => {
    definition.customCode = 'const rate = 2\n\nfunction scaled(value) {\n  return value * rate\n}'
  }),
  ...COMMENT_PAYLOADS.map((p) => ({ name: `hostile-${p.name}`, def: hostileDefinition(p.text) })),
  { name: 'hostile-control', def: hostileDefinition('Safe') },
  loadedEntry()
]

// A header-only source, so raw mode regenerates the annotation block around nothing else.
const HEADER_ONLY_SOURCE = '/*:\n * @target MZ\n */\n'

/**
An opened HEADER_ONLY_SOURCE file whose code already handled the parameters and commands.
*/
function headerOnlyRawMode(definition: PluginDefinition): string {
  const opened = PluginParser.parsePlugin(HEADER_ONLY_SOURCE, `${definition.meta.name}.js`)
  const baseline = { ...toBaseline(definition), meta: opened.meta, structs: [] }
  return generateRawMode({ ...definition, rawSource: HEADER_ONLY_SOURCE }, baseline)
}

/**
Every export format of one entry, one `// ==== case:` section each.
*/
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
    sections.push(['generateRawMode', headerOnlyRawMode(def)])
  }
  if (entry.name.startsWith('type-violating-')) {
    sections.push(...saveSections(def))
  }
  return (
    sections.map(([title, text]) => `// ==== case: ${oneLine(title)}\n${text}`).join('\n\n') + '\n'
  )
}
