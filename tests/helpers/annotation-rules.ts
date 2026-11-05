// Reads the annotation blocks of a plugin file as plain text and reports every line RPG Maker
// MZ's plugin manager would read differently from what the generator meant: a line that is not
// part of the comment, an empty tag, an unknown type, a struct with no single definition, a
// parent that names nothing, a default that does not read as its type, and a header that parses
// back to other names or a shorter help than the definition it was written from.
import { PluginParser } from '../../src/main/services/pluginParser'
import { annotationText } from '../../src/renderer/src/lib/generator/escape'
import { ALL_PARAM_TYPES, ID_BASED_PARAM_TYPES } from '../../src/shared/types/plugin'
import type { ParamType, PluginDefinition } from '../../src/shared/types/plugin'
import { refusedCommandNames } from './mz-conformance'
import type { ConformanceCase } from './mz-conformance'

export type AnnotationRule =
  | 'block-line'
  | 'empty-tag'
  | 'type-known'
  | 'struct-block'
  | 'parent'
  | 'default-parses'
  | 'help-round-trip'

export const ANNOTATION_RULES: readonly AnnotationRule[] = [
  'block-line',
  'empty-tag',
  'type-known',
  'struct-block',
  'parent',
  'default-parses',
  'help-round-trip'
]

/** Rules about the comment itself, which hold whatever text a field carries. */
export const TEXT_RULES: readonly AnnotationRule[] = ['block-line', 'empty-tag', 'struct-block']

export interface AnnotationFinding {
  rule: AnnotationRule
  /** The block's opener as written: `/*:`, `/*:ja`, `/*~struct~Name:` */
  block: string
  /** Line number in the file, from 1 */
  line: number
  detail: string
}

export interface RuleScope {
  rules: readonly AnnotationRule[]
  /** The definition the code was generated from; `help-round-trip` compares against it. */
  definition?: PluginDefinition
}

/**
The rules each case is held to. A hostile entry's types, parents and defaults carry the
payload by design, and raw mode writes back whatever the imported file declared, so both are
held to the text rules only.
*/
export function scopeFor(c: ConformanceCase): RuleScope {
  return c.kind === 'raw-mode' || c.hostile === true
    ? { rules: TEXT_RULES }
    : { rules: ANNOTATION_RULES, definition: c.definition }
}

export interface AnnotationBlockText {
  opener: string
  /** Bare struct name for `/*~struct~Name:` blocks, with the language suffix kept apart */
  structName: string | null
  lang: string
  /** Line number of the opener, from 1 */
  line: number
  /** Every line after the opener's, the closing line included */
  lines: string[]
}

const OPENER = /\/\*(?::([A-Za-z_]*)|~struct~(\w+):([A-Za-z_]*))/g
const LINE_BREAK = /\r\n|\r|\n/

/** Every annotation block, each from its opener to the first `*\/` after it. */
export function annotationBlocks(code: string): AnnotationBlockText[] {
  const blocks: AnnotationBlockText[] = []
  const opener = new RegExp(OPENER)
  let match: RegExpExecArray | null
  while ((match = opener.exec(code)) !== null) {
    const close = code.indexOf('*/', match.index + match[0].length)
    if (close === -1) break
    const isStruct = match[2] !== undefined
    blocks.push({
      opener: match[0],
      structName: isStruct ? match[2] : null,
      lang: (isStruct ? match[3] : match[1]) ?? '',
      line: code.slice(0, match.index).split(LINE_BREAK).length,
      lines: code
        .slice(match.index + match[0].length, close + 2)
        .split(LINE_BREAK)
        .slice(1)
    })
    opener.lastIndex = close + 2
  }
  return blocks
}

const TAG_LINE = /^\s*\*\s*@(\w+)(.*)$/

interface Item {
  tag: 'param' | 'arg'
  name: string
  line: number
  type?: string
  default?: string
  parent?: { name: string; line: number }
  options: { label: string; value?: string }[]
}

// Types seen in shipped plugins: string, multiline_string, number, boolean, select, file,
// variable, switch, actor, class, skill, item, enemy, state, common_event, map, text, color,
// struct<Name>, and arrays of them. Types named only in the editor's documentation: combo,
// note, hidden, icon, location, weapon, armor, troop, animation, tileset.
const KNOWN_TYPES: ReadonlySet<string> = new Set([...ALL_PARAM_TYPES, 'multiline_string'])
const STRUCT_TYPE = /^struct<(\w+)>$/

const baseType = (type: string): string => (type.endsWith('[]') ? type.slice(0, -2) : type)

function typeKnown(type: string): boolean {
  const base = baseType(type)
  return KNOWN_TYPES.has(base) || STRUCT_TYPE.test(base)
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text) as unknown
  } catch {
    return undefined
  }
}

/** Why `text` does not read as a value of `type`, or null when it does. */
function defaultProblem(item: Item, type: string, text: string): string | null {
  if (type.endsWith('[]')) {
    const value = parseJson(text)
    const isOk = Array.isArray(value) && value.every((e) => typeof e === 'string')
    return isOk ? null : 'is not a JSON array of strings'
  }
  if (STRUCT_TYPE.test(type)) {
    const value = parseJson(text)
    const isOk =
      typeof value === 'object' &&
      value !== null &&
      !Array.isArray(value) &&
      Object.values(value).every((v) => typeof v === 'string')
    return isOk ? null : 'is not a JSON object of strings'
  }
  if (type === 'number' || ID_BASED_PARAM_TYPES.has(type as ParamType)) {
    return Number.isFinite(Number(text)) ? null : 'is not a finite number'
  }
  if (type === 'boolean') return text === 'true' || text === 'false' ? null : 'is not true or false'
  if (type === 'select') {
    const values = item.options.map((o) => o.value ?? o.label)
    return values.includes(text) ? null : `is none of the option values ${JSON.stringify(values)}`
  }
  return null
}

