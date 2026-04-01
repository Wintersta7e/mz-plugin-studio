// Tests for export format generators (plugins.json entry, .d.ts, README)
import { describe, it, expect } from 'vitest'
import {
  generatePluginsJsonEntry,
  generateTypeDeclaration,
  generateReadme
} from '../src/renderer/src/lib/exportFormats'
import type {
  PluginDefinition,
  PluginParameter,
  PluginCommand,
  ParamType
} from '../src/renderer/src/types/plugin'

function createMinimalPlugin(
  overrides: Partial<PluginDefinition> & {
    metaOverrides?: Partial<PluginDefinition['meta']>
  } = {}
): PluginDefinition {
  const { metaOverrides, ...rest } = overrides
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
      ...metaOverrides
    },
    parameters: [],
    commands: [],
    structs: [],
    ...rest
  }
}

function makeParam(overrides: Partial<PluginParameter> = {}): PluginParameter {
  return {
    id: 'param-' + (overrides.name ?? 'default'),
    name: 'testParam',
    text: 'Test Param',
    desc: 'A test parameter',
    type: 'string',
    default: '',
    ...overrides
  }
}

function makeCommand(overrides: Partial<PluginCommand> = {}): PluginCommand {
  return {
    id: 'cmd-' + (overrides.name ?? 'default'),
    name: 'testCommand',
    text: 'Test Command',
    desc: 'A test command',
    args: [],
    ...overrides
  }
}

// --------------------------------------------------------------------------
// generatePluginsJsonEntry
// --------------------------------------------------------------------------
describe('generatePluginsJsonEntry', () => {
  it('generates valid JSON with plugin name, status, description, and parameters', () => {
    const plugin = createMinimalPlugin({
      parameters: [
        makeParam({ name: 'speed', text: 'Speed', type: 'number', default: 5 }),
        makeParam({ name: 'label', text: 'Label', type: 'string', default: 'Hello' })
      ]
    })

    const result = generatePluginsJsonEntry(plugin)
    const parsed = JSON.parse(result)

    expect(parsed.name).toBe('TestPlugin')
    expect(parsed.status).toBe(true)
    expect(parsed.description).toBe('A test plugin')
    expect(parsed.parameters).toEqual({ speed: '5', label: 'Hello' })
  })

  it('generates empty parameters object for plugin with no params', () => {
    const plugin = createMinimalPlugin()
    const parsed = JSON.parse(generatePluginsJsonEntry(plugin))

    expect(parsed.parameters).toEqual({})
  })

  it('skips nested parameters (those with parent field)', () => {
    const plugin = createMinimalPlugin({
      parameters: [
        makeParam({ name: 'topLevel', text: 'Top Level', default: 'visible' }),
        makeParam({ name: 'nested', text: 'Nested', default: 'hidden', parent: 'SomeStruct' })
      ]
    })

    const parsed = JSON.parse(generatePluginsJsonEntry(plugin))

    expect(parsed.parameters).toHaveProperty('topLevel')
    expect(parsed.parameters).not.toHaveProperty('nested')
  })

  it('stringifies boolean defaults correctly', () => {
    const plugin = createMinimalPlugin({
      parameters: [
        makeParam({ name: 'enabled', type: 'boolean', default: true }),
        makeParam({ name: 'disabled', type: 'boolean', default: false })
      ]
    })

    const parsed = JSON.parse(generatePluginsJsonEntry(plugin))

    expect(parsed.parameters.enabled).toBe('true')
    expect(parsed.parameters.disabled).toBe('false')
  })

  it('stringifies number defaults correctly', () => {
    const plugin = createMinimalPlugin({
      parameters: [
        makeParam({ name: 'count', type: 'number', default: 0 }),
        makeParam({ name: 'ratio', type: 'number', default: 3.14 })
      ]
    })

    const parsed = JSON.parse(generatePluginsJsonEntry(plugin))

    expect(parsed.parameters.count).toBe('0')
    expect(parsed.parameters.ratio).toBe('3.14')
  })

  it('handles empty string defaults', () => {
    const plugin = createMinimalPlugin({
      parameters: [makeParam({ name: 'emptyStr', type: 'string', default: '' })]
    })

    const parsed = JSON.parse(generatePluginsJsonEntry(plugin))

    expect(parsed.parameters.emptyStr).toBe('')
  })
})

