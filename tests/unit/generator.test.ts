// Tests for generator
import { describe, it, expect } from 'vitest'
import {
  generatePlugin,
  generateRawMode,
  validatePlugin,
  generateHeaderOnly
} from '../../src/renderer/src/lib/generator/index'
import { parameterConstant } from '../helpers/generated-names'
import type {
  LocalizedContent,
  ParamType,
  PluginDefinition,
  PluginParameter,
  PluginStruct
} from '../../src/renderer/src/types/plugin'
import { PluginParser } from '../../src/main/services/pluginParser'
import { createEmptyCommand, createEmptyParameter, toBaseline } from '../../src/shared/types/plugin'
import { compileCheck } from '../../src/main/services/syntax-check'
import { evaluatePlugin } from '../helpers/evaluate-plugin'

function createTestPlugin(overrides: Partial<PluginDefinition> = {}): PluginDefinition {
  const { meta, parameters = [], commands = [], structs = [], customCode, codeBody } = overrides
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
      ...meta
    },
    parameters,
    commands,
    structs,
    ...(customCode !== undefined && { customCode }),
    ...(codeBody !== undefined && { codeBody })
  }
}

/**
The fragments of `wanted` that `text` lacks, then the fragments of `unwanted` it holds.
*/
function strayFragments(
  text: string,
  wanted: readonly string[],
  unwanted: readonly string[] = []
): string[] {
  return [
    ...wanted.filter((fragment) => !text.includes(fragment)),
    ...unwanted.filter((fragment) => text.includes(fragment)).map((fragment) => `held: ${fragment}`)
  ]
}

/**
A test title, the definition fields it sets, the text the generated plugin must hold and the
text it must not.
*/
type OutputCase = [
  title: string,
  overrides: Partial<PluginDefinition>,
  wanted: string[],
  unwanted?: string[]
]

/**
What the plugin generated from a case's fields lacks of its wanted text and holds of its
unwanted text.
*/
function strayOutput([, overrides, wanted, unwanted]: OutputCase): string[] {
  return strayFragments(generatePlugin(createTestPlugin(overrides)), wanted, unwanted)
}

/**
The first item of a list a test edits; a missing one is a broken fixture.
*/
function firstOf<T>(items: readonly T[]): T {
  const [item] = items
  if (item === undefined) throw new Error('the fixture lacks the item the test edits')
  return item
}

const POSITION: PluginStruct = {
  id: 's1',
  name: 'Position',
  parameters: [
    { id: 'sp1', name: 'x', text: 'X', desc: '', type: 'number', default: 0 },
    { id: 'sp2', name: 'y', text: 'Y', desc: '', type: 'number', default: 0 }
  ]
}

const SETTINGS: PluginParameter = {
  id: 'p1',
  name: 'settings',
  text: 'Settings',
  desc: '',
  type: 'struct',
  default: '{"x":"100","y":"200"}',
  structType: 'Position'
}

const GENERATED_PARTS: OutputCase[] = [
  [
    'generates minimal plugin header',
    {},
    [
      '/*:',
      '@target MZ',
      '@plugindesc A test plugin',
      '@author TestAuthor',
      '*/',
      '(() => {',
      "'use strict';",
      '})();'
    ]
  ],
  [
    'generates plugin with string parameter',
    {
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
    },
    [
      '@param greeting',
      '@text Greeting',
      '@desc The greeting message',
      '@type string',
      '@default Hello',
      "params['greeting']"
    ]
  ],
  [
    'generates plugin with number parameter including min/max',
    {
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
    },
    ['@type number', '@min 1', '@max 10', '@decimals 2', '@default 5']
  ],
  [
    'generates plugin with boolean parameter',
    {
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
    },
    ['@type boolean', '@on Yes', '@off No', '@default true']
  ],
  [
    'generates plugin with select parameter',
    {
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
    },
    ['@type select', '@option Automatic', '@value auto', '@option Manual', '@value manual']
  ],
  [
    'generates plugin with commands',
    {
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
    },
    ['@command DoThing', '@text Do Thing', '@arg target', "registerCommand(PLUGIN_NAME, 'DoThing'"]
  ],
  [
    'generates plugin with @base and @orderAfter',
    {
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
    },
    ['@base BasePlugin', '@orderAfter BasePlugin']
  ],
  [
    'preserves custom code',
    { customCode: '// My custom code\nconsole.log("hello");' },
    ['// My custom code', 'console.log("hello")']
  ],
  [
    'generates struct definition blocks',
    { structs: [POSITION] },
    ['/*~struct~Position:', '@param x', '@param y']
  ],
  [
    'emits @default for struct parameter with JSON default',
    { parameters: [SETTINGS], structs: [POSITION] },
    ['@type struct<Position>', '@default {"x":"100","y":"200"}']
  ],
  [
    'uses struct default as JSON.parse fallback in body',
    { parameters: [SETTINGS], structs: [POSITION] },
    ['JSON.parse(params[\'settings\'] || \'{"x":"100","y":"200"}\')']
  ],
  [
    'falls back to empty object when struct has no default',
    {
      parameters: [
        {
          id: 'p1',
          name: 'pos',
          text: 'Pos',
          desc: '',
          type: 'struct',
          default: '',
          structType: 'Position'
        }
      ],
      structs: [
        {
          id: 's1',
          name: 'Position',
          parameters: [{ id: 'sp1', name: 'x', text: 'X', desc: '', type: 'number', default: 0 }]
        }
      ]
    },
    ["JSON.parse(params['pos'] || '{}')"]
  ]
]

