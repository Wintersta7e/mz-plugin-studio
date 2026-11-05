// Every fixture file exists for a property: line endings, BOM, block order, code shape. Each row
// asserts one property in the file's bytes, so a checkout that rewrites them fails here.
import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { fixturePath } from '../helpers/fixture-project'

type Read = (file: string) => string

interface Row {
  file: string
  property: string
  holds: (text: string, bytes: Buffer, read: Read) => boolean
}

/**
The members of a `js/plugins.js` entry the rows read.
*/
interface PluginsEntry {
  name: string
  description: string
}

const PLUGIN_DIR = 'js/plugins/'
const HAND_WRITTEN = 'Fixture_HandWritten.js'
const CRLF_TWIN = 'Fixture_HandWritten_CRLF.js'
const BOM_FILE = 'Fixture_Bom.js'
const JA_ONLY = 'Fixture_JaOnly.js'
const NO_BLOCK = 'Fixture_NoBlock.js'
const PLUGIN_FILES = [
  HAND_WRITTEN,
  CRLF_TWIN,
  BOM_FILE,
  'Fixture_JaFirst.js',
  'Fixture_EnJaOnly.js',
  'Fixture_Structs.js',
  'Fixture_NoIife.js',
  'Fixture_Require.js',
  'Fixture_NonAscii.js',
  'Fixture_Dependent.js',
  'Fixture_Generated.js',
  JA_ONLY,
  NO_BLOCK,
  '_Fixture_Ignored.js'
]
const PLUGIN_STEMS = PLUGIN_FILES.map((f) => f.replace(/\.js$/, ''))

// The fields each loader of the project parser maps from a data array entry.
const DATA_FIELDS: Record<string, string[]> = {
  'Actors.json': ['id', 'name', 'note'],
  'Classes.json': ['id', 'name'],
  'Skills.json': ['id', 'name'],
  'Items.json': ['id', 'name', 'note'],
  'Weapons.json': ['id', 'name'],
  'Armors.json': ['id', 'name'],
  'Enemies.json': ['id', 'name'],
  'Troops.json': ['id', 'name'],
  'States.json': ['id', 'name'],
  'Animations.json': ['id', 'name'],
  'Tilesets.json': ['id', 'name'],
  'CommonEvents.json': ['id', 'name'],
  'MapInfos.json': ['id', 'name', 'parentId']
}

const ALL_FILES = [
  'data/System.json',
  ...Object.keys(DATA_FIELDS).map((f) => `data/${f}`),
  'js/plugins.js',
  ...PLUGIN_FILES.map((f) => PLUGIN_DIR + f)
]

