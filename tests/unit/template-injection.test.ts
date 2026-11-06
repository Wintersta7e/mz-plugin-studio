// Text typed into a template's free-text fields, followed to where it lands in the generated
// code: which comment, string or code position holds it, and what hostile text there does when
// the code runs in a sealed context.
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { afterAll, describe, it, expect } from 'vitest'
import {
  getTemplate,
  getTemplateDefaults,
  validateTemplateValues
} from '../../src/renderer/src/lib/generator/templates/index'
import { ENABLING_VALUES, baseValues, templateCases, templateIds } from '../golden/corpus/templates'
import { evaluatePlugin } from '../helpers/evaluate-plugin'
import { ALL_PAYLOADS, PREFIX_PAYLOADS, SENTINEL, type Payload } from '../helpers/hostile'
import { contextsOf, isContained, type JsContext } from '../helpers/js-context'

const FIELDS = 'src/renderer/src/components/plugin/TemplateFields.tsx'
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

type Template = NonNullable<ReturnType<typeof getTemplate>>

/**
The template of an id the corpus lists; throws for an unknown id.
*/
function templateOf(id: string): Template {
  const template = getTemplate(id)
  if (template === undefined) throw new Error(`no template ${id}`)
  return template
}

/**
The source of the function `name`, up to the next top-level function
*/
function functionSource(source: string, name: string): string {
  const start = source.indexOf(`function ${name}(`)
  const end = source.indexOf('\nfunction ', start + 1)
  return source.slice(start, end === -1 ? source.length : end)
}

/**
Each field control's type, and those that store the typed text as it is.
*/
function fieldRenderers(): { types: string[]; free: string[] } {
  const source = readFileSync(path.resolve(FIELDS), 'utf8')
  const table = source.slice(source.indexOf('const FIELD_CONTROLS = {'))
  const rows = Array.from(
    table.slice(0, table.indexOf('}')).matchAll(/^ +'?([\w-]+)'?: (\w+),?$/gm),
    ([, type = '', control = '']) => ({ type, control })
  )
  return {
    types: rows.map((row) => row.type),
    free: rows
      .filter((row) =>
        functionSource(source, row.control).includes('onChange(field.id, event.target.value)')
      )
      .map((row) => row.type)
  }
}

// Fields whose text is rewritten before it is written out (`sanitizeWindowName`,
// `sanitizeSpriteName`, an upper-cased escape character): needles are rewritten the same way.
const identifierOnly = (text: string): string =>
  text
    .trim()
    .replaceAll(/[^a-z0-9]/gi, '')
    .replace(/^[a-z]/, (c) => c.toUpperCase())
const upperCase = (text: string): string => text.toUpperCase()
const TRANSFORMED = new Map<string, (text: string) => string>([
  ['custom-window-basic.windowName', identifierOnly],
  ['gauge-window.windowName', identifierOnly],
  ['hud-overlay-window.windowName', identifierOnly],
  ['popup-notification-window.windowName', identifierOnly],
  ['sprite-custom-class.spriteName', identifierOnly],
  ['sprite-frame-animation.spriteName', identifierOnly],
  ['message-custom-text-code.escapeChar', upperCase]
])

/**
`needle` as it reads inside rewritten field text; no payload starts with it.
*/
function needleFor(key: string, needle: string): string {
  const transform = TRANSFORMED.get(key)
  return transform === undefined ? needle : transform(`X${needle}`).slice(1)
}

interface ValueSet {
  label: string
  values: Record<string, unknown>
  /**
  The code generated with the marker in the field.
  */
  code: string
}

interface FieldCase {
  id: string
  field: string
  key: string
  /**
  Base values, and base plus the field's enabling values, each kept when the field is emitted.
  */
  valueSets: ValueSet[]
}

const ENABLING = new Map(
  Object.entries(ENABLING_VALUES).map(([id, byField]) => [id, new Map(Object.entries(byField))])
)

function fieldCases(free: string[]): FieldCase[] {
  const cases: FieldCase[] = []
  for (const id of templateIds()) {
    const template = templateOf(id)
    for (const field of template.fields) {
      if (!free.includes(field.type)) continue
      const key = `${id}.${field.id}`
      const enabling = ENABLING.get(id)?.get(field.id)
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
          code: template.generate({ ...set.values, [field.id]: MARKER })
        }))
        .filter((set) => set.code.includes(needleFor(key, MARKER)))
      cases.push({ id, field: field.id, key, valueSets })
    }
  }
  return cases
}

