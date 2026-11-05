// Edge case tests for PluginParser and raw mode round-trip
import { describe, it, expect } from 'vitest'
import { PluginParser } from '../../src/main/services/pluginParser'
import { generatePlugin, generateRawMode } from '../../src/renderer/src/lib/generator/index'
import { toBaseline, type PluginParameter } from '../../src/shared/types/plugin'

// The fragments of a text it does not hold (no text holds none)
const missing = (text: string | undefined, fragments: string[]): string[] =>
  fragments.filter((fragment) => text?.includes(fragment) !== true)

describe('pluginParser edge cases: rawSource storage', () => {
  it('stores the complete original source when parsing', () => {
    const content = `/*:
 * @target MZ
 * @plugindesc My Plugin
 * @author TestAuthor
 *
 * @param speed
 * @text Speed
 * @type number
 * @default 5
 *
 * @help
 * This is the help text.
 */

(() => {
    'use strict';
    const params = PluginManager.parameters('MyPlugin');
    const speed = Number(params['speed'] || 5);

    // Custom logic
    console.log('Speed is', speed);
})();`

    const result = PluginParser.parsePlugin(content, 'MyPlugin.js')

    expect(result.rawSource).toBe(content)
  })

  it('stores rawSource even for minimal plugins', () => {
    const content = `/*:
 * @plugindesc Minimal
 * @author Test
 */`
    const result = PluginParser.parsePlugin(content)

    expect(result.rawSource).toBe(content)
  })

  it('stores rawSource for empty/malformed input', () => {
    const content = 'not a plugin at all'
    const result = PluginParser.parsePlugin(content)

    expect(result.rawSource).toBe(content)
  })
})

describe('pluginParser edge cases: plugin with multiple IIFEs', () => {
  it('parses plugin containing multiple IIFE blocks', () => {
    const content = `/*:
 * @target MZ
 * @plugindesc Plugin with multiple IIFEs
 * @author Test
 *
 * @param volume
 * @text Volume
 * @type number
 * @default 100
 */

(() => {
    'use strict';

    // First module: Audio manager
    const AudioModule = (() => {
        const _volume = 100;
        return {
            getVolume: () => _volume,
            setVolume: (v) => { _volume = v; }
        };
    })();

    // Second module: Video manager
    const VideoModule = (() => {
        return {
            play: () => {},
            stop: () => {}
        };
    })();

    console.log('Both modules loaded');
})();`

    const result = PluginParser.parsePlugin(content, 'MultiIIFE.js')

    expect(result).toMatchObject({
      meta: { name: 'MultiIIFE', description: 'Plugin with multiple IIFEs' },
      parameters: [{ name: 'volume' }],
      rawSource: content
    })
    expect(missing(result.codeBody, ['AudioModule', 'VideoModule'])).toStrictEqual([])
  })
})

describe('pluginParser edge cases: plugin using ES6 class syntax', () => {
  it('parses plugin with ES6 classes', () => {
    const content = `/*:
 * @target MZ
 * @plugindesc ES6 Class Plugin
 * @author ClassAuthor
 *
 * @param maxItems
 * @text Max Items
 * @type number
 * @default 99
 *
 * @command AddItem
 * @text Add Item
 * @desc Adds an item to inventory
 *
 * @arg itemId
 * @text Item ID
 * @type number
 * @default 1
 */

(() => {
    'use strict';

    class InventoryManager {
        constructor() {
            this._items = [];
            this._maxItems = 99;
        }

        static getInstance() {
            if (!InventoryManager._instance) {
                InventoryManager._instance = new InventoryManager();
            }
            return InventoryManager._instance;
        }

        addItem(itemId) {
            if (this._items.length < this._maxItems) {
                this._items.push(itemId);
                return true;
            }
            return false;
        }

        removeItem(itemId) {
            const idx = this._items.indexOf(itemId);
            if (idx >= 0) {
                this._items.splice(idx, 1);
                return true;
            }
            return false;
        }

        get items() {
            return [...this._items];
        }
    }

    InventoryManager._instance = null;

    const params = PluginManager.parameters('ES6ClassPlugin');
    const maxItems = Number(params['maxItems'] || 99);

    PluginManager.registerCommand('ES6ClassPlugin', 'AddItem', function(args) {
        const itemId = Number(args['itemId'] || 1);
        InventoryManager.getInstance().addItem(itemId);
    });
})();`

    const result = PluginParser.parsePlugin(content, 'ES6ClassPlugin.js')

    expect(result).toMatchObject({
      meta: { name: 'ES6ClassPlugin', description: 'ES6 Class Plugin' },
      parameters: [{ name: 'maxItems' }],
      commands: [{ name: 'AddItem', args: [{}] }],
      rawSource: content
    })
    expect(
      missing(result.codeBody, ['class InventoryManager', 'static getInstance()'])
    ).toStrictEqual([])
  })
})

