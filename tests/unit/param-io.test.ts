import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, it, expect } from 'vitest'
import { generatePlugin } from '../../src/renderer/src/lib/generator'
import {
  serializeParams,
  deserializeParams,
  duplicateParams,
  type ParamImportResult
} from '../../src/renderer/src/lib/param-io'
import {
  createEmptyParameter,
  createEmptyPlugin,
  type PluginParameter
} from '../../src/renderer/src/types/plugin'
import { V160_FIXTURE, V160_PARAMS, V160_SOURCE } from '../golden/corpus/mzparams'

function makeParam(overrides: Partial<PluginParameter> = {}): PluginParameter {
  return {
    id: crypto.randomUUID(),
    name: 'testParam',
    text: 'Test Param',
    desc: 'A test parameter',
    type: 'number',
    default: 0,
    ...overrides
  }
}

/**
What reading `content` loads; fails the test when the file is refused.
*/
function loaded(content: string): Extract<ParamImportResult, { success: true }> {
  const result = deserializeParams(content)
  if (!result.success) throw new Error(`file refused: ${result.reason}`)
  return result
}

const fileOf = (parameters: unknown[]): string =>
  JSON.stringify({ version: 1, source: 'Test', exportedAt: '2026-01-01', parameters })

// A copy of an object without the named fields
const omit = (from: object, ...keys: string[]): Record<string, unknown> =>
  Object.fromEntries(Object.entries(from).filter(([key]) => !keys.includes(key)))

/**
A member of a value parsed from JSON; undefined when the value holds no such member.
*/
function member(value: unknown, key: string): unknown {
  return typeof value === 'object' && value !== null ? Reflect.get(value, key) : undefined
}

describe(serializeParams, () => {
  it('produces valid JSON with version and source', () => {
    const params = [makeParam({ name: 'speed', text: 'Speed', default: 5 })]
    const parsed: unknown = JSON.parse(serializeParams(params, 'TestPlugin'))

    expect(parsed).toMatchObject({ version: 1, source: 'TestPlugin', parameters: [{}] })
    expect(member(parsed, 'exportedAt')).toMatch(/./)
  })

  it('includes all parameter properties', () => {
    const params = [
      makeParam({
        name: 'color',
        text: 'Color',
        desc: 'Pick a color',
        type: 'string',
        default: '#FF0000'
      })
    ]
    const parsed: unknown = JSON.parse(serializeParams(params, 'Test'))

    expect(parsed).toMatchObject({
      parameters: [{ name: 'color', desc: 'Pick a color', default: '#FF0000' }]
    })
  })

  it('handles empty parameter list', () => {
    const parsed: unknown = JSON.parse(serializeParams([], 'Empty'))

    expect(parsed).toMatchObject({ parameters: [], source: 'Empty' })
  })

  it('preserves optional fields like min, max, options', () => {
    const params = [
      makeParam({
        name: 'volume',
        type: 'number',
        default: 50,
        min: 0,
        max: 100
      })
    ]
    const parsed: unknown = JSON.parse(serializeParams(params, 'Test'))

    expect(parsed).toMatchObject({ parameters: [{ min: 0, max: 100 }] })
  })
})