// A field written as code under another field's value that the corpus gives no hostile cases:
// the custom damage formula.
const PREFIX_VALUES = new Map<string, { label: string; values: Record<string, unknown> }>([
  [
    'battle-damage-modifier.modifyValue',
    {
      label: ' with modifyType=custom',
      values: { ...baseValues('battle-damage-modifier'), modifyType: 'custom' }
    }
  ]
])

type Outcome = 'rejected' | 'contained' | 'throws' | 'ran' | 'escaped'
type Tally = Record<Outcome, number>

const emptyTally = (): Tally => ({ rejected: 0, contained: 0, throws: 0, ran: 0, escaped: 0 })

function outcomeOf(id: string, key: string, values: Record<string, unknown>): Outcome {
  if (!validateTemplateValues(id, values).valid) return 'rejected'
  const code = templateOf(id).generate(values)
  const result = evaluatePlugin(code, { mode: 'template' })
  if (result.compileProblem !== null) return 'throws'
  if (result.sentinel) return 'ran'
  if (result.threw !== null) return 'throws'
  const needle = needleFor(key, INJECTED)
  return code.includes(needle) && isContained(code, needle) ? 'contained' : 'escaped'
}

const EVERY = ALL_PAYLOADS.map((p) => p.name)

// (template, field, context) triples where the marker lands. Escaping moves no field to another
// context, so a change here means a field was added or now lands somewhere else.
const CONTEXT_COUNTS: Record<JsContext, number> = {
  'line-comment': 32,
  'block-comment': 0,
  'single-quote': 27,
  'double-quote': 7,
  'template-literal': 0,
  regex: 2,
  code: 33
}

const { types, free } = fieldRenderers()
const cases = fieldCases(free)
const contextsByKey = new Map(
  cases.map((c) => {
    const needle = needleFor(c.key, MARKER)
    const found = new Set(c.valueSets.flatMap(({ code }) => contextsOf(code, needle)))
    return [c.key, found] as const
  })
)

// The keys of the fields whose marker lands in `context`
const landingIn = (context: JsContext): string[] =>
  cases.filter((c) => contextsByKey.get(c.key)?.has(context) === true).map((c) => c.key)

// ` (a, b)` for a list that is not empty
const parenthesized = (items: string[]): string =>
  items.length > 0 ? ` (${items.join(', ')})` : ''

/**
How many fields land in each context, and the fields whose marker the code never holds.
*/
function contextCounts(): { counts: Map<JsContext, number>; notEmitted: string[] } {
  const counts = new Map(CONTEXTS.map((context) => [context, 0]))
  const notEmitted: string[] = []
  for (const c of cases) {
    const found = contextsByKey.get(c.key) ?? new Set<JsContext>()
    for (const context of found) counts.set(context, (counts.get(context) ?? 0) + 1)
    if (found.size === 0) notEmitted.push(c.key)
  }
  return { counts, notEmitted }
}

/**
Runs a payload in a field under a value set: counts its outcome in `found.tally`, and lists it in
`found.table` unless it was rejected or contained.
*/
function runPayload(
  c: FieldCase,
  set: { label: string; values: Record<string, unknown> },
  payload: Payload,
  found: { tally: Tally; table: Record<string, Outcome> }
): Outcome {
  const outcome = outcomeOf(c.id, c.key, { ...set.values, [c.field]: payload.text })
  found.tally[outcome]++
  if (outcome !== 'rejected' && outcome !== 'contained') {
    found.table[`${c.key}${set.label}: ${payload.name}`] = outcome
  }
  return outcome
}

/**
Every payload in every free-text field: how often each outcome came, the cases neither rejected
nor contained, and each field's outcomes in order.
*/
function payloadOutcomes(): {
  tally: Tally
  table: Record<string, Outcome>
  outcomes: Map<string, Outcome[]>
} {
  const tally = emptyTally()
  const table: Record<string, Outcome> = {}
  const outcomes = new Map<string, Outcome[]>()
  for (const c of cases) {
    const fieldOutcomes: Outcome[] = []
    for (const set of c.valueSets) {
      for (const payload of ALL_PAYLOADS)
        fieldOutcomes.push(runPayload(c, set, payload, { tally, table }))
    }
    if (fieldOutcomes.length > 0) outcomes.set(c.key, fieldOutcomes)
  }
  return { tally, table, outcomes }
}