describe('pluginParser edge cases: plugin with arrow function IIFE variant', () => {
  it('parses plugin using (() => { ... })() pattern', () => {
    const content = `/*:
 * @target MZ
 * @plugindesc Arrow IIFE Plugin
 * @author ArrowAuthor
 *
 * @param debug
 * @text Debug Mode
 * @type boolean
 * @default false
 */

(() => {
    const params = PluginManager.parameters('ArrowIIFE');
    const debug = params['debug'] === 'true';

    if (debug) {
        console.log('Debug mode enabled');
    }

    const _Scene_Map_start = Scene_Map.prototype.start;
    Scene_Map.prototype.start = function() {
        _Scene_Map_start.call(this);
        if (debug) console.log('Scene_Map started');
    };
})();`

    const result = PluginParser.parsePlugin(content, 'ArrowIIFE.js')

    expect(result).toMatchObject({
      meta: { name: 'ArrowIIFE', description: 'Arrow IIFE Plugin' },
      parameters: [{ name: 'debug', type: 'boolean' }],
      rawSource: content
    })
    expect(result.codeBody).toContain('Scene_Map.prototype.start')
  })
})

describe('pluginParser edge cases: plugin with no IIFE wrapping (top-level code)', () => {
  it('parses plugin with bare top-level code', () => {
    const content = `/*:
 * @target MZ
 * @plugindesc Top Level Plugin
 * @author TopLevel
 *
 * @param color
 * @text Color
 * @type string
 * @default red
 */

var MyPlugin = MyPlugin || {};
MyPlugin.color = PluginManager.parameters('TopLevelPlugin')['color'] || 'red';

Scene_Title.prototype.drawGameTitle = function() {
    var x = 20;
    var y = Graphics.height / 4;
    var maxWidth = Graphics.width - x * 2;
    var text = $dataSystem.gameTitle;
    this.contents.drawText(text, x, y, maxWidth, 48, 'center');
};`

    const result = PluginParser.parsePlugin(content, 'TopLevelPlugin.js')

    expect(result).toMatchObject({
      meta: { name: 'TopLevelPlugin', description: 'Top Level Plugin' },
      parameters: [{ name: 'color' }],
      rawSource: content
    })
    expect(
      missing(result.codeBody, ['var MyPlugin', 'Scene_Title.prototype.drawGameTitle'])
    ).toStrictEqual([])
  })

  it('handles plugin with only a header and no code at all', () => {
    const content = `/*:
 * @target MZ
 * @plugindesc Empty Plugin
 * @author Nobody
 */`
    const result = PluginParser.parsePlugin(content, 'EmptyPlugin.js')

    expect(result.meta.name).toBe('EmptyPlugin')
    expect(result.codeBody).toBe('')
    expect(result.customCode).toBe('')
    expect(result.rawSource).toBe(content)
  })
})

// A plugin's code after its header, kept verbatim by raw mode
const RAW_MODE_CODE = `

(() => {
    'use strict';
    // This is very specific custom code
    const MAGIC_NUMBER = 42;
    Game_Actor.prototype.customMethod = function() {
        return MAGIC_NUMBER;
    };
})();`

const RAW_MODE_SOURCE =
  `/*:
 * @target MZ
 * @plugindesc Old description
 * @author OldAuthor
 *
 * @param speed
 * @text Speed
 * @type number
 * @default 5
 */` + RAW_MODE_CODE

const STRUCT_SOURCE = `/*:
 * @target MZ
 * @plugindesc Struct test
 * @author Test
 *
 * @param pos
 * @text Position
 * @type struct<Position>
 * @default {}
 */

/*~struct~Position:
 * @param x
 * @text X
 * @type number
 * @default 0
 *
 * @param y
 * @text Y
 * @type number
 * @default 0
 */

(() => {
    const params = PluginManager.parameters('StructTest');
    const pos = JSON.parse(params['pos'] || '{}');
    console.log(pos.x, pos.y);
})();`

const LEGACY_SOURCE = `/*:
 * @target MZ
 * @plugindesc Legacy plugin
 * @author LegacyAuthor
 */

var LegacyPlugin = {};
LegacyPlugin.doThing = function() {
    return 42;
};`

