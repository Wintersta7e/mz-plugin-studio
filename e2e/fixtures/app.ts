// The only module that launches the app. Plain functions, callable outside a Playwright test,
// wrapped below as the `twin` and `release` fixtures: a fresh profile per launch, native dialogs
// answered from per-method queues (twin), and a bounded teardown that kills the process tree
// before deleting files.
import { execFile, spawn, type ChildProcess } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs'
import path from 'node:path'
import { setTimeout as sleep } from 'node:timers/promises'
import {
  _electron,
  test as base,
  expect,
  type Browser,
  type BrowserType,
  type ElectronApplication,
  type Page
} from '@playwright/test'
import type { API } from '../../src/shared/ipc-types'
import { copyFixtureProject } from '../../tests/helpers/fixture-project'

export interface Artifacts {
  release: string
  twin: string
  // Each build's fuse wire as the prepare step read it
  releaseWire: Record<string, unknown>
  twinWire: Record<string, unknown>
}

export interface LaunchedApp {
  app: ElectronApplication
  page: Page
  userDataDir: string
  pageErrors: string[]
  failedRequests: string[]
}

/**
One event of a raw DevTools protocol connection; `sessionId` names the attached target
*/
export interface CdpEvent {
  method: string
  params: Record<string, unknown>
  sessionId?: string
}

/**
A DevTools protocol connection of its own, which also sees the targets attached below a page
*/
export interface Cdp {
  send(method: string, params?: object, sessionId?: string): Promise<Record<string, unknown>>
  on(listener: (event: CdpEvent) => void): void
  close(): void
}

export interface LaunchedRelease {
  browser: Browser
  page: Page
  cdp: Cdp
  userDataDir: string
  pageErrors: string[]
  /**
  A fresh copy of the fixture project, deleted at teardown
  */
  fixtureProject(leaf?: string): Promise<string>
  /**
  Kills the process tree, waits for it and only then deletes the launch's directories
  */
  close(): Promise<void>
}

export type DialogMethod =
  | 'showOpenDialog'
  | 'showSaveDialog'
  | 'showMessageBox'
  | 'showMessageBoxSync'

/**
A message-box answer: the box's cancelId, the one other button of two, or a button index
*/
export type ButtonAnswer = 'cancel' | 'confirm' | number

export interface DialogAnswers {
  showOpenDialog: { canceled: boolean; filePaths: string[] }
  showSaveDialog: { canceled: boolean; filePath?: string }
  showMessageBox: ButtonAnswer
  showMessageBoxSync: ButtonAnswer
}

export interface DialogCall {
  method: DialogMethod
  options: unknown
  error?: string
}

/**
A file written in the main process just before the dialog answers
*/
export interface WriteBefore {
  path: string
  content: string
}

// One queued answer of the dialog stub
interface QueuedAnswer {
  answer: unknown
  writeBefore: WriteBefore | undefined
}

// The dialog stub's queues and records, kept in the main process
interface DialogState {
  queues: Partial<Record<DialogMethod, QueuedAnswer[]>>
  calls: DialogCall[]
  uncaught: string[]
}

declare global {
  // The preload script's bridge, as callbacks evaluated in the renderer see it
  var api: API
  // The dialog stub's state, as callbacks evaluated in the main process see it
  var e2eDialogs: DialogState | undefined
}

// No host name resolves, so the app runs as it would with no network
export const OFFLINE_ARGS = ['--host-resolver-rules=MAP * ~NOTFOUND']

// Fixed arguments of every twin launch
export const TWIN_ARGS = [
  '--force-device-scale-factor=1',
  '--force-prefers-reduced-motion',
  ...OFFLINE_ARGS
]

// How long teardown lets the app close itself before it kills the process tree
export const TEARDOWN_BOUND_MS = 10_000

// Main-process global holding the dialog stub's queues and records
const DIALOG_STATE = 'e2eDialogs' satisfies keyof typeof globalThis