describe(deserializeParams, () => {
  it('parses valid .mzparams content', () => {
    const result = loaded(fileOf([makeParam({ name: 'x', text: 'X' })]))

    expect(result.parameters).toHaveLength(1)
    expect(result.source).toBe('Test')
  })

  it('regenerates IDs to avoid collisions', () => {
    const originalId = 'original-id-12345'
    const content = fileOf([makeParam({ id: originalId, name: 'x' })])

    expect(loaded(content).parameters.map((p) => p.id === originalId)).toStrictEqual([false])
  })

  it('refuses text that is not JSON', () => {
    expect(deserializeParams('not json at all')).toStrictEqual({
      success: false,
      reason: 'not-json'
    })
  })

  it('refuses a file without a version', () => {
    const content = JSON.stringify({ parameters: [] })

    expect(deserializeParams(content)).toStrictEqual({ success: false, reason: 'not-mzparams' })
  })

  it('refuses a file from a newer version', () => {
    const content = JSON.stringify({ version: 2, parameters: [makeParam()] })

    expect(deserializeParams(content)).toStrictEqual({ success: false, reason: 'newer-version' })
  })

  it('refuses a file without a parameters list', () => {
    const content = JSON.stringify({ version: 1 })

    expect(deserializeParams(content)).toStrictEqual({ success: false, reason: 'not-mzparams' })
  })

  it('skips entries that are not parameters and lists them', () => {
    const result = loaded(
      fileOf([
        makeParam({ name: 'valid' }),
        { noName: true },
        42,
        null,
        makeParam({ name: 'alsoValid' })
      ])
    )

    expect(result.parameters.map((p) => p.name)).toStrictEqual(['valid', 'alsoValid'])
    expect(result.skipped).toStrictEqual([
      { index: 1, name: null, reason: 'shape' },
      { index: 2, name: null, reason: 'shape' },
      { index: 3, name: null, reason: 'shape' }
    ])
  })

  it('defaults source to Unknown when missing', () => {
    const content = JSON.stringify({
      version: 1,
      exportedAt: '2026-01-01',
      parameters: [makeParam()]
    })

    expect(loaded(content).source).toBe('Unknown')
  })

  it('handles multiple parameters', () => {
    const content = JSON.stringify({
      version: 1,
      source: 'Multi',
      exportedAt: '2026-01-01',
      parameters: [makeParam({ name: 'a' }), makeParam({ name: 'b' }), makeParam({ name: 'c' })]
    })

    expect(loaded(content).parameters.map((p) => p.name)).toStrictEqual(['a', 'b', 'c'])
  })

  it('skips parameters with unrecognized type and lists them', () => {
    const content = JSON.stringify({
      version: 1,
      parameters: [
        { id: '1', name: 'good', type: 'string', default: '' },
        { id: '2', name: 'bad', type: 'banana', default: '' }
      ]
    })
    const result = loaded(content)

    expect(result.parameters.map((p) => p.name)).toStrictEqual(['good'])
    expect(result.skipped).toStrictEqual([{ index: 1, name: 'bad', reason: 'type' }])
  })
})

describe('param-io round-trip', () => {
  it('round-trips through serialize and deserialize', () => {
    const params: PluginParameter[] = [
      { ...createEmptyParameter(), name: 'testParam', type: 'number', default: '42' }
    ]
    const result = loaded(serializeParams(params, 'TestPlugin'))

    expect(result.parameters.map((p) => [p.name, p.type, p.default])).toStrictEqual([
      ['testParam', 'number', '42']
    ])
    expect(result.dropped).toStrictEqual([])
  })
})

// How a file this app did not write, or wrote in another version, is read.
const fixtureText = (name: string): string =>
  readFileSync(path.resolve(process.cwd(), 'tests/fixtures/mzparams', name), 'utf8')

describe('deserializeParams with files it was not written for', () => {
  it('names why it refuses a file', () => {
    const cases: [string, string][] = [
      ['not json at all', 'not-json'],
      [fixtureText('invalid-missing-version.mzparams'), 'not-mzparams'],
      [JSON.stringify({ version: 1.5, parameters: [] }), 'not-mzparams'],
      [JSON.stringify({ version: '1', parameters: [] }), 'not-mzparams'],
      [JSON.stringify({ version: 0, parameters: [] }), 'not-mzparams'],
      [JSON.stringify(null), 'not-mzparams'],
      [JSON.stringify([{ version: 1 }]), 'not-mzparams'],
      [JSON.stringify({ version: 1, source: 'Test', parameters: {} }), 'not-mzparams'],
      [fixtureText('invalid-newer-version.mzparams'), 'newer-version']
    ]

    expect(cases.map(([content]) => [content, deserializeParams(content)])).toStrictEqual(
      cases.map(([content, reason]) => [content, { success: false, reason }])
    )
  })

  it('skips a parameter of an unknown type and lists it', () => {
    const result = loaded(fixtureText('invalid-unknown-type.mzparams'))

    expect(result.parameters.map((p) => p.name)).toStrictEqual(['Label'])
    expect(result.skipped).toStrictEqual([{ index: 1, name: 'Shape', reason: 'type' }])
    expect(result.dropped).toStrictEqual([])
  })

  it('drops an unknown key and a description that is not text, and lists them', () => {
    const withKey = loaded(fixtureText('invalid-unknown-key.mzparams'))
    const wrongType = loaded(fixtureText('invalid-wrong-type-field.mzparams'))

    expect(withKey.parameters.map((p) => Object.hasOwn(p, 'extra'))).toStrictEqual([false])
    expect(withKey.dropped).toStrictEqual([{ param: 'Label', field: 'extra' }])
    expect(wrongType.parameters.map((p) => p.desc)).toStrictEqual([''])
    expect(wrongType.dropped).toStrictEqual([{ param: 'Label', field: 'desc' }])
  })

  it('names the source Unknown when it is not text', () => {
    for (const source of [7, '', null]) {
      const result = loaded(JSON.stringify({ version: 1, source, parameters: [] }))

      expect(result.source).toBe('Unknown')
    }
  })

  it('reads a cleared limit as no limit, which the plugin leaves out', () => {
    const content = JSON.stringify({
      version: 1,
      source: 'Test',
      parameters: [{ ...makeParam({ name: 'speed' }), min: null }]
    })
    const result = loaded(content)

    expect(result.parameters.map((p) => Object.hasOwn(p, 'min'))).toStrictEqual([false])
    expect(result.dropped).toStrictEqual([])

    const code = generatePlugin({ ...createEmptyPlugin(), parameters: result.parameters })

    expect(code).not.toContain('@min')
  })

  it('loads every parameter of a file the released version exported, with every field', () => {
    const result = loaded(readFileSync(V160_FIXTURE, 'utf8'))

    expect(result.source).toBe(V160_SOURCE)
    expect(result.skipped).toStrictEqual([])
    expect(result.dropped).toStrictEqual([])
    // A number the user cleared was written as null and reads back as no value.
    expect(result.parameters.map((p) => omit(p, 'id'))).toStrictEqual(
      V160_PARAMS.map((p) =>
        omit(p, 'id', ...Object.keys(p).filter((key) => Number.isNaN(Reflect.get(p, key))))
      )
    )
  })
})

