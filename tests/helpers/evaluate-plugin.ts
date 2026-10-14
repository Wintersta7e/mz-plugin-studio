// Compiles plugin code, then runs it in a fresh context whose globals are all created inside
// that context: a constructor walk from any of them ends at the context's own Function, never
// the test process's. Paths resolve from the working directory so CommonJS and ESM loaders
// both accept this module.
import { existsSync, readdirSync, readFileSync } from 'fs'
import { join, resolve } from 'path'
import { Script, createContext } from 'vm'
import { SENTINEL } from './hostile'

/** A syntax error: its message and 1-based line, null when the stack names no line. */
export interface CompileProblem {
  message: string
  line: number | null
}

export interface EvaluationResult {
  compileProblem: CompileProblem | null
  threw: string | null
  sentinel: boolean
  context: Record<string, unknown> | null
}

const TIMEOUT_MS = 2000

// MZ globals the template sources name that the class dictionary does not hold.
const SOURCE_PATTERNS = [
  /\$(?:game|data)[A-Za-z]+/g,
  /\b(?:Game|Scene|Sprite|Spriteset|Window|Tilemap|Weather|ColorFilter)_[A-Za-z]+\b|\b[A-Z][A-Za-z]*Manager\b/g
]
// Browser globals generated template code calls at the top level.
const FIXED_GLOBALS = ['window', 'setTimeout']

// Runs inside the context. Every stand-in is created there, and each trap answers with a new
// stand-in, so no property read ever returns something from outside the context.
const STAND_IN_SOURCE = `
const make = () => new Proxy(function () {}, {
  get: () => make(),
  set: () => true,
  apply: () => make(),
  construct: () => make(),
  defineProperty: () => true,
  deleteProperty: () => true
});
for (const name of NAMES) globalThis[name] = make();
`
const STUB_SOURCE = `
globalThis.PluginManager = { parameters: () => ({}), registerCommand: () => {} };
`

function repoPath(relative: string): string {
  const path = resolve(process.cwd(), relative)
  if (!existsSync(path)) {
    throw new Error(
      `${relative} not found under ${process.cwd()} (run tests from the repository root)`
    )
  }
  return path
}

type Compiled = { script: Script; problem: null } | { script: null; problem: CompileProblem }

function compile(code: string, filename: string): Compiled {
  try {
    return { script: new Script(code, { filename }), problem: null }
  } catch (error) {
    if (!(error instanceof Error) || error.name !== 'SyntaxError') throw error
    const escaped = filename.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const line = String(error.stack).match(new RegExp(`^${escaped}:(\\d+)`, 'm'))?.[1]
    return {
      script: null,
      problem: { message: error.message, line: line === undefined ? null : Number(line) }
    }
  }
}

/** Compiles without running anything; null when the code parses. */
export function compilePlugin(code: string, filename = 'plugin.js'): CompileProblem | null {
  return compile(code, filename).problem
}

let templateGlobals: ReturnType<typeof listTemplateGlobals> | null = null

/**
 * Global names a template may touch at the top level: every class of the MZ dictionary, every
 * `$game*`/`$data*` and other MZ global named in the template sources, and `window` and
 * `setTimeout`.
 */
export function listTemplateGlobals(): {
  names: string[]
  dictionary: number
  sources: number
  fixed: number
} {
  const dictionary = Object.keys(
    JSON.parse(readFileSync(repoPath('src/renderer/src/data/mz-classes.json'), 'utf8'))
  )
  const known = new Set(dictionary)
  const found = new Set<string>()
  const dir = repoPath('src/renderer/src/lib/generator/templates')
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.ts'))) {
    const text = readFileSync(join(dir, file), 'utf8')
    for (const pattern of SOURCE_PATTERNS) {
      for (const [name] of text.matchAll(pattern)) if (!known.has(name)) found.add(name)
    }
  }
  const sources = [...found].sort()
  return {
    names: [...dictionary, ...sources, ...FIXED_GLOBALS],
    dictionary: dictionary.length,
    sources: sources.length,
    fixed: FIXED_GLOBALS.length
  }
}

function bootstrap(mode: 'generator' | 'template'): string {
  if (mode === 'generator') return STUB_SOURCE
  templateGlobals ??= listTemplateGlobals()
  const names = `const NAMES = ${JSON.stringify(templateGlobals.names)};`
  return `(() => {${names}${STAND_IN_SOURCE}})();${STUB_SOURCE}`
}

function describeThrown(error: unknown): string {
  if (typeof error === 'object' && error !== null) {
    const { name, message } = error as { name?: unknown; message?: unknown }
    return `${String(name)}: ${String(message)}`
  }
  return String(error)
}

/**
 * Compiles `code`; on a syntax error returns it having run nothing. Otherwise runs it in a new
 * plain-object context holding the `PluginManager` stub (template mode adds a stand-in for every
 * name of `listTemplateGlobals()`), with a time limit. `sentinel` tells whether the code set
 * `__pwn` on the context's global; `context` is that global, holding only values created inside.
 */
export function evaluatePlugin(
  code: string,
  options: { mode: 'generator' | 'template'; filename?: string }
): EvaluationResult {
  const compiled = compile(code, options.filename ?? 'plugin.js')
  if (compiled.problem !== null) {
    return { compileProblem: compiled.problem, threw: null, sentinel: false, context: null }
  }
  const context: Record<string, unknown> = createContext({})
  new Script(bootstrap(options.mode), { filename: 'bootstrap.js' }).runInContext(context)
  let threw: string | null = null
  try {
    compiled.script.runInContext(context, { timeout: TIMEOUT_MS })
  } catch (error) {
    threw = describeThrown(error)
  }
  return { compileProblem: null, threw, sentinel: SENTINEL in context, context }
}
