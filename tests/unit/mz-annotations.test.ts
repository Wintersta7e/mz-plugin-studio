// Tests for new MZ annotation support (A1-A7)
import { describe, it, expect } from 'vitest'
import { PluginParser } from '../../src/main/services/pluginParser'
import { generatePlugin, generateHeaderOnly } from '../../src/renderer/src/lib/generator/index'
import type { PluginDefinition, PluginMeta } from '../../src/renderer/src/types/plugin'

type PluginOverrides = Omit<Partial<PluginDefinition>, 'meta'> & { meta?: Partial<PluginMeta> }

const DEFAULT_META: PluginMeta = {
  name: 'TestPlugin',
  version: '1.0.0',
  author: 'TestAuthor',
  description: 'A test plugin',
  help: '',
  url: '',
  target: 'MZ',
  dependencies: [],
  orderAfter: [],
  localizations: {}
}

function createTestPlugin(overrides: PluginOverrides = {}): PluginDefinition {
  return {
    id: 'test-id',
    meta: { ...DEFAULT_META, ...overrides.meta },
    parameters: overrides.parameters ?? [],
    commands: overrides.commands ?? [],
    structs: overrides.structs ?? [],
    ...(overrides.customCode !== undefined && { customCode: overrides.customCode }),
    ...(overrides.codeBody !== undefined && { codeBody: overrides.codeBody })
  }
}

// A1: @combo parameter type
describe('a1: combo parameter type', () => {
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
    expect(result.parameters.at(0)?.type).toBe('combo')
    expect(result.parameters.at(0)?.options).toHaveLength(2)
    expect(result.parameters.at(0)?.default).toBe('Option1')
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

    expect(parsed.parameters.at(0)?.type).toBe('combo')

    const plugin = createTestPlugin({
      parameters: parsed.parameters
    })
    const output = generateHeaderOnly(plugin)

    expect(output).toContain('@type combo')
  })
})