/** The `@param` and `@arg` entries of one block, with the tags that follow each. */
function itemsOf(block: AnnotationBlockText): Item[] {
  const items: Item[] = []
  let current: Item | null = null
  block.lines.forEach((text, i) => {
    const m = TAG_LINE.exec(text)
    if (m === null) return
    const [, tag, rest] = m
    const value = rest.trim()
    const line = block.line + 1 + i
    if (tag === 'param' || tag === 'arg') {
      current = { tag, name: value, line, options: [] }
      items.push(current)
    } else if (tag === 'command') {
      current = null
    } else if (current !== null) {
      const item: Item = current
      if (tag === 'type') item.type = value
      else if (tag === 'default') item.default = value
      else if (tag === 'parent') item.parent = { name: value, line }
      else if (tag === 'option') item.options.push({ label: value })
      else if (tag === 'value') {
        const last = item.options.at(-1)
        if (last !== undefined && last.value === undefined) last.value = value
        else item.options.push({ label: value, value })
      }
    }
  })
  return items
}

const helpLines = (help: string): number => (help === '' ? 0 : help.split('\n').length)

function helpRoundTrip(code: string, def: PluginDefinition): string[] {
  const parsed = PluginParser.parsePlugin(code)
  const problems: string[] = []
  const names = (list: { name: string }[]): string => JSON.stringify(list.map((p) => p.name))
  // A defined name reads back as the generator writes it on its one header line
  const written = (list: { name: string }[]): string =>
    JSON.stringify(list.map((p) => annotationText(p.name)))
  if (names(parsed.parameters) !== written(def.parameters)) {
    problems.push(`parameters ${names(def.parameters)} read back as ${names(parsed.parameters)}`)
  }
  // A command name the app refuses as not an identifier is read back in a way MZ's own reading
  // is not known to share, so only the accepted names are compared
  const refused = refusedCommandNames(def)
  const accepted = def.commands.filter((cmd) => !refused.has(cmd.name))
  const acceptedNames = new Set(accepted.map((cmd) => cmd.name))
  const readBack = parsed.commands.filter(
    (cmd) => refused.size === 0 || acceptedNames.has(cmd.name)
  )
  if (names(readBack) !== written(accepted)) {
    problems.push(`commands ${names(accepted)} read back as ${names(readBack)}`)
  }
  const want = helpLines(def.meta.help)
  const got = helpLines(parsed.meta.help)
  if (got !== want) problems.push(`help of ${want} lines reads back as ${got}`)
  return problems
}

export function checkAnnotations(code: string, scope: RuleScope): AnnotationFinding[] {
  const on = new Set(scope.rules)
  const findings: AnnotationFinding[] = []
  const blocks = annotationBlocks(code)
  const report = (
    rule: AnnotationRule,
    block: AnnotationBlockText,
    line: number,
    detail: string
  ): void => {
    if (on.has(rule)) findings.push({ rule, block: block.opener, line, detail })
  }
  const structsNamed = new Map<string, { block: AnnotationBlockText; line: number }>()

  for (const block of blocks) {
    block.lines.forEach((text, i) => {
      const line = block.line + 1 + i
      if (!/^\s*\*/.test(text)) report('block-line', block, line, JSON.stringify(text))
      const m = TAG_LINE.exec(text)
      if (m !== null && m[1] !== 'help' && m[2].trim() === '') {
        report('empty-tag', block, line, `@${m[1]}`)
      }
    })
    const items = itemsOf(block)
    const params = new Set(items.filter((it) => it.tag === 'param').map((it) => it.name))
    for (const item of items) {
      const where = `@${item.tag} ${item.name}`
      if (item.parent !== undefined && !params.has(item.parent.name)) {
        report('parent', block, item.parent.line, `${where}: @parent ${item.parent.name}`)
      }
      if (item.type === undefined) continue
      if (!typeKnown(item.type)) report('type-known', block, item.line, `${where}: ${item.type}`)
      const struct = STRUCT_TYPE.exec(baseType(item.type))
      if (struct !== null && !structsNamed.has(struct[1])) {
        structsNamed.set(struct[1], { block, line: item.line })
      }
      if (item.default !== undefined) {
        const problem = defaultProblem(item, item.type, item.default)
        if (problem !== null) {
          report('default-parses', block, item.line, `${where}: ${item.default} ${problem}`)
        }
      }
    }
  }

  for (const [name, at] of structsNamed) {
    const defined = blocks.filter((b) => b.structName === name && b.lang === '').length
    if (defined !== 1) {
      report('struct-block', at.block, at.line, `struct<${name}> defined ${defined} times`)
    }
  }

  if (on.has('help-round-trip')) {
    if (scope.definition === undefined) throw new Error('help-round-trip needs the definition')
    const main = blocks.find((b) => b.opener === '/*:')
    for (const detail of helpRoundTrip(code, scope.definition)) {
      findings.push({ rule: 'help-round-trip', block: '/*:', line: main?.line ?? 0, detail })
    }
  }
  return findings
}
