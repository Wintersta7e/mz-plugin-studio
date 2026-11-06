// Raw mode adding code to imported plugins whose shapes a text scan misreads. Each saved file
// must load as MZ loads a plugin, a classic script in one shared global scope, and register the
// added command or read the added parameter; a file that cannot be read as JavaScript, or an
// output that is not JavaScript, is refused instead of written.
import { describe, it, expect } from 'vitest'
import { Script, createContext } from 'node:vm'
import { PluginParser } from '../../src/main/services/pluginParser'
import { generatePluginOutput, type PluginOutput } from '../../src/renderer/src/lib/plugin-output'
import {
  createEmptyParameter,
  createEmptyStruct,
  toBaseline,
  type PluginDefinition,
  type PluginParameter
} from '../../src/shared/types/plugin'
import { EDITS, loadFixture } from '../golden/corpus/raw-mode'

const HEADER =
  '/*:\n * @target MZ\n * @plugindesc Probe\n * @param A\n * @type number\n * @default 1\n */\n'

const ARROW_IIFE =
  "(() => {\n    'use strict';\n    const PLUGIN_NAME = 'P';\n    const params = PluginManager.parameters(PLUGIN_NAME);\n    const a = Number(params['A'] || 1);\n})();\n"
const FUNCTION_IIFE =
  "(function() {\n    'use strict';\n    const PLUGIN_NAME = 'P';\n    const params = PluginManager.parameters(PLUGIN_NAME);\n    const a = Number(params['A'] || 1);\n}());\n"
const SPEED_DECLARED =
  "(() => {\n    'use strict';\n    const params = PluginManager.parameters('P');\n" +
  "    const a = Number(params['A'] || 1);\n    const speed = 4; // walking speed used below\n})();\n"
const JSON_IDIOM =
  "(() => {\n    'use strict';\n    const pluginName = 'P';\n" +
  '    const params = JSON.parse(JSON.stringify(PluginManager.parameters(pluginName), (k, v) => {\n' +
  '        try { return JSON.parse(v); } catch { return v; }\n    }));\n' +
  '    window.__speed = params.A;\n})();\n'
const CALL_ON_NEXT_LINE =
  "(() => {\n    'use strict';\n    var params =\n        PluginManager.parameters('P');\n" +
  "    window.__a = params['A'];\n})();\n"

const open = (source: string): PluginDefinition => ({
  ...PluginParser.parsePlugin(source, 'P.js'),
  importedFrom: 'P.js'
})

const addParam = (plugin: PluginDefinition, name: string): PluginDefinition => ({
  ...plugin,
  parameters: [
    ...plugin.parameters,
    { id: `p-${name}`, name, text: name, desc: '', type: 'number', default: 2 }
  ]
})

// Adds the command Go
const addCommand = (plugin: PluginDefinition): PluginDefinition => ({
  ...plugin,
  commands: [...plugin.commands, { id: 'c-Go', name: 'Go', text: 'Go', desc: '', args: [] }]
})

const field = (name: string): PluginParameter => ({ ...createEmptyParameter(), name })

const output = (edited: PluginDefinition, opened: PluginDefinition): PluginOutput =>
  generatePluginOutput(edited, true, toBaseline(opened))

function save(edited: PluginDefinition, opened: PluginDefinition): string {
  const out = output(edited, opened)
  if (!out.ok) throw new Error(out.message)
  return out.code
}

interface Loaded {
  registered: string[]
  read: string[]
}

/**
Runs the scripts in order in one new context, as MZ loads plugins; throws what one throws.
*/
function load(...scripts: string[]): Loaded {
  const registered: string[] = []
  const read: string[] = []
  const context = createContext({
    window: {},
    Game_Player: { prototype: {} },
    PluginManager: {
      parameters: () =>
        new Proxy(
          {},
          {
            get: (_target, key) => {
              read.push(String(key))
            }
          }
        ),
      registerCommand: (_plugin: string, name: string) => {
        registered.push(name)
      }
    }
  })
  for (const [index, code] of scripts.entries()) {
    // eslint-disable-next-line sonarjs/code-eval -- runs each generated plugin in a fresh test context
    new Script(code, { filename: `plugin${String(index)}.js` }).runInContext(context)
  }
  return { registered, read }
}

// Saves the edit and loads the saved file
const run = (edited: PluginDefinition, opened: PluginDefinition): Loaded =>
  load(save(edited, opened))

const blockCount = (code: string): number => code.split('/*:\n').length - 1

function editNamed(name: string): (typeof EDITS)[number] {
  const edit = EDITS.find((candidate) => candidate.name === name)
  if (edit === undefined) throw new Error(`no ${name} edit`)
  return edit
}

