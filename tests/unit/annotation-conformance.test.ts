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
  annotationBlocks,
  checkAnnotations,
  scopeFor
} from '../helpers/annotation-rules'
import type { AnnotationRule } from '../helpers/annotation-rules'
import { conformanceCases, refusedCommandNames } from '../helpers/mz-conformance'

/** Case and rule pairs that fail today; each must fail, and every other pair must hold. */
const KNOWN_NONCONFORMING: Record<string, AnnotationRule[]> = {}

const fixtureGenerated = GENERATOR_ENTRIES.find((e) => e.name === 'fixture-generated')!.def
const fixtureCode = generatePlugin(fixtureGenerated)

const rulesOf = (code: string): AnnotationRule[] => [
  ...new Set(
    checkAnnotations(code, { rules: ANNOTATION_RULES, definition: fixtureGenerated }).map(
      (f) => f.rule
    )
  )
]

/** `code` with `from` replaced once, failing when `from` is not there. */
function changed(code: string, from: string, to: string): string {
  expect(code).toContain(from)

  return code.replace(from, to)
}

const STRUCT_BLOCK = /\/\*~struct~Point:[\s\S]*?\*\//

const BROKEN: Record<AnnotationRule, () => string> = {
  'block-line': () => changed(fixtureCode, ' * @desc Frames between', '   @desc Frames between'),
  'empty-tag': () => changed(fixtureCode, ' * @desc Frames between two updates.', ' * @desc'),
  'type-known': () => changed(fixtureCode, ' * @type number', ' * @type numbr'),
  'struct-block': () => {
    const block = STRUCT_BLOCK.exec(fixtureCode)

    expect(block).not.toBeNull()

    return `${fixtureCode}\n${block![0]}\n`
  },
  parent: () => changed(fixtureCode, ' * @type string\n', ' * @type string\n * @parent Nope\n'),
  'default-parses': () => changed(fixtureCode, ' * @default 5', ' * @default abc'),
  'help-round-trip': () =>
    changed(
      fixtureCode,
      ' * Generated from a fixed definition.\n',
      ' * Generated from a fixed definition.\n * @param injected\n'
    )
}

describe('annotation rules', () => {
  it('report nothing on the unchanged plugin', () => {
    expect(
      checkAnnotations(fixtureCode, { rules: ANNOTATION_RULES, definition: fixtureGenerated })
    ).toEqual([])
  })

  for (const rule of ANNOTATION_RULES) {
    it(`report ${rule} on a plugin broken for it, and nothing else`, () => {
      expect(rulesOf(BROKEN[rule]())).toEqual([rule])
    })
  }
})

const cases = conformanceCases()

describe('every generated and raw-mode plugin header', () => {
  for (const c of cases) {
    const listed = KNOWN_NONCONFORMING[c.id] ?? []

    it(`${c.id}${listed.length > 0 ? ' (fails today)' : ''}`, () => {
      const findings = checkAnnotations(c.code, scopeFor(c))
      for (const rule of ANNOTATION_RULES) {
        const details = findings
          .filter((f) => f.rule === rule)
          .map((f) => `${f.block}:${f.line} ${f.detail}`)
        if (listed.includes(rule)) expect(details, `${rule} expected to fail`).not.toEqual([])
        else expect(details, rule).toEqual([])
      }
    })
  }

  it('reads every case and lists only cases that exist', () => {
    const generated = cases.filter((c) => c.kind === 'generated').length
    const blocks = cases.flatMap((c) => annotationBlocks(c.code))
    const lines = blocks.reduce((sum, b) => sum + b.lines.length, 0)
    const known = Object.values(KNOWN_NONCONFORMING).flat().length
    console.log(
      `annotation rules: plugins ${cases.length} (generated ${generated}, ` +
        `raw-mode ${cases.length - generated}), blocks ${blocks.length}, lines ${lines}, ` +
        `rules ${ANNOTATION_RULES.length}, known ${known}`
    )
    // Each rule that leaves something out says how much: hostile entries carry their payload in
    // types, parents and defaults, and raw mode keeps what the imported file declared, so both
    // are held to the rules about the comment text only; command names the app refuses are not
    // compared when the header is read back
    const full = cases.filter((c) => scopeFor(c).rules.length === ANNOTATION_RULES.length)
    const refused = full.reduce((sum, c) => sum + refusedCommandNames(c.definition).size, 0)
    console.log(
      `annotation rules exempt: comment text only for hostile ` +
        `${cases.filter((c) => c.hostile === true).length} and raw-mode ` +
        `${cases.filter((c) => c.kind === 'raw-mode').length}, refused command names ${refused}`
    )

    expect(cases.length).toBeGreaterThan(0)
    expect(blocks.length).toBeGreaterThan(0)

    const ids = new Set(cases.map((c) => c.id))

    expect(Object.keys(KNOWN_NONCONFORMING).filter((id) => !ids.has(id))).toEqual([])
  })
})

describe('a help line starting with "@"', () => {
  it('read back and written again keeps exactly one zero-width space', () => {
    const def = GENERATOR_ENTRIES.find((e) => e.name === 'help-tag-line')!.def
    const code = generatePlugin(def)
    const help = PluginParser.parsePlugin(code, `${def.meta.name}.js`).meta.help
    const again = generatePlugin({ ...def, meta: { ...def.meta, help } })
    const zwsp = String.fromCodePoint(0x20_0b)

    expect(code).toContain(` * ${zwsp}@param injected\n`)
    expect(code).not.toContain(zwsp + zwsp)
    expect(again).toBe(code)
  })
})
