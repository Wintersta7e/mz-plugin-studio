// Text typed into any field of a plugin definition, followed to where it lands in the generated
// plugin. Each field is written with hostile text into an otherwise clean definition, and the
// output is compiled and run in a sealed context that reports whether the text ran as code.
import { describe, it, expect } from 'vitest'
import {
  generateCommandSkeleton,
  generateParameterComment,
  generatePlugin,
  generateRawMode,
  validatePlugin
} from '../../src/renderer/src/lib/generator/index'
import { parameterConstant } from '../helpers/generated-names'
import {
  toBaseline,
  type LocalizedContent,
  type NoteParam,
  type PluginCommand,
  type PluginDefinition,
  type PluginMeta,
  type PluginParameter,
  type PluginStruct,
  type SelectOption
} from '../../src/shared/types/plugin'
import { evaluatePlugin, type EvaluationResult } from '../helpers/evaluate-plugin'
import {
  ALL_PAYLOADS,
  COMMENT_PAYLOADS,
  PREFIX_PAYLOADS,
  SENTINEL,
  type Payload
} from '../helpers/hostile'
import { contextsOf, isContained } from '../helpers/js-context'

const INJECTED = `globalThis.${SENTINEL}`

type Outcome = 'clean' | 'does not compile' | 'runs the text' | 'throws'

function outcomeOf(result: EvaluationResult): Outcome {
  if (result.compileProblem !== null) return 'does not compile'
  if (result.sentinel) return 'runs the text'
  return result.threw === null ? 'clean' : 'throws'
}

describe('js-context', () => {
  it('names the context each occurrence of the needle starts in', () => {
    const sources = [
      '// a NEEDLE\nb()',
      'a(/* NEEDLE */)',
      "const a = 'x NEEDLE'",
      'const a = `x NEEDLE`',
      'const NEEDLE = 1',
      '/* NEEDLE */ NEEDLE()'
    ]

    expect(sources.map((source) => contextsOf(source, 'NEEDLE'))).toStrictEqual([
      ['line-comment'],
      ['block-comment'],
      ['single-quote'],
      ['template-literal'],
      ['code'],
      ['block-comment', 'code']
    ])
    expect([
      isContained('// NEEDLE\nconst a = "NEEDLE"', 'NEEDLE'),
      isContained('/* x */ NEEDLE /* y */', 'NEEDLE')
    ]).toStrictEqual([true, false])
  })
})

type Setter<T> = (target: T, text: string) => void
/**
A string key's setter, or why the key holds no text of its own.
*/
type FieldUse<T> = Setter<T> | 'not-string' | { code: string }

const definitionFields = {
  id: (d, t) => {
    d.id = t
  },
  meta: 'not-string',
  parameters: 'not-string',
  commands: 'not-string',
  structs: 'not-string',
  codeBody: { code: 'the kept body of an imported plugin is written as code by design' },
  customCode: { code: "the user's own code is written as code by design" },
  rawSource: { code: 'raw mode edits the imported file in place' },
  importedFrom: (d, t) => {
    d.importedFrom = t
  }
} satisfies Record<keyof PluginDefinition, FieldUse<PluginDefinition>>

const metaFields = {
  name: (m, t) => {
    m.name = t
  },
  version: (m, t) => {
    m.version = t
  },
  author: (m, t) => {
    m.author = t
  },
  description: (m, t) => {
    m.description = t
  },
  help: (m, t) => {
    m.help = t
  },
  url: (m, t) => {
    m.url = t
  },
  target: (m, t) => {
    m.target = t
  },
  dependencies: (m, t) => {
    m.dependencies = [t]
  },
  orderAfter: (m, t) => {
    m.orderAfter = [t]
  },
  orderBefore: (m, t) => {
    m.orderBefore = [t]
  },
  noteParams: 'not-string',
  requiredAssets: (m, t) => {
    m.requiredAssets = [t]
  },
  localizations: 'not-string'
} satisfies Record<keyof PluginMeta, FieldUse<PluginMeta>>

const noteParamFields = {
  name: (n, t) => {
    n.name = t
  },
  type: (n, t) => {
    n.type = t
  },
  dir: (n, t) => {
    n.dir = t
  },
  data: (n, t) => {
    n.data = t
  },
  require: 'not-string'
} satisfies Record<keyof NoteParam, FieldUse<NoteParam>>