/**
Every prefix payload in every free-text field, also under the field's extra value set: how often
each outcome came per payload, and the cases neither rejected nor contained.
*/
function prefixOutcomes(): {
  tallies: { payload: Payload; tally: Tally }[]
  table: Record<string, Outcome>
} {
  const tallies = PREFIX_PAYLOADS.map((payload) => ({ payload, tally: emptyTally() }))
  const table: Record<string, Outcome> = {}
  for (const c of cases) {
    const extra = PREFIX_VALUES.get(c.key)
    const valueSets = extra === undefined ? c.valueSets : [...c.valueSets, extra]
    for (const set of valueSets) {
      for (const { payload, tally } of tallies) runPayload(c, set, payload, { tally, table })
    }
  }
  return { tallies, table }
}

/**
The fields a payload passes: any outcome but a rejection, or for a field reduced to an identifier,
any outcome but a rejection or containment. A field without outcomes counts as passing.
*/
function passingFields(
  keys: string[],
  sanitized: string[],
  outcomes: Map<string, Outcome[]>
): string[] {
  return keys.filter(
    (key) =>
      outcomes
        .get(key)
        ?.some((o) => o !== 'rejected' && !(o === 'contained' && sanitized.includes(key))) !== false
  )
}

const tallyText = (tally: Tally): string =>
  `rejected ${String(tally.rejected)}, contained ${String(tally.contained)}, ` +
  `throws ${String(tally.throws)}, ran ${String(tally.ran)}, escaped ${String(tally.escaped)}`

describe('template field text', () => {
  it('names the field types whose text reaches the generated code', () => {
    process.stdout.write(
      `free-text field types: ${free.join(', ')}; fields ${String(cases.length)} over ` +
        `${String(templateIds().length)} templates (renderers scanned: ${types.join(', ')})\n`
    )

    expect(types.length).toBeGreaterThan(0)
    expect(cases.length).toBeGreaterThan(0)
  })

  it('names the context each free-text field lands in', () => {
    const { counts, notEmitted } = contextCounts()
    const countsText = CONTEXTS.map((c) => `${c} ${String(counts.get(c) ?? 0)}`).join(', ')
    process.stdout.write(
      `template contexts: ${countsText}; ` +
        `not emitted ${String(notEmitted.length)}${parenthesized(notEmitted)}\n`
    )

    expect(counts.values().reduce((a, b) => a + b, 0)).toBeGreaterThan(0)
    expect(notEmitted).toStrictEqual([])
    expect(Object.fromEntries(counts)).toStrictEqual(CONTEXT_COUNTS)
  })

  it('template field text stays inside its comment, string or position', () => {
    const { tally, table, outcomes } = payloadOutcomes()
    const total = Object.values(tally).reduce((a, b) => a + b, 0)
    process.stdout.write(`template payload cases: ${String(total)}; ${tallyText(tally)}\n`)

    expect(total).toBeGreaterThan(0)
    expect(table).toStrictEqual({})

    // Text written as code or read as a pattern fails its field's check for every payload; text
    // reduced to an identifier before it is written may instead pass and stay contained.
    const code = landingIn('code')
    const regex = landingIn('regex')
    const sanitized = code.filter((key) => TRANSFORMED.has(key))
    const passing = passingFields([...code, ...regex], sanitized, outcomes)
    process.stdout.write(
      `code-position fields ${String(code.length)}, pattern fields ${String(regex.length)}, ` +
        `passing a payload ${String(passing.length)}; sanitized to identifiers: ${sanitized.join(', ')}\n`
    )

    expect({ code: code.length > 0, regex: regex.length > 0 }).toStrictEqual({
      code: true,
      regex: true
    })
    expect(passing).toStrictEqual([])
    // Each rewritten field is rejected by its own check for every payload.
    expect(
      Object.fromEntries(TRANSFORMED.keys().map((key) => [key, outcomes.get(key)]))
    ).toStrictEqual(
      Object.fromEntries(TRANSFORMED.keys().map((key) => [key, EVERY.map(() => 'rejected')]))
    )
  })

  // A check that reads a word or a number at the start of the text passes the line break and the
  // code after it.
  it('text that starts like a valid value stays inside its comment, string or position', () => {
    const { tallies, table } = prefixOutcomes()
    process.stdout.write(
      [
        ...tallies.map(
          ({ payload, tally }) => `prefix payload ${payload.name}: ${tallyText(tally)}`
        ),
        ...Object.entries(table).map(([key, outcome]) => `  ${key}: ${outcome}`),
        ''
      ].join('\n')
    )
    const ran = tallies.reduce((sum, { tally }) => sum + tally.ran, 0)

    expect(tallies.every(({ tally }) => tally.rejected + tally.contained > 0)).toBe(true)
    expect(ran).toBe(0)
    expect(table).toStrictEqual({})
  })

  // The dialog opens a template with its defaults and shows no code until they pass; a required
  // field without a default fails by design.
  it('names the templates whose defaults fail their own checks', () => {
    const ids = templateIds()
    const failing = ids
      .map((id) => [id, validateTemplateValues(id, getTemplateDefaults(id)).errors] as const)
      .filter(([, errors]) => errors.length > 0)
    process.stdout.write(
      [
        `template defaults passing their own checks: ${String(ids.length - failing.length)}/${String(ids.length)}`,
        ...failing.map(([id, errors]) => `  ${id}: ${errors.join(' | ')}`),
        ''
      ].join('\n')
    )

    expect(ids.length).toBeGreaterThan(0)
  })
})

