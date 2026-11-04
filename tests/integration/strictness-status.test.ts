// The strictness status script run against throwaway repositories with a two-commit history: a
// rise in frozen lint findings needs a lint config change in the same commit, and a pending
// type-check flag holds its error count exactly at its ceiling and fails once no error is left.
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'

const ROOT = path.resolve(import.meta.dirname, '../..')
const SCRIPT = path.join(ROOT, 'scripts/strictness-status.mjs')
const ESLINT = path.join(ROOT, 'node_modules/eslint/bin/eslint.js')
// No user or system git configuration (hooks, signing) reaches the throwaway repositories.
const ENV = { ...process.env, GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_NOSYSTEM: '1' }
const GIT_USER = ['-c', 'user.name=Test', '-c', 'user.email=test@example.invalid']

const DOT_ACCESS = 'const table: Record<string, number> = {}\nexport const value = table.key\n'
const BRACKET_ACCESS =
  "const table: Record<string, number> = {}\nexport const value = table['key']\n"
const TWO_DOT_ACCESSES = `${DOT_ACCESS}export const other = table.other\n`
const ceilings = (value: Record<string, Record<string, number>>): string => JSON.stringify(value)
const WEB_CEILING = { web: { noPropertyAccessFromIndexSignature: 1 } }
const suppressions = (count: number, file = 'index.ts'): string =>
  JSON.stringify({ [file]: { 'no-var': { count } } })
const packageJson = (lintVersion: string): string =>
  JSON.stringify({ devDependencies: { '@eslint/js': lintVersion, eslint: '1.0.0' } })

const PARENT: Record<string, string> = {
  'package.json': packageJson('1.0.0'),
  'eslint.config.mjs': "import js from '@eslint/js'\n\nexport default [js.configs.recommended]\n",
  'eslint-suppressions.json': suppressions(2),
  'tsconfig.web.json': JSON.stringify({
    compilerOptions: { strict: true, types: [], noPropertyAccessFromIndexSignature: false },
    include: ['*.ts']
  }),
  'tsconfig.web.pending.json': JSON.stringify({
    extends: './tsconfig.web.json',
    compilerOptions: { noPropertyAccessFromIndexSignature: true }
  }),
  'pending-ceilings.json': ceilings(WEB_CEILING),
  'index.ts': DOT_ACCESS
}

const repos: string[] = []
const counter = { cases: 0 }

const git = (dir: string, args: string[]): void => {
  execFileSync('git', [...GIT_USER, ...args], { cwd: dir, env: ENV, stdio: 'ignore' })
}
const tempDir = (): string => {
  const prefix = path.join(tmpdir(), 'strictness-status-')
  const dir = realpathSync(mkdtempSync(prefix))
  repos.push(dir)
  return dir
}
const write = (dir: string, files: Record<string, string>): void => {
  for (const [file, text] of Object.entries(files)) writeFileSync(path.join(dir, file), text)
}

// A repository whose parent commit holds PARENT and whose HEAD applies `head` (and `removed`).
const makeRepo = (head: Record<string, string>, removed: string[] = []): string => {
  const dir = tempDir()
  git(dir, ['init', '-q'])
  write(dir, PARENT)
  git(dir, ['add', '.'])
  git(dir, ['commit', '-q', '-m', 'parent'])
  write(dir, head)
  for (const file of removed) git(dir, ['rm', '-q', file])
  git(dir, ['add', '.'])
  git(dir, ['commit', '-q', '--allow-empty', '-m', 'head'])
  return dir
}

const run = (
  dir: string,
  command: string,
  args: string[]
): { status: number | null; out: string } => {
  const result = spawnSync(process.execPath, [command, ...args], {
    cwd: dir,
    env: ENV,
    encoding: 'utf8'
  })
  return { status: result.status, out: `${result.stdout}${result.stderr}` }
}
const status = (dir: string): { status: number | null; out: string } => run(dir, SCRIPT, [])

// A type coverage report whose test program runs `test`, with `files` beside it, and whose other
// programs each print a full summary.
const reportTypecov = (
  test: string,
  files: Record<string, string> = {}
): { status: number | null; out: string } => {
  const directory = tempDir()
  const summary = 'node -e "console.log(\'(1 / 1) 100.00%\')"'
  const scripts = Object.fromEntries(
    ['node', 'web', 'tools', 'scripts', 'e2e'].map((name) => [`typecov:${name}`, summary])
  )
  scripts['typecov:test'] = test
  write(directory, { ...files, 'package.json': JSON.stringify({ scripts }) })
  return run(directory, SCRIPT, ['--report', 'typecov'])
}

