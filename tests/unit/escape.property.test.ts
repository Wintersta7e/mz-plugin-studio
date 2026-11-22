// The escapes the generator writes user text with, on generated text: a string literal evaluates
// back to the text, and a comment holding the text runs to its own end.
import * as fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import {
  escapeBlockComment,
  escapeJSDoubleQuote,
  escapeJSString,
  escapeLineComment,
  isOneLineExpression
} from '../../src/renderer/src/lib/generator/escape'
import { evaluatePlugin } from '../helpers/evaluate-plugin'
import { propertyRuns } from '../helpers/property-runs'

const RUNS = propertyRuns('escape')

// The characters the escapes rewrite, or that end a literal or a comment
const SPECIAL = ['\\', "'", '"', '`', '\n', '\r', '\u{2028}', '\u{2029}', '*', '/', '$', '{']
// Any text, lone surrogates included, with the special characters drawn often
const text = fc.string({
  unit: fc.oneof(
    fc.constantFrom(...SPECIAL),
    fc.string({ unit: 'binary', minLength: 1, maxLength: 1 })
  )
})

// An expression of names, numbers and string literals of any text, nested in calls, arrays,
// objects and parentheses, so every bracket outside the literals is closed
const { expression } = fc.letrec<{ expression: string; operand: string }>((tie) => ({
  operand: fc.oneof(
    { depthSize: 'small', withCrossShrink: true },
    fc.constantFrom('a', '$gameParty', 'value_1'),
    fc.nat().map(String),
    text.map((value) => `'${escapeJSString(value)}'`),
    text.map((value) => `"${escapeJSDoubleQuote(value)}"`),
    tie('expression').map((inner) => `(${inner})`),
    tie('expression').map((inner) => `f(${inner})`),
    fc.array(tie('expression'), { maxLength: 3 }).map((items) => `[${items.join(', ')}]`),
    tie('expression').map((inner) => `{ key: ${inner} }`)
  ),
  expression: fc
    .array(tie('operand'), { minLength: 1, maxLength: 3 })
    .map((operands) => operands.join(' + '))
}))

// A line break or line separator, which ends a line comment. Evaluating back alone would miss
// one: a line or paragraph separator is legal inside a string literal.
const LINE_END = /[\n\r\u{2028}\u{2029}]/v

// The value of an expression run in a fresh context; on a syntax error or a throw, that problem
const evaluate = (expression: string): unknown => {
  const result = evaluatePlugin(`globalThis.value = ${expression}`, { mode: 'generator' })
  return result.context === null ? result.compileProblem : (result.threw ?? result.context['value'])
}

describe('escape properties', () => {
  // The escaped text is also written into line comments, so it stays on one line
  it('a single-quoted literal evaluates back to the text, on one line', () => {
    expect.hasAssertions()

    fc.assert(
      fc.property(text, (value) => {
        const escaped = escapeJSString(value)

        expect(escaped).not.toMatch(LINE_END)
        expect(evaluate(`'${escaped}'`)).toBe(value)
      }),
      RUNS
    )
  })

  it('a double-quoted literal evaluates back to the text, on one line', () => {
    expect.hasAssertions()

    fc.assert(
      fc.property(text, (value) => {
        const escaped = escapeJSDoubleQuote(value)

        expect(escaped).not.toMatch(LINE_END)
        expect(evaluate(`"${escaped}"`)).toBe(value)
      }),
      RUNS
    )
  })

  it('a block comment holding the text ends at its own close', () => {
    expect.hasAssertions()

    fc.assert(
      fc.property(text, (value) => {
        const escaped = escapeBlockComment(value)

        expect(escaped).not.toContain('*/')
        expect(evaluate(`/* ${escaped} */ 1`)).toBe(1)
      }),
      RUNS
    )
  })

  it('a line comment holding the text ends at its own line break', () => {
    expect.hasAssertions()

    fc.assert(
      fc.property(text, (value) => {
        const escaped = escapeLineComment(value)

        expect(escaped).not.toMatch(LINE_END)
        expect(evaluate(`// ${escaped}\n1`)).toBe(1)
      }),
      RUNS
    )
  })

  it('an expression whose brackets are balanced is one expression on one line', () => {
    expect.hasAssertions()

    fc.assert(
      fc.property(expression, (value) => {
        expect([value, isOneLineExpression(value)]).toStrictEqual([value, true])
      }),
      RUNS
    )
  })
})