// Setters give the parameter the type under which its key is emitted.
const parameterFields = {
  id: (p, t) => {
    p.id = t
  },
  name: (p, t) => {
    p.name = t
  },
  text: (p, t) => {
    p.text = t
  },
  desc: (p, t) => {
    p.desc = t
  },
  type: (p, t) => {
    // Raw text where the type says ParamType, as a file opened from disk can hold
    Object.assign(p, { type: t })
  },
  default: (p, t) => {
    p.default = t
  },
  min: 'not-string',
  max: 'not-string',
  decimals: 'not-string',
  options: 'not-string',
  structType: (p, t) => {
    p.type = 'struct'
    p.default = ''
    p.structType = t
  },
  arrayType: (p, t) => {
    p.type = 'array'
    p.default = ''
    Object.assign(p, { arrayType: t })
  },
  dir: (p, t) => {
    p.type = 'file'
    p.dir = t
  },
  require: 'not-string',
  parent: (p, t) => {
    p.parent = t
  },
  rawType: (p, t) => {
    p.rawType = t
  },
  onLabel: (p, t) => {
    p.type = 'boolean'
    p.onLabel = t
  },
  offLabel: (p, t) => {
    p.type = 'boolean'
    p.offLabel = t
  }
} satisfies Record<keyof PluginParameter, FieldUse<PluginParameter>>

const optionFields = {
  value: (o, t) => {
    o.value = t
  },
  text: (o, t) => {
    o.text = t
  }
} satisfies Record<keyof SelectOption, FieldUse<SelectOption>>

const commandFields = {
  id: (c, t) => {
    c.id = t
  },
  name: (c, t) => {
    c.name = t
  },
  text: (c, t) => {
    c.text = t
  },
  desc: (c, t) => {
    c.desc = t
  },
  args: 'not-string'
} satisfies Record<keyof PluginCommand, FieldUse<PluginCommand>>

const structFields = {
  id: (s, t) => {
    s.id = t
  },
  name: (s, t) => {
    s.name = t
  },
  parameters: 'not-string'
} satisfies Record<keyof PluginStruct, FieldUse<PluginStruct>>

const localizationFields = {
  description: (l, t) => {
    l.description = t
  },
  help: (l, t) => {
    l.help = t
  }
} satisfies Record<keyof LocalizedContent, FieldUse<LocalizedContent>>

function fixtureParameter(name: string): PluginParameter {
  return {
    id: name,
    name,
    text: `${name} label`,
    desc: `${name} description`,
    type: 'string',
    default: 'fixture'
  }
}

/**
A definition using every emitted annotation once, all text plain.
*/
function cleanDefinition(): PluginDefinition {
  return {
    id: 'fixture-matrix',
    meta: {
      name: 'Fixture_Matrix',
      version: '1.0.0',
      author: 'Fixture Author',
      description: 'Fixture description',
      help: 'Fixture help',
      url: 'https://example.invalid/fixture',
      target: 'MZ',
      dependencies: ['Fixture_Base'],
      orderAfter: ['Fixture_After'],
      orderBefore: ['Fixture_Before'],
      noteParams: [{ name: 'FixtureNote', type: 'file', dir: 'img/pictures/', data: 'actors' }],
      requiredAssets: ['img/pictures/Fixture_Asset'],
      localizations: { ja: { description: 'Fixture translation', help: 'Fixture translated help' } }
    },
    parameters: [fixtureParameter('FixtureParam')],
    commands: [
      {
        id: 'fixture-command',
        name: 'FixtureCommand',
        text: 'Fixture Command',
        desc: 'Fixture command description',
        args: [fixtureParameter('FixtureArg')]
      }
    ],
    structs: [
      {
        id: 'fixture-struct',
        name: 'FixtureStruct',
        parameters: [fixtureParameter('FixtureField')]
      }
    ]
  }
}

interface FieldRow {
  field: string
  set: (definition: PluginDefinition, text: string) => void
}

function rowsOf<T>(
  owner: string,
  fields: Record<string, FieldUse<T>>,
  target: (definition: PluginDefinition) => T
): FieldRow[] {
  return Object.entries(fields)
    .filter((entry): entry is [string, Setter<T>] => typeof entry[1] === 'function')
    .map(([key, setter]) => ({
      field: `${owner}.${key}`,
      set: (definition: PluginDefinition, text: string) => {
        setter(target(definition), text)
      }
    }))
}

/**
The option of a select parameter, so that both `@option` and `@value` are emitted.
*/
function optionOf(param: PluginParameter): SelectOption {
  const option = { value: 'fixture-value', text: 'Fixture option' }
  param.type = 'select'
  param.options = [option]
  return option
}

/**
The first item: the clean definition has one of each list the rows edit.
*/
function firstOf<T>(items: readonly T[]): T {
  const item = items.at(0)
  if (item === undefined) throw new Error('the clean definition lacks an item the test edits')
  return item
}