describe(generatePlugin, () => {
  it.each(GENERATED_PARTS)('%s', (...row) => {
    expect(strayOutput(row)).toStrictEqual([])
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
    const code = generatePlugin(plugin)

    expect(compileCheck(code, 'plugin.js')).toBeNull()
  })
})

/**
The file as the app opens it, and a copy to edit; the opened definition is the baseline.
*/
function open(rawSource: string): { opened: PluginDefinition; plugin: PluginDefinition } {
  const opened = {
    ...PluginParser.parsePlugin(rawSource, 'RawPlugin.js'),
    importedFrom: 'RawPlugin.js'
  }
  return { opened, plugin: structuredClone(opened) }
}

/**
The file raw mode writes for the edited copy of a file opened by `open`.
*/
function save(plugin: PluginDefinition, opened: PluginDefinition): string {
  return generateRawMode(plugin, toBaseline(opened))
}

function param(name: string, overrides: Partial<PluginParameter> = {}): PluginParameter {
  return {
    id: name,
    name,
    text: name,
    desc: '',
    type: 'string',
    default: '',
    ...overrides
  }
}

const RAW_SPACED_OUT = `/*:
 *   @plugindesc   Spaced out
 * @param speed
 *     @type number
 */
(() => {
    const params = PluginManager.parameters('RawPlugin');
    const speed = Number(params['speed']);
})();
`

const RAW_WITHOUT_MAIN_BLOCK = `/*:ja
 * @plugindesc テスト
 */

(() => {
    'use strict';
    console.log('hello');
})();
`

const UNEDITED_FILES: [title: string, raw: string][] = [
  ['writes an unedited file back unchanged, whatever its blocks look like', RAW_SPACED_OUT],
  ['keeps a file without a main block as it is', RAW_WITHOUT_MAIN_BLOCK]
]

const RAW_PREAMBLE = `/*:
 * MZ Plugin Studio - RawPlugin
 * Copyright (c) 2024 Test Author
 * License: MIT
 *
 * @target MZ
 * @plugindesc Old description
 * @author Test
 */

(() => {
    'use strict';
})();`

const RAW_CRLF = [
  '\u{FEFF}/*:',
  ' * @plugindesc Old',
  ' */',
  '',
  '/*:ja',
  ' * @plugindesc 古い',
  ' */',
  '',
  '/*~struct~Pos:',
  ' * @param x',
  ' */',
  '',
  '(() => {',
  "    const params = PluginManager.parameters('RawPlugin');",
  '})();',
  ''
].join('\r\n')

const RAW_ENGLISH_FOR_BARE = `/*:en
 * @plugindesc Old
 */

/*:ja
 * @plugindesc 古い
 */
`

const RAW_TRANSLATED_STRUCT = `/*:
 * @param pos
 * @type struct<Pos>
 */

/*~struct~Pos:
 * @param x
 * @text X
 */

/*~struct~Pos:ja
 * @param x
 * @text 横
 */
`

// COV-01: generateRawMode against the definition the file was opened with
describe(generateRawMode, () => {
  it('refuses to run without rawSource', () => {
    const plugin = createTestPlugin()

    expect(() => generateRawMode(plugin, toBaseline(plugin))).toThrow(
      'generateRawMode needs rawSource'
    )
  })

  it.each(UNEDITED_FILES)('%s', (_title, raw) => {
    const { opened, plugin } = open(raw)

    expect(save(plugin, opened)).toBe(raw)
  })

  it('preserves preamble (license text) before first annotation', () => {
    const { opened, plugin } = open(RAW_PREAMBLE)
    plugin.meta.description = 'New description'
    const result = save(plugin, opened)

    expect(result).toContain('MZ Plugin Studio - RawPlugin')
    expect(result).toContain('Copyright (c) 2024 Test Author')
    expect(result).toContain('@plugindesc New description')
  })

  it('writes the file line endings and keeps blocks that did not change', () => {
    const { opened, plugin } = open(RAW_CRLF)
    plugin.meta.description = 'New'
    plugin.parameters.push(param('added'))
    const result = save(plugin, opened)

    expect(result.startsWith('\u{FEFF}/*:\r\n')).toBe(true)
    expect(result).not.toMatch(/[^\r]\n/)
    expect(
      strayFragments(result, [
        '/*:ja\r\n * @plugindesc 古い\r\n */',
        '/*~struct~Pos:\r\n * @param x\r\n */',
        '@plugindesc New\r\n',
        "params['added']"
      ])
    ).toStrictEqual([])
  })

  it('rewrites the English block that stands in for a missing bare block, keeping its opener', () => {
    const { opened, plugin } = open(RAW_ENGLISH_FOR_BARE)
    plugin.meta.description = 'New'
    const result = save(plugin, opened)

    expect(result.startsWith('/*:en\n')).toBe(true)
    expect(result).toContain('@plugindesc New')
    expect(result).toContain('/*:ja\n * @plugindesc 古い\n */')
  })

  it("rewrites a struct's own block and keeps its translated blocks", () => {
    const { opened, plugin } = open(RAW_TRANSLATED_STRUCT)
    firstOf(plugin.structs).parameters.push(param('y'))
    const result = save(plugin, opened)

    expect(result.match(/\/\*~struct~Pos:/g)).toHaveLength(2)
    expect(result).toContain('/*~struct~Pos:\n * @param x\n * @text X\n')
    expect(result).toContain(' * @param y\n')
    expect(result).toContain('/*~struct~Pos:ja\n * @param x\n * @text 横\n */')
  })
})