// --------------------------------------------------------------------------
// generateTypeDeclaration
// --------------------------------------------------------------------------
describe('generateTypeDeclaration', () => {
  it('generates namespace with Parameters interface for a plugin with params', () => {
    const plugin = createMinimalPlugin({
      parameters: [
        makeParam({ name: 'speed', text: 'Speed', desc: 'Movement speed', type: 'number' }),
        makeParam({ name: 'name', text: 'Name', desc: 'Character name', type: 'string' })
      ]
    })

    const result = generateTypeDeclaration(plugin)

    expect(result).toContain('declare namespace TestPlugin {')
    expect(result).toContain('interface Parameters {')
    expect(result).toContain('/** Movement speed */')
    expect(result).toContain('speed: number')
    expect(result).toContain('/** Character name */')
    expect(result).toContain('name: string')
    expect(result).toContain('}')
  })

  it('generates empty namespace for plugin with no params or commands', () => {
    const plugin = createMinimalPlugin()
    const result = generateTypeDeclaration(plugin)

    expect(result).toContain('declare namespace TestPlugin {')
    expect(result).not.toContain('interface Parameters')
    expect(result).not.toContain('Args')
  })

  it('generates command arg interfaces', () => {
    const plugin = createMinimalPlugin({
      commands: [
        makeCommand({
          name: 'spawnEnemy',
          text: 'Spawn Enemy',
          args: [
            makeParam({
              name: 'enemyId',
              text: 'Enemy ID',
              desc: 'ID of the enemy',
              type: 'enemy'
            }),
            makeParam({ name: 'x', text: 'X Position', desc: 'X coord', type: 'number' })
          ]
        })
      ]
    })

    const result = generateTypeDeclaration(plugin)

    expect(result).toContain('interface spawnEnemyArgs {')
    expect(result).toContain('/** ID of the enemy */')
    expect(result).toContain('enemyId: number')
    expect(result).toContain('/** X coord */')
    expect(result).toContain('x: number')
  })

  it('skips command arg interface when command has no args', () => {
    const plugin = createMinimalPlugin({
      commands: [makeCommand({ name: 'resetAll', text: 'Reset All', args: [] })]
    })

    const result = generateTypeDeclaration(plugin)

    expect(result).not.toContain('interface resetAllArgs')
  })

  it('skips nested parameters in Parameters interface', () => {
    const plugin = createMinimalPlugin({
      parameters: [
        makeParam({ name: 'topLevel', text: 'Top', type: 'string' }),
        makeParam({ name: 'nestedField', text: 'Nested', type: 'number', parent: 'SomeStruct' })
      ]
    })

    const result = generateTypeDeclaration(plugin)

    expect(result).toContain('topLevel: string')
    expect(result).not.toContain('nestedField')
  })

  it('maps all numeric ID-based param types to number', () => {
    const numericTypes: ParamType[] = [
      'number',
      'variable',
      'switch',
      'actor',
      'class',
      'skill',
      'item',
      'weapon',
      'armor',
      'enemy',
      'troop',
      'state',
      'animation',
      'tileset',
      'common_event'
    ]

    const plugin = createMinimalPlugin({
      parameters: numericTypes.map((t) => makeParam({ name: `p_${t}`, text: `P ${t}`, type: t }))
    })

    const result = generateTypeDeclaration(plugin)

    for (const t of numericTypes) {
      expect(result).toContain(`p_${t}: number`)
    }
  })

  it('maps boolean type to boolean', () => {
    const plugin = createMinimalPlugin({
      parameters: [makeParam({ name: 'flag', type: 'boolean' })]
    })

    const result = generateTypeDeclaration(plugin)

    expect(result).toContain('flag: boolean')
  })

  it('maps struct type to Record<string, unknown>', () => {
    const plugin = createMinimalPlugin({
      parameters: [makeParam({ name: 'data', type: 'struct' })]
    })

    const result = generateTypeDeclaration(plugin)

    expect(result).toContain('data: Record<string, unknown>')
  })

  it('maps array type to unknown[]', () => {
    const plugin = createMinimalPlugin({
      parameters: [makeParam({ name: 'items', type: 'array' })]
    })

    const result = generateTypeDeclaration(plugin)

    expect(result).toContain('items: unknown[]')
  })

  it('maps string-like types (select, combo, note, text, file, etc.) to string', () => {
    const stringTypes: ParamType[] = [
      'string',
      'select',
      'combo',
      'note',
      'text',
      'hidden',
      'file',
      'color'
    ]

    const plugin = createMinimalPlugin({
      parameters: stringTypes.map((t) => makeParam({ name: `p_${t}`, text: `P ${t}`, type: t }))
    })

    const result = generateTypeDeclaration(plugin)

    for (const t of stringTypes) {
      expect(result).toContain(`p_${t}: string`)
    }
  })

  it('maps icon and map types to number (ID-based)', () => {
    const idTypes: ParamType[] = ['icon', 'map']

    const plugin = createMinimalPlugin({
      parameters: idTypes.map((t) => makeParam({ name: `p_${t}`, text: `P ${t}`, type: t }))
    })

    const result = generateTypeDeclaration(plugin)

    for (const t of idTypes) {
      expect(result).toContain(`p_${t}: number`)
    }
  })

  it('uses param text as description fallback when desc is empty', () => {
    const plugin = createMinimalPlugin({
      parameters: [makeParam({ name: 'myField', text: 'My Field Label', desc: '' })]
    })

    const result = generateTypeDeclaration(plugin)

    expect(result).toContain('/** My Field Label */')
  })

  it('includes version header comment', () => {
    const plugin = createMinimalPlugin({
      metaOverrides: { name: 'CoolPlugin', version: '2.5.0' }
    })

    const result = generateTypeDeclaration(plugin)

    expect(result).toContain('// Type declarations for CoolPlugin v2.5.0')
    expect(result).toContain('// Generated by MZ Plugin Studio')
  })
})