const BOM = Buffer.from([0xef, 0xbb, 0xbf])
const LONE_LF = /(?:^|[^\r])\n/
const NON_ASCII = /[\u{80}-\u{10FFFF}]/u
const BARE_HEADER = /\/\*:\r?\n/
const IIFE_OPEN = /\((?:\(\)\s*=>|function\s*\(\))\s*\{/

interface Block {
  name: string
  start: number
  end: number
  body: string
}

/**
The blocks `pattern` matches, its first group the name and its second the body.
*/
function blocksOf(text: string, pattern: RegExp): Block[] {
  return text
    .matchAll(pattern)
    .map((m) => ({
      name: m.at(1) ?? '',
      start: m.index,
      end: m.index + m[0].length,
      body: m.at(2) ?? ''
    }))
    .toArray()
}

/**
`/*:` and `/*:xx` blocks; `name` is the language suffix, '' for the bare block.
*/
function headerBlocks(text: string): Block[] {
  return blocksOf(text, /\/\*:([a-z]*)\r?\n([\s\S]*?)\*\//g)
}

function structBlocks(text: string): Block[] {
  return blocksOf(text, /\/\*~struct~(\w+):[a-z]*\r?\n([\s\S]*?)\*\//g)
}

/**
The block the app reads first: the bare one, else `/*:en`.
*/
function mainBlock(text: string): string {
  const blocks = headerBlocks(text)
  return (blocks.find((b) => b.name === '') ?? blocks.find((b) => b.name === 'en'))?.body ?? ''
}

/**
Text after the header blocks and the struct blocks that directly follow them.
*/
function code(text: string): string {
  let at = Math.max(0, ...headerBlocks(text).map((b) => b.end))
  for (const block of structBlocks(text)) {
    if (block.start >= at && text.slice(at, block.start).trim() === '') at = block.end
  }
  return text.slice(at)
}

/**
Sections of an annotation block, each from `@tag` up to the next tag in `until`.
*/
function sections(block: string, tag: string, until: string): string[] {
  return block.match(new RegExp(String.raw`@${tag}\s[\s\S]*?(?=@(?:${until})\s|$)`, 'g')) ?? []
}

const params = (block: string): string[] => sections(block, 'param', 'param|command|arg')
const commands = (block: string): string[] => sections(block, 'command', 'command|param')

const bareHeaderAt = (text: string): number => text.search(BARE_HEADER)

function byCodeUnit(left: string, right: string): number {
  if (left === right) return 0
  return left < right ? -1 : 1
}

function isArray(value: unknown): value is unknown[] {
  return Array.isArray(value)
}

function isObject(value: unknown): value is object {
  return typeof value === 'object' && value !== null
}

function isPluginsEntry(value: unknown): value is PluginsEntry {
  return (
    isObject(value) &&
    typeof Reflect.get(value, 'name') === 'string' &&
    typeof Reflect.get(value, 'description') === 'string'
  )
}

/**
The `$plugins` array; an entry of another shape fails the row that reads it.
*/
function pluginEntries(text: string): PluginsEntry[] {
  const parsed: unknown = JSON.parse(text.slice(text.indexOf('['), text.lastIndexOf(']') + 1))
  const entries = isArray(parsed) ? parsed.filter((entry) => isPluginsEntry(entry)) : []
  if (!isArray(parsed) || entries.length !== parsed.length) {
    throw new Error('$plugins holds an entry without a name and description')
  }
  return entries
}

/**
`["", name, name, name]`: index 0 unused, three named entries.
*/
function isThreeNamed(list: unknown): boolean {
  return (
    isArray(list) &&
    list.length === 4 &&
    list[0] === '' &&
    list.slice(1).every((n) => typeof n === 'string' && n.length > 0)
  )
}

function overrides(source: string): string[] {
  return source
    .matchAll(/\b(\w+\.prototype\.\w+)\s*=\s*function\b/g)
    .map((m) => m.at(1) ?? '')
    .toArray()
}

/** The edit targets every plugin's main block carries: header tags, a number and a string
param, a command with an argument, and a struct referenced by a param. */
function hasEditTargets(text: string): boolean {
  const main = mainBlock(text)
  const list = params(main)
  return (
    /@target MZ\b/.test(main) &&
    /@plugindesc \S/.test(main) &&
    /@author Example Author\b/.test(main) &&
    /@url https:\/\/example\.invalid\/\S/.test(main) &&
    /@help\b/.test(main) &&
    list.length >= 2 &&
    list.some(
      (p) =>
        /@type number\b/.test(p) && /@min\s/.test(p) && /@max\s/.test(p) && /@default\s/.test(p)
    ) &&
    list.some((p) => /@type string\b/.test(p)) &&
    commands(main).some((c) => /@arg\s/.test(c)) &&
    structBlocks(text).some((s) => /@param\s/.test(s.body) && main.includes(`struct<${s.name}>`))
  )
}

const plugin = (file: string): string => PLUGIN_DIR + file

const ROWS: Row[] = [
  {
    file: 'data/System.json',
    property: 'game title Fixture Game, 3 switches, 3 variables',
    holds: (t) => {
      const system: unknown = JSON.parse(t)
      return (
        isObject(system) &&
        Reflect.get(system, 'gameTitle') === 'Fixture Game' &&
        isThreeNamed(Reflect.get(system, 'switches')) &&
        isThreeNamed(Reflect.get(system, 'variables'))
      )
    }
  },
  ...Object.entries(DATA_FIELDS).map(
    ([name, fields]): Row => ({
      file: `data/${name}`,
      property: '[null, entry, entry] with the fields its loader maps',
      holds: (t) => {
        const data: unknown = JSON.parse(t)
        return (
          isArray(data) &&
          data.length === 3 &&
          data[0] === null &&
          data
            .slice(1)
            .every(
              (entry, index) =>
                isObject(entry) &&
                Reflect.get(entry, 'id') === index + 1 &&
                fields.every((field) => Reflect.has(entry, field))
            )
        )
      }
    })
  ),
  {
    file: 'data/Actors.json',
    property: 'both actors carry note tags',
    holds: (t) => {
      const actors: unknown = JSON.parse(t)
      return (
        isArray(actors) &&
        actors.slice(1).every((actor) => {
          const note: unknown = isObject(actor) ? Reflect.get(actor, 'note') : undefined
          return (
            typeof note === 'string' &&
            note.includes('<FixtureTag: 1>') &&
            note.includes('<FixtureFlag>')
          )
        })
      )
    }
  },
  {
    file: 'js/plugins.js',
    property: '$plugins lists every fixture plugin but the underscore one',
    holds: (t) =>
      t.startsWith('var $plugins =') &&
      t.endsWith('];\n') &&
      JSON.stringify(
        pluginEntries(t)
          .map((entry) => entry.name)
          .toSorted(byCodeUnit)
      ) === JSON.stringify(PLUGIN_STEMS.filter((s) => !s.startsWith('_')).toSorted(byCodeUnit))
  },
  {
    file: 'js/plugins.js',
    property: 'the Fixture_Structs description contains ];',
    holds: (t) =>
      JSON.stringify(
        pluginEntries(t)
          .filter((entry) => entry.description.includes('];'))
          .map((entry) => entry.name)
      ) === '["Fixture_Structs"]'
  },
  ...ALL_FILES.map(
    (file): Row =>
      file === plugin(CRLF_TWIN)
        ? {
            file,
            property: 'CRLF line endings only',
            holds: (t) => t.includes('\r\n') && !LONE_LF.test(t)
          }
        : {
            file,
            property: 'LF line endings only',
            holds: (t) => t.includes('\n') && !t.includes('\r')
          }
  ),
  ...ALL_FILES.map(
    (file): Row =>
      file === plugin(BOM_FILE)
        ? {
            file,
            property: 'starts with a UTF-8 BOM',
            holds: (_t, b) => b.subarray(0, 3).equals(BOM)
          }
        : { file, property: 'no BOM', holds: (_t, b) => !b.subarray(0, 3).equals(BOM) }
  ),
  // The two files without a bare or `/*:en` block have no main block to carry them.
  ...PLUGIN_FILES.filter((f) => ![CRLF_TWIN, JA_ONLY, NO_BLOCK].includes(f)).map(
    (file): Row => ({
      file: plugin(file),
      property: 'header tags, number and string params, command argument, referenced struct',
      holds: (t) => hasEditTargets(t)
    })
  ),
  {
    file: plugin(HAND_WRITTEN),
    property: 'licence comment before the header',
    holds: (t) => {
      const first = t.indexOf('/*')
      return (
        first !== -1 &&
        first < t.indexOf('/*:') &&
        /licen[cs]e/i.test(t.slice(first, t.indexOf('*/', first)))
      )
    }
  },
  {
    file: plugin(HAND_WRITTEN),
    property: 'bare /*: then /*:ja',
    holds: (t) => bareHeaderAt(t) >= 0 && bareHeaderAt(t) < t.indexOf('/*:ja')
  },
  {
    file: plugin(HAND_WRITTEN),
    property: 'JSDoc block comments in the body',
    holds: (t) => code(t).includes('/**')
  },
  {
    file: plugin(HAND_WRITTEN),
    property: 'IIFE',
    holds: (t) =>
      new RegExp(String.raw`^\s*${IIFE_OPEN.source}`).test(code(t)) && /\}\)\(\);\s*$/.test(t)
  },
  {
    file: plugin(HAND_WRITTEN),
    property: 'helper function and prototype alias',
    holds: (t) =>
      /\bfunction\s+\w+\s*\(/.test(code(t)) && /\bconst _\w+ = \w+\.prototype\.\w+;/.test(code(t))
  },
  {
    file: plugin(HAND_WRITTEN),
    property: 'registerCommand body calls the helper',
    holds: (t) => {
      const body = code(t)
      const helper = /\bfunction\s+(\w+)\s*\(/.exec(body)?.[1]
      const at = body.indexOf('PluginManager.registerCommand(')
      return (
        helper !== undefined &&
        at !== -1 &&
        body.slice(at, body.indexOf('});', at)).includes(`${helper}(`)
      )
    }
  },
  {
    file: plugin(HAND_WRITTEN),
    property: `params['X'] and params["X"]`,
    holds: (t) => /\bparams\['\w+'\]/.test(code(t)) && /\bparams\["\w+"\]/.test(code(t))
  },
  {
    file: plugin(HAND_WRITTEN),
    property: 'number @param with @default',
    holds: (t) => params(mainBlock(t)).some((p) => /@type number\b/.test(p) && /@default\s/.test(p))
  },
  {
    file: plugin(HAND_WRITTEN),
    property: '@command with @text',
    holds: (t) => commands(mainBlock(t)).some((c) => /@text\s/.test(c))
  },
  {
    file: plugin(CRLF_TWIN),
    property: `byte twin of ${HAND_WRITTEN} with CRLF line endings`,
    holds: (t, _b, read) => t.replaceAll('\r\n', '\n') === read(plugin(HAND_WRITTEN))
  },
  {
    file: plugin('Fixture_JaFirst.js'),
    property: '/*:ja before the bare /*:',
    holds: (t) => t.includes('/*:ja') && t.indexOf('/*:ja') < bareHeaderAt(t)
  },
  {
    file: plugin('Fixture_JaFirst.js'),
    property: `parameters['X']`,
    holds: (t) => /\bparameters\['\w+'\]/.test(code(t))
  },
  {
    file: plugin('Fixture_EnJaOnly.js'),
    property: '/*:en and /*:ja, no bare block',
    holds: (t) => t.includes('/*:en') && t.includes('/*:ja') && bareHeaderAt(t) === -1
  },
  {
    file: plugin('Fixture_Structs.js'),
    property: '/*~struct~ blocks after the last code line',
    holds: (t) => {
      const structs = structBlocks(t)
      const headersEnd = Math.max(...headerBlocks(t).map((b) => b.end))
      const first = Math.min(...structs.map((b) => b.start))
      const last = Math.max(...structs.map((b) => b.end))
      return (
        structs.length >= 2 &&
        t.slice(headersEnd, first).trim() !== '' &&
        t.slice(last).trim() === ''
      )
    }
  },
  {
    file: plugin('Fixture_Structs.js'),
    property: 'struct<X>[] parameter',
    holds: (t) => /@type struct<\w+>\[\]/.test(mainBlock(t))
  },
  {
    file: plugin('Fixture_Structs.js'),
    property: 'a command whose @text and @desc precede its first @arg',
    holds: (t) =>
      commands(mainBlock(t)).some((c) => {
        const arg = c.indexOf('@arg ')
        const text = c.indexOf('@text ')
        const desc = c.indexOf('@desc ')
        return arg > 0 && text > 0 && desc > 0 && text < arg && desc < arg
      })
  },
  {
    file: plugin('Fixture_Structs.js'),
    property: 'a command without @text',
    holds: (t) => commands(mainBlock(t)).some((c) => !/@text\s/.test(c))
  },
  {
    file: plugin('Fixture_NoIife.js'),
    property: 'no IIFE',
    holds: (t) => !IIFE_OPEN.test(code(t))
  },
  {
    file: plugin('Fixture_NoIife.js'),
    property: 'prm.X',
    holds: (t) => /\bprm\.[A-Za-z_]\w*/.test(code(t))
  },
  {
    file: plugin('Fixture_NoIife.js'),
    property: 'multi-line PluginManager.parameters( call',
    holds: (t) => /PluginManager\.parameters\(\s*\n/.test(code(t))
  },
  {
    file: plugin('Fixture_Require.js'),
    property: '@require 1',
    holds: (t) => params(mainBlock(t)).some((p) => /@require 1\b/.test(p))
  },
  {
    file: plugin('Fixture_Require.js'),
    property: 'note-asset group: @noteParam, @noteDir, @noteType, @noteData',
    holds: (t) => {
      const main = mainBlock(t)
      const group = main.indexOf('@noteParam ')
      return (
        group !== -1 &&
        ['@noteDir ', '@noteType ', '@noteData '].every((tag) => main.indexOf(tag, group) > group)
      )
    }
  },
  {
    file: plugin('Fixture_NonAscii.js'),
    property: 'non-ASCII description',
    holds: (t) => NON_ASCII.test(/@plugindesc (.*)/.exec(mainBlock(t))?.[1] ?? '')
  },
  {
    file: plugin('Fixture_NonAscii.js'),
    property: 'non-ASCII parameter text',
    holds: (t) => params(mainBlock(t)).some((p) => NON_ASCII.test(p))
  },
  {
    file: plugin('Fixture_NonAscii.js'),
    property: 'non-ASCII code',
    holds: (t) => NON_ASCII.test(code(t))
  },
  {
    file: plugin('Fixture_Dependent.js'),
    property: '@base names another fixture',
    holds: (t) => {
      const base = /@base (\w+)/.exec(mainBlock(t))?.[1]
      return base !== undefined && base !== 'Fixture_Dependent' && PLUGIN_STEMS.includes(base)
    }
  },
  {
    file: plugin('Fixture_Dependent.js'),
    property: '@orderAfter names another fixture',
    holds: (t) => {
      const after = /@orderAfter (\w+)/.exec(mainBlock(t))?.[1]
      return after !== undefined && after !== 'Fixture_Dependent' && PLUGIN_STEMS.includes(after)
    }
  },
  {
    file: plugin('Fixture_Dependent.js'),
    property: 'overrides a method another fixture overrides',
    holds: (t, _b, read) => {
      const mine = overrides(code(t))
      return PLUGIN_FILES.filter((f) => f !== 'Fixture_Dependent.js').some((f) => {
        const theirs = read(plugin(f))
        return overrides(code(theirs)).some((m) => mine.includes(m))
      })
    }
  },
  {
    file: plugin('Fixture_Generated.js'),
    property: 'generator output: header first, registered command, no hand-written preamble',
    holds: (t) =>
      t.startsWith('/*:\n * @target MZ\n * @plugindesc Generated fixture plugin\n') &&
      t.includes("PluginManager.registerCommand(PLUGIN_NAME, 'ShowLabel'")
  },
  {
    file: plugin(JA_ONLY),
    property: 'only /*:ja',
    holds: (t) => {
      const blocks = headerBlocks(t)
      const only = blocks.length === 1 ? blocks.at(0) : undefined
      return only?.name === 'ja' && params(only.body).length >= 2
    }
  },
  {
    file: plugin(JA_ONLY),
    property: 'IIFE reading PluginManager.parameters',
    holds: (t) =>
      new RegExp(String.raw`^\s*${IIFE_OPEN.source}`).test(code(t)) &&
      code(t).includes('PluginManager.parameters(')
  },
  {
    file: plugin(NO_BLOCK),
    property: 'no annotation block',
    holds: (t) => !t.includes('/*:') && !t.includes('/*~struct~')
  },
  {
    file: plugin(NO_BLOCK),
    property: 'IIFE with one registerCommand',
    holds: (t) =>
      new RegExp(String.raw`^\s*${IIFE_OPEN.source}`).test(code(t).replace(/^(?:\/\/.*\n)+/, '')) &&
      t.split('PluginManager.registerCommand(').length === 2
  },
  {
    file: plugin('_Fixture_Ignored.js'),
    property: 'underscore-prefixed plugin file',
    holds: (t) => mainBlock(t) !== ''
  }
]

function filesOnDisk(): string[] {
  const root = fixturePath()
  return readdirSync(root, { recursive: true, encoding: 'utf8' })
    .map((p) => path.join(root, p))
    .filter((p) => statSync(p).isFile())
    .map((p) => path.relative(root, p).replaceAll('\\', '/'))
    .toSorted(byCodeUnit)
}

/**
The file's bytes, or null when it cannot be read.
*/
function tryRead(file: string): Buffer | null {
  try {
    return readFileSync(fixturePath(file))
  } catch {
    return null
  }
}

describe('fixture project', () => {
  it('carries every listed property in its bytes', () => {
    const cache = new Map<string, Buffer | null>()
    const load = (file: string): Buffer | null => {
      const cached = cache.get(file)
      if (cached !== undefined) return cached
      const bytes = tryRead(file)
      cache.set(file, bytes)
      return bytes
    }
    const read: Read = (file) => {
      const bytes = load(file)
      if (bytes === null) throw new Error(`missing ${file}`)
      return bytes.toString('utf8')
    }

    const failing: string[] = []
    for (const row of ROWS) {
      const bytes = load(row.file)
      let isHolds = false
      if (bytes !== null) {
        try {
          isHolds = row.holds(bytes.toString('utf8'), bytes, read)
        } catch {
          isHolds = false
        }
      }
      if (!isHolds)
        failing.push(`${row.file}: ${row.property}${bytes === null ? ' (missing)' : ''}`)
    }
    const listed = [...new Set(ROWS.map((r) => r.file))].toSorted(byCodeUnit)
    const present = listed.filter((f) => load(f) !== null)

    process.stdout.write(
      `fixture properties ${String(ROWS.length - failing.length)}/${String(ROWS.length)}, ` +
        `files ${String(present.length)}\n`
    )

    expect(present.length).toBeGreaterThan(0)
    expect(failing).toStrictEqual([])
    expect(filesOnDisk()).toStrictEqual(listed)

    const size = present.reduce((sum, f) => sum + (load(f)?.length ?? 0), 0)

    expect(size).toBeLessThanOrEqual(50 * 1024)
  })
})
