// `MzRuntime` over a local RPG Maker MZ install's own core scripts, read at run time from the
// directory a developer names: the real plugin loader, parameter store and plugin command, so
// the suite's stand-in can be compared with what MZ does. Nothing of the install is kept here;
// this file holds only what a browser would give those scripts, written for the test.
import { existsSync, readFileSync } from 'fs'
import { join } from 'path'
import { Script, createContext } from 'vm'
import type { Context } from 'vm'
import { installStandIns, listTemplateGlobals } from './evaluate-plugin'
import { describeThrown, intoContext } from './mz-runtime'
import type { MzLoadReport, MzRuntime } from './mz-runtime'

export const CORESCRIPT_FILES = ['rmmz_core.js', 'rmmz_managers.js', 'rmmz_objects.js'] as const

const TIMEOUT_MS = 2000

const compiled = new Map<string, Script[]>()

function coreScripts(dir: string): Script[] {
  let scripts = compiled.get(dir)
  if (scripts === undefined) {
    scripts = CORESCRIPT_FILES.map((file) => {
      const path = join(dir, file)
      if (!existsSync(path)) throw new Error(`MZ core script not found: ${file}`)
      return new Script(readFileSync(path, 'utf8'), { filename: file })
    })
    compiled.set(dir, scripts)
  }
  return scripts
}

/** The header line of the install's `rmmz_managers.js` that gives its name and version. */
export function corescriptVersion(dir: string): string {
  const path = join(dir, 'rmmz_managers.js')
  if (!existsSync(path)) throw new Error('MZ core script not found: rmmz_managers.js')
  const header = readFileSync(path, 'utf8')
    .split(/\r?\n/, 10)
    .find((line) => /^\/\/\s*rmmz_managers\.js\b/.test(line))
  if (header === undefined) throw new Error('rmmz_managers.js has no version header line')
  return header
}

interface Host {
  /** Runs the script an element stands for; `onerror` is called when there is none. */
  append(script: { src?: unknown; onerror?: unknown }): void
}

// Runs inside the context before the core scripts: a stand-in that answers every read, call and
// construction with another stand-in (the rendering library, and anything a canvas draws with),
// and a document whose elements are plain objects and whose body runs an appended script.
const BROWSER_SOURCE = `
(host) => {
  const make = () => new Proxy(function () {}, {
    get: () => make(),
    set: () => true,
    apply: () => make(),
    construct: () => make(),
    defineProperty: () => true,
    deleteProperty: () => true
  });
  globalThis.PIXI = make();
  globalThis.document = {
    createElement: () => ({ style: {}, getContext: () => make() }),
    body: { appendChild: (element) => { host.append(element); return element; } }
  };
}
`

// Runs inside the context after the core scripts: whether each MZ global name is defined, read
// through its binding so a class or let declaration counts as well as a property.
let definedSource: Script | null = null
function definedNames(): Script {
  if (definedSource === null) {
    const names = listTemplateGlobals().names
    const reads = names.map(
      (n) => `${JSON.stringify(n)}: typeof ${n} === 'undefined' ? undefined : ${n}`
    )
    definedSource = new Script(`({${reads.join(',')}})`, { filename: 'defined.js' })
  }
  return definedSource
}

// Wraps registerCommand so a command that runs is seen to run; the key MZ stores it under and
// the lookup of a plugin command stay MZ's own.
const OBSERVE_SOURCE = `
(() => {
  const register = PluginManager.registerCommand;
  const state = { ran: false };
  PluginManager.registerCommand = function (pluginName, commandName, fn) {
    const observed = typeof fn === 'function'
      ? function () { state.ran = true; return fn.apply(this, arguments); }
      : fn;
    return register.call(this, pluginName, commandName, observed);
  };
  return state;
})();
`

/**
 * A fresh context with the install's core scripts loaded from `dir`, a stand-in for every MZ
 * global they leave undefined, and a plugin command interpreter of MZ's own.
 */
export function createMzCorescript(dir: string): MzRuntime {
  const scripts = coreScripts(dir)
  const context: Context = createContext({})
  let sources: ReadonlyMap<string, string> = new Map()
  let errors: MzLoadReport['errors'] = []
  /** Indexes into `errors` of the scripts that were not found */
  const failed: number[] = []
  const host: Host = {
    append(element) {
      const url = String(element.src)
      const path = decodeURIComponent(url)
      const name = path.replace(/^js\/plugins\//, '').replace(/\.js$/, '')
      const source = sources.get(path)
      if (source === undefined) {
        failed.push(errors.push({ name, message: '' }) - 1)
        if (typeof element.onerror === 'function') {
          ;(element.onerror as (event: object) => void)({ target: element })
        }
        return
      }
      try {
        new Script(source, { filename: path }).runInContext(context, { timeout: TIMEOUT_MS })
      } catch (error) {
        errors.push({ name, message: describeThrown(error) })
      }
    }
  }
  ;(new Script(BROWSER_SOURCE).runInContext(context) as (h: Host) => void)(host)
  for (const script of scripts) script.runInContext(context, { timeout: TIMEOUT_MS })
  const real = definedNames().runInContext(context) as Record<string, unknown>
  installStandIns(context)
  for (const [name, value] of Object.entries(real)) {
    if (value !== undefined) context[name] = value
  }
  const state = new Script(OBSERVE_SOURCE).runInContext(context) as { ran: boolean }
  const manager = context.PluginManager as {
    setup(plugins: unknown): void
    parameters(name: string): unknown
    checkErrors(): void
  }
  const interpreter = new Script('new Game_Interpreter()').runInContext(context) as {
    command357(params: unknown): unknown
  }

  return {
    context,
    interpreter,
    load(entries, given) {
      sources = given
      errors = []
      failed.length = 0
      manager.setup(intoContext(context, entries))
      // Each script that was not found is reported by the loader's own error check, in order
      for (const index of failed) {
        try {
          manager.checkErrors()
          errors[index].message = 'not reported by the loader'
        } catch (error) {
          errors[index].message = String((error as { message?: unknown }).message)
        }
      }
      return { errors }
    },
    parameters(name) {
      return JSON.parse(JSON.stringify(manager.parameters(name))) as Record<string, string>
    },
    runCommand(params) {
      state.ran = false
      interpreter.command357(intoContext(context, params))
      return state.ran
    }
  }
}
