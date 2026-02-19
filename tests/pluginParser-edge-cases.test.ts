// Edge case tests for PluginParser and raw mode round-trip
import { describe, it, expect } from 'vitest'
import { PluginParser } from '../src/main/services/pluginParser'
import { generateRawMode } from '../src/renderer/src/lib/generator/index'

describe('PluginParser edge cases', () => {
  describe('rawSource storage', () => {
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

  describe('plugin with multiple IIFEs', () => {
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
      expect(result.meta.name).toBe('MultiIIFE')
      expect(result.meta.description).toBe('Plugin with multiple IIFEs')
      expect(result.parameters).toHaveLength(1)
      expect(result.parameters[0].name).toBe('volume')
      expect(result.codeBody).toContain('AudioModule')
      expect(result.codeBody).toContain('VideoModule')
      expect(result.rawSource).toBe(content)
    })
  })

  describe('plugin using ES6 class syntax', () => {
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
      expect(result.meta.name).toBe('ES6ClassPlugin')
      expect(result.meta.description).toBe('ES6 Class Plugin')
      expect(result.parameters).toHaveLength(1)
      expect(result.parameters[0].name).toBe('maxItems')
      expect(result.commands).toHaveLength(1)
      expect(result.commands[0].name).toBe('AddItem')
      expect(result.commands[0].args).toHaveLength(1)
      expect(result.codeBody).toContain('class InventoryManager')
      expect(result.codeBody).toContain('static getInstance()')
      expect(result.rawSource).toBe(content)
    })
  })

  describe('plugin with arrow function IIFE variant', () => {
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
      expect(result.meta.name).toBe('ArrowIIFE')
      expect(result.meta.description).toBe('Arrow IIFE Plugin')
      expect(result.parameters).toHaveLength(1)
      expect(result.parameters[0].name).toBe('debug')
      expect(result.parameters[0].type).toBe('boolean')
      expect(result.codeBody).toContain('Scene_Map.prototype.start')
      expect(result.rawSource).toBe(content)
    })
  })

  describe('plugin with no IIFE wrapping (top-level code)', () => {
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
      expect(result.meta.name).toBe('TopLevelPlugin')
      expect(result.meta.description).toBe('Top Level Plugin')
      expect(result.parameters).toHaveLength(1)
      expect(result.parameters[0].name).toBe('color')
      expect(result.codeBody).toContain('var MyPlugin')
      expect(result.codeBody).toContain('Scene_Title.prototype.drawGameTitle')
      expect(result.rawSource).toBe(content)
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

  describe('generateRawMode', () => {
    it('falls back to generatePlugin when no rawSource', () => {
      const plugin = {
        id: 'test',
        meta: {
          name: 'TestPlugin',
          version: '1.0.0',
          author: 'Test',
          description: 'Test plugin',
          help: '',
          url: '',
          target: 'MZ',
          dependencies: [],
          orderAfter: [],
          localizations: {}
        },
        parameters: [],
        commands: [],
        structs: []
      }

      const result = generateRawMode(plugin)
      // Should contain the IIFE body from generatePlugin
      expect(result).toContain('(() => {')
      expect(result).toContain('/*:')
      expect(result).toContain('@plugindesc Test plugin')
    })

    it('preserves original code body while regenerating headers', () => {
      const originalCode = `

(() => {
    'use strict';
    // This is very specific custom code
    const MAGIC_NUMBER = 42;
    Game_Actor.prototype.customMethod = function() {
        return MAGIC_NUMBER;
    };
})();`

      const rawSource =
        `/*:
 * @target MZ
 * @plugindesc Old description
 * @author OldAuthor
 *
 * @param speed
 * @text Speed
 * @type number
 * @default 5
 */` + originalCode

      const plugin = PluginParser.parsePlugin(rawSource, 'TestPlugin.js')

      // Modify the description (simulates user editing in UI)
      plugin.meta.description = 'New description'
      plugin.meta.author = 'NewAuthor'

      const result = generateRawMode(plugin)

      // Header should be regenerated with new values
      expect(result).toContain('@plugindesc New description')
      expect(result).toContain('@author NewAuthor')

      // Code body should be preserved verbatim
      expect(result).toContain('const MAGIC_NUMBER = 42;')
      expect(result).toContain('Game_Actor.prototype.customMethod')
      expect(result).toContain('return MAGIC_NUMBER;')
    })

    it('regenerates struct definition blocks', () => {
      const rawSource = `/*:
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

      const plugin = PluginParser.parsePlugin(rawSource, 'StructTest.js')

      // Modify struct name (simulates user editing)
      plugin.structs[0].parameters[0].desc = 'X coordinate'

      const result = generateRawMode(plugin)

      // Should contain regenerated struct block
      expect(result).toContain('/*~struct~Position:')
      expect(result).toContain('@desc X coordinate')

      // Code body preserved
      expect(result).toContain("const params = PluginManager.parameters('StructTest')")
      expect(result).toContain('console.log(pos.x, pos.y)')
    })

    it('preserves code body for plugins with no IIFE wrapping', () => {
      const rawSource = `/*:
 * @target MZ
 * @plugindesc Legacy plugin
 * @author LegacyAuthor
 */

var LegacyPlugin = {};
LegacyPlugin.doThing = function() {
    return 42;
};`

      const plugin = PluginParser.parsePlugin(rawSource, 'LegacyPlugin.js')
      plugin.meta.description = 'Updated legacy plugin'

      const result = generateRawMode(plugin)

      expect(result).toContain('@plugindesc Updated legacy plugin')
      expect(result).toContain('var LegacyPlugin = {};')
      expect(result).toContain('LegacyPlugin.doThing = function()')
      expect(result).toContain('return 42;')
    })
  })
})
