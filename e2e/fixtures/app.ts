// The only module that launches the app. Plain functions, callable outside a Playwright test,
// wrapped below as the `twin` fixture: a fresh profile per launch, native dialogs answered from
// per-method queues, and a bounded teardown that kills the process tree before deleting files.
import { execFile, type ChildProcess } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs'
import { dirname, isAbsolute, join, relative } from 'node:path'
import {
  _electron,
  test as base,
  expect,
  type ElectronApplication,
  type Page
} from '@playwright/test'
import type { API } from '../../src/preload/index'
import { copyFixtureProject } from '../../tests/helpers/fixture-project'

export { expect }

// The renderer's window as the preload script exposes it
export type AppWindow = { api: API }

export interface Artifacts {
  release: string
  twin: string
  releaseWire: Record<string, number>
  twinWire: Record<string, number>
}

export interface LaunchedApp {
  app: ElectronApplication
  page: Page
  userDataDir: string
  pageErrors: string[]
  failedRequests: string[]
}

export type DialogMethod =
  | 'showOpenDialog'
  | 'showSaveDialog'
  | 'showMessageBox'
  | 'showMessageBoxSync'

/** A message-box answer: the box's cancelId, the one other button of two, or a button index */
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

/** A file written in the main process just before the dialog answers */
export interface WriteBefore {
  path: string
  content: string
}

// Fixed arguments of every twin launch
export const TWIN_ARGS = ['--force-device-scale-factor=1', '--force-prefers-reduced-motion']

// How long teardown lets the app close itself before it kills the process tree
export const TEARDOWN_BOUND_MS = 10_000

// Main-process global holding the dialog stub's queues and records
const DIALOG_STATE = 'e2eDialogs'

interface Launch {
  // Removed at teardown, after the process tree is gone
  dirs: string[]
  done: boolean
  // Held from the launch on: Playwright stops answering `app.process()` once the app closed
  child: ChildProcess
}

const launches = new Map<ElectronApplication, Launch>()

/** Reads the manifest `npm run e2e:prepare` writes, from the repository root */
export function readArtifacts(): Artifacts {
  const manifest = join(process.cwd(), 'dist', 'e2e-artifacts.json')
  if (!existsSync(manifest)) {
    throw new Error(`no ${manifest}: run npm run e2e:prepare first`)
  }
  return JSON.parse(readFileSync(manifest, 'utf8')) as Artifacts
}

/** The run's temp root, created by the global setup */
export function runRoot(): string {
  const root = process.env['E2E_RUN_ROOT']
  if (!root) throw new Error('E2E_RUN_ROOT is unset: run the suite through its Playwright config')
  return root
}

/** True when `path` is `root` or lies below it */
export function isWithin(path: string, root: string): boolean {
  const rel = relative(root, path)
  return !rel.startsWith('..') && !isAbsolute(rel)
}

export async function launchTwin(
  options: { userDataDir?: string; args?: string[] } = {}
): Promise<LaunchedApp> {
  const { twin } = readArtifacts()
  const dirs: string[] = []
  let userDataDir = options.userDataDir
  if (userDataDir === undefined) {
    userDataDir = mkdtempSync(join(runRoot(), 'profile-'))
    dirs.push(userDataDir)
  }
  let app: ElectronApplication
  try {
    app = await _electron.launch({
      executablePath: twin,
      args: [`--user-data-dir=${userDataDir}`, ...TWIN_ARGS, ...(options.args ?? [])],
      chromiumSandbox: true
    })
  } catch (error) {
    for (const dir of dirs) rmSync(dir, { recursive: true, force: true })
    throw error
  }
  launches.set(app, { dirs, done: false, child: app.process() })

  const pageErrors: string[] = []
  const failedRequests: string[] = []
  const watched = new WeakSet<Page>()
  const watch = (page: Page): void => {
    if (watched.has(page)) return
    watched.add(page)
    page.on('pageerror', (error) => pageErrors.push(error.message))
    page.on('requestfailed', (request) =>
      failedRequests.push(`${request.url()}: ${request.failure()?.errorText ?? 'failed'}`)
    )
  }
  app.on('window', watch)
  for (const page of app.windows()) watch(page)
  await app.context().tracing.start({ screenshots: true, snapshots: true })
  const page = await app.firstWindow()
  watch(page)
  await page.waitForLoadState('domcontentloaded')
  return { app, page, userDataDir, pageErrors, failedRequests }
}

/**
 * Replaces the main process's native dialogs with stubs answering from per-method queues. The
 * app calls `dialog.<method>` at call time, so replacing the module's properties reaches it.
 */