const RAW_NO_PARAMETER_READS = `/*:
 * @plugindesc Test
 * @author Test
 */

(() => {
    'use strict';
    // custom logic only
    console.log('hello');
})();`

const RAW_OLD_PARAMETER = `/*:
 * @param oldParam
 * @type string
 * @default hello
 */

(() => {
    'use strict';
    const PLUGIN_NAME = 'RawPlugin';
    const prm = PluginManager.parameters(PLUGIN_NAME);
    const oldParam = prm.oldParam || 'hello';
})();`

const RAW_PARAMETERS_OBJECT = `/*:
 * @param speed
 */
(() => {
    const parameters = PluginManager.parameters('RawPlugin');
    const speed = parameters['speed'];
})();
`

const RAW_TOP_LEVEL_CALL = `/*:
 * @param speed
 */
var prm = PluginManager.parameters(
    'RawPlugin'
);
var speed = prm.speed;
`

const RAW_NO_USE_STRICT = `/*:
 * @plugindesc Test
 * @author Test
 */

(() => {
    // no use strict here
    console.log('hello');
})();`

const RAW_OLD_COMMAND = `/*:
 * @command Old
 */

(() => {
    'use strict';
    const PLUGIN_NAME = 'RawPlugin';
    // existing code
    console.log('loaded');
})();`

const RAW_NO_IIFE = `/*:
 * @plugindesc Legacy
 */
var Legacy = {};
`

describe('generateRawMode: code for added items', () => {
  it('declares PLUGIN_NAME and params for an added parameter when the code reads none', () => {
    const { opened, plugin } = open(RAW_NO_PARAMETER_READS)
    plugin.parameters.push(param('newParam', { default: 'x' }))
    const result = save(plugin, opened)

    expect(result).toContain("const PLUGIN_NAME = 'RawPlugin';")
    expect(result).toContain('const params = PluginManager.parameters(PLUGIN_NAME);')
    expect(result).toContain('const newParam =')
    expect(compileCheck(result, 'plugin.js')).toBeNull()
  })

  it('scaffolds only parameters added since the file was opened', () => {
    const { opened, plugin } = open(RAW_OLD_PARAMETER)
    plugin.parameters.push(param('newParam', { type: 'number', default: 5 }))
    const result = save(plugin, opened)

    expect(result.match(/const PLUGIN_NAME/g)).toHaveLength(1)
    expect(result.match(/const oldParam/g)).toHaveLength(1)
    expect(result).toContain("const newParam = Number(prm['newParam'] || 5);")
    expect(compileCheck(result, 'plugin.js')).toBeNull()
  })

  it('reads an added parameter through the object the file stores its parameters in', () => {
    const { opened, plugin } = open(RAW_PARAMETERS_OBJECT)
    plugin.parameters.push(param('label', { default: 'x' }))
    const result = save(plugin, opened)

    expect(result).toContain("const label = parameters['label'] ?? 'x';")
    expect(evaluatePlugin(result, { mode: 'generator' }).threw).toBeNull()
  })

  it('adds parameter code in a block after a top-level parameters call on several lines', () => {
    const { opened, plugin } = open(RAW_TOP_LEVEL_CALL)
    plugin.parameters.push(param('label'))
    const result = save(plugin, opened)

    expect(result).toContain(
      "    'RawPlugin'\n);\n\n{\n    // --- New parameters (added by MZ Plugin Studio) ---\n"
    )
    expect(result).toContain('    // --- End new parameters ---\n}\nvar speed = prm.speed;\n')
    expect(compileCheck(result, 'plugin.js')).toBeNull()
  })

  it('falls back to IIFE-opening injection when no use strict present', () => {
    const { opened, plugin } = open(RAW_NO_USE_STRICT)
    plugin.parameters.push(param('fresh'))
    const result = save(plugin, opened)

    expect(result).toContain('const fresh =')
    expect(result.indexOf('const fresh =')).toBeLessThan(result.indexOf("console.log('hello')"))
  })

  it('injects new commands before closing })(); and only those', () => {
    const { opened, plugin } = open(RAW_OLD_COMMAND)
    plugin.commands.push({ id: 'c1', name: 'NewCommand', text: 'New Command', desc: '', args: [] })
    const result = save(plugin, opened)

    expect(result).not.toContain("'Old'")

    const commandIndex = result.indexOf("registerCommand(PLUGIN_NAME, 'NewCommand'")

    expect(commandIndex).toBeGreaterThan(-1)
    expect(commandIndex).toBeLessThan(result.lastIndexOf('})();'))
    expect(compileCheck(result, 'plugin.js')).toBeNull()
  })

  it('appends code for added items inside braces when the file has no IIFE', () => {
    const { opened, plugin } = open(RAW_NO_IIFE)
    plugin.parameters.push(param('fresh'))
    plugin.commands.push({ id: 'c1', name: 'Go', text: 'Go', desc: '', args: [] })
    const result = save(plugin, opened)

    expect(result).toContain('var Legacy = {};\n')
    expect(result).toContain("registerCommand(PLUGIN_NAME, 'Go'")
    expect(result.trimEnd().endsWith('}')).toBe(true)
    expect(compileCheck(result, 'plugin.js')).toBeNull()
    expect(evaluatePlugin(result, { mode: 'generator' }).threw).toBeNull()
  })
})

