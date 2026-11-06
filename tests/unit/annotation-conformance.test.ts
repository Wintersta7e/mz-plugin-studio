// Every annotation header the generator writes, and every one raw mode writes back, read as
// RPG Maker MZ's plugin manager reads it: whole comment lines, no empty tags, known types, one
// definition per struct, parents that exist, defaults that read as their type, and a header that
// parses back to the definition's names and help. Each rule is first shown to catch a plugin
// broken on purpose.
import { describe, expect, it } from 'vitest'
import { PluginParser } from '../../src/main/services/pluginParser'
import { generatePlugin } from '../../src/renderer/src/lib/generator/index'
import { GENERATOR_ENTRIES } from '../golden/corpus/generator'
import {
  ANNOTATION_RULES,
  type AnnotationRule,
  annotationBlocks,
  checkAnnotations,
  scopeFor
} from '../helpers/annotation-rules'
import {
  type ConformanceCase,
  conformanceCases,
  refusedCommandNames
} from '../helpers/mz-conformance'

/**
Case and rule pairs that fail today; each must fail, and every other pair must hold.
*/
const KNOWN_NONCONFORMING: Record<string, AnnotationRule[]> = {}

function generatorEntry(name: string): (typeof GENERATOR_ENTRIES)[number]['def'] {
  const found = GENERATOR_ENTRIES.find((entry) => entry.name === name)
  if (found === undefined) throw new Error(`no generator entry ${name}`)

  return found.def
}

const fixtureGenerated = generatorEntry('fixture-generated')
const fixtureCode = generatePlugin(fixtureGenerated)

const rulesOf = (code: string): AnnotationRule[] => [
  ...new Set(
    checkAnnotations(code, { rules: ANNOTATION_RULES, definition: fixtureGenerated }).map(
      (f) => f.rule
    )
  )
]

/**
The fixture plugin with `from` replaced once, failing when `from` is not there.
*/
function changed(from: string, to: string): string {
  expect(fixtureCode).toContain(from)

  return fixtureCode.replace(from, () => to)
}

const STRUCT_BLOCK = /\/\*~struct~Point:[\s\S]*?\*\//

const BROKEN: Record<AnnotationRule, () => string> = {
  'block-line': () => changed(' * @desc Frames between', '   @desc Frames between'),
  'empty-tag': () => changed(' * @desc Frames between two updates.', ' * @desc'),
  'type-known': () => changed(' * @type number', ' * @type numbr'),
  'struct-block': () => {
    const block = STRUCT_BLOCK.exec(fixtureCode)

    expect(block).not.toBeNull()

    return `${fixtureCode}\n${block?.[0] ?? ''}\n`
  },
  parent: () => changed(' * @type string\n', ' * @type string\n * @parent Nope\n'),
  'default-parses': () => changed(' * @default 5', ' * @default abc'),
  'help-round-trip': () =>
    changed(
      ' * Generated from a fixed definition.\n',
      ' * Generated from a fixed definition.\n * @param injected\n'
    )
}

describe('annotation rules', () => {
  it('report nothing on the unchanged plugin', () => {
    expect(
      checkAnnotations(fixtureCode, { rules: ANNOTATION_RULES, definition: fixtureGenerated })
    ).toStrictEqual([])
  })

  it.each(ANNOTATION_RULES)('report %s on a plugin broken for it, and nothing else', (rule) => {
    expect(rulesOf(BROKEN[rule]())).toStrictEqual([rule])
  })
})

const cases = conformanceCases()

describe('every generated and raw-mode plugin header', () => {
  const rows = cases.map((c): [string, ConformanceCase, AnnotationRule[]] => {
    const listed = KNOWN_NONCONFORMING[c.id] ?? []

    return [`${c.id}${listed.length > 0 ? ' (fails today)' : ''}`, c, listed]
  })

  it.each(rows)('%s', (_title, c, listed) => {
    const findings = checkAnnotations(c.code, scopeFor(c))
    const detailsOf = (rule: AnnotationRule): string[] =>
      findings.filter((f) => f.rule === rule).map((f) => `${f.block}:${String(f.line)} ${f.detail}`)
    const unlisted = ANNOTATION_RULES.filter((rule) => !listed.includes(rule))

    // a listed rule that holds is reported by name, as is every finding of an unlisted rule
    expect(listed.filter((rule) => detailsOf(rule).length === 0)).toStrictEqual([])
    expect(Object.fromEntries(unlisted.map((rule) => [rule, detailsOf(rule)]))).toStrictEqual(
      Object.fromEntries(unlisted.map((rule) => [rule, []]))
    )
  })

  it('reads every case and lists only cases that exist', () => {
    const generated = cases.filter((c) => c.kind === 'generated').length
    const blocks = cases.flatMap((c) => annotationBlocks(c.code))
    const lines = blocks.reduce((sum, b) => sum + b.lines.length, 0)
    const known = Object.values(KNOWN_NONCONFORMING).flat().length
    process.stdout.write(
      `annotation rules: plugins ${String(cases.length)} (generated ${String(generated)}, ` +
        `raw-mode ${String(cases.length - generated)}), blocks ${String(blocks.length)}, ` +
        `lines ${String(lines)}, rules ${String(ANNOTATION_RULES.length)}, known ${String(known)}\n`
    )
    // Each rule that leaves something out says how much: hostile entries carry their payload in
    // types, parents and defaults, and raw mode keeps what the imported file declared, so both
    // are held to the rules about the comment text only; command names the app refuses are not
    // compared when the header is read back
    const full = cases.filter((c) => scopeFor(c).rules.length === ANNOTATION_RULES.length)
    const refused = full.reduce((sum, c) => sum + refusedCommandNames(c.definition).size, 0)
    process.stdout.write(
      `annotation rules exempt: comment text only for hostile ` +
        `${String(cases.filter((c) => c.hostile === true).length)} and raw-mode ` +
        `${String(cases.filter((c) => c.kind === 'raw-mode').length)}, ` +
        `refused command names ${String(refused)}\n`
    )

    expect(cases.length).toBeGreaterThan(0)
    expect(blocks.length).toBeGreaterThan(0)

    const ids = new Set(cases.map((c) => c.id))

    expect(Object.keys(KNOWN_NONCONFORMING).filter((id) => !ids.has(id))).toStrictEqual([])
  })
})

describe('a help line starting with "@"', () => {
  it('read back and written again keeps exactly one zero-width space', () => {
    const definition = generatorEntry('help-tag-line')
    const code = generatePlugin(definition)
    const help = PluginParser.parsePlugin(code, `${definition.meta.name}.js`).meta.help
    const again = generatePlugin({ ...definition, meta: { ...definition.meta, help } })
    const zwsp = String.fromCodePoint(0x20_0b)

    expect(code).toContain(` * ${zwsp}@param injected\n`)
    expect(code).not.toContain(zwsp + zwsp)
    expect(again).toBe(code)
  })
})
