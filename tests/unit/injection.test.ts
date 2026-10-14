// Text typed into any field of a plugin definition, followed to where it lands in the generated
// plugin. Each field is written with hostile text into an otherwise clean definition, and the
// output is compiled and run in a sealed context that reports whether the text ran as code.
import { describe, it, expect } from 'vitest'
import {
  camelCase,
  generateCommandSkeleton,
  generateParameterComment,
  generatePlugin,
  generateRawMode,
  validatePlugin
} from '../../src/renderer/src/lib/generator/index'
import type {
  LocalizedContent,
  NoteParam,
  ParamType,
  PluginCommand,
  PluginDefinition,
  PluginMeta,
  PluginParameter,
  PluginStruct,
  SelectOption
} from '../../src/shared/types/plugin'
import { evaluatePlugin } from '../helpers/evaluate-plugin'
import type { EvaluationResult } from '../helpers/evaluate-plugin'
import { ALL_PAYLOADS, COMMENT_PAYLOADS, SENTINEL } from '../helpers/hostile'
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
    expect(contextsOf('// a NEEDLE\nb()', 'NEEDLE')).toEqual(['line-comment'])
    expect(contextsOf('a(/* NEEDLE */)', 'NEEDLE')).toEqual(['block-comment'])
    expect(contextsOf("const a = 'x NEEDLE'", 'NEEDLE')).toEqual(['single-quote'])
    expect(contextsOf('const a = `x NEEDLE`', 'NEEDLE')).toEqual(['template-literal'])
    expect(contextsOf('const NEEDLE = 1', 'NEEDLE')).toEqual(['code'])
    expect(contextsOf('/* NEEDLE */ NEEDLE()', 'NEEDLE')).toEqual(['block-comment', 'code'])
    expect(isContained('// NEEDLE\nconst a = "NEEDLE"', 'NEEDLE')).toBe(true)
    expect(isContained('/* x */ NEEDLE /* y */', 'NEEDLE')).toBe(false)
  })
})

type Setter<T> = (target: T, text: string) => void
/** A string key's setter, or why the key holds no text of its own. */
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
  rawSource: { code: 'raw mode edits the imported file in place' }
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
    p.type = t as ParamType
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
    p.arrayType = t as ParamType
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

/** A definition using every emitted annotation once, all text plain. */
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
  set: (def: PluginDefinition, text: string) => void
}

function rowsOf<T>(
  owner: string,
  fields: Record<string, FieldUse<T>>,
  target: (def: PluginDefinition) => T
): FieldRow[] {
  return Object.entries(fields).flatMap(([key, setter]) =>
    typeof setter === 'function'
      ? [
          {
            field: `${owner}.${key}`,
            set: (def: PluginDefinition, text: string) => setter(target(def), text)
          }
        ]
      : []
  )
}

/** The option of a select parameter, so that both `@option` and `@value` are emitted. */
function optionOf(param: PluginParameter): SelectOption {
  param.type = 'select'
  param.options = [{ value: 'fixture-value', text: 'Fixture option' }]
  return param.options[0]
}

const PARAMETER_OWNERS: [string, (def: PluginDefinition) => PluginParameter][] = [
  ['parameter', (def) => def.parameters[0]],
  ['argument', (def) => def.commands[0].args[0]],
  ['struct field', (def) => def.structs[0].parameters[0]]
]

const FIELD_ROWS: FieldRow[] = [
  ...rowsOf('definition', definitionFields, (def) => def),
  ...rowsOf('meta', metaFields, (def) => def.meta),
  ...rowsOf('note param', noteParamFields, (def) => def.meta.noteParams![0]),
  ...PARAMETER_OWNERS.flatMap(([owner, target]) => [
    ...rowsOf(owner, parameterFields, target),
    ...rowsOf(`${owner} option`, optionFields, (def) => optionOf(target(def)))
  ]),
  ...rowsOf('command', commandFields, (def) => def.commands[0]),
  ...rowsOf('struct', structFields, (def) => def.structs[0]),
  ...rowsOf('localization', localizationFields, (def) => def.meta.localizations!.ja)
]

// An imported file: the clean definition's comment blocks and a body that reads the parameters
// but parses none, so raw mode adds one parsing line per parameter and registers each command.
// (Raw mode re-adds every parameter of a body the generator wrote, which does not compile.)
function rawSource(): string {
  const generated = generatePlugin(cleanDefinition())
  return (
    generated.slice(0, generated.indexOf('(() => {')) +
    "(() => {\n    'use strict';\n\n    const PLUGIN_NAME = 'Fixture_Matrix';\n" +
    '    const params = PluginManager.parameters(PLUGIN_NAME);\n})();\n'
  )
}