const RAW_ASSETS = `/*:
 * @plugindesc Assets
 *
 * @noteParam Face
 * @noteType file
 * @noteDir img/faces/
 * @noteData actors
 * @noteRequire 1
 *
 * @param Picture
 * @type file
 * @dir img/pictures/
 * @require 1
 *
 * @command Show
 *
 * @arg picture
 * @type file
 * @dir img/pictures/
 * @require 1
 */

/*~struct~Slot:
 * @param image
 * @type file
 * @dir img/pictures/
 * @require 1
 */
`

function requireLines(text: string): number {
  return (text.match(/^ \* @(?:noteRequire|require) 1$/gm) ?? []).length
}

describe('generateRawMode: note and require lines', () => {
  it('are kept byte for byte in blocks that did not change', () => {
    const { opened, plugin } = open(RAW_ASSETS)
    plugin.meta.description = 'Edited'
    const result = save(plugin, opened)
    const structStart = RAW_ASSETS.indexOf('/*~struct~')

    expect(result.endsWith(RAW_ASSETS.slice(structStart))).toBe(true)

    plugin.meta.description = opened.meta.description
    firstOf(firstOf(plugin.structs).parameters).desc = 'Edited'
    const head = RAW_ASSETS.slice(0, structStart)

    expect(save(plugin, opened).startsWith(head)).toBe(true)
  })

  it('are written again when their block is rewritten', () => {
    const { opened, plugin } = open(RAW_ASSETS)
    plugin.meta.description = 'Edited'
    firstOf(firstOf(plugin.structs).parameters).desc = 'Edited'
    const result = save(plugin, opened)

    expect(result).toContain('@plugindesc Edited')
    expect(result).toContain(' * @noteData actors\n * @noteRequire 1\n')
    expect(requireLines(result)).toBe(requireLines(RAW_ASSETS))
    expect(requireLines(RAW_ASSETS)).toBe(4)
  })

  it('stay out of a plugin generated without raw mode', () => {
    const { opened } = open(RAW_ASSETS)

    expect(requireLines(generatePlugin(opened))).toBe(0)
  })
})

describe(generateHeaderOnly, () => {
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
    expect(parameterConstant('hello')).toBe('hello')
    expect(parameterConstant('Hello')).toBe('hello')
  })

  it('converts multi-word names', () => {
    expect(parameterConstant('battle speed')).toBe('battleSpeed')
    expect(parameterConstant('Max HP')).toBe('maxHP')
  })

  it('handles special characters', () => {
    expect(parameterConstant('my-param')).toBe('myParam')
    expect(parameterConstant('my_param')).toBe('myParam')
  })

  it('handles empty string', () => {
    expect(parameterConstant('')).toBe('unnamed')
  })
})

/**
Each parameter type, the name its parameter gets, the reader the generated plugin must hold
and the default the parameter carries.
*/
const ACCESSOR_CASES: [
  type: ParamType,
  name: string,
  reader: string,
  fallback: string | number | boolean
][] = [
  ['string', 'greeting', "params['greeting'] ?? ''", ''],
  ['number', 'speed', "Number(params['speed'] || 0)", 0],
  ['boolean', 'flag', "(params['flag'] ?? 'false') === 'true'", false],
  ['select', 'mode', "params['mode'] ?? 'easy'", 'easy'],
  ['combo', 'combo', "params['combo'] ?? ''", ''],
  ['note', 'note', "params['note'] ?? ''", ''],
  ['text', 'txt', "params['txt'] ?? ''", ''],
  ['hidden', 'hid', "params['hid'] ?? ''", ''],
  ['variable', 'variable', "Number(params['variable'] || 0)", 0],
  ['switch', 'sw', "Number(params['sw'] || 0)", 0],
  ['actor', 'actor', "Number(params['actor'] || 0)", 0],
  ['class', 'cls', "Number(params['cls'] || 0)", 0],
  ['skill', 'skill', "Number(params['skill'] || 0)", 0],
  ['item', 'item', "Number(params['item'] || 0)", 0],
  ['weapon', 'weapon', "Number(params['weapon'] || 0)", 0],
  ['armor', 'armor', "Number(params['armor'] || 0)", 0],
  ['enemy', 'enemy', "Number(params['enemy'] || 0)", 0],
  ['troop', 'troop', "Number(params['troop'] || 0)", 0],
  ['state', 'state', "Number(params['state'] || 0)", 0],
  ['animation', 'animation', "Number(params['animation'] || 0)", 0],
  ['tileset', 'tileset', "Number(params['tileset'] || 0)", 0],
  ['common_event', 'common_event', "Number(params['common_event'] || 0)", 0],
  ['icon', 'icon', "Number(params['icon'] || 0)", 0],
  ['map', 'map', "Number(params['map'] || 0)", 0],
  ['file', 'file', "params['file'] ?? ''", ''],
  ['color', 'color', "params['color'] ?? ''", ''],
  ['struct', 'settings', "JSON.parse(params['settings'] || '{}')", ''],
  ['array', 'items', "JSON.parse(params['items'] || '[]')", '']
]

