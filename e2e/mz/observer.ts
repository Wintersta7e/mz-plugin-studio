// The one observer of the MZ runtime test, installed as the first plugin of the copy at every
// level. In the game page it records what went wrong while the plugins loaded and what the
// observed case code computed, then drives the game from the title to the map, runs the common
// event the install appended, saves, loads and reaches the map again, and keeps its report in a
// JSON script element the harness reads.
//
// The functions above `observerSource` run in the page, installed as their own text: they read
// every engine object as unknown and refer to nothing outside this group.
import type { LoadRecord } from '../../tests/helpers/mz-conformance'

/**
Where the observer is defined, from the repository root: the harness installs no other.
*/
export const OBSERVER_MODULE = 'e2e/mz/observer.ts'

/**
The plugin name the observer is installed under.
*/
export const OBSERVER_PLUGIN = 'MzRuntimeObserver'

export interface ObserverConfig {
  /**
  Id of the element that holds the report.
  */
  reportId: string
  /**
  How long each step may take to be reached, in milliseconds.
  */
  stepMs: number
  saveSlot: number
  /**
  The global the observed case code pushes its records to.
  */
  observed: string
  /**
  The global a hostile payload sets when its code runs.
  */
  sentinel: string
}

export interface ObserverReport {
  /**
  Errors before the title scene started: thrown, logged, scripts that did not load.
  */
  loadErrors: string[]
  /**
  Errors from then on.
  */
  bootErrors: string[]
  /**
  The text of the engine's error printer when the observer finished.
  */
  errorPrinter: string
  /**
  The steps reached, in order.
  */
  steps: string[]
  /**
  Why the drive stopped short; absent when it reached the last step.
  */
  failure?: string
  /**
  What the observed case code recorded, `this` reduced to whether it was the interpreter.
  */
  records: LoadRecord['calls']
  /**
  Commands an event called that were registered under the name it called them by.
  */
  ran: string[]
  isSentinelSet: boolean
  isDone: boolean
}

function read(owner: unknown, key: string): unknown {
  return typeof owner === 'function' || (typeof owner === 'object' && owner !== null)
    ? Reflect.get(owner, key)
    : undefined
}

function call(owner: unknown, key: string, args: unknown[] = []): unknown {
  const method = read(owner, key)
  if (typeof method !== 'function') throw new TypeError(`the engine has no ${key}`)
  return Reflect.apply(method, owner, args)
}

function engine(name: string): unknown {
  return read(globalThis, name)
}

function currentScene(): unknown {
  return read(engine('SceneManager'), '_scene')
}

/**
True once the engine's current scene is a started `name` with no change pending.
*/
function isScene(name: string): boolean {
  const type = engine(name)
  const scene = currentScene()
  return (
    typeof type === 'function' &&
    scene instanceof type &&
    call(scene, 'isStarted') === true &&
    call(engine('SceneManager'), 'isSceneChanging') === false
  )
}

function printedError(): string {
  return document.querySelector('#errorPrinter')?.textContent ?? ''
}

