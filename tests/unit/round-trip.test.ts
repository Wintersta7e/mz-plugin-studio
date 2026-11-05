// Round-trip properties of an imported plugin over every fixture plugin and every kind of edit:
// open the file, edit, save, and compare the bytes with the file. KNOWN_FAILING lists the
// (fixture, property) pairs that fail today; a listed pair must fail and an unlisted pair must
// hold, so a fix that makes a listed pair hold fails here until its row is removed.
import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { PluginParser } from '../../src/main/services/pluginParser'
import { generatePluginOutput } from '../../src/renderer/src/lib/plugin-output'
import { toBaseline, type PluginDefinition } from '../../src/shared/types/plugin'
import { EDITS, type Edit } from '../golden/corpus/raw-mode'
import { compileCheck } from '../../src/main/services/syntax-check'
import { fixturePath } from '../helpers/fixture-project'

const NAMES = [
  'unedited',
  'revert',
  'edited-regions',
  'encoding',
  'idempotent',
  'scaffold-once',
  'no-structural-fallback',
  'lf-twin',
  'main-block-by-rule',
  'command-text',
  'code-body'
] as const

type PropertyName = (typeof NAMES)[number]

const KNOWN_FAILING: Partial<Record<string, PropertyName[]>> = {}

const PLUGIN_DIR = fixturePath('js', 'plugins')
const LF_TWIN = 'Fixture_HandWritten.js'
const CRLF_TWIN = 'Fixture_HandWritten_CRLF.js'

function byCodeUnit(left: string, right: string): number {
  if (left === right) return 0
  return left < right ? -1 : 1
}

const FIXTURES = readdirSync(PLUGIN_DIR)
  .filter((f) => f.endsWith('.js'))
  .toSorted(byCodeUnit)

const read = (file: string): string => readFileSync(path.join(PLUGIN_DIR, file), 'utf8')
const open = (text: string, file: string): PluginDefinition => PluginParser.parsePlugin(text, file)

/**
The save under test: raw mode on, the definition loaded from the file as the baseline.
*/
function save(plugin: PluginDefinition, opened: PluginDefinition): string {
  const out = generatePluginOutput(plugin, true, toBaseline(opened))
  if (!out.ok) throw new Error(out.message)
  return out.code
}

/**
A save that refuses throws; `null` stands for the refusal.
*/
function attempt(plugin: PluginDefinition, opened: PluginDefinition): string | null {
  try {
    return save(plugin, opened)
  } catch {
    return null
  }
}

// ---- Oracle block cutter (independent of src/) ----

interface Block {
  opener: string
  lang: string
  struct: string | null
  start: number
  end: number
}

const OPENER = /\/\*(?::([a-z]{0,2})|~struct~(\w+):([a-z]{0,2}))/g

/**
Every annotation block; each ends at the first `*\/` after its opener.
*/
function blocks(text: string): Block[] {
  const found: Block[] = []
  let from = 0
  for (const m of text.matchAll(OPENER)) {
    if (m.index < from) continue
    const close = text.indexOf('*/', m.index + m[0].length)
    const end = close === -1 ? text.length : close + 2
    found.push({
      opener: m[0],
      lang: m.at(1) ?? m.at(3) ?? '',
      struct: m.at(2) ?? null,
      start: m.index,
      end
    })
    from = end
  }
  return found
}

const headers = (text: string): Block[] => blocks(text).filter((b) => b.struct === null)

/**
The bare `/*:` block, else `/*:en`.
*/
function mainBlock(text: string): Block | undefined {
  const list = headers(text)
  return list.find((b) => b.lang === '') ?? list.find((b) => b.lang === 'en')
}

/**
A struct's bare or `:en` block.
*/
function structBlock(text: string, name: string): Block | undefined {
  const list = blocks(text).filter((b) => b.struct === name)
  return list.find((b) => b.lang === '') ?? list.find((b) => b.lang === 'en')
}

const bodyOf = (text: string, block: Block): string => text.slice(block.start, block.end)

