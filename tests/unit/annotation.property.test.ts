// A generated plugin opened again: each parameter keeps its name, display name, description,
// default and type, for parameters of every type with generated text. The text kept is the text
// the header line holds, as MZ reads it: a line break becomes a space and `*` `/` is escaped
// (the validator warns of both), and the ends of the line are trimmed.
import * as fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { PluginParser } from '../../src/main/services/pluginParser'
import { annotationText } from '../../src/renderer/src/lib/generator/escape'
import { generatePlugin } from '../../src/renderer/src/lib/generator'
import { COMPACT_PARAM_TAG } from '../../src/shared/compact-param'
import {
  ALL_PARAM_TYPES,
  createEmptyPlugin,
  type ParamType,
  type PluginParameter
} from '../../src/shared/types/plugin'
import { propertyRuns } from '../helpers/property-runs'

const RUNS = propertyRuns('annotation')
const PARAM_TYPES = [...ALL_PARAM_TYPES].filter((type): type is ParamType =>
  ALL_PARAM_TYPES.has(type)
)
// The element types an array is written with as `<type>[]`
const ELEMENT_TYPES = PARAM_TYPES.filter((type) => type !== 'array' && type !== 'struct')

// The text a header line holds for `value`, as it is read back
const lineText = (value: string): string => annotationText(value).trim()

// The pieces the header reader acts on: comment and tag marks, blanks, line breaks, and the
// words and digits a default is read as a boolean or a number from
const PIECES = [
  '*',
  '/',
  '@',
  ' ',
  '\t',
  '\n',
  '\r',
  '\u{2028}',
  '0',
  '7',
  '.',
  '-',
  'true',
  'FALSE'
]
// Any text, lone surrogates included, with those pieces drawn often
const text = fc.string({
  unit: fc.oneof(
    fc.constantFrom(...PIECES),
    fc.string({ unit: 'binary', minLength: 1, maxLength: 1 })
  )
})
// A parameter name that reads back as a name: not blank, and holding no setting tag, which
// the validator warns turns the rest of the name into settings
const name = text.filter((value) => lineText(value) !== '' && !COMPACT_PARAM_TAG.test(value))
// A struct name as `struct<Name>` reads one: a letter or `_`, then word characters
const identifier = fc.stringMatching(/^[A-Z_a-z]\w{0,11}$/u)

// A parameter of `type` with generated text; an array names its element type, a struct its own
const parameterOf = (type: ParamType): fc.Arbitrary<PluginParameter> =>
  fc.record({
    id: fc.uuid(),
    name,
    text,
    desc: text,
    type: fc.constant(type),
    default: fc.oneof(text, fc.double({ noNaN: true }), fc.boolean()),
    ...(type === 'array' && { arrayType: fc.constantFrom(...ELEMENT_TYPES) }),
    ...(type === 'struct' && { structType: identifier })
  })

// One parameter of each type, their names read back apart
const parameters = fc
  .tuple(...PARAM_TYPES.map((type) => parameterOf(type)))
  .filter((list) => new Set(list.map((p) => lineText(p.name))).size === list.length)

// What a parameter reads back as, from the fields the header writes
const readBack = (p: PluginParameter): Record<string, unknown> => {
  const readName = lineText(p.name)
  const isTextWritten = p.text !== '' && p.text !== p.name
  return {
    name: readName,
    text: (isTextWritten ? lineText(p.text) : '') || readName,
    desc: lineText(p.desc),
    default: p.default === '' ? '' : lineText(String(p.default)),
    type: p.type,
    arrayType: p.arrayType,
    structType: p.structType
  }
}

// The same fields of a parameter read from the file
const read = (p: PluginParameter): Record<string, unknown> => ({
  name: p.name,
  text: p.text,
  desc: p.desc,
  default: String(p.default),
  type: p.type,
  arrayType: p.arrayType,
  structType: p.structType
})

describe('annotation properties', () => {
  it('generates a parameter of every type', () => {
    expect(PARAM_TYPES).toHaveLength(ALL_PARAM_TYPES.size)
    expect(ELEMENT_TYPES).toHaveLength(PARAM_TYPES.length - 2)
  })

  it('a generated plugin opened again keeps each parameter as its header line reads', () => {
    expect.hasAssertions()

    fc.assert(
      fc.property(parameters, (list) => {
        const plugin = { ...createEmptyPlugin(), parameters: list }
        const opened = PluginParser.parsePlugin(generatePlugin(plugin), 'Property.js')

        expect(opened.parameters.map((p) => read(p))).toStrictEqual(list.map((p) => readBack(p)))
      }),
      RUNS
    )
  })
})