function pathOf(url: string): string {
  try {
    return new URL(url).pathname
  } catch {
    return url
  }
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

/**
Passes `record` every console error, uncaught error, unhandled rejection and script that failed
to load, from now on.
*/
function watchErrors(record: (text: string) => void): void {
  const logError = console.error
  console.error = (...args: unknown[]): void => {
    record(`console.error: ${args.map(String).join(' ')}`)
    Reflect.apply(logError, console, args)
  }
  globalThis.addEventListener(
    'error',
    (event) => {
      const { target } = event
      if (target instanceof HTMLScriptElement) record(`failed to load: ${pathOf(target.src)}`)
      else if (event instanceof ErrorEvent) record(`uncaught: ${event.message}`)
    },
    { capture: true }
  )
  globalThis.addEventListener('unhandledrejection', (event) => {
    const reason: unknown = Reflect.get(event, 'reason')
    record(`unhandled rejection: ${messageOf(reason)}`)
  })
}

/**
Takes the records the observed case code pushes, and the name of each command an event calls
that is registered, from now on.
*/
function watchCalls(config: ObserverConfig, report: ObserverReport): void {
  Reflect.set(globalThis, config.observed, {
    push: (entry: unknown): void => {
      const where = read(entry, '0')
      const command = read(entry, '1')
      const constants = read(entry, '3')
      if (
        typeof where !== 'string' ||
        typeof constants !== 'string' ||
        (typeof command !== 'string' && command !== null)
      ) {
        throw new TypeError('the observed code pushed a record of another shape')
      }
      const interpreter = engine('Game_Interpreter')
      const isInterpreter =
        typeof interpreter === 'function' && read(entry, '2') instanceof interpreter
      report.records.push([where, command, isInterpreter, constants])
    }
  })
  const manager = engine('PluginManager')
  const callCommand = read(manager, 'callCommand')
  if (typeof manager !== 'function' || typeof callCommand !== 'function') {
    throw new TypeError('the engine has no PluginManager.callCommand')
  }
  Reflect.set(manager, 'callCommand', (...args: unknown[]): void => {
    const [, pluginName, commandName] = args
    const key = `${String(pluginName)}:${String(commandName)}`
    if (typeof read(read(manager, '_commands'), key) === 'function') {
      report.ran.push(String(commandName))
    }
    Reflect.apply(callCommand, manager, args)
  })
}

/**
Resolves once `isReached` holds, rejects naming `step` when the engine prints an error or
`stepMs` passes first.
*/
async function reach(step: string, stepMs: number, isReached: () => boolean): Promise<void> {
  const POLL_MS = 50
  const deadline = performance.now() + stepMs
  return new Promise((resolve, reject) => {
    const poll = (): void => {
      try {
        if (printedError() !== '') throw new Error('the engine printed an error')
        if (isReached()) {
          resolve()
          return
        }
        if (performance.now() > deadline) {
          throw new Error(`not reached within ${String(stepMs)} ms`)
        }
      } catch (error) {
        reject(new Error(`${step}: ${messageOf(error)}`))
        return
      }
      setTimeout(poll, POLL_MS)
    }
    poll()
  })
}

/**
Reserves the last common event, the one the install appended, and resolves once the map's
interpreter has taken it and finished.
*/
async function runEvent(config: ObserverConfig): Promise<void> {
  const length = read(engine('$dataCommonEvents'), 'length')
  if (typeof length !== 'number') throw new TypeError('the engine has no common events')
  call(engine('$gameTemp'), 'reserveCommonEvent', [length - 1])
  await reach(
    'commands',
    config.stepMs,
    () =>
      call(engine('$gameTemp'), 'isCommonEventReserved') === false &&
      call(engine('$gameMap'), 'isEventRunning') === false
  )
}

/**
Title, new game, map, the event, save, load, map again; `mark` hears each step as it is
reached.
*/
async function drive(config: ObserverConfig, mark: (step: string) => void): Promise<void> {
  await reach('title', config.stepMs, () => isScene('Scene_Title'))
  mark('title')
  call(currentScene(), 'commandNewGame')
  await reach('map', config.stepMs, () => isScene('Scene_Map'))
  mark('map')
  await runEvent(config)
  mark('commands')
  const map = currentScene()
  call(engine('$gameSystem'), 'onBeforeSave')
  await call(engine('DataManager'), 'saveGame', [config.saveSlot])
  mark('saved')
  await call(engine('DataManager'), 'loadGame', [config.saveSlot])
  mark('loaded')
  call(engine('SceneManager'), 'goto', [engine('Scene_Map')])
  await reach('map after load', config.stepMs, () => isScene('Scene_Map') && currentScene() !== map)
  mark('map after load')
}

export function mzObserver(config: ObserverConfig): void {
  const report: ObserverReport = {
    loadErrors: [],
    bootErrors: [],
    errorPrinter: '',
    steps: [],
    records: [],
    ran: [],
    isSentinelSet: false,
    isDone: false
  }
  const holder = document.createElement('script')
  holder.type = 'application/json'
  holder.id = config.reportId
  document.head.append(holder)
  const publish = (): void => {
    holder.textContent = JSON.stringify(report)
    if (report.isDone) holder.dataset['done'] = 'true'
  }
  watchErrors((text) => {
    ;(report.steps.length === 0 ? report.loadErrors : report.bootErrors).push(text)
    publish()
  })
  watchCalls(config, report)
  const finish = async (): Promise<void> => {
    try {
      await drive(config, (step) => {
        report.steps.push(step)
        publish()
      })
    } catch (error) {
      report.failure = messageOf(error)
    }
    report.errorPrinter = printedError()
    report.isSentinelSet = Reflect.has(globalThis, config.sentinel)
    report.isDone = true
    publish()
  }
  publish()
  void finish()
}

const IN_PAGE = [
  read,
  call,
  engine,
  currentScene,
  isScene,
  printedError,
  pathOf,
  messageOf,
  watchErrors,
  watchCalls,
  reach,
  runEvent,
  drive,
  mzObserver
]

/**
The observer plugin's text: the in-page functions as written here, then `mzObserver` called
with `config`.
*/
export function observerSource(config: ObserverConfig): string {
  const parts = IN_PAGE.map(String).join('\n\n')
  return `// ${OBSERVER_MODULE}\n(function () {\n'use strict';\n${parts}\n${mzObserver.name}(${JSON.stringify(config)});\n})();\n`
}

const isList = (value: unknown): value is readonly unknown[] => Array.isArray(value)
const isStrings = (value: unknown): value is string[] =>
  isList(value) && value.every((item) => typeof item === 'string')
const isRecord = (value: unknown): value is LoadRecord['calls'][number] =>
  isList(value) &&
  value.length === 4 &&
  typeof value[0] === 'string' &&
  (value[1] === null || typeof value[1] === 'string') &&
  typeof value[2] === 'boolean' &&
  typeof value[3] === 'string'
const isRecords = (value: unknown): value is LoadRecord['calls'] =>
  isList(value) && value.every((item) => isRecord(item))

/**
The report the observer published, from its element's text; throws on anything else.
*/
export function readReport(text: string): ObserverReport {
  const parsed: unknown = JSON.parse(text)
  const field = (key: string): unknown =>
    typeof parsed === 'object' && parsed !== null ? Reflect.get(parsed, key) : undefined
  const loadErrors = field('loadErrors')
  const bootErrors = field('bootErrors')
  const errorPrinter = field('errorPrinter')
  const steps = field('steps')
  const failure = field('failure')
  const records = field('records')
  const ran = field('ran')
  const isSentinelSet = field('isSentinelSet')
  const isDone = field('isDone')
  if (
    typeof errorPrinter !== 'string' ||
    typeof isDone !== 'boolean' ||
    typeof isSentinelSet !== 'boolean' ||
    !isRecords(records) ||
    !isStrings(ran) ||
    (failure !== undefined && typeof failure !== 'string') ||
    !isStrings(loadErrors) ||
    !isStrings(bootErrors) ||
    !isStrings(steps)
  ) {
    throw new TypeError('the observer published no report')
  }
  return {
    loadErrors,
    bootErrors,
    errorPrinter,
    steps,
    records,
    ran,
    isSentinelSet,
    isDone,
    ...(failure !== undefined && { failure })
  }
}
