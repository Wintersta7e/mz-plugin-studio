// Tests for validation — extended checks
import { describe, it, expect } from 'vitest'
import { validatePlugin } from '../src/renderer/src/lib/generator/index'
import type { PluginDefinition } from '../src/renderer/src/types/plugin'

function createTestPlugin(overrides: Partial<PluginDefinition> = {}): PluginDefinition {
  return {
    id: 'test-id',
    meta: {
      name: 'TestPlugin',
      version: '1.0.0',
      author: 'TestAuthor',
      description: 'A test plugin',
      help: '',
      url: '',
      target: 'MZ',
      dependencies: [],
      orderAfter: [],
      localizations: {},
      ...overrides.meta
    },
    parameters: overrides.parameters ?? [],
    commands: overrides.commands ?? [],
    structs: overrides.structs ?? [],
    customCode: overrides.customCode,
    codeBody: overrides.codeBody
  }
}

describe('validation - existing checks', () => {
  it('valid plugin returns no errors', () => {
    const plugin = createTestPlugin({
      parameters: [
        { id: '1', name: 'hp', text: 'HP', desc: 'Health', type: 'number', default: 100 }
      ],
      commands: [
        { id: '1', name: 'Heal', text: 'Heal', desc: 'Heal actor', args: [] }
      ]
    })
    const result = validatePlugin(plugin)
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('empty name returns error', () => {
    const plugin = createTestPlugin({
      meta: { name: '', version: '1.0.0', author: '', description: '', help: '', url: '', target: '', dependencies: [], orderAfter: [], localizations: {} }
    })
    const result = validatePlugin(plugin)
    expect(result.valid).toBe(false)
    expect(result.errors.length).toBeGreaterThan(0)
  })

  it('duplicate param names return error', () => {
    const plugin = createTestPlugin({
      parameters: [
        { id: '1', name: 'alpha', text: 'A', desc: '', type: 'string', default: '' },
        { id: '2', name: 'alpha', text: 'A2', desc: '', type: 'string', default: '' }
      ]
    })
    const result = validatePlugin(plugin)
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('Duplicate parameter name: alpha'))).toBe(true)
  })

  it('duplicate command names return error', () => {
    const plugin = createTestPlugin({
      commands: [
        { id: '1', name: 'Action', text: 'A', desc: '', args: [] },
        { id: '2', name: 'Action', text: 'A2', desc: '', args: [] }
      ]
    })
    const result = validatePlugin(plugin)
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('Duplicate command name: Action'))).toBe(true)
  })

  it('undefined struct reference returns warning', () => {
    const plugin = createTestPlugin({
      parameters: [
        { id: '1', name: 'data', text: 'Data', desc: '', type: 'struct', default: '{}', structType: 'MissingStruct' }
      ]
    })
    const result = validatePlugin(plugin)
    expect(result.warnings.some(w => w.includes('MissingStruct'))).toBe(true)
  })

  it('defined struct reference does not return warning', () => {
    const plugin = createTestPlugin({
      parameters: [
        { id: '1', name: 'data', text: 'Data', desc: '', type: 'struct', default: '{}', structType: 'Position' }
      ],
      structs: [
        { id: 's1', name: 'Position', parameters: [] }
      ]
    })
    const result = validatePlugin(plugin)
    expect(result.warnings.every(w => !w.includes('Position'))).toBe(true)
  })
})

describe('validation - parameter name warnings', () => {
  it('warns for non-identifier parameter names', () => {
    const plugin = createTestPlugin({
      parameters: [
        { id: '1', name: 'my param', text: 'Test', desc: '', type: 'string', default: '' }
      ]
    })
    const result = validatePlugin(plugin)
    expect(result.warnings.some(w => w.includes('my param'))).toBe(true)
  })

  it('does not warn for section divider parameters', () => {
    const plugin = createTestPlugin({
      parameters: [
        { id: '1', name: '---Settings---', text: 'Settings', desc: '', type: 'string', default: '' }
      ]
    })
    const result = validatePlugin(plugin)
    expect(result.warnings.every(w => !w.includes('---Settings---'))).toBe(true)
  })
})

describe('validation - empty parameter name', () => {
  it('returns error for empty parameter name', () => {
    const plugin = createTestPlugin({
      parameters: [
        { id: '1', name: '', text: 'Empty', desc: '', type: 'string', default: '' }
      ]
    })
    const result = validatePlugin(plugin)
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('empty'))).toBe(true)
  })
})