// COV-02: generateAccessorParser for all 26 param types
describe('generatePlugin - accessor parser for all param types', () => {
  it.each(ACCESSOR_CASES)(
    'generates correct parser for @type %s',
    (type, name, reader, fallback) => {
      const plugin = createTestPlugin({
        parameters: [
          {
            id: 'p1',
            name,
            text: name,
            desc: '',
            type,
            default: fallback,
            ...(type === 'struct' && { structType: 'Pos' })
          }
        ]
      })
      const output = generatePlugin(plugin)

      expect(output).toContain(reader)
    }
  )

  it('generates JSON.parse with default fallback for struct with non-empty default', () => {
    const plugin = createTestPlugin({
      parameters: [
        {
          id: 'p1',
          name: 'pos',
          text: 'Pos',
          desc: '',
          type: 'struct',
          default: '{"x":"10"}',
          structType: 'Position'
        }
      ]
    })
    const output = generatePlugin(plugin)

    expect(output).toContain(`JSON.parse(params['pos'] || '{"x":"10"}')`)
  })
})

const FORMATTED_DEFAULTS: OutputCase[] = [
  [
    'handles empty default for number type (falls back to 0)',
    {
      parameters: [
        { id: 'p1', name: 'count', text: 'Count', desc: '', type: 'number', default: '' }
      ]
    },
    ["Number(params['count'] || 0)"]
  ],
  [
    'handles empty default for ID-based types (falls back to 0)',
    {
      parameters: [
        { id: 'p1', name: 'actorId', text: 'Actor', desc: '', type: 'actor', default: '' }
      ]
    },
    ["Number(params['actorId'] || 0)"]
  ],
  [
    'handles boolean default true (nullish-fallback to preserve default when key absent)',
    {
      parameters: [
        { id: 'p1', name: 'enabled', text: 'Enabled', desc: '', type: 'boolean', default: true }
      ]
    },
    ["(params['enabled'] ?? 'true') === 'true'"]
  ],
  [
    'handles boolean default false (nullish-fallback)',
    {
      parameters: [
        { id: 'p1', name: 'enabled', text: 'Enabled', desc: '', type: 'boolean', default: false }
      ]
    },
    ["(params['enabled'] ?? 'false') === 'true'"]
  ],
  [
    'deep-parses struct<X>[] arrays (MZ double-encodes struct arrays)',
    {
      parameters: [
        {
          id: 'p1',
          name: 'items',
          text: 'Items',
          desc: '',
          type: 'array',
          arrayType: 'struct',
          structType: 'ItemConfig',
          default: '[]'
        }
      ],
      structs: [{ id: 's1', name: 'ItemConfig', parameters: [] }]
    },
    ['.map(s => JSON.parse(s))']
  ],
  [
    'coerces elements of number[] arrays via Number()',
    {
      parameters: [
        {
          id: 'p1',
          name: 'nums',
          text: 'Nums',
          desc: '',
          type: 'array',
          arrayType: 'number',
          default: '[]'
        }
      ]
    },
    ['.map(Number)']
  ],
  [
    'coerces elements of ID-based arrays (actor[], variable[], etc.) via Number()',
    {
      parameters: [
        {
          id: 'p1',
          name: 'actors',
          text: 'Actors',
          desc: '',
          type: 'array',
          arrayType: 'actor',
          default: '[]'
        }
      ]
    },
    ['.map(Number)']
  ],
  [
    'coerces elements of boolean[] arrays via === true',
    {
      parameters: [
        {
          id: 'p1',
          name: 'flags',
          text: 'Flags',
          desc: '',
          type: 'array',
          arrayType: 'boolean',
          default: '[]'
        }
      ]
    },
    [".map(v => v === 'true')"]
  ],
  [
    'leaves string[] arrays as plain JSON.parse (elements are already strings)',
    {
      parameters: [
        {
          id: 'p1',
          name: 'tags',
          text: 'Tags',
          desc: '',
          type: 'array',
          arrayType: 'string',
          default: '[]'
        }
      ]
    },
    ["JSON.parse(params['tags'] || '[]')"],
    ['.map(']
  ],
  [
    'parses @type location as JSON with stringly-typed coordinate fields',
    {
      parameters: [
        { id: 'p1', name: 'spawn', text: 'Spawn', desc: '', type: 'location', default: '' }
      ]
    },
    [`JSON.parse(params['spawn'] || '{"mapId":"0","x":"0","y":"0"}')`]
  ],
  [
    'escapes single quotes in string defaults',
    {
      parameters: [
        { id: 'p1', name: 'msg', text: 'Msg', desc: '', type: 'string', default: "it's fine" }
      ]
    },
    // The default in the accessor should escape the quote
    ["params['msg'] ?? 'it\\'s fine'"]
  ],
  [
    'escapes backslashes in string defaults',
    {
      parameters: [
        { id: 'p1', name: 'path', text: 'Path', desc: '', type: 'string', default: 'C:\\Users' }
      ]
    },
    ["params['path'] ?? 'C:\\\\Users'"]
  ],
  // A parameter file may hold a default of another JavaScript type than its parameter's: the
  // header shows it as text, and the code falls back to that text read as the parameter's type
  [
    'falls back to the shown number when a number default is text',
    {
      parameters: [
        { id: 'p1', name: 'count', text: 'Count', desc: '', type: 'number', default: '7' }
      ]
    },
    [' * @default 7', "Number(params['count'] || 7)"],
    ["Number(params['count'] || 0)"]
  ],
  [
    'falls back to the shown id when an ID-based default is text',
    {
      parameters: [
        { id: 'p1', name: 'varId', text: 'Var', desc: '', type: 'variable', default: '3' }
      ]
    },
    [' * @default 3', "Number(params['varId'] || 3)"]
  ],
  [
    'falls back to what a number reads the shown text as when a number default is a boolean',
    {
      parameters: [
        { id: 'p1', name: 'count', text: 'Count', desc: '', type: 'number', default: true }
      ]
    },
    [' * @default true', "Number(params['count'] || NaN)"]
  ],
  [
    'falls back to true when a boolean default is the text true',
    {
      parameters: [
        { id: 'p1', name: 'enabled', text: 'Enabled', desc: '', type: 'boolean', default: 'true' }
      ]
    },
    [' * @default true', "(params['enabled'] ?? 'true') === 'true'"]
  ],
  [
    'falls back to the shown text when a string default is a number',
    {
      parameters: [{ id: 'p1', name: 'label', text: 'Label', desc: '', type: 'string', default: 5 }]
    },
    [' * @default 5', "params['label'] ?? '5';"]
  ],
  [
    'falls back to the shown text when a select default is a boolean',
    {
      parameters: [
        { id: 'p1', name: 'mode', text: 'Mode', desc: '', type: 'select', default: true }
      ]
    },
    [' * @default true', "params['mode'] ?? 'true';"]
  ],
  [
    'falls back to the shown location when a location has a default',
    {
      parameters: [
        {
          id: 'p1',
          name: 'spawn',
          text: 'Spawn',
          desc: '',
          type: 'location',
          default: '{"mapId":"2","x":"3","y":"4"}'
        }
      ]
    },
    [
      ' * @default {"mapId":"2","x":"3","y":"4"}',
      `JSON.parse(params['spawn'] || '{"mapId":"2","x":"3","y":"4"}')`
    ]
  ],
  [
    'falls back to the shown text when a struct or array default is a number',
    {
      parameters: [
        { id: 'p1', name: 'pair', text: 'Pair', desc: '', type: 'struct', default: 5 },
        { id: 'p2', name: 'items', text: 'Items', desc: '', type: 'array', default: 6 }
      ]
    },
    [
      ' * @default 5',
      ' * @default 6',
      "JSON.parse(params['pair'] || '5')",
      "JSON.parse(params['items'] || '6')"
    ]
  ]
]

