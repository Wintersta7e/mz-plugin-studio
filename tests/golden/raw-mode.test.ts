// Imported plugins written back by raw mode after each kind of edit, byte for byte, with whether
// the result still compiles.
import { readFileSync } from 'node:fs'
import { describe, it, expect } from 'vitest'
import { generateRawMode, scriptParseError } from '../../src/renderer/src/lib/generator/index'
import { generatePluginOutput } from '../../src/renderer/src/lib/plugin-output'
import { PluginParser } from '../../src/main/services/pluginParser'
import { extractOverrides, stripCommentsAndStrings } from '../../src/shared/override-extractor'
import {
  toBaseline,
  type PluginBaseline,
  type PluginDefinition
} from '../../src/shared/types/plugin'
import { compileCheck } from '../../src/main/services/syntax-check'
import { fixturePath } from '../helpers/fixture-project'
import { EDITS, fixturePlugins, loadFixture } from './corpus/raw-mode'

const fixtures = fixturePlugins()
const stem = (file: string): string => file.replace(/\.js$/, '')

/** Raw mode's output for an edit of the fixture, against the fixture as it was opened. */
function rawMode(file: string, edit: (typeof EDITS)[number]): string {
  const opened = loadFixture(file)
  return generateRawMode(edit.apply(opened), toBaseline(opened))
}

describe('raw-mode goldens', () => {
  for (const file of fixtures) {
    for (const edit of EDITS) {
      it(`${stem(file)}: ${edit.name}`, async () => {
        await expect(rawMode(file, edit)).toMatchFileSnapshot(
          `__golden__/raw-mode/${stem(file)}.${edit.name}.js`
        )
      })
    }
  }

  it('compile results', async () => {
    const parses: Record<string, boolean> = {}
    for (const file of fixtures) {
      for (const edit of EDITS) {
        const out = rawMode(file, edit)
        parses[`${stem(file)}.${edit.name}`] = compileCheck(out, file) === null
      }
    }
    const total = Object.keys(parses).length
    const compiling = Object.values(parses).filter((parsed) => parsed).length
    console.log(
      `raw-mode: fixtures ${fixtures.length} × edits ${EDITS.length}, compiling ${compiling}/${total}`
    )

    expect(fixtures.length).toBeGreaterThan(0)
    expect(compiling).toBe(total)
    await expect(JSON.stringify(parses, null, 2) + '\n').toMatchFileSnapshot(
      '__golden__/raw-mode/_parses.json'
    )
  })
})

// A plugin whose IIFE takes its name as a parameter, with text above the first tag of its block.
const NAME_PARAMETER_SOURCE = [
  '/*:',
  ' * Notes kept above the tags.',
  ' *',
  ' * @target MZ',
  ' * @plugindesc Reads its name from its own parameter',
  ' */',
  '(function (PLUGIN_NAME) {',
  "  'use strict';",
  '  const params = PluginManager.parameters(PLUGIN_NAME);',
  "})('NameParameter');",
  ''
].join('\n')

/**
The plugin the app opens from `source`, with the baseline raw mode compares against.
*/
function open(
  source: string,
  file: string
): { opened: PluginDefinition; baseline: PluginBaseline } {
  const opened = PluginParser.parsePlugin(source, file)
  return { opened, baseline: toBaseline(opened) }
}

describe('raw mode on hand-written plugins', () => {
  it('keeps the notes above the tags and registers an added command through the IIFE parameter', () => {
    const { opened, baseline } = open(NAME_PARAMETER_SOURCE, 'NameParameter.js')
    const edited = structuredClone(opened)
    edited.meta.description = 'Edited description'
    edited.commands.push({
      id: 'spawn',
      name: 'Spawn',
      text: 'Spawn',
      desc: '',
      args: [{ id: 'count', name: 'count', text: 'Count', desc: '', type: 'number', default: 1 }]
    })

    const code = [
      '/*:',
      ' * Notes kept above the tags.',
      ' *',
      ' * @target MZ',
      ' * @plugindesc Edited description',
      ' *',
      ' * @command Spawn',
      ' *',
      ' * @arg count',
      ' * @text Count',
      ' * @type number',
      ' * @default 1',
      ' *',
      ' */',
      '(function (PLUGIN_NAME) {',
      "  'use strict';",
      '  const params = PluginManager.parameters(PLUGIN_NAME);',
      '',
      '    // --- New commands (added by MZ Plugin Studio) ---',
      "    PluginManager.registerCommand(PLUGIN_NAME, 'Spawn', function(args) {",
      "        const count = Number(args['count'] || 1);",
      '',
      '        // TODO: Implement command logic',
      '        // Parsed args available as: count',
      '    });',
      '    // --- End new commands ---',
      '',
      "})('NameParameter');",
      ''
    ].join('\n')

    expect(generatePluginOutput(edited, true, baseline)).toStrictEqual({ ok: true, code })
  })

  it('refuses to place an added parameter in a file that does not parse', () => {
    const { opened, baseline } = open('/*:\n * @target MZ\n */\n(function () {\n', 'Broken.js')
    const edited = structuredClone(opened)
    edited.parameters.push({
      id: 'speed',
      name: 'Speed',
      text: 'Speed',
      desc: '',
      type: 'number',
      default: 1
    })

    expect(generatePluginOutput(edited, true, baseline)).toStrictEqual({
      ok: false,
      refusal: 'unparsable-source',
      message:
        'Not saved: Broken.js is not valid JavaScript (Unexpected token (5:0)), so raw mode ' +
        'cannot place added parameters, commands or structs in it. Undo those additions, or ' +
        'turn raw mode off to save regenerated code.'
    })
  })

  it('reads a parse error only from code that does not parse', () => {
    expect(scriptParseError('var a = 1;')).toBeUndefined()
    expect(scriptParseError('var a = ;')).toBe('Unexpected token (1:8)')
  })
})

describe('override scan of the fixture plugins', () => {
  it.each(fixtures)('%s: blanks comments and strings in place', (file) => {
    const source = readFileSync(fixturePath('js', 'plugins', file), 'utf8')
    const stripped = stripCommentsAndStrings(source)
    const kept = Array.from(
      { length: source.length },
      (_, index) => stripped[index] === ' ' || stripped[index] === source[index]
    )

    expect(stripped).toHaveLength(source.length)
    expect(kept.every(Boolean)).toBe(true)
  })

  it('ignores prototype references inside comments and strings', () => {
    const code = [
      '/* A.prototype.a = 1 */ const s = "B.prototype.b = 2"',
      "const t = 'C.prototype.c = 3'; const u = `D.prototype.d = 4` // E.prototype.e = 5",
      'F.prototype.f = function () {}; /* G.prototype.g = 6 */ H.prototype.h = 7'
    ].join('\n')

    expect(extractOverrides(code)).toStrictEqual(['F.prototype.f', 'H.prototype.h'])
  })
})
