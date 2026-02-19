// Tests for new MZ annotation support (A1-A7)
import { describe, it, expect } from 'vitest'
import { PluginParser } from '../src/main/services/pluginParser'
import { generatePlugin, generateHeaderOnly } from '../src/renderer/src/lib/generator/index'
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

// A1: @combo parameter type
describe('A1: combo parameter type', () => {
  it('parser distinguishes combo from select', () => {
    const content = `/*:
 * @plugindesc Test
 * @author Test
 *
 * @param myCombo
 * @text My Combo
 * @type combo
 * @option Option1
 * @option Option2
 * @default Option1
 */`
    const result = PluginParser.parsePlugin(content)
    expect(result.parameters).toHaveLength(1)
    expect(result.parameters[0].type).toBe('combo')
    expect(result.parameters[0].options).toHaveLength(2)
    expect(result.parameters[0].default).toBe('Option1')
  })

  it('generator emits @type combo (not select)', () => {
    const plugin = createTestPlugin({
      parameters: [
        {
          id: 'p1',
          name: 'myCombo',
          text: 'My Combo',
          desc: '',
          type: 'combo',
          default: 'Opt1',
          options: [
            { value: 'Opt1', text: 'Opt1' },
            { value: 'Opt2', text: 'Opt2' }
          ]
        }
      ]
    })
    const output = generateHeaderOnly(plugin)
    expect(output).toContain('@type combo')
    expect(output).toContain('@option Opt1')
    expect(output).toContain('@option Opt2')
    expect(output).not.toContain('@type select')
  })

  it('round-trips combo type through parse+generate', () => {
    const original = `/*:
 * @plugindesc Test
 * @author Test
 *
 * @param font
 * @text Font Family
 * @type combo
 * @option Arial
 * @option Times New Roman
 * @default Arial
 */`
    const parsed = PluginParser.parsePlugin(original)
    expect(parsed.parameters[0].type).toBe('combo')

    const plugin = createTestPlugin({
      parameters: parsed.parameters
    })
    const output = generateHeaderOnly(plugin)
    expect(output).toContain('@type combo')
  })
})

// A2: @require 1 on file/animation params
describe('A2: @require on file/animation params', () => {
  it('parser reads @require 1 on file param', () => {
    const content = `/*:
 * @plugindesc Test
 * @author Test
 *
 * @param bgImage
 * @text Background
 * @type file
 * @dir img/pictures
 * @require 1
 * @default myImage
 */`
    const result = PluginParser.parsePlugin(content)
    expect(result.parameters[0].type).toBe('file')
    expect(result.parameters[0].dir).toBe('img/pictures')
    expect(result.parameters[0].require).toBe(true)
  })

  it('parser reads @require 1 on animation param', () => {
    const content = `/*:
 * @plugindesc Test
 * @author Test
 *
 * @param anim
 * @type animation
 * @dir img/animations
 * @require 1
 */`
    const result = PluginParser.parsePlugin(content)
    expect(result.parameters[0].require).toBe(true)
  })

  it('parser does not set require when absent', () => {
    const content = `/*:
 * @plugindesc Test
 * @author Test
 *
 * @param bgImage
 * @type file
 * @dir img/pictures
 */`
    const result = PluginParser.parsePlugin(content)
    expect(result.parameters[0].require).toBeUndefined()
  })

  it('generator emits @require 1 after @dir', () => {
    const plugin = createTestPlugin({
      parameters: [
        {
          id: 'p1',
          name: 'bgImage',
          text: 'Background',
          desc: '',
          type: 'file',
          default: '',
          dir: 'img/pictures',
          require: true
        }
      ]
    })
    const output = generateHeaderOnly(plugin)
    expect(output).toContain('@dir img/pictures')
    expect(output).toContain('@require 1')
    // @require should come after @dir
    const dirIdx = output.indexOf('@dir')
    const reqIdx = output.indexOf('@require')
    expect(reqIdx).toBeGreaterThan(dirIdx)
  })

  it('generator omits @require when not set', () => {
    const plugin = createTestPlugin({
      parameters: [
        {
          id: 'p1',
          name: 'bgImage',
          text: '',
          desc: '',
          type: 'file',
          default: '',
          dir: 'img/pictures'
        }
      ]
    })
    const output = generateHeaderOnly(plugin)
    expect(output).not.toContain('@require')
  })

  it('parser reads @require on command args', () => {
    const content = `/*:
 * @plugindesc Test
 * @author Test
 *
 * @command ShowImage
 * @text Show Image
 *
 * @arg image
 * @type file
 * @dir img/pictures
 * @require 1
 */`
    const result = PluginParser.parsePlugin(content)
    expect(result.commands[0].args[0].require).toBe(true)
  })
})