const FILE_REQUIRE_SOURCE = `/*:
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

const ANIMATION_REQUIRE_SOURCE = `/*:
 * @plugindesc Test
 * @author Test
 *
 * @param anim
 * @type animation
 * @dir img/animations
 * @require 1
 */`

// A2: @require 1 on file/animation params
describe('a2: @require on file/animation params', () => {
  it('parser reads @require 1 on file param', () => {
    const content = FILE_REQUIRE_SOURCE
    const result = PluginParser.parsePlugin(content)

    expect(result.parameters.at(0)?.type).toBe('file')
    expect(result.parameters.at(0)?.dir).toBe('img/pictures')
    expect(result.parameters.at(0)?.require).toBe(true)
  })

  it('parser reads @require 1 on animation param', () => {
    const content = ANIMATION_REQUIRE_SOURCE
    const result = PluginParser.parsePlugin(content)

    expect(result.parameters.at(0)?.require).toBe(true)
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

    expect(result.parameters.at(0)?.require).toBeUndefined()
  })

  it('generator drops @require 1 (MV-era, discontinued in MZ)', () => {
    // Even when the imported plugin had require:true, the generator should
    // not re-emit @require — the official MZ annotation reference marks it as discontinued.
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
    expect(output).not.toContain('@require 1')
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

    expect(result.commands.at(0)?.args.at(0)?.require).toBe(true)
  })
})

// A3: @orderBefore
describe('a3: @orderBefore', () => {
  it('parser reads @orderBefore', () => {
    const content = `/*:
 * @plugindesc Test
 * @author Test
 * @orderBefore SomePlugin
 * @orderBefore AnotherPlugin
 */`
    const result = PluginParser.parsePlugin(content)

    expect(result.meta.orderBefore).toStrictEqual(['SomePlugin', 'AnotherPlugin'])
  })

  it('parser returns empty array when no @orderBefore', () => {
    const content = `/*:
 * @plugindesc Test
 * @author Test
 */`
    const result = PluginParser.parsePlugin(content)

    expect(result.meta.orderBefore).toStrictEqual([])
  })

  it('generator emits @orderBefore lines', () => {
    const plugin = createTestPlugin({
      meta: { orderBefore: ['PluginA', 'PluginB'] }
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

const SINGLE_NOTE_SOURCE = `/*:
 * @plugindesc Test
 * @author Test
 * @noteParam bgmTag
 * @noteType file
 * @noteDir audio/bgm/
 * @noteData actors
 * @noteRequire 1
 */`

const MULTIPLE_NOTE_SOURCE = `/*:
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

// A4: @noteParam annotation group
describe('a4: @noteParam annotation group', () => {
  it('parser reads a single noteParam group', () => {
    const content = SINGLE_NOTE_SOURCE
    const result = PluginParser.parsePlugin(content)

    expect(result.meta.noteParams).toHaveLength(1)
    expect(result.meta.noteParams?.at(0)).toStrictEqual({
      name: 'bgmTag',
      type: 'file',
      dir: 'audio/bgm/',
      data: 'actors',
      require: true
    })
  })

  it('parser reads multiple noteParam groups', () => {
    const content = MULTIPLE_NOTE_SOURCE
    const result = PluginParser.parsePlugin(content)

    expect(
      result.meta.noteParams?.map((note) => [note.name, note.data, note.dir, note.require])
    ).toStrictEqual([
      ['bgmTag', 'actors', 'audio/bgm/', true],
      ['seTag', 'enemies', 'audio/se/', undefined]
    ])
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
    expect(result.meta.noteParams?.at(0)).toStrictEqual({
      name: 'simpleTag',
      type: 'file'
    })
  })

  it('generator emits noteParam group (without @noteRequire — not in spec)', () => {
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
      }
    })
    const output = generateHeaderOnly(plugin)

    expect(output).toContain('@noteParam bgmTag')
    expect(output).toContain('@noteType file')
    expect(output).toContain('@noteDir audio/bgm/')
    expect(output).toContain('@noteData actors')
    // @noteRequire is not part of the official MZ annotation reference
    expect(output).not.toContain('@noteRequire')
  })

  it('generator omits optional noteParam fields when not set', () => {
    const plugin = createTestPlugin({
      meta: {
        noteParams: [{ name: 'tag', type: 'file' }]
      }
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

    expect(result.meta.noteParams).toStrictEqual([])
  })
})

// A5: icon parameter type
describe('a5: icon parameter type', () => {
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

    expect(result.parameters.at(0)?.type).toBe('icon')
    expect(result.parameters.at(0)?.default).toBe(16)
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
describe('a6: map parameter type', () => {
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

    expect(result.parameters.at(0)?.type).toBe('map')
    expect(result.parameters.at(0)?.default).toBe(1)
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
describe('a7: hidden parameter type', () => {
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

    expect(result.parameters.at(0)?.type).toBe('hidden')
    expect(result.parameters.at(0)?.default).toBe('1.0.0')
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

    expect(result.parameters.at(0)?.type).toBe('hidden')
    // Should NOT have rawType since type matches
    expect(result.parameters.at(0)?.rawType).toBeUndefined()
  })
})

// Cross-cutting: round-trip with all new types
describe('round-trip: all new types together', () => {
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

    // Verify all parsed correctly: per parameter its type and whether it is required
    expect([
      parsed.meta.orderBefore,
      parsed.meta.noteParams?.length,
      parsed.parameters.map((parameter) => [parameter.type, parameter.require])
    ]).toStrictEqual([
      ['LatePlugin'],
      1,
      [
        ['combo', undefined],
        ['file', true],
        ['icon', undefined],
        ['map', undefined],
        ['hidden', undefined]
      ]
    ])

    // Regenerate and verify all annotations present
    const plugin = createTestPlugin({
      meta: parsed.meta,
      parameters: parsed.parameters
    })
    const output = generateHeaderOnly(plugin)

    const emitted = [
      '@orderBefore LatePlugin',
      '@noteParam bgmTag',
      '@type combo',
      '@type icon',
      '@type map',
      '@type hidden'
    ]

    expect(emitted.filter((line) => !output.includes(line))).toStrictEqual([])
    // @require and @noteRequire are MV-era and intentionally not re-emitted
    // (the official MZ annotation reference marks @require as discontinued in MZ).
    expect(['@require 1', '@noteRequire'].filter((line) => output.includes(line))).toStrictEqual([])
  })
})

const REQUIRED_ASSETS_SOURCE = `/*:
 * @target MZ
 * @plugindesc Test plugin
 * @author Tester
 * @requiredAssets img/pictures/title
 * @requiredAssets audio/bgm/overworld
 */`

const LOCATION_SOURCE = `/*:
 * @target MZ
 * @plugindesc Test
 * @author Tester
 *
 * @param spawn
 * @type location
 */`

describe('compliance with the MZ annotation spec', () => {
  it('emits @requiredAssets for each asset path', () => {
    const plugin = createTestPlugin({
      meta: {
        name: 'AssetPlugin',
        version: '1.0',
        author: '',
        description: 'x',
        requiredAssets: ['img/pictures/hero', 'audio/bgm/theme']
      }
    })
    const output = generateHeaderOnly(plugin)

    expect(output).toContain('@requiredAssets img/pictures/hero')
    expect(output).toContain('@requiredAssets audio/bgm/theme')
  })

  it('does not emit @require for file params (MV-era discontinued)', () => {
    const plugin = createTestPlugin({
      parameters: [
        {
          id: 'p1',
          name: 'icon',
          text: 'Icon',
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
    expect(output).not.toContain('@require 1')
  })

  it('does not emit @noteRequire for noteParam groups (not in spec)', () => {
    const plugin = createTestPlugin({
      meta: {
        name: 'NoteReqTest',
        version: '1.0',
        author: '',
        description: 'x',
        noteParams: [
          { name: 'bgm', type: 'file', dir: 'audio/bgm/', data: 'actors', require: true }
        ]
      }
    })
    const output = generateHeaderOnly(plugin)

    expect(output).toContain('@noteParam bgm')
    expect(output).toContain('@noteType file')
    expect(output).toContain('@noteDir audio/bgm/')
    expect(output).toContain('@noteData actors')
    expect(output).not.toContain('@noteRequire')
  })

  it('parser extracts @requiredAssets from the header', () => {
    const content = REQUIRED_ASSETS_SOURCE
    const parsed = PluginParser.parsePlugin(content)

    expect(parsed.meta.requiredAssets).toStrictEqual(['img/pictures/title', 'audio/bgm/overworld'])
  })

  it('emits @type location', () => {
    const plugin = createTestPlugin({
      parameters: [
        {
          id: 'p1',
          name: 'spawn',
          text: 'Spawn Point',
          desc: '',
          type: 'location',
          default: ''
        }
      ]
    })
    const output = generateHeaderOnly(plugin)

    expect(output).toContain('@type location')
  })

  it('parses @type location', () => {
    const content = LOCATION_SOURCE
    const parsed = PluginParser.parsePlugin(content)

    expect(parsed.parameters.at(0)?.type).toBe('location')
  })
})
