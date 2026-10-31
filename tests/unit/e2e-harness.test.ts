// Static rules of the end-to-end suite under e2e/: what it installs, where it launches the app,
// which locators and test modifiers it may use, and why a run cannot pass with nothing tested.
import { execFileSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import type { FullConfig, FullResult, Suite, TestCase } from '@playwright/test/reporter'
import E2eReporter from '../../e2e/reporter'

const ROOT = fileURLToPath(new URL('../../', import.meta.url))
const read = (file: string): string => readFileSync(join(ROOT, file), 'utf8')
const readJson = (file: string): Record<string, unknown> => JSON.parse(read(file))

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

const toPosix = (path: string): string => path.split(sep).join('/')

/** e2e modules in the tree: tracked, plus new files git does not ignore */
function e2eModules(): string[] {
  return execFileSync(
    'git',
    ['ls-files', '--cached', '--others', '--exclude-standard', '--', 'e2e'],
    { cwd: ROOT, encoding: 'utf8' }
  )
    .split('\n')
    .filter((file) => file.endsWith('.ts') && existsSync(join(ROOT, file)))
}

const count = (text: string, pattern: RegExp): number =>
  text.match(new RegExp(pattern.source, 'g'))?.length ?? 0

/** The repository paths of the relative imports under tests/ that are not test helpers */
function testImports(file: string, text: string): string[] {
  return SPECIFIERS.flatMap((pattern) => [...text.matchAll(pattern)].map((match) => match[1]))
    .filter((specifier) => specifier.startsWith('.'))
    .map((specifier) => toPosix(relative(ROOT, resolve(ROOT, dirname(file), specifier))))
    .filter((path) => path.startsWith('tests/') && !path.startsWith('tests/helpers/'))
}

const testCase = (outcome: ReturnType<TestCase['outcome']>, runs = 1): TestCase =>
  ({
    outcome: () => outcome,
    results: Array.from({ length: runs }, (_, retry) => ({ retry }))
  }) as unknown as TestCase

async function verdict(tests: TestCase[]): Promise<FullResult['status'] | undefined> {
  const reporter = new E2eReporter()
  reporter.onBegin({} as FullConfig, { allTests: () => tests } as unknown as Suite)
  const result = await reporter.onEnd({ status: 'passed' } as FullResult)
  return result?.status
}

describe('e2e harness', () => {
  it('pins the harness packages exactly and installs no browser', () => {
    const pkg = readJson('package.json') as {
      devDependencies: Record<string, string>
      scripts: Record<string, string>
    }
    const lock = readJson('package-lock.json') as {
      packages: Record<string, { version: string }>
    }
    expect(pkg.devDependencies['@playwright/test']).toBe('1.64.1')
    expect(pkg.devDependencies['@electron/fuses']).toBe('2.1.3')
    expect(lock.packages['node_modules/@playwright/test'].version).toBe('1.64.1')
    expect(lock.packages['node_modules/@electron/fuses'].version).toBe('2.1.3')

    const workflows = readdirSync(join(ROOT, '.github/workflows')).filter((f) => f.endsWith('.yml'))
    const installs = [
      ...workflows.flatMap((file) =>
        read(`.github/workflows/${file}`)
          .split(/\r?\n/)
          .flatMap((line, i) => (line.includes('playwright install') ? [`${file}:${i + 1}`] : []))
      ),
      ...Object.entries(pkg.scripts).flatMap(([name, script]) =>
        script.includes('playwright install') ? [`package.json script ${name}`] : []
      )
    ]
    console.log(
      `e2e pins: workflows scanned ${workflows.length}, browser installs ${installs.length}`
    )
    expect(workflows.length).toBeGreaterThan(0)
    expect(installs).toEqual([])
  })

  it('launches only from the fixture module', () => {
    const files = e2eModules()
    let launchSites = 0
    let spawnSites = 0
    const violations: string[] = []
    for (const file of files) {
      const text = read(file)
      const launches = count(text, /_electron\.launch\(/)
      const spawns = count(text, /\bspawn\(/)
      launchSites += launches
      spawnSites += spawns
      if (file !== FIXTURE_MODULE && launches + spawns > 0) violations.push(`${file}: launches`)
      for (const [rule, pattern] of BANNED)
        if (pattern.test(text)) violations.push(`${file}: ${rule}`)
      for (const path of testImports(file, text)) violations.push(`${file}: imports ${path}`)
    }
    console.log(
      `e2e scope: files ${files.length}, launch sites ${launchSites}, spawn sites ${spawnSites}, violations ${violations.length}`
    )
    expect(files.length).toBeGreaterThan(0)
    expect(files).toContain(FIXTURE_MODULE)
    expect(launchSites).toBe(1)
    // The release build is spawned, not launched through the test library
    expect(spawnSites).toBe(1)
    expect(violations).toEqual([])
  })

  it('cannot pass an empty run', async () => {
    const config = read(CONFIG)
    for (const setting of ['retries: 0', 'workers: 1', 'forbidOnly: !!process.env.CI'])
      expect(config, setting).toContain(setting)
    expect(config).toContain("'./reporter.ts'")
    const { scripts } = readJson('package.json') as { scripts: Record<string, string> }
    expect(scripts.e2e).toContain(`-c ${CONFIG}`)
    expect(scripts.e2e).not.toContain('--pass-with-no-tests')

    expect(await verdict([])).toBe('failed')
    expect(await verdict([testCase('expected')])).toBeUndefined()
    expect(await verdict([testCase('expected'), testCase('skipped')])).toBe('failed')
    expect(await verdict([testCase('expected'), testCase('flaky', 2)])).toBe('failed')
    expect(await verdict([testCase('expected'), testCase('unexpected')])).toBe('failed')
  })
})