/**
The clean definition's `ja` localization.
*/
function japanese(definition: PluginDefinition): LocalizedContent {
  const content = new Map(Object.entries(definition.meta.localizations ?? {})).get('ja')
  if (content === undefined) throw new Error('the clean definition lacks its ja localization')
  return content
}

const PARAMETER_OWNERS: [string, (definition: PluginDefinition) => PluginParameter][] = [
  ['parameter', (definition) => firstOf(definition.parameters)],
  ['argument', (definition) => firstOf(firstOf(definition.commands).args)],
  ['struct field', (definition) => firstOf(firstOf(definition.structs).parameters)]
]

const FIELD_ROWS: FieldRow[] = [
  ...rowsOf('definition', definitionFields, (definition) => definition),
  ...rowsOf('meta', metaFields, (definition) => definition.meta),
  ...rowsOf('note param', noteParamFields, (definition) =>
    firstOf(definition.meta.noteParams ?? [])
  ),
  ...PARAMETER_OWNERS.flatMap(([owner, target]) => [
    ...rowsOf(owner, parameterFields, target),
    ...rowsOf(`${owner} option`, optionFields, (definition) => optionOf(target(definition)))
  ]),
  ...rowsOf('command', commandFields, (definition) => firstOf(definition.commands)),
  ...rowsOf('struct', structFields, (definition) => firstOf(definition.structs)),
  ...rowsOf('localization', localizationFields, (definition) => japanese(definition))
]

// An imported file: the clean definition's comment blocks and a body that reads the parameters
// but parses none. It was opened without parameters or commands, so raw mode rewrites the main
// block, adds one parsing line per parameter and registers each command.
function rawSource(): string {
  const generated = generatePlugin(cleanDefinition())
  return (
    generated.slice(0, generated.indexOf('(() => {')) +
    "(() => {\n    'use strict';\n\n    const PLUGIN_NAME = 'Fixture_Matrix';\n" +
    '    const params = PluginManager.parameters(PLUGIN_NAME);\n})();\n'
  )
}

const ENTRIES: [string, (definition: PluginDefinition) => string][] = [
  ['generatePlugin', (definition) => generatePlugin(definition)],
  [
    'generateRawMode',
    (definition) =>
      generateRawMode(
        { ...definition, rawSource: rawSource() },
        toBaseline({ ...definition, parameters: [], commands: [] })
      )
  ]
]

interface MatrixCase {
  label: string
  outcome: Outcome
  contained: boolean
}

function runMatrix(payloads: readonly Payload[] = ALL_PAYLOADS): MatrixCase[] {
  const cases: MatrixCase[] = []
  for (const row of FIELD_ROWS) {
    for (const payload of payloads) {
      for (const [entry, generate] of ENTRIES) {
        const definition = cleanDefinition()
        row.set(definition, payload.text)
        const code = generate(definition)
        cases.push({
          label: `${row.field} / ${payload.name} / ${entry}`,
          outcome: outcomeOf(evaluatePlugin(code, { mode: 'generator' })),
          contained: isContained(code, INJECTED)
        })
      }
    }
  }
  process.stdout.write(
    `injection matrix: fields ${String(FIELD_ROWS.length)}, payloads ${String(payloads.length)}, ` +
      `entries ${String(ENTRIES.length)}, cases ${String(cases.length)}\n`
  )
  return cases
}

// The matrix is CPU-bound by design: each of its 980 cases generates a plugin, then compiles and runs
// it in a fresh vm context. The context is never shared, so text one case injects cannot leak into the
// next case's containment check. Measured 957 ms alone, 1292 ms alone under coverage, 2.1-3.0 s inside
// the full check and over 5 s on a loaded host; 20 s is about six times the in-check cost.
const MATRIX_TIMEOUT_MS = 20_000

describe('generated plugin annotations', () => {
  it('field text stays inside the annotation comment', { timeout: MATRIX_TIMEOUT_MS }, () => {
    expect(FIELD_ROWS.length).toBeGreaterThan(0)

    const notClean = runMatrix().filter((c) => c.outcome !== 'clean' || !c.contained)

    expect(notClean.map((c) => c.label)).toStrictEqual([])
  })

  it(
    'field text that starts like a valid value stays inside the annotation comment',
    { timeout: MATRIX_TIMEOUT_MS },
    () => {
      const notClean: string[] = []
      for (const payload of PREFIX_PAYLOADS) {
        const cases = runMatrix([payload])
        const count = (outcome: Outcome): number =>
          cases.filter((c) => c.outcome === outcome).length
        process.stdout.write(
          `prefix payload ${payload.name}: cases ${String(cases.length)}, contained ` +
            `${String(cases.filter((c) => c.outcome === 'clean' && c.contained).length)}, ` +
            `does not compile ${String(count('does not compile'))}, ` +
            `throws ${String(count('throws'))}, ran ${String(count('runs the text'))}\n`
        )

        expect(cases.length).toBeGreaterThan(0)

        notClean.push(
          ...cases.filter((c) => c.outcome !== 'clean' || !c.contained).map((c) => c.label)
        )
      }

      expect(notClean).toStrictEqual([])
    }
  )
})