export async function stubDialogs(app: ElectronApplication): Promise<void> {
  await app.evaluate(({ dialog }, key) => {
    interface Entry {
      answer: unknown
      writeBefore?: { path: string; content: string }
    }
    interface Box {
      buttons?: string[]
      cancelId?: number
    }
    const state = {
      queues: {} as Record<string, Entry[]>,
      calls: [] as { method: string; options: unknown; error?: string }[],
      uncaught: [] as string[]
    }
    Reflect.set(globalThis, key, state)
    const fs = process.getBuiltinModule('node:fs')

    // Callers pass (window, options) or (options): the options come last
    const answer = (
      method: string,
      args: unknown[],
      resolve: (raw: unknown) => unknown
    ): unknown => {
      const options = args[args.length - 1]
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
      (method: string, args: unknown[]) =>
      (raw: unknown): number => {
        if (typeof raw === 'number') return raw
        const { buttons = [], cancelId } = (args[args.length - 1] ?? {}) as Box
        if (cancelId === undefined) {
          throw new Error(`e2e dialog stub: ${method} answered ${String(raw)}, but has no cancelId`)
        }
        if (raw === 'cancel') return cancelId
        if (buttons.length !== 2) {
          throw new Error(
            `e2e dialog stub: ${method} confirmed with ${buttons.length} buttons, not 2`
          )
        }
        return cancelId === 0 ? 1 : 0
      }
    const same = (raw: unknown): unknown => raw

    Object.assign(dialog, {
      showOpenDialog: async (...args: unknown[]) => answer('showOpenDialog', args, same),
      showSaveDialog: async (...args: unknown[]) => answer('showSaveDialog', args, same),
      showMessageBox: async (...args: unknown[]) => ({
        response: answer('showMessageBox', args, button('showMessageBox', args)),
        checkboxChecked: false
      }),
      showMessageBoxSync: (...args: unknown[]) =>
        answer('showMessageBoxSync', args, button('showMessageBoxSync', args))
    })
    // Recorded instead of Electron's own error box
    process.on('uncaughtException', (error) => state.uncaught.push(String(error.stack ?? error)))
  }, DIALOG_STATE)
}

export async function queueDialog<M extends DialogMethod>(
  app: ElectronApplication,
  method: M,
  answer: DialogAnswers[M],
  writeBefore?: WriteBefore
): Promise<void> {
  const queued = await app.evaluate(
    (_electron, { key, method, entry }) => {
      const state = Reflect.get(globalThis, key) as
        | { queues: Record<string, unknown[]> }
        | undefined
      if (state === undefined) return false
      ;(state.queues[method] ??= []).push(entry)
      return true
    },
    { key: DIALOG_STATE, method, entry: { answer, writeBefore } }
  )
  if (!queued) throw new Error('e2e dialog stub: queueDialog before stubDialogs')
}

export async function dialogCalls(app: ElectronApplication): Promise<DialogCall[]> {
  return app.evaluate(
    (_electron, key) =>
      (Reflect.get(globalThis, key) as { calls: DialogCall[] } | undefined)?.calls ?? [],
    DIALOG_STATE
  )
}

/**
 * Fails naming every dialog method that was called on an empty queue, failed to answer or kept
 * unused answers, and every uncaught main-process error; then clears them, so each is reported
 * once.
 */
export async function assertDialogsDrained(app: ElectronApplication): Promise<void> {
  const problems = await app.evaluate((_electron, key) => {
    const state = Reflect.get(globalThis, key) as
      | {
          queues: Record<string, unknown[]>
          calls: { method: string; error?: string }[]
          uncaught: string[]
        }
      | undefined
    if (state === undefined) return []
    const found = [
      ...state.calls.flatMap(({ method, error }) => (error ? [`${method}: ${error}`] : [])),
      ...Object.entries(state.queues).flatMap(([method, queue]) =>
        queue.length > 0 ? [`${method}: ${queue.length} unused answer(s)`] : []
      ),
      ...state.uncaught.map((error) => `uncaught in main: ${error}`)
    ]
    state.calls = state.calls.filter(({ error }) => !error)
    state.queues = {}
    state.uncaught = []
    return found
  }, DIALOG_STATE)
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
    const system = JSON.parse(readFileSync(join(projectPath, 'data', 'System.json'), 'utf8')) as {
      gameTitle: string
    }
    await expect(page.getByTestId('status-project')).toContainText(system.gameTitle)
  }
}

/** A fresh copy of the fixture project, deleted at the app's teardown */
export async function fixtureProjectFor(app: ElectronApplication, leaf?: string): Promise<string> {
  const launch = launches.get(app)
  if (launch === undefined) throw new Error('fixtureProjectFor: the app was not launched here')
  const project = await copyFixtureProject(leaf)
  launch.dirs.push(dirname(project))
  return project
}

/** Opens a fresh copy of the fixture project; the copy is deleted at the app's teardown */
export async function loadFixtureProject(
  app: ElectronApplication,
  page: Page,
  leaf?: string
): Promise<string> {
  const project = await fixtureProjectFor(app, leaf)
  await openProject(app, page, project)
  return project
}

export const pluginsDir = (project: string): string => join(project, 'js', 'plugins')

export const mtimeNs = (path: string): bigint => statSync(path, { bigint: true }).mtimeNs

/**
 * Waits until the renderer has handled every reply main sent before now: replies travel in
 * order, so the answer to a later round trip arrives after them. The app drops a save shortcut
 * pressed while an earlier save is still running.
 */
