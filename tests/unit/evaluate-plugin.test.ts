// The evaluation helper compiles before it runs anything and runs code in a context whose
// globals are all created inside it, so nothing a plugin does reaches the test process.
import { describe, it, expect, afterEach } from 'vitest'
import classes from '../../src/renderer/src/data/mz-classes.json'
import { compilePlugin, evaluatePlugin, listTemplateGlobals } from '../helpers/evaluate-plugin'

const host = globalThis as Record<string, unknown>
const MODES = ['generator', 'template'] as const

afterEach(() => {
  delete host.__pwn
})

describe('compilePlugin', () => {
  it('returns the message and line of a syntax error', () => {
    const problem = compilePlugin('const a = ;', 'x.js')
    expect(problem).toEqual({ message: expect.any(String), line: 1 })
    expect(problem!.message).not.toBe('')
    expect(compilePlugin('const a = 1;', 'x.js')).toBeNull()
  })
})

describe('evaluatePlugin', () => {
  it('runs nothing when the code does not compile', () => {
    const result = evaluatePlugin('globalThis.__pwn = 1;\nconst a = ;', { mode: 'generator' })
    expect(result.compileProblem).toEqual({ message: expect.any(String), line: 2 })
    expect(result.threw).toBeNull()
    expect(result.sentinel).toBe(false)
    expect(result.context).toBeNull()
    expect('__pwn' in host).toBe(false)
  })

  it('sees the sentinel a script sets inside the context', () => {
    const result = evaluatePlugin('/* X */ globalThis.__pwn = 1; /* Y */', { mode: 'generator' })
    expect(result).toMatchObject({ compileProblem: null, threw: null, sentinel: true })
    expect(result.context?.__pwn).toBe(1)
    expect(host.__pwn).toBeUndefined()
  })

  it.each(MODES)('keeps a constructor walk from the stub inside the context (%s)', (mode) => {
    const code = "PluginManager.constructor.constructor('return globalThis')().__pwn = 1"
    const result = evaluatePlugin(code, { mode })
    expect(result).toMatchObject({ compileProblem: null, threw: null, sentinel: true })
    expect(host.__pwn).toBeUndefined()
  })

  it('gives stand-ins no path to a Function constructor', () => {
    const result = evaluatePlugin("Game_Actor.constructor('globalThis.__pwn = 1')()", {
      mode: 'template'
    })
    expect(result).toMatchObject({ compileProblem: null, threw: null, sentinel: false })
    expect(host.__pwn).toBeUndefined()
  })

  it('reports what the script throws', () => {
    const result = evaluatePlugin("throw new TypeError('x')", { mode: 'generator' })
    expect(result.threw).toBe('TypeError: x')
    expect(result.sentinel).toBe(false)
  })

  it('stops a script that never ends', () => {
    const result = evaluatePlugin('while (true) {}', { mode: 'generator' })
    expect(result.threw).toContain('timed out')
  })
})

describe('listTemplateGlobals', () => {
  it('lists every dictionary class, every global the templates name, and the browser globals', () => {
    const globals = listTemplateGlobals()
    console.log(
      `template globals ${globals.names.length} (dictionary ${globals.dictionary}, ` +
        `sources ${globals.sources}, fixed ${globals.fixed})`
    )
    expect(globals.dictionary).toBe(Object.keys(classes).length)
    expect(globals.sources).toBeGreaterThan(0)
    expect(globals.fixed).toBe(2)
    expect(globals.names).toHaveLength(globals.dictionary + globals.sources + globals.fixed)
    expect(new Set(globals.names).size).toBe(globals.names.length)
    expect(globals.names).toEqual(expect.arrayContaining(['window', 'setTimeout']))
  })
})
