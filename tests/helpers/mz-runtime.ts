// What RPG Maker MZ does with a plugin once the game starts, as a test sees it: load the
// `$plugins` list, hand each plugin its stored parameters, and run a plugin command as an event
// does. `createMzShim` is the stand-in the suite runs on; a second implementation over a local
// MZ install compares against it.
import { Script, createContext, type Context } from 'node:vm'
import { installStandIns } from './evaluate-plugin'

/**
One entry of a game's plugin list; every stored value is a string.
*/
export interface MzPluginEntry {
  name: string
  status: boolean
  description: string
  parameters: Record<string, string>
}

export interface MzLoadReport {
  /**
  A plugin whose file is missing, or whose code threw or did not parse; loading went on.
  */
  errors: { name: string; message: string }[]
}

export interface MzRuntime {
  /**
  The global scope the plugins run in.
  */
  readonly context: Context
  /**
  The object a plugin command runs with as `this`, created inside the context.
  */
  readonly interpreter: object
  /**
  Loads `entries` in order; a plugin's code is `sources.get('js/plugins/<name>.js')`.
  */
  load(entries: readonly MzPluginEntry[], sources: ReadonlyMap<string, string>): MzLoadReport
  /**
  The parameters stored for the plugin `name`, `{}` when none.
  */
  parameters(name: string): Record<string, string>
  /**
  Runs a plugin command as an event does, from its `[plugin, command, label, args]`; false
  when no plugin registered that command.
  */
  runCommand(params: [string, string, string, Record<string, string>]): boolean
}

const TIMEOUT_MS = 2000

/**
`sub/Foo` → `Foo`: a plugin is known by the last segment of its name.
*/
export const lastSegment = (name: string): string => name.slice(name.lastIndexOf('/') + 1)

export function describeThrown(error: unknown): string {
  if (typeof error === 'object' && error !== null) {
    const { name, message } = error as { name?: unknown; message?: unknown }
    return `${String(name)}: ${String(message)}`
  }
  return String(error)
}

/**
Copies plain data into `context`, so the plugin reads values made in its own realm.
*/
export function intoContext(context: Context, value: unknown): unknown {
  const text = JSON.stringify(JSON.stringify(value))
  // eslint-disable-next-line sonarjs/code-eval -- copies a value into the test runtime context as JSON
  return new Script(`JSON.parse(${text})`).runInContext(context)
}

type Method = (...args: unknown[]) => unknown

function hasMethods<K extends string>(
  value: unknown,
  names: readonly K[]
): value is Record<K, Method> {
  return (
    ((typeof value === 'object' && value !== null) || typeof value === 'function') &&
    names.every((name) => typeof Reflect.get(value, name) === 'function')
  )
}

/**
`value`, a script's object, with the methods `names` the test calls; throws when one is missing.
*/
export function requireMethods<K extends string>(
  value: unknown,
  what: string,
  ...names: K[]
): Record<K, Method> {
  if (!hasMethods(value, names)) throw new TypeError(`${what} lacks one of: ${names.join(', ')}`)
  return value
}

/**
Parameters read in a script's realm, copied out as the string record MZ stores; throws on any
other shape.
*/
export function parametersFrom(value: unknown): Record<string, string> {
  const copy: unknown = structuredClone(value)
  if (typeof copy !== 'object' || copy === null) throw new TypeError('parameters are not an object')
  const parameters: Record<string, string> = {}
  for (const [key, item] of Object.entries(copy)) {
    if (typeof item !== 'string') throw new TypeError(`parameter ${key} is not a string`)
    parameters[key] = item
  }
  return parameters
}

// Runs inside the context. Parameters are stored under the plugin's name in lower case and
// found in any letter case; commands are stored under `plugin:command` exactly, a later
// registration replacing an earlier one, and a command nobody registered does nothing.
const LOADER_SOURCE = `
(() => {
  const stored = Object.create(null);
  const commands = Object.create(null);
  globalThis.PluginManager = {
    parameters(name) {
      return stored[String(name).toLowerCase()] || {};
    },
    registerCommand(pluginName, commandName, fn) {
      commands[pluginName + ':' + commandName] = fn;
    }
  };
  return {
    store(name, parameters) {
      stored[name.toLowerCase()] = parameters;
    },
    call(key, self, args) {
      const fn = commands[key];
      if (typeof fn !== 'function') return false;
      fn.call(self, args);
      return true;
    },
    interpreter: {}
  };
})();
`

/**
A fresh MZ stand-in: every MZ global a plugin may touch, and a plugin loader of our own.
*/
export function createMzShim(): MzRuntime {
  const context = createContext({})
  installStandIns(context)
  // eslint-disable-next-line sonarjs/code-eval -- runs the plugin loader in the test runtime context
  const loaded: unknown = new Script(LOADER_SOURCE, { filename: 'loader.js' }).runInContext(context)
  const loader = requireMethods(loaded, 'the plugin loader', 'store', 'call')
  const interpreter: unknown = Reflect.get(loader, 'interpreter')
  if (typeof interpreter !== 'object' || interpreter === null) {
    throw new TypeError('the plugin loader has no interpreter')
  }
  return {
    context,
    interpreter,
    load(entries, sources) {
      const errors: MzLoadReport['errors'] = []
      const loaded = new Set<string>()
      for (const entry of entries) {
        if (!entry.status || loaded.has(entry.name)) continue
        loaded.add(entry.name)
        loader.store(lastSegment(entry.name), intoContext(context, entry.parameters))
        const path = `js/plugins/${entry.name}.js`
        const source = sources.get(path)
        if (source === undefined) {
          errors.push({ name: entry.name, message: `Failed to load: ${path}` })
          continue
        }
        try {
          // eslint-disable-next-line sonarjs/code-eval -- runs a plugin script in the test runtime context
          new Script(source, { filename: path }).runInContext(context, { timeout: TIMEOUT_MS })
        } catch (error) {
          errors.push({ name: entry.name, message: describeThrown(error) })
        }
      }
      return { errors }
    },
    parameters(name) {
      const { PluginManager: manager }: Record<string, unknown> = context
      const found = requireMethods(manager, 'PluginManager', 'parameters').parameters(name)
      return parametersFrom(found)
    },
    runCommand([plugin, command, , args]) {
      const key = `${lastSegment(plugin)}:${command}`
      return loader.call(key, interpreter, intoContext(context, args)) === true
    }
  }
}
