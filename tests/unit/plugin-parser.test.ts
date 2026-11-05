// Tests for PluginParser
// Note: pluginParser.ts lives in src/main/services/ and imports types
// from ../../renderer/src/types/plugin via relative path. This works
// in Vitest's node environment.
import { describe, it, expect } from 'vitest'
import { PluginParser } from '../../src/main/services/pluginParser'
import { loadFixture } from '../golden/corpus/raw-mode'

const HELP_THEN_TAG = `/*:
 * @plugindesc Test plugin
 * @author Test
 * @help
 * This is help text.
 * It spans multiple lines.
 *
 * @param dummy
 * @type string
 */`

const HELP_LAST = `/*:
 * @plugindesc Test plugin
 * @help
 * This is help text.
 * It spans multiple lines.
 */

/*:ja
 * @plugindesc 説明
 * @help
 * ヘルプテキスト
 */`

const DESCRIPTION_LAST = `/*:
 * @author Test
 * @plugindesc Last description
 */

/*:ja
 * @plugindesc 最後の説明
 */`

describe(PluginParser, () => {
  describe('parseMeta', () => {
    it('parses minimal plugin with @plugindesc and @author', () => {
      const content = `/*:
 * @plugindesc A simple test plugin
 * @author TestAuthor
 */`
      const result = PluginParser.parsePlugin(content)

      expect(result).toMatchObject({
        meta: { description: 'A simple test plugin', author: 'TestAuthor' },
        parameters: [],
        commands: []
      })
    })

    it('parses @target and @url', () => {
      const content = `/*:
 * @target MZ
 * @plugindesc Test plugin
 * @author Test
 * @url https://example.com
 */`
      const result = PluginParser.parsePlugin(content)

      expect(result.meta.target).toBe('MZ')
      expect(result.meta.url).toBe('https://example.com')
    })

    it('parses @base dependencies', () => {
      const content = `/*:
 * @plugindesc Test plugin
 * @author Test
 * @base Synthetic_CoreBase
 * @base AnotherPlugin
 */`
      const result = PluginParser.parsePlugin(content)

      expect(result.meta.dependencies).toStrictEqual(['Synthetic_CoreBase', 'AnotherPlugin'])
    })

    it('parses @orderAfter', () => {
      const content = `/*:
 * @plugindesc Test plugin
 * @author Test
 * @orderAfter Synthetic_CoreBase
 */`
      const result = PluginParser.parsePlugin(content)

      expect(result.meta.orderAfter).toStrictEqual(['Synthetic_CoreBase'])
    })

    it('parses @help text when followed by another tag', () => {
      const result = PluginParser.parsePlugin(HELP_THEN_TAG)

      expect(result.meta.help).toContain('This is help text.')
      expect(result.meta.help).toContain('It spans multiple lines.')
    })

    it('reads @help written as the last tag of a block', () => {
      const result = PluginParser.parsePlugin(HELP_LAST)

      expect(result.meta).toMatchObject({
        help: 'This is help text.\nIt spans multiple lines.',
        localizations: { ja: { help: 'ヘルプテキスト' } }
      })
    })

    it('reads @plugindesc written as the last tag of a block', () => {
      const result = PluginParser.parsePlugin(DESCRIPTION_LAST)

      expect(result.meta).toMatchObject({
        description: 'Last description',
        localizations: { ja: { description: '最後の説明' } }
      })
    })

    it('reads the help of a fixture plugin that writes @help last', () => {
      expect(loadFixture('Fixture_Generated.js').meta.help).toBe(
        'Generated from a fixed definition.'
      )
    })

    it('uses filename for plugin name when provided', () => {
      const content = `/*:
 * @plugindesc Test plugin
 * @author Test
 */`
      const result = PluginParser.parsePlugin(content, 'MyPlugin.js')

      expect(result.meta.name).toBe('MyPlugin')
    })
  })
})

const STRING_PARAMETER = `/*:
 * @param greeting
 * @text Greeting Text
 * @desc The greeting to display
 * @type string
 * @default Hello
 */`

const NUMBER_PARAMETER = `/*:
 * @param speed
 * @text Speed
 * @desc Movement speed
 * @type number
 * @min 1
 * @max 100
 * @decimals 2
 * @default 10
 */`

const BOOLEAN_PARAMETER = `/*:
 * @param enabled
 * @text Enabled
 * @type boolean
 * @on Yes
 * @off No
 * @default true
 */`

