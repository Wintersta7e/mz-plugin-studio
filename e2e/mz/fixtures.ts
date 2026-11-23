// The MZ runtime test's worker fixtures: `mz` checks the project MZ_PROJECT_DIR names, copies it
// into the run root, serves the copy, boots it once with no case plugin for that level's baseline
// errors, and boots it once per case. `nwjs` boots the same copy in the engine MZ_NWJS_EXE names,
// one launch per boot, with its own baseline. At teardown `mz` deletes the copy, fails if the
// project's own files changed, and fails if a printed line, a report or a tracked file names the
// project.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { parse } from 'acorn'
import type { Browser, BrowserType, Page } from '@playwright/test'
import { ENGINE_PROBES } from '../../tests/helpers/engine-probes'
import { SENTINEL } from '../../tests/helpers/hostile'
import { OBSERVED } from '../../tests/helpers/mz-conformance'
import { runRoot, test as base } from '../fixtures/app'
import {
  compareManifests,
  copyProject,
  installCase,
  launchOnce,
  nwjsCommand,
  removeCopy,
  requireProjectFiles,
  resetCopy,
  scanForLeaks,
  serveCopy,
  storedImages,
  takeManifest
} from '../fixtures/mz-project'
import { trackedFiles } from '../global-setup'
import {
  commandPluginOf,
  uncalledScript,
  verdictOf,
  type CaseVerdict,
  type MzCase,
  type MzLevel
} from './cases'
import {
  mzObserver,
  OBSERVER_MODULE,
  OBSERVER_PLUGIN,
  observerSource,
  probeReportOf,
  readReport,
  reportOf,
  type EngineProbeReport,
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
  Boots the copy once with the observer compiling every engine probe and two sources no engine
  compiles; throws when a control compiled, or a probe has no result.
  */
  probe(): Promise<EngineProbeReport>
  /**
  Boots started and reports read so far, the baseline's included.
  */
  counts(): { launches: number; reports: number }
  /**
  Prints `line`; the leak scan reads every line printed this way.
  */
  print(line: string): void
  /**
  Writes `report` at `<output>.json`; the leak scan reads it.
  */
  keep(output: string, report: unknown): void
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
  sentinel: SENTINEL,
  reportFile: 'oracle-report.json'
}
// Five steps of the drive and two engine saves, each bounded by the observer itself
const BOOT_BOUND_MS = OBSERVER_CONFIG.stepMs * 7
// The engine's own start counts as one step more
const NWJS_BOUND_MS = BOOT_BOUND_MS + OBSERVER_CONFIG.stepMs
const PROBE_CONTROLS = [
  { id: 'unclosed-paren', source: 'return (' },
  // An engine that checks a regular expression only when it runs compiles this one
  { id: 'unclosed-regexp-group', source: 'return /(/' }
]
const probeFile = (id: string): string => `MzRuntimeProbe_${id.replaceAll('-', '_')}`
const controlFile = (id: string): string => `MzRuntimeControl_${id.replaceAll('-', '_')}`
const PROBE_SCRIPTS = [
  ...ENGINE_PROBES.map(({ id, source }) => ({ file: probeFile(id), source })),
  ...PROBE_CONTROLS.map(({ id, source }) => ({ file: controlFile(id), source }))
].map(({ file, source }) => ({ file, source: uncalledScript(source) }))
const PROBE_CONFIG: ObserverConfig = {
  ...OBSERVER_CONFIG,
  probes: {
    forms: ENGINE_PROBES.map(({ id, year }) => ({ id, year, file: probeFile(id) })),
    controls: PROBE_CONTROLS.map(({ id }) => ({ id, file: controlFile(id) }))
  }
}
const INSTALL_BROWSER =
  'the pinned headless shell is not installed: node node_modules/@playwright/test/cli.js install chromium-headless-shell'

function print(log: RunLog, line: string): void {
  log.printed.push(line)
  process.stdout.write(`${line}\n`)
}

