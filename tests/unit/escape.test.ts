// Escapes the generator applies to text it writes into a comment or a string literal, and the
// check for text it writes as an expression.
import { describe, it, expect } from 'vitest'
import {
  annotationText,
  escapeBlockComment,
  escapeJSDoubleQuote,
  escapeJSString,
  escapeLineComment,
  isOneLineExpression
} from '../../src/renderer/src/lib/generator/escape'
import { compileCheck } from '../../src/main/services/syntax-check'
import { evaluatePlugin } from '../helpers/evaluate-plugin'

const BLOCK_INPUTS = ['*/', '**/', '*/*/', 'a*/b', '*\\/', '', '/*', '*']
const LINE_INPUTS = ['a\nb', 'a\r\nb', 'a\rb', 'a\u{2028}b', 'a\u{2029}b', '\r\n\r\n', '']
const LINE_BREAK = /[\n\r\u{2028}\u{2029}]/u

describe(escapeBlockComment, () => {
  it('leaves no comment end and gives the same text when applied twice', () => {
    process.stdout.write(
      `escape inputs checked: ${String(BLOCK_INPUTS.length)} ${JSON.stringify(BLOCK_INPUTS)}\n`
    )

    expect(BLOCK_INPUTS.length).toBeGreaterThan(0)

    const once = BLOCK_INPUTS.map((input) => escapeBlockComment(input))

    expect(once.filter((text) => text.includes('*/'))).toStrictEqual([])
    expect(once.map((text) => escapeBlockComment(text))).toStrictEqual(once)
  })
})

describe(escapeLineComment, () => {
  it('leaves no line break and gives the same text when applied twice', () => {
    process.stdout.write(
      `escape inputs checked: ${String(LINE_INPUTS.length)} ${JSON.stringify(LINE_INPUTS)}\n`
    )

    expect(LINE_INPUTS.length).toBeGreaterThan(0)

    const once = LINE_INPUTS.map((input) => escapeLineComment(input))

    expect(once.filter((text) => LINE_BREAK.test(text))).toStrictEqual([])
    expect(once.map((text) => escapeLineComment(text))).toStrictEqual(once)
    expect(escapeLineComment('a\r\nb')).toBe('a b')
  })
})

describe(annotationText, () => {
  it('writes each line break as one space and keeps the comment open', () => {
    expect(annotationText('a\nb')).toBe('a b')
    expect(annotationText('a\r\nb')).toBe('a b')
    expect(annotationText('a\rb')).toBe('a b')
    expect(annotationText('x */ y')).toBe('x *\\/ y')
  })

  it('keeps the line separators, which end no annotation line', () => {
    expect(annotationText('a\u{2028}b')).toBe('a\u{2028}b')
    expect(annotationText('a\u{2029}b')).toBe('a\u{2029}b')
  })
})

describe('the JS string escapes', () => {
  it('evaluate back to the text they escape', () => {
    const literals: [string, (s: string) => string][] = [
      ['single', (s) => `'${escapeJSString(s)}'`],
      ['double', (s) => `"${escapeJSDoubleQuote(s)}"`]
    ]
    process.stdout.write(`escape inputs checked: ${String(LINE_INPUTS.length * literals.length)}\n`)
    const cases = LINE_INPUTS.flatMap((input) =>
      literals.map(([quote, literal]) => ({
        label: `${quote} ${JSON.stringify(input)}`,
        input,
        source: literal(input)
      }))
    )
    const evaluated = cases.map(({ label, source }) => {
      const result = evaluatePlugin(`globalThis.__value = ${source};`, { mode: 'generator' })
      const { __value: value } = result.context ?? {}
      return [label, LINE_BREAK.test(source), result.compileProblem ?? 'compiles', value]
    })

    expect(evaluated).toStrictEqual(
      cases.map(({ label, input }) => [label, false, 'compiles', input])
    )
  })
})

// Expressions a template field is meant to hold, and text that ends the expression or its line.
const EXPRESSIONS = [
  '$gameParty.gold()',
  "'Hello'",
  '"Gold: " + $gameParty.gold()',
  '`Gold: ${$gameParty.gold()}`',
  "param > 1 ? 'many' : 'one'",
  "String(param).padStart(3, '0')",
  "'a; b // c'",
  "'It\\'s'"
]
const NOT_EXPRESSIONS = [
  "'open",
  'a; b',
  'a // b',
  'a /* b */',
  "x' + y + 'z",
  "'a' 'b'",
  'a\nb',
  'a\u{2028}b'
]

describe(isOneLineExpression, () => {
  it('accepts expressions that compile and refuses text that ends them early', () => {
    process.stdout.write(
      `expression inputs checked: ${String(EXPRESSIONS.length + NOT_EXPRESSIONS.length)}\n`
    )

    expect(EXPRESSIONS.length * NOT_EXPRESSIONS.length).toBeGreaterThan(0)
    expect(
      EXPRESSIONS.map((text) => [
        text,
        isOneLineExpression(text),
        compileCheck(`globalThis.__value = ${text};`, 'plugin.js') ?? 'compiles'
      ])
    ).toStrictEqual(EXPRESSIONS.map((text) => [text, true, 'compiles']))
    expect(
      NOT_EXPRESSIONS.map((text) => [JSON.stringify(text), isOneLineExpression(text)])
    ).toStrictEqual(NOT_EXPRESSIONS.map((text) => [JSON.stringify(text), false]))
  })
})
