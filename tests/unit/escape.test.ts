// Escapes the generator applies to text it writes into a comment or a string literal.
import { describe, it, expect } from 'vitest'
import { escapeBlockComment } from '../../src/renderer/src/lib/generator/escape'

const BLOCK_INPUTS = ['*/', '**/', '*/*/', 'a*/b', '*\\/', '', '/*', '*']

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
