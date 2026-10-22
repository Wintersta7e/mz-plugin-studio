// Escapes the generator applies to text it writes into a comment or a string literal, and the
// check for text it writes as an expression.
import { describe, it, expect } from 'vitest'
import {
  escapeBlockComment,
  escapeJSDoubleQuote,
  escapeJSString,
  escapeLineComment,
  isOneLineExpression
} from '../../src/renderer/src/lib/generator/escape'
import { compileCheck } from '../../src/main/services/syntax-check'
import { evaluatePlugin } from '../helpers/evaluate-plugin'

const BLOCK_INPUTS = ['*/', '**/', '*/*/', 'a*/b', '*\\/', '', '/*', '*']
const LINE_INPUTS = ['a\nb', 'a\r\nb', 'a\rb', 'a\u2028b', 'a\u2029b', '\r\n\r\n', '']

describe('escapeBlockComment', () => {
  it('leaves no comment end and gives the same text when applied twice', () => {
    console.log(`escape inputs checked: ${BLOCK_INPUTS.length} ${JSON.stringify(BLOCK_INPUTS)}`)
    expect(BLOCK_INPUTS.length).toBeGreaterThan(0)
    for (const input of BLOCK_INPUTS) {
      const once = escapeBlockComment(input)
      expect(once, input).not.toContain('*/')
      expect(escapeBlockComment(once), input).toBe(once)
    }
  })
})

describe('escapeLineComment', () => {
  it('leaves no line break and gives the same text when applied twice', () => {
    console.log(`escape inputs checked: ${LINE_INPUTS.length} ${JSON.stringify(LINE_INPUTS)}`)
    expect(LINE_INPUTS.length).toBeGreaterThan(0)
    for (const input of LINE_INPUTS) {
      const once = escapeLineComment(input)
      expect(once, JSON.stringify(input)).not.toMatch(/[\r\n\u2028\u2029]/)
      expect(escapeLineComment(once), JSON.stringify(input)).toBe(once)
    }
    expect(escapeLineComment('a\r\nb')).toBe('a b')
  })
})

describe('JS string escapes', () => {
  it('evaluate back to the text they escape', () => {
    const literals: [string, (s: string) => string][] = [
      ['single', (s) => `'${escapeJSString(s)}'`],
      ['double', (s) => `"${escapeJSDoubleQuote(s)}"`]
    ]
    console.log(`escape inputs checked: ${LINE_INPUTS.length * literals.length}`)
    for (const input of LINE_INPUTS) {
      for (const [quote, literal] of literals) {
        const result = evaluatePlugin(`globalThis.__value = ${literal(input)};`, {
          mode: 'generator'
        })
        expect(literal(input), `${quote} ${JSON.stringify(input)}`).not.toMatch(
          /[\r\n\u2028\u2029]/
        )
        expect(result.compileProblem, `${quote} ${JSON.stringify(input)}`).toBeNull()
        expect(result.context?.__value, `${quote} ${JSON.stringify(input)}`).toBe(input)
      }
    }
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
  'a\u2028b'
]

describe('isOneLineExpression', () => {
  it('accepts expressions that compile and refuses text that ends them early', () => {
    console.log(`expression inputs checked: ${EXPRESSIONS.length + NOT_EXPRESSIONS.length}`)
    expect(EXPRESSIONS.length * NOT_EXPRESSIONS.length).toBeGreaterThan(0)
    for (const text of EXPRESSIONS) {
      expect(isOneLineExpression(text), text).toBe(true)
      expect(compileCheck(`globalThis.__value = ${text};`, 'plugin.js'), text).toBeNull()
    }
    for (const text of NOT_EXPRESSIONS) {
      expect(isOneLineExpression(text), JSON.stringify(text)).toBe(false)
    }
  })
})
