// Raw mode adding code to imported plugins whose shapes a text scan misreads. Each saved file
// must load as MZ loads a plugin, a classic script in one shared global scope, and register the
// added command or read the added parameter; a file that cannot be read as JavaScript, or an
// output that is not JavaScript, is refused instead of written.
import { describe, it, expect } from 'vitest'
import { Script, createContext } from 'vm'
import { PluginParser } from '../../src/main/services/pluginParser'
import { generatePluginOutput } from '../../src/renderer/src/lib/plugin-output'
import type { PluginOutput } from '../../src/renderer/src/lib/plugin-output'
import { toBaseline } from '../../src/shared/types/plugin'
import type { PluginDefinition } from '../../src/shared/types/plugin'
import { EDITS, loadFixture } from '../golden/corpus/raw-mode'

const HEADER =
  '/*:\n * @target MZ\n * @plugindesc Probe\n * @param A\n * @type number\n * @default 1\n */\n'

const open = (source: string, file = 'P.js'): PluginDefinition => ({
  ...PluginParser.parsePlugin(source, file),
  importedFrom: file
})

const addParam = (def: PluginDefinition, name: string): PluginDefinition => ({
  ...def,
  parameters: [
    ...def.parameters,
    { id: `p-${name}`, name, text: name, desc: '', type: 'number', default: 2 }
  ]
})

const addCommand = (def: PluginDefinition, name: string): PluginDefinition => ({
  ...def,
  commands: [...def.commands, { id: `c-${name}`, name, text: name, desc: '', args: [] }]
})

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

/** Runs the scripts in order in one new context, as MZ loads plugins; throws what one throws. */
function load(...scripts: string[]): Loaded {
  const registered: string[] = []
  const read: string[] = []
  const context = createContext({
    window: {},
    Game_Player: class {},
    PluginManager: {
      parameters: () =>
        new Proxy(
          {},
          {
            get: (_target, key) => {
              read.push(String(key))
              return undefined
            }
          }
        ),
      registerCommand: (_plugin: string, name: string) => {
        registered.push(name)
      }
    }
  })
  scripts.forEach((code, i) => {
    new Script(code, { filename: `plugin${i}.js` }).runInContext(context)
  })
  return { registered, read }
}

const blockCount = (code: string): number => code.split('/*:\n').length - 1

