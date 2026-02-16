import { describe, it, expect } from 'vitest'
import {
  serializeParams,
  deserializeParams,
  duplicateParams
} from '../src/renderer/src/lib/param-io'
import type { PluginParameter } from '../src/renderer/src/types/plugin'

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
    const result = deserializeParams(content)
    expect(result.success).toBe(true)
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
    const result = deserializeParams(content)
    expect(result.parameters[0].id).not.toBe(originalId)
  })

  it('rejects invalid JSON with specific message', () => {
    const result = deserializeParams('not json at all')
    expect(result.success).toBe(false)
    expect(result.error).toContain('not valid JSON')
  })

  it('rejects missing version field', () => {
    const content = JSON.stringify({ parameters: [] })
    const result = deserializeParams(content)
    expect(result.success).toBe(false)
    expect(result.error).toContain('Invalid or unsupported')
  })

  it('rejects unsupported version', () => {
    const content = JSON.stringify({ version: 2, parameters: [makeParam()] })
    const result = deserializeParams(content)
    expect(result.success).toBe(false)
    expect(result.error).toContain('Invalid or unsupported')
  })

  it('rejects missing parameters array', () => {
    const content = JSON.stringify({ version: 1 })
    const result = deserializeParams(content)
    expect(result.success).toBe(false)
    expect(result.error).toContain('Invalid or unsupported')
  })

  it('filters out malformed parameter entries', () => {
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
    const result = deserializeParams(content)
    expect(result.success).toBe(true)
    expect(result.parameters).toHaveLength(2)
    expect(result.parameters[0].name).toBe('valid')
    expect(result.parameters[1].name).toBe('alsoValid')
  })

  it('returns specific error for invalid JSON', () => {
    const result = deserializeParams('not json at all {{{')
    expect(result.success).toBe(false)
    expect(result.error).toContain('not valid JSON')
  })

  it('defaults source to Unknown when missing', () => {
    const content = JSON.stringify({
      version: 1,
      exportedAt: '2026-01-01',
      parameters: [makeParam()]
    })
    const result = deserializeParams(content)
    expect(result.success).toBe(true)
    expect(result.source).toBe('Unknown')
  })

  it('handles multiple parameters', () => {
    const content = JSON.stringify({
      version: 1,
      source: 'Multi',
      exportedAt: '2026-01-01',
      parameters: [
        makeParam({ name: 'a' }),
        makeParam({ name: 'b' }),
        makeParam({ name: 'c' })
      ]
    })
    const result = deserializeParams(content)
    expect(result.success).toBe(true)
    expect(result.parameters).toHaveLength(3)
    expect(result.parameters[0].name).toBe('a')
    expect(result.parameters[2].name).toBe('c')
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
