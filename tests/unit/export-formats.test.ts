// Tests for export format generators (plugins.json entry, .d.ts, README)
import { describe, it, expect } from 'vitest'
import * as ts from 'typescript'
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

type PluginOverrides = Partial<PluginDefinition> & {
  metaOverrides?: Partial<PluginDefinition['meta']>
}

function createMinimalPlugin(overrides: PluginOverrides = {}): PluginDefinition {
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

function isObject(value: unknown): value is object {
  return typeof value === 'object' && value !== null
}

/**
The plugins.json entry of `plugin`, read through `unknown`.
*/
function entryOf(plugin: PluginDefinition): unknown {
  return JSON.parse(generatePluginsJsonEntry(plugin))
}

/**
The `parameters` object of the plugins.json entry of `plugin`.
*/
function entryParameters(plugin: PluginDefinition): object {
  const entry = entryOf(plugin)
  const parameters: unknown = isObject(entry) ? Reflect.get(entry, 'parameters') : undefined
  if (!isObject(parameters)) throw new Error('the plugins.json entry has no parameters object')
  return parameters
}

/**
The lines of `wanted` that `text` does not contain.
*/
const lacking = (text: string, wanted: readonly string[]): string[] =>
  wanted.filter((line) => !text.includes(line))

/**
The lines of `unwanted` that `text` contains.
*/
const holding = (text: string, unwanted: readonly string[]): string[] =>
  unwanted.filter((line) => text.includes(line))

// --------------------------------------------------------------------------
// generatePluginsJsonEntry
// --------------------------------------------------------------------------
describe(generatePluginsJsonEntry, () => {
  it('generates valid JSON with plugin name, status, description, and parameters', () => {
    const plugin = createMinimalPlugin({
      parameters: [
        makeParam({ name: 'speed', text: 'Speed', type: 'number', default: 5 }),
        makeParam({ name: 'label', text: 'Label', type: 'string', default: 'Hello' })
      ]
    })

    expect(entryOf(plugin)).toStrictEqual({
      name: 'TestPlugin',
      status: true,
      description: 'A test plugin',
      parameters: { speed: '5', label: 'Hello' }
    })
  })

  it('generates empty parameters object for plugin with no params', () => {
    const plugin = createMinimalPlugin()

    expect(entryParameters(plugin)).toStrictEqual({})
  })

  it('writes nested parameters as top-level keys', () => {
    const plugin = createMinimalPlugin({
      parameters: [
        makeParam({ name: 'topLevel', text: 'Top Level', default: 'visible' }),
        makeParam({ name: 'nested', text: 'Nested', default: 'hidden', parent: 'topLevel' })
      ]
    })

    expect(entryParameters(plugin)).toStrictEqual({ topLevel: 'visible', nested: 'hidden' })
  })

  it('stringifies boolean defaults correctly', () => {
    const plugin = createMinimalPlugin({
      parameters: [
        makeParam({ name: 'enabled', type: 'boolean', default: true }),
        makeParam({ name: 'disabled', type: 'boolean', default: false })
      ]
    })

    expect(entryParameters(plugin)).toStrictEqual({ enabled: 'true', disabled: 'false' })
  })

  it('stringifies number defaults correctly', () => {
    const plugin = createMinimalPlugin({
      parameters: [
        makeParam({ name: 'count', type: 'number', default: 0 }),
        makeParam({ name: 'ratio', type: 'number', default: 2.5 })
      ]
    })

    expect(entryParameters(plugin)).toStrictEqual({ count: '0', ratio: '2.5' })
  })

  it('handles empty string defaults', () => {
    const plugin = createMinimalPlugin({
      parameters: [makeParam({ name: 'emptyStr', type: 'string', default: '' })]
    })

    expect(entryParameters(plugin)).toStrictEqual({ emptyStr: '' })
  })

  it('writes a parameter named __proto__ as a parameter', () => {
    const plugin = createMinimalPlugin({
      parameters: [makeParam({ name: '__proto__', default: 'a' }), makeParam({ name: 'speed' })]
    })
    const parameters = entryParameters(plugin)

    expect(Object.keys(parameters)).toStrictEqual(['__proto__', 'speed'])
    expect(Object.getOwnPropertyDescriptor(parameters, '__proto__')).toStrictEqual({
      value: 'a',
      writable: true,
      enumerable: true,
      configurable: true
    })
  })
})

// --------------------------------------------------------------------------
// generateTypeDeclaration
// --------------------------------------------------------------------------
const NUMERIC_TYPES: ParamType[] = [
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
const STRING_TYPES: ParamType[] = [
  'string',
  'select',
  'combo',
  'note',
  'text',
  'hidden',
  'file',
  'color'
]
const ID_TYPES: ParamType[] = ['icon', 'map']

/**
One parameter of each type, named after it.
*/
const typedParams = (types: ParamType[]): PluginParameter[] =>
  types.map((t) => makeParam({ name: `p_${t}`, text: `P ${t}`, type: t }))

/**
Title, parameters, and the lines the declaration of a plugin with those parameters holds.
*/
const DECLARED_LINES: [string, PluginParameter[], string[]][] = [
  [
    'declares nested parameters in Parameters interface',
    [
      makeParam({ name: 'topLevel', text: 'Top', type: 'string' }),
      makeParam({ name: 'nestedField', text: 'Nested', type: 'number', parent: 'topLevel' })
    ],
    ['topLevel: string', 'nestedField: number']
  ],
  [
    'maps all numeric ID-based param types to number',
    typedParams(NUMERIC_TYPES),
    NUMERIC_TYPES.map((t) => `p_${t}: number`)
  ],
  [
    'maps boolean type to boolean',
    [makeParam({ name: 'flag', type: 'boolean' })],
    ['flag: boolean']
  ],
  [
    'maps struct type to Record<string, unknown>',
    [makeParam({ name: 'data', type: 'struct' })],
    ['data: Record<string, unknown>']
  ],
  [
    'maps array type to unknown[]',
    [makeParam({ name: 'items', type: 'array' })],
    ['items: unknown[]']
  ],
  [
    'maps string-like types (select, combo, note, text, file, etc.) to string',
    typedParams(STRING_TYPES),
    STRING_TYPES.map((t) => `p_${t}: string`)
  ],
  [
    'maps icon and map types to number (ID-based)',
    typedParams(ID_TYPES),
    ID_TYPES.map((t) => `p_${t}: number`)
  ],
  [
    'uses param text as description fallback when desc is empty',
    [makeParam({ name: 'myField', text: 'My Field Label', desc: '' })],
    ['/** My Field Label */']
  ]
]

describe(generateTypeDeclaration, () => {
  it('generates namespace with Parameters interface for a plugin with params', () => {
    const plugin = createMinimalPlugin({
      parameters: [
        makeParam({ name: 'speed', text: 'Speed', desc: 'Movement speed', type: 'number' }),
        makeParam({ name: 'name', text: 'Name', desc: 'Character name', type: 'string' })
      ]
    })

    const result = generateTypeDeclaration(plugin)

    expect(
      lacking(result, [
        'declare namespace TestPlugin {',
        'interface Parameters {',
        '/** Movement speed */',
        'speed: number',
        '/** Character name */',
        'name: string',
        '}'
      ])
    ).toStrictEqual([])
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

  it.each(DECLARED_LINES)('%s', (_, parameters, lines) => {
    const result = generateTypeDeclaration(createMinimalPlugin({ parameters }))

    expect(lacking(result, lines)).toStrictEqual([])
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
/**
A plugin with every README section: header, parameters, a command with an argument, help, url.
*/
function fullPlugin(): PluginDefinition {
  return createMinimalPlugin({
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
}

const FULL_README_LINES = [
  '# MyPlugin',
  '**Version:** 1.2.0 | **Author:** DevUser | **Target:** MZ',
  '> A fancy plugin',
  '## Installation',
  'Download `MyPlugin.js`',
  '## Parameters',
  '| Speed | number | 5 | Movement speed |',
  '## Plugin Commands',
  '### Do Thing',
  'Does a thing',
  '| Target | actor | Target actor |',
  '## Additional Information',
  'See the wiki for details.',
  '## More Information',
  'https://example.com/plugin',
  '*Generated by [MZ Plugin Studio]'
]

/**
Title, meta, and the lines the README of a plugin with that meta holds.
*/
const README_DEPENDENCIES: [string, Partial<PluginDefinition['meta']>, string[]][] = [
  [
    'includes dependencies section when plugin has dependencies',
    { dependencies: ['PluginA', 'PluginB'] },
    ['## Dependencies', '**Required plugins:**', '- PluginA', '- PluginB']
  ],
  [
    'includes orderAfter section when present',
    { orderAfter: ['CorePlugin', 'UtilPlugin'] },
    ['## Dependencies', '**Load order:** Must be placed after:', '- CorePlugin', '- UtilPlugin']
  ],
  [
    'includes both dependencies and orderAfter together',
    { dependencies: ['RequiredPlugin'], orderAfter: ['BeforeMe'] },
    [
      '**Required plugins:**',
      '- RequiredPlugin',
      '**Load order:** Must be placed after:',
      '- BeforeMe'
    ]
  ]
]

/**
Title, plugin overrides, and the text the README of that plugin leaves out.
*/
const README_OMISSIONS: [string, PluginOverrides, string][] = [
  [
    'omits description blockquote when description is empty',
    { metaOverrides: { description: '' } },
    '> '
  ],
  ['omits commands section when no commands', { commands: [] }, '## Plugin Commands'],
  [
    'omits help section when help is empty',
    { metaOverrides: { help: '' } },
    '## Additional Information'
  ],
  ['omits url section when url is empty', { metaOverrides: { url: '' } }, '## More Information']
]

describe(generateReadme, () => {
  it('generates a complete README for a plugin with params, commands, and structs', () => {
    const result = generateReadme(fullPlugin())

    expect(lacking(result, FULL_README_LINES)).toStrictEqual([])
  })

  it('generates minimal README for empty plugin', () => {
    const plugin = createMinimalPlugin({
      metaOverrides: { description: '', help: '', url: '' }
    })

    const result = generateReadme(plugin)

    expect(
      lacking(result, ['# TestPlugin', '## Installation', '*Generated by [MZ Plugin Studio]'])
    ).toStrictEqual([])
    expect(
      holding(result, [
        '## Parameters',
        '## Plugin Commands',
        '## Dependencies',
        '## Additional Information',
        '## More Information'
      ])
    ).toStrictEqual([])
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

  it.each(README_DEPENDENCIES)('%s', (_, metaOverrides, lines) => {
    const result = generateReadme(createMinimalPlugin({ metaOverrides }))

    expect(lacking(result, lines)).toStrictEqual([])
  })

  it.each(README_OMISSIONS)('%s', (_, overrides, absent) => {
    expect(generateReadme(createMinimalPlugin(overrides))).not.toContain(absent)
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
})

// COV-20: generatePluginsJsonEntry edge types
describe('generatePluginsJsonEntry - COV-20 edge types', () => {
  it('stringifies combo defaults to string', () => {
    const plugin = createMinimalPlugin({
      parameters: [makeParam({ name: 'mode', type: 'combo', default: 'auto' })]
    })

    expect(entryParameters(plugin)).toStrictEqual({ mode: 'auto' })
  })

  it('stringifies hidden defaults to string', () => {
    const plugin = createMinimalPlugin({
      parameters: [makeParam({ name: 'token', type: 'hidden', default: 'secret' })]
    })

    expect(entryParameters(plugin)).toStrictEqual({ token: 'secret' })
  })

  it('stringifies color defaults to string', () => {
    const plugin = createMinimalPlugin({
      parameters: [makeParam({ name: 'bg', type: 'color', default: '#ffffff' })]
    })

    expect(entryParameters(plugin)).toStrictEqual({ bg: '#ffffff' })
  })
})

// --------------------------------------------------------------------------
// Both exports against the header of the generated plugin, read back as the app imports it
// --------------------------------------------------------------------------
const DTS = 'plugin.d.ts'

/**
The syntax errors of a declaration file, and the member names of each interface it declares.
*/
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

/**
The member names of `interface Parameters` in a declaration file, and its syntax errors.
*/
function declaredParameters(text: string): { diagnostics: string[]; members: string[] } {
  const { diagnostics, interfaces } = declarations(text)
  return { diagnostics, members: new Map(Object.entries(interfaces)).get('Parameters') ?? [] }
}

/**
The parameters the generated plugin's header declares, read back as the app imports them.
*/
const headerParameters = (code: string, fileName: string): PluginParameter[] =>
  PluginParser.parsePlugin(code, fileName).parameters

const storedValues = (parameters: PluginParameter[]): Record<string, string> =>
  Object.fromEntries(parameters.map((p) => [p.name, String(p.default)]))

describe('exports against the generated header', () => {
  const generated = conformanceCases().filter((c) => c.kind === 'generated')

  it('the plugins.json entry holds every parameter the header stores, with its value', () => {
    const entries = new Map(generated.map((c) => [c.id, entryParameters(c.definition)]))
    const stored = new Map(
      generated.map((c) => [c.id, storedValues(headerParameters(c.code, c.fileName))])
    )
    process.stdout.write(`plugins.json: ${String(generated.length)} cases\n`)

    expect(entries).toStrictEqual(stored)

    expect(generated.length).toBeGreaterThan(0)
  })

  // A command whose name is not an identifier gets no arguments interface: its name cannot name
  // one. The corpus's refused command names are none of them identifiers to TypeScript either
  it('the type declaration parses and declares every parameter and argument the header stores', () => {
    let skipped = 0
    const observed = new Map<string, object>()
    const wanted = new Map<string, object>()
    for (const c of generated) {
      const refused = refusedCommandNames(c.definition)
      const header = PluginParser.parsePlugin(c.code, c.fileName)
      const expected: [string, string[]][] = []
      if (header.parameters.length > 0) {
        expected.push(['Parameters', header.parameters.map((p) => p.name)])
      }
      for (const [index, command] of header.commands.entries()) {
        if (command.args.length === 0) continue
        // The header's reading of a refused name is not the name, so match by position
        if (refused.has(c.definition.commands.at(index)?.name ?? '')) skipped++
        else expected.push([`${command.name}Args`, command.args.map((a) => a.name)])
      }
      const { diagnostics, interfaces } = declarations(generateTypeDeclaration(c.definition))
      observed.set(c.id, { commands: header.commands.length, diagnostics, interfaces })
      wanted.set(c.id, {
        commands: c.definition.commands.length,
        diagnostics: [],
        interfaces: Object.fromEntries(expected)
      })
    }
    process.stdout.write(
      `type declaration: ${String(generated.length)} cases, ` +
        `refused command names skipped ${String(skipped)}\n`
    )

    expect(observed).toStrictEqual(wanted)

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

    expect(entryParameters(plugin)).toStrictEqual({ Group: 'top', nested: '5', noDefault: '' })
    expect(entryParameters(plugin)).toStrictEqual(storedValues(header))
    expect(declaredParameters(generateTypeDeclaration(plugin)).members).toStrictEqual(
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
    expect(declaredParameters(text)).toStrictEqual({
      diagnostics: [],
      members: ['Move Speed', 'speed']
    })
  })
})

/**
The name of the first namespace a declaration file declares.
*/
function namespaceOf(text: string): string | undefined {
  const first = ts
    .createSourceFile(DTS, text, ts.ScriptTarget.Latest, true)
    .statements.find((statement) => ts.isModuleDeclaration(statement))
  return first?.name.text
}

/**
Whether `kind` is a word TypeScript reserves now or for the future.
*/
const isReservedKind = (kind: ts.SyntaxKind): boolean =>
  (kind >= ts.SyntaxKind.FirstReservedWord && kind <= ts.SyntaxKind.LastReservedWord) ||
  (kind >= ts.SyntaxKind.FirstFutureReservedWord && kind <= ts.SyntaxKind.LastFutureReservedWord)

/**
The syntax errors of the declaration of a plugin named `name`.
*/
const namedDiagnostics = (name: string): string[] =>
  declarations(generateTypeDeclaration(createMinimalPlugin({ metaOverrides: { name } })))
    .diagnostics

describe('type declaration namespace', () => {
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
    const observed = table.map(([name]) => {
      const text = generateTypeDeclaration(createMinimalPlugin({ metaOverrides: { name } }))
      return [name, declarations(text).diagnostics, namespaceOf(text)]
    })

    expect(observed).toStrictEqual(table.map(([name, expected]) => [name, [], expected]))
  })

  it('parses for a plugin named after any word TypeScript reserves', () => {
    const kinds = new Set(Object.values(ts.SyntaxKind).filter((value) => typeof value === 'number'))
    const words = [...kinds]
      .filter((kind) => isReservedKind(kind))
      .toSorted((left, right) => left - right)
      .map((kind) => ts.tokenToString(kind) ?? '')
    const failing = words
      .map((name) => [name, namedDiagnostics(name)] as const)
      .filter(([, diagnostics]) => diagnostics.length > 0)
    process.stdout.write(`type declaration namespace reserved words: ${String(words.length)}\n`)

    expect(failing).toStrictEqual([])
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
    expect(notes).toStrictEqual([
      'plugin name "My-Plugin" is declared as My_Plugin',
      'command "Show-Text" has no Args interface: its name is not an identifier'
    ])
    expect(typeDeclaration(createMinimalPlugin()).notes).toStrictEqual([])
  })

  it('keeps the original name in the header comment', () => {
    const text = generateTypeDeclaration(
      createMinimalPlugin({ metaOverrides: { name: 'My-Plugin\nv2' } })
    )

    expect(text.split('\n', 1)[0]).toBe('// Type declarations for My-Plugin v2 v1.0.0')
  })

  it('parses for every corpus entry under its own plugin name', () => {
    const failing = GENERATOR_ENTRIES.map(
      ({ name, def }) => [name, declarations(generateTypeDeclaration(def)).diagnostics] as const
    ).filter(([, diagnostics]) => diagnostics.length > 0)
    process.stdout.write(
      `type declaration namespace: ${String(GENERATOR_ENTRIES.length)} entries\n`
    )

    expect(failing).toStrictEqual([])

    expect(GENERATOR_ENTRIES.length).toBeGreaterThan(0)
  })
})