describe('raw mode adds code where the file can run it', () => {
  it('registers a command added to an arrow-function IIFE', () => {
    const opened = open(HEADER + ARROW_IIFE)

    expect(run(addCommand(opened), opened).registered).toStrictEqual(['Go'])
  })

  it('registers a command added to a function IIFE closed with }());', () => {
    const opened = open(HEADER + FUNCTION_IIFE)

    expect(run(addCommand(opened), opened).registered).toStrictEqual(['Go'])
  })

  it.each([
    ['a quote that pairs up again', `    const quote = (s) => s.replace(/'/g, "\\\\'");\n`],
    ['an unpaired quote', "    const parts = (s) => s.split(/'/).length;\n"]
  ])('reads a parameter added after a regex literal holding %s', (_shape, line) => {
    const opened = open(
      HEADER +
        "(() => {\n    'use strict';\n" +
        line +
        "    const params = PluginManager.parameters('P');\n    const a = Number(params['A'] || 1);\n})();\n"
    )

    expect(run(addParam(opened, 'B'), opened).read).toContain('B')
  })

  it('reads an added parameter whose name the file already declares', () => {
    const opened = open(HEADER + SPEED_DECLARED)

    expect(run(addParam(opened, 'Speed'), opened).read).toContain('Speed')
  })

  it('reads two added parameters whose names map to one identifier', () => {
    const opened = open(
      HEADER + "(() => {\n    const params = PluginManager.parameters('P');\n})();\n"
    )
    const { read } = run(addParam(addParam(opened, 'Speed'), 'speed'), opened)

    expect(read).toStrictEqual(expect.arrayContaining(['Speed', 'speed']))
  })

  it('reuses parameters read through the JSON.parse(JSON.stringify(...)) idiom', () => {
    const opened = open(HEADER + JSON_IDIOM)
    const code = save(addParam(opened, 'Jump'), opened)

    expect(() => load(code)).not.toThrow()
    expect(code).toContain("Number(params['Jump'] || 2)")
  })

  it('reads a parameter added after a declaration whose call is on the next line', () => {
    const opened = open(HEADER + CALL_ON_NEXT_LINE)

    expect(run(addParam(opened, 'Jump'), opened).read).toContain('Jump')
  })

  it("reads a parameter added to a file with a top-level 'use strict' before its block", () => {
    const opened = open(
      "'use strict';\n" +
        HEADER +
        "(() => {\n    const p = window.Imported || {};\n    p.P = PluginManager.parameters('P');\n})();\n"
    )
    const code = save(addParam(opened, 'Jump'), opened)

    expect(blockCount(code)).toBe(1)
    expect(load(code).read).toContain('Jump')
  })

  it("rewrites a main block that follows 'use strict' and adds a parameter after it", () => {
    const opened = open("(() => {\n'use strict';\n" + HEADER + '    window.__a = 1;\n})();\n')
    const edited = addParam(
      { ...opened, meta: { ...opened.meta, description: 'Edited description' } },
      'Jump'
    )
    const code = save(edited, opened)

    expect(blockCount(code)).toBe(1)
    expect(code).toContain(' * @plugindesc Edited description\n')
    expect(load(code).read).toContain('Jump')
  })

  it('keeps parameters added to a plugin without an IIFE out of the global scope', () => {
    const opened = { ...loadFixture('Fixture_NoIife.js'), importedFrom: 'Fixture_NoIife.js' }
    const code = save(editNamed('param-added').apply(opened), opened)

    expect(() => load(code, 'var addedParam = 1;')).not.toThrow()
  })
})

describe('raw mode refuses what it cannot place or would not load', () => {
  const unparsable = HEADER + '(() => {\n    const x = ;\n})();\n'
  const unparsableBody = unparsable.slice(unparsable.indexOf('(() =>'))

  it('refuses code additions to a file that is not valid JavaScript', () => {
    const opened = open(unparsable)
    const refused = {
      ok: false,
      refusal: 'unparsable-source',
      message: expect.stringMatching(/P\.js[\s\S]*Unexpected token \(9:14\)/) as unknown
    }

    expect(
      [addParam(opened, 'B'), addCommand(opened)].map((edited) => output(edited, opened))
    ).toStrictEqual([refused, refused])
  })

  it('still saves an unedited or header-only edit of such a file', () => {
    const opened = open(unparsable)

    expect(output(opened, opened)).toStrictEqual({ ok: true, code: unparsable })

    const described = { ...opened, meta: { ...opened.meta, description: 'Edited description' } }
    const out = output(described, opened)
    const code = out.ok ? out.code : ''

    expect(code).toContain(' * @plugindesc Edited description\n')
    expect(code.endsWith(unparsableBody)).toBe(true)
  })

  it('refuses an output that is not valid JavaScript', () => {
    // A struct block inside a template literal: the backtick of the edit ends the literal
    const opened = open(
      HEADER +
        '(() => {\n    const help = `\n/*~struct~Pos:\n * @param x\n * @type number\n */\n`;\n})();\n'
    )

    expect(opened.structs.map((s) => s.name)).toStrictEqual(['Pos'])

    const edited = structuredClone(opened)
    Object.assign(edited.structs.at(0)?.parameters.at(0) ?? {}, { desc: 'a`b' })

    expect(output(edited, opened)).toStrictEqual({
      ok: false,
      refusal: 'invalid-output',
      message: expect.stringContaining('P.js') as unknown
    })
  })

  describe('two structs of one name', () => {
    // Raw mode finds a struct's block in the file by name, so a second struct of that name
    // would be written over the first one's block
    const withStruct =
      HEADER.replace(' * @param A', ' * @param Points\n * @type struct<NewStruct>[]\n * @param A') +
      '\n/*~struct~NewStruct:\n * @param x\n * @type number\n * @default 3\n *\n' +
      ' * @param y\n * @type number\n * @default 4\n */\n\n' +
      "(() => {\n    const params = PluginManager.parameters('P');\n    window.demoLoaded = true;\n})();\n"

    it.each([
      ['an added struct', (loaded: PluginDefinition) => loaded.structs],
      [
        'an added struct beside an edited original',
        (loaded: PluginDefinition) =>
          loaded.structs.map((struct) => ({
            ...struct,
            parameters: [...struct.parameters, field('z')]
          }))
      ]
    ])('refuses %s named like a struct of the file', (_label, kept) => {
      const opened = open(withStruct)

      expect(opened.structs.map((s) => s.name)).toStrictEqual(['NewStruct'])

      const out = output({ ...opened, structs: [...kept(opened), createEmptyStruct()] }, opened)

      expect(out).toStrictEqual({
        ok: false,
        refusal: 'duplicate-struct',
        message: expect.stringContaining('two structs are named NewStruct') as unknown
      })
    })
  })
})