interface Launch {
  // Removed at teardown, after the process tree is gone
  directories: string[]
  done: boolean
  // Held from the launch on: Playwright stops answering `app.process()` once the app closed
  child: ChildProcess
}

const launches = new Map<ElectronApplication, Launch>()

/**
True for any object, so parsed JSON can be read key by key
*/
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

/**
True for any array, whose items are then read as unknown
*/
export function isList(value: unknown): value is unknown[] {
  return Array.isArray(value)
}

/**
The value under `key` when `value` is an object, else undefined
*/
export function field(value: unknown, key: string): unknown {
  return isRecord(value) ? value[key] : undefined
}

/**
The one item of `items`; throws when it holds none or more than one
*/
export function only<T>(items: readonly T[]): T {
  const [item, ...rest] = items
  if (item === undefined || rest.length > 0) {
    throw new Error(`expected one item, got ${String(items.length)}`)
  }
  return item
}

/**
Reads the manifest `npm run e2e:prepare` writes, from the repository root
*/
export function readArtifacts(): Artifacts {
  const manifest = path.join(process.cwd(), 'dist', 'e2e-artifacts.json')
  if (!existsSync(manifest)) {
    throw new Error(`no ${manifest}: run npm run e2e:prepare first`)
  }
  const parsed: unknown = JSON.parse(readFileSync(manifest, 'utf8'))
  const release = field(parsed, 'release')
  const twin = field(parsed, 'twin')
  const releaseWire = field(parsed, 'releaseWire')
  const twinWire = field(parsed, 'twinWire')
  if (
    typeof release !== 'string' ||
    typeof twin !== 'string' ||
    !isRecord(releaseWire) ||
    !isRecord(twinWire)
  ) {
    throw new Error(`${manifest} is not an artifact manifest: run npm run e2e:prepare again`)
  }
  return { release, twin, releaseWire, twinWire }
}

/**
The run's temp root, created by the global setup
*/
export function runRoot(): string {
  const { E2E_RUN_ROOT: root = '' } = process.env
  if (root === '')
    throw new Error('E2E_RUN_ROOT is unset: run the suite through its Playwright config')
  return root
}

/**
True when `target` is `root` or lies below it
*/
export function isWithin(target: string, root: string): boolean {
  const fromRoot = path.relative(root, target)
  return !fromRoot.startsWith('..') && !path.isAbsolute(fromRoot)
}

export async function launchTwin(
  options: { userDataDir?: string; args?: string[] } = {}
): Promise<LaunchedApp> {
  const { twin } = readArtifacts()
  const directories: string[] = []
  let userDataDirectory = options.userDataDir
  if (userDataDirectory === undefined) {
    userDataDirectory = mkdtempSync(path.join(runRoot(), 'profile-'))
    directories.push(userDataDirectory)
  }
  let app: ElectronApplication
  try {
    app = await _electron.launch({
      executablePath: twin,
      args: [`--user-data-dir=${userDataDirectory}`, ...TWIN_ARGS, ...(options.args ?? [])],
      chromiumSandbox: true
    })
  } catch (error) {
    for (const directory of directories) rmSync(directory, { recursive: true, force: true })
    throw error
  }
  launches.set(app, { directories, done: false, child: app.process() })

  const pageErrors: string[] = []
  const failedRequests: string[] = []
  const watched = new WeakSet<Page>()
  const watch = (page: Page): void => {
    if (watched.has(page)) return
    watched.add(page)
    page.on('pageerror', (error) => {
      pageErrors.push(error.message)
    })
    page.on('requestfailed', (request) => {
      failedRequests.push(`${request.url()}: ${request.failure()?.errorText ?? 'failed'}`)
    })
  }
  app.on('window', watch)
  for (const page of app.windows()) watch(page)
  await app.context().tracing.start({ screenshots: true, snapshots: true })
  const page = await app.firstWindow()
  watch(page)
  await page.waitForLoadState('domcontentloaded')
  return { app, page, userDataDir: userDataDirectory, pageErrors, failedRequests }
}