/**
The text with the given blocks removed.
*/
function cut(text: string, remove: Block[]): string {
  let out = ''
  let at = 0
  const ordered = remove.toSorted((x, y) => x.start - y.start)
  for (const b of ordered) {
    out += text.slice(at, b.start)
    at = b.end
  }
  return out + text.slice(at)
}

/**
Text outside every annotation block.
*/
const codeOf = (text: string): string => cut(text, blocks(text))

const count = (text: string, needle: string): number => text.split(needle).length - 1

/**
Inserted text when `after` equals `before` plus one contiguous insertion, else null.
*/
function insertion(before: string, after: string): string | null {
  let p = 0
  while (p < before.length && p < after.length && before[p] === after[p]) p++
  let s = 0
  while (
    s < before.length - p &&
    s < after.length - p &&
    before[before.length - 1 - s] === after[after.length - 1 - s]
  )
    s++
  return p + s === before.length ? after.slice(p, after.length - s) : null
}

const touched = (a: PluginDefinition, b: PluginDefinition): (keyof PluginDefinition)[] =>
  (['meta', 'parameters', 'commands', 'structs'] as const).filter(
    (k) => JSON.stringify(a[k]) !== JSON.stringify(b[k])
  )

const addedNames = (edited: PluginDefinition, base: PluginDefinition): string[] => {
  const names = (d: PluginDefinition): string[] => [
    ...d.parameters.map((p) => p.name),
    ...d.commands.map((c) => c.name)
  ]
  const before = new Set(names(base))
  return names(edited).filter((n) => !before.has(n))
}

// ---- Per-fixture inputs ----

interface Run {
  edit: Edit
  edited: PluginDefinition
  out: string | null
}

interface Loaded {
  text: string
  base: PluginDefinition
  compiles: boolean
  runs: Run[]
}

const cache = new Map<string, Loaded>()

function load(file: string): Loaded {
  let loaded = cache.get(file)
  if (loaded === undefined) {
    const text = read(file)
    const base = open(text, file)
    const runs = EDITS.map((edit) => {
      const edited = edit.apply(base)
      return { edit, edited, out: attempt(edited, base) }
    })
    loaded = { text, base, compiles: compileCheck(text, file) === null, runs }
    cache.set(file, loaded)
  }
  return loaded
}

const HEADER_EDITS = new Set([
  'meta-description',
  'param-added',
  'param-removed',
  'param-default',
  'command-added',
  'command-arg-added'
])

/**
The parsed file and its main block's text with LF line ends; undefined for a file without one.
*/
function mainBlockOf(file: string): { base: PluginDefinition; lf: string } | undefined {
  const { text, base } = load(file)
  const main = mainBlock(text)
  return main === undefined ? undefined : { base, lf: bodyOf(text, main).replaceAll('\r\n', '\n') }
}

// A CRLF file holds a line feed without its carriage return
const hasBareLf = (text: string): boolean => /(?:^|[^\r])\n/.test(text)

/**
Problems with the scaffold a save wrote for each added name; empty when each appears once and a
second save keeps it.
*/
function scaffoldProblems(run: Run, base: PluginDefinition, file: string, out: string): string[] {
  const problems: string[] = []
  for (const name of addedNames(run.edited, base)) {
    const once = count(codeOf(out), name)
    const reopened = open(out, file)
    const again = attempt(reopened, reopened)
    if (once !== 1) {
      problems.push(`${run.edit.name}: scaffold for ${name} appears ${String(once)} times`)
    }
    if (again !== null && count(codeOf(again), name) !== once) {
      problems.push(`${run.edit.name}: second save changes the scaffold for ${name}`)
    }
  }
  return problems
}

// Compares two parses without the generated ids and the raw source
const strip = (plugin: PluginDefinition): string =>
  JSON.stringify(plugin, (key, value: unknown) =>
    key === 'id' || key === 'rawSource' ? undefined : value
  )