const SELECT_PARAMETER = `/*:
 * @param difficulty
 * @text Difficulty
 * @type select
 * @option Easy
 * @value easy
 * @option Medium
 * @value medium
 * @option Hard
 * @value hard
 * @default medium
 */`

const STRUCT_PARAMETER = `/*:
 * @param settings
 * @text Settings
 * @type struct<GameSettings>
 * @default {}
 */`

const ARRAY_PARAMETER = `/*:
 * @param enemies
 * @text Enemy List
 * @type struct<Enemy>[]
 * @default []
 */`

const FILE_PARAMETER = `/*:
 * @param bgImage
 * @text Background Image
 * @type file
 * @dir img/pictures
 * @default
 */`

const NESTED_PARAMETERS = `/*:
 * @param parentParam
 * @text Parent
 * @type string
 * @default test
 *
 * @param childParam
 * @text Child
 * @type number
 * @parent parentParam
 * @default 0
 */`

const MULTIPLE_PARAMETERS = `/*:
 * @param name
 * @text Name
 * @type string
 * @default John
 *
 * @param age
 * @text Age
 * @type number
 * @default 25
 *
 * @param active
 * @text Active
 * @type boolean
 * @default true
 */`

describe(PluginParser, () => {
  describe('parseParameters', () => {
    it('parses string parameter', () => {
      const result = PluginParser.parsePlugin(STRING_PARAMETER)

      expect(result.parameters).toMatchObject([
        {
          name: 'greeting',
          text: 'Greeting Text',
          desc: 'The greeting to display',
          type: 'string',
          default: 'Hello'
        }
      ])
    })

    it('parses number parameter with min/max/decimals', () => {
      const result = PluginParser.parsePlugin(NUMBER_PARAMETER)

      expect(result.parameters).toMatchObject([
        { type: 'number', min: 1, max: 100, decimals: 2, default: 10 }
      ])
    })

    it('parses boolean parameter with @on/@off', () => {
      const result = PluginParser.parsePlugin(BOOLEAN_PARAMETER)

      expect(result.parameters).toMatchObject([
        { type: 'boolean', default: true, onLabel: 'Yes', offLabel: 'No' }
      ])
    })

    it('parses select parameter with options', () => {
      const result = PluginParser.parsePlugin(SELECT_PARAMETER)

      expect(result.parameters.map((p) => [p.type, p.options])).toStrictEqual([
        [
          'select',
          [
            { value: 'easy', text: 'Easy' },
            { value: 'medium', text: 'Medium' },
            { value: 'hard', text: 'Hard' }
          ]
        ]
      ])
    })

    it('parses struct parameter', () => {
      const result = PluginParser.parsePlugin(STRUCT_PARAMETER)

      expect(result.parameters).toMatchObject([{ type: 'struct', structType: 'GameSettings' }])
    })

    it('parses array parameter', () => {
      const result = PluginParser.parsePlugin(ARRAY_PARAMETER)

      expect(result.parameters).toMatchObject([
        { type: 'array', arrayType: 'struct', structType: 'Enemy' }
      ])
    })

    it('parses file parameter with @dir', () => {
      const result = PluginParser.parsePlugin(FILE_PARAMETER)

      expect(result.parameters).toMatchObject([{ type: 'file', dir: 'img/pictures' }])
    })

    it('parses nested parameters with @parent', () => {
      const result = PluginParser.parsePlugin(NESTED_PARAMETERS)

      expect(result.parameters).toMatchObject([{}, { parent: 'parentParam' }])
    })

    it('parses multiple parameters', () => {
      const result = PluginParser.parsePlugin(MULTIPLE_PARAMETERS)

      expect(result.parameters.map((p) => p.name)).toStrictEqual(['name', 'age', 'active'])
    })
  })
})

describe(PluginParser, () => {
  describe('parseCommands', () => {
    it('parses a command with arguments', () => {
      const content = `/*:
 * @command ShowMessage
 * @text Show Message
 * @desc Displays a message on screen
 *
 * @arg message
 * @text Message Text
 * @type string
 * @default Hello World
 *
 * @arg duration
 * @text Duration
 * @type number
 * @default 60
 */`
      const result = PluginParser.parsePlugin(content)

      expect(result.commands).toMatchObject([
        {
          name: 'ShowMessage',
          text: 'Show Message',
          desc: 'Displays a message on screen',
          args: [{ name: 'message' }, { name: 'duration' }]
        }
      ])
    })

    it('parses multiple commands', () => {
      const content = `/*:
 * @command CmdA
 * @text Command A
 * @desc First command
 *
 * @command CmdB
 * @text Command B
 * @desc Second command
 */`
      const result = PluginParser.parsePlugin(content)

      expect(result.commands.map((c) => c.name)).toStrictEqual(['CmdA', 'CmdB'])
    })
  })
})

