// The suite coverage check run against throwaway repositories with a synthetic summary: each
// directory's line and branch coverage is held to its floor, and a file with lines needs a
// floor directory.
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
  'src/renderer/src/components',
  'src/renderer/src'
]
const APP = 'src/renderer/src/App.tsx'

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

/** A repository tracking one source file per directory in `dirs`, plus each path in `extra`. */
function makeRepo(dirs: string[] = DIRS, extra: string[] = []): string {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), 'check-coverage-')))
  repos.push(dir)
  execFileSync('git', ['init', '-q'], { cwd: dir, env: ENV })
  for (const path of [...dirs.map((source) => `${source}/file.ts`), ...extra]) {
    mkdirSync(dirname(join(dir, path)), { recursive: true })
    writeFileSync(join(dir, path), 'export {}\n')
  }
  execFileSync('git', ['add', '.'], { cwd: dir, env: ENV })
  return dir
}

/**
 * Writes a summary with one entry per directory (`full` unless overridden) plus one per path in
 * `extra`, and runs the check.
 */
function check(
  dir: string,
  entries: Record<string, Entry> = {},
  dirs: string[] = DIRS,
  extra: Record<string, Entry> = {}
): Run {
  const summary: Record<string, Entry> = {}
  const total = { lines: { covered: 0, total: 0 }, branches: { covered: 0, total: 0 } }
  const paths = dirs.map((source): [string, Entry] => [
    `${source}/file.ts`,
    entries[source] ?? full
  ])
  for (const [path, entry] of [...paths, ...Object.entries(extra)]) {
    summary[join(dir, path)] = entry
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

  it('fails when App.tsx has no covered line while every other directory sits at its floor', () => {
    // Line and branch totals shaped like the app's own report, where the generator outweighs the
    // rest: at these weights the directory floors alone hold the whole report above a global
    // floor set well below the measured total, so only a floor that owns App.tsx catches this.
    const weights: Record<string, [number, number]> = {
      'src/main': [750, 517],
      'src/preload': [45, 2],
      'src/shared': [64, 51],
      'src/renderer/src/stores': [558, 400],
      'src/renderer/src/lib': [707, 575],
      'src/renderer/src/lib/generator': [4742, 2029],
      'src/renderer/src/components': [1433, 1299]
    }
    const dirs = Object.keys(weights)
    const dir = makeRepo(dirs, [APP])
    const floors = check(dir, {}, dirs, { [APP]: full })
    const atFloor = (floor: number, total: number): Counts => ({
      covered: Math.ceil((floor * total) / 100),
      total
    })
    const entries: Record<string, Entry> = {}
    for (const [source, [lines, branches]] of Object.entries(weights)) {
      entries[source] = {
        lines: atFloor(printedFloor(floors, source, 'lines'), lines),
        branches: atFloor(branchFloor(floors, source), branches)
      }
    }
    const uncovered: Entry = {
      lines: { covered: 0, total: 179 },
      branches: { covered: 0, total: 90 }
    }
    const run = check(dir, entries, dirs, { [APP]: uncovered })
    expect(run.status).toBe(1)
    expect(run.lines).toContainEqual(
      expect.stringMatching(/^coverage floor src\/renderer\/src: lines 0\.00% .*, files 1$/)
    )
  })

  it('fails when a tracked file with lines has no owning directory', () => {
    const stray = 'src/tools/file.ts'
    const dir = makeRepo(DIRS, [stray])
    const run = check(dir, {}, DIRS, { [stray]: full })
    expect(run.status).toBe(1)
    expect(run.lines).toContain(`coverage file without a floor directory: ${stray}`)
    // A file with no lines (a type-only module) needs no owner.
    const empty: Entry = { lines: { covered: 0, total: 0 }, branches: { covered: 0, total: 0 } }
    expect(check(dir, {}, DIRS, { [stray]: empty }).status).toBe(0)
  })

  it('prints each floor with its measured value and slack', () => {
    const dir = makeRepo()
    const floors = check(dir)
    const lineFloor = printedFloor(floors, 'src/main', 'lines')
    const branches = branchFloor(floors, 'src/main')
    const measured: Entry = {
      lines: { covered: 80, total: 100 },
      branches: { covered: 905, total: 1000 }
    }
    const run = check(dir, { 'src/main': measured })
    expect(run.lines).toContain(
      `floor src/main lines: measured 80.00%, floor ${lineFloor}%, ` +
        `slack ${(80 - lineFloor).toFixed(2)}%`
    )
    expect(run.lines).toContain(
      `floor src/main branches: measured 90.50%, floor ${branches}%, ` +
        `slack ${(90.5 - branches).toFixed(2)}%`
    )
    const slackLines = run.lines.filter((l) => l.startsWith('floor '))
    for (const line of slackLines) {
      expect(line).toMatch(
        /^floor \S+ (lines|branches): measured [\d.]+%, floor \d+%, slack -?[\d.]+%$/
      )
    }
    // Two floors per directory and two for the whole report.
    expect(slackLines).toHaveLength((DIRS.length + 1) * 2)
  })
})

describe('check-coverage golden', () => {
  it('prints each generator file floor with its measured value and slack', () => {
    const index = 'src/renderer/src/lib/generator/index.ts'
    const dir = makeRepo([], [index])
    const path = join(dir, 'coverage/golden/coverage-summary.json')
    mkdirSync(dirname(path), { recursive: true })
    const entry: Entry = { lines: { covered: 95, total: 100 }, branches: full.branches }
    writeFileSync(path, JSON.stringify({ total: entry, [join(dir, index)]: entry }))
    const result = spawnSync(process.execPath, [SCRIPT, 'golden'], {
      cwd: dir,
      env: ENV,
      encoding: 'utf8'
    })
    const lines = result.stdout.split('\n')
    const match = new RegExp(`^golden coverage ${index}: 95\\.00% \\(floor (\\d+)%\\)$`).exec(
      lines.find((l) => l.startsWith(`golden coverage ${index}:`)) ?? ''
    )
    expect(match).not.toBeNull()
    const floor = Number(match?.[1])
    expect(floor).toBeGreaterThan(0)
    expect(lines).toContain(
      `floor ${index} lines: measured 95.00%, floor ${floor}%, slack ${(95 - floor).toFixed(2)}%`
    )
  })
})