const ENTRIES: [string, (def: PluginDefinition) => string][] = [
  ['generatePlugin', (def) => generatePlugin(def)],
  ['generateRawMode', (def) => generateRawMode({ ...def, rawSource: rawSource() })]
]

interface MatrixCase {
  label: string
  outcome: Outcome
  contained: boolean
}

function runMatrix(): MatrixCase[] {
  const cases: MatrixCase[] = []
  for (const row of FIELD_ROWS) {
    for (const payload of ALL_PAYLOADS) {
      for (const [entry, generate] of ENTRIES) {
        const def = cleanDefinition()
        row.set(def, payload.text)
        const code = generate(def)
        cases.push({
          label: `${row.field} / ${payload.name} / ${entry}`,
          outcome: outcomeOf(evaluatePlugin(code, { mode: 'generator' })),
          contained: isContained(code, INJECTED)
        })
      }
    }
  }
  console.log(
    `injection matrix: fields ${FIELD_ROWS.length}, payloads ${ALL_PAYLOADS.length}, ` +
      `entries ${ENTRIES.length}, cases ${cases.length}`
  )
  return cases
}

describe('generated plugin annotations', () => {
  it('field text stays inside the annotation comment', () => {
    expect(FIELD_ROWS.length).toBeGreaterThan(0)
    const notClean = runMatrix().filter((c) => c.outcome !== 'clean' || !c.contained)
    expect(notClean.map((c) => c.label)).toEqual([])
  })
})

const LINE_BREAKS: [string, string][] = [
  ['lf', '\n'],
  ['crlf', '\r\n'],
  ['u2028', '\u2028'],
  ['u2029', '\u2029']
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
    expect(results.filter(([, result]) => result !== 'clean, contained')).toEqual([])
  })
})

describe('localization keys', () => {
  it('a localization key is written into the comment opener unchecked (today)', () => {
    const def = cleanDefinition()
    def.meta.localizations = { 'ja */ x': { description: 'd' } }
    const output = generatePlugin(def)
    expect(output.split('\n')).toContain('/*:ja *\\/ x')
    expect(validatePlugin(def).errors.filter((e) => e.includes('ja */ x'))).toEqual([])
  })
})

/** The text after `@default ` in the annotation block of the parameter `name`. */
function annotatedDefault(code: string, name: string): string {
  const lines = code.split('\n')
  const start = lines.indexOf(` * @param ${name}`)
  const line = lines
    .slice(start, lines.indexOf(' *', start))
    .find((l) => l.startsWith(' * @default '))
  if (start === -1 || line === undefined) throw new Error(`no @default for ${name}`)
  return line.slice(' * @default '.length)
}

/** Generates `def` with code that stores `expression` of the first parameter, then runs it. */
function runDefault(def: PluginDefinition, expression: (name: string) => string): unknown {
  def.customCode = `globalThis.__value = ${expression(camelCase(def.parameters[0].name))};`
  const result = evaluatePlugin(generatePlugin(def), { mode: 'generator' })
  expect(result).toMatchObject({ compileProblem: null, threw: null, sentinel: false })
  return result.context?.__value
}

describe('parameter defaults', () => {
  it('the code fallback of a text default is the text after @default', () => {
    const def = cleanDefinition()
    def.parameters[0].default = 'x */ y'
    const annotated = annotatedDefault(generatePlugin(def), def.parameters[0].name)
    expect(runDefault(def, (name) => name)).toBe(annotated)
    expect(annotated).toBe('x *\\/ y')
  })

  it('the code fallback of a struct default decodes to the @default JSON', () => {
    const def = cleanDefinition()
    Object.assign(def.parameters[0], { type: 'struct', structType: 'FixtureStruct' })
    def.parameters[0].default = '{"a":"*/"}'
    const annotated = annotatedDefault(generatePlugin(def), def.parameters[0].name)
    const stored = runDefault(def, (name) => `JSON.stringify(${name})`)
    expect(JSON.parse(String(stored))).toEqual({ a: '*/' })
    expect(JSON.parse(annotated)).toEqual({ a: '*/' })
  })
})

describe('validatePlugin warnings', () => {
  it('field text holding "*/" or "@word" raises no warning (today)', () => {
    const clean = cleanDefinition()
    const before = validatePlugin(clean).warnings
    for (const desc of ['a */ b', 'see @note here']) {
      const def = cleanDefinition()
      def.parameters[0].desc = desc
      expect(validatePlugin(def).warnings).toEqual(before)
    }
  })
})
