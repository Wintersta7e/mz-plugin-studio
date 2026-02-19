// Tests for generator
import { describe, it, expect } from 'vitest'
import {
  generatePlugin,
  validatePlugin,
  camelCase,
  generateHeaderOnly
} from '../src/renderer/src/lib/generator/index'
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

describe('generatePlugin', () => {
  it('generates minimal plugin header', () => {
    const plugin = createTestPlugin()
    const output = generatePlugin(plugin)
    expect(output).toContain('/*:')
    expect(output).toContain('@target MZ')
    expect(output).toContain('@plugindesc A test plugin')
    expect(output).toContain('@author TestAuthor')
    expect(output).toContain('*/')
    expect(output).toContain('(() => {')
    expect(output).toContain("'use strict';")
    expect(output).toContain('})();')
  })

  it('generates plugin with string parameter', () => {
    const plugin = createTestPlugin({
      parameters: [
        {
          id: 'p1',
          name: 'greeting',
          text: 'Greeting',
          desc: 'The greeting message',
          type: 'string',
          default: 'Hello'
        }
      ]
    })
    const output = generatePlugin(plugin)
    expect(output).toContain('@param greeting')
    expect(output).toContain('@text Greeting')
    expect(output).toContain('@desc The greeting message')
    expect(output).toContain('@type string')
    expect(output).toContain('@default Hello')
    expect(output).toContain("params['greeting']")
  })

  it('generates plugin with number parameter including min/max', () => {
    const plugin = createTestPlugin({
      parameters: [
        {
          id: 'p1',
          name: 'speed',
          text: 'Speed',
          desc: 'Movement speed',
          type: 'number',
          default: 5,
          min: 1,
          max: 10,
          decimals: 2
        }
      ]
    })
    const output = generatePlugin(plugin)
    expect(output).toContain('@type number')
    expect(output).toContain('@min 1')
    expect(output).toContain('@max 10')
    expect(output).toContain('@decimals 2')
    expect(output).toContain('@default 5')
  })

  it('generates plugin with boolean parameter', () => {
    const plugin = createTestPlugin({
      parameters: [
        {
          id: 'p1',
          name: 'enabled',
          text: 'Enabled',
          desc: 'Enable feature',
          type: 'boolean',
          default: true,
          onLabel: 'Yes',
          offLabel: 'No'
        }
      ]
    })
    const output = generatePlugin(plugin)
    expect(output).toContain('@type boolean')
    expect(output).toContain('@on Yes')
    expect(output).toContain('@off No')
    expect(output).toContain('@default true')
  })

  it('generates plugin with select parameter', () => {
    const plugin = createTestPlugin({
      parameters: [
        {
          id: 'p1',
          name: 'mode',
          text: 'Mode',
          desc: 'Select mode',
          type: 'select',
          default: 'auto',
          options: [
            { value: 'auto', text: 'Automatic' },
            { value: 'manual', text: 'Manual' }
          ]
        }
      ]
    })
    const output = generatePlugin(plugin)
    expect(output).toContain('@type select')
    expect(output).toContain('@option Automatic')
    expect(output).toContain('@value auto')
    expect(output).toContain('@option Manual')
    expect(output).toContain('@value manual')
  })

  it('generates plugin with commands', () => {
    const plugin = createTestPlugin({
      commands: [
        {
          id: 'c1',
          name: 'DoThing',
          text: 'Do Thing',
          desc: 'Does a thing',
          args: [
            {
              id: 'a1',
              name: 'target',
              text: 'Target',
              desc: 'The target',
              type: 'actor',
              default: 1
            }
          ]
        }
      ]
    })
    const output = generatePlugin(plugin)
    expect(output).toContain('@command DoThing')
    expect(output).toContain('@text Do Thing')
    expect(output).toContain('@arg target')
    expect(output).toContain("registerCommand(PLUGIN_NAME, 'DoThing'")
  })

  it('generates plugin with @base and @orderAfter', () => {
    const plugin = createTestPlugin({
      meta: {
        name: 'TestPlugin',
        version: '1.0.0',
        author: 'Test',
        description: 'Test',
        help: '',
        url: '',
        target: 'MZ',
        dependencies: ['BasePlugin'],
        orderAfter: ['BasePlugin'],
        localizations: {}
      }
    })
    const output = generatePlugin(plugin)
    expect(output).toContain('@base BasePlugin')
    expect(output).toContain('@orderAfter BasePlugin')
  })

  it('preserves custom code', () => {
    const plugin = createTestPlugin({
      customCode: '// My custom code\nconsole.log("hello");'
    })
    const output = generatePlugin(plugin)
    expect(output).toContain('// My custom code')
    expect(output).toContain('console.log("hello")')
  })

  it('generates syntactically valid JavaScript', () => {
    const plugin = createTestPlugin({
      parameters: [
        {
          id: 'p1',
          name: 'x',
          text: 'X',
          desc: '',
          type: 'number',
          default: 0
        }
      ],
      commands: [
        {
          id: 'c1',
          name: 'Cmd',
          text: 'Cmd',
          desc: '',
          args: []
        }
      ]
    })
    const output = generatePlugin(plugin)
    // Basic syntax check: matching braces, parens
    const braces = output.split('{').length - output.split('}').length
    const parens = output.split('(').length - output.split(')').length
    expect(braces).toBe(0)
    expect(parens).toBe(0)
  })

  it('generates struct definition blocks', () => {
    const plugin = createTestPlugin({
      structs: [
        {
          id: 's1',
          name: 'Position',
          parameters: [
            { id: 'sp1', name: 'x', text: 'X', desc: '', type: 'number', default: 0 },
            { id: 'sp2', name: 'y', text: 'Y', desc: '', type: 'number', default: 0 }
          ]
        }
      ]
    })
    const output = generatePlugin(plugin)
    expect(output).toContain('/*~struct~Position:')
    expect(output).toContain('@param x')
    expect(output).toContain('@param y')
  })

  it('skips command body generation when command already in customCode', () => {
    const plugin = createTestPlugin({
      commands: [
        {
          id: 'c1',
          name: 'MyCmd',
          text: 'My Cmd',
          desc: '',
          args: []
        }
      ],
      customCode:
        "PluginManager.registerCommand(PLUGIN_NAME, 'MyCmd', function(args) { /* custom */ });"
    })
    const output = generatePlugin(plugin)
    // The header should have the @command
    expect(output).toContain('@command MyCmd')
    // But the body should not duplicate the registerCommand (it's in customCode)
    const bodySection = output.split('Custom Plugin Code')[0]
    const registerCalls = bodySection.match(/registerCommand\(PLUGIN_NAME, 'MyCmd'/g) || []
    expect(registerCalls).toHaveLength(0)
  })
})

describe('generateHeaderOnly', () => {
  it('generates only the header without body', () => {
    const plugin = createTestPlugin()
    const header = generateHeaderOnly(plugin)
    expect(header).toContain('/*:')
    expect(header).toContain('*/')
    expect(header).not.toContain('(() => {')
  })
})

describe('camelCase', () => {
  it('converts simple names', () => {
    expect(camelCase('hello')).toBe('hello')
    expect(camelCase('Hello')).toBe('hello')
  })

  it('converts multi-word names', () => {
    expect(camelCase('battle speed')).toBe('battleSpeed')
    expect(camelCase('Max HP')).toBe('maxHP')
  })

  it('handles special characters', () => {
    expect(camelCase('my-param')).toBe('myParam')
    expect(camelCase('my_param')).toBe('myParam')
  })

  it('handles empty string', () => {
    expect(camelCase('')).toBe('unnamed')
  })
})

describe('validatePlugin', () => {
  it('returns valid for correct plugin', () => {
    const plugin = createTestPlugin()
    const result = validatePlugin(plugin)
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('returns error for missing plugin name', () => {
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
    expect(result.errors.some((e) => e.includes('name'))).toBe(true)
  })

  it('returns error for invalid plugin name', () => {
    const plugin = createTestPlugin({
      meta: {
        name: '123bad',
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
  })

  it('returns error for duplicate parameter names', () => {
    const plugin = createTestPlugin({
      parameters: [
        { id: '1', name: 'foo', text: 'Foo', desc: '', type: 'string', default: '' },
        { id: '2', name: 'foo', text: 'Foo2', desc: '', type: 'string', default: '' }
      ]
    })
    const result = validatePlugin(plugin)
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('Duplicate parameter'))).toBe(true)
  })

  it('returns error for duplicate command names', () => {
    const plugin = createTestPlugin({
      commands: [
        { id: '1', name: 'Cmd', text: 'Cmd', desc: '', args: [] },
        { id: '2', name: 'Cmd', text: 'Cmd2', desc: '', args: [] }
      ]
    })
    const result = validatePlugin(plugin)
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('Duplicate command'))).toBe(true)
  })

  it('returns warning for undefined struct reference', () => {
    const plugin = createTestPlugin({
      parameters: [
        {
          id: '1',
          name: 'data',
          text: 'Data',
          desc: '',
          type: 'struct',
          default: '{}',
          structType: 'NonExistent'
        }
      ]
    })
    const result = validatePlugin(plugin)
    expect(result.warnings.some((w) => w.includes('NonExistent'))).toBe(true)
  })

  it('returns error for invalid command name', () => {
    const plugin = createTestPlugin({
      commands: [{ id: '1', name: 'bad command', text: 'Bad', desc: '', args: [] }]
    })
    const result = validatePlugin(plugin)
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('Invalid command name'))).toBe(true)
  })

  it('returns error for duplicate command arg names', () => {
    const plugin = createTestPlugin({
      commands: [
        {
          id: '1',
          name: 'Cmd',
          text: 'Cmd',
          desc: '',
          args: [
            { id: 'a1', name: 'x', text: 'X', desc: '', type: 'number', default: 0 },
            { id: 'a2', name: 'x', text: 'X2', desc: '', type: 'number', default: 0 }
          ]
        }
      ]
    })
    const result = validatePlugin(plugin)
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('Duplicate argument'))).toBe(true)
  })
})
