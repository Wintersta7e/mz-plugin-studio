// The test directory decides the environment: node tests must not import stores,
// components, App or Testing Library, and every test file sits in one of four folders.
import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { ESLint } from 'eslint'
import { TEST_DIRS } from '../helpers/test-directories'

const join = (...parts: string[]): string => path.join(...parts)

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
const member = (record: Record<string, unknown>, key: string): unknown => Reflect.get(record, key)
const isList = (value: unknown): value is unknown[] => Array.isArray(value)
const isStringArray = (value: unknown): value is string[] =>
  isList(value) && value.every((item) => typeof item === 'string')
const configPath = pathToFileURL(join(process.cwd(), 'eslint.config.mjs')).href
// The ESLint config block that restricts imports in test files.
const isTestRoutingBlock = (candidate: unknown): boolean => {
  if (!isRecord(candidate)) return false
  const rules = member(candidate, 'rules')
  const files = member(candidate, 'files')
  return (
    isRecord(rules) &&
    rules['no-restricted-imports'] !== undefined &&
    isStringArray(files) &&
    files.some((file) => file.startsWith('tests/'))
  )
}

// Owner of the routed-specifier list; the ESLint routing block mirrors it.
const ROUTED_GROUPS = [
  '**/renderer/src/stores',
  '**/renderer/src/stores/**',
  '@/stores',
  '@/stores/**',
  '**/renderer/src/components',
  '**/renderer/src/components/**',
  '@/components',
  '@/components/**',
  '**/renderer/src/App',
  '@/App',
  '@testing-library/react',
  '@testing-library/user-event'
]

const DOM_BOUND_DIRS = new Set(['dom', 'golden'])

// Timeout at three times the test's slowest CI time under coverage, rounded up to the next 5 s.
// Importing the ESLint config loads every lint plugin it names.
const CONFIG_IMPORT_TIMEOUT_MS = 15_000

const escapeRegex = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

function globToSource(glob: string): string {
  let rest = glob
  let prefix = ''
  let suffix = ''
  if (rest.startsWith('**/')) {
    prefix = '(?:.*/)?'
    rest = rest.slice(3)
  }
  if (rest.endsWith('/**')) {
    suffix = '/.+'
    rest = rest.slice(0, -3)
  }
  return prefix + escapeRegex(rest) + suffix
}

const ROUTED = new RegExp(`^(?:${ROUTED_GROUPS.map((group) => globToSource(group)).join('|')})$`)