// Text a field's check accepts, with a payload written after it or a line break around it, under
// every corpus value set that leaves the field as it is: another field's value can move the text
// to a new position, and a check that reads only the start of the text, or the text trimmed,
// passes what follows.
const LINE_TERMINATORS: [string, string][] = [
  ['lf', '\n'],
  ['cr', '\r'],
  ['u2028', '\u{2028}'],
  ['u2029', '\u{2029}']
]
const accepted = { cases: 0, rejected: 0 }

// A field value as the text it holds; empty for none
const textOf = (value: unknown): string =>
  typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
    ? String(value)
    : ''

type ValueCase = ReturnType<typeof templateCases>[number]

// The field's text with each payload written after it and each line break before and after it
const variantsOf = (text: string): [string, string][] => [
  ...ALL_PAYLOADS.map((p): [string, string] => [`after ${p.name}`, text + p.text.slice(1)]),
  ...LINE_TERMINATORS.flatMap(([name, lb]): [string, string][] => [
    [`${name} before`, lb + text],
    [`${name} after`, text + lb]
  ])
]

/**
The variants of the field's text under one value set that its check accepts and that do not stay
in place.
*/
function setFailures(id: string, fieldId: string, set: ValueCase): string[] {
  const failures: string[] = []
  const template = templateOf(id)
  const key = `${id}.${fieldId}`
  const text = textOf(set.values[fieldId]) || '1'
  for (const [name, value] of variantsOf(text)) {
    const values = { ...set.values, [fieldId]: value }
    accepted.cases++
    if (!validateTemplateValues(id, values).valid) {
      accepted.rejected++
      continue
    }
    const code = template.generate(values)
    const result = evaluatePlugin(code, { mode: 'template' })
    const isClean = result.compileProblem === null && result.threw === null && !result.sentinel
    if (!isClean || !isContained(code, needleFor(key, INJECTED))) {
      failures.push(`${key} under ${set.name}: ${name}`)
    }
  }
  return failures
}

function acceptedTextFailures(id: string, fieldId: string): string[] {
  const valueSets = templateCases(id).filter((c) => c.hostile === null)
  return templateOf(id)
    .fields.filter((field) => field.id === fieldId)
    .flatMap((field) =>
      valueSets
        .filter((set) => !set.name.startsWith(`${field.id}=`))
        .flatMap((set) => setFailures(id, field.id, set))
    )
}

describe('accepted template field text', () => {
  afterAll(() => {
    process.stdout.write(
      `accepted-text cases: ${String(accepted.cases)}; rejected ${String(accepted.rejected)}, ` +
        `accepted and in place ${String(accepted.cases - accepted.rejected)}\n`
    )
    if (accepted.cases === 0) throw new Error('accepted-text cases: none ran')
  })

  // One test per field: all fields of a template together run past the test timeout when the
  // suite runs with coverage.
  const fields = templateIds().flatMap((id) =>
    templateOf(id)
      .fields.filter((f) => free.includes(f.type))
      .map((f) => [id, f.id] as const)
  )

  // Measured per case: 435 ms run alone, 1.5-2.2 s inside the full check with coverage, 5.6 s on
  // a loaded host. Each variant changes the generated plugin, so each one is generated and
  // evaluated afresh: a shared evaluation would let one variant's globals hide another's leak.
  const ACCEPTED_TEXT_TIMEOUT_MS = 20_000

  it.each(fields)(
    'stays in place with a payload or line break added (%s.%s)',
    (id, fieldId) => {
      expect(acceptedTextFailures(id, fieldId)).toStrictEqual([])
    },
    ACCEPTED_TEXT_TIMEOUT_MS
  )
})