/**
Replaces the main process's native dialogs with stubs answering from per-method queues. The
app calls `dialog.<method>` at call time, so replacing the module's properties reaches it.
*/
export async function stubDialogs(app: ElectronApplication): Promise<void> {
  await app.evaluate(({ dialog }, key) => {
    interface Box {
      buttons?: string[]
      cancelId?: number
    }
    const state: DialogState = { queues: {}, calls: [], uncaught: [] }
    Reflect.set(globalThis, key, state)
    const fs = process.getBuiltinModule('node:fs')

    // Callers pass (window, options) or (options): the options come last
    const answer = (
      method: DialogMethod,
      args: unknown[],
      resolve = (raw: unknown): unknown => raw
    ): unknown => {
      const options = args.at(-1)
      try {
        const entry = state.queues[method]?.shift()
        if (entry === undefined) throw new Error(`e2e dialog stub: empty queue for ${method}`)
        const value = resolve(entry.answer)
        if (entry.writeBefore) fs.writeFileSync(entry.writeBefore.path, entry.writeBefore.content)
        state.calls.push({ method, options })
        return value
      } catch (error) {
        state.calls.push({ method, options, error: String(error) })
        throw error
      }
    }
    const button =
      (method: DialogMethod, args: unknown[]) =>
      (raw: unknown): number => {
        if (typeof raw === 'number') return raw
        const { buttons = [], cancelId } = (args.at(-1) ?? {}) as Box
        if (cancelId === undefined) {
          throw new Error(`e2e dialog stub: ${method} answered ${String(raw)}, but has no cancelId`)
        }
        if (raw === 'cancel') return cancelId
        if (buttons.length !== 2) {
          throw new Error(
            `e2e dialog stub: ${method} confirmed with ${String(buttons.length)} buttons, not 2`
          )
        }
        return cancelId === 0 ? 1 : 0
      }

    // A throwing answer rejects the returned promise
    Object.assign(dialog, {
      showOpenDialog: async (...args: unknown[]) =>
        Promise.try(() => answer('showOpenDialog', args)),
      showSaveDialog: async (...args: unknown[]) =>
        Promise.try(() => answer('showSaveDialog', args)),
      showMessageBox: async (...args: unknown[]) =>
        Promise.try(() => ({
          response: answer('showMessageBox', args, button('showMessageBox', args)),
          checkboxChecked: false
        })),
      showMessageBoxSync: (...args: unknown[]) =>
        answer('showMessageBoxSync', args, button('showMessageBoxSync', args))
    })
    // Recorded instead of Electron's own error box
    process.on('uncaughtException', (error) => {
      state.uncaught.push(String(error.stack ?? error))
    })
  }, DIALOG_STATE)
}

export async function queueDialog<M extends DialogMethod>(
  app: ElectronApplication,
  method: M,
  answer: DialogAnswers[M],
  writeBefore?: WriteBefore
): Promise<void> {
  const isQueued = await app.evaluate(
    (_electron, { method, entry }) => {
      const state = globalThis.e2eDialogs
      if (state === undefined) return false
      const queue: QueuedAnswer[] = state.queues[method] ?? []
      queue.push(entry)
      state.queues[method] = queue
      return true
    },
    { method, entry: { answer, writeBefore } }
  )
  if (!isQueued) throw new Error('e2e dialog stub: queueDialog before stubDialogs')
}

export async function dialogCalls(app: ElectronApplication): Promise<DialogCall[]> {
  return app.evaluate(() => globalThis.e2eDialogs?.calls ?? [])
}