// A3: @orderBefore
describe('A3: @orderBefore', () => {
  it('parser reads @orderBefore', () => {
    const content = `/*:
 * @plugindesc Test
 * @author Test
 * @orderBefore SomePlugin
 * @orderBefore AnotherPlugin
 */`
    const result = PluginParser.parsePlugin(content)
    expect(result.meta.orderBefore).toEqual(['SomePlugin', 'AnotherPlugin'])
  })

  it('parser returns empty array when no @orderBefore', () => {
    const content = `/*:
 * @plugindesc Test
 * @author Test
 */`
    const result = PluginParser.parsePlugin(content)
    expect(result.meta.orderBefore).toEqual([])
  })

  it('generator emits @orderBefore lines', () => {
    const plugin = createTestPlugin({
      meta: { orderBefore: ['PluginA', 'PluginB'] } as any
    })
    const output = generateHeaderOnly(plugin)
    expect(output).toContain('@orderBefore PluginA')
    expect(output).toContain('@orderBefore PluginB')
  })

  it('round-trips @orderBefore through parse+generate', () => {
    const content = `/*:
 * @plugindesc Test
 * @author Test
 * @orderBefore MyPlugin
 */`
    const parsed = PluginParser.parsePlugin(content)
    const plugin = createTestPlugin({ meta: parsed.meta })
    const output = generateHeaderOnly(plugin)
    expect(output).toContain('@orderBefore MyPlugin')
  })
})

// A4: @noteParam annotation group
describe('A4: @noteParam annotation group', () => {
  it('parser reads a single noteParam group', () => {
    const content = `/*:
 * @plugindesc Test
 * @author Test
 * @noteParam bgmTag
 * @noteType file
 * @noteDir audio/bgm/
 * @noteData actors
 * @noteRequire 1
 */`
    const result = PluginParser.parsePlugin(content)
    expect(result.meta.noteParams).toHaveLength(1)
    expect(result.meta.noteParams![0]).toEqual({
      name: 'bgmTag',
      type: 'file',
      dir: 'audio/bgm/',
      data: 'actors',
      require: true
    })
  })

  it('parser reads multiple noteParam groups', () => {
    const content = `/*:
 * @plugindesc Test
 * @author Test
 * @noteParam bgmTag
 * @noteType file
 * @noteDir audio/bgm/
 * @noteData actors
 * @noteRequire 1
 * @noteParam seTag
 * @noteType file
 * @noteDir audio/se/
 * @noteData enemies
 */`
    const result = PluginParser.parsePlugin(content)
    expect(result.meta.noteParams).toHaveLength(2)
    expect(result.meta.noteParams![0].name).toBe('bgmTag')
    expect(result.meta.noteParams![0].data).toBe('actors')
    expect(result.meta.noteParams![1].name).toBe('seTag')
    expect(result.meta.noteParams![1].dir).toBe('audio/se/')
    expect(result.meta.noteParams![1].require).toBeUndefined()
  })

  it('parser handles noteParam with minimal fields', () => {
    const content = `/*:
 * @plugindesc Test
 * @author Test
 * @noteParam simpleTag
 * @noteType file
 */`
    const result = PluginParser.parsePlugin(content)
    expect(result.meta.noteParams).toHaveLength(1)
    expect(result.meta.noteParams![0]).toEqual({
      name: 'simpleTag',
      type: 'file'
    })
  })

  it('generator emits noteParam group', () => {
    const plugin = createTestPlugin({
      meta: {
        noteParams: [
          {
            name: 'bgmTag',
            type: 'file',
            dir: 'audio/bgm/',
            data: 'actors',
            require: true
          }
        ]
      } as any
    })
    const output = generateHeaderOnly(plugin)
    expect(output).toContain('@noteParam bgmTag')
    expect(output).toContain('@noteType file')
    expect(output).toContain('@noteDir audio/bgm/')
    expect(output).toContain('@noteData actors')
    expect(output).toContain('@noteRequire 1')
  })

  it('generator omits optional noteParam fields when not set', () => {
    const plugin = createTestPlugin({
      meta: {
        noteParams: [{ name: 'tag', type: 'file' }]
      } as any
    })
    const output = generateHeaderOnly(plugin)
    expect(output).toContain('@noteParam tag')
    expect(output).toContain('@noteType file')
    expect(output).not.toContain('@noteDir')
    expect(output).not.toContain('@noteData')
    expect(output).not.toContain('@noteRequire')
  })

  it('returns empty array when no noteParam present', () => {
    const content = `/*:
 * @plugindesc Test
 * @author Test
 */`
    const result = PluginParser.parsePlugin(content)
    expect(result.meta.noteParams).toEqual([])
  })
})

