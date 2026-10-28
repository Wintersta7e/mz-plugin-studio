// The suite coverage check run against throwaway repositories with a synthetic summary: each
// directory's line and branch coverage is held to its floor.
import { describe, it, expect, afterEach } from 'vitest'
import { execFileSync, spawnSync } from 'child_process'
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { dirname, join, resolve } from 'path'

const SCRIPT = resolve(process.cwd(), 'scripts/check-coverage.mjs')
// No user or system git configuration reaches the throwaway repositories.
const ENV = { ...process.env, GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_NOSYSTEM: '1' }
const DIRS = [
  'src/main',
  'src/preload',
  'src/shared',
  'src/renderer/src/stores',
  'src/renderer/src/lib',
  'src/renderer/src/lib/generator',
  'src/renderer/src/components'
]

interface Counts {
  covered: number
  total: number
}

interface Entry {
  lines: Counts
  branches?: Counts
}

interface Run {
  status: number | null
  lines: string[]
}

const full: Entry = { lines: { covered: 10, total: 10 }, branches: { covered: 10, total: 10 } }
const repos: string[] = []

/** A repository tracking one source file per directory in `dirs`. */
function makeRepo(dirs: string[] = DIRS): string {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), 'check-coverage-')))
  repos.push(dir)
  execFileSync('git', ['init', '-q'], { cwd: dir, env: ENV })
  for (const source of dirs) {
    mkdirSync(join(dir, source), { recursive: true })
    writeFileSync(join(dir, source, 'file.ts'), 'export {}\n')
  }
  execFileSync('git', ['add', '.'], { cwd: dir, env: ENV })
  return dir
}

/** Writes a summary with one entry per directory (`full` unless overridden) and runs the check. */
function check(dir: string, entries: Record<string, Entry> = {}, dirs: string[] = DIRS): Run {
  const summary: Record<string, Entry> = {}
  const total = { lines: { covered: 0, total: 0 }, branches: { covered: 0, total: 0 } }
  for (const source of dirs) {
    const entry = entries[source] ?? full
    summary[join(dir, source, 'file.ts')] = entry
    total.lines.covered += entry.lines.covered
    total.lines.total += entry.lines.total
    total.branches.covered += entry.branches?.covered ?? 0
    total.branches.total += entry.branches?.total ?? 0
  }
  const path = join(dir, 'coverage/coverage-summary.json')
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, JSON.stringify({ total, ...summary }))
  const result = spawnSync(process.execPath, [SCRIPT, 'suite'], {
    cwd: dir,
    env: ENV,
    encoding: 'utf8'
  })
  return { status: result.status, lines: result.stdout.split('\n').filter((l) => l !== '') }
}

/** The line or branch floor the check prints for `dir`. */
function printedFloor(run: Run, dir: string, kind: 'lines' | 'branches'): number {
  const line = run.lines.find((l) => l.startsWith(`coverage floor ${dir}:`))
  const match = new RegExp(`${kind} [\\d.]+% \\(floor (\\d+)%\\)`).exec(line ?? '')
  if (match === null) throw new Error(`no ${kind} floor for ${dir}`)
  return Number(match[1])
}

const branchFloor = (run: Run, dir: string): number => printedFloor(run, dir, 'branches')

afterEach(() => {
  for (const dir of repos.splice(0)) rmSync(dir, { recursive: true, force: true })
})

describe('check-coverage suite', () => {
  it('passes with every directory at its floors and prints both figures per directory', () => {
    const run = check(makeRepo())
    expect(run.status).toBe(0)
    for (const dir of [...DIRS, 'global']) {
      const files = dir === 'global' ? DIRS.length : 1
      expect(run.lines).toContainEqual(
        expect.stringMatching(
          new RegExp(
            `^coverage floor ${dir}: lines [\\d.]+% \\(floor \\d+%\\), ` +
              `branches [\\d.]+% \\(floor \\d+%\\), files ${files}$`
          )
        )
      )
    }
  })

  it('passes with branch coverage exactly at a floor', () => {
    const dir = makeRepo()
    const floor = branchFloor(check(dir), 'src/main')
    expect(floor).toBeGreaterThan(0)
    const atFloor: Entry = { ...full, branches: { covered: floor, total: 100 } }
    expect(check(dir, { 'src/main': atFloor }).status).toBe(0)
  })

  it('fails when one directory has branch coverage below its floor', () => {
    const dir = makeRepo()
    const floor = branchFloor(check(dir), 'src/main')
    const below: Entry = { ...full, branches: { covered: floor - 1, total: 100 } }
    const run = check(dir, { 'src/main': below })
    expect(run.status).toBe(1)
    expect(run.lines).toContainEqual(
      expect.stringMatching(
        new RegExp(
          `^coverage floor src/main: lines 100\\.00% \\(floor \\d+%\\), ` +
            `branches ${floor - 1}\\.00% \\(floor ${floor}%\\), files 1$`
        )
      )
    )
  })

  it('fails when any directory has line coverage below its floor', () => {
    const dir = makeRepo()
    const floors = check(dir)
    for (const source of DIRS) {
      const floor = printedFloor(floors, source, 'lines')
      // Only the preload bridge has no line that tests cover.
      if (source === 'src/preload') {
        expect(floor).toBe(0)
        continue
      }
      expect(floor, source).toBeGreaterThan(0)
      const below: Entry = { ...full, lines: { covered: floor - 1, total: 100 } }
      expect(check(dir, { [source]: below }).status, source).toBe(1)
    }
    console.log(`line floors checked ${DIRS.length - 1}`)
  })

  it('fails when a summary entry has no branch figures', () => {
    const run = check(makeRepo(), { 'src/shared': { lines: { covered: 10, total: 10 } } })
    expect(run.status).toBe(1)
    expect(run.lines).toContain('coverage summary entry without branches: src/shared/file.ts')
  })

  it('fails when a directory has no reported file', () => {
    const dirs = DIRS.filter((d) => d !== 'src/renderer/src/components')
    const run = check(makeRepo(dirs), {}, dirs)
    expect(run.status).toBe(1)
    expect(run.lines).toContainEqual(
      expect.stringMatching(/^coverage floor src\/renderer\/src\/components: .*, files 0$/)
    )
  })
})
