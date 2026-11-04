// The strictness status script run against throwaway repositories with a two-commit history: a
// rise in frozen lint findings needs a lint config change in the same commit, and a pending
// type-check flag fails once no error is left for it.
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

    expect(pending.out).toContain('pending web noPropertyAccessFromIndexSignature: 1 errors')
    expect(pending.status).toBe(0)

    const cleared = status(makeRepo({ 'index.ts': BRACKET_ACCESS }))

    expect(cleared.out).toContain('pending web noPropertyAccessFromIndexSignature: 0 errors')
    expect(cleared.status).toBe(1)
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
    const directory = tempDir()
    const summary = 'node -e "console.log(\'(1 / 1) 100.00%\')"'
    const scripts = Object.fromEntries(
      ['node', 'web', 'tools', 'scripts', 'e2e'].map((name) => [`typecov:${name}`, summary])
    )
    scripts['typecov:test'] =
      "node -e \"console.log('first'); console.log('last'); process.exit(3)\""
    write(directory, { 'package.json': JSON.stringify({ scripts }) })
    const result = run(directory, SCRIPT, ['--report', 'typecov'])

    expect(result.out).toContain('typecov web: (1 / 1) 100.00%')
    expect(result.out).toContain('typecov test: no summary or nothing scanned (exit 3)')
    expect(result.out).toContain('typecov test | first\ntypecov test | last\n')
    expect(result.status).toBe(1)
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
})