/**
Problems found for one property; empty when it holds.
*/
const PROPERTIES: Record<PropertyName, (file: string) => string[]> = {
  unedited: (file) => {
    const { text, base, compiles } = load(file)
    if (!compiles) return []
    return attempt(base, base) === text ? [] : ['save(open(F)) differs from F']
  },

  revert: (file) => {
    const { text, base, compiles, runs } = load(file)
    if (!compiles) return []
    const problems: string[] = []
    for (const { edit, edited } of runs) {
      const reverted: PluginDefinition = { ...edited }
      for (const key of touched(edited, base)) {
        Object.assign(reverted, { [key]: structuredClone(base[key]) })
      }
      if (attempt(reverted, base) !== text) problems.push(`${edit.name} then reverted differs`)
    }
    return problems
  },

  'edited-regions': (file) => {
    const { text, base, runs } = load(file)
    const main = mainBlock(text)
    const problems: string[] = []
    for (const { edit, edited, out } of runs) {
      const isChanged = touched(edited, base).length > 0
      if (isChanged && main === undefined && HEADER_EDITS.has(edit.name)) {
        if (out !== null)
          problems.push(`${edit.name}: header edit without a main block not refused`)
        continue
      }
      if (out === null) {
        problems.push(`${edit.name}: refused`)
        continue
      }
      const allowedIn = (t: string): Block[] => {
        if (!isChanged) return []
        if (edit.name === 'struct-field-added') {
          const block = structBlock(t, base.structs.at(0)?.name ?? '')
          return block === undefined ? [] : [block]
        }
        const m = mainBlock(t)
        return m === undefined ? [] : [m]
      }
      const before = cut(text, allowedIn(text))
      const after = cut(out, allowedIn(out))
      if (before === after) continue
      const names = addedNames(edited, base)
      const inserted = insertion(before, after)
      const isScaffold =
        (edit.name === 'param-added' || edit.name === 'command-added') &&
        inserted !== null &&
        names.some((n) => inserted.includes(n))
      if (!isScaffold) problems.push(`${edit.name}: bytes outside the allowed blocks changed`)
    }
    return problems
  },

  encoding: (file) => {
    const { text, runs } = load(file)
    const isCrlf = text.includes('\r\n')
    const isBom = text.startsWith('\u{FEFF}')
    const problems: string[] = []
    for (const { edit, out } of runs) {
      if (out === null) continue
      if (isCrlf && hasBareLf(out)) problems.push(`${edit.name}: bare LF in a CRLF file`)
      if (!isCrlf && out.includes('\r')) problems.push(`${edit.name}: CR in an LF file`)
      if (isBom && !out.startsWith('\u{FEFF}')) problems.push(`${edit.name}: BOM lost`)
    }
    return problems
  },

  idempotent: (file) => {
    const problems: string[] = []
    for (const { edit, out } of load(file).runs) {
      if (out === null) continue
      const reopened = open(out, file)
      if (attempt(reopened, reopened) !== out) problems.push(`${edit.name}: second save differs`)
    }
    return problems
  },

  'scaffold-once': (file) => {
    const { text, base, runs } = load(file)
    const problems: string[] = []
    const present = [...base.parameters.map((p) => p.name), ...base.commands.map((c) => c.name)]
    for (const run of runs) {
      const { edit, out } = run
      if (out === null) continue
      for (const name of present) {
        if (count(codeOf(out), name) !== count(codeOf(text), name)) {
          problems.push(`${edit.name}: code mentions ${name} a different number of times`)
        }
      }
      problems.push(...scaffoldProblems(run, base, file, out))
    }
    return problems
  },

  'no-structural-fallback': (file) => {
    const { text, base } = load(file)
    if (headers(text).some((b) => b.lang === '')) return []
    return attempt(base, base) === text ? [] : ['unedited output differs from F']
  },

  'lf-twin': (file) => {
    if (file !== CRLF_TWIN) return []
    const crlf = open(read(CRLF_TWIN), LF_TWIN)
    Object.assign(crlf, {
      codeBody: crlf.codeBody?.replaceAll('\r\n', '\n'),
      customCode: crlf.customCode?.replaceAll('\r\n', '\n')
    })
    return strip(crlf) === strip(open(read(LF_TWIN), LF_TWIN)) ? [] : ['parse differs from LF twin']
  },

  'main-block-by-rule': (file) => {
    const block = mainBlockOf(file)
    if (block === undefined) return []
    const { base, lf } = block
    const problems: string[] = []
    const description = /@plugindesc (.*)/.exec(lf)?.[1] ?? ''
    if (base.meta.description !== description) problems.push('description not from main block')
    const names = lf
      .matchAll(/@param (\S+)/g)
      .map((m) => m.at(1))
      .toArray()
    if (JSON.stringify(base.parameters.map((p) => p.name)) !== JSON.stringify(names)) {
      problems.push('parameter names not from main block')
    }
    // Names alone match in every language block; labels tell which block was read.
    for (const m of lf.matchAll(/@param (\S+)(\s[\s\S]*?)?(?=@param\s|@command\s|\*\/)/g)) {
      const name = m.at(1) ?? ''
      const label = /@text (.*)/.exec(m.at(2) ?? '')?.[1]
      const param = base.parameters.find((p) => p.name === name)
      if (label !== undefined && param !== undefined && param.text !== label) {
        problems.push(`parameter ${name} text not from main block`)
      }
    }
    return problems
  },

  'command-text': (file) => {
    const block = mainBlockOf(file)
    if (block === undefined) return []
    const { base, lf } = block
    const problems: string[] = []
    for (const m of lf.matchAll(/@command (\S+)(\s[\s\S]*?)?(?=@command\s|@param\s|\*\/)/g)) {
      const name = m.at(1) ?? ''
      const head = (m.at(2) ?? '').split(/@arg\s/, 1).at(0) ?? ''
      const expectedText = /@text (.*)/.exec(head)?.[1] ?? name
      const expectedDesc = /@desc (.*)/.exec(head)?.[1]
      const command = base.commands.find((c) => c.name === name)
      if (command === undefined) problems.push(`command ${name} not read`)
      else if (command.text !== expectedText) problems.push(`command ${name} text`)
      else if (expectedDesc !== undefined && command.desc !== expectedDesc) {
        problems.push(`command ${name} desc`)
      }
    }
    return problems
  },

  'code-body': (file) => {
    const { text, base } = load(file)
    return (base.codeBody ?? '').trim() ===
      codeOf(text)
        .replace(/^\u{FEFF}/u, '')
        .trim()
      ? []
      : ['codeBody is not the text outside the blocks']
  }
}