function keep(log: RunLog, output: string, report: unknown): void {
  mkdirSync(path.dirname(output), { recursive: true })
  writeFileSync(`${output}.json`, `${JSON.stringify(report, undefined, 2)}\n`)
  log.reportFiles.push(`${output}.json`)
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
function observerPlugin(config: ObserverConfig): { file: string; source: string } {
  const defined = readFileSync(path.join(process.cwd(), OBSERVER_MODULE), 'utf8')
  if (!defined.includes(`export function ${mzObserver.name}(`)) {
    throw new Error(`the observer is not the one ${OBSERVER_MODULE} defines`)
  }
  const source = observerSource(config)
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
Installs the observer with `config`, with the scripts it loads when it probes the engine, and,
when given, `kase` after the stock plugins with its stored values and the event calling its
commands.
*/
function install(copy: string, config: ObserverConfig, kase?: MzCase): void {
  resetCopy(copy)
  const observer = observerPlugin(config)
  installCase(copy, {
    observer,
    ...(config.probes !== undefined && { scripts: PROBE_SCRIPTS }),
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
Boots the copy once in a fresh browser context with the observer installed by `config` and, when
given, `kase`; hands `use` the page, the report's text and the browser's own errors.
*/
async function bootPage<T>(
  level: BrowserLevel,
  { config, kase }: { config: ObserverConfig; kase?: MzCase | undefined },
  use: (page: Page, text: string, seen: readonly string[]) => Promise<T> | T
): Promise<T> {
  install(level.copy, config, kase)
  const context = await level.browser.newContext()
  try {
    const page = await context.newPage()
    const seen = watchPage(page)
    level.log.launches += 1
    // The editor's playtest option, as the NW.js level passes it
    await page.goto(`${level.origin}/index.html?test`)
    const holder = page.locator(`#${config.reportId}[data-done]`)
    await holder.waitFor({ state: 'attached', timeout: BOOT_BOUND_MS })
    const used = await use(page, (await holder.textContent()) ?? '', seen)
    level.log.reports += 1
    return used
  } finally {
    await context.close()
  }
}

/**
Boots the copy once with `kase` installed, when given, and returns the observer's report with
the browser's own errors as load errors.
*/
async function bootBrowser(
  level: BrowserLevel,
  kase?: MzCase,
  output?: string
): Promise<ObserverReport> {
  return bootPage(level, { config: OBSERVER_CONFIG, kase }, async (page, text, seen) => {
    const read = readReport(text)
    const report = { ...read, loadErrors: [...read.loadErrors, ...seen] }
    if (output !== undefined) {
      mkdirSync(path.dirname(output), { recursive: true })
      await page.screenshot({ path: `${output}.png` })
      keep(level.log, output, report)
    }
    return report
  })
}

/**
`record` when every engine probe has a result and no control compiled; throws naming what
falls short.
*/
function checkedProbe(record: EngineProbeReport): EngineProbeReport {
  const ids = record.probes.map(({ id }) => id).join(' ')
  if (ids !== ENGINE_PROBES.map(({ id }) => id).join(' ')) {
    throw new Error('the engine probe does not hold one result per probe, in table order')
  }
  if (record.unloaded.length > 0) {
    throw new Error(`the engine did not load the probe scripts of ${record.unloaded.join(', ')}`)
  }
  const compiled = record.controls.filter((control) => control.compiled).map(({ id }) => id)
  if (record.controls.length !== PROBE_CONTROLS.length || compiled.length > 0) {
    throw new Error(
      `the engine compiled the control ${compiled.join(', ')}: its probe results prove nothing`
    )
  }
  return record
}

/**
The engine probe the browser published, from its element's text.
*/
function probeFrom(text: string): EngineProbeReport {
  const parsed: unknown = JSON.parse(text)
  return checkedProbe(probeReportOf(parsed))
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
        probe: async () =>
          bootPage(level, { config: PROBE_CONFIG }, (_page, text) => probeFrom(text)),
        counts: () => ({ launches: log.launches, reports: log.reports }),
        print: (line) => {
          print(log, line)
        },
        keep: (output, report) => {
          keep(log, output, report)
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
The engine MZ_NWJS_EXE names; the message never repeats the value.
*/
function nwjsExecutable(): string {
  const { MZ_NWJS_EXE: exe = '' } = process.env
  if (!path.isAbsolute(exe)) {
    throw new Error(
      'MZ_NWJS_EXE must be the absolute path of the NW.js executable MZ playtests with'
    )
  }
  return exe
}

interface NwjsLevel {
  exe: string
  copy: string
  launches: number
  reports: number
}

/**
Starts the engine once on the copy with the observer installed by `config` and, when given,
`kase`, and returns the report it wrote, or why it wrote none.
*/
async function launchNwjs(
  level: NwjsLevel,
  config: ObserverConfig,
  kase?: MzCase
): Promise<{ report: unknown } | { failure: string }> {
  install(level.copy, config, kase)
  level.launches += 1
  const { report, timedOut } = await launchOnce(
    nwjsCommand(level.exe, level.copy),
    path.join(level.copy, config.reportFile),
    NWJS_BOUND_MS
  )
  if (report !== undefined) level.reports += 1
  if (timedOut) return { failure: `NW.js did not exit within ${String(NWJS_BOUND_MS)} ms` }
  return report === undefined ? { failure: 'NW.js exited without writing a report' } : { report }
}

/**
Boots the copy once in NW.js with `kase` installed, when given; a launch that wrote no report or
did not exit is a boot that failed.
*/
async function bootNwjs(level: NwjsLevel, kase?: MzCase): Promise<ObserverReport> {
  const launched = await launchNwjs(level, OBSERVER_CONFIG, kase)
  if ('report' in launched) return reportOf(launched.report)
  return {
    loadErrors: [],
    bootErrors: [],
    errorPrinter: '',
    steps: [],
    records: [],
    ran: [],
    isSentinelSet: false,
    isDone: false,
    failure: launched.failure
  }
}

/**
Boots the copy the browser level holds once in NW.js with no case plugin, and hands the NW.js
level to `provide`; its lines and reports go where the browser level's go.
*/
async function provideNwjsLevel(
  mz: MzHarness,
  provide: (harness: MzHarness) => Promise<void>
): Promise<void> {
  const level: NwjsLevel = { exe: nwjsExecutable(), copy: mz.copy, launches: 0, reports: 0 }
  const baseline = await bootNwjs(level)
  if (baseline.failure !== undefined) {
    throw new Error(`the copy does not boot in NW.js with no case plugin: ${baseline.failure}`)
  }
  const baselineErrors = [...baseline.loadErrors, ...baseline.bootErrors]
  mz.print(`mz-runtime: level nwjs baseline-errors ${String(baselineErrors.length)}`)
  await provide({
    copy: mz.copy,
    level: 'nwjs',
    engine: 'NW.js',
    baselineErrors,
    manifestFiles: mz.manifestFiles,
    run: async (kase, output) => {
      const report = await bootNwjs(level, kase)
      if (output !== undefined) mz.keep(output, report)
      return verdictOf(kase, report, baselineErrors)
    },
    probe: async () => {
      const launched = await launchNwjs(level, PROBE_CONFIG)
      if ('failure' in launched) throw new Error(`the engine probe failed: ${launched.failure}`)
      return checkedProbe(probeReportOf(launched.report))
    },
    counts: () => ({ launches: level.launches, reports: level.reports }),
    print: (line) => {
      mz.print(line)
    },
    keep: (output, report) => {
      mz.keep(output, report)
    }
  })
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

export const test = base.extend<object, { mz: MzHarness; nwjs: MzHarness }>({
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
      // Every process that used the copy has ended: the browser closed before this point, and
      // each NW.js launch ended before its boot returned
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
  ],
  nwjs: [
    async ({ mz }, provide) => {
      await provideNwjsLevel(mz, provide)
    },
    { scope: 'worker', timeout: 300_000 }
  ]
})

export { expect } from '../fixtures/app'
