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
      commands: [{ id: '1', name: 'Heal', text: 'Heal', desc: 'Heal actor', args: [] }]
    })
    const result = validatePlugin(plugin)
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('empty name returns error', () => {
    const plugin = createTestPlugin({
      meta: {
        name: '',
        version: '1.0.0',
        author: '',
        description: '',
        help: '',
        url: '',
        target: '',
        dependencies: [],
        orderAfter: [],
        localizations: {}
      }
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
    expect(result.errors.some((e) => e.includes('Duplicate parameter name: alpha'))).toBe(true)
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
    expect(result.errors.some((e) => e.includes('Duplicate command name: Action'))).toBe(true)
  })

  it('undefined struct reference returns warning', () => {
    const plugin = createTestPlugin({
      parameters: [
        {
          id: '1',
          name: 'data',
          text: 'Data',
          desc: '',
          type: 'struct',
          default: '{}',
          structType: 'MissingStruct'
        }
      ]
    })
    const result = validatePlugin(plugin)
    expect(result.warnings.some((w) => w.includes('MissingStruct'))).toBe(true)
  })

  it('defined struct reference does not return warning', () => {
    const plugin = createTestPlugin({
      parameters: [
        {
          id: '1',
          name: 'data',
          text: 'Data',
          desc: '',
          type: 'struct',
          default: '{}',
          structType: 'Position'
        }
      ],
      structs: [{ id: 's1', name: 'Position', parameters: [] }]
    })
    const result = validatePlugin(plugin)
    expect(result.warnings.every((w) => !w.includes('Position'))).toBe(true)
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
    expect(result.warnings.some((w) => w.includes('my param'))).toBe(true)
  })

  it('does not warn for section divider parameters', () => {
    const plugin = createTestPlugin({
      parameters: [
        { id: '1', name: '---Settings---', text: 'Settings', desc: '', type: 'string', default: '' }
      ]
    })
    const result = validatePlugin(plugin)
    expect(result.warnings.every((w) => !w.includes('---Settings---'))).toBe(true)
  })
})

describe('validation - empty parameter name', () => {
  it('returns error for empty parameter name', () => {
    const plugin = createTestPlugin({
      parameters: [{ id: '1', name: '', text: 'Empty', desc: '', type: 'string', default: '' }]
    })
    const result = validatePlugin(plugin)
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('empty'))).toBe(true)
  })
})

describe('validation - new checks', () => {
  it('warns about unused struct definitions', () => {
    const plugin = createTestPlugin({
      structs: [{ id: 's1', name: 'Orphan', parameters: [] }]
    })
    const result = validatePlugin(plugin)
    expect(result.warnings.some((w) => w.includes('Orphan') && w.includes('not referenced'))).toBe(
      true
    )
  })

  it('does not warn about used struct definitions', () => {
    const plugin = createTestPlugin({
      parameters: [
        {
          id: '1',
          name: 'data',
          text: 'Data',
          desc: '',
          type: 'struct',
          default: '{}',
          structType: 'Used'
        }
      ],
      structs: [{ id: 's1', name: 'Used', parameters: [] }]
    })
    const result = validatePlugin(plugin)
    expect(result.warnings.every((w) => !w.includes('Used'))).toBe(true)
  })

  it('detects struct used in command args as referenced', () => {
    const plugin = createTestPlugin({
      commands: [
        {
          id: 'c1',
          name: 'Cmd',
          text: 'Cmd',
          desc: '',
          args: [
            {
              id: 'a1',
              name: 'data',
              text: 'Data',
              desc: '',
              type: 'struct',
              default: '{}',
              structType: 'CmdStruct'
            }
          ]
        }
      ],
      structs: [{ id: 's1', name: 'CmdStruct', parameters: [] }]
    })
    const result = validatePlugin(plugin)
    expect(result.warnings.every((w) => !w.includes('CmdStruct'))).toBe(true)
  })

  it('errors on parameter referencing nonexistent parent', () => {
    const plugin = createTestPlugin({
      parameters: [
        {
          id: '1',
          name: 'child',
          text: 'Child',
          desc: '',
          type: 'string',
          default: '',
          parent: 'nonExistentParent'
        }
      ]
    })
    const result = validatePlugin(plugin)
    expect(result.valid).toBe(false)
    expect(
      result.errors.some((e) => e.includes('nonexistent parent') && e.includes('nonExistentParent'))
    ).toBe(true)
  })

  it('does not error on parameter with valid parent', () => {
    const plugin = createTestPlugin({
      parameters: [
        { id: '1', name: 'parentParam', text: 'Parent', desc: '', type: 'string', default: '' },
        {
          id: '2',
          name: 'child',
          text: 'Child',
          desc: '',
          type: 'string',
          default: '',
          parent: 'parentParam'
        }
      ]
    })
    const result = validatePlugin(plugin)
    expect(result.errors.every((e) => !e.includes('nonexistent parent'))).toBe(true)
  })

  it('warns about commands with no implementation in custom code', () => {
    const plugin = createTestPlugin({
      commands: [{ id: '1', name: 'Unimplemented', text: 'Test', desc: '', args: [] }],
      customCode: '// some code that does not mention the command'
    })
    const result = validatePlugin(plugin)
    expect(
      result.warnings.some((w) => w.includes('Unimplemented') && w.includes('no implementation'))
    ).toBe(true)
  })

  it('does not warn about implemented commands', () => {
    const plugin = createTestPlugin({
      commands: [{ id: '1', name: 'Implemented', text: 'Test', desc: '', args: [] }],
      customCode: "PluginManager.registerCommand(PLUGIN_NAME, 'Implemented', function(args) {});"
    })
    const result = validatePlugin(plugin)
    expect(result.warnings.every((w) => !w.includes('Implemented'))).toBe(true)
  })

  it('does not warn about unimplemented commands when no custom code exists', () => {
    const plugin = createTestPlugin({
      commands: [{ id: '1', name: 'NoCode', text: 'Test', desc: '', args: [] }]
    })
    const result = validatePlugin(plugin)
    expect(result.warnings.every((w) => !w.includes('no implementation'))).toBe(true)
  })
})