/*
Every field a parameter has, at values the released version could write: a description that
closes a comment and spans two lines; the second parameter holds the numbers a user cleared.
*/
const EVERY_FIELD = {
  id: 'full',
  name: 'Full',
  text: 'Full label',
  desc: 'Ends a comment */ here\nand goes on.',
  type: 'array',
  default: '[]',
  min: 0,
  max: 10,
  decimals: 2,
  options: [{ value: 'a', text: 'A' }],
  structType: 'Point',
  arrayType: 'struct',
  dir: 'img/pictures/',
  require: true,
  parent: 'Group',
  rawType: 'struct<Point>[]',
  onLabel: 'On',
  offLabel: 'Off'
} satisfies Record<keyof PluginParameter, unknown>
const FULL_LOADED = omit(EVERY_FIELD, 'id')

type Expected = { skip: 'shape' | 'type' } | { dropped: string[]; reads?: unknown }

// One wrong value per field (and a null where null means "no value"). `reads` is what the field
// holds after its fallback; without it the field is left out.
const STRING_FIELDS = ['structType', 'dir', 'parent', 'rawType', 'onLabel', 'offLabel']
const WRONG_VALUES: [field: string, value: unknown, expected: Expected][] = [
  ['name', 5, { skip: 'shape' }],
  ['name', undefined, { skip: 'shape' }],
  ['type', 'vector', { skip: 'type' }],
  ['type', 5, { skip: 'type' }],
  ['text', 5, { dropped: ['text'], reads: 'Full' }],
  ['text', undefined, { dropped: ['text'], reads: 'Full' }],
  ['desc', 5, { dropped: ['desc'], reads: '' }],
  ['desc', undefined, { dropped: ['desc'], reads: '' }],
  ['default', null, { dropped: ['default'], reads: '' }],
  ['default', { x: 1 }, { dropped: ['default'], reads: '' }],
  ['min', '5', { dropped: ['min'] }],
  ['min', null, { dropped: [] }],
  ['max', true, { dropped: ['max'] }],
  ['max', null, { dropped: [] }],
  ['decimals', '2', { dropped: ['decimals'] }],
  ['decimals', null, { dropped: [] }],
  ['options', 'a,b', { dropped: ['options'] }],
  [
    'options',
    [{ value: 'a', text: 'A', note: 'x' }, 5, { value: 1, text: 'B' }, null],
    {
      dropped: ['options[0].note', 'options[1]', 'options[2]', 'options[3]'],
      reads: [{ value: 'a', text: 'A' }]
    }
  ],
  ...STRING_FIELDS.flatMap((field): [string, unknown, Expected][] => [
    [field, 5, { dropped: [field] }],
    [field, null, { dropped: [] }]
  ]),
  ['arrayType', 'vector', { dropped: ['arrayType'] }],
  ['arrayType', null, { dropped: [] }],
  ['require', 1, { dropped: ['require'] }],
  ['require', null, { dropped: [] }],
  ['id', 5, { dropped: [] }],
  ['extra', 'not a parameter field', { dropped: ['extra'] }]
]
const NOT_PARAMETERS: unknown[] = [42, null, ['Full'], 'Full']

// What a file read loads, without the ids it assigns
const outcome = ({
  parameters,
  skipped,
  dropped
}: Extract<ParamImportResult, { success: true }>): Record<string, unknown> => ({
  parameters: parameters.map((p) => omit(p, 'id')),
  skipped,
  dropped
})

