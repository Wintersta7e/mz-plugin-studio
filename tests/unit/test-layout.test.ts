// The test directory decides the environment: node tests must not import stores,
// components, App or Testing Library, and every test file sits in one of four folders.
import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync } from 'fs'
import { join } from 'path'
import { ESLint } from 'eslint'
import eslintConfig from '../../eslint.config.mjs'

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

const TEST_DIRS = ['unit', 'integration', 'dom', 'golden'] as const
const DOM_BOUND_DIRS = ['dom', 'golden']

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

const ROUTED = new RegExp(`^(?:${ROUTED_GROUPS.map(globToSource).join('|')})$`)

const SPECIFIER_PATTERNS = [
  /\bfrom\s+['"]([^'"]+)['"]/g,
  /\bimport\s+['"]([^'"]+)['"]/g,
  /\bimport\(\s*['"]([^'"]+)['"]\s*\)/g,
  /\brequire\(\s*['"]([^'"]+)['"]\s*\)/g,
  /\bvi\.mock\(\s*['"]([^'"]+)['"]/g
]

const ENV_PRAGMA = '@vitest-' + 'environment'
const MODULE_ONLY_SYNTAX = 'import' + '.meta'
const MARKER = /\b(?:it|test|describe)(?:\.\w+)*\.(?:skip|only|todo|fails)\s*\(/

const TESTS_ROOT = join(process.cwd(), 'tests')

const allFiles = (readdirSync(TESTS_ROOT, { recursive: true }) as string[])
  .map((p) => p.split('\\').join('/'))
  .filter((p) => /\.(ts|tsx)$/.test(p))
const testFiles = allFiles.filter((p) => /\.test\.(ts|tsx)$/.test(p))
const read = (rel: string): string => readFileSync(join(TESTS_ROOT, rel), 'utf8')

function specifiers(source: string): string[] {
  const found: string[] = []
  for (const pattern of SPECIFIER_PATTERNS) {
    for (const m of source.matchAll(pattern)) found.push(m[1])
  }
  return found
}

describe('test layout', () => {
  it('places every test file in unit, integration, dom or golden', () => {
    const counts = { unit: 0, integration: 0, dom: 0, golden: 0 }
    const misplaced: string[] = []
    for (const file of testFiles) {
      const first = file.split('/')[0]
      if ((TEST_DIRS as readonly string[]).includes(first)) counts[first as keyof typeof counts]++
      else misplaced.push(file)
    }
    const fixtureTests = testFiles.filter((f) => f.startsWith('fixtures/'))

    let importsScanned = 0
    const routedOutsideDom: string[] = []
    for (const file of allFiles) {
      if (DOM_BOUND_DIRS.includes(file.split('/')[0])) continue
      for (const spec of specifiers(read(file))) {
        importsScanned++
        if (ROUTED.test(spec)) routedOutsideDom.push(`${file}: ${spec}`)
      }
    }

    console.log(
      `test layout: files ${testFiles.length} (unit ${counts.unit}, integration ${counts.integration}, ` +
        `dom ${counts.dom}, golden ${counts.golden}); imports scanned ${importsScanned}`
    )
    expect(testFiles.length).toBeGreaterThan(0)
    expect(importsScanned).toBeGreaterThan(0)
    expect(misplaced).toEqual([])
    expect(fixtureTests).toEqual([])
    expect(routedOutsideDom).toEqual([])
  })

  it('has no skip markers, environment pragmas or module-only syntax in shared helpers', () => {
    const markers = allFiles.filter((f) => MARKER.test(read(f)))
    const pragmas = allFiles.filter((f) => read(f).includes(ENV_PRAGMA))
    const helperModuleSyntax = allFiles.filter(
      (f) => f.startsWith('helpers/') && read(f).includes(MODULE_ONLY_SYNTAX)
    )
    console.log(
      `test layout: skip/only/todo/fails markers ${markers.length}, environment pragmas ${pragmas.length}, ` +
        `module-only syntax in shared helpers ${helperModuleSyntax.length}`
    )
    expect(markers).toEqual([])
    expect(pragmas).toEqual([])
    expect(helperModuleSyntax).toEqual([])
  })

  it('mirrors the routed list in the ESLint routing block', () => {
    type Block = { files?: string[]; ignores?: string[]; rules?: Record<string, unknown> }
    const block = (eslintConfig as Block[]).find(
      (b) =>
        b.rules?.['no-restricted-imports'] !== undefined &&
        (b.files ?? []).some((f) => f.startsWith('tests/'))
    )
    expect(block).toBeDefined()
    expect(block!.ignores).toEqual(['tests/dom/**', 'tests/golden/**'])
    const [, options] = block!.rules!['no-restricted-imports'] as [
      string,
      { patterns: { group: string[] }[] }
    ]
    expect(options.patterns).toHaveLength(1)
    expect([...options.patterns[0].group].sort()).toEqual([...ROUTED_GROUPS].sort())
  })

  it('reports routed imports outside the DOM folders', { timeout: 60_000 }, async () => {
    const q = "'"
    const sources = [
      `import { usePluginStore } from ${q}../../src/renderer/src/stores/pluginStore${q}\nusePluginStore()\n`,
      `import { render } from ${q}@testing-library/react${q}\nrender(null)\n`
    ]
    const eslint = new ESLint({ cwd: process.cwd() })
    const routedMessages = async (source: string, filePath: string): Promise<number> => {
      const [result] = await eslint.lintText(source, { filePath: join(process.cwd(), filePath) })
      return result.messages.filter((m) => m.ruleId === 'no-restricted-imports').length
    }
    for (const source of sources) {
      expect(await routedMessages(source, 'tests/unit/routing-probe.test.ts')).toBe(1)
      expect(await routedMessages(source, 'tests/dom/routing-probe.test.tsx')).toBe(0)
    }
  })
})