describe('pluginParser edge cases: generateRawMode', () => {
  it('preserves original code body while regenerating headers', () => {
    const plugin = PluginParser.parsePlugin(RAW_MODE_SOURCE, 'TestPlugin.js')
    const baseline = toBaseline(structuredClone(plugin))

    // Modify the description (simulates user editing in UI)
    plugin.meta.description = 'New description'
    plugin.meta.author = 'NewAuthor'

    const result = generateRawMode(plugin, baseline)

    expect(
      missing(result, [
        // Header should be regenerated with new values
        '@plugindesc New description',
        '@author NewAuthor',
        // Code body should be preserved verbatim
        'const MAGIC_NUMBER = 42;',
        'Game_Actor.prototype.customMethod',
        'return MAGIC_NUMBER;'
      ])
    ).toStrictEqual([])
  })

  it('regenerates struct definition blocks', () => {
    const plugin = PluginParser.parsePlugin(STRUCT_SOURCE, 'StructTest.js')
    const baseline = toBaseline(structuredClone(plugin))

    // Modify struct name (simulates user editing)
    Object.assign(plugin.structs.at(0)?.parameters.at(0) ?? {}, { desc: 'X coordinate' })

    const result = generateRawMode(plugin, baseline)

    expect(
      missing(result, [
        // Should contain regenerated struct block
        '/*~struct~Position:',
        '@desc X coordinate',
        // Code body preserved
        "const params = PluginManager.parameters('StructTest')",
        'console.log(pos.x, pos.y)'
      ])
    ).toStrictEqual([])
  })

  it('preserves code body for plugins with no IIFE wrapping', () => {
    const plugin = PluginParser.parsePlugin(LEGACY_SOURCE, 'LegacyPlugin.js')
    const baseline = toBaseline(structuredClone(plugin))
    plugin.meta.description = 'Updated legacy plugin'

    const result = generateRawMode(plugin, baseline)

    expect(
      missing(result, [
        '@plugindesc Updated legacy plugin',
        'var LegacyPlugin = {};',
        'LegacyPlugin.doThing = function()',
        'return 42;'
      ])
    ).toStrictEqual([])
  })
})

const EMPTY_TAGS = `/*:
 * @plugindesc
 * @author
 * @url
 * @target MZ
 * @base
 * @orderAfter
 * @orderBefore
 * @noteParam
 * @noteType
 * @noteDir
 * @noteData
 * @help Help text.
 *
 * @param p
 * @text
 * @desc
 * @type number
 * @default
 * @require 1
 * @parent
 * @dir
 * @type file
 *
 * @param q
 * @type boolean
 * @on
 * @off
 * @default true
 *
 * @param s
 * @type select
 * @option
 * @value
 * @option Two
 * @value 2
 *
 * @param
 * @text Separator
 *
 * @command
 * @text Unnamed
 *
 * @command c
 * @text
 * @desc
 *
 * @arg
 * @text Unnamed argument
 *
 * @arg a
 * @desc
 * @type number
 */
`

describe('empty tags', () => {
  const plugin = PluginParser.parsePlugin(EMPTY_TAGS)
  const param = (name: string): PluginParameter | undefined =>
    plugin.parameters.find((p) => p.name === name)

  it('plugin tags without a value are empty, never the next line', () => {
    const { description, author, url, target, dependencies, orderAfter, orderBefore, noteParams } =
      plugin.meta

    expect({
      description,
      author,
      url,
      target,
      dependencies,
      orderAfter,
      orderBefore,
      noteParams
    }).toStrictEqual({
      description: '',
      author: '',
      url: '',
      target: 'MZ',
      dependencies: [],
      orderAfter: [],
      orderBefore: [],
      noteParams: [{ name: '', type: 'file' }]
    })
  })

  it('parameter tags without a value are empty, never the next line', () => {
    expect(plugin.parameters.map((p) => p.name)).toStrictEqual(['p', 'q', 's'])
    expect(param('p')).toMatchObject({ text: 'p', desc: '', type: 'number', default: '' })
    expect(param('q')).toMatchObject({ default: true })
    expect([
      param('p')?.parent,
      param('p')?.dir,
      param('q')?.onLabel,
      param('q')?.offLabel
    ]).toStrictEqual([undefined, undefined, undefined, undefined])
    expect(param('s')?.options).toStrictEqual([
      { value: '', text: '' },
      { value: '2', text: 'Two' }
    ])
  })

  it('command and argument tags without a value are empty, never the next line', () => {
    expect(plugin.commands.map((c) => c.name)).toStrictEqual(['c'])
    expect(plugin.commands.at(0)).toMatchObject({ text: 'c', desc: '' })
    expect(plugin.commands.at(0)?.args.map((a) => a.name)).toStrictEqual(['a'])
    expect(plugin.commands.at(0)?.args.at(0)).toMatchObject({
      desc: '',
      type: 'number',
      default: ''
    })
  })

  it('a blank comment line after the description adds no trailing space', () => {
    const parsed = PluginParser.parsePlugin(
      '/*:\n * @plugindesc Short text\n *\n * @author Someone\n */\n'
    )

    expect(parsed.meta.description).toBe('Short text')
  })
})

