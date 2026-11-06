// The suite coverage check run against throwaway repositories with a synthetic summary: each
// directory's line and branch coverage is held to its floor, and a file with lines needs a
// floor directory.
import { describe, it, expect, afterEach } from 'vitest'
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

const SCRIPT = path.resolve(process.cwd(), 'scripts/check-coverage.mjs')
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

/**
A repository tracking one source file per directory in `directories`, plus each path in `extra`.
*/
function makeRepository(directories: string[] = DIRS, extra: string[] = []): string {
  const created = mkdtempSync(path.join(tmpdir(), 'check-coverage-'))
  const directory = realpathSync(created)
  repos.push(directory)
  execFileSync('git', ['init', '-q'], { cwd: directory, env: ENV })
  for (const file of [...directories.map((source) => `${source}/file.ts`), ...extra]) {
    mkdirSync(path.dirname(path.join(directory, file)), { recursive: true })
    writeFileSync(path.join(directory, file), 'export {}\n')
  }
  execFileSync('git', ['add', '.'], { cwd: directory, env: ENV })
  return directory
}

/**
Writes a summary with one entry per directory (`full` unless overridden) plus one per path in
`extra`, and runs the check.
*/
function check(
  directory: string,
  entries: Record<string, Entry> = {},
  directories: string[] = DIRS,
  extra: Record<string, Entry> = {}
): Run {
  const summary: Record<string, Entry> = {}
  const total = { lines: { covered: 0, total: 0 }, branches: { covered: 0, total: 0 } }
  const paths = directories.map((source): [string, Entry] => [
    `${source}/file.ts`,
    entries[source] ?? full
  ])
  for (const [file, entry] of [...paths, ...Object.entries(extra)]) {
    summary[path.join(directory, file)] = entry
    total.lines.covered += entry.lines.covered
    total.lines.total += entry.lines.total
    total.branches.covered += entry.branches?.covered ?? 0
    total.branches.total += entry.branches?.total ?? 0
  }
  const summaryFile = path.join(directory, 'coverage/coverage-summary.json')
  mkdirSync(path.dirname(summaryFile), { recursive: true })
  writeFileSync(summaryFile, JSON.stringify({ total, ...summary }))
  const result = spawnSync(process.execPath, [SCRIPT, 'suite'], {
    cwd: directory,
    env: ENV,
    encoding: 'utf8'
  })
  return { status: result.status, lines: result.stdout.split('\n').filter((l) => l !== '') }
}

/**
The line or branch floor the check prints for `directory`.
*/
function printedFloor(run: Run, directory: string, kind: 'lines' | 'branches'): number {
  const line = run.lines.find((l) => l.startsWith(`coverage floor ${directory}:`))
  const match = new RegExp(String.raw`${kind} [\d.]+% \(floor (\d+)%\)`).exec(line ?? '')
  if (match === null) throw new Error(`no ${kind} floor for ${directory}`)
  return Number(match[1])
}

const branchFloor = (run: Run, directory: string): number =>
  printedFloor(run, directory, 'branches')

// Counts half a point above `floor` (on it at 100), `weight` times 200 lines or branches.
const halfAbove = (floor: number, weight = 1): Counts => ({
  covered: (floor === 100 ? 200 : 2 * floor + 1) * weight,
  total: 200 * weight
})

// The directory furthest above the global floor, and the weight that lands the whole report on
// its own floor while every directory sits half a point above its printed floor.
function heaviest(run: Run, kind: 'lines' | 'branches'): { source?: string; weight: number } {
  const valueOf = (source: string): number => Math.min(printedFloor(run, source, kind) + 0.5, 100)
  const values = DIRS.map((source) => valueOf(source))
  const target = printedFloor(run, 'global', kind) + 0.5
  const top = Math.max(...values)
  const short = values.reduce((sum, value) => sum + target - value, 0)
  const weight = Math.max(1, Math.round(short / (top - target) + 1))
  const source = DIRS.find((candidate) => valueOf(candidate) === top)
  return source === undefined ? { weight } : { source, weight }
}

// Entries that hold every directory and the whole report on their printed floors.
function atFloors(run: Run): Record<string, Entry> {
  const heavy = { lines: heaviest(run, 'lines'), branches: heaviest(run, 'branches') }
  const counts = (source: string, kind: 'lines' | 'branches'): Counts =>
    halfAbove(
      printedFloor(run, source, kind),
      source === heavy[kind].source ? heavy[kind].weight : 1
    )
  return Object.fromEntries(
    DIRS.map((source) => [
      source,
      { lines: counts(source, 'lines'), branches: counts(source, 'branches') }
    ])
  )
}