const SPECIFIER_PATTERNS = [
  /\bfrom\s+['"][^'"]+['"]/g,
  /\bimport\s+['"][^'"]+['"]/g,
  /\bimport\(\s*['"][^'"]+['"]\s*\)/g,
  /\brequire\(\s*['"][^'"]+['"]\s*\)/g,
  /\bvi\.mock\(\s*['"][^'"]+['"]/g
]

const ENV_PRAGMA = ['@vitest-', 'environment'].join('')
const MODULE_ONLY_SYNTAX = ['import', '.meta'].join('')

const TESTS_ROOT = join(process.cwd(), 'tests')

const allFiles = readdirSync(TESTS_ROOT, { recursive: true })
  .map((entry) => (typeof entry === 'string' ? entry : entry.toString('utf8')))
  .map((entry) => entry.replaceAll('\\', '/'))
  .filter((p) => /\.(?:ts|tsx)$/.test(p))
const testFiles = allFiles.filter((p) => /\.test\.(?:ts|tsx)$/.test(p))
const read = (relative: string): string => readFileSync(join(TESTS_ROOT, relative), 'utf8')

function specifiers(source: string): string[] {
  const found: string[] = []
  for (const pattern of SPECIFIER_PATTERNS) {
    for (const match of source.matchAll(pattern)) {
      const specifier = /['"]([^'"]+)['"]/.exec(match[0])?.at(1)
      if (specifier === undefined) throw new Error('Import match has no specifier')
      found.push(specifier)
    }
  }
  return found
}

function routedImports(): { importsScanned: number; routedOutsideDom: string[] } {
  let importsScanned = 0
  const routedOutsideDom: string[] = []
  for (const file of allFiles) {
    if (DOM_BOUND_DIRS.has(file.split('/', 1).at(0) ?? '')) continue
    const imports = specifiers(read(file))
    for (const spec of imports) {
      importsScanned++
      if (ROUTED.test(spec)) routedOutsideDom.push(`${file}: ${spec}`)
    }
  }
  return { importsScanned, routedOutsideDom }
}

function fileCounts(): {
  counts: Record<(typeof TEST_DIRS)[number], number>
  misplaced: string[]
} {
  const counts = { unit: 0, integration: 0, dom: 0, golden: 0 }
  const misplaced: string[] = []
  for (const file of testFiles) {
    const first = file.split('/', 1).at(0)
    const category = TEST_DIRS.find((directory) => directory === first)
    if (category === undefined) misplaced.push(file)
    else counts[category]++
  }
  return { counts, misplaced }
}

describe('test layout', () => {
  it('places every test file in unit, integration, dom or golden', () => {
    const { counts, misplaced } = fileCounts()
    const fixtureTests = testFiles.filter((file) => file.startsWith('fixtures/'))
    const { importsScanned, routedOutsideDom } = routedImports()

    process.stdout.write(
      `test layout: files ${String(testFiles.length)} (unit ${String(counts.unit)}, integration ${String(counts.integration)}, ` +
        `dom ${String(counts.dom)}, golden ${String(counts.golden)}); imports scanned ${String(importsScanned)}\n`
    )

    expect(testFiles.length).toBeGreaterThan(0)
    expect(importsScanned).toBeGreaterThan(0)
    expect(misplaced).toStrictEqual([])
    expect(fixtureTests).toStrictEqual([])
    expect(routedOutsideDom).toStrictEqual([])
  })

  // Skipped, todo and expected-to-fail tests are counted from the run itself, by
  // tests/setup/no-skips-reporter.ts; a focused test fails the run through allowOnly.
  it('has no environment pragmas or module-only syntax in shared helpers', () => {
    const pragmas = allFiles.filter((f) => read(f).includes(ENV_PRAGMA))
    const helperModuleSyntax = allFiles.filter(
      (f) => f.startsWith('helpers/') && read(f).includes(MODULE_ONLY_SYNTAX)
    )
    process.stdout.write(
      `test layout: environment pragmas ${String(pragmas.length)}, ` +
        `module-only syntax in shared helpers ${String(helperModuleSyntax.length)}\n`
    )

    expect(pragmas).toStrictEqual([])
    expect(helperModuleSyntax).toStrictEqual([])
  })

  it(
    'mirrors the routed list in the ESLint routing block',
    async () => {
      expect.assertions(4)

      const moduleValue: unknown = await import(configPath)
      const config = isRecord(moduleValue) ? member(moduleValue, 'default') : undefined
      const blocks: unknown[] = Array.isArray(config) ? config : []
      const block = blocks.find((candidate) => isTestRoutingBlock(candidate))

      expect(block).toBeDefined()
      expect(isRecord(block) ? member(block, 'ignores') : undefined).toStrictEqual([
        'tests/dom/**',
        'tests/golden/**'
      ])

      const blockRules = isRecord(block) ? member(block, 'rules') : undefined
      const rules = isRecord(blockRules) ? blockRules : {}
      const restriction = rules['no-restricted-imports']
      const options = isList(restriction) ? restriction.at(1) : undefined
      const patterns = isRecord(options) ? member(options, 'patterns') : undefined
      const firstPattern = isList(patterns) ? patterns.at(0) : undefined
      const group = isRecord(firstPattern) ? member(firstPattern, 'group') : undefined

      expect(patterns).toHaveLength(1)
      expect(
        isStringArray(group) ? group.toSorted((a, b) => a.localeCompare(b)) : group
      ).toStrictEqual([...ROUTED_GROUPS].toSorted((a, b) => a.localeCompare(b)))
    },
    CONFIG_IMPORT_TIMEOUT_MS
  )

  it('reports routed imports outside the DOM folders', { timeout: 60_000 }, async () => {
    const q = "'"
    const sources = [
      `import { usePluginStore } from ${q}../../src/renderer/src/stores/pluginStore${q}\nusePluginStore()\n`,
      `import { render } from ${q}@testing-library/react${q}\nrender(null)\n`
    ]
    const eslint = new ESLint({ cwd: process.cwd() })
    const routedMessages = async (source: string, filePath: string): Promise<number> => {
      const results = await eslint.lintText(source, { filePath: join(process.cwd(), filePath) })
      const result = results.at(0)
      if (result === undefined) throw new Error('ESLint returned no result')
      return result.messages.filter((m) => m.ruleId === 'no-restricted-imports').length
    }
    for (const source of sources) {
      await expect(routedMessages(source, 'tests/unit/test-layout.test.ts')).resolves.toBe(1)
      await expect(routedMessages(source, 'tests/dom/app-close.test.tsx')).resolves.toBe(0)
    }
  })
})
