// Tests for auto-documentation help text generation
import { describe, it, expect } from 'vitest'
import { generateHelpText } from '../src/renderer/src/lib/exportFormats'
import type { PluginDefinition } from '../src/renderer/src/types/plugin'

function createMinimalPlugin(
  metaOverrides: Partial<PluginDefinition['meta']> = {}
): PluginDefinition {
  return {
    id: 'test-id',
    meta: {
      name: 'NewPlugin',
      version: '1.0.0',
      author: '',
      description: '',
      help: '',
      url: '',
      target: 'MZ',
      dependencies: [],
      orderAfter: [],
      localizations: {},
      ...metaOverrides
    },
    parameters: [],
    commands: [],
    structs: []
  }
}

describe('generateHelpText', () => {
  it('generates title block with name, version, author', () => {
    const plugin = createMinimalPlugin({
      name: 'TestPlugin',
      version: '2.0.0',
      author: 'TestAuthor'
    })
    const help = generateHelpText(plugin)
    expect(help).toContain('TestPlugin v2.0.0')
    expect(help).toContain('by TestAuthor')
  })

  it('includes description when present', () => {
    const plugin = createMinimalPlugin({ description: 'A test plugin description' })
    const help = generateHelpText(plugin)
    expect(help).toContain('A test plugin description')
  })

  it('omits description line when empty', () => {
    const plugin = createMinimalPlugin({ description: '' })
    const help = generateHelpText(plugin)
    // After the title block's closing === line, the next non-empty section should be changelog
    // (since there are no params/commands/structs/deps)
    const lines = help.split('\n')
    const titleEnd = lines.findIndex((l, i) => i > 0 && l.startsWith('===='))
    // Next line after title block should be empty (spacing before changelog)
    expect(lines[titleEnd + 1]).toBe('')
  })

  it('includes parameters section with type info and defaults', () => {
    const plugin = createMinimalPlugin()
    plugin.parameters = [
      {
        id: '1',
        name: 'speed',
        text: 'Movement Speed',
        desc: 'How fast the player moves',
        type: 'number',
        default: 5,
        min: 1,
        max: 10
      }
    ]
    const help = generateHelpText(plugin)
    expect(help).toContain('Parameters')
    expect(help).toContain('Movement Speed (number, min: 1, max: 10)')
    expect(help).toContain('Default: 5')
  })

  it('skips parameters section when no parameters', () => {
    const plugin = createMinimalPlugin()
    plugin.parameters = []
    const help = generateHelpText(plugin)
    expect(help).not.toContain('Parameters')
  })

  it('skips nested (child) parameters', () => {
    const plugin = createMinimalPlugin()
    plugin.parameters = [
      { id: '1', name: 'parentParam', text: 'Parent', desc: '', type: 'string', default: '' },
      {
        id: '2',
        name: 'childParam',
        text: 'Child',
        desc: '',
        type: 'number',
        default: 0,
        parent: 'parentParam'
      }
    ]
    const help = generateHelpText(plugin)
    expect(help).toContain('Parent')
    expect(help).not.toContain('Child')
  })

  it('includes commands section with arguments', () => {
    const plugin = createMinimalPlugin()
    plugin.commands = [
      {
        id: '1',
        name: 'SetSpeed',
        text: 'Set Speed',
        desc: 'Changes movement speed',
        args: [
          {
            id: 'a1',
            name: 'value',
            text: 'Speed Value',
            desc: 'The new speed',
            type: 'number',
            default: 5
          }
        ]
      }
    ]
    const help = generateHelpText(plugin)
    expect(help).toContain('Plugin Commands')
    expect(help).toContain('Set Speed')
    expect(help).toContain('Speed Value (number) - The new speed')
  })

  it('includes structs section with field list', () => {
    const plugin = createMinimalPlugin()
    plugin.structs = [
      {
        id: '1',
        name: 'PositionData',
        parameters: [
          { id: 'p1', name: 'x', text: 'X', desc: '', type: 'number', default: 0 },
          { id: 'p2', name: 'y', text: 'Y', desc: '', type: 'number', default: 0 }
        ]
      }
    ]
    const help = generateHelpText(plugin)
    expect(help).toContain('Structs')
    expect(help).toContain('PositionData')
    expect(help).toContain('X (number), Y (number)')
  })

  it('includes dependencies when present', () => {
    const plugin = createMinimalPlugin()
    plugin.meta.dependencies = ['PluginBase', 'CoreEngine']
    plugin.meta.orderAfter = ['SomePlugin']
    const help = generateHelpText(plugin)
    expect(help).toContain('Dependencies')
    expect(help).toContain('Required: PluginBase, CoreEngine')
    expect(help).toContain('Load After: SomePlugin')
  })

  it('omits dependencies section when none', () => {
    const plugin = createMinimalPlugin()
    plugin.meta.dependencies = []
    plugin.meta.orderAfter = []
    const help = generateHelpText(plugin)
    expect(help).not.toContain('Dependencies')
  })

  it('always includes changelog stub', () => {
    const plugin = createMinimalPlugin({ version: '3.0.0' })
    const help = generateHelpText(plugin)
    expect(help).toContain('Changelog')
    expect(help).toContain('v3.0.0 - Initial release')
  })

  it('handles empty plugin gracefully (only title + changelog)', () => {
    const plugin = createMinimalPlugin()
    plugin.parameters = []
    plugin.commands = []
    plugin.structs = []
    plugin.meta.dependencies = []
    plugin.meta.orderAfter = []
    plugin.meta.description = ''
    const help = generateHelpText(plugin)
    expect(help).toContain('NewPlugin v1.0.0')
    expect(help).toContain('Changelog')
    expect(help).not.toContain('Parameters')
    expect(help).not.toContain('Plugin Commands')
    expect(help).not.toContain('Structs')
    expect(help).not.toContain('Dependencies')
  })

  it('skips section divider parameters', () => {
    const plugin = createMinimalPlugin()
    plugin.parameters = [
      {
        id: '1',
        name: '--- Visual Settings ---',
        text: '--- Visual Settings ---',
        desc: '',
        type: 'string',
        default: ''
      },
      {
        id: '2',
        name: 'opacity',
        text: 'Opacity',
        desc: 'Window opacity',
        type: 'number',
        default: 255
      }
    ]
    const help = generateHelpText(plugin)
    expect(help).not.toContain('Visual Settings')
    expect(help).toContain('Opacity')
  })

  it('formats struct and array parameter types correctly', () => {
    const plugin = createMinimalPlugin()
    plugin.parameters = [
      {
        id: '1',
        name: 'data',
        text: 'Data',
        desc: '',
        type: 'struct',
        default: '{}',
        structType: 'MyStruct'
      },
      {
        id: '2',
        name: 'list',
        text: 'List',
        desc: '',
        type: 'array',
        default: '[]',
        arrayType: 'number'
      }
    ]
    const help = generateHelpText(plugin)
    expect(help).toContain('Data (struct<MyStruct>)')
    expect(help).toContain('List (number[])')
  })
})
