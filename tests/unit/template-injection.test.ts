// Text typed into a template's free-text fields, followed to where it lands in the generated
// code: which comment, string or code position holds it, and what hostile text there does when
// the code runs in a sealed context.
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { describe, it, expect } from 'vitest'
import {
  getTemplate,
  validateTemplateValues
} from '../../src/renderer/src/lib/generator/templates/index'
import { ENABLING_VALUES, baseValues, templateIds } from '../golden/corpus/templates'
import { evaluatePlugin } from '../helpers/evaluate-plugin'
import { ALL_PAYLOADS, SENTINEL } from '../helpers/hostile'
import { contextsOf, isContained } from '../helpers/js-context'
import type { JsContext } from '../helpers/js-context'

const INSERTER = 'src/renderer/src/components/plugin/TemplateInserter.tsx'
const MARKER = 'QQ7QQ'
const INJECTED = `globalThis.${SENTINEL}`

const CONTEXTS: JsContext[] = [
  'line-comment',
  'block-comment',
  'single-quote',
  'double-quote',
  'template-literal',
  'regex',
  'code'
]

/** Each field renderer's type, and those that store the typed text as it is. */
function fieldRenderers(): { types: string[]; free: string[] } {
  const blocks = readFileSync(resolve(INSERTER), 'utf8')
    .split(/\n\s*case '/)
    .slice(1)
  const types = blocks.map((block) => block.slice(0, block.indexOf("'")))
  const free = types.filter((_, i) =>
    blocks[i].includes('handleFieldChange(field.id, e.target.value)')
  )
  return { types, free }
}

// Fields whose text is rewritten before it is written out (`sanitizeWindowName`,
// `sanitizeSpriteName`, an upper-cased escape character): needles are rewritten the same way.
const identifierOnly = (text: string): string =>
  text
    .trim()
    .replace(/[^a-zA-Z0-9]/g, '')
    .replace(/^[a-z]/, (c) => c.toUpperCase())
const upperCase = (text: string): string => text.toUpperCase()
const TRANSFORMED: Record<string, (text: string) => string> = {
  'custom-window-basic.windowName': identifierOnly,
  'gauge-window.windowName': identifierOnly,
  'hud-overlay-window.windowName': identifierOnly,
  'popup-notification-window.windowName': identifierOnly,
  'sprite-custom-class.spriteName': identifierOnly,
  'sprite-frame-animation.spriteName': identifierOnly,
  'message-custom-text-code.escapeChar': upperCase
}

/** `needle` as it reads inside rewritten field text; every payload starts with `X`. */
function needleFor(key: string, needle: string): string {
  const transform = TRANSFORMED[key]
  return transform === undefined ? needle : transform(`X${needle}`).slice(1)
}

interface ValueSet {
  label: string
  values: Record<string, unknown>
  /** The code generated with the marker in the field. */
  code: string
}

interface FieldCase {
  id: string
  field: string
  key: string
  /** Base values, and base plus the field's enabling values, each kept when the field is emitted. */
  valueSets: ValueSet[]
}

function fieldCases(free: string[]): FieldCase[] {
  const cases: FieldCase[] = []
  for (const id of templateIds()) {
    for (const field of getTemplate(id)!.fields.filter((f) => free.includes(f.type))) {
      const key = `${id}.${field.id}`
      const enabling = ENABLING_VALUES[id]?.[field.id]
      const candidates = [{ label: '', values: baseValues(id) }]
      if (enabling !== undefined) {
        const label = Object.entries(enabling)
          .map(([k, v]) => `${k}=${String(v)}`)
          .join(',')
        candidates.push({ label: ` with ${label}`, values: { ...baseValues(id), ...enabling } })
      }
      const valueSets = candidates
        .map((set) => ({
          ...set,
          code: getTemplate(id)!.generate({ ...set.values, [field.id]: MARKER })
        }))
        .filter((set) => set.code.includes(needleFor(key, MARKER)))
      cases.push({ id, field: field.id, key, valueSets })
    }
  }
  return cases
}

type Outcome = 'rejected' | 'contained' | 'throws' | 'ran' | 'escaped'

function outcomeOf(id: string, key: string, values: Record<string, unknown>): Outcome {
  if (!validateTemplateValues(id, values).valid) return 'rejected'
  const code = getTemplate(id)!.generate(values)
  const result = evaluatePlugin(code, { mode: 'template' })
  if (result.compileProblem !== null) return 'throws'
  if (result.sentinel) return 'ran'
  if (result.threw !== null) return 'throws'
  const needle = needleFor(key, INJECTED)
  return code.includes(needle) && isContained(code, needle) ? 'contained' : 'escaped'
}

const LINE_BREAKS = ['comment-u2028', 'comment-u2029', 'comment-lf']
const QUOTES = ['quote-single', 'quote-double', 'quote-backtick']
const EVERY = ALL_PAYLOADS.map((p) => p.name)

// Cases neither rejected by the template's own checks nor contained, today.
const TODAY: { field: string; payloads: string[]; outcome: Outcome }[] = [
  // A line break ends the `//` comment the text is written into.
  { field: 'audio-se-player.filename', payloads: LINE_BREAKS, outcome: 'throws' },
  { field: 'menu-command-addition.commandName', payloads: LINE_BREAKS, outcome: 'throws' },
  { field: 'menu-options-addition.optionName', payloads: LINE_BREAKS, outcome: 'throws' },
  {
    field: 'menu-options-addition.choices with optionType=select',
    payloads: LINE_BREAKS,
    outcome: 'throws'
  },
  { field: 'menu-title-mod.commandName', payloads: LINE_BREAKS, outcome: 'throws' },
  // A JavaScript expression by design.
  {
    field: 'message-custom-text-code.replacementText',
    payloads: [...LINE_BREAKS, ...QUOTES],
    outcome: 'throws'
  },
  // Written in code position.
  {
    field: 'menu-options-addition.defaultValue with optionType=volume',
    payloads: EVERY,
    outcome: 'throws'
  },
  {
    field: 'sprite-frame-animation.targetClass with animationType=mixin',
    payloads: EVERY,
    outcome: 'throws'
  }
]

const { types, free } = fieldRenderers()
const cases = fieldCases(free)

describe('template field text', () => {
  it('names the field types whose text reaches the generated code', () => {
    console.log(
      `free-text field types: ${free.join(', ')}; fields ${cases.length} over ` +
        `${templateIds().length} templates (renderers scanned: ${types.join(', ')})`
    )
    expect(types.length).toBeGreaterThan(0)
    expect(cases.length).toBeGreaterThan(0)
  })

  it('names the context each free-text field lands in', () => {
    const counts = Object.fromEntries(CONTEXTS.map((c) => [c, 0])) as Record<JsContext, number>
    const notEmitted: string[] = []
    for (const c of cases) {
      const found = new Set<JsContext>()
      for (const { code } of c.valueSets) {
        for (const context of contextsOf(code, needleFor(c.key, MARKER))) found.add(context)
      }
      for (const context of found) counts[context]++
      if (found.size === 0) notEmitted.push(c.key)
    }
    console.log(
      `template contexts: ${CONTEXTS.map((c) => `${c} ${counts[c]}`).join(', ')}; ` +
        `not emitted ${notEmitted.length}${notEmitted.length > 0 ? ` (${notEmitted.join(', ')})` : ''}`
    )
    expect(Object.values(counts).reduce((a, b) => a + b, 0)).toBeGreaterThan(0)
    expect(notEmitted).toEqual([])
  })

  it('template field text can leave its comment or position (today)', () => {
    const tally: Record<Outcome, number> = {
      rejected: 0,
      contained: 0,
      throws: 0,
      ran: 0,
      escaped: 0
    }
    const table: Record<string, Outcome> = {}
    const rewritten: Record<string, Outcome[]> = {}
    for (const c of cases) {
      for (const { label, values } of c.valueSets) {
        for (const payload of ALL_PAYLOADS) {
          const outcome = outcomeOf(c.id, c.key, { ...values, [c.field]: payload.text })
          tally[outcome]++
          if (outcome !== 'rejected' && outcome !== 'contained') {
            table[`${c.key}${label}: ${payload.name}`] = outcome
          }
          if (c.key in TRANSFORMED) (rewritten[c.key] ??= []).push(outcome)
        }
      }
    }
    const total = Object.values(tally).reduce((a, b) => a + b, 0)
    console.log(
      `template payload cases: ${total}; rejected ${tally.rejected}, contained ${tally.contained}, ` +
        `throws ${tally.throws}, ran ${tally.ran}, escaped ${tally.escaped}`
    )
    expect(total).toBeGreaterThan(0)
    expect(table).toEqual(
      Object.fromEntries(
        TODAY.flatMap(({ field, payloads, outcome }) =>
          payloads.map((payload) => [`${field}: ${payload}`, outcome])
        )
      )
    )
    // Each rewritten field is rejected by its own check for every payload.
    expect(rewritten).toEqual(
      Object.fromEntries(Object.keys(TRANSFORMED).map((key) => [key, EVERY.map(() => 'rejected')]))
    )
  })
})
