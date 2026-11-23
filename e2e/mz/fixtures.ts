// The MZ runtime test's worker fixture: checks the project MZ_PROJECT_DIR names, copies it into
// the run root, serves the copy, boots it once with no case plugin for that level's baseline
// errors, and boots it once per case. At teardown it deletes the copy, fails if the project's
// own files changed, and fails if a printed line, a report or a tracked file names the project.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { parse } from 'acorn'
import type { Browser, BrowserType, Page } from '@playwright/test'
import { SENTINEL } from '../../tests/helpers/hostile'
import { OBSERVED } from '../../tests/helpers/mz-conformance'
import { runRoot, test as base } from '../fixtures/app'
import {
  compareManifests,
  copyProject,
  installCase,
  removeCopy,
  requireProjectFiles,
  resetCopy,
  scanForLeaks,
  serveCopy,
  storedImages,
  takeManifest
} from '../fixtures/mz-project'
import { trackedFiles } from '../global-setup'
import { commandPluginOf, verdictOf, type CaseVerdict, type MzCase, type MzLevel } from './cases'
import {
  mzObserver,
  OBSERVER_MODULE,
  OBSERVER_PLUGIN,
  observerSource,
  readReport,
  type ObserverConfig,
  type ObserverReport
} from './observer'

export interface MzHarness {
  copy: string
  level: MzLevel
  /**
  The engine the level boots, by name and version.
  */
  engine: string
  baselineErrors: readonly string[]
  /**
  Files the project's manifest held before it was copied.
  */
  manifestFiles: number
  /**
  Boots the copy with `kase` installed; given `output`, keeps the map's screenshot and the
  report beside it, at `<output>.png` and `<output>.json`.
  */
  run(kase: MzCase, output?: string): Promise<CaseVerdict>
  /**
  Boots started and reports read so far, the baseline's included.
  */
  counts(): { launches: number; reports: number }
  /**
  Prints `line`; the leak scan reads every line printed this way.
  */
  print(line: string): void
}

/**
What the worker printed and wrote, for the leak scan, and its boots.
*/
interface RunLog {
  printed: string[]
  reportFiles: string[]
  launches: number
  reports: number
}

const OBSERVER_CONFIG: ObserverConfig = {
  reportId: 'mz-runtime-report',
  stepMs: 30_000,
  saveSlot: 1,
  observed: OBSERVED,
  sentinel: SENTINEL
}
// Five steps of the drive and two engine saves, each bounded by the observer itself
const BOOT_BOUND_MS = OBSERVER_CONFIG.stepMs * 7
const INSTALL_BROWSER =
  'the pinned headless shell is not installed: node node_modules/@playwright/test/cli.js install chromium-headless-shell'

function print(log: RunLog, line: string): void {
  log.printed.push(line)
  process.stdout.write(`${line}\n`)
}

/**
The project folder MZ_PROJECT_DIR names; the message never repeats the value.
*/
function projectFolder(): string {
  const { MZ_PROJECT_DIR: folder = '' } = process.env
  if (!path.isAbsolute(folder)) {
    throw new Error('MZ_PROJECT_DIR must be the absolute path of an MZ project folder')
  }
  return folder
}

/**
The game title the copy's system data holds, or empty text when it holds none.
*/
function gameTitle(copy: string): string {
  const system: unknown = JSON.parse(readFileSync(path.join(copy, 'data', 'System.json'), 'utf8'))
  const title: unknown =
    typeof system === 'object' && system !== null ? Reflect.get(system, 'gameTitle') : undefined
  return typeof title === 'string' ? title : ''
}

/**
The observer plugin, as its module writes it. Refuses an observer from any other module, and
text the documented engine level, Chromium 85, could not parse.
*/
function observerPlugin(): { file: string; source: string } {
  const defined = readFileSync(path.join(process.cwd(), OBSERVER_MODULE), 'utf8')
  if (!defined.includes(`export function ${mzObserver.name}(`)) {
    throw new Error(`the observer is not the one ${OBSERVER_MODULE} defines`)
  }
  const source = observerSource(OBSERVER_CONFIG)
  try {
    parse(source, { ecmaVersion: 2020, sourceType: 'script' })
  } catch (error) {
    throw new Error('the observer does not parse as ES2020', { cause: error })
  }
  return { file: OBSERVER_PLUGIN, source }
}

async function launch(chromium: BrowserType): Promise<Browser> {
  try {
    return await chromium.launch()
  } catch (error) {
    if (error instanceof Error && error.message.includes("Executable doesn't exist")) {
      throw new Error(INSTALL_BROWSER, { cause: error })
    }
    throw error
  }
}

const pathOf = (url: string): string => new URL(url).pathname

/**
What the browser itself reports that the page's own hooks cannot see: console errors the
engine did not log through `console.error`, page errors, failed responses and requests.
*/
function watchPage(page: Page): string[] {
  const seen: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error') seen.push(`console: ${message.text()}`)
  })
  page.on('pageerror', (error) => {
    seen.push(`page error: ${error.message}`)
  })
  page.on('response', (response) => {
    if (response.status() >= 400) {
      seen.push(`response ${String(response.status())}: ${pathOf(response.url())}`)
    }
  })
  page.on('requestfailed', (request) => {
    seen.push(`request failed: ${pathOf(request.url())}`)
  })
  return seen
}

interface BrowserLevel {
  browser: Browser
  origin: string
  copy: string
  log: RunLog
}

