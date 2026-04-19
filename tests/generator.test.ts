// Tests for generator
import { describe, it, expect } from 'vitest'
import {
  generatePlugin,
  generateBodyPreserved,
  generateRawMode,
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
    const code = generatePlugin(plugin)
    expect(() => new Function(code)).not.toThrow()
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

  it('emits @default for struct parameter with JSON default', () => {
    const plugin = createTestPlugin({
      parameters: [
        {
          id: 'p1',
          name: 'settings',
          text: 'Settings',
          desc: '',
          type: 'struct',
          default: '{"x":"100","y":"200"}',
          structType: 'Position'
        }
      ],
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
    expect(output).toContain('@type struct<Position>')
    expect(output).toContain('@default {"x":"100","y":"200"}')
  })

  it('uses struct default as JSON.parse fallback in body', () => {
    const plugin = createTestPlugin({
      parameters: [
        {
          id: 'p1',
          name: 'settings',
          text: 'Settings',
          desc: '',
          type: 'struct',
          default: '{"x":"100","y":"200"}',
          structType: 'Position'
        }
      ],
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
    expect(output).toContain('JSON.parse(params[\'settings\'] || \'{"x":"100","y":"200"}\')')
  })

  it('falls back to empty object when struct has no default', () => {
    const plugin = createTestPlugin({
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
    })
    const output = generatePlugin(plugin)
    expect(output).toContain("JSON.parse(params['pos'] || '{}')")
  })
})

// COV-01: generateRawMode injection paths
describe('generateRawMode injection paths', () => {
  function makeRawPlugin(
    rawSource: string,
    overrides: Partial<PluginDefinition> = {}
  ): PluginDefinition {
    return {
      id: 'raw-id',
      rawSource,
      meta: {
        name: 'RawPlugin',
        version: '1.0.0',
        author: 'Test',
        description: 'Raw plugin',
        help: '',
        url: '',
        target: 'MZ',
        dependencies: [],
        orderAfter: [],
        localizations: {}
      },
      parameters: [],
      commands: [],
      structs: [],
      ...overrides
    }
  }

  it('falls back to generatePlugin when rawSource is missing', () => {
    const plugin = createTestPlugin()
    const result = generateRawMode(plugin)
    expect(result).toContain('(() => {')
  })

  it('injects PLUGIN_NAME + params declaration when body has no PluginManager.parameters()', () => {
    const raw = `/*:
 * @plugindesc Test
 * @author Test
 */

(() => {
    'use strict';
    // custom logic only
    console.log('hello');
})();`
    const plugin = makeRawPlugin(raw, {
      parameters: [
        { id: 'p1', name: 'newParam', text: 'New', desc: '', type: 'string', default: 'x' }
      ]
    })
    const result = generateRawMode(plugin)
    expect(result).toContain("const PLUGIN_NAME = 'RawPlugin';")
    expect(result).toContain('const params = PluginManager.parameters(PLUGIN_NAME);')
    expect(result).toContain('const newParam =')
  })

  it('injects after existing params declaration without duplicating PLUGIN_NAME', () => {
    const raw = `/*:
 * @plugindesc Test
 * @author Test
 *
 * @param oldParam
 * @type string
 * @default hello
 */

(() => {
    'use strict';
    const PLUGIN_NAME = 'RawPlugin';
    const params = PluginManager.parameters(PLUGIN_NAME);
    const oldParam = params['oldParam'] || 'hello';
})();`
    const plugin = makeRawPlugin(raw, {
      parameters: [
        { id: 'p1', name: 'oldParam', text: 'Old', desc: '', type: 'string', default: 'hello' },
        { id: 'p2', name: 'newParam', text: 'New', desc: '', type: 'number', default: 5 }
      ]
    })
    const result = generateRawMode(plugin)
    // Should not duplicate PLUGIN_NAME
    const pluginNameCount = (result.match(/const PLUGIN_NAME/g) || []).length
    expect(pluginNameCount).toBe(1)
    expect(result).toContain('const newParam =')
  })

  it('falls back to IIFE-opening injection when no use strict present', () => {
    const raw = `/*:
 * @plugindesc Test
 * @author Test
 */

(() => {
    // no use strict here
    console.log('hello');
})();`
    const plugin = makeRawPlugin(raw, {
      parameters: [
        { id: 'p1', name: 'fresh', text: 'Fresh', desc: '', type: 'string', default: '' }
      ]
    })
    const result = generateRawMode(plugin)
    expect(result).toContain('const fresh =')
  })

  it('injects new commands before closing })();', () => {
    const raw = `/*:
 * @plugindesc Test
 * @author Test
 */

(() => {
    'use strict';
    const PLUGIN_NAME = 'RawPlugin';
    // existing code
    console.log('loaded');
})();`
    const plugin = makeRawPlugin(raw, {
      commands: [{ id: 'c1', name: 'NewCommand', text: 'New Command', desc: '', args: [] }]
    })
    const result = generateRawMode(plugin)
    expect(result).toContain("registerCommand(PLUGIN_NAME, 'NewCommand'")
    // Command should appear before })();
    const cmdIdx = result.indexOf("registerCommand(PLUGIN_NAME, 'NewCommand'")
    const closingIdx = result.lastIndexOf('})();')
    expect(cmdIdx).toBeLessThan(closingIdx)
  })

  it('preserves preamble (license text) before first annotation', () => {
    const raw = `/*:
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
    const plugin = makeRawPlugin(raw)
    plugin.meta.description = 'New description'
    const result = generateRawMode(plugin)
    // Preamble should be preserved in output
    expect(result).toContain('MZ Plugin Studio - RawPlugin')
    expect(result).toContain('Copyright (c) 2024 Test Author')
    // New description should be present
    expect(result).toContain('@plugindesc New description')
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

// COV-02: generateAccessorParser for all 26 param types
describe('generatePlugin - accessor parser for all param types', () => {
  const cases: Array<{ type: string; expectContains: string; default?: unknown }> = [
    { type: 'string', expectContains: "params['greeting'] || ''", default: '' },
    { type: 'number', expectContains: "Number(params['speed'] || 0)", default: 0 },
    { type: 'boolean', expectContains: "(params['flag'] ?? 'false') === 'true'", default: false },
    { type: 'select', expectContains: "params['mode'] || 'easy'", default: 'easy' },
    { type: 'combo', expectContains: "params['combo'] || ''", default: '' },
    { type: 'note', expectContains: "params['note'] || ''", default: '' },
    { type: 'text', expectContains: "params['txt'] || ''", default: '' },
    { type: 'hidden', expectContains: "params['hid'] || ''", default: '' },
    { type: 'variable', expectContains: "Number(params['variable'] || 0)", default: 0 },
    { type: 'switch', expectContains: "Number(params['sw'] || 0)", default: 0 },
    { type: 'actor', expectContains: "Number(params['actor'] || 0)", default: 0 },
    { type: 'class', expectContains: "Number(params['cls'] || 0)", default: 0 },
    { type: 'skill', expectContains: "Number(params['skill'] || 0)", default: 0 },
    { type: 'item', expectContains: "Number(params['item'] || 0)", default: 0 },
    { type: 'weapon', expectContains: "Number(params['weapon'] || 0)", default: 0 },
    { type: 'armor', expectContains: "Number(params['armor'] || 0)", default: 0 },
    { type: 'enemy', expectContains: "Number(params['enemy'] || 0)", default: 0 },
    { type: 'troop', expectContains: "Number(params['troop'] || 0)", default: 0 },
    { type: 'state', expectContains: "Number(params['state'] || 0)", default: 0 },
    { type: 'animation', expectContains: "Number(params['animation'] || 0)", default: 0 },
    { type: 'tileset', expectContains: "Number(params['tileset'] || 0)", default: 0 },
    { type: 'common_event', expectContains: "Number(params['common_event'] || 0)", default: 0 },
    { type: 'icon', expectContains: "Number(params['icon'] || 0)", default: 0 },
    { type: 'map', expectContains: "Number(params['map'] || 0)", default: 0 },
    { type: 'file', expectContains: "params['file'] || ''", default: '' },
    { type: 'color', expectContains: "params['color'] || ''", default: '' },
    {
      type: 'struct',
      expectContains: "JSON.parse(params['settings'] || '{}')",
      default: ''
    },
    { type: 'array', expectContains: "JSON.parse(params['items'] || '[]')", default: '' }
  ]

  // name map: type → param name used
  const nameForType: Record<string, string> = {
    string: 'greeting',
    number: 'speed',
    boolean: 'flag',
    select: 'mode',
    combo: 'combo',
    note: 'note',
    text: 'txt',
    hidden: 'hid',
    variable: 'variable',
    switch: 'sw',
    actor: 'actor',
    class: 'cls',
    skill: 'skill',
    item: 'item',
    weapon: 'weapon',
    armor: 'armor',
    enemy: 'enemy',
    troop: 'troop',
    state: 'state',
    animation: 'animation',
    tileset: 'tileset',
    common_event: 'common_event',
    icon: 'icon',
    map: 'map',
    file: 'file',
    color: 'color',
    struct: 'settings',
    array: 'items'
  }

  for (const { type, expectContains, default: def } of cases) {
    it(`generates correct parser for @type ${type}`, () => {
      const name = nameForType[type]
      const plugin = createTestPlugin({
        parameters: [
          {
            id: 'p1',
            name,
            text: name,
            desc: '',
            type: type as PluginDefinition['parameters'][0]['type'],
            default: def as string | number | boolean,
            structType: type === 'struct' ? 'Pos' : undefined
          }
        ]
      })
      const output = generatePlugin(plugin)
      expect(output).toContain(expectContains)
    })
  }

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

// COV-03: formatJSDefault edge cases
describe('generatePlugin - formatJSDefault', () => {
  it('handles undefined default for number type (falls back to 0)', () => {
    const plugin = createTestPlugin({
      parameters: [
        {
          id: 'p1',
          name: 'count',
          text: 'Count',
          desc: '',
          type: 'number',
          default: undefined as unknown as number
        }
      ]
    })
    const output = generatePlugin(plugin)
    expect(output).toContain("Number(params['count'] || 0)")
  })

  it('handles undefined default for ID-based types (falls back to 0)', () => {
    const plugin = createTestPlugin({
      parameters: [
        {
          id: 'p1',
          name: 'actorId',
          text: 'Actor',
          desc: '',
          type: 'actor',
          default: undefined as unknown as number
        }
      ]
    })
    const output = generatePlugin(plugin)
    expect(output).toContain("Number(params['actorId'] || 0)")
  })

  it('handles boolean default true (nullish-fallback to preserve default when key absent)', () => {
    const plugin = createTestPlugin({
      parameters: [
        { id: 'p1', name: 'enabled', text: 'Enabled', desc: '', type: 'boolean', default: true }
      ]
    })
    const output = generatePlugin(plugin)
    expect(output).toContain("(params['enabled'] ?? 'true') === 'true'")
  })

  it('handles boolean default false (nullish-fallback)', () => {
    const plugin = createTestPlugin({
      parameters: [
        { id: 'p1', name: 'enabled', text: 'Enabled', desc: '', type: 'boolean', default: false }
      ]
    })
    const output = generatePlugin(plugin)
    expect(output).toContain("(params['enabled'] ?? 'false') === 'true'")
  })

  it('deep-parses struct<X>[] arrays (MZ double-encodes struct arrays)', () => {
    const plugin = createTestPlugin({
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
    })
    const output = generatePlugin(plugin)
    expect(output).toContain('.map(s => JSON.parse(s))')
  })

  it('coerces elements of number[] arrays via Number()', () => {
    const plugin = createTestPlugin({
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
    })
    const output = generatePlugin(plugin)
    expect(output).toContain('.map(Number)')
  })

  it('coerces elements of ID-based arrays (actor[], variable[], etc.) via Number()', () => {
    const plugin = createTestPlugin({
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
    })
    const output = generatePlugin(plugin)
    expect(output).toContain('.map(Number)')
  })

  it('coerces elements of boolean[] arrays via === true', () => {
    const plugin = createTestPlugin({
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
    })
    const output = generatePlugin(plugin)
    expect(output).toContain(".map(v => v === 'true')")
  })

  it('leaves string[] arrays as plain JSON.parse (elements are already strings)', () => {
    const plugin = createTestPlugin({
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
    })
    const output = generatePlugin(plugin)
    expect(output).toContain("JSON.parse(params['tags'] || '[]')")
    expect(output).not.toContain('.map(')
  })

  it('parses @type location as JSON with stringly-typed coordinate fields', () => {
    const plugin = createTestPlugin({
      parameters: [
        {
          id: 'p1',
          name: 'spawn',
          text: 'Spawn',
          desc: '',
          type: 'location',
          default: ''
        }
      ]
    })
    const output = generatePlugin(plugin)
    expect(output).toContain(`JSON.parse(params['spawn'] || '{"mapId":"0","x":"0","y":"0"}')`)
  })

  it('escapes single quotes in string defaults', () => {
    const plugin = createTestPlugin({
      parameters: [
        {
          id: 'p1',
          name: 'msg',
          text: 'Msg',
          desc: '',
          type: 'string',
          default: "it's fine"
        }
      ]
    })
    const output = generatePlugin(plugin)
    // The default in the accessor should escape the quote
    expect(output).toContain("params['msg'] || 'it\\'s fine'")
  })

  it('escapes backslashes in string defaults', () => {
    const plugin = createTestPlugin({
      parameters: [
        {
          id: 'p1',
          name: 'path',
          text: 'Path',
          desc: '',
          type: 'string',
          default: 'C:\\Users'
        }
      ]
    })
    const output = generatePlugin(plugin)
    expect(output).toContain("params['path'] || 'C:\\\\Users'")
  })
})

// COV-05: generateLocalizedHeaders
describe('generatePlugin - localized headers', () => {
  it('generates localized block for a language with only description', () => {
    const plugin = createTestPlugin({
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
        localizations: {
          ja: { description: '日本語の説明' }
        }
      }
    })
    const output = generatePlugin(plugin)
    expect(output).toContain('/*:ja')
    expect(output).toContain('@plugindesc 日本語の説明')
    // No @help line when help is absent
    expect(output).not.toContain('@help\n * ')
  })

  it('generates localized block for a language with only help', () => {
    const plugin = createTestPlugin({
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
        localizations: {
          de: { help: 'Hilftext hier.' }
        }
      }
    })
    const output = generatePlugin(plugin)
    expect(output).toContain('/*:de')
    expect(output).toContain('@help')
    expect(output).toContain('Hilftext hier.')
  })

  it('skips language block when both description and help are empty', () => {
    const plugin = createTestPlugin({
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
        localizations: {
          fr: { description: '', help: '' }
        }
      }
    })
    const output = generatePlugin(plugin)
    expect(output).not.toContain('/*:fr')
  })

  it('generates multiple language blocks', () => {
    const plugin = createTestPlugin({
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
        localizations: {
          ja: { description: '日本語' },
          de: { description: 'Deutsch' }
        }
      }
    })
    const output = generatePlugin(plugin)
    expect(output).toContain('/*:ja')
    expect(output).toContain('/*:de')
  })

  it('generates multi-line help text in localized block', () => {
    const plugin = createTestPlugin({
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
        localizations: {
          ja: { description: 'JP desc', help: 'Line 1\nLine 2\nLine 3' }
        }
      }
    })
    const output = generatePlugin(plugin)
    expect(output).toContain(' * Line 1')
    expect(output).toContain(' * Line 2')
    expect(output).toContain(' * Line 3')
  })
})

// COV-14: generateCommandBlock arg attributes
describe('generatePlugin - command arg attributes', () => {
  it('generates boolean arg with @on/@off labels', () => {
    const plugin = createTestPlugin({
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
    })
    const output = generatePlugin(plugin)
    expect(output).toContain('@type boolean')
    expect(output).toContain('@on ON')
    expect(output).toContain('@off OFF')
  })

  it('generates number arg with min/max/decimals', () => {
    const plugin = createTestPlugin({
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
    })
    const output = generatePlugin(plugin)
    expect(output).toContain('@min 1')
    expect(output).toContain('@max 100')
    expect(output).toContain('@decimals 1')
  })

  it('generates file arg with @dir but drops @require (MV-era)', () => {
    const plugin = createTestPlugin({
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
    })
    const output = generatePlugin(plugin)
    expect(output).toContain('@dir img/pictures')
    expect(output).not.toContain('@require 1')
  })

  it('generates select arg with multiple options', () => {
    const plugin = createTestPlugin({
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
    })
    const output = generatePlugin(plugin)
    expect(output).toContain('@option Easy')
    expect(output).toContain('@value easy')
    expect(output).toContain('@option Normal')
    expect(output).toContain('@option Hard')
    expect(output).toContain('@value hard')
  })
})

// COV-15: camelCase edge cases
describe('camelCase edge cases', () => {
  it('preserves internal structure of _private_ style names (but sanitizes if reserved)', () => {
    // Strips leading/trailing underscores, splits on non-alnum.
    // "private" is a strict-mode reserved word, so the sanitizer suffixes _.
    const result = camelCase('_private_')
    expect(result).toBe('private_')
  })

  it('handles triple underscore (all underscores after stripping = empty) → unnamed', () => {
    const result = camelCase('___')
    expect(result).toBe('unnamed')
  })

  it('handles double hyphen foo--bar', () => {
    const result = camelCase('foo--bar')
    expect(result).toBe('fooBar')
  })

  it('lowercases ALLCAPS first word', () => {
    // 'ALLCAPS' is a single identifier token, no separators
    // Goes through the /^[a-zA-Z$].../ check → just lowercase first char
    const result = camelCase('ALLCAPS')
    expect(result).toBe('aLLCAPS')
  })

  it('handles all-symbols input (no alphanumeric) → unnamed', () => {
    // After stripping, no word segments remain
    const result = camelCase('!@#$%')
    expect(result).toBe('unnamed')
  })

  // Reserved-word and digit-start sanitization — preventing SyntaxError in generated plugins
  it('suffixes underscore on JS reserved words (class, default, for)', () => {
    expect(camelCase('class')).toBe('class_')
    expect(camelCase('default')).toBe('default_')
    expect(camelCase('for')).toBe('for_')
    expect(camelCase('return')).toBe('return_')
    expect(camelCase('const')).toBe('const_')
  })

  it('prefixes underscore on digit-start names', () => {
    expect(camelCase('123abc')).toBe('_123abc')
    expect(camelCase('7')).toBe('_7')
  })

  it('preserves already-valid camelCase names that happen to start with a keyword prefix', () => {
    // "classroom" is not reserved; should pass through unchanged
    expect(camelCase('classroom')).toBe('classroom')
    expect(camelCase('awaitable')).toBe('awaitable')
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
    const registerCalls = bodySection.match(/registerCommand\(PLUGIN_NAME, ['"]MyCmd['"]/g) || []
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
})

// COV-18: generateBodyPreserved
describe('generateBodyPreserved', () => {
  it('plugin with codeBody set returns it verbatim', () => {
    const plugin = createTestPlugin({
      codeBody: '/* verbatim code */'
    })
    const result = generateBodyPreserved(plugin)
    expect(result).toBe('/* verbatim code */')
  })

  it('plugin without codeBody falls back to generated body', () => {
    const plugin = createTestPlugin({
      codeBody: undefined
    })
    const result = generateBodyPreserved(plugin)
    expect(result).toContain('(() => {')
    expect(result).toContain("'use strict';")
  })
})

describe('validatePlugin', () => {
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