/**
Fails naming every dialog method that was called on an empty queue, failed to answer or kept
unused answers, and every uncaught main-process error; then clears them, so each is reported
once.
*/
export async function assertDialogsDrained(app: ElectronApplication): Promise<void> {
  const problems = await app.evaluate(() => {
    const state = globalThis.e2eDialogs
    if (state === undefined) return []
    const found: string[] = []
    for (const { method, error } of state.calls) {
      if (error !== undefined) found.push(`${method}: ${error}`)
    }
    for (const [method, queue] of Object.entries(state.queues)) {
      if (queue.length > 0) found.push(`${method}: ${String(queue.length)} unused answer(s)`)
    }
    for (const error of state.uncaught) found.push(`uncaught in main: ${error}`)
    state.calls = state.calls.filter(({ error }) => error === undefined)
    state.queues = {}
    state.uncaught = []
    return found
  })
  if (problems.length > 0) throw new Error(`e2e dialogs not drained:\n  ${problems.join('\n  ')}`)
}

export async function openProject(
  app: ElectronApplication,
  page: Page,
  projectPath: string,
  { expectLoaded = true }: { expectLoaded?: boolean } = {}
): Promise<void> {
  await queueDialog(app, 'showOpenDialog', { canceled: false, filePaths: [projectPath] })
  await page.getByTestId('open-project').click()
  if (expectLoaded) {
    await expect(page.getByTestId('status-project')).toContainText(projectTitle(projectPath))
  }
}

/**
The game title the status bar shows once the project is open
*/
export function projectTitle(projectPath: string): string {
  const system = path.join(projectPath, 'data', 'System.json')
  const title = field(JSON.parse(readFileSync(system, 'utf8')), 'gameTitle')
  if (typeof title !== 'string') throw new TypeError(`${system} names no game title`)
  return title
}

/**
A fresh copy of the fixture project, deleted at the app's teardown
*/
export async function fixtureProjectFor(app: ElectronApplication, leaf?: string): Promise<string> {
  const launch = launches.get(app)
  if (launch === undefined) throw new Error('fixtureProjectFor: the app was not launched here')
  const project = await copyFixtureProject(leaf)
  launch.directories.push(path.dirname(project))
  return project
}

/**
Opens a fresh copy of the fixture project; the copy is deleted at the app's teardown
*/
export async function loadFixtureProject(
  app: ElectronApplication,
  page: Page,
  leaf?: string
): Promise<string> {
  const project = await fixtureProjectFor(app, leaf)
  await openProject(app, page, project)
  return project
}

export const pluginsDirectory = (project: string): string => path.join(project, 'js', 'plugins')

export const mtimeNs = (file: string): bigint => statSync(file, { bigint: true }).mtimeNs

/**
Lets every window unload without the unsaved-changes prompt, so a reload goes through
*/
export async function allowUnload(app: ElectronApplication): Promise<void> {
  await app.evaluate(({ BrowserWindow }) => {
    for (const window of BrowserWindow.getAllWindows()) {
      window.webContents.on('will-prevent-unload', (event) => {
        event.preventDefault()
      })
    }
  })
}

/**
Waits until the renderer has handled every reply main sent before now: replies travel in
order, so the answer to a later round trip arrives after them. The app drops a save shortcut
pressed while an earlier save is still running.
*/
export async function settle(page: Page): Promise<void> {
  await page.evaluate(async () => globalThis.api.window.isMaximized())
}

export async function save(page: Page): Promise<void> {
  await settle(page)
  await page.keyboard.press('Control+s')
}

/**
Saves and waits until the file's modification time moves past `before`
*/
export async function saveAndWaitForWrite(page: Page, file: string): Promise<void> {
  const before = mtimeNs(file)
  await save(page)
  await expect.poll(() => mtimeNs(file) > before).toBe(true)
}

/**
Opens a new plugin and waits until the previous tab's editor has left the page. That editor
fades out before the new one mounts, the only one on the page meanwhile: text filled into it
is lost when it goes.
*/
export async function newPlugin(page: Page): Promise<void> {
  // The main area holds one view at a time: the active tab's editor or the screen without one
  const leaving = await page.getByRole('main').locator(':scope > *').elementHandles()
  await page.getByTestId('new-plugin').click()
  // Detached counts as hidden; a fading element at any opacity still counts as visible
  for (const element of leaving) await element.waitForElementState('hidden')
}

