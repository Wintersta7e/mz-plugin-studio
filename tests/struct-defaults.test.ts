import { describe, it, expect } from 'vitest'
import {
  buildStructDefault,
  parseStructDefault,
  validateStructDefault,
  fillFromStructDefaults
} from '../src/renderer/src/lib/struct-defaults'
import type { PluginParameter, PluginStruct } from '../src/renderer/src/types/plugin'

function makeStruct(fields: Partial<PluginParameter>[]): PluginStruct {
  return {
    id: 's1',
    name: 'TestStruct',
    parameters: fields.map((f, i) => ({
      id: `f${i}`,
      name: f.name || `field${i}`,
      text: f.text || f.name || `field${i}`,
      desc: '',
      type: f.type || 'string',
      default: f.default ?? '',
      ...f
    })) as PluginParameter[]
  }
}

describe('buildStructDefault', () => {
  it('builds JSON from field values — all values are strings', () => {
    const struct = makeStruct([
      { name: 'x', type: 'number', default: 0 },
      { name: 'y', type: 'number', default: 0 }
    ])
    const values = { x: '100', y: '200' }
    expect(buildStructDefault(struct, values)).toBe('{"x":"100","y":"200"}')
  })

  it('builds JSON with boolean string values', () => {
    const struct = makeStruct([{ name: 'visible', type: 'boolean', default: true }])
    const values = { visible: 'true' }
    expect(buildStructDefault(struct, values)).toBe('{"visible":"true"}')
  })

  it('omits fields with empty string values', () => {
    const struct = makeStruct([
      { name: 'name', type: 'string', default: '' },
      { name: 'x', type: 'number', default: 0 }
    ])
    const values = { name: '', x: '50' }
    expect(buildStructDefault(struct, values)).toBe('{"x":"50"}')
  })

  it('returns empty string when all fields empty', () => {
    const struct = makeStruct([{ name: 'a' }])
    const values = { a: '' }
    expect(buildStructDefault(struct, values)).toBe('')
  })
})

describe('parseStructDefault', () => {
  it('parses valid JSON into field values', () => {
    const result = parseStructDefault('{"x":"100","y":"200"}')
    expect(result).toEqual({ x: '100', y: '200' })
  })

  it('returns empty object for empty string', () => {
    expect(parseStructDefault('')).toEqual({})
  })

  it('returns empty object for invalid JSON', () => {
    expect(parseStructDefault('not json')).toEqual({})
  })

  it('returns empty object for empty JSON object', () => {
    expect(parseStructDefault('{}')).toEqual({})
  })

  it('coerces non-string values to strings', () => {
    const result = parseStructDefault('{"x":100,"flag":true}')
    expect(result).toEqual({ x: '100', flag: 'true' })
  })
})

describe('validateStructDefault', () => {
  it('returns valid for matching fields', () => {
    const struct = makeStruct([
      { name: 'x', type: 'number' },
      { name: 'y', type: 'number' }
    ])
    const result = validateStructDefault('{"x":"100","y":"200"}', struct)
    expect(result.status).toBe('valid')
    expect(result.errors).toEqual([])
  })

  it('returns valid for empty default', () => {
    const struct = makeStruct([{ name: 'x' }])
    const result = validateStructDefault('', struct)
    expect(result.status).toBe('valid')
  })

  it('returns error for malformed JSON', () => {
    const struct = makeStruct([{ name: 'x' }])
    const result = validateStructDefault('{bad json', struct)
    expect(result.status).toBe('error')
    expect(result.errors[0]).toContain('Invalid JSON')
  })

  it('returns warning for unknown keys', () => {
    const struct = makeStruct([{ name: 'x' }])
    const result = validateStructDefault('{"x":"1","z":"2"}', struct)
    expect(result.status).toBe('warning')
    expect(result.errors[0]).toContain('z')
  })

  it('returns valid for JSON object {}', () => {
    const struct = makeStruct([{ name: 'x' }])
    const result = validateStructDefault('{}', struct)
    expect(result.status).toBe('valid')
  })
})

describe('fillFromStructDefaults', () => {
  it('builds values from each field default', () => {
    const struct = makeStruct([
      { name: 'x', type: 'number', default: 100 },
      { name: 'y', type: 'number', default: 200 },
      { name: 'visible', type: 'boolean', default: true }
    ])
    const result = fillFromStructDefaults(struct)
    expect(result).toEqual({ x: '100', y: '200', visible: 'true' })
  })

  it('skips fields with no meaningful default', () => {
    const struct = makeStruct([
      { name: 'name', type: 'string', default: '' },
      { name: 'x', type: 'number', default: 50 }
    ])
    const result = fillFromStructDefaults(struct)
    expect(result).toEqual({ x: '50' })
  })
})
