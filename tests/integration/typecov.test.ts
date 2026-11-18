// The type coverage runner against throwaway packages: each program tsconfig.json references runs
// through its own `typecov:<program>` script, and the runner passes only when every run prints a
// summary with identifiers counted and exits 0.
import { spawnSync } from 'node:child_process'
import { mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'

const SCRIPT = path.resolve(import.meta.dirname, '../../scripts/typecov.mjs')
const PROGRAMS = ['node', 'web', 'test', 'tools', 'scripts', 'e2e']
const FULL = 'node -e "console.log(\'(1 / 1) 100.00%\')"'
// Six spawned npm runs, two at a time on a two-core runner.
const SPAWN_TIMEOUT_MS = 15_000
const TWO_SPAWNS_TIMEOUT_MS = 25_000

const directories: string[] = []
const removeDirectories = (): void => {
  for (const directory of directories.splice(0)) rmSync(directory, { recursive: true, force: true })
}

const configOf = (name: string): string =>
  name === 'tools' ? './tools/tsconfig.json' : `./tsconfig.${name}.json`

// A package whose tsconfig.json references `programs`, each with a script printing a full summary,
// the test program's replaced by `test`, with `files` beside them.
const typecov = (
  test: string,
  files: Record<string, string> = {},
  programs: string[] = PROGRAMS
): { status: number | null; out: string } => {
  const prefix = path.join(tmpdir(), 'typecov-')
  const directory = realpathSync(mkdtempSync(prefix))
  directories.push(directory)
  const scripts = Object.fromEntries(programs.map((name) => [`typecov:${name}`, FULL]))
  if (programs.includes('test')) scripts['typecov:test'] = test
  const references = programs.map((name) => ({ path: configOf(name) }))
  const written = {
    ...files,
    'package.json': JSON.stringify({ scripts }),
    'tsconfig.json': JSON.stringify({ files: [], references })
  }
  for (const [file, text] of Object.entries(written)) {
    writeFileSync(path.join(directory, file), text)
  }
  const result = spawnSync(process.execPath, [SCRIPT], { cwd: directory, encoding: 'utf8' })
  return { status: result.status, out: `${result.stdout}${result.stderr}` }
}

describe('type coverage: summaries', () => {
  afterEach(removeDirectories)

  it(
    '(l) names how a report run without a summary ended and what it printed',
    { timeout: SPAWN_TIMEOUT_MS },
    () => {
      const result = typecov(
        "node -e \"console.log('first'); console.log('last'); process.exit(3)\""
      )

      expect(result.out).toContain('typecov web: (1 / 1) 100.00%')
      expect(result.out).toContain(
        'typecov test: no summary or nothing scanned (exit 3, 11 bytes received)'
      )
      expect(result.out).toContain('typecov test | first\ntypecov test | last\n')
      expect(result.status).toBe(1)
    }
  )

  it(
    '(y) reads the summary a report run prints after a large output and a failing exit',
    { timeout: SPAWN_TIMEOUT_MS },
    () => {
      const fake = [
        "const line = 'uncovered '.repeat(10)",
        'for (let i = 0; i < 5000; i++) console.log(line + String(i))',
        "console.log('(10 / 12) 83.33%')",
        'process.exit(1)'
      ].join('\n')
      const result = typecov('node fake-typecov.mjs', { 'fake-typecov.mjs': fake })

      expect(result.out).toContain('typecov test: (10 / 12) 83.33%')
      expect(result.out).toContain('typecov test: the run failed (exit 1, ')
      expect(result.out).toContain('typecov test | (10 / 12) 83.33%')
      expect(result.status).toBe(1)
    }
  )

  it(
    '(ag) passes when every program prints a summary and exits 0',
    { timeout: SPAWN_TIMEOUT_MS },
    () => {
      const result = typecov(FULL)

      for (const name of PROGRAMS) expect(result.out).toContain(`typecov ${name}: (1 / 1) 100.00%`)

      expect(result.out).toContain('typecov programs 6')
      expect(result.status).toBe(0)
    }
  )

  it(
    'fails a run that counts no identifier, whatever it exits with',
    { timeout: SPAWN_TIMEOUT_MS },
    () => {
      const result = typecov('node -e "console.log(\'0 / 0\')"')

      expect(result.out).toContain(
        'typecov test: no summary or nothing scanned (exit 0, 6 bytes received)'
      )
      expect(result.out).not.toContain('typecov test: (')
      expect(result.status).toBe(1)
    }
  )
})

describe('type coverage: runs and programs', () => {
  afterEach(removeDirectories)

  it(
    '(ai) fails a run that exits non-zero after a full summary, printing how it ended',
    { timeout: SPAWN_TIMEOUT_MS },
    () => {
      const result = typecov('node -e "console.log(\'(10 / 12) 83.33%\'); process.exit(2)"')

      expect(result.out).toContain('typecov test: the run failed (exit 2, ')
      expect(result.out).toContain('typecov test | (10 / 12) 83.33%')
      expect(result.status).toBe(1)
    }
  )

  it(
    '(aj) passes fully typed code added or removed with no script changed',
    { timeout: TWO_SPAWNS_TIMEOUT_MS },
    () => {
      const added = typecov('node -e "console.log(\'(17 / 17) 100.00%\')"')
      const removed = typecov('node -e "console.log(\'(6 / 6) 100.00%\')"')

      expect(added.out).toContain('typecov test: (17 / 17) 100.00%')
      expect(added.status).toBe(0)
      expect(removed.out).toContain('typecov test: (6 / 6) 100.00%')
      expect(removed.status).toBe(0)
    }
  )

  it('runs each program tsconfig.json references, a folder config by its folder name', () => {
    const result = typecov(FULL, {}, ['tools', 'web'])

    expect(result.out).toContain(
      'typecov tools: (1 / 1) 100.00%\ntypecov web: (1 / 1) 100.00%\ntypecov programs 2\n'
    )
    expect(result.status).toBe(0)
  })

  it('fails when tsconfig.json references no program', () => {
    const result = typecov(FULL, {}, [])

    expect(result.out).toContain('typecov programs 0')
    expect(result.status).toBe(1)
  })
})