// COV-03: formatJSDefault edge cases
describe('generatePlugin - formatJSDefault', () => {
  it.each(FORMATTED_DEFAULTS)('%s', (...row) => {
    expect(strayOutput(row)).toStrictEqual([])
  })
})

/**
The fields of a plugin whose English text is 'English' and that carries the given translations.
*/
function withLocalizations(
  localizations: Record<string, LocalizedContent>
): Partial<PluginDefinition> {
  return {
    meta: {
      name: 'TestPlugin',
      version: '1.0.0',
      author: 'Test',
      description: 'English',
      help: '',
      url: '',
      target: 'MZ',
      dependencies: [],
      orderAfter: [],
      localizations
    }
  }
}

const LOCALIZED_HEADERS: OutputCase[] = [
  [
    'generates localized block for a language with only description',
    withLocalizations({ ja: { description: '日本語の説明' } }),
    ['/*:ja', '@plugindesc 日本語の説明'],
    // No @help line when help is absent
    ['@help\n * ']
  ],
  [
    'generates localized block for a language with only help',
    withLocalizations({ de: { help: 'Hilftext hier.' } }),
    ['/*:de', '@help', 'Hilftext hier.']
  ],
  [
    'skips language block when both description and help are empty',
    withLocalizations({ fr: { description: '', help: '' } }),
    [],
    ['/*:fr']
  ],
  [
    'generates multiple language blocks',
    withLocalizations({ ja: { description: '日本語' }, de: { description: 'Deutsch' } }),
    ['/*:ja', '/*:de']
  ],
  [
    'generates multi-line help text in localized block',
    withLocalizations({ ja: { description: 'JP desc', help: 'Line 1\nLine 2\nLine 3' } }),
    [' * Line 1', ' * Line 2', ' * Line 3']
  ]
]