const FAILS_TODAY = 'fails today'

// A listed pair passes while it fails; an unlisted pair passes with no problems
const outcome = (problems: string[], isListed: boolean): string[] | string =>
  isListed && problems.length > 0 ? FAILS_TODAY : problems

const CASES = FIXTURES.flatMap((file) =>
  NAMES.map((property): [string, string, PropertyName, boolean] => {
    const isListed = KNOWN_FAILING[file]?.includes(property) ?? false
    return [`${property}: ${file}${isListed ? ' (fails today)' : ''}`, file, property, isListed]
  })
)

describe('round trip of imported plugins', () => {
  it.each(CASES)('%s', (_title, file, property, isListed) => {
    expect(outcome(PROPERTIES[property](file), isListed)).toStrictEqual(isListed ? FAILS_TODAY : [])
  })

  it('covers every fixture and lists only real pairs', () => {
    const characterized = Object.values(KNOWN_FAILING).flat().length
    const compiling = FIXTURES.filter((f) => load(f).compiles).length
    process.stdout.write(
      `round-trip: fixtures ${String(FIXTURES.length)}, edits ${String(EDITS.length)}, ` +
        `cases ${String(FIXTURES.length * NAMES.length)}; characterized ${String(characterized)}\n` +
        `round-trip: unedited over ${String(compiling)} compiling fixtures\n`
    )

    expect(FIXTURES.length).toBeGreaterThan(0)
    expect(Object.keys(KNOWN_FAILING).filter((f) => !FIXTURES.includes(f))).toStrictEqual([])
  })
})
