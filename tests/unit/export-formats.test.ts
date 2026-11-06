// Tests for export format generators (plugins.json entry, .d.ts, README)
import { describe, it, expect } from 'vitest'
import ts from 'typescript'
import { PluginParser } from '../../src/main/services/pluginParser'
import {
  generatePluginsJsonEntry,
  generateTypeDeclaration,
  generateReadme,
  typeDeclaration
} from '../../src/renderer/src/lib/exportFormats'
import { generatePlugin } from '../../src/renderer/src/lib/generator'
import { GENERATOR_ENTRIES } from '../golden/corpus/generator'
import { conformanceCases, refusedCommandNames } from '../helpers/mz-conformance'
import type {
  PluginDefinition,
  PluginParameter,
  PluginCommand,
  ParamType
} from '../../src/renderer/src/types/plugin'

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

  it('writes nested parameters as top-level keys', () => {
    const plugin = createMinimalPlugin({
      parameters: [
        makeParam({ name: 'topLevel', text: 'Top Level', default: 'visible' }),
        makeParam({ name: 'nested', text: 'Nested', default: 'hidden', parent: 'topLevel' })
      ]
    })

    const parsed = JSON.parse(generatePluginsJsonEntry(plugin))

    expect(parsed.parameters).toEqual({ topLevel: 'visible', nested: 'hidden' })
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

  it('writes a parameter named __proto__ as a parameter', () => {
    const plugin = createMinimalPlugin({
      parameters: [makeParam({ name: '__proto__', default: 'a' }), makeParam({ name: 'speed' })]
    })
    const { parameters } = JSON.parse(generatePluginsJsonEntry(plugin))

    expect(Object.keys(parameters)).toEqual(['__proto__', 'speed'])
    expect(Object.getOwnPropertyDescriptor(parameters, '__proto__')?.value).toBe('a')
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

  it('declares nested parameters in Parameters interface', () => {
    const plugin = createMinimalPlugin({
      parameters: [
        makeParam({ name: 'topLevel', text: 'Top', type: 'string' }),
        makeParam({ name: 'nestedField', text: 'Nested', type: 'number', parent: 'topLevel' })
      ]
    })

    const result = generateTypeDeclaration(plugin)

    expect(result).toContain('topLevel: string')
    expect(result).toContain('nestedField: number')
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

// --------------------------------------------------------------------------
// Both exports against the header of the generated plugin, read back as the app imports it
// --------------------------------------------------------------------------
const DTS = 'plugin.d.ts'

/** The syntax errors of a declaration file, and the member names of each interface it declares. */
function declarations(text: string): {
  diagnostics: string[]
  interfaces: Record<string, string[]>
} {
  const options: ts.CompilerOptions = { noLib: true, noResolve: true, types: [] }
  const sf = ts.createSourceFile(DTS, text, ts.ScriptTarget.Latest, true)
  const host = ts.createCompilerHost(options)
  host.getSourceFile = (name) => (name === DTS ? sf : undefined)
  host.fileExists = (name) => name === DTS
  host.readFile = (name) => (name === DTS ? text : undefined)
  const diagnostics = ts
    .createProgram([DTS], options, host)
    .getSyntacticDiagnostics(sf)
    .map((d) => ts.flattenDiagnosticMessageText(d.messageText, '\n'))
  const interfaces: Record<string, string[]> = {}
  const visit = (node: ts.Node): void => {
    if (ts.isInterfaceDeclaration(node)) {
      interfaces[node.name.text] = node.members.flatMap((m) => {
        const name = m.name
        if (name === undefined) return []
        return [ts.isIdentifier(name) || ts.isStringLiteral(name) ? name.text : name.getText(sf)]
      })
    }
    ts.forEachChild(node, visit)
  }
  visit(sf)
  return { diagnostics, interfaces }
}

/** The member names of `interface Parameters` in a declaration file, and its syntax errors. */
function declaredParameters(text: string): { diagnostics: string[]; members: string[] } {
  const { diagnostics, interfaces } = declarations(text)
  return { diagnostics, members: interfaces.Parameters ?? [] }
}

/** The parameters the generated plugin's header declares, read back as the app imports them. */
const headerParameters = (code: string, fileName: string): PluginParameter[] =>
  PluginParser.parsePlugin(code, fileName).parameters

const storedValues = (parameters: PluginParameter[]): Record<string, string> =>
  Object.fromEntries(parameters.map((p) => [p.name, String(p.default)]))

describe('exports against the generated header', () => {
  const generated = conformanceCases().filter((c) => c.kind === 'generated')

  it('the plugins.json entry holds every parameter the header stores, with its value', () => {
    for (const c of generated) {
      const header = headerParameters(c.code, c.fileName)

      expect
        .soft(JSON.parse(generatePluginsJsonEntry(c.definition)).parameters, c.id)
        .toEqual(storedValues(header))
    }
    console.log(`plugins.json: ${generated.length} cases`)

    expect(generated.length).toBeGreaterThan(0)
  })

  // A command whose name is not an identifier gets no arguments interface: its name cannot name
  // one. The corpus's refused command names are none of them identifiers to TypeScript either
  it('the type declaration parses and declares every parameter and argument the header stores', () => {
    let skipped = 0
    for (const c of generated) {
      const refused = refusedCommandNames(c.definition)
      const header = PluginParser.parsePlugin(c.code, c.fileName)

      expect(header.commands, c.id).toHaveLength(c.definition.commands.length)

      const expected: Record<string, string[]> = {}
      if (header.parameters.length > 0) expected.Parameters = header.parameters.map((p) => p.name)
      header.commands.forEach((cmd, i) => {
        if (cmd.args.length === 0) return
        // The header's reading of a refused name is not the name, so match by position
        if (refused.has(c.definition.commands[i].name)) skipped++
        else expected[`${cmd.name}Args`] = cmd.args.map((a) => a.name)
      })
      const { diagnostics, interfaces } = declarations(generateTypeDeclaration(c.definition))

      expect.soft(diagnostics, c.id).toEqual([])
      expect.soft(interfaces, c.id).toEqual(expected)
    }
    console.log(
      `type declaration: ${generated.length} cases, refused command names skipped ${skipped}`
    )

    expect(generated.length).toBeGreaterThan(0)
  })

  it('a nested parameter and one with no default are written as the header stores them', () => {
    const plugin = createMinimalPlugin({
      parameters: [
        makeParam({ name: 'Group', type: 'string', default: 'top' }),
        makeParam({ name: 'nested', type: 'number', default: 5, parent: 'Group' }),
        makeParam({ name: 'noDefault', default: '' })
      ]
    })
    const header = headerParameters(generatePlugin(plugin), 'TestPlugin.js')

    expect(JSON.parse(generatePluginsJsonEntry(plugin)).parameters).toEqual({
      Group: 'top',
      nested: '5',
      noDefault: ''
    })
    expect(JSON.parse(generatePluginsJsonEntry(plugin)).parameters).toEqual(storedValues(header))
    expect(declaredParameters(generateTypeDeclaration(plugin)).members).toEqual(
      header.map((p) => p.name)
    )
  })

  it('quotes a declared parameter name that is not an identifier', () => {
    const plugin = createMinimalPlugin({
      parameters: [makeParam({ name: 'Move Speed' }), makeParam({ name: 'speed' })]
    })
    const text = generateTypeDeclaration(plugin)

    expect(text).toContain('    "Move Speed": string\n')
    expect(text).toContain('    speed: string\n')
    expect(declaredParameters(text)).toEqual({ diagnostics: [], members: ['Move Speed', 'speed'] })
  })
})

describe('type declaration namespace', () => {
  const namespaceOf = (text: string): string | undefined => {
    const first = ts
      .createSourceFile(DTS, text, ts.ScriptTarget.Latest, true)
      .statements.find(ts.isModuleDeclaration)
    return first?.name.text
  }

  it('is the plugin name, or the name made an identifier when the validator refuses it', () => {
    const table: [string, string][] = [
      ['Good_Name1', 'Good_Name1'],
      ['My-Plugin v2', 'My_Plugin_v2'],
      ['1Plugin', '_1Plugin'],
      ['Plügin', 'Plügin'],
      ['class', 'class_'],
      ['delete', 'delete_'],
      ['undefined', 'undefined_'],
      ['', 'NewPlugin']
    ]
    for (const [name, expected] of table) {
      const text = generateTypeDeclaration(createMinimalPlugin({ metaOverrides: { name } }))

      expect(declarations(text).diagnostics, name).toEqual([])
      expect(namespaceOf(text), name).toBe(expected)
    }
  })

  it('parses for a plugin named after any word TypeScript reserves', () => {
    const words: string[] = []
    for (const [first, last] of [
      [ts.SyntaxKind.FirstReservedWord, ts.SyntaxKind.LastReservedWord],
      [ts.SyntaxKind.FirstFutureReservedWord, ts.SyntaxKind.LastFutureReservedWord]
    ]) {
      for (let kind = first; kind <= last; kind++) words.push(ts.tokenToString(kind) ?? '')
    }
    for (const name of words) {
      const text = generateTypeDeclaration(createMinimalPlugin({ metaOverrides: { name } }))

      expect.soft(declarations(text).diagnostics, name).toEqual([])
    }
    console.log(`type declaration namespace reserved words: ${words.length}`)

    expect(words).toContain('delete')
  })

  it('notes each name it declares otherwise and each command it gives no interface', () => {
    const plugin = createMinimalPlugin({
      metaOverrides: { name: 'My-Plugin' },
      commands: [
        makeCommand({ name: 'Show-Text', args: [makeParam()] }),
        makeCommand({ name: 'Zeigé', args: [makeParam()] }),
        makeCommand({ name: 'Hide', args: [makeParam()] })
      ]
    })
    const { content, notes } = typeDeclaration(plugin)

    expect(content).toBe(generateTypeDeclaration(plugin))
    expect(declarations(content).interfaces).toHaveProperty('ZeigéArgs')
    expect(notes).toEqual([
      'plugin name "My-Plugin" is declared as My_Plugin',
      'command "Show-Text" has no Args interface: its name is not an identifier'
    ])
    expect(typeDeclaration(createMinimalPlugin()).notes).toEqual([])
  })

  it('keeps the original name in the header comment', () => {
    const text = generateTypeDeclaration(
      createMinimalPlugin({ metaOverrides: { name: 'My-Plugin\nv2' } })
    )

    expect(text.split('\n', 1)[0]).toBe('// Type declarations for My-Plugin v2 v1.0.0')
  })

  it('parses for every corpus entry under its own plugin name', () => {
    for (const { name, def } of GENERATOR_ENTRIES) {
      expect.soft(declarations(generateTypeDeclaration(def)).diagnostics, name).toEqual([])
    }
    console.log(`type declaration namespace: ${GENERATOR_ENTRIES.length} entries`)

    expect(GENERATOR_ENTRIES.length).toBeGreaterThan(0)
  })
})