/**
Installs the observer and, when given, `kase` after the stock plugins with its stored values
and the event calling its commands.
*/
function install(copy: string, kase?: MzCase): void {
  resetCopy(copy)
  const observer = observerPlugin()
  installCase(copy, {
    observer,
    ...(kase !== undefined && {
      plugin: { file: kase.file, source: kase.code, parameters: kase.load?.stored ?? {} },
      commandPlugin: commandPluginOf(kase),
      images: storedImages(
        kase.expectation?.case.definition.parameters ?? [],
        kase.load?.stored ?? {}
      )
    }),
    commands: kase?.load?.commands ?? []
  })
  if (
    readFileSync(path.join(copy, 'js', 'plugins', `${observer.file}.js`), 'utf8') !==
    observer.source
  ) {
    throw new Error(`the installed observer is not the one ${OBSERVER_MODULE} defines`)
  }
}

/**
Boots the copy once in a fresh browser context with `kase` installed, when given, and returns
the observer's report with the browser's own errors as load errors.
*/
async function bootBrowser(
  level: BrowserLevel,
  kase?: MzCase,
  output?: string
): Promise<ObserverReport> {
  install(level.copy, kase)
  const context = await level.browser.newContext()
  try {
    const page = await context.newPage()
    const seen = watchPage(page)
    level.log.launches += 1
    // The editor's playtest option, as the NW.js level passes it
    await page.goto(`${level.origin}/index.html?test`)
    const holder = page.locator(`#${OBSERVER_CONFIG.reportId}`)
    await page
      .locator(`#${OBSERVER_CONFIG.reportId}[data-done]`)
      .waitFor({ state: 'attached', timeout: BOOT_BOUND_MS })
    const read = readReport((await holder.textContent()) ?? '')
    level.log.reports += 1
    const report = { ...read, loadErrors: [...read.loadErrors, ...seen] }
    if (output !== undefined) {
      mkdirSync(path.dirname(output), { recursive: true })
      await page.screenshot({ path: `${output}.png` })
      writeFileSync(`${output}.json`, `${JSON.stringify(report, undefined, 2)}\n`)
      level.log.reportFiles.push(`${output}.json`)
    }
    return report
  } finally {
    await context.close()
  }
}

/**
Serves the copy, boots it once with no case plugin, and hands the browser level to `provide`.
*/
async function provideBrowserLevel(
  chromium: BrowserType,
  { copy, log, manifestFiles }: { copy: string; log: RunLog; manifestFiles: number },
  provide: (harness: MzHarness) => Promise<void>
): Promise<void> {
  const server = await serveCopy(copy)
  try {
    const browser = await launch(chromium)
    try {
      const level: BrowserLevel = { browser, origin: server.origin, copy, log }
      const baseline = await bootBrowser(level)
      if (baseline.failure !== undefined) {
        throw new Error(`the copy does not boot with no case plugin: ${baseline.failure}`)
      }
      const baselineErrors = [...baseline.loadErrors, ...baseline.bootErrors]
      print(log, `mz-runtime: level browser baseline-errors ${String(baselineErrors.length)}`)
      await provide({
        copy,
        level: 'browser',
        engine: `chromium ${browser.version()}`,
        baselineErrors,
        manifestFiles,
        run: async (kase, output) =>
          verdictOf(kase, await bootBrowser(level, kase, output), baselineErrors),
        counts: () => ({ launches: log.launches, reports: log.reports }),
        print: (line) => {
          print(log, line)
        }
      })
    } finally {
      await browser.close()
    }
  } finally {
    await server.close()
  }
}

/**
Scans every printed line, every report file and every tracked file for the project's path,
the NW.js executable's path and the game title; the failure names where, never what.
*/
function scanTheRun(log: RunLog, title: string): Error | undefined {
  const { MZ_PROJECT_DIR: project = '', MZ_NWJS_EXE: nwjs = '' } = process.env
  const files = [
    ...log.reportFiles.map((file) => path.relative(process.cwd(), file)),
    ...trackedFiles()
  ].filter((file) => existsSync(file))
  const hits = [project, nwjs, title]
    .filter((needle) => needle !== '')
    .flatMap((needle) =>
      scanForLeaks([needle], log.printed, files).hits.map((hit) =>
        hit.slice(0, -`: ${needle}`.length)
      )
    )
  print(log, `leak scan: files ${String(files.length)} hits ${String(hits.length)}`)
  if (files.length === 0) return new Error('the leak scan read no file')
  return hits.length === 0
    ? undefined
    : new Error(`the run names the MZ project, its title or the engine: ${hits.join(', ')}`)
}

export const test = base.extend<object, { mz: MzHarness }>({
  mz: [
    async ({ playwright }, provide) => {
      const source = projectFolder()
      requireProjectFiles(source)
      const before = takeManifest(source)
      const copy = path.join(runRoot(), 'mz-project')
      const log: RunLog = { printed: [], reportFiles: [], launches: 0, reports: 0 }
      let title = ''
      let failure: Error | undefined
      try {
        copyProject(source, copy)
        title = gameTitle(copy)
        const setup = { copy, log, manifestFiles: before.files.size }
        await provideBrowserLevel(playwright.chromium, setup, provide)
      } catch (error) {
        failure = error instanceof Error ? error : new Error(String(error))
      }
      // Every process that used the copy has ended: the browser closed before this point
      await removeCopy(copy)
      const diff = compareManifests(before, takeManifest(source))
      print(log, `manifest: files ${String(before.files.size)} diff ${String(diff.length)}`)
      if (diff.length > 0) {
        throw new Error(`the MZ project changed during the run: ${String(diff.length)} files`, {
          cause: failure
        })
      }
      // Scanned on a failed run too: its printed lines are as public as a passed run's
      const leak = scanTheRun(log, title)
      const error = failure ?? leak
      if (error !== undefined) throw error
    },
    { scope: 'worker', timeout: 300_000 }
  ]
})

export { expect } from '../fixtures/app'
