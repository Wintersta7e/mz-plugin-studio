// The one observer of the MZ runtime test, installed as the first plugin of the copy at every
// level. In the game page it records what went wrong while the plugins loaded, then drives the
// game from the title to the map, saves, loads and reaches the map again, and keeps its report
// in a JSON script element the harness reads.
//
// The functions above `observerSource` run in the page, installed as their own text: they read
// every engine object as unknown and refer to nothing outside this group.

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
Title, new game, map, save, load, map again; `mark` hears each step as it is reached.
*/
async function drive(config: ObserverConfig, mark: (step: string) => void): Promise<void> {
  await reach('title', config.stepMs, () => isScene('Scene_Title'))
  mark('title')
  call(currentScene(), 'commandNewGame')
  await reach('map', config.stepMs, () => isScene('Scene_Map'))
  mark('map')
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
  reach,
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
  const isDone = field('isDone')
  if (
    typeof errorPrinter !== 'string' ||
    typeof isDone !== 'boolean' ||
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
    isDone,
    ...(failure !== undefined && { failure })
  }
}
