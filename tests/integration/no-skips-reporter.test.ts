// The run's skip counter on throwaway test trees: every way a test can be skipped, left as a todo
// or marked to pass by failing fails the run; the named parity rule and a name-filtered run do not.
import { describe, it, expect, afterEach } from 'vitest'
import { spawnSync } from 'child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { dirname, join, resolve } from 'path'

const VITEST = resolve(process.cwd(), 'node_modules/vitest/vitest.mjs')
const REPORTER = resolve(process.cwd(), 'tests/setup/no-skips-reporter.ts')

const roots: string[] = []

interface Run {
  status: number | null
  lines: string[]
}

function makeRoot(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), 'no-skips-'))
  roots.push(root)
  const config = {
    test: { globals: true, include: ['**/*.test.{js,ts}'], reporters: [REPORTER] }
  }
  writeFileSync(join(root, 'vitest.config.mjs'), `export default ${JSON.stringify(config)}\n`)
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true })
    writeFileSync(join(root, path), text)
  }
  return root
}

/** Runs vitest on a throwaway tree with only the counter reporting; returns status and lines. */
function run(root: string, args: string[] = [], env: Record<string, string> = {}): Run {
  const inherited = Object.fromEntries(
    Object.entries(process.env).filter(
      ([key]) => !key.startsWith('VITEST') && key !== 'MZ_CORESCRIPT_DIR'
    )
  )
  const result = spawnSync(
    process.execPath,
    [VITEST, 'run', '--root', root, '--config', join(root, 'vitest.config.mjs'), ...args],
    { cwd: root, env: { ...inherited, ...env }, encoding: 'utf8' }
  )
  const lines = result.stdout
    .split('\n')
    .filter((l) => l.startsWith('skipped or todo tests') || l.startsWith('  '))
  return { status: result.status, lines }
}

const counter = (skipped: number, fails: number, parity: number, tail = ''): string =>
  `skipped or todo tests ${skipped}; expected-to-fail tests ${fails}; ` +
  `allowed: mz parity without MZ_CORESCRIPT_DIR ${parity}${tail}`

const SKIP_FORMS = [
  "it('options skip', { skip: true }, () => {})",
  "it('options todo', { todo: true }, () => {})",
  "it('context skip', (ctx) => { ctx.skip() })",
  "it('context conditional skip', ({ skip }) => { skip(true) })",
  "it.skip('chained skip', () => {})",
  "it.todo('chained todo')",
  "it.runIf(false)('runIf', () => {})",
  "describe.skipIf(true)('skipIf suite', () => { it('inside', () => {}) })",
  "it['skip']('computed skip', () => {})",
  "it.fails('chained fails', () => { throw new Error('x') })"
]

const PARITY_SKIPPED =
  "describe.skipIf(true)('parity', () => { it('a', () => {}); it('b', () => {}) })\n"

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true })
})

describe('no-skips reporter', { timeout: 60_000 }, () => {
  it('passes a run with no skipped test', () => {
    const root = makeRoot({ 'a.test.js': "it('runs', () => {})\n" })
    expect(run(root)).toEqual({ status: 0, lines: [counter(0, 0, 0)] })
  })

  it('fails a run on every skip, todo and expected-fail form', () => {
    const root = makeRoot({ 'a.test.js': ["it('runs', () => {})", ...SKIP_FORMS].join('\n') })
    const { status, lines } = run(root)
    console.log(`skip forms ${SKIP_FORMS.length}, counter lines ${lines.length}`)
    expect(status).toBe(1)
    expect(lines[0]).toBe(counter(9, 1, 0))
    expect(lines).toHaveLength(SKIP_FORMS.length + 1)
    expect(lines).toContain('  skip: a.test.js > skipIf suite > inside')
    expect(lines).toContain('  todo: a.test.js > options todo')
    expect(lines).toContain('  expected to fail: a.test.js > chained fails')
  })

  it('allows the parity file skipped without MZ_CORESCRIPT_DIR, and only then', () => {
    const root = makeRoot({ 'tests/integration/mz-parity.test.ts': PARITY_SKIPPED })
    expect(run(root)).toEqual({ status: 0, lines: [counter(0, 0, 2)] })
    expect(run(root, [], { MZ_CORESCRIPT_DIR: 'x' })).toMatchObject({ status: 1 })
    const other = makeRoot({ 'tests/integration/other.test.ts': PARITY_SKIPPED })
    const outside = run(other)
    expect([outside.status, outside.lines[0]]).toEqual([1, counter(2, 0, 0)])
  })

  it('counts but does not fail a run filtered by test name', () => {
    const root = makeRoot({ 'a.test.js': "it('kept', () => {})\nit('dropped', () => {})\n" })
    expect(run(root, ['-t', 'kept'])).toEqual({
      status: 0,
      lines: [
        counter(1, 0, 0, '; not failed: the run is filtered by test name'),
        '  skip: a.test.js > dropped'
      ]
    })
  })
})
