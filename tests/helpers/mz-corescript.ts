// `MzRuntime` over a local RPG Maker MZ install's own core scripts, read at run time from the
// directory a developer names: the real plugin loader, parameter store and plugin command, so
// the suite's stand-in can be compared with what MZ does. Nothing of the install is kept here;
// this file holds only what a browser would give those scripts, written for the test.
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { Script, createContext, type Context } from 'node:vm'
import { installStandIns, listTemplateGlobals } from './evaluate-plugin'
import {
  describeThrown,
  intoContext,
  parametersFrom,
  requireMethods,
  type MzLoadReport,
  type MzRuntime
} from './mz-runtime'

export const CORESCRIPT_FILES = ['rmmz_core.js', 'rmmz_managers.js', 'rmmz_objects.js'] as const

const TIMEOUT_MS = 2000

const compiled = new Map<string, Script[]>()

function coreScripts(directory: string): Script[] {
  let scripts = compiled.get(directory)
  if (scripts === undefined) {
    scripts = CORESCRIPT_FILES.map((file) => {
      const scriptPath = path.join(directory, file)
      if (!existsSync(scriptPath)) throw new Error(`MZ core script not found: ${file}`)
      // eslint-disable-next-line sonarjs/code-eval -- compiles a local engine script for the test runtime
      return new Script(readFileSync(scriptPath, 'utf8'), { filename: file })
    })
    compiled.set(directory, scripts)
  }
  return scripts
}

/**
The header line of the install's `rmmz_managers.js` that gives its name and version.
*/
export function corescriptVersion(directory: string): string {
  const managers = path.join(directory, 'rmmz_managers.js')
  if (!existsSync(managers)) throw new Error('MZ core script not found: rmmz_managers.js')
  const header = readFileSync(managers, 'utf8')
    .split(/\r?\n/, 10)
    .find((line) => /^\/\/\s*rmmz_managers\.js\b/.test(line))
  if (header === undefined) throw new Error('rmmz_managers.js has no version header line')
  return header
}

interface Host {
  /**
  Runs the script an element stands for; `onerror` is called when there is none.
  */
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
const probe: { definedSource: Script | null } = { definedSource: null }
function definedNames(): Script {
  if (probe.definedSource === null) {
    const names = listTemplateGlobals().names
    const reads = names.map(
      (n) => `${JSON.stringify(n)}: typeof ${n} === 'undefined' ? undefined : ${n}`
    )
    // eslint-disable-next-line sonarjs/code-eval -- compiles the defined-names probe for the test runtime
    probe.definedSource = new Script(`({${reads.join(',')}})`, { filename: 'defined.js' })
  }
  return probe.definedSource
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
Installs the stand-ins, keeping every MZ global the core scripts in `context` define.
*/
function installStandInsAround(context: Context): void {
  const real: unknown = definedNames().runInContext(context)
  if (typeof real !== 'object' || real === null) {
    throw new TypeError('the defined-names probe failed')
  }
  installStandIns(context)
  for (const name of Object.keys(real)) {
    const value: unknown = Reflect.get(real, name)
    if (value !== undefined) context[name] = value
  }
}

/**
The message of an error thrown in another realm, where `instanceof Error` does not hold
*/
function messageOf(error: unknown): string {
  return String(typeof error === 'object' && error !== null ? Reflect.get(error, 'message') : error)
}

/**
A fresh context with the install's core scripts loaded from `directory`, a stand-in for every MZ
global they leave undefined, and a plugin command interpreter of MZ's own.
*/
export function createMzCorescript(directory: string): MzRuntime {
  const scripts = coreScripts(directory)
  const context: Context = createContext({})
  let sources: ReadonlyMap<string, string> = new Map()
  let errors: MzLoadReport['errors'] = []
  /**
  The entries of `errors` for the scripts that were not found
  */
  const failed: MzLoadReport['errors'] = []
  const host: Host = {
    append(element) {
      const url = String(element.src)
      const file = decodeURIComponent(url)
      const name = file.replace(/^js\/plugins\//, '').replace(/\.js$/, '')
      const source = sources.get(file)
      if (source === undefined) {
        const missing = { name, message: '' }
        errors.push(missing)
        failed.push(missing)
        const { onerror } = element
        if (typeof onerror === 'function') Reflect.apply(onerror, undefined, [{ target: element }])
        return
      }
      try {
        // eslint-disable-next-line sonarjs/code-eval -- runs a local engine script in the test runtime context
        new Script(source, { filename: file }).runInContext(context, { timeout: TIMEOUT_MS })
      } catch (error) {
        errors.push({ name, message: describeThrown(error) })
      }
    }
  }
  // eslint-disable-next-line sonarjs/code-eval -- runs the browser shim in the test runtime context
  const installBrowser: unknown = new Script(BROWSER_SOURCE).runInContext(context)
  if (typeof installBrowser !== 'function') throw new TypeError('the browser stand-in did not load')
  Reflect.apply(installBrowser, undefined, [host])
  for (const script of scripts) script.runInContext(context, { timeout: TIMEOUT_MS })
  installStandInsAround(context)
  // eslint-disable-next-line sonarjs/code-eval -- reads the observed state from the test runtime context
  const state: unknown = new Script(OBSERVE_SOURCE).runInContext(context)
  if (typeof state !== 'object' || state === null)
    throw new TypeError('the command observer failed')
  const { PluginManager }: Record<string, unknown> = context
  const manager = requireMethods(
    PluginManager,
    'PluginManager',
    'setup',
    'parameters',
    'checkErrors'
  )
  const interpreter = requireMethods(
    new Script('new Game_Interpreter()').runInContext(context),
    'Game_Interpreter',
    'command357'
  )

  return {
    context,
    interpreter,
    load(entries, given) {
      sources = given
      errors = []
      failed.length = 0
      manager.setup(intoContext(context, entries))
      // Each script that was not found is reported by the loader's own error check, in order
      for (const missing of failed) {
        try {
          manager.checkErrors()
          missing.message = 'not reported by the loader'
        } catch (error) {
          missing.message = messageOf(error)
        }
      }
      return { errors }
    },
    parameters(name) {
      return parametersFrom(manager.parameters(name))
    },
    runCommand(params) {
      Reflect.set(state, 'ran', false)
      interpreter.command357(intoContext(context, params))
      return Reflect.get(state, 'ran') === true
    }
  }
}