const LINE_BREAKS: [string, string][] = [
  ['lf', '\n'],
  ['crlf', '\r\n'],
  ['u2028', '\u{2028}'],
  ['u2029', '\u{2029}']
]

const SNIPPET_NAMES: { name: string; text: string }[] = [
  ...LINE_BREAKS.map(([name, lt]) => ({ name, text: `A${lt}${INJECTED} = 1; //` })),
  ...COMMENT_PAYLOADS
]

const SNIPPETS: [string, (name: string) => string][] = [
  [
    'generateCommandSkeleton',
    (name) => generateCommandSkeleton({ id: 'c', name, text: '', desc: '', args: [] })
  ],
  [
    'generateParameterComment',
    (name) =>
      generateParameterComment({ id: 'p', name, text: '', desc: '', type: 'string', default: '' })
  ]
]

function runSnippets(): Record<string, string> {
  const results: Record<string, string> = {}
  for (const [helper, generate] of SNIPPETS) {
    for (const { name, text } of SNIPPET_NAMES) {
      const output = generate(text)
      const result = evaluatePlugin(`const PLUGIN_NAME = 'Fixture';\n${output}`, {
        mode: 'generator'
      })
      const contained = isContained(output, INJECTED) ? 'contained' : 'not contained'
      results[`${helper} ${name}`] = `${outcomeOf(result)}, ${contained}`
    }
  }
  return results
}

describe('snippet comments', () => {
  it('snippet comments stay on one line', () => {
    const results = Object.entries(runSnippets())

    expect(results).toHaveLength(SNIPPETS.length * SNIPPET_NAMES.length)
    expect(results.filter(([, result]) => result !== 'clean, contained')).toStrictEqual([])
  })
})

describe('localization keys', () => {
  it('a localization key MZ cannot read is left out and reported', () => {
    const definition = cleanDefinition()
    definition.meta.localizations = { 'ja */ x': { description: 'd' }, ja: { description: 'kept' } }
    const output = generatePlugin(definition)

    expect(output.split('\n').filter((line) => line.startsWith('/*:ja'))).toStrictEqual(['/*:ja'])
    expect(
      ['ja */ x', 'ja *\\/ x', ' * @plugindesc kept'].map((text) => output.includes(text))
    ).toStrictEqual([false, false, true])

    const { errors, warnings } = validatePlugin(definition)

    expect(errors).toContain(
      'Localization "ja */ x" is left out: a language code may contain only letters and underscores.'
    )
    expect(warnings.filter((w) => w.includes('ja */ x'))).toStrictEqual([])
  })
})

/**
The text after `@default ` in the annotation block of the parameter `name`.
*/
function annotatedDefault(code: string, name: string): string {
  const lines = code.split('\n')
  const start = lines.indexOf(` * @param ${name}`)
  const line = lines
    .slice(start, lines.indexOf(' *', start))
    .find((l) => l.startsWith(' * @default '))
  if (start === -1 || line === undefined) throw new Error(`no @default for ${name}`)
  return line.slice(' * @default '.length)
}

/**
Generates `definition` with code that stores `expression` of the first parameter, then runs it.
*/
function runDefault(definition: PluginDefinition, expression: (name: string) => string): unknown {
  definition.customCode = `globalThis.__value = ${expression(parameterConstant(firstOf(definition.parameters).name))};`
  const result = evaluatePlugin(generatePlugin(definition), { mode: 'generator' })

  expect(result).toMatchObject({ compileProblem: null, threw: null, sentinel: false })

  const { __value: value } = result.context ?? {}
  return value
}

describe('parameter defaults', () => {
  it('the code fallback of a text default is the text after @default', () => {
    const definition = cleanDefinition()
    firstOf(definition.parameters).default = 'x */ y'
    const annotated = annotatedDefault(
      generatePlugin(definition),
      firstOf(definition.parameters).name
    )

    expect(runDefault(definition, (name) => name)).toBe(annotated)
    expect(annotated).toBe('x *\\/ y')
  })

  it('the code fallback of a struct default decodes to the @default JSON', () => {
    const definition = cleanDefinition()
    Object.assign(firstOf(definition.parameters), { type: 'struct', structType: 'FixtureStruct' })
    firstOf(definition.parameters).default = '{"a":"*/"}'
    const annotated = annotatedDefault(
      generatePlugin(definition),
      firstOf(definition.parameters).name
    )
    const stored = runDefault(definition, (name) => `JSON.stringify(${name})`)

    expect(JSON.parse(String(stored))).toStrictEqual({ a: '*/' })
    expect(JSON.parse(annotated)).toStrictEqual({ a: '*/' })
  })
})

