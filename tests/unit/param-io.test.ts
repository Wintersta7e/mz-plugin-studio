import { readFileSync } from 'fs'
import { resolve } from 'path'
import { describe, it, expect } from 'vitest'
import { generatePlugin } from '../../src/renderer/src/lib/generator'
import {
  serializeParams,
  deserializeParams,
  duplicateParams
} from '../../src/renderer/src/lib/param-io'
import type { ParamImportResult } from '../../src/renderer/src/lib/param-io'
import type { PluginParameter } from '../../src/renderer/src/types/plugin'
import { createEmptyParameter, createEmptyPlugin } from '../../src/renderer/src/types/plugin'
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

/** What reading `content` loads; fails the test when the file is refused. */
function loaded(content: string): Extract<ParamImportResult, { success: true }> {
  const result = deserializeParams(content)
  if (!result.success) throw new Error(`file refused: ${result.reason}`)
  return result
}

describe('serializeParams', () => {
  it('produces valid JSON with version and source', () => {
    const params = [makeParam({ name: 'speed', text: 'Speed', default: 5 })]
    const json = serializeParams(params, 'TestPlugin')
    const parsed = JSON.parse(json)
    expect(parsed.version).toBe(1)
    expect(parsed.source).toBe('TestPlugin')
    expect(parsed.parameters).toHaveLength(1)
    expect(parsed.exportedAt).toBeTruthy()
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
    const json = serializeParams(params, 'Test')
    const parsed = JSON.parse(json)
    expect(parsed.parameters[0].name).toBe('color')
    expect(parsed.parameters[0].desc).toBe('Pick a color')
    expect(parsed.parameters[0].default).toBe('#FF0000')
  })

  it('handles empty parameter list', () => {
    const json = serializeParams([], 'Empty')
    const parsed = JSON.parse(json)
    expect(parsed.parameters).toEqual([])
    expect(parsed.source).toBe('Empty')
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
    const json = serializeParams(params, 'Test')
    const parsed = JSON.parse(json)
    expect(parsed.parameters[0].min).toBe(0)
    expect(parsed.parameters[0].max).toBe(100)
  })
})

describe('deserializeParams', () => {
  it('parses valid .mzparams content', () => {
    const content = JSON.stringify({
      version: 1,
      source: 'Test',
      exportedAt: '2026-01-01',
      parameters: [makeParam({ name: 'x', text: 'X' })]
    })
    const result = loaded(content)
    expect(result.parameters).toHaveLength(1)
    expect(result.source).toBe('Test')
  })

  it('regenerates IDs to avoid collisions', () => {
    const originalId = 'original-id-12345'
    const content = JSON.stringify({
      version: 1,
      source: 'Test',
      exportedAt: '2026-01-01',
      parameters: [makeParam({ id: originalId, name: 'x' })]
    })
    expect(loaded(content).parameters[0].id).not.toBe(originalId)
  })

  it('refuses text that is not JSON', () => {
    expect(deserializeParams('not json at all')).toEqual({ success: false, reason: 'not-json' })
  })

  it('refuses a file without a version', () => {
    const content = JSON.stringify({ parameters: [] })
    expect(deserializeParams(content)).toEqual({ success: false, reason: 'not-mzparams' })
  })

  it('refuses a file from a newer version', () => {
    const content = JSON.stringify({ version: 2, parameters: [makeParam()] })
    expect(deserializeParams(content)).toEqual({ success: false, reason: 'newer-version' })
  })

  it('refuses a file without a parameters list', () => {
    const content = JSON.stringify({ version: 1 })
    expect(deserializeParams(content)).toEqual({ success: false, reason: 'not-mzparams' })
  })

  it('skips entries that are not parameters and lists them', () => {
    const content = JSON.stringify({
      version: 1,
      source: 'Test',
      exportedAt: '2026-01-01',
      parameters: [
        makeParam({ name: 'valid' }),
        { noName: true },
        42,
        null,
        makeParam({ name: 'alsoValid' })
      ]
    })
    const result = loaded(content)
    expect(result.parameters.map((p) => p.name)).toEqual(['valid', 'alsoValid'])
    expect(result.skipped).toEqual([
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
    const result = loaded(content)
    expect(result.parameters).toHaveLength(3)
    expect(result.parameters[0].name).toBe('a')
    expect(result.parameters[2].name).toBe('c')
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
    expect(result.parameters.map((p) => p.name)).toEqual(['good'])
    expect(result.skipped).toEqual([{ index: 1, name: 'bad', reason: 'type' }])
  })
})

describe('param-io round-trip', () => {
  it('round-trips through serialize and deserialize', () => {
    const params = [createEmptyParameter()]
    params[0].name = 'testParam'
    params[0].type = 'number'
    params[0].default = '42'
    const serialized = serializeParams(params, 'TestPlugin')
    const result = loaded(serialized)
    expect(result.parameters).toHaveLength(1)
    expect(result.parameters[0].name).toBe('testParam')
    expect(result.parameters[0].type).toBe('number')
    expect(result.parameters[0].default).toBe('42')
    expect(result.dropped).toEqual([])
  })
})

// How a file this app did not write, or wrote in another version, is read.
const fixtureText = (name: string): string =>
  readFileSync(resolve(process.cwd(), 'tests/fixtures/mzparams', name), 'utf8')

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
    for (const [content, reason] of cases) {
      expect(deserializeParams(content), content).toEqual({ success: false, reason })
    }
  })

  it('skips a parameter of an unknown type and lists it', () => {
    const result = loaded(fixtureText('invalid-unknown-type.mzparams'))
    expect(result.parameters.map((p) => p.name)).toEqual(['Label'])
    expect(result.skipped).toEqual([{ index: 1, name: 'Shape', reason: 'type' }])
    expect(result.dropped).toEqual([])
  })

  it('drops an unknown key and a description that is not text, and lists them', () => {
    const withKey = loaded(fixtureText('invalid-unknown-key.mzparams'))
    const wrongType = loaded(fixtureText('invalid-wrong-type-field.mzparams'))
    expect(withKey.parameters[0]).not.toHaveProperty('extra')
    expect(withKey.dropped).toEqual([{ param: 'Label', field: 'extra' }])
    expect(wrongType.parameters[0].desc).toBe('')
    expect(wrongType.dropped).toEqual([{ param: 'Label', field: 'desc' }])
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
    expect(result.parameters[0]).not.toHaveProperty('min')
    expect(result.dropped).toEqual([])
    const code = generatePlugin({ ...createEmptyPlugin(), parameters: result.parameters })
    expect(code).not.toContain('@min')
  })

  it('loads every parameter of a file the released version exported, with every field', () => {
    const result = loaded(readFileSync(V160_FIXTURE, 'utf8'))
    expect(result.source).toBe(V160_SOURCE)
    expect(result.skipped).toEqual([])
    expect(result.dropped).toEqual([])
    // A number the user cleared was written as null and reads back as no value.
    expect(result.parameters.map(({ id: _id, ...p }) => p)).toEqual(
      V160_PARAMS.map(({ id: _id, ...p }) =>
        Object.fromEntries(Object.entries(p).filter(([, v]) => !Number.isNaN(v)))
      )
    )
  })
})