// Writes a golden summary holding `entries` by repository path and runs the golden check.
function checkGolden(repository: string, entries: Record<string, Entry>): Run {
  const summaryFile = path.join(repository, 'coverage/golden/coverage-summary.json')
  mkdirSync(path.dirname(summaryFile), { recursive: true })
  const summary = Object.fromEntries(
    Object.entries(entries).map(([file, entry]) => [path.join(repository, file), entry])
  )
  writeFileSync(summaryFile, JSON.stringify({ total: full, ...summary }))
  const result = spawnSync(process.execPath, [SCRIPT, 'golden'], {
    cwd: repository,
    env: ENV,
    encoding: 'utf8'
  })
  return { status: result.status, lines: result.stdout.split('\n').filter((line) => line !== '') }
}

function removeRepositories(): void {
  for (const directory of repos.splice(0)) rmSync(directory, { recursive: true, force: true })
}

// Counts exactly on `floor` percent of `total`
function countsAtFloor(floor: number, total: number): Counts {
  return { covered: Math.ceil((floor * total) / 100), total }
}

describe('check-coverage suite: passing runs', () => {
  afterEach(removeRepositories)

  it('passes with every directory at its floors and prints both figures per directory', () => {
    const repository = makeRepository()
    const run = check(repository, atFloors(check(repository)))

    expect(run.status).toBe(0)

    for (const directory of [...DIRS, 'global']) {
      const files = directory === 'global' ? DIRS.length : 1

      expect(run.lines).toContainEqual(
        expect.stringMatching(
          new RegExp(
            String.raw`^coverage floor ${directory}: lines [\d.]+% \(floor \d+%\), ` +
              String.raw`branches [\d.]+% \(floor \d+%\), files ${files}$`
          )
        )
      )
    }
  })

  it('passes with branch coverage exactly at a floor', () => {
    const directory = makeRepository()
    const floors = check(directory)
    const floor = branchFloor(floors, 'src/main')

    expect(floor).toBeGreaterThan(0)

    const atFloor: Entry = {
      lines: halfAbove(printedFloor(floors, 'src/main', 'lines')),
      branches: { covered: floor, total: 100 }
    }

    expect(check(directory, { ...atFloors(floors), 'src/main': atFloor }).status).toBe(0)
  })

  it('prints each floor with its measured value and slack', () => {
    const directory = makeRepository()
    const floors = check(directory)
    const lineFloor = printedFloor(floors, 'src/main', 'lines')
    const branches = branchFloor(floors, 'src/main')
    const measured: Entry = {
      lines: { covered: 80, total: 100 },
      branches: { covered: 905, total: 1000 }
    }
    const run = check(directory, { 'src/main': measured })

    expect(run.lines).toContain(
      `floor src/main lines: measured 80.00%, floor ${String(lineFloor)}%, ` +
        `slack ${(80 - lineFloor).toFixed(2)}%`
    )
    expect(run.lines).toContain(
      `floor src/main branches: measured 90.50%, floor ${String(branches)}%, ` +
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

describe('check-coverage suite: floors', () => {
  afterEach(removeRepositories)

  it('fails a floor a whole point or more below its measured value, naming the floor to write', () => {
    const repository = makeRepository()
    const floors = check(repository)
    const base = atFloors(floors)
    const floor = printedFloor(floors, 'src/main', 'lines')
    const above: Entry = {
      lines: { covered: floor + 1, total: 100 },
      branches: halfAbove(branchFloor(floors, 'src/main'))
    }

    expect(check(repository, base).status).toBe(0)

    const run = check(repository, { ...base, 'src/main': above })

    expect(run.status).toBe(1)
    expect(run.lines).toContain(
      `coverage floor src/main lines: raise the floor to ${String(floor + 1)} (measured ${String(floor + 1)}.00%)`
    )
  })

  it('fails when one directory has branch coverage below its floor', () => {
    const directory = makeRepository()
    const floors = check(directory)
    const floor = branchFloor(floors, 'src/main')
    const below: Entry = {
      lines: halfAbove(printedFloor(floors, 'src/main', 'lines')),
      branches: { covered: floor - 1, total: 100 }
    }
    const run = check(directory, { ...atFloors(floors), 'src/main': below })

    expect(run.status).toBe(1)
    expect(run.lines).toContainEqual(
      expect.stringMatching(
        new RegExp(
          `^coverage floor src/main: lines [\\d.]+% \\(floor \\d+%\\), ` +
            String.raw`branches ${floor - 1}\.00% \(floor ${floor}%\), files 1$`
        )
      )
    )
  })

  it('fails when any directory has line coverage below its floor', () => {
    const directory = makeRepository()
    const floors = check(directory)
    const base = atFloors(floors)

    expect(check(directory, base).status).toBe(0)

    const results = DIRS.map((source) => {
      const floor = printedFloor(floors, source, 'lines')
      const below: Entry = {
        lines: { covered: floor - 1, total: 100 },
        branches: halfAbove(branchFloor(floors, source))
      }
      return {
        source,
        floorAboveZero: floor > 0,
        status: check(directory, { ...base, [source]: below }).status
      }
    })
    process.stdout.write(`line floors checked ${String(DIRS.length)}\n`)

    expect(results).toStrictEqual(
      DIRS.map((source) => ({ source, floorAboveZero: true, status: 1 }))
    )
  })
})

describe('check-coverage suite: missing figures and owners', () => {
  afterEach(removeRepositories)

  it('fails when a summary entry has no branch figures', () => {
    const run = check(makeRepository(), { 'src/shared': { lines: { covered: 10, total: 10 } } })

    expect(run.status).toBe(1)
    expect(run.lines).toContain('coverage summary entry without branches: src/shared/file.ts')
  })

  it('fails when a directory has no reported file', () => {
    const directories = DIRS.filter((d) => d !== 'src/renderer/src/components')
    const run = check(makeRepository(directories), {}, directories)

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
    const directories = Object.keys(weights)
    const directory = makeRepository(directories, [APP])
    const floors = check(directory, {}, directories, { [APP]: full })
    const entries: Record<string, Entry> = {}
    for (const [source, [lines, branches]] of Object.entries(weights)) {
      entries[source] = {
        lines: countsAtFloor(printedFloor(floors, source, 'lines'), lines),
        branches: countsAtFloor(branchFloor(floors, source), branches)
      }
    }
    const uncovered: Entry = {
      lines: { covered: 0, total: 179 },
      branches: { covered: 0, total: 90 }
    }
    const run = check(directory, entries, directories, { [APP]: uncovered })

    expect(run.status).toBe(1)
    expect(run.lines).toContainEqual(
      expect.stringMatching(/^coverage floor src\/renderer\/src: lines 0\.00% .*, files 1$/)
    )
  })

  it('fails when a tracked file with lines has no owning directory', () => {
    const stray = 'src/tools/file.ts'
    const directory = makeRepository(DIRS, [stray])
    const run = check(directory, {}, DIRS, { [stray]: full })

    expect(run.status).toBe(1)
    expect(run.lines).toContain(`coverage file without a floor directory: ${stray}`)

    // A file with no lines (a type-only module) needs no owner.
    const empty: Entry = { lines: { covered: 0, total: 0 }, branches: { covered: 0, total: 0 } }

    expect(check(directory, atFloors(run), DIRS, { [stray]: empty }).status).toBe(0)
  })
})

describe('check-coverage golden', () => {
  afterEach(removeRepositories)

  it('prints each generator file floor with its measured value and slack', () => {
    const index = 'src/renderer/src/lib/generator/index.ts'
    const directory = makeRepository([], [index])
    const summaryFile = path.join(directory, 'coverage/golden/coverage-summary.json')
    mkdirSync(path.dirname(summaryFile), { recursive: true })
    const entry: Entry = {
      lines: { covered: 95, total: 100 },
      branches: { covered: 10, total: 10 }
    }
    writeFileSync(
      summaryFile,
      JSON.stringify({ total: entry, [path.join(directory, index)]: entry })
    )
    const result = spawnSync(process.execPath, [SCRIPT, 'golden'], {
      cwd: directory,
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
      `floor ${index} lines: measured 95.00%, floor ${String(floor)}%, slack ${(95 - floor).toFixed(2)}%`
    )
  })

  it('fails a generator file a whole point or more above its floor, naming the floor to write', () => {
    const index = 'src/renderer/src/lib/generator/index.ts'
    const repository = makeRepository([], [index])
    const floors = new Map(
      checkGolden(repository, {}).lines.flatMap((line): [string, number][] => {
        const match = /^golden coverage (\S+): missing \(floor (\d+)%\)$/.exec(line)
        if (match === null) return []
        const [, file = '', floor = ''] = match
        return [[file, Number(floor)]]
      })
    )
    const atFloor = Object.fromEntries(
      [...floors].map(([file, floor]): [string, Entry] => [file, { lines: halfAbove(floor) }])
    )

    expect(floors.size).toBeGreaterThan(1)
    expect(checkGolden(repository, atFloor).status).toBe(0)

    const floor = floors.get(index) ?? 0
    const run = checkGolden(repository, {
      ...atFloor,
      [index]: { lines: { covered: floor + 1, total: 100 } }
    })

    expect(run.status).toBe(1)
    expect(run.lines).toContain(
      `coverage floor ${index} lines: raise the floor to ${String(floor + 1)} (measured ${String(floor + 1)}.00%)`
    )
  })
})