/**
The warnings `change` adds to those of the clean definition.
*/
function addedWarnings(change: (definition: PluginDefinition) => void): string[] {
  const before = new Set(validatePlugin(cleanDefinition()).warnings)
  const definition = cleanDefinition()
  change(definition)
  return validatePlugin(definition).warnings.filter((w) => !before.has(w))
}

const escapedWarning = (field: string): string =>
  String.raw`${field}: "*/" is written as "*\/" so it cannot end the comment.`

/**
Fields whose comment end the generator writes escaped, each with the name its warning gives.
*/
const ESCAPED_FIELDS: [string, (definition: PluginDefinition) => void, string][] = [
  [
    'the plugin description',
    (definition) => {
      definition.meta.description = 'a */ b'
    },
    'Plugin @plugindesc'
  ],
  [
    'a command argument label',
    (definition) => {
      firstOf(firstOf(definition.commands).args).text = 'a */ b'
    },
    'Command "FixtureCommand" argument "FixtureArg" @text'
  ],
  [
    'a struct field description',
    (definition) => {
      firstOf(firstOf(definition.structs).parameters).desc = 'a */ b'
    },
    'Struct "FixtureStruct" field "FixtureField" @desc'
  ],
  [
    'translated help, once for two lines',
    (definition) => {
      japanese(definition).help = 'one\na */ b\nc */ d'
    },
    'Localization "ja" @help'
  ]
]

describe('validatePlugin warnings', () => {
  it('names the field whose "*/" is written escaped', () => {
    const added = addedWarnings((definition) => {
      firstOf(definition.parameters).desc = 'a */ b'
    })

    expect(added).toStrictEqual([escapedWarning('Parameter "FixtureParam" @desc')])
  })

  it('an "@" word inside a description or help line adds no warning', () => {
    const added = addedWarnings((definition) => {
      firstOf(definition.parameters).desc = 'see @param here'
      firstOf(definition.commands).desc = 'see @note here'
      definition.meta.help = 'Read @help and @type first'
    })

    expect(added).toStrictEqual([])
  })

  it.each<[string, (definition: PluginDefinition) => void, string]>([
    [
      'a parameter',
      (definition) => {
        firstOf(definition.parameters).name = 'Speed @type number'
      },
      'Parameter "Speed @type number" @param'
    ],
    [
      'a struct field',
      (definition) => {
        firstOf(firstOf(definition.structs).parameters).name = 'Size @default 3'
      },
      'Struct "FixtureStruct" field "Size @default 3" @param'
    ]
  ])('names %s whose name holds a setting tag', (_, change, field) => {
    expect(addedWarnings(change)).toContain(
      `${field}: the name holds an "@" setting tag, so when the plugin is opened again the name ends before that tag and the rest is read as the parameter's settings.`
    )
  })

  it('an "@" in a parameter name that is not a setting tag adds no warning about it', () => {
    const added = addedWarnings((definition) => {
      firstOf(definition.parameters).name = 'Speed@home'
      firstOf(definition.commands).name = 'Run @type number'
      firstOf(firstOf(definition.commands).args).name = 'Arg @type number'
    })

    expect(added.filter((w) => w.includes('setting tag'))).toStrictEqual([])
  })

  it.each<[string, (definition: PluginDefinition) => void, string]>([
    [
      'plugin help, indented',
      (definition) => {
        definition.meta.help = 'Usage\n  @param injected\nEnd'
      },
      'Plugin @help'
    ],
    [
      'translated help, once for two lines',
      (definition) => {
        japanese(definition).help = 'one\n@param injected\n@type number'
      },
      'Localization "ja" @help'
    ]
  ])('names %s with a line starting with "@"', (_, change, field) => {
    expect(addedWarnings(change)).toStrictEqual([
      `${field}: a line starting with "@" is written with an invisible zero-width space before the "@", so RPG Maker MZ shows it as help text instead of reading it as an annotation tag.`
    ])
  })

  it.each(ESCAPED_FIELDS)('names %s', (_, change, field) => {
    expect(addedWarnings(change)).toStrictEqual([escapedWarning(field)])
  })
})