// What a file holding EVERY_FIELD with one field set to a wrong value loads
function wrongValueOutcome(field: string, expected: Expected): Record<string, unknown> {
  if ('skip' in expected)
    return {
      parameters: [],
      skipped: [{ index: 0, name: field === 'name' ? null : 'Full', reason: expected.skip }],
      dropped: []
    }
  return {
    parameters: [
      'reads' in expected ? { ...FULL_LOADED, [field]: expected.reads } : omit(FULL_LOADED, field)
    ],
    skipped: [],
    dropped: expected.dropped.map((f) => ({ param: 'Full', field: f }))
  }
}

describe('parameter fields read from a .mzparams file', () => {
  it('loads every field the released version could write', () => {
    const cleared = { ...EVERY_FIELD, name: 'Cleared', min: null, max: null, decimals: null }
    const result = loaded(fileOf([EVERY_FIELD, cleared]))

    expect(result.skipped).toStrictEqual([])
    expect(result.dropped).toStrictEqual([])
    expect(result.parameters.map((p) => omit(p, 'id'))).toStrictEqual([
      FULL_LOADED,
      { ...omit(FULL_LOADED, 'min', 'max', 'decimals'), name: 'Cleared' }
    ])
  })

  it('drops each wrong-typed field and skips what is not a parameter', () => {
    expect(NOT_PARAMETERS.map((value) => outcome(loaded(fileOf([value]))))).toStrictEqual(
      NOT_PARAMETERS.map(() => ({
        parameters: [],
        skipped: [{ index: 0, name: null, reason: 'shape' }],
        dropped: []
      }))
    )
    expect(
      WRONG_VALUES.map(([field, value]) => [
        field,
        value,
        outcome(loaded(fileOf([{ ...EVERY_FIELD, [field]: value }])))
      ])
    ).toStrictEqual(
      WRONG_VALUES.map(([field, value, expected]) => [
        field,
        value,
        wrongValueOutcome(field, expected)
      ])
    )

    const fields = new Set(WRONG_VALUES.map(([field]) => field))
    process.stdout.write(
      `mzparams fields checked: ${String(fields.size)} and the parameter itself ` +
        `(cases ${String(WRONG_VALUES.length + NOT_PARAMETERS.length)})\n`
    )

    expect(fields.size).toBeGreaterThan(0)
    expect(Object.keys(EVERY_FIELD).filter((key) => !fields.has(key))).toStrictEqual([])
  })
})

describe(duplicateParams, () => {
  it('creates copies with new IDs and _copy suffix', () => {
    const params = [
      makeParam({ id: 'id-1', name: 'speed', default: 5 }),
      makeParam({ id: 'id-2', name: 'volume', default: 100 })
    ]
    const duped = duplicateParams(params, ['speed', 'volume'])

    expect(duped.map((p) => [p.name, p.default, ['id-1', 'id-2'].includes(p.id)])).toStrictEqual([
      ['speed_copy', 5, false],
      ['volume_copy', 100, false]
    ])
  })

  it('handles empty array', () => {
    expect(duplicateParams([], [])).toStrictEqual([])
  })

  it('names each copy apart from the parameters already there, without stacking suffixes', () => {
    const speed = makeParam({ name: 'speed' })
    const once = [speed, ...duplicateParams([speed], ['speed'])]
    const twice = [
      ...once,
      ...duplicateParams(
        [speed],
        once.map((p) => p.name)
      )
    ]
    const ofCopy = [
      ...twice,
      ...duplicateParams(
        twice.filter((p) => p.name === 'speed_copy'),
        twice.map((p) => p.name)
      )
    ]

    expect(ofCopy.map((p) => p.name)).toStrictEqual([
      'speed',
      'speed_copy',
      'speed_copy2',
      'speed_copy3'
    ])
  })

  it('names the copies made in one press apart from each other', () => {
    const params = [makeParam({ name: 'speed' }), makeParam({ name: 'speed_copy' })]

    expect(duplicateParams(params, ['speed', 'speed_copy']).map((p) => p.name)).toStrictEqual([
      'speed_copy2',
      'speed_copy3'
    ])
  })

  it('preserves all other properties', () => {
    const params = [
      makeParam({
        name: 'test',
        text: 'Test',
        desc: 'A description',
        type: 'number',
        min: 0,
        max: 10,
        default: 5
      })
    ]
    const duped = duplicateParams(params, ['test'])

    expect(duped.map((p) => [p.text, p.desc, p.type, p.min, p.max])).toStrictEqual([
      ['Test', 'A description', 'number', 0, 10]
    ])
  })
})