describe('tags count only at the start of a line', () => {
  // A help line that starts with "@" is written with a zero-width space before the "@"
  const guarded = [
    '@param injected',
    '@type number',
    '@command injectedCommand',
    '@arg injectedArg',
    '@base Other'
  ].map((line) => String.fromCodePoint(0x20_0b) + line)
  const guardedHelp = [' * @help Usage', ...guarded.map((line) => ` * ${line}`), ' * End'].join(
    '\n'
  )
  const helpText = ['Usage', ...guarded, 'End'].join('\n')

  it('a guarded help line after the last parameter adds no parameter and no tag', () => {
    const plugin = PluginParser.parsePlugin(
      `/*:\n * @target MZ\n * @plugindesc x\n *\n * @param Label\n * @text Label\n *\n${guardedHelp}\n */\n`
    )

    expect(plugin.parameters.map((p) => [p.name, p.type])).toStrictEqual([['Label', 'string']])
    expect(plugin.commands).toStrictEqual([])
    expect(plugin.meta.dependencies).toStrictEqual([])
    expect(plugin.meta.help).toBe(helpText)
  })

  it('a guarded help line after a command adds no parameter, command or argument', () => {
    const plugin = PluginParser.parsePlugin(
      `/*:\n * @target MZ\n * @plugindesc x\n *\n * @param Label\n *\n * @command go\n * @text Go\n *\n${guardedHelp}\n */\n`
    )

    expect(plugin.parameters.map((p) => [p.name, p.type])).toStrictEqual([['Label', 'string']])
    expect(plugin.commands.map((c) => [c.name, c.args.length])).toStrictEqual([['go', 0]])
    expect(plugin.meta.dependencies).toStrictEqual([])
    expect(plugin.meta.help).toBe(helpText)
  })

  it('a tag inside a description is part of the description', () => {
    const plugin = PluginParser.parsePlugin(`/*:
 * @target MZ
 * @plugindesc Set @param Hidden first
 *
 * @param A
 * @desc Works like @param B, see @type number
 *
 * @param C
 * @desc Read @help first
 *
 * @command go
 * @desc Runs @command stop and @arg x
 */
`)

    expect(plugin.meta.description).toBe('Set @param Hidden first')
    expect(plugin.parameters.map((p) => [p.name, p.type, p.desc])).toStrictEqual([
      ['A', 'string', 'Works like @param B, see @type number'],
      ['C', 'string', 'Read @help first']
    ])
    expect(plugin.meta.help).toBe('')
    expect(plugin.commands.map((c) => [c.name, c.desc, c.args.length])).toStrictEqual([
      ['go', 'Runs @command stop and @arg x', 0]
    ])
  })

  it('a tag on a line without a leading "*" ends the help and the description', () => {
    const header =
      '/*:\n@target MZ\n@plugindesc Demo\n@help\nSome help\n@param Speed\n@type number\n@default 3\n*/\n'
    const plugin = PluginParser.parsePlugin(header)

    expect(plugin.meta.description).toBe('Demo')
    expect(plugin.meta.help).toBe('Some help')
    expect(plugin.parameters.map((p) => [p.name, p.type, p.default])).toStrictEqual([
      ['Speed', 'number', 3]
    ])

    // Saved and read back, the help holds no copy of the parameter
    const again = PluginParser.parsePlugin(generatePlugin(plugin))

    expect(again.meta.help).toBe('Some help')
    expect(again.parameters.map((p) => p.name)).toStrictEqual(['Speed'])
  })

  it('a localized header without a leading "*" reads the same way', () => {
    const plugin = PluginParser.parsePlugin(
      '/*:\n * @plugindesc x\n */\n/*:ja\n@plugindesc Demo\n@help\nSome help\n@param Speed\n*/\n'
    )

    expect(plugin.meta.localizations).toStrictEqual({
      ja: { description: 'Demo', help: 'Some help' }
    })
  })
})