// Every field a parameter has, at values the released version could write: a description that
// closes a comment and spans two lines; the second parameter holds the numbers a user cleared.
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
const { id: _fullId, ...FULL_LOADED } = EVERY_FIELD

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

describe('parameter fields read from a .mzparams file', () => {
  const fileOf = (parameters: unknown[]): string =>
    JSON.stringify({ version: 1, source: 'Test', exportedAt: '2026-01-01', parameters })

  it('loads every field the released version could write', () => {
    const cleared = { ...EVERY_FIELD, name: 'Cleared', min: null, max: null, decimals: null }
    const result = loaded(fileOf([EVERY_FIELD, cleared]))
    expect(result.skipped).toEqual([])
    expect(result.dropped).toEqual([])
    const { min: _min, max: _max, decimals: _decimals, ...noNumbers } = FULL_LOADED
    expect(result.parameters.map(({ id: _id, ...p }) => p)).toEqual([
      FULL_LOADED,
      { ...noNumbers, name: 'Cleared' }
    ])
  })

  it('drops each wrong-typed field and skips what is not a parameter', () => {
    for (const value of NOT_PARAMETERS) {
      const result = loaded(fileOf([value]))
      expect(result.parameters).toEqual([])
      expect(result.skipped).toEqual([{ index: 0, name: null, reason: 'shape' }])
    }
    for (const [field, value, expected] of WRONG_VALUES) {
      const result = loaded(fileOf([{ ...EVERY_FIELD, [field]: value }]))
      if ('skip' in expected) {
        const name = field === 'name' ? null : 'Full'
        expect(result.parameters, field).toEqual([])
        expect(result.skipped, field).toEqual([{ index: 0, name, reason: expected.skip }])
        continue
      }
      const { id: _id, ...parameter } = result.parameters[0]
      const { [field]: _left, ...without } = FULL_LOADED as Record<string, unknown>
      const reads = 'reads' in expected ? { ...FULL_LOADED, [field]: expected.reads } : without
      expect(parameter, `${field}: ${JSON.stringify(value)}`).toEqual(reads)
      expect(result.dropped, field).toEqual(
        expected.dropped.map((f) => ({ param: 'Full', field: f }))
      )
      expect(result.skipped, field).toEqual([])
    }
    const fields = new Set(WRONG_VALUES.map(([field]) => field))
    console.log(
      `mzparams fields checked: ${fields.size} and the parameter itself ` +
        `(cases ${WRONG_VALUES.length + NOT_PARAMETERS.length})`
    )
    expect(fields.size).toBeGreaterThan(0)
    expect(Object.keys(EVERY_FIELD).filter((key) => !fields.has(key))).toEqual([])
  })
})

describe('duplicateParams', () => {
  it('creates copies with new IDs and _copy suffix', () => {
    const params = [
      makeParam({ id: 'id-1', name: 'speed', default: 5 }),
      makeParam({ id: 'id-2', name: 'volume', default: 100 })
    ]
    const duped = duplicateParams(params)
    expect(duped).toHaveLength(2)
    expect(duped[0].id).not.toBe('id-1')
    expect(duped[0].name).toBe('speed_copy')
    expect(duped[1].name).toBe('volume_copy')
    expect(duped[0].default).toBe(5)
    expect(duped[1].default).toBe(100)
  })

  it('handles empty array', () => {
    expect(duplicateParams([])).toEqual([])
  })

  it('does not accumulate _copy suffixes on re-duplication', () => {
    const params = [makeParam({ name: 'speed_copy' })]
    const duped = duplicateParams(params)
    expect(duped[0].name).toBe('speed_copy')
    const duped2 = duplicateParams(duped)
    expect(duped2[0].name).toBe('speed_copy')
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
    const duped = duplicateParams(params)
    expect(duped[0].text).toBe('Test')
    expect(duped[0].desc).toBe('A description')
    expect(duped[0].type).toBe('number')
    expect(duped[0].min).toBe(0)
    expect(duped[0].max).toBe(10)
  })
})
