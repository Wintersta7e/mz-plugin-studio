// The MZ runtime test's worker fixture: checks the project MZ_PROJECT_DIR names, copies it into
// the run root, serves the copy, boots it once with no case plugin for that level's baseline
// errors, and boots it once per case. At teardown it deletes the copy and fails if the project's
// own files changed.
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { parse } from 'acorn'
import type { Browser, BrowserType, Page } from '@playwright/test'
import { runRoot, test as base } from '../fixtures/app'
import {
  compareManifests,
  copyProject,
  installCase,
  removeCopy,
  requireProjectFiles,
  resetCopy,
  serveCopy,
  takeManifest
} from '../fixtures/mz-project'
import { verdictOf, type CaseVerdict, type MzCase, type MzLevel } from './cases'
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
  run(kase: MzCase): Promise<CaseVerdict>
  baselineErrors: readonly string[]
}

const OBSERVER_CONFIG: ObserverConfig = {
  reportId: 'mz-runtime-report',
  stepMs: 30_000,
  saveSlot: 1
}
// Four steps of the drive and two engine saves, each bounded by the observer itself
const BOOT_BOUND_MS = OBSERVER_CONFIG.stepMs * 6
const INSTALL_BROWSER =
  'the pinned headless shell is not installed: node node_modules/@playwright/test/cli.js install chromium-headless-shell'

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

/**
Boots the copy once in a fresh browser context, with `kase` installed after the stock plugins
when given, and returns the observer's report with the browser's own errors as load errors.
*/
async function bootBrowser(
  browser: Browser,
  origin: string,
  copy: string,
  kase?: MzCase
): Promise<ObserverReport> {
  resetCopy(copy)
  const observer = observerPlugin()
  installCase(copy, {
    observer,
    ...(kase !== undefined && { plugin: { file: kase.file, source: kase.code, parameters: {} } }),
    commands: []
  })
  if (
    readFileSync(path.join(copy, 'js', 'plugins', `${observer.file}.js`), 'utf8') !==
    observer.source
  ) {
    throw new Error(`the installed observer is not the one ${OBSERVER_MODULE} defines`)
  }
  const context = await browser.newContext()
  try {
    const page = await context.newPage()
    const seen = watchPage(page)
    // The editor's playtest option, as the NW.js level passes it
    await page.goto(`${origin}/index.html?test`)
    const holder = page.locator(`#${OBSERVER_CONFIG.reportId}`)
    await page
      .locator(`#${OBSERVER_CONFIG.reportId}[data-done]`)
      .waitFor({ state: 'attached', timeout: BOOT_BOUND_MS })
    const report = readReport((await holder.textContent()) ?? '')
    return { ...report, loadErrors: [...report.loadErrors, ...seen] }
  } finally {
    await context.close()
  }
}

/**
Serves the copy, boots it once with no case plugin, and hands the browser level to `provide`.
*/
async function provideBrowserLevel(
  chromium: BrowserType,
  copy: string,
  provide: (harness: MzHarness) => Promise<void>
): Promise<void> {
  const server = await serveCopy(copy)
  try {
    const browser = await launch(chromium)
    try {
      const baseline = await bootBrowser(browser, server.origin, copy)
      if (baseline.failure !== undefined) {
        throw new Error(`the copy does not boot with no case plugin: ${baseline.failure}`)
      }
      const baselineErrors = [...baseline.loadErrors, ...baseline.bootErrors]
      process.stdout.write(
        `mz-runtime: level browser baseline-errors ${String(baselineErrors.length)}\n`
      )
      await provide({
        copy,
        level: 'browser',
        engine: `chromium ${browser.version()}`,
        baselineErrors,
        run: async (kase) =>
          verdictOf(kase, await bootBrowser(browser, server.origin, copy, kase), baselineErrors)
      })
    } finally {
      await browser.close()
    }
  } finally {
    await server.close()
  }
}

export const test = base.extend<object, { mz: MzHarness }>({
  mz: [
    async ({ playwright }, provide) => {
      const source = projectFolder()
      requireProjectFiles(source)
      const before = takeManifest(source)
      const copy = path.join(runRoot(), 'mz-project')
      let failure: Error | undefined
      try {
        copyProject(source, copy)
        await provideBrowserLevel(playwright.chromium, copy, provide)
      } catch (error) {
        failure = error instanceof Error ? error : new Error(String(error))
      }
      // Every process that used the copy has ended: the browser closed before this point
      await removeCopy(copy)
      const diff = compareManifests(before, takeManifest(source))
      process.stdout.write(
        `manifest: files ${String(before.files.size)} diff ${String(diff.length)}\n`
      )
      if (diff.length > 0) {
        throw new Error(`the MZ project changed during the run: ${String(diff.length)} files`, {
          cause: failure
        })
      }
      if (failure !== undefined) throw failure
    },
    { scope: 'worker', timeout: 300_000 }
  ]
})

export { expect } from '../fixtures/app'
