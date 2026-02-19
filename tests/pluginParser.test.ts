// Tests for PluginParser
// Note: pluginParser.ts lives in src/main/services/ and imports types
// from ../../renderer/src/types/plugin via relative path. This works
// in Vitest's node environment.
import { describe, it, expect } from 'vitest'
import { PluginParser } from '../src/main/services/pluginParser'

describe('PluginParser', () => {
  describe('parseMeta', () => {
    it('parses minimal plugin with @plugindesc and @author', () => {
      const content = `/*:
 * @plugindesc A simple test plugin
 * @author TestAuthor
 */`
      const result = PluginParser.parsePlugin(content)
      expect(result.meta.description).toBe('A simple test plugin')
      expect(result.meta.author).toBe('TestAuthor')
      expect(result.parameters).toHaveLength(0)
      expect(result.commands).toHaveLength(0)
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
 * @base PluginCommonBase
 * @base AnotherPlugin
 */`
      const result = PluginParser.parsePlugin(content)
      expect(result.meta.dependencies).toEqual(['PluginCommonBase', 'AnotherPlugin'])
    })

    it('parses @orderAfter', () => {
      const content = `/*:
 * @plugindesc Test plugin
 * @author Test
 * @orderAfter PluginCommonBase
 */`
      const result = PluginParser.parsePlugin(content)
      expect(result.meta.orderAfter).toEqual(['PluginCommonBase'])
    })

    it('parses @help text when followed by another tag', () => {
      const content = `/*:
 * @plugindesc Test plugin
 * @author Test
 * @help
 * This is help text.
 * It spans multiple lines.
 *
 * @param dummy
 * @type string
 */`
      const result = PluginParser.parsePlugin(content)
      expect(result.meta.help).toContain('This is help text.')
      expect(result.meta.help).toContain('It spans multiple lines.')
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

  describe('parseParameters', () => {
    it('parses string parameter', () => {
      const content = `/*:
 * @param greeting
 * @text Greeting Text
 * @desc The greeting to display
 * @type string
 * @default Hello
 */`
      const result = PluginParser.parsePlugin(content)
      expect(result.parameters).toHaveLength(1)
      expect(result.parameters[0].name).toBe('greeting')
      expect(result.parameters[0].text).toBe('Greeting Text')
      expect(result.parameters[0].desc).toBe('The greeting to display')
      expect(result.parameters[0].type).toBe('string')
      expect(result.parameters[0].default).toBe('Hello')
    })

    it('parses number parameter with min/max/decimals', () => {
      const content = `/*:
 * @param speed
 * @text Speed
 * @desc Movement speed
 * @type number
 * @min 1
 * @max 100
 * @decimals 2
 * @default 10
 */`
      const result = PluginParser.parsePlugin(content)
      expect(result.parameters[0].type).toBe('number')
      expect(result.parameters[0].min).toBe(1)
      expect(result.parameters[0].max).toBe(100)
      expect(result.parameters[0].decimals).toBe(2)
      expect(result.parameters[0].default).toBe(10)
    })

    it('parses boolean parameter with @on/@off', () => {
      const content = `/*:
 * @param enabled
 * @text Enabled
 * @type boolean
 * @on Yes
 * @off No
 * @default true
 */`
      const result = PluginParser.parsePlugin(content)
      expect(result.parameters[0].type).toBe('boolean')
      expect(result.parameters[0].default).toBe(true)
      expect(result.parameters[0].onLabel).toBe('Yes')
      expect(result.parameters[0].offLabel).toBe('No')
    })

    it('parses select parameter with options', () => {
      const content = `/*:
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
      const result = PluginParser.parsePlugin(content)
      expect(result.parameters[0].type).toBe('select')
      expect(result.parameters[0].options).toHaveLength(3)
      expect(result.parameters[0].options![0]).toEqual({ value: 'easy', text: 'Easy' })
      expect(result.parameters[0].options![2]).toEqual({ value: 'hard', text: 'Hard' })
    })

    it('parses struct parameter', () => {
      const content = `/*:
 * @param settings
 * @text Settings
 * @type struct<GameSettings>
 * @default {}
 */`
      const result = PluginParser.parsePlugin(content)
      expect(result.parameters[0].type).toBe('struct')
      expect(result.parameters[0].structType).toBe('GameSettings')
    })

    it('parses array parameter', () => {
      const content = `/*:
 * @param enemies
 * @text Enemy List
 * @type struct<Enemy>[]
 * @default []
 */`
      const result = PluginParser.parsePlugin(content)
      expect(result.parameters[0].type).toBe('array')
      expect(result.parameters[0].arrayType).toBe('struct')
      expect(result.parameters[0].structType).toBe('Enemy')
    })

    it('parses file parameter with @dir', () => {
      const content = `/*:
 * @param bgImage
 * @text Background Image
 * @type file
 * @dir img/pictures
 * @default
 */`
      const result = PluginParser.parsePlugin(content)
      expect(result.parameters[0].type).toBe('file')
      expect(result.parameters[0].dir).toBe('img/pictures')
    })

    it('parses nested parameters with @parent', () => {
      const content = `/*:
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
      const result = PluginParser.parsePlugin(content)
      expect(result.parameters).toHaveLength(2)
      expect(result.parameters[1].parent).toBe('parentParam')
    })

    it('parses multiple parameters', () => {
      const content = `/*:
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
      const result = PluginParser.parsePlugin(content)
      expect(result.parameters).toHaveLength(3)
      expect(result.parameters[0].name).toBe('name')
      expect(result.parameters[1].name).toBe('age')
      expect(result.parameters[2].name).toBe('active')
    })
  })

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
      expect(result.commands).toHaveLength(1)
      expect(result.commands[0].name).toBe('ShowMessage')
      expect(result.commands[0].text).toBe('Show Message')
      expect(result.commands[0].desc).toBe('Displays a message on screen')
      expect(result.commands[0].args).toHaveLength(2)
      expect(result.commands[0].args[0].name).toBe('message')
      expect(result.commands[0].args[1].name).toBe('duration')
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
      expect(result.commands).toHaveLength(2)
      expect(result.commands[0].name).toBe('CmdA')
      expect(result.commands[1].name).toBe('CmdB')
    })
  })

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
      expect(result.structs).toHaveLength(1)
      expect(result.structs[0].name).toBe('Position')
      expect(result.structs[0].parameters).toHaveLength(2)
      expect(result.structs[0].parameters[0].name).toBe('x')
      expect(result.structs[0].parameters[1].name).toBe('y')
    })
  })

  describe('compact format', () => {
    it('parses compact single-line parameter format', () => {
      const content = `/*:
 * @param mySwitch @text My Switch @type switch @default 0
 */`
      const result = PluginParser.parsePlugin(content)
      expect(result.parameters).toHaveLength(1)
      expect(result.parameters[0].name).toBe('mySwitch')
      expect(result.parameters[0].text).toBe('My Switch')
      expect(result.parameters[0].type).toBe('switch')
    })
  })

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
      expect(result.customCode).toBeTruthy()
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
      expect(result.meta.description).toBe('English description')
      expect(result.meta.localizations).toHaveProperty('ja')
      expect(result.meta.localizations!['ja'].description).toBe('日本語の説明')
    })
  })

  describe('edge cases', () => {
    it('handles malformed input without crashing', () => {
      expect(() => PluginParser.parsePlugin('')).not.toThrow()
      expect(() => PluginParser.parsePlugin('not a plugin')).not.toThrow()
      expect(() => PluginParser.parsePlugin('/* unclosed comment')).not.toThrow()
    })

    it('handles plugin with no header comment', () => {
      const result = PluginParser.parsePlugin('console.log("hello");')
      expect(result.parameters).toHaveLength(0)
      expect(result.commands).toHaveLength(0)
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
      expect(result.parameters[0].id).not.toBe(result.parameters[1].id)
    })
  })

  describe('real-world plugin', () => {
    it('parses a VisuStella-style plugin header', () => {
      const content = `/*:
 * @target MZ
 * @plugindesc A comprehensive battle system plugin that adds
 * various combat mechanics and customization options.
 * @author VisuStella-Style
 * @url https://example.com/plugin
 *
 * @base PluginCommonBase
 * @orderAfter PluginCommonBase
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
      const result = PluginParser.parsePlugin(content, 'VisuStella_BattleCore.js')
      expect(result.meta.name).toBe('VisuStella_BattleCore')
      expect(result.meta.target).toBe('MZ')
      expect(result.meta.author).toBe('VisuStella-Style')
      expect(result.meta.dependencies).toContain('PluginCommonBase')
      expect(result.meta.orderAfter).toContain('PluginCommonBase')
      // +1 for helpEndMarker used to terminate the @help block
      expect(result.parameters.length).toBeGreaterThanOrEqual(3)
      expect(result.commands).toHaveLength(1)
      expect(result.commands[0].args).toHaveLength(1)
      expect(result.meta.help).toContain('Introduction')
    })
  })
})