describe(PluginParser, () => {
  describe('parseStructs', () => {
    it('parses struct definitions', () => {
      const content = `/*:
 * @plugindesc Test
 * @author Test
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
 */`
      const result = PluginParser.parsePlugin(content)

      expect(result.structs).toMatchObject([
        { name: 'Position', parameters: [{ name: 'x' }, { name: 'y' }] }
      ])
    })

    it('reads a translated struct block as a translation, not a second struct', () => {
      const content = `/*:
 * @param origin
 * @type struct<Position>
 */

/*~struct~Position:
 * @param x
 * @text X
 * @type number
 */

/*~struct~Position:ja
 * @param x
 * @text 横
 * @type number
 */

/*~struct~Position:zh
 * @param x
 * @text 横坐标
 * @type number
 */`
      const result = PluginParser.parsePlugin(content)

      expect(result.structs.map((s) => s.name)).toStrictEqual(['Position'])
      expect(result.structs.map((struct) => struct.parameters.map((p) => p.text))).toStrictEqual([
        ['X']
      ])
    })
  })
})

describe(PluginParser, () => {
  describe('main block by rule', () => {
    it('reads parameters and commands from the bare block when a Japanese block comes first', () => {
      const content = `/*:ja
 * @plugindesc 説明
 * @param speed
 * @text 速さ
 * @type number
 *
 * @command Run
 * @text 実行
 */

/*:
 * @plugindesc Description
 * @param speed
 * @text Speed
 * @type number
 *
 * @command Run
 * @text Run now
 */`
      const result = PluginParser.parsePlugin(content)

      expect(result.meta.description).toBe('Description')
      expect(result.parameters.map((p) => p.text)).toStrictEqual(['Speed'])
      expect(result.commands.map((c) => c.text)).toStrictEqual(['Run now'])
      expect(result.meta.localizations).toStrictEqual({ ja: { description: '説明', help: '' } })
    })

    it('takes a command text and description from before its first argument', () => {
      const content = `/*:
 * @command Run
 *
 * @arg speed
 * @text Speed
 * @desc How fast.
 */`
      const result = PluginParser.parsePlugin(content)

      expect(result.commands).toMatchObject([{ text: 'Run', desc: '', args: [{ text: 'Speed' }] }])
    })

    it('keeps code between annotation blocks in the code body', () => {
      const content = `/*:
 * @plugindesc Test
 */
var before = 1;
/*~struct~Pos:
 * @param x
 */
var after = 2;`
      const result = PluginParser.parsePlugin(content)

      expect(result.codeBody).toBe('var before = 1;\n\nvar after = 2;')
    })
  })
})

describe(PluginParser, () => {
  describe('compact format', () => {
    it('parses compact single-line parameter format', () => {
      const content = `/*:
 * @param mySwitch @text My Switch @type switch @default 0
 */`
      const result = PluginParser.parsePlugin(content)

      expect(result.parameters).toMatchObject([
        { name: 'mySwitch', text: 'My Switch', type: 'switch' }
      ])
    })
  })
})

describe(PluginParser, () => {
  describe('code body extraction', () => {
    it('extracts IIFE-wrapped code body', () => {
      const content = `/*:
 * @plugindesc Test
 * @author Test
 */

(() => {
    'use strict';
    console.log('hello');
})();`
      const result = PluginParser.parsePlugin(content)

      expect(result.codeBody).toContain('(() => {')
      expect(result.customCode).toContain('console.log')
    })

    it('returns empty customCode for empty plugin', () => {
      const content = `/*:
 * @plugindesc Test
 * @author Test
 */`
      const result = PluginParser.parsePlugin(content)

      expect(result.customCode).toBe('')
    })
  })
})

describe(PluginParser, () => {
  describe('multi-language headers', () => {
    it('parses localized headers', () => {
      const content = `/*:
 * @plugindesc English description
 * @author Test
 */

/*:ja
 * @plugindesc 日本語の説明
 * @help
 * ヘルプテキスト
 */`
      const result = PluginParser.parsePlugin(content)

      expect(result.meta).toMatchObject({
        description: 'English description',
        localizations: { ja: { description: '日本語の説明' } }
      })
    })
  })
})