/**
Opens a project plugin from the Plugin Browser and waits until its tab is the active one
*/
export async function openFromBrowser(page: Page, file: string): Promise<void> {
  const panel = page.getByTestId('plugin-browser-panel')
  if (!(await panel.isVisible())) await page.getByTestId('plugin-browser-toggle').click()
  // A row reads the file name without `.js` first; fixture names are plain word characters
  const row = panel
    .getByTestId('plugin-browser-row')
    .filter({ hasText: new RegExp(String.raw`^${file.replace(/\.js$/, '')}(?!\w)`) })
  await row.click()
  await expect(row).toHaveAttribute('aria-current', 'page')
}

/**
The accessible name of every open tab, in order: the plugin's name, marked when unsaved
*/
export async function tabNames(page: Page): Promise<(string | null)[]> {
  return page.getByTestId('plugin-tab').evaluateAll((tabs) => tabs.map((tab) => tab.ariaLabel))
}

const isRunning = (child: ChildProcess): boolean =>
  child.exitCode === null && child.signalCode === null

// The code of a failed system call, undefined for any other error
const codeOf = (error: unknown): unknown => field(error, 'code')

/**
Whether any process of the tree is left; on Linux the tree is the launch's process group
*/
function isTreeAlive(pid: number): boolean {
  try {
    process.kill(process.platform === 'win32' ? pid : -pid, 0)
    return true
  } catch (error) {
    return codeOf(error) === 'EPERM'
  }
}

/**
Kills a launched app's whole process tree and waits until it is gone
*/
export async function killTree(pid: number): Promise<void> {
  if (process.platform === 'win32') {
    // taskkill exits non-zero once the tree is already gone
    await new Promise<void>((resolve) => {
      execFile('taskkill', ['/T', '/F', '/PID', String(pid)], () => {
        resolve()
      })
    })
  } else if (isTreeAlive(pid)) {
    // Playwright starts the app detached, so its pid leads its own process group
    try {
      process.kill(-pid, 'SIGKILL')
    } catch (error) {
      if (codeOf(error) !== 'ESRCH') throw error
    }
  }
  const deadline = Date.now() + TEARDOWN_BOUND_MS
  while (isTreeAlive(pid)) {
    if (Date.now() > deadline)
      throw new Error(`process tree ${String(pid)} still running after kill`)
    await sleep(50)
  }
}

/**
Asserts the dialogs drained, lets the app close with its unload prompts answered "leave",
bounded, then kills the tree, waits for it and only then deletes the launch's directories.
Stopping the trace with `tracePath` keeps it there.
*/
export async function teardown(
  app: ElectronApplication,
  { tracePath }: { tracePath?: string } = {}
): Promise<void> {
  const launch = launches.get(app)
  if (launch === undefined || launch.done) return
  launch.done = true
  const { pid } = launch.child
  let failure: unknown
  try {
    if (isRunning(launch.child)) {
      try {
        await assertDialogsDrained(app)
      } catch (error) {
        failure = error
      }
      try {
        await app.context().tracing.stop(tracePath === undefined ? {} : { path: tracePath })
      } catch {
        // A trace that cannot be stopped is lost; the teardown goes on
      }
      await app.evaluate(({ BrowserWindow }) => {
        for (const window of BrowserWindow.getAllWindows()) {
          window.removeAllListeners('close')
          window.webContents.removeAllListeners('will-prevent-unload')
          window.webContents.on('will-prevent-unload', (event) => {
            event.preventDefault()
          })
        }
      })
      let timer: NodeJS.Timeout | undefined
      try {
        await Promise.race([
          app.close(),
          new Promise((resolve) => {
            timer = setTimeout(resolve, TEARDOWN_BOUND_MS)
          })
        ])
      } finally {
        clearTimeout(timer)
      }
    }
  } catch (error) {
    failure ??= error
  } finally {
    if (pid !== undefined) await killTree(pid)
    for (const directory of launch.directories) {
      rmSync(directory, { recursive: true, force: true, maxRetries: 3 })
    }
    launches.delete(app)
  }
  if (failure !== undefined) {
    throw failure instanceof Error ? failure : new Error('teardown failed', { cause: failure })
  }
}

