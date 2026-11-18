// A parameter export read back: every field of every parameter type returns as written, with a
// new id, for parameters generated over the whole range of each field.
import * as fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { deserializeParams, serializeParams } from '../../src/renderer/src/lib/param-io'
import {
  ALL_PARAM_TYPES,
  type ParamType,
  type PluginParameter
} from '../../src/shared/types/plugin'
import { propertyRuns } from '../helpers/property-runs'

const RUNS = propertyRuns('param-io')
const PARAM_TYPES = [...ALL_PARAM_TYPES].filter((type): type is ParamType =>
  ALL_PARAM_TYPES.has(type)
)

const text = fc.string({ unit: 'binary' })
// A number JSON writes as itself: JSON has no NaN, no infinity and no negative zero
const number = fc
  .double({ noNaN: true, noDefaultInfinity: true })
  .filter((value) => !Object.is(value, -0))

// A parameter of `type` with each optional field present or absent
const parameterOf = (type: ParamType): fc.Arbitrary<PluginParameter> =>
  fc.record(
    {
      id: fc.uuid(),
      name: text,
      text,
      desc: text,
      type: fc.constant(type),
      default: fc.oneof(text, number, fc.boolean()),
      min: number,
      max: number,
      decimals: number,
      // A plain object, as JSON reads one: a record may have no prototype
      options: fc.array(fc.record({ value: text, text }, { noNullPrototype: true })),
      structType: text,
      arrayType: fc.constantFrom(...PARAM_TYPES),
      dir: text,
      require: fc.boolean(),
      parent: text,
      rawType: text,
      onLabel: text,
      offLabel: text
    },
    { requiredKeys: ['id', 'name', 'text', 'desc', 'type', 'default'], noNullPrototype: true }
  )

// One parameter of each type, in an order of its own
const parameters = fc
  .tuple(...PARAM_TYPES.map((type) => parameterOf(type)))
  .chain((list) => fc.shuffledSubarray(list, { minLength: list.length }))

describe('parameter export properties', () => {
  it('generates a parameter of every type', () => {
    process.stdout.write(`param types ${String(PARAM_TYPES.length)}\n`)

    expect(PARAM_TYPES).toHaveLength(ALL_PARAM_TYPES.size)
    expect(PARAM_TYPES.length).toBeGreaterThan(0)
  })

  it('an export read back returns every parameter as written, with a new id', () => {
    expect.hasAssertions()

    fc.assert(
      fc.property(parameters, text, (list, source) => {
        const result = deserializeParams(serializeParams(list, source))
        const read = result.success ? result.parameters : []

        expect(result).toMatchObject({ success: true, skipped: [], dropped: [] })
        // Compared under the written ids, then the ids alone
        expect(read.map((p, index) => ({ ...p, id: list[index]?.id }))).toStrictEqual(list)
        expect(read.filter(({ id }, index) => id === list[index]?.id)).toStrictEqual([])
        expect(result.success && result.source).toBe(source === '' ? 'Unknown' : source)
      }),
      RUNS
    )
  })
})