describe(PluginParser, () => {
  describe('edge cases', () => {
    it('handles malformed input without crashing', () => {
      expect(() => PluginParser.parsePlugin('')).not.toThrow()
      expect(() => PluginParser.parsePlugin('not a plugin')).not.toThrow()
      expect(() => PluginParser.parsePlugin('/* unclosed comment')).not.toThrow()

      for (const input of ['', 'not a plugin', '/* unclosed comment']) {
        const result = PluginParser.parsePlugin(input)

        expect(result.parameters).toStrictEqual([])
        expect(result.commands).toStrictEqual([])
      }
    })

    it('handles plugin with no header comment', () => {
      const result = PluginParser.parsePlugin('console.log("hello");')

      expect(result).toMatchObject({ parameters: [], commands: [] })
    })

    it('generates unique IDs for each element', () => {
      const content = `/*:
 * @param a
 * @type string
 * @default x
 *
 * @param b
 * @type string
 * @default y
 */`
      const result = PluginParser.parsePlugin(content)

      expect(new Set(result.parameters.map((p) => p.id)).size).toBe(2)
    })
  })
})

// COV-12: parseParameters edge cases
describe(PluginParser, () => {
  describe('parseParameters edge cases', () => {
    it('maps @type num to number', () => {
      const content = `/*:
 * @param speed
 * @type num
 * @default 5
 */`
      const result = PluginParser.parsePlugin(content)

      expect(result.parameters).toMatchObject([{ type: 'number' }])
    })

    it('maps @type bool to boolean', () => {
      const content = `/*:
 * @param flag
 * @type bool
 * @default true
 */`
      const result = PluginParser.parsePlugin(content)

      expect(result.parameters).toMatchObject([{ type: 'boolean' }])
    })

    it('maps @type string[] to array with arrayType string', () => {
      const content = `/*:
 * @param items
 * @type string[]
 * @default []
 */`
      const result = PluginParser.parsePlugin(content)

      expect(result.parameters).toMatchObject([{ type: 'array', arrayType: 'string' }])
    })

    it('preserves rawType for struct<Name> types', () => {
      const content = `/*:
 * @param pos
 * @type struct<Position>
 * @default {}
 */`
      const result = PluginParser.parsePlugin(content)

      expect(result.parameters).toMatchObject([
        { type: 'struct', structType: 'Position', rawType: 'struct<Position>' }
      ])
    })

    it('parses compact format with options on one line', () => {
      const content = `/*:
 * @param mode @text Mode @type select @option Easy @value easy @option Hard @value hard @default easy
 */`
      const result = PluginParser.parsePlugin(content)

      expect(result.parameters).toMatchObject([{ type: 'select', options: [{ text: 'Easy' }, {}] }])
    })
  })
})

const SELECT_ARGUMENT = `/*:
 * @command SetDiff
 * @text Set Difficulty
 *
 * @arg difficulty
 * @text Difficulty
 * @type select
 * @option Easy
 * @value easy
 * @option Normal
 * @value normal
 * @default normal
 */`

// COV-13: parseCommands/parseArgs edge cases
describe(PluginParser, () => {
  describe('parseCommands/parseArgs edge cases', () => {
    it('parses boolean arg with @on and @off', () => {
      const content = `/*:
 * @command Toggle
 * @text Toggle Thing
 *
 * @arg visible
 * @text Visible
 * @type boolean
 * @on Show
 * @off Hide
 * @default true
 */`
      const result = PluginParser.parsePlugin(content)

      expect(result.commands).toMatchObject([
        { args: [{ type: 'boolean', onLabel: 'Show', offLabel: 'Hide', default: true }] }
      ])
    })

    it('parses file arg with @require', () => {
      const content = `/*:
 * @command SetImage
 * @text Set Image
 *
 * @arg image
 * @text Image File
 * @type file
 * @dir img/pictures
 * @require 1
 * @default
 */`
      const result = PluginParser.parsePlugin(content)

      expect(result.commands).toMatchObject([
        { args: [{ type: 'file', dir: 'img/pictures', require: true }] }
      ])
    })

    it('parses struct type arg', () => {
      const content = `/*:
 * @command Configure
 * @text Configure
 *
 * @arg settings
 * @text Settings
 * @type struct<Config>
 * @default {}
 */`
      const result = PluginParser.parsePlugin(content)

      expect(result.commands).toMatchObject([{ args: [{ type: 'struct', structType: 'Config' }] }])
    })

    it('parses select arg with options', () => {
      const result = PluginParser.parsePlugin(SELECT_ARGUMENT)

      expect(result.commands).toMatchObject([
        { args: [{ type: 'select', options: [{ value: 'easy' }, { value: 'normal' }] }] }
      ])
    })

    it('parses number arg with min/max/decimals', () => {
      const content = `/*:
 * @command SetValue
 * @text Set Value
 *
 * @arg value
 * @text Value
 * @type number
 * @min 0
 * @max 100
 * @decimals 2
 * @default 50
 */`
      const result = PluginParser.parsePlugin(content)

      expect(result.commands).toMatchObject([
        { args: [{ type: 'number', min: 0, max: 100, decimals: 2 }] }
      ])
    })
  })
})