// A5: icon parameter type
describe('A5: icon parameter type', () => {
  it('parser reads @type icon', () => {
    const content = `/*:
 * @plugindesc Test
 * @author Test
 *
 * @param iconIndex
 * @text Icon
 * @type icon
 * @default 16
 */`
    const result = PluginParser.parsePlugin(content)
    expect(result.parameters[0].type).toBe('icon')
    expect(result.parameters[0].default).toBe(16)
  })

  it('generator emits @type icon', () => {
    const plugin = createTestPlugin({
      parameters: [
        {
          id: 'p1',
          name: 'iconIndex',
          text: 'Icon',
          desc: '',
          type: 'icon',
          default: 16
        }
      ]
    })
    const output = generatePlugin(plugin)
    expect(output).toContain('@type icon')
    expect(output).toContain('@default 16')
    // Generated JS code should parse as Number
    expect(output).toContain("Number(params['iconIndex']")
  })
})

// A6: map parameter type
describe('A6: map parameter type', () => {
  it('parser reads @type map', () => {
    const content = `/*:
 * @plugindesc Test
 * @author Test
 *
 * @param targetMap
 * @text Target Map
 * @type map
 * @default 1
 */`
    const result = PluginParser.parsePlugin(content)
    expect(result.parameters[0].type).toBe('map')
    expect(result.parameters[0].default).toBe(1)
  })

  it('generator emits @type map and parses as Number', () => {
    const plugin = createTestPlugin({
      parameters: [
        {
          id: 'p1',
          name: 'targetMap',
          text: 'Target Map',
          desc: '',
          type: 'map',
          default: 1
        }
      ]
    })
    const output = generatePlugin(plugin)
    expect(output).toContain('@type map')
    expect(output).toContain("Number(params['targetMap']")
  })
})

// A7: hidden parameter type
describe('A7: hidden parameter type', () => {
  it('parser reads @type hidden', () => {
    const content = `/*:
 * @plugindesc Test
 * @author Test
 *
 * @param _version
 * @type hidden
 * @default 1.0.0
 */`
    const result = PluginParser.parsePlugin(content)
    expect(result.parameters[0].type).toBe('hidden')
    expect(result.parameters[0].default).toBe('1.0.0')
  })

  it('generator emits @type hidden', () => {
    const plugin = createTestPlugin({
      parameters: [
        {
          id: 'p1',
          name: '_version',
          text: '',
          desc: '',
          type: 'hidden',
          default: '1.0.0'
        }
      ]
    })
    const output = generateHeaderOnly(plugin)
    expect(output).toContain('@type hidden')
    expect(output).toContain('@default 1.0.0')
  })

  it('previously parsed as string, now preserves hidden', () => {
    // Ensure we no longer collapse hidden to string
    const content = `/*:
 * @plugindesc Test
 * @author Test
 *
 * @param _internalState
 * @type hidden
 * @default {}
 */`
    const result = PluginParser.parsePlugin(content)
    expect(result.parameters[0].type).toBe('hidden')
    // Should NOT have rawType since type matches
    expect(result.parameters[0].rawType).toBeUndefined()
  })
})

// Cross-cutting: round-trip with all new types
describe('Round-trip: all new types together', () => {
  it('parses and regenerates a plugin with all new features', () => {
    const content = `/*:
 * @target MZ
 * @plugindesc Full annotation test
 * @author Test
 * @orderAfter BasePlugin
 * @orderBefore LatePlugin
 * @noteParam bgmTag
 * @noteType file
 * @noteDir audio/bgm/
 * @noteData actors
 * @noteRequire 1
 *
 * @param myCombo
 * @type combo
 * @option Red
 * @option Blue
 * @default Red
 *
 * @param bgImage
 * @type file
 * @dir img/pictures
 * @require 1
 *
 * @param icon
 * @type icon
 * @default 16
 *
 * @param mapId
 * @type map
 * @default 1
 *
 * @param _hidden
 * @type hidden
 * @default internal
 */`
    const parsed = PluginParser.parsePlugin(content)

    // Verify all parsed correctly
    expect(parsed.meta.orderBefore).toEqual(['LatePlugin'])
    expect(parsed.meta.noteParams).toHaveLength(1)
    expect(parsed.parameters).toHaveLength(5)
    expect(parsed.parameters[0].type).toBe('combo')
    expect(parsed.parameters[1].require).toBe(true)
    expect(parsed.parameters[2].type).toBe('icon')
    expect(parsed.parameters[3].type).toBe('map')
    expect(parsed.parameters[4].type).toBe('hidden')

    // Regenerate and verify all annotations present
    const plugin = createTestPlugin({
      meta: parsed.meta,
      parameters: parsed.parameters
    })
    const output = generateHeaderOnly(plugin)
    expect(output).toContain('@orderBefore LatePlugin')
    expect(output).toContain('@noteParam bgmTag')
    expect(output).toContain('@type combo')
    expect(output).toContain('@require 1')
    expect(output).toContain('@type icon')
    expect(output).toContain('@type map')
    expect(output).toContain('@type hidden')
  })
})