// --------------------------------------------------------------------------
// generateReadme
// --------------------------------------------------------------------------
describe('generateReadme', () => {
  it('generates a complete README for a plugin with params, commands, and structs', () => {
    const plugin = createMinimalPlugin({
      metaOverrides: {
        name: 'MyPlugin',
        version: '1.2.0',
        author: 'DevUser',
        description: 'A fancy plugin',
        help: 'See the wiki for details.',
        url: 'https://example.com/plugin'
      },
      parameters: [
        makeParam({
          name: 'speed',
          text: 'Speed',
          desc: 'Movement speed',
          type: 'number',
          default: 5
        })
      ],
      commands: [
        makeCommand({
          name: 'doThing',
          text: 'Do Thing',
          desc: 'Does a thing',
          args: [makeParam({ name: 'target', text: 'Target', desc: 'Target actor', type: 'actor' })]
        })
      ]
    })

    const result = generateReadme(plugin)

    expect(result).toContain('# MyPlugin')
    expect(result).toContain('**Version:** 1.2.0 | **Author:** DevUser | **Target:** MZ')
    expect(result).toContain('> A fancy plugin')
    expect(result).toContain('## Installation')
    expect(result).toContain('Download `MyPlugin.js`')
    expect(result).toContain('## Parameters')
    expect(result).toContain('| Speed | number | 5 | Movement speed |')
    expect(result).toContain('## Plugin Commands')
    expect(result).toContain('### Do Thing')
    expect(result).toContain('Does a thing')
    expect(result).toContain('| Target | actor | Target actor |')
    expect(result).toContain('## Additional Information')
    expect(result).toContain('See the wiki for details.')
    expect(result).toContain('## More Information')
    expect(result).toContain('https://example.com/plugin')
    expect(result).toContain('*Generated by [MZ Plugin Studio]')
  })

  it('generates minimal README for empty plugin', () => {
    const plugin = createMinimalPlugin({
      metaOverrides: { description: '', help: '', url: '' }
    })

    const result = generateReadme(plugin)

    expect(result).toContain('# TestPlugin')
    expect(result).toContain('## Installation')
    expect(result).not.toContain('## Parameters')
    expect(result).not.toContain('## Plugin Commands')
    expect(result).not.toContain('## Dependencies')
    expect(result).not.toContain('## Additional Information')
    expect(result).not.toContain('## More Information')
    expect(result).toContain('*Generated by [MZ Plugin Studio]')
  })

  it('skips nested parameters in the parameters table', () => {
    const plugin = createMinimalPlugin({
      parameters: [
        makeParam({ name: 'topLevel', text: 'Top Level', desc: 'Visible', default: 'yes' }),
        makeParam({
          name: 'child',
          text: 'Child',
          desc: 'Hidden',
          default: 'no',
          parent: 'SomeStruct'
        })
      ]
    })

    const result = generateReadme(plugin)

    expect(result).toContain('| Top Level |')
    expect(result).not.toContain('| Child |')
  })

  it('includes dependencies section when plugin has dependencies', () => {
    const plugin = createMinimalPlugin({
      metaOverrides: {
        dependencies: ['PluginA', 'PluginB']
      }
    })

    const result = generateReadme(plugin)

    expect(result).toContain('## Dependencies')
    expect(result).toContain('**Required plugins:**')
    expect(result).toContain('- PluginA')
    expect(result).toContain('- PluginB')
  })

  it('includes orderAfter section when present', () => {
    const plugin = createMinimalPlugin({
      metaOverrides: {
        orderAfter: ['CorePlugin', 'UtilPlugin']
      }
    })

    const result = generateReadme(plugin)

    expect(result).toContain('## Dependencies')
    expect(result).toContain('**Load order:** Must be placed after:')
    expect(result).toContain('- CorePlugin')
    expect(result).toContain('- UtilPlugin')
  })

  it('includes both dependencies and orderAfter together', () => {
    const plugin = createMinimalPlugin({
      metaOverrides: {
        dependencies: ['RequiredPlugin'],
        orderAfter: ['BeforeMe']
      }
    })

    const result = generateReadme(plugin)

    expect(result).toContain('**Required plugins:**')
    expect(result).toContain('- RequiredPlugin')
    expect(result).toContain('**Load order:** Must be placed after:')
    expect(result).toContain('- BeforeMe')
  })

  it('omits description blockquote when description is empty', () => {
    const plugin = createMinimalPlugin({
      metaOverrides: { description: '' }
    })

    const result = generateReadme(plugin)

    expect(result).not.toContain('> ')
  })

  it('omits commands section when no commands', () => {
    const plugin = createMinimalPlugin({ commands: [] })
    const result = generateReadme(plugin)

    expect(result).not.toContain('## Plugin Commands')
  })

  it('lists command without arguments table when args are empty', () => {
    const plugin = createMinimalPlugin({
      commands: [
        makeCommand({ name: 'reset', text: 'Reset All', desc: 'Resets everything', args: [] })
      ]
    })

    const result = generateReadme(plugin)

    expect(result).toContain('### Reset All')
    expect(result).toContain('Resets everything')
    expect(result).not.toContain('**Arguments:**')
  })

  it('omits help section when help is empty', () => {
    const plugin = createMinimalPlugin({ metaOverrides: { help: '' } })
    const result = generateReadme(plugin)

    expect(result).not.toContain('## Additional Information')
  })

  it('omits url section when url is empty', () => {
    const plugin = createMinimalPlugin({ metaOverrides: { url: '' } })
    const result = generateReadme(plugin)

    expect(result).not.toContain('## More Information')
  })
})

// COV-20: generatePluginsJsonEntry edge types
describe('generatePluginsJsonEntry - COV-20 edge types', () => {
  it('stringifies combo defaults to string', () => {
    const plugin = createMinimalPlugin({
      parameters: [makeParam({ name: 'mode', type: 'combo', default: 'auto' })]
    })
    const parsed = JSON.parse(generatePluginsJsonEntry(plugin))
    expect(parsed.parameters.mode).toBe('auto')
  })

  it('stringifies hidden defaults to string', () => {
    const plugin = createMinimalPlugin({
      parameters: [makeParam({ name: 'token', type: 'hidden', default: 'secret' })]
    })
    const parsed = JSON.parse(generatePluginsJsonEntry(plugin))
    expect(parsed.parameters.token).toBe('secret')
  })

  it('stringifies color defaults to string', () => {
    const plugin = createMinimalPlugin({
      parameters: [makeParam({ name: 'bg', type: 'color', default: '#ffffff' })]
    })
    const parsed = JSON.parse(generatePluginsJsonEntry(plugin))
    expect(parsed.parameters.bg).toBe('#ffffff')
  })
})