// COV-11: extractCustomCode
describe(PluginParser, () => {
  describe('extractCustomCode', () => {
    it('extracts code after custom code marker comment', () => {
      const content = `/*:
 * @plugindesc Test
 * @author Test
 */

(() => {
    'use strict';
    const params = PluginManager.parameters('Test');
    const speed = Number(params['speed'] || 5);

    // Custom plugin code
    Game_Actor.prototype.myMethod = function() {
        return speed;
    };
})();`
      const result = PluginParser.parsePlugin(content)

      expect(result.customCode).toContain('Game_Actor.prototype.myMethod')
    })

    it('extracts code after registerCommand block', () => {
      const content = `/*:
 * @plugindesc Test
 * @author Test
 *
 * @command DoThing
 */

(() => {
    'use strict';
    const PLUGIN_NAME = 'Test';
    PluginManager.registerCommand(PLUGIN_NAME, 'DoThing', function(args) {
        // command logic
    });

    // Post-command extension
    Scene_Map.prototype.update = function() {};
})();`
      const result = PluginParser.parsePlugin(content)

      // customCode should contain the post-command code or at least the full inner body
      expect(result.customCode).toContain('Scene_Map.prototype.update')
    })

    it('unwraps traditional function IIFE variant', () => {
      const content = `/*:
 * @plugindesc Test
 * @author Test
 */

(function() {
    'use strict';
    // Custom implementation
    var MyPlugin = {};
    MyPlugin.init = function() { return true; };
})();`
      const result = PluginParser.parsePlugin(content)

      expect(result.codeBody).toContain('(function()')
      // inner content should have been extracted into customCode
      expect(result.customCode).toContain('MyPlugin.init')
    })
  })
})

describe(PluginParser, () => {
  describe('real-world plugin', () => {
    it('parses a full-featured plugin header', () => {
      const content = `/*:
 * @target MZ
 * @plugindesc A comprehensive battle system plugin that adds
 * various combat mechanics and customization options.
 * @author Example Author
 * @url https://example.com/plugin
 *
 * @base Synthetic_CoreBase
 * @orderAfter Synthetic_CoreBase
 *
 * @param General Settings
 * @text General Settings
 * @desc General plugin settings
 * @type string
 * @default
 *
 * @param battleSpeed
 * @text Battle Speed
 * @desc Speed of battle animations
 * @type number
 * @min 1
 * @max 10
 * @default 5
 * @parent General Settings
 *
 * @command SetBattleSpeed
 * @text Set Battle Speed
 * @desc Changes the battle speed at runtime
 *
 * @arg speed
 * @text Speed
 * @type number
 * @min 1
 * @max 10
 * @default 5
 *
 * @help
 * ============================================================================
 * Introduction
 * ============================================================================
 * This is the help section.
 *
 * @param helpEndMarker
 * @type string
 */`
      const result = PluginParser.parsePlugin(content, 'Synthetic_BattleCore.js')

      expect(result).toMatchObject({
        meta: { name: 'Synthetic_BattleCore', target: 'MZ', author: 'Example Author' },
        commands: [{ args: [{}] }]
      })
      expect(result.meta.dependencies).toContain('Synthetic_CoreBase')
      expect(result.meta.orderAfter).toContain('Synthetic_CoreBase')
      // +1 for helpEndMarker used to terminate the @help block
      expect(result.parameters.length).toBeGreaterThanOrEqual(3)
      expect(result.meta.help).toContain('Introduction')
    })
  })
})
