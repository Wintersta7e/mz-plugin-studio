// Escapes the generator applies to text it writes into a comment or a string literal.
import { describe, it, expect } from 'vitest'
import {
  escapeBlockComment,
  escapeJSDoubleQuote,
  escapeJSString,
  escapeLineComment
} from '../../src/renderer/src/lib/generator/escape'
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