// A production knip run printing one summary line and its scanned files, under the ceiling 2.
const knipProduction = ({ issues, files }: { issues: number; files: number }): string =>
  `node -e "console.log('Unused exports (${String(issues)})'); ` +
  `console.log('knip scanned: files ${String(files)} of ${String(files)}')" -- --max-issues 2`
const reportKnip = (production: string): { status: number | null; out: string } => {
  const directory = tempDir()
  const scripts = {
    knip: 'node -e "console.log(\'Unused exports (1)\')"',
    'knip:production': production
  }
  write(directory, { 'package.json': JSON.stringify({ scripts }) })
  return run(directory, SCRIPT, ['--report', 'knip'])
}

// A jscpd run that writes a JSON report with these totals into the folder `--output` names, or no
// report, measured against the ceilings 2 clones and 20 duplicated lines unless others are given.
interface JscpdTotal {
  sources: number
  clones: number
  duplicatedLines: number
}
const CEILINGS = ['--clones', '2', '--duplicated-lines', '20']
const reportJscpd = (
  total: JscpdTotal | undefined,
  ceilings: string[] = CEILINGS
): { status: number | null; out: string } => {
  const directory = tempDir()
  const report = JSON.stringify({ statistics: { total: { ...total, percentage: 2.5 } } })
  const fake = [
    "import { writeFileSync } from 'node:fs'",
    "const output = process.argv[process.argv.indexOf('--output') + 1]",
    total === undefined ? '' : `writeFileSync(\`\${output}/jscpd-report.json\`, '${report}')`
  ].join('\n')
  write(directory, {
    'package.json': JSON.stringify({ scripts: { jscpd: 'node fake-jscpd.mjs' } }),
    'fake-jscpd.mjs': fake
  })
  return run(directory, SCRIPT, ['--report', 'jscpd', ...ceilings])
}
const AT_CEILINGS: JscpdTotal = { sources: 3, clones: 2, duplicatedLines: 20 }

