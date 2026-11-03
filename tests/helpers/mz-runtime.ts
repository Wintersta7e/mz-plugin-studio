// What RPG Maker MZ does with a plugin once the game starts, as a test sees it: load the
// `$plugins` list, hand each plugin its stored parameters, and run a plugin command as an event
// does. `createMzShim` is the stand-in the suite runs on; a second implementation over a local
// MZ install compares against it.
import { Script, createContext } from 'vm'
import type { Context } from 'vm'
import { installStandIns } from './evaluate-plugin'

/** One entry of a game's plugin list; every stored value is a string. */
export interface MzPluginEntry {
  name: string
  status: boolean
  description: string
  parameters: Record<string, string>
}

export interface MzLoadReport {
  /** A plugin whose file is missing, or whose code threw or did not parse; loading went on. */
  errors: { name: string; message: string }[]
}

export interface MzRuntime {
  /** The global scope the plugins run in. */
  readonly context: Context
  /** The object a plugin command runs with as `this`, created inside the context. */
  readonly interpreter: object
  /** Loads `entries` in order; a plugin's code is `sources.get('js/plugins/<name>.js')`. */
  load(entries: readonly MzPluginEntry[], sources: ReadonlyMap<string, string>): MzLoadReport
  /** The parameters stored for the plugin `name`, `{}` when none. */
  parameters(name: string): Record<string, string>
  /**
   * Runs a plugin command as an event does, from its `[plugin, command, label, args]`; false
   * when no plugin registered that command.
   */
  runCommand(params: [string, string, string, Record<string, string>]): boolean
}

const TIMEOUT_MS = 2000

/** `sub/Foo` → `Foo`: a plugin is known by the last segment of its name. */
export const lastSegment = (name: string): string => name.slice(name.lastIndexOf('/') + 1)

export function describeThrown(error: unknown): string {
  if (typeof error === 'object' && error !== null) {
    const { name, message } = error as { name?: unknown; message?: unknown }
    return `${String(name)}: ${String(message)}`
  }
  return String(error)
}

/** Copies plain data into `context`, so the plugin reads values made in its own realm. */
export function intoContext<T>(context: Context, value: T): T {
  const text = JSON.stringify(JSON.stringify(value))
  // eslint-disable-next-line sonarjs/code-eval -- copies a value into the test runtime context as JSON
  return new Script(`JSON.parse(${text})`).runInContext(context) as T
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

interface Loader {
  store(name: string, parameters: Record<string, string>): void
  call(key: string, self: object, args: Record<string, string>): boolean
  interpreter: object
}

/** A fresh MZ stand-in: every MZ global a plugin may touch, and a plugin loader of our own. */
export function createMzShim(): MzRuntime {
  const context = createContext({})
  installStandIns(context)
  // eslint-disable-next-line sonarjs/code-eval -- runs the plugin loader in the test runtime context
  const loader = new Script(LOADER_SOURCE, { filename: 'loader.js' }).runInContext(
    context
  ) as Loader
  return {
    context,
    interpreter: loader.interpreter,
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
      const found = (context.PluginManager as { parameters(n: string): unknown }).parameters(name)
      return JSON.parse(JSON.stringify(found)) as Record<string, string>
    },
    runCommand([plugin, command, , args]) {
      const key = `${lastSegment(plugin)}:${command}`
      return loader.call(key, loader.interpreter, intoContext(context, args))
    }
  }
}