export async function settle(page: Page): Promise<void> {
  await page.evaluate(() => (window as unknown as AppWindow).api.window.isMaximized())
}

export async function save(page: Page): Promise<void> {
  await settle(page)
  await page.keyboard.press('Control+s')
}

/** Saves and waits until the file's modification time moves past `before` */
export async function saveAndWaitForWrite(page: Page, path: string): Promise<void> {
  const before = mtimeNs(path)
  await save(page)
  await expect.poll(() => mtimeNs(path) > before).toBe(true)
}

/** Opens a project plugin from the Plugin Browser and waits until its tab is the active one */
export async function openFromBrowser(page: Page, file: string): Promise<void> {
  const panel = page.getByTestId('plugin-browser-panel')
  if (!(await panel.isVisible())) await page.getByTestId('plugin-browser-toggle').click()
  // A row reads the file name without `.js` first; fixture names are plain word characters
  const row = panel
    .getByTestId('plugin-browser-row')
    .filter({ hasText: new RegExp(`^${file.replace(/\.js$/, '')}(?!\\w)`) })
  await row.click()
  await expect(row).toHaveAttribute('aria-current', 'page')
}

/** The accessible name of every open tab, in order: the plugin's name, marked when unsaved */
export async function tabNames(page: Page): Promise<(string | null)[]> {
  return page.getByTestId('plugin-tab').evaluateAll((tabs) => tabs.map((tab) => tab.ariaLabel))
}

const isRunning = (child: ChildProcess): boolean =>
  child.exitCode === null && child.signalCode === null

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))

/** Whether any process of the tree is left; on Linux the tree is the launch's process group */
function treeAlive(pid: number): boolean {
  try {
    process.kill(process.platform === 'win32' ? pid : -pid, 0)
    return true
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === 'EPERM'
  }
}

/** Kills a launched app's whole process tree and waits until it is gone */
export async function killTree(pid: number): Promise<void> {
  if (process.platform === 'win32') {
    // taskkill exits non-zero once the tree is already gone
    await new Promise<void>((resolve) =>
      execFile('taskkill', ['/T', '/F', '/PID', String(pid)], () => resolve())
    )
  } else if (treeAlive(pid)) {
    // Playwright starts the app detached, so its pid leads its own process group
    try {
      process.kill(-pid, 'SIGKILL')
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ESRCH') throw error
    }
  }
  const deadline = Date.now() + TEARDOWN_BOUND_MS
  while (treeAlive(pid)) {
    if (Date.now() > deadline) throw new Error(`process tree ${pid} still running after kill`)
    await sleep(50)
  }
}

/**
 * Asserts the dialogs drained, lets the app close with its unload prompts answered "leave",
 * bounded, then kills the tree, waits for it and only then deletes the launch's directories.
 * Stopping the trace with `tracePath` keeps it there.
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
      await assertDialogsDrained(app).catch((error: unknown) => {
        failure = error
      })
      await app
        .context()
        .tracing.stop(tracePath ? { path: tracePath } : {})
        .catch(() => undefined)
      await app.evaluate(({ BrowserWindow }) => {
        for (const window of BrowserWindow.getAllWindows()) {
          window.removeAllListeners('close')
          window.webContents.removeAllListeners('will-prevent-unload')
          window.webContents.on('will-prevent-unload', (event) => event.preventDefault())
        }
      })
      let timer: NodeJS.Timeout | undefined
      await Promise.race([
        app.close(),
        new Promise((resolve) => {
          timer = setTimeout(resolve, TEARDOWN_BOUND_MS)
        })
      ]).finally(() => clearTimeout(timer))
    }
  } catch (error) {
    failure ??= error
  } finally {
    if (pid !== undefined) await killTree(pid)
    for (const dir of launch.dirs) rmSync(dir, { recursive: true, force: true, maxRetries: 3 })
    launches.delete(app)
  }
  if (failure !== undefined) throw failure
}

export const test = base.extend<{ twin: LaunchedApp }>({
  // Depends on the trace option so the config decides which traces are kept
  twin: async ({ trace }, provide, testInfo) => {
    const twin = await launchTwin()
    await stubDialogs(twin.app)
    await provide(twin)
    const mode = typeof trace === 'string' ? trace : trace.mode
    const failed = testInfo.status !== testInfo.expectedStatus
    const keep = mode === 'on' || (failed && mode !== 'off')
    const errors: unknown[] = []
    let n = 0
    // Also every app the test launched itself
    for (const app of [...launches.keys()]) {
      const tracePath = keep ? testInfo.outputPath(`trace-${++n}.zip`) : undefined
      await teardown(app, { tracePath }).catch((error: unknown) => errors.push(error))
      if (tracePath && existsSync(tracePath)) {
        testInfo.attachments.push({
          name: 'trace',
          path: tracePath,
          contentType: 'application/zip'
        })
      }
    }
    if (errors.length > 0) throw errors[0]
  }
})
