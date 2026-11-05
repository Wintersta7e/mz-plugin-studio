// Static rules of the end-to-end suite under e2e/: what it installs, where it launches the app,
// which locators and test modifiers it may use, and why a run cannot pass with nothing tested.
import { execFileSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { FullConfig, FullResult, Suite, TestCase } from '@playwright/test/reporter'
import EndToEndReporter from '../../e2e/reporter'
import { REUSE_FLAG } from '../../scripts/e2e-prepare.mjs'
import {
  CONTAINER_OPTIONS,
  IMAGE,
  imageCommand,
  isCopyBack,
  REPORT,
  VISUAL_IMAGE_ENV,
  XVFB
} from '../../scripts/e2e-visual-update.mjs'
import { readJobs, type Job } from '../helpers/workflow-reader'

const ROOT = fileURLToPath(new URL('../../', import.meta.url))
const read = (file: string): string => readFileSync(path.join(ROOT, file), 'utf8')
const readJson = (file: string): unknown => JSON.parse(read(file))

/**
The value at `keys` inside parsed JSON, or undefined where a level is missing or not an object
*/
function valueAt(value: unknown, ...keys: string[]): unknown {
  let current = value
  for (const key of keys) {
    if (typeof current !== 'object' || current === null) return undefined
    current = Reflect.get(current, key)
  }
  return current
}

const text = (value: unknown): string => (typeof value === 'string' ? value : '')

/**
The entries of a parsed JSON object whose values are strings
*/
function stringEntries(value: unknown): [string, string][] {
  const entries =
    typeof value === 'object' && value !== null
      ? Object.keys(value).map((key): [string, unknown] => [key, Reflect.get(value, key)])
      : []
  return entries.filter((entry): entry is [string, string] => typeof entry[1] === 'string')
}

function byCodeUnit(left: string, right: string): number {
  if (left === right) return 0
  return left < right ? -1 : 1
}

const FIXTURE_MODULE = 'e2e/fixtures/app.ts'
const CONFIG = 'e2e/playwright.config.ts'

// Each rule names what an e2e module must not contain
const BANNED: [string, RegExp][] = [
  ['a fixed wait', /\bwaitForTimeout\b/],
  ['a destroy call', /\.destroy\(/],
  ['a vm import', /(?:from\s+|require\(\s*|import\(\s*)['"](?:node:)?vm['"]/],
  ['a copy-text locator', /\bgetBy(?:Text|Label|Placeholder|Title|AltText)\(/],
  ['a role locator by name', /\bgetByRole\(\s*['"][^'"]*['"]\s*,\s*\{[^}]*\bname\s*:/],
  ['a skipped, focused or expected-to-fail test', /\.(?:skip|only|fixme)\(|\btest\.fail\b/]
]

const SPECIFIERS = [
  /\bfrom\s+['"]([^'"]+)['"]/g,
  /\bimport\s+['"]([^'"]+)['"]/g,
  /\bimport\(\s*['"]([^'"]+)['"]\s*\)/g,
  /\brequire\(\s*['"]([^'"]+)['"]\s*\)/g
]

const toPosix = (location: string): string => location.split(path.sep).join('/')

/**
e2e modules in the tree: tracked, plus new files git does not ignore
*/
function e2eModules(): string[] {
  return execFileSync(
    'git',
    ['ls-files', '--cached', '--others', '--exclude-standard', '--', 'e2e'],
    { cwd: ROOT, encoding: 'utf8' }
  )
    .split('\n')
    .filter((file) => file.endsWith('.ts') && existsSync(path.join(ROOT, file)))
}

const count = (source: string, pattern: RegExp): number =>
  source.match(new RegExp(pattern.source, 'g'))?.length ?? 0

/**
The repository paths of the relative imports under tests/ that are not test helpers
*/
function testImports(file: string, source: string): string[] {
  const directory = path.resolve(ROOT, path.dirname(file))
  return SPECIFIERS.flatMap((pattern) =>
    source
      .matchAll(pattern)
      .map(([, specifier = '']) => specifier)
      .toArray()
  )
    .filter((specifier) => specifier.startsWith('.'))
    .map((specifier) => toPosix(path.relative(ROOT, path.resolve(directory, specifier))))
    .filter((location) => location.startsWith('tests/') && !location.startsWith('tests/helpers/'))
}

/**
True for a value carrying the outcome and the results the reporter reads from a test
*/
function isTestCase(value: unknown): value is TestCase {
  return typeof value === 'object' && value !== null && 'outcome' in value && 'results' in value
}

/**
True for a value carrying the test list the reporter reads from its suite
*/
function isSuite(value: unknown): value is Suite {
  return typeof value === 'object' && value !== null && 'allTests' in value
}

/**
True for an object: the reporter reads no member of its config
*/
function isConfig(value: unknown): value is FullConfig {
  return typeof value === 'object' && value !== null
}

function testCase(outcome: ReturnType<TestCase['outcome']>, runs = 1): TestCase {
  const fake = {
    outcome: () => outcome,
    results: Array.from({ length: runs }, (_, retry) => ({ retry }))
  }
  if (!isTestCase(fake)) throw new Error('the fake test case has no outcome or results')
  return fake
}

const WORKFLOWS = path.join(ROOT, '.github/workflows')
const WORKFLOW_FILES = ['ci.yml', 'release.yml']

function jobIn(file: string, id: string): Job {
  const job = readJobs(path.join(WORKFLOWS, file)).find((each) => each.id === id)
  if (!job) throw new Error(`${file} has no job ${id}`)
  return job
}

/**
`file:line` of each line of a workflow file that holds `needle`
*/
function workflowLinesWith(file: string, needle: string): string[] {
  return read(`.github/workflows/${file}`)
    .split(/\r?\n/)
    .map((line, index) => ({ line, at: `${file}:${String(index + 1)}` }))
    .filter(({ line }) => line.includes(needle))
    .map(({ at }) => at)
}

// The Windows jobs package the release just before, so they reuse it
const PREPARE_REUSE = `npm run e2e:prepare -- ${REUSE_FLAG}`
const RELEASE_SMOKE =
  'node node_modules/@playwright/test/cli.js test -c e2e/playwright.config.ts --project=release-smoke'
// The report and the traces of a failed run, where Playwright writes them
const REPORT_PATHS = ['path: |', `${REPORT}/`, 'test-results/']
const UPLOAD = /^actions\/upload-artifact@[0-9a-f]{40} # v\d+\.\d+\.\d+$/
// The hosted runner's user, owner of the checkout; the image's non-root user has the same id
const CONTAINER_USER = '1001'

/**
Asserts `job` runs `commands` as single-line steps, in this order, and returns their indexes
*/
function stepsInOrder(job: Job, commands: string[]): number[] {
  const at = commands.map((command) =>
    job.steps.findIndex((step) => step.keys.get('run') === command)
  )
  const previous = [-1, ...at]
  const ordered = at.map((index, n) => index > (previous[n] ?? -1))

  expect(commands.map((command, n) => [`${job.id}: ${command}`, ordered[n]])).toStrictEqual(
    commands.map((command) => [`${job.id}: ${command}`, true])
  )

  return at
}

/**
Asserts `job`'s last step uploads the report and traces only when a step failed
*/
function expectReportUpload(job: Job, after: number | undefined): void {
  const uploads = job.steps.filter((step) => UPLOAD.test(step.keys.get('uses') ?? ''))
  const upload = uploads.at(0)

  expect({
    job: job.id,
    uploads: uploads.length,
    isAfterTests: upload !== undefined && after !== undefined && job.steps.indexOf(upload) > after,
    condition: upload?.keys.get('if'),
    paths: upload?.nested.slice(-REPORT_PATHS.length)
  }).toStrictEqual({
    job: job.id,
    uploads: 1,
    isAfterTests: true,
    condition: 'failure()',
    paths: REPORT_PATHS
  })
}

/**
The project names of the real config, loaded on `platform` with `argv` as the command line
*/
async function configProjects(platform: NodeJS.Platform, argv: string[] = []): Promise<string[]> {
  const saved = { platform: process.platform, argv: process.argv }
  Object.defineProperty(process, 'platform', { value: platform })
  process.argv = [...saved.argv.slice(0, 2), ...argv]
  try {
    vi.resetModules()
    const { default: config } = await import('../../e2e/playwright.config')
    return (config.projects ?? []).map((project) => project.name ?? '')
  } finally {
    Object.defineProperty(process, 'platform', { value: saved.platform })
    process.argv = saved.argv
  }
}

async function verdict(tests: TestCase[]): Promise<FullResult['status'] | undefined> {
  const reporter = new EndToEndReporter()
  const config = {}
  const suite = { allTests: () => tests }
  if (!isConfig(config) || !isSuite(suite)) throw new Error('the fake run has no test list')
  reporter.onBegin(config, suite)
  const result = await reporter.onEnd({ status: 'passed', startTime: new Date(0), duration: 0 })
  return result?.status
}

/**
The e2e modules with their launch and spawn sites, and each rule a module breaks
*/
function scanModules(): {
  files: string[]
  launchSites: number
  spawnSites: number
  violations: string[]
} {
  const files = e2eModules()
  let launchSites = 0
  let spawnSites = 0
  const violations: string[] = []
  for (const file of files) {
    const source = read(file)
    const launches = count(source, /_electron\.launch\(/)
    const spawns = count(source, /\bspawn\(/)
    launchSites += launches
    spawnSites += spawns
    if (file !== FIXTURE_MODULE && launches + spawns > 0) violations.push(`${file}: launches`)
    for (const [rule, pattern] of BANNED)
      if (pattern.test(source)) violations.push(`${file}: ${rule}`)
    for (const imported of testImports(file, source))
      violations.push(`${file}: imports ${imported}`)
  }
  process.stdout.write(
    `e2e scope: files ${String(files.length)}, launch sites ${String(launchSites)}, spawn sites ${String(spawnSites)}, violations ${String(violations.length)}\n`
  )
  return { files, launchSites, spawnSites, violations }
}

describe('e2e harness', () => {
  it('pins the harness packages exactly and installs no browser', () => {
    const manifest = readJson('package.json')
    const lock = readJson('package-lock.json')

    expect([
      valueAt(manifest, 'devDependencies', '@playwright/test'),
      valueAt(manifest, 'devDependencies', '@electron/fuses'),
      valueAt(lock, 'packages', 'node_modules/@playwright/test', 'version'),
      valueAt(lock, 'packages', 'node_modules/@electron/fuses', 'version')
    ]).toStrictEqual(['1.64.1', '2.1.3', '1.64.1', '2.1.3'])

    const workflows = readdirSync(path.join(ROOT, '.github/workflows')).filter((f) =>
      f.endsWith('.yml')
    )
    const installs = [
      ...workflows.flatMap((file) => workflowLinesWith(file, 'playwright install')),
      ...stringEntries(valueAt(manifest, 'scripts'))
        .filter(([, script]) => script.includes('playwright install'))
        .map(([name]) => `package.json script ${name}`)
    ]
    process.stdout.write(
      `e2e pins: workflows scanned ${String(workflows.length)}, browser installs ${String(installs.length)}\n`
    )

    expect(workflows.length).toBeGreaterThan(0)
    expect(installs).toStrictEqual([])
  })

  it('launches only from the fixture module', () => {
    const { files, launchSites, spawnSites, violations } = scanModules()

    expect(files.length).toBeGreaterThan(0)
    expect(files).toContain(FIXTURE_MODULE)
    expect(launchSites).toBe(1)
    // The release build is spawned, not launched through the test library
    expect(spawnSites).toBe(1)
    expect(violations).toStrictEqual([])
  })

  it('cannot pass an empty run', async () => {
    expect.hasAssertions()

    const config = read(CONFIG)

    expect(
      ['retries: 0', 'workers: 1', 'forbidOnly: !!process.env.CI', "'./reporter.ts'"].filter(
        (setting) => !config.includes(setting)
      )
    ).toStrictEqual([])

    const e2e = valueAt(readJson('package.json'), 'scripts', 'e2e')

    expect(e2e).toContain(`-c ${CONFIG}`)
    expect(e2e).not.toContain('--pass-with-no-tests')

    await expect(
      Promise.all(
        [
          [],
          [testCase('expected')],
          [testCase('expected'), testCase('skipped')],
          [testCase('expected'), testCase('flaky', 2)],
          [testCase('expected'), testCase('unexpected')]
        ].map(async (tests) => verdict(tests))
      )
    ).resolves.toStrictEqual(['failed', undefined, 'failed', 'failed', 'failed'])
  })

  it('copies back only Linux baselines from the image run', () => {
    expect(isCopyBack('e2e/__screenshots__/linux/a.png')).toBe(true)
    expect(
      [
        'e2e/__screenshots__/win32/a.png',
        'e2e/__screenshots__/linux/a.txt',
        'e2e/__screenshots__/linux/nested/a.png',
        'package-lock.json',
        'e2e/flows/x.e2e.ts'
      ].filter((location) => isCopyBack(location))
    ).toStrictEqual([])
  })
})

describe('e2e harness: Linux image', () => {
  it('runs flows and the visual comparison in the pinned image on Linux', () => {
    const job = jobIn('ci.yml', 'e2e-linux')

    expect(job.keys.get('runs-on')).toBe('ubuntu-24.04')

    const at = stepsInOrder(job, [
      'npm ci --ignore-scripts',
      'node node_modules/electron/install.js',
      'npm run e2e:prepare',
      `${XVFB} npm run e2e`,
      `${XVFB} npm run e2e:visual`
    ])
    expectReportUpload(job, at.at(-1))

    const xvfbRuns = WORKFLOW_FILES.flatMap((file) =>
      readJobs(path.join(WORKFLOWS, file)).flatMap((each) =>
        each.steps.flatMap((step) => step.run).filter((line) => line.includes('xvfb-run'))
      )
    )
    process.stdout.write(`e2e xvfb runs in workflows: ${String(xvfbRuns.length)}\n`)

    expect(xvfbRuns.length).toBeGreaterThan(0)
    expect(xvfbRuns.filter((line) => !line.startsWith(`${XVFB} `))).toStrictEqual([])
  })

  describe('visual project', () => {
    afterEach(() => {
      vi.unstubAllEnvs()
    })

    it('exists only inside the pinned image on Linux', async () => {
      expect.hasAssertions()

      vi.stubEnv(VISUAL_IMAGE_ENV, undefined)

      await expect(configProjects('linux')).resolves.toStrictEqual(['flows', 'release-smoke'])

      vi.stubEnv(VISUAL_IMAGE_ENV, '1')

      await expect(configProjects('linux')).resolves.toStrictEqual([
        'flows',
        'release-smoke',
        'visual'
      ])
      await expect(configProjects('win32')).resolves.toStrictEqual(['flows', 'release-smoke'])
    })

    it('names the image run when selected outside the image', async () => {
      expect.hasAssertions()

      vi.stubEnv(VISUAL_IMAGE_ENV, undefined)

      await expect(configProjects('linux', ['--project=visual'])).rejects.toThrow(
        'npm run e2e:visual:update -- --check'
      )
      await expect(configProjects('linux', ['--project', 'visual'])).rejects.toThrow(
        'npm run e2e:visual:update -- --check'
      )
      await expect(configProjects('linux', ['--project=flows'])).resolves.toStrictEqual([
        'flows',
        'release-smoke'
      ])
    })

    it('is enabled by the CI image job and the local image run', () => {
      expect(jobIn('ci.yml', 'e2e-linux').nested.get('env')).toStrictEqual([
        `${VISUAL_IMAGE_ENV}: '1'`
      ])
      expect(
        [true, false].filter(
          (isCheck) => !imageCommand(isCheck).includes(`${VISUAL_IMAGE_ENV}=1 ${XVFB} `)
        )
      ).toStrictEqual([])
    })
  })

  it('keeps one image reference', () => {
    const version = text(
      valueAt(readJson('package.json'), 'devDependencies', '@playwright/test')
    ).replaceAll('.', '\\.')

    expect(IMAGE).toMatch(
      new RegExp(String.raw`^mcr\.microsoft\.com/playwright:v${version}-noble@sha256:[0-9a-f]{64}$`)
    )
    expect(jobIn('ci.yml', 'e2e-linux').nested.get('container')).toStrictEqual([
      `image: ${IMAGE}`,
      `options: ${[...CONTAINER_OPTIONS, '--user', CONTAINER_USER].join(' ')}`
    ])

    const references = WORKFLOW_FILES.flatMap((file) =>
      workflowLinesWith(file, 'mcr.microsoft.com/')
    )

    expect(references).toHaveLength(1)
  })
})

describe('e2e harness: Windows', () => {
  it('runs flows and release smoke on Windows and compares no pixels there', () => {
    const packageWin = jobIn('ci.yml', 'package-win')
    const fuses = packageWin.steps.findIndex((step) => step.keys.get('name') === 'Fuse wire')
    const [prepare = -1, e2e = -1] = stepsInOrder(packageWin, [PREPARE_REUSE, 'npm run e2e'])
    expectReportUpload(packageWin, e2e)

    const build = jobIn('release.yml', 'build')
    const wire = build.steps.findIndex((step) => step.keys.get('name') === 'Fuse wire')
    const portable = build.steps.findIndex(
      (step) => step.keys.get('name') === 'Upload portable exe'
    )
    const [smokePrepare = -1, smoke = -1] = stepsInOrder(build, [PREPARE_REUSE, RELEASE_SMOKE])

    expect({
      hasFuses: fuses !== -1,
      isE2eAfterFuses: prepare > fuses,
      hasWire: wire !== -1,
      isSmokeAfterWire: smokePrepare > wire,
      isPortableAfterSmoke: portable > smoke
    }).toStrictEqual({
      hasFuses: true,
      isE2eAfterFuses: true,
      hasWire: true,
      isSmokeAfterWire: true,
      isPortableAfterSmoke: true
    })

    const windowsJobs = WORKFLOW_FILES.flatMap((file) =>
      readJobs(path.join(WORKFLOWS, file)).filter(
        (each) => each.keys.get('runs-on') === 'windows-2025'
      )
    )
    const pixelLines = windowsJobs.flatMap((each) =>
      each.steps
        .flatMap((step) => [...step.keys.values(), ...step.nested])
        .filter((line) =>
          /e2e:visual|--project=visual|--update-snapshots|__screenshots__/.test(line)
        )
        .map((line) => `${each.id}: ${line}`)
    )
    process.stdout.write(
      `e2e Windows jobs scanned ${String(windowsJobs.length)}, pixel steps ${String(pixelLines.length)}\n`
    )

    expect({
      jobs: windowsJobs.map((each) => each.id).toSorted(byCodeUnit),
      pixelLines
    }).toStrictEqual({ jobs: ['build', 'package-win'], pixelLines: [] })

    const needs = jobIn('ci.yml', 'test').keys.get('needs') ?? ''

    expect(
      needs
        .replaceAll(/^\[|\]$/g, '')
        .split(',')
        .map((id) => id.trim())
    ).toContain('e2e-linux')
  })
})