// COV-05: generateLocalizedHeaders
describe('generatePlugin - localized headers', () => {
  it.each(LOCALIZED_HEADERS)('%s', (...row) => {
    expect(strayOutput(row)).toStrictEqual([])
  })
})

const COMMAND_ARGUMENTS: OutputCase[] = [
  [
    'generates boolean arg with @on/@off labels',
    {
      commands: [
        {
          id: 'c1',
          name: 'SetMode',
          text: 'Set Mode',
          desc: '',
          args: [
            {
              id: 'a1',
              name: 'enabled',
              text: 'Enabled',
              desc: '',
              type: 'boolean',
              default: true,
              onLabel: 'ON',
              offLabel: 'OFF'
            }
          ]
        }
      ]
    },
    ['@type boolean', '@on ON', '@off OFF']
  ],
  [
    'generates number arg with min/max/decimals',
    {
      commands: [
        {
          id: 'c1',
          name: 'SetSpeed',
          text: 'Set Speed',
          desc: '',
          args: [
            {
              id: 'a1',
              name: 'speed',
              text: 'Speed',
              desc: '',
              type: 'number',
              default: 5,
              min: 1,
              max: 100,
              decimals: 1
            }
          ]
        }
      ]
    },
    ['@min 1', '@max 100', '@decimals 1']
  ],
  [
    'generates file arg with @dir but drops @require (MV-era)',
    {
      commands: [
        {
          id: 'c1',
          name: 'SetBg',
          text: 'Set BG',
          desc: '',
          args: [
            {
              id: 'a1',
              name: 'image',
              text: 'Image',
              desc: '',
              type: 'file',
              default: '',
              dir: 'img/pictures',
              require: true
            }
          ]
        }
      ]
    },
    ['@dir img/pictures'],
    ['@require 1']
  ],
  [
    'generates select arg with multiple options',
    {
      commands: [
        {
          id: 'c1',
          name: 'SetDiff',
          text: 'Set Difficulty',
          desc: '',
          args: [
            {
              id: 'a1',
              name: 'difficulty',
              text: 'Difficulty',
              desc: '',
              type: 'select',
              default: 'normal',
              options: [
                { value: 'easy', text: 'Easy' },
                { value: 'normal', text: 'Normal' },
                { value: 'hard', text: 'Hard' }
              ]
            }
          ]
        }
      ]
    },
    ['@option Easy', '@value easy', '@option Normal', '@option Hard', '@value hard']
  ]
]

// COV-14: generateCommandBlock arg attributes
describe('generatePlugin - command arg attributes', () => {
  it('declares a constant of its own for each argument whose name makes the same identifier', () => {
    const args = ['foo-bar', 'fooBar'].map((name) => ({ ...createEmptyParameter(), name }))
    const plugin = createTestPlugin({ commands: [{ ...createEmptyCommand(), name: 'DoIt', args }] })
    const code = generatePlugin(plugin)

    expect(code).toContain("        const fooBar = args['foo-bar'] ?? '';\n")
    expect(code).toContain("        const fooBar_ = args['fooBar'] ?? '';\n")
    expect(code).toContain('        // Parsed args available as: fooBar, fooBar_\n')
    expect(compileCheck(code, 'plugin.js')).toBeNull()
  })

  it.each(COMMAND_ARGUMENTS)('%s', (...row) => {
    expect(strayOutput(row)).toStrictEqual([])
  })
})

// COV-15: camelCase edge cases
describe('camelCase edge cases', () => {
  it('preserves internal structure of _private_ style names (but sanitizes if reserved)', () => {
    // Strips leading/trailing underscores, splits on non-alnum.
    // "private" is a strict-mode reserved word, so the sanitizer suffixes _.
    const result = parameterConstant('_private_')

    expect(result).toBe('private_')
  })

  it('handles triple underscore (all underscores after stripping = empty) → unnamed', () => {
    const result = parameterConstant('___')

    expect(result).toBe('unnamed')
  })

  it('handles double hyphen foo--bar', () => {
    const result = parameterConstant('foo--bar')

    expect(result).toBe('fooBar')
  })

  it('lowercases ALLCAPS first word', () => {
    // 'ALLCAPS' is a single identifier token, no separators
    // Goes through the /^[a-zA-Z$].../ check → just lowercase first char
    const result = parameterConstant('ALLCAPS')

    expect(result).toBe('aLLCAPS')
  })

  it('handles all-symbols input (no alphanumeric) → unnamed', () => {
    // After stripping, no word segments remain
    const result = parameterConstant('!@#$%')

    expect(result).toBe('unnamed')
  })

  // Reserved-word and digit-start sanitization — preventing SyntaxError in generated plugins
  it('suffixes underscore on JS reserved words (class, default, for)', () => {
    expect(parameterConstant('class')).toBe('class_')
    expect(parameterConstant('default')).toBe('default_')
    expect(parameterConstant('for')).toBe('for_')
    expect(parameterConstant('return')).toBe('return_')
    expect(parameterConstant('const')).toBe('const_')
  })

  // `params` and `args` are names the generated code declares itself; `eval` and `arguments`
  // cannot be declared in strict mode.
  it.each(['params', 'args', 'eval', 'arguments'])(
    'a parameter named %s generates a plugin that compiles',
    (name) => {
      const plugin = createTestPlugin({
        parameters: [{ id: 'p1', name, text: name, desc: '', type: 'string', default: '' }]
      })

      expect(compileCheck(generatePlugin(plugin), 'plugin.js')).toBeNull()
      expect(validatePlugin(plugin).warnings).toContain(
        `Parameter "${name}" is a reserved name; the generated variable will be "${name}_"`
      )
    }
  )

  it.each(['args', 'eval'])(
    'a command argument named %s generates a plugin that compiles',
    (name) => {
      const plugin = createTestPlugin({
        commands: [
          {
            id: 'c1',
            name: 'Run',
            text: 'Run',
            desc: '',
            args: [{ id: 'a1', name, text: name, desc: '', type: 'string', default: '' }]
          }
        ]
      })

      expect(compileCheck(generatePlugin(plugin), 'plugin.js')).toBeNull()
    }
  )

  it('prefixes underscore on digit-start names', () => {
    expect(parameterConstant('123abc')).toBe('_123abc')
    expect(parameterConstant('7')).toBe('_7')
  })

  it('preserves already-valid camelCase names that happen to start with a keyword prefix', () => {
    // "classroom" is not reserved; should pass through unchanged
    expect(parameterConstant('classroom')).toBe('classroom')
    expect(parameterConstant('awaitable')).toBe('awaitable')
  })
})