describe('raw mode adds code where the file can run it', () => {
  it('registers a command added to an arrow-function IIFE', () => {
    const opened = open(
      HEADER +
        "(() => {\n    'use strict';\n    const PLUGIN_NAME = 'P';\n    const params = PluginManager.parameters(PLUGIN_NAME);\n    const a = Number(params['A'] || 1);\n})();\n"
    )
    expect(load(save(addCommand(opened, 'Go'), opened)).registered).toEqual(['Go'])
  })

  it('registers a command added to a function IIFE closed with }());', () => {
    const opened = open(
      HEADER +
        "(function() {\n    'use strict';\n    const PLUGIN_NAME = 'P';\n    const params = PluginManager.parameters(PLUGIN_NAME);\n    const a = Number(params['A'] || 1);\n}());\n"
    )
    expect(load(save(addCommand(opened, 'Go'), opened)).registered).toEqual(['Go'])
  })

  for (const [shape, line] of [
    ['a quote that pairs up again', `    const quote = (s) => s.replace(/'/g, "\\\\'");\n`],
    ['an unpaired quote', "    const parts = (s) => s.split(/'/).length;\n"]
  ]) {
    it(`reads a parameter added after a regex literal holding ${shape}`, () => {
      const opened = open(
        HEADER +
          "(() => {\n    'use strict';\n" +
          line +
          "    const params = PluginManager.parameters('P');\n    const a = Number(params['A'] || 1);\n})();\n"
      )
      expect(load(save(addParam(opened, 'B'), opened)).read).toContain('B')
    })
  }

  it('reads an added parameter whose name the file already declares', () => {
    const opened = open(
      HEADER +
        "(() => {\n    'use strict';\n    const params = PluginManager.parameters('P');\n" +
        "    const a = Number(params['A'] || 1);\n    const speed = 4; // walking speed used below\n})();\n"
    )
    expect(load(save(addParam(opened, 'Speed'), opened)).read).toContain('Speed')
  })

  it('reads two added parameters whose names map to one identifier', () => {
    const opened = open(
      HEADER + "(() => {\n    const params = PluginManager.parameters('P');\n})();\n"
    )
    const read = load(save(addParam(addParam(opened, 'Speed'), 'speed'), opened)).read
    expect(read).toEqual(expect.arrayContaining(['Speed', 'speed']))
  })

  it('reuses parameters read through the JSON.parse(JSON.stringify(...)) idiom', () => {
    const opened = open(
      HEADER +
        "(() => {\n    'use strict';\n    const pluginName = 'P';\n" +
        '    const params = JSON.parse(JSON.stringify(PluginManager.parameters(pluginName), (k, v) => {\n' +
        '        try { return JSON.parse(v); } catch { return v; }\n    }));\n' +
        '    window.__speed = params.A;\n})();\n'
    )
    const code = save(addParam(opened, 'Jump'), opened)
    expect(() => load(code)).not.toThrow()
    expect(code).toContain("Number(params['Jump'] || 2)")
  })

  it('reads a parameter added after a declaration whose call is on the next line', () => {
    const opened = open(
      HEADER +
        "(() => {\n    'use strict';\n    var params =\n        PluginManager.parameters('P');\n" +
        "    window.__a = params['A'];\n})();\n"
    )
    expect(load(save(addParam(opened, 'Jump'), opened)).read).toContain('Jump')
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
    const edit = EDITS.find((e) => e.name === 'param-added')
    if (edit === undefined) throw new Error('no param-added edit')
    const code = save(edit.apply(opened), opened)
    expect(() => load(code, 'var addedParam = 1;')).not.toThrow()
  })
})

describe('raw mode refuses what it cannot place or would not load', () => {
  const unparsable = HEADER + '(() => {\n    const x = ;\n})();\n'

  it('refuses code additions to a file that is not valid JavaScript', () => {
    const opened = open(unparsable)
    for (const edited of [addParam(opened, 'B'), addCommand(opened, 'Go')]) {
      const out = output(edited, opened)
      expect(out.ok).toBe(false)
      if (out.ok) continue
      expect(out.refusal).toBe('unparsable-source')
      expect(out.message).toContain('P.js')
      expect(out.message).toContain('Unexpected token (9:14)')
    }
  })

  it('still saves an unedited or header-only edit of such a file', () => {
    const opened = open(unparsable)
    expect(output(opened, opened)).toEqual({ ok: true, code: unparsable })
    const described = { ...opened, meta: { ...opened.meta, description: 'Edited description' } }
    const out = output(described, opened)
    const code = out.ok ? out.code : ''
    expect(code).toContain(' * @plugindesc Edited description\n')
    expect(code.endsWith(unparsable.slice(unparsable.indexOf('(() =>')))).toBe(true)
  })

  it('refuses an output that is not valid JavaScript', () => {
    // A struct block inside a template literal: the backtick of the edit ends the literal
    const opened = open(
      HEADER +
        '(() => {\n    const help = `\n/*~struct~Pos:\n * @param x\n * @type number\n */\n`;\n})();\n'
    )
    expect(opened.structs.map((s) => s.name)).toEqual(['Pos'])
    const edited = structuredClone(opened)
    edited.structs[0].parameters[0].desc = 'a`b'
    const out = output(edited, opened)
    expect(out.ok).toBe(false)
    if (out.ok) return
    expect(out.refusal).toBe('invalid-output')
    expect(out.message).toContain('P.js')
  })
})