// The release build prints its DevTools endpoint on stderr once it listens
const DEVTOOLS_LINE = /DevTools listening on (ws:\/\/\S+)/
export const RELEASE_START_MS = 30_000

/**
Opens a DevTools protocol connection to `endpoint`
*/
export async function connectCdp(endpoint: string): Promise<Cdp> {
  const socket = new WebSocket(endpoint)
  await new Promise<void>((resolve, reject) => {
    socket.addEventListener(
      'open',
      () => {
        resolve()
      },
      { once: true }
    )
    socket.addEventListener(
      'error',
      () => {
        reject(new Error(`cannot connect to ${endpoint}`))
      },
      { once: true }
    )
  })
  let next = 0
  const pending = new Map<
    number,
    {
      method: string
      resolve: (value: Record<string, unknown>) => void
      reject: (error: Error) => void
    }
  >()
  const listeners: ((event: CdpEvent) => void)[] = []
  socket.addEventListener('message', ({ data }: MessageEvent<unknown>) => {
    const message: unknown = JSON.parse(String(data))
    const id = field(message, 'id')
    if (typeof id !== 'number') {
      const method = field(message, 'method')
      const params = field(message, 'params')
      const sessionId = field(message, 'sessionId')
      const event: CdpEvent = {
        method: typeof method === 'string' ? method : '',
        params: isRecord(params) ? params : {},
        ...(typeof sessionId === 'string' && { sessionId })
      }
      for (const listener of listeners) listener({ ...event })
      return
    }
    const call = pending.get(id)
    pending.delete(id)
    const error = field(message, 'error')
    const result = field(message, 'result')
    if (error === undefined) call?.resolve(isRecord(result) ? result : {})
    else {
      const text = field(error, 'message')
      call?.reject(new Error(`${call.method}: ${typeof text === 'string' ? text : 'failed'}`))
    }
  })
  socket.addEventListener('close', () => {
    for (const { method, reject } of pending.values()) reject(new Error(`${method}: closed`))
    pending.clear()
  })
  return {
    async send(method, params = {}, sessionId) {
      next += 1
      const id = next
      socket.send(
        JSON.stringify({ id, method, params, ...(sessionId !== undefined && { sessionId }) })
      )
      return new Promise((resolve, reject) => {
        pending.set(id, { method, resolve, reject })
      })
    },
    on: (listener) => {
      listeners.push(listener)
    },
    close: () => {
      socket.close()
    }
  }
}

/**
Resolves with the DevTools endpoint the release build prints, or fails with its stderr
*/
async function printedEndpoint(child: ChildProcess): Promise<string> {
  return new Promise((resolve, reject) => {
    let stderr = ''
    const fail = (why: string): void => {
      clearTimeout(timer)
      reject(new Error(`release build ${why}; stderr:\n${stderr}`))
    }
    const timer = setTimeout(() => {
      fail(`printed no endpoint in ${String(RELEASE_START_MS)} ms`)
    }, RELEASE_START_MS)
    child.once('exit', (code, signal) => {
      fail(`exited (${String(code ?? signal)}) before listening`)
    })
    child.stderr?.on('data', (chunk: Buffer) => {
      stderr += chunk.toString('utf8')
      const match = DEVTOOLS_LINE.exec(stderr)
      if (match?.[1] === undefined) return
      clearTimeout(timer)
      child.removeAllListeners('exit')
      // Keeps reading, so a full pipe never blocks the app
      child.stderr?.removeAllListeners('data')
      child.stderr?.resume()
      resolve(match[1])
    })
  })
}

