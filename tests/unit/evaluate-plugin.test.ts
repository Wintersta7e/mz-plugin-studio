// The evaluation helper compiles before it runs anything and runs code in a context whose
// globals are all created inside it, so nothing a plugin does reaches the test process.
import { describe, it, expect, afterEach } from 'vitest'
import classes from '../../src/renderer/src/data/mz-classes.json'
import {
  compilePlugin,
  evaluatePlugin,
  listTemplateGlobals,
  type CompileProblem
} from '../helpers/evaluate-plugin'

const MODES = ['generator', 'template'] as const

/**
The sentinel a script would leave on the test process's own global.
*/
function hostSentinel(): unknown {
  return Reflect.get(globalThis, '__pwn')
}

/**
A compile problem with its message replaced by the message's type, so its shape is compared whole.
*/
function problemShape(problem: CompileProblem | null): object | null {
  return problem && { ...problem, message: typeof problem.message }
}

describe(compilePlugin, () => {
  it('returns the message and line of a syntax error', () => {
    const problem = compilePlugin('const a = ;', 'x.js')

    expect(problemShape(problem)).toStrictEqual({ message: 'string', line: 1 })
    expect(problem?.message).not.toBe('')
    expect(compilePlugin('const a = 1;', 'x.js')).toBeNull()
  })
})

describe(evaluatePlugin, () => {
  afterEach(() => {
    Reflect.deleteProperty(globalThis, '__pwn')
  })

  it('runs nothing when the code does not compile', () => {
    const result = evaluatePlugin('globalThis.__pwn = 1;\nconst a = ;', { mode: 'generator' })

    expect(problemShape(result.compileProblem)).toStrictEqual({ message: 'string', line: 2 })
    expect(result.threw).toBeNull()
    expect(result.sentinel).toBe(false)
    expect(result.context).toBeNull()
    expect(Reflect.has(globalThis, '__pwn')).toBe(false)
  })

  it('sees the sentinel a script sets inside the context', () => {
    const result = evaluatePlugin('/* X */ globalThis.__pwn = 1; /* Y */', { mode: 'generator' })

    expect(result).toMatchObject({ compileProblem: null, threw: null, sentinel: true })

    const { __pwn: pwned } = result.context ?? {}

    expect(pwned).toBe(1)
    expect(hostSentinel()).toBeUndefined()
  })

  it.each(MODES)('keeps a constructor walk from the stub inside the context (%s)', (mode) => {
    const code = "PluginManager.constructor.constructor('return globalThis')().__pwn = 1"
    const result = evaluatePlugin(code, { mode })

    expect(result).toMatchObject({ compileProblem: null, threw: null, sentinel: true })
    expect(hostSentinel()).toBeUndefined()
  })

  it('gives stand-ins no path to a Function constructor', () => {
    const result = evaluatePlugin("Game_Actor.constructor('globalThis.__pwn = 1')()", {
      mode: 'template'
    })

    expect(result).toMatchObject({ compileProblem: null, threw: null, sentinel: false })
    expect(hostSentinel()).toBeUndefined()
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

describe(listTemplateGlobals, () => {
  it('lists every dictionary class, every global the templates name, and the browser globals', () => {
    const { names, dictionary, sources, fixed } = listTemplateGlobals()
    process.stdout.write(
      `template globals ${String(names.length)} (dictionary ${String(dictionary)}, ` +
        `sources ${String(sources)}, fixed ${String(fixed)})\n`
    )

    expect({ dictionary, fixed, count: names.length, distinct: new Set(names).size }).toStrictEqual(
      {
        dictionary: Object.keys(classes).length,
        fixed: 2,
        count: dictionary + sources + fixed,
        distinct: names.length
      }
    )
    expect(sources).toBeGreaterThan(0)
    expect(['window', 'setTimeout'].filter((name) => !names.includes(name))).toStrictEqual([])
  })
})