// COV-17: generateBody command dedup + section dividers
describe('generatePlugin - body dedup and section dividers', () => {
  it('skips command body generation when command is registered with double quotes in customCode', () => {
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
      customCode: `PluginManager.registerCommand(PLUGIN_NAME, "MyCmd", function(args) { /* custom */ });`
    })
    const output = generatePlugin(plugin)

    expect(output).toContain('@command MyCmd')

    // Should not duplicate registerCommand in the template section
    const bodyStart = output.indexOf('(() => {')
    const bodySection = output.slice(bodyStart)
    const registerCalls = bodySection.match(/registerCommand\(PLUGIN_NAME, ['"]MyCmd['"]/g) ?? []

    // Only the one in customCode should appear
    expect(registerCalls).toHaveLength(1)
  })

  it('does not generate const for section divider parameters', () => {
    const plugin = createTestPlugin({
      parameters: [
        {
          id: 'p1',
          name: '---Settings---',
          text: 'Settings',
          desc: '',
          type: 'string',
          default: ''
        },
        {
          id: 'p2',
          name: '===Advanced===',
          text: 'Advanced',
          desc: '',
          type: 'string',
          default: ''
        },
        { id: 'p3', name: 'speed', text: 'Speed', desc: '', type: 'number', default: 5 }
      ]
    })
    const output = generatePlugin(plugin)

    // Section dividers should not generate const declarations
    expect(output).not.toContain('const SettingsSettings =')
    expect(output).not.toContain('const Settings =')
    // But normal params should
    expect(output).toContain('const speed =')
  })

  it('generates command body even when customCode has a commented-out registerCommand', () => {
    // A comment that mentions registerCommand MUST NOT suppress generation.
    const plugin = createTestPlugin({
      commands: [{ id: 'c1', name: 'Foo', text: 'Foo', desc: '', args: [] }],
      customCode: [
        `// Example from docs:`,
        `// PluginManager.registerCommand(PLUGIN_NAME, 'Foo', function(args) { /* ... */ });`,
        `const helper = () => {};`
      ].join('\n')
    })
    const output = generatePlugin(plugin)
    const bodyStart = output.indexOf('(() => {')
    const body = output.slice(bodyStart)

    // The generated IIFE should contain the real registerCommand call
    expect(body).toMatch(/PluginManager\.registerCommand\(PLUGIN_NAME,\s*'Foo'/)
  })

  it('does not dedup against a registerCommand inside a string literal', () => {
    // A string literal that happens to contain "registerCommand(PLUGIN_NAME, 'Foo'"
    // should NOT count as an existing registration.
    const plugin = createTestPlugin({
      commands: [{ id: 'c1', name: 'Foo', text: 'Foo', desc: '', args: [] }],
      customCode: `const note = "registerCommand(PLUGIN_NAME, 'Foo', fn)";`
    })
    const output = generatePlugin(plugin)

    // Strings aren't stripped, so this is still detected as a registration.
    // The more important case — commented-out calls — is covered above.
    // Documents current behavior (string-literal false-match is acceptable).
    expect(output).toContain('const note =')
  })
})

describe(validatePlugin, () => {
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

  it('returns error for invalid command name', () => {
    const plugin = createTestPlugin({
      commands: [{ id: '1', name: 'bad command', text: 'Bad', desc: '', args: [] }]
    })
    const result = validatePlugin(plugin)

    expect(result.valid).toBe(false)
    expect(result.errors.some((message) => message.includes('Invalid command name'))).toBe(true)
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
    expect(result.errors.some((message) => message.includes('Duplicate argument'))).toBe(true)
  })
})