/**
Spawns the release executable itself, with the DevTools port production keeps allowed, and
attaches over it with `browsers`: no inspector fuse, no launch helper, the bytes that ship.
*/
export async function launchRelease(
  browsers: BrowserType,
  options: { userDataDir?: string } = {}
): Promise<LaunchedRelease> {
  const { release } = readArtifacts()
  const directories: string[] = []
  let userDataDirectory = options.userDataDir
  if (userDataDirectory === undefined) {
    userDataDirectory = mkdtempSync(path.join(runRoot(), 'release-profile-'))
    directories.push(userDataDirectory)
  }
  const args = [
    '--remote-debugging-port=0',
    `--user-data-dir=${userDataDirectory}`,
    ...OFFLINE_ARGS
  ]
  const child = spawn(release, args, {
    // Leads its own process group on Linux, so the teardown reaches every process it starts
    detached: process.platform !== 'win32',
    stdio: ['ignore', 'ignore', 'pipe']
  })
  let browser: Browser | undefined
  let cdp: Cdp | undefined
  let isClosed = false
  const close = async (): Promise<void> => {
    if (isClosed) return
    isClosed = true
    try {
      cdp?.close()
      await browser?.close()
    } catch {
      // The browser connection may already be gone; the kill below ends the app either way
    } finally {
      if (child.pid !== undefined) await killTree(child.pid)
      for (const directory of directories) {
        rmSync(directory, { recursive: true, force: true, maxRetries: 3 })
      }
    }
  }
  try {
    const endpoint = await printedEndpoint(child)
    browser = await browsers.connectOverCDP(endpoint)
    cdp = await connectCdp(endpoint)
    // An attached browser exposes its default context first
    const context = browser.contexts().at(0)
    if (context === undefined) throw new Error('the release build exposes no browser context')
    const page = context.pages().at(0) ?? (await context.waitForEvent('page'))
    const pageErrors: string[] = []
    page.on('pageerror', (error) => {
      pageErrors.push(error.message)
    })
    await page.waitForLoadState('domcontentloaded')
    return {
      browser,
      page,
      cdp,
      userDataDir: userDataDirectory,
      pageErrors,
      async fixtureProject(leaf) {
        const project = await copyFixtureProject(leaf)
        directories.push(path.dirname(project))
        return project
      },
      close
    }
  } catch (error) {
    await close()
    throw error
  }
}

export const test = base.extend<{ twin: LaunchedApp; release: LaunchedRelease }>({
  // Depends on the trace option so the config decides which traces are kept
  twin: async ({ trace }, provide, testInfo) => {
    const twin = await launchTwin()
    await stubDialogs(twin.app)
    await provide(twin)
    const mode = typeof trace === 'string' ? trace : trace.mode
    const isFailed = testInfo.status !== testInfo.expectedStatus
    const isKeep = mode === 'on' || (isFailed && mode !== 'off')
    const errors: unknown[] = []
    let n = 0
    // Also every app the test launched itself
    for (const app of launches.keys()) {
      n += 1
      const tracePath = isKeep ? testInfo.outputPath(`trace-${String(n)}.zip`) : undefined
      try {
        await teardown(app, tracePath === undefined ? {} : { tracePath })
      } catch (error) {
        errors.push(error)
      }
      if (tracePath !== undefined && existsSync(tracePath)) {
        testInfo.attachments.push({
          name: 'trace',
          path: tracePath,
          contentType: 'application/zip'
        })
      }
    }
    if (errors.length > 0) throw errors[0]
  },
  // Attaches with the worker's own browser library
  release: async ({ playwright }, provide) => {
    const release = await launchRelease(playwright.chromium)
    try {
      await provide(release)
    } finally {
      await release.close()
    }
  }
})

export { expect } from '@playwright/test'
