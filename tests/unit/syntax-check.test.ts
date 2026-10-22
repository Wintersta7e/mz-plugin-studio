// The compile check a save runs on plugin code: it compiles and never runs anything, and names
// the line of a syntax error.
import { describe, expect, it } from 'vitest'
import { compileCheck } from '../../src/main/services/syntax-check'

describe('compileCheck', () => {
  it('compiles without running the code', () => {
    const scope = globalThis as { __compileOnlySentinel?: number }
    expect(compileCheck('globalThis.__compileOnlySentinel = 1', 'Probe.js')).toBeNull()
    expect(scope.__compileOnlySentinel).toBeUndefined()
  })

  it('names the line of a syntax error', () => {
    const problem = compileCheck('var a = 1;\nvar b = 2;\nlet x = ;\n', 'Probe.js')
    expect(problem).toMatchObject({ line: 3 })
    expect(problem?.message).toMatch(/Unexpected token/)
  })

  it('counts CRLF lines after a byte order mark', () => {
    expect(compileCheck('﻿var a = 1;\r\nvar b = 2;\r\nfoo(', 'Probe.js')).toMatchObject({
      line: 3
    })
  })

  it('rejects a top-level return', () => {
    expect(compileCheck('return 1', 'Probe.js')).toMatchObject({ line: 1 })
  })
})