describe('strictness status', () => {
  beforeEach(() => {
    counter.cases += 1
  })

  afterAll(() => {
    process.stdout.write(`cases ${counter.cases}\n`)
    for (const dir of repos) rmSync(dir, { recursive: true, force: true })
  })

  it('(a) passes when the frozen count holds', () => {
    const result = status(makeRepo({}))

    expect(result.out).toContain(
      'eslint-suppressions: 2 violations in 1 entries, 1 files (parent 2, delta 0)'
    )
    expect(result.status).toBe(0)
  })

  it('(b) passes when the frozen count falls', () => {
    const result = status(makeRepo({ 'eslint-suppressions.json': suppressions(1) }))

    expect(result.out).toContain('(parent 2, delta -1)')
    expect(result.status).toBe(0)
  })

  it('(c) fails a rise without a lint config change', () => {
    const result = status(makeRepo({ 'eslint-suppressions.json': suppressions(3) }))

    expect(result.out).toContain('(parent 2, delta +1)')
    expect(result.status).toBe(1)
  })

  it('(d) passes a rise that comes with an ESLint config change', () => {
    const config = "import js from '@eslint/js'\n\nexport default [js.configs.all]\n"
    const dir = makeRepo({
      'eslint-suppressions.json': suppressions(3),
      'eslint.config.mjs': config
    })

    expect(status(dir).status).toBe(0)
  })

  it('(e) passes a rise that comes with a new version of an imported lint package', () => {
    const dir = makeRepo({
      'eslint-suppressions.json': suppressions(3),
      'package.json': packageJson('1.0.1')
    })

    expect(status(dir).status).toBe(0)
  })

  it('(f) counts the errors a pending flag holds and fails once it holds none', () => {
    const pending = status(makeRepo({}))

    expect(pending.out).toContain(
      'pending web noPropertyAccessFromIndexSignature: 1 errors, ceiling 1'
    )
    expect(pending.status).toBe(0)

    const cleared = status(makeRepo({ 'index.ts': BRACKET_ACCESS }))

    expect(cleared.out).toContain('pending web noPropertyAccessFromIndexSignature: 0 errors')
    expect(cleared.out).toContain(
      'pending web noPropertyAccessFromIndexSignature: no error left; move the flag to its program'
    )
    expect(cleared.status).toBe(1)
  })

  it('(u) fails a pending count above its ceiling', () => {
    const result = status(makeRepo({ 'index.ts': TWO_DOT_ACCESSES }))

    expect(result.out).toContain(
      'pending web noPropertyAccessFromIndexSignature: the count rose above the ceiling 1'
    )
    expect(result.status).toBe(1)
  })

  it('(v) fails a pending count below its ceiling', () => {
    const lowered = ceilings({ web: { noPropertyAccessFromIndexSignature: 2 } })
    const result = status(makeRepo({ 'pending-ceilings.json': lowered }))

    expect(result.out).toContain(
      'pending web noPropertyAccessFromIndexSignature: the count fell; lower its ceiling in pending-ceilings.json to 1'
    )
    expect(result.status).toBe(1)
  })

  it('(w) fails a pending flag without a ceiling, and a missing ceilings file', () => {
    const unnamed = status(makeRepo({ 'pending-ceilings.json': ceilings({}) }))
    const missing = status(makeRepo({}, ['pending-ceilings.json']))

    expect(unnamed.out).toContain(
      'pending web noPropertyAccessFromIndexSignature: pending-ceilings.json names no ceiling'
    )
    expect(unnamed.status).toBe(1)
    expect(missing.out).toContain('pending: pending-ceilings.json missing or unreadable')
    expect(missing.status).toBe(1)
  })

  it('(x) fails a ceiling for a flag that is not pending', () => {
    const stale = ceilings({ ...WEB_CEILING, node: { noUncheckedIndexedAccess: 3 } })
    const result = status(makeRepo({ 'pending-ceilings.json': stale }))

    expect(result.out).toContain(
      'pending node noUncheckedIndexedAccess: pending-ceilings.json holds a ceiling for a flag no pending file holds'
    )
    expect(result.status).toBe(1)
  })

  it('(g) fails without a suppressions file', () => {
    expect(status(makeRepo({}, ['eslint-suppressions.json'])).status).toBe(1)
  })

  it('(h) fails on an entry naming an untracked file', () => {
    const result = status(makeRepo({ 'eslint-suppressions.json': suppressions(2, 'gone.ts') }))

    expect(result.out).toContain('gone.ts')
    expect(result.status).toBe(1)
  })

  it('(i) leaves ESLint failing on a fixed finding until its entry is pruned', () => {
    const dir = tempDir()
    write(dir, {
      'eslint.config.mjs': "export default [{ rules: { 'no-var': 'error' } }]\n",
      'eslint-suppressions.json': JSON.stringify({ 'a.js': { 'no-var': { count: 1 } } }),
      'a.js': 'var a = 1\nexport { a }\n'
    })

    expect(run(dir, ESLINT, ['a.js']).status).toBe(0)

    write(dir, { 'a.js': 'const a = 1\nexport { a }\n' })

    expect(run(dir, ESLINT, ['a.js']).status).toBe(2)
    expect(run(dir, ESLINT, ['--prune-suppressions', 'a.js']).status).toBe(0)
    expect(run(dir, ESLINT, ['a.js']).status).toBe(0)
  })

  it('(j) measures uncommitted changes against HEAD, not its parent', () => {
    const config = "import js from '@eslint/js'\n\nexport default [js.configs.all]\n"
    const directory = makeRepo({
      'eslint-suppressions.json': suppressions(3),
      'eslint.config.mjs': config
    })
    write(directory, { 'eslint-suppressions.json': suppressions(4) })
    const result = status(directory)

    expect(result.out).toContain('(parent 3, delta +1)')
    expect(result.status).toBe(1)
  })

  it('(k) passes an uncommitted rise that comes with an uncommitted lint config change', () => {
    const directory = makeRepo({})
    write(directory, {
      'eslint-suppressions.json': suppressions(3),
      'eslint.config.mjs': "import js from '@eslint/js'\n\nexport default [js.configs.all]\n"
    })
    const result = status(directory)

    expect(result.out).toContain('(parent 2, delta +1)')
    expect(result.status).toBe(0)
  })

  it('(l) names how a report run without a summary ended and what it printed', () => {
    const result = reportTypecov(
      "node -e \"console.log('first'); console.log('last'); process.exit(3)\""
    )

    expect(result.out).toContain('typecov web: (1 / 1) 100.00%')
    expect(result.out).toContain(
      'typecov test: no summary or nothing scanned (exit 3, 11 bytes received)'
    )
    expect(result.out).toContain('typecov test | first\ntypecov test | last\n')
    expect(result.status).toBe(1)
  })

  it('(y) reads the summary a report run prints after a large output and a failing exit', () => {
    const fake = [
      "const line = 'uncovered '.repeat(10)",
      'for (let i = 0; i < 5000; i++) console.log(line + String(i))',
      "console.log('(10 / 12) 83.33%')",
      'process.exit(1)'
    ].join('\n')
    const result = reportTypecov('node fake-typecov.mjs', { 'fake-typecov.mjs': fake })

    expect(result.out).toContain('typecov test: (10 / 12) 83.33%')
    expect(result.status).toBe(0)
  })

  it('(m) passes the production knip count at its ceiling', () => {
    const result = reportKnip(knipProduction({ issues: 2, files: 3 }))

    expect(result.out).toContain('knip issues: 1')
    expect(result.out).toContain('knip production: files scanned 3, issues 2, ceiling 2')
    expect(result.status).toBe(0)
  })

  it('(n) fails the production knip count above its ceiling and below it', () => {
    const above = reportKnip(knipProduction({ issues: 3, files: 3 }))
    const below = reportKnip(knipProduction({ issues: 1, files: 3 }))

    expect(above.out).toContain('knip production: the count rose above the ceiling 2')
    expect(above.status).toBe(1)
    expect(below.out).toContain('knip production: the count fell; lower --max-issues to 1')
    expect(below.status).toBe(1)
  })

  it('(o) fails a production knip run that scanned no file', () => {
    const result = reportKnip(knipProduction({ issues: 2, files: 0 }))

    expect(result.out).toContain('knip production: the run scanned no file')
    expect(result.status).toBe(1)
  })

  it('(p) passes the jscpd clones and duplicated lines at their ceilings', () => {
    const result = reportJscpd(AT_CEILINGS)

    expect(result.out).toContain(
      'jscpd: files scanned 3, clones 2, duplicated lines 20 (2.50%), ceilings clones 2, duplicated lines 20'
    )
    expect(result.status).toBe(0)
  })

  it('(q) fails the jscpd clones or duplicated lines above their ceilings', () => {
    const clones = reportJscpd({ ...AT_CEILINGS, clones: 3 })
    const lines = reportJscpd({ ...AT_CEILINGS, duplicatedLines: 21 })

    expect(clones.out).toContain('jscpd: clones rose above the ceiling 2')
    expect(clones.status).toBe(1)
    expect(lines.out).toContain('jscpd: duplicated-lines rose above the ceiling 20')
    expect(lines.status).toBe(1)
  })

  it('(r) fails the jscpd clones or duplicated lines below their ceilings', () => {
    const clones = reportJscpd({ ...AT_CEILINGS, clones: 1 })
    const lines = reportJscpd({ ...AT_CEILINGS, duplicatedLines: 19 })

    expect(clones.out).toContain('jscpd: clones fell; lower --clones to 1')
    expect(clones.status).toBe(1)
    expect(lines.out).toContain('jscpd: duplicated-lines fell; lower --duplicated-lines to 19')
    expect(lines.status).toBe(1)
  })

  it('(s) fails a jscpd run that scanned no file', () => {
    const result = reportJscpd({ ...AT_CEILINGS, sources: 0 })

    expect(result.out).toContain('jscpd: the run scanned no file')
    expect(result.status).toBe(1)
  })

  it('(t) fails a jscpd run that wrote no report, and ceilings that are not named', () => {
    const missing = reportJscpd(undefined)
    const unnamed = reportJscpd(AT_CEILINGS, [])

    expect(missing.out).toContain('jscpd: the run wrote no report (exit 0, 0 bytes received)')
    expect(missing.status).toBe(1)
    expect(unnamed.out).toContain('jscpd: the jscpd:report script names no --clones ceiling')
    expect(unnamed.out).toContain('jscpd: the jscpd:report script names no --duplicated-lines')
    expect(unnamed.status).toBe(1)
  })
})
