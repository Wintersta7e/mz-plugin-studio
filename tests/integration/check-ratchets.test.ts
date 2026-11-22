// The ratchet check run against throwaway repositories whose jscpd is a fake writing a JSON report:
// the copied code's clones and duplicated lines are held exactly at the ceilings ratchets.json
// holds, and no ceiling or floor may move toward lax since the base commit.
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'

const SCRIPT = path.resolve(import.meta.dirname, '../../scripts/check-ratchets.mjs')
// No user or system git configuration (hooks, signing) reaches the throwaway repositories, and no
// base named for the outer run reaches the check.
const ENV = Object.fromEntries(
  Object.entries({
    ...process.env,
    GIT_CONFIG_GLOBAL: '/dev/null',
    GIT_CONFIG_NOSYSTEM: '1'
  }).filter(([name]) => name !== 'RATCHETS_BASE')
)
const GIT_USER = ['-c', 'user.name=Test', '-c', 'user.email=test@example.invalid']

interface JscpdTotal {
  sources: number
  clones: number
  duplicatedLines: number
}
interface Clone {
  first: string
  second: string
}
interface Run {
  status: number | null
  out: string
}
// The whole tree's ceilings and, under `src`, the ceilings of the run over `src` alone.
const SOURCE_CEILINGS = { clones: 1, duplicatedLines: 8 }
const CEILINGS = { clones: 2, duplicatedLines: 20, src: SOURCE_CEILINGS }
const JSCPD_CEILINGS = { jscpd: CEILINGS }
const AT_CEILINGS: JscpdTotal = { sources: 3, clones: 2, duplicatedLines: 20 }
const AT_SOURCE_CEILINGS: JscpdTotal = { sources: 2, clones: 1, duplicatedLines: 8 }
const CLONES: Clone[] = [
  { first: 'src/a.ts:1-12', second: 'src/b.ts:4-15' },
  { first: 'src/a.ts:30-37', second: 'src/c.ts:9-16' }
]
const SOURCE_CLONES: Clone[] = [{ first: 'a.ts:1-12', second: 'b.ts:4-15' }]
// The base of the range cases: two ceilings, two floors and two package.json script flags.
const BASE_RATCHETS = {
  jscpd: CEILINGS,
  coverage: { suite: { global: { lines: 90, branches: 80 } } }
}
const packageJson = (atLeast: string, maxWarnings: string): string =>
  JSON.stringify({
    scripts: {
      lint: `eslint --max-warnings ${maxWarnings} .`,
      'typecov:web': `type-coverage -p tsconfig.web.json --at-least ${atLeast}`
    }
  })
const BASE_PACKAGE = packageJson('100', '0')
const ZERO_SHA = '0'.repeat(40)
// The base of the path cases: a suite directory floor over two files and a golden file floor.
const APP = 'export const app = 1\n'
const CLI = 'export const cli = 2\n'
const GENERATOR = 'export const generate = 3\n'
const PATH_FILES = { 'src/main/app.ts': APP, 'src/main/cli.ts': CLI, 'src/gen/index.ts': GENERATOR }
// A ratchets.json holding the line floor of each suite directory and the floor of each golden file.
const floors = (suite: Record<string, number>, golden: Record<string, number>): string =>
  JSON.stringify({
    jscpd: CEILINGS,
    coverage: {
      suite: Object.fromEntries(
        Object.entries(suite).map(([directory, lines]) => [directory, { lines }])
      ),
      golden: { files: golden }
    }
  })
const PATH_RATCHETS = floors({ 'src/main': 90 }, { 'src/gen/index.ts': 95 })

const directories: string[] = []

const git = (directory: string, args: string[]): string =>
  execFileSync('git', [...GIT_USER, ...args], { cwd: directory, env: ENV, encoding: 'utf8' }).trim()

// A duplicate entry of a jscpd JSON report for a clone written `file:start-end`.
const duplicate = ({ first, second }: Clone): Record<string, unknown> => {
  const side = (location: string): Record<string, unknown> => {
    const [name, lines = ''] = location.split(':', 2)
    const [start, end] = lines.split('-').map(Number)
    return { name, start, end }
  }
  return { firstFile: side(first), secondFile: side(second) }
}

// A jscpd JSON report with these totals and clones.
const jscpdReport = (total: JscpdTotal, clones: Clone[]): string =>
  JSON.stringify({
    statistics: { total: { ...total, percentage: 2.5 } },
    duplicates: clones.map((clone) => duplicate(clone))
  })

// A fake jscpd that writes a report into the folder `--output` names: with these totals and
// clones, or none; with `sourceTotal` and SOURCE_CLONES when it is asked to scan `src` alone.
const fakeJscpd = (
  total: JscpdTotal | undefined,
  clones: Clone[],
  sourceTotal: JscpdTotal
): string => {
  const report = total === undefined ? '' : jscpdReport(total, clones)
  return [
    "import { writeFileSync } from 'node:fs'",
    "const output = process.argv[process.argv.indexOf('--output') + 1]",
    `const report = process.argv.includes('src') ? '${jscpdReport(sourceTotal, SOURCE_CLONES)}' : '${report}'`,
    "if (report !== '') writeFileSync(`${output}/jscpd-report.json`, report)"
  ].join('\n')
}

// Commits `files` and the deletion of `removed` on top of the repository's HEAD; the new commit's id.
const commit = (
  directory: string,
  files: Record<string, string>,
  removed: string[] = []
): string => {
  for (const file of removed) rmSync(path.join(directory, file))
  for (const [file, text] of Object.entries(files)) {
    mkdirSync(path.dirname(path.join(directory, file)), { recursive: true })
    writeFileSync(path.join(directory, file), text)
  }
  git(directory, ['add', '.'])
  git(directory, ['commit', '-q', '--allow-empty', '-m', 'change'])
  return git(directory, ['rev-parse', 'HEAD'])
}

// A repository holding the fake jscpd and one commit of `files`.
const repository = (
  files: Record<string, string>,
  total: JscpdTotal | undefined,
  clones: Clone[] = CLONES,
  sourceTotal: JscpdTotal = AT_SOURCE_CEILINGS
): string => {
  const directory = mkdtempSync(path.join(tmpdir(), 'check-ratchets-'))
  directories.push(directory)
  git(directory, ['init', '-q'])
  mkdirSync(path.join(directory, 'node_modules/jscpd'), { recursive: true })
  writeFileSync(
    path.join(directory, 'node_modules/jscpd/run-jscpd.js'),
    fakeJscpd(total, clones, sourceTotal)
  )
  commit(directory, files)
  return directory
}

const run = (directory: string, args: string[], variables: Record<string, string> = {}): Run => {
  const result = spawnSync(process.execPath, [SCRIPT, ...args], {
    cwd: directory,
    env: { ...ENV, ...variables },
    encoding: 'utf8'
  })
  return { status: result.status, out: `${result.stdout}${result.stderr}` }
}

// The full check in a repository whose ratchets.json holds `ratchets`, measured against HEAD (so
// only the exact jscpd check can fail).
const check = (
  total: JscpdTotal | undefined,
  ratchets: Record<string, unknown> = JSCPD_CEILINGS,
  clones: Clone[] = CLONES,
  sourceTotal: JscpdTotal = AT_SOURCE_CEILINGS
): Run =>
  run(repository({ 'ratchets.json': JSON.stringify(ratchets) }, total, clones, sourceTotal), [], {
    RATCHETS_BASE: 'HEAD'
  })

// A repository whose base commit holds BASE_RATCHETS and BASE_PACKAGE and whose HEAD applies
// `head`; the repository and the base commit's id.
const since = (
  head: Record<string, string>,
  total: JscpdTotal = AT_CEILINGS
): { directory: string; base: string } => {
  const files = { 'ratchets.json': JSON.stringify(BASE_RATCHETS), 'package.json': BASE_PACKAGE }
  const directory = repository(files, total)
  const base = git(directory, ['rev-parse', 'HEAD'])
  commit(directory, head)
  return { directory, base }
}

// A repository whose base commit holds PATH_RATCHETS over PATH_FILES and whose HEAD applies `head`
// and deletes `removed`; the repository and the base commit's id.
const moved = (
  head: Record<string, string>,
  removed: string[] = []
): { directory: string; base: string } => {
  const files = { 'ratchets.json': PATH_RATCHETS, 'package.json': BASE_PACKAGE, ...PATH_FILES }
  const directory = repository(files, AT_CEILINGS)
  const base = git(directory, ['rev-parse', 'HEAD'])
  commit(directory, head, removed)
  return { directory, base }
}

const removeRepositories = (): void => {
  for (const directory of directories.splice(0)) {
    rmSync(directory, { recursive: true, force: true })
  }
}

describe('ratchets: jscpd', () => {
  afterEach(removeRepositories)

  it('(p) passes the jscpd clones and duplicated lines at their ceilings', () => {
    const result = check(AT_CEILINGS)

    expect(result.out).toContain(
      'ratchets: jscpd files scanned 3, clones 2, duplicated lines 20 (2.50%), ceilings clones 2, duplicated lines 20'
    )
    expect(result.out).not.toContain('ratchets: clone ')
    expect(result.status).toBe(0)
  })

  it('(q) fails the jscpd clones or duplicated lines above their ceilings', () => {
    const clones = check({ ...AT_CEILINGS, clones: 3 })
    const lines = check({ ...AT_CEILINGS, duplicatedLines: 21 })

    expect(clones.out).toContain(
      'ratchets: jscpd.clones 3 rose above the ceiling 2 in ratchets.json'
    )
    expect(clones.status).toBe(1)
    expect(lines.out).toContain(
      'ratchets: jscpd.duplicatedLines 21 rose above the ceiling 20 in ratchets.json'
    )
    expect(lines.status).toBe(1)
  })

  it('names each clone above the ceiling', () => {
    const third = { first: 'src/d.ts:2-9', second: 'src/e.ts:2-9' }
    const result = check({ ...AT_CEILINGS, clones: 3 }, JSCPD_CEILINGS, [...CLONES, third])
    const printed = result.out.split('\n').filter((line) => line.startsWith('ratchets: clone '))

    expect(printed).toStrictEqual(
      [...CLONES, third].map(({ first, second }) => `ratchets: clone ${first} ↔ ${second}`)
    )
    expect(result.status).toBe(1)
  })

  it('(r) fails the jscpd clones or duplicated lines below their ceilings', () => {
    const clones = check({ ...AT_CEILINGS, clones: 1 })
    const lines = check({ ...AT_CEILINGS, duplicatedLines: 19 })

    expect(clones.out).toContain('ratchets: lower jscpd.clones in ratchets.json to 1')
    expect(clones.status).toBe(1)
    expect(lines.out).toContain('ratchets: lower jscpd.duplicatedLines in ratchets.json to 19')
    expect(lines.status).toBe(1)
  })

  it('(s) fails a jscpd run that scanned no file', () => {
    const result = check({ ...AT_CEILINGS, sources: 0 })

    expect(result.out).toContain('ratchets: the jscpd run scanned no file')
    expect(result.status).toBe(1)
  })

  it('(t) fails a jscpd run that wrote no report, and ceilings that are not named', () => {
    const missing = check(undefined)
    const unnamed = check(AT_CEILINGS, {})

    expect(missing.out).toContain('ratchets: the jscpd run wrote no report (exit 0)')
    expect(missing.status).toBe(1)
    expect(unnamed.out).toContain('ratchets: ratchets.json holds no jscpd.clones ceiling')
    expect(unnamed.out).toContain('ratchets: ratchets.json holds no jscpd.duplicatedLines ceiling')
    expect(unnamed.status).toBe(1)
  })
})

describe('ratchets: jscpd over src alone', () => {
  afterEach(removeRepositories)

  it('passes the src clones and duplicated lines at their ceilings, printing both runs', () => {
    const result = check(AT_CEILINGS)

    expect(result.out).toContain(
      'ratchets: jscpd files scanned 3, clones 2, duplicated lines 20 (2.50%), ceilings clones 2, duplicated lines 20'
    )
    expect(result.out).toContain(
      'ratchets: jscpd.src files scanned 2, clones 1, duplicated lines 8 (2.50%), ceilings clones 1, duplicated lines 8'
    )
    expect(result.status).toBe(0)
  })

  it('fails a src clone above the jscpd.src ceiling, naming the clone', () => {
    const ratchets = { jscpd: { ...CEILINGS, src: { ...SOURCE_CEILINGS, clones: 0 } } }
    const result = check(AT_CEILINGS, ratchets)

    expect(result.out).toContain(
      'ratchets: jscpd.src.clones 1 rose above the ceiling 0 in ratchets.json'
    )
    expect(result.out).toContain('ratchets: clone a.ts:1-12 ↔ b.ts:4-15')
    expect(result.status).toBe(1)
  })

  it('fails without jscpd.src ceilings', () => {
    const { clones, duplicatedLines } = CEILINGS
    const result = check(AT_CEILINGS, { jscpd: { clones, duplicatedLines } })

    expect(result.out).toContain('ratchets: ratchets.json holds no jscpd.src.clones ceiling')
    expect(result.out).toContain(
      'ratchets: ratchets.json holds no jscpd.src.duplicatedLines ceiling'
    )
    expect(result.status).toBe(1)
  })

  it('fails a src run that scanned no file', () => {
    const result = check(AT_CEILINGS, JSCPD_CEILINGS, CLONES, {
      ...AT_SOURCE_CEILINGS,
      sources: 0
    })

    expect(result.out).toContain('ratchets: the jscpd.src run scanned no file')
    expect(result.status).toBe(1)
  })
})

describe('ratchets: direction since the base', () => {
  afterEach(removeRepositories)

  it('fails a commit that raises the clones and their ceiling together, which the exact check passes', () => {
    const raised = JSON.stringify({ ...BASE_RATCHETS, jscpd: { ...CEILINGS, clones: 3 } })
    const { directory, base } = since({ 'ratchets.json': raised }, { ...AT_CEILINGS, clones: 3 })
    const exact = run(directory, [], { RATCHETS_BASE: 'HEAD' })
    const range = run(directory, ['--base', base])

    expect(exact.status).toBe(0)
    expect(range.out).toContain(`ratchets: jscpd.clones 2 → 3: a ceiling rose since ${base}`)
    expect(range.out).toContain(`ratchets: compared 8 against ${base}`)
    expect(range.status).toBe(1)
  })

  it('fails a coverage floor lowered since the base', () => {
    const lowered = JSON.stringify({
      ...BASE_RATCHETS,
      coverage: { suite: { global: { lines: 89, branches: 80 } } }
    })
    const { directory, base } = since({ 'ratchets.json': lowered })
    const result = run(directory, ['--base', base])

    expect(result.out).toContain(
      `ratchets: coverage.suite.global.lines 90 → 89: a floor fell since ${base}`
    )
    expect(result.status).toBe(1)
  })

  it('fails a type coverage threshold lowered or a warning ceiling raised in package.json', () => {
    const atLeast = since({ 'package.json': packageJson('99', '0') })
    const warnings = since({ 'package.json': packageJson('100', '1') })
    const lowered = run(atLeast.directory, ['--base', atLeast.base])
    const raised = run(warnings.directory, ['--base', warnings.base])

    expect(lowered.out).toContain(
      `ratchets: package.json scripts.typecov:web --at-least 100 → 99: a floor fell since ${atLeast.base}`
    )
    expect(lowered.status).toBe(1)
    expect(raised.out).toContain(
      `ratchets: package.json scripts.lint --max-warnings 0 → 1: a ceiling rose since ${warnings.base}`
    )
    expect(raised.status).toBe(1)
  })

  it('passes a ratchet the base does not hold, and values moved toward strict', () => {
    const added = JSON.stringify({
      jscpd: { clones: 1, duplicatedLines: 20, src: SOURCE_CEILINGS },
      coverage: {
        suite: { global: { lines: 91, branches: 80 } },
        golden: { files: { 'src/new.ts': 90 } }
      }
    })
    const { directory, base } = since({ 'ratchets.json': added })
    const result = run(directory, ['--base', base])

    expect(result.out).toContain(`ratchets: compared 8 against ${base}`)
    expect(result.status).toBe(0)
  })

  it('fails a ratchet that vanished since the base, and a value outside the known sections', () => {
    const vanished = since({ 'ratchets.json': JSON.stringify(JSCPD_CEILINGS) })
    const unknown = since({
      'ratchets.json': JSON.stringify({ ...BASE_RATCHETS, size: { app: 5 } })
    })
    const gone = run(vanished.directory, ['--base', vanished.base])
    const outside = run(unknown.directory, ['--base', unknown.base])

    expect(gone.out).toContain(
      `ratchets: coverage.suite.global.lines 90 → none: the ratchet vanished since ${vanished.base}`
    )
    expect(gone.status).toBe(1)
    expect(outside.out).toContain(
      'ratchets: size.app is in no section ratchets.json knows (jscpd, coverage)'
    )
    expect(outside.status).toBe(1)
  })
})

describe('ratchets: the base compared with', () => {
  afterEach(removeRepositories)

  it('fails a base that is not a commit or holds no readable ratchets.json', () => {
    const { directory, base } = since({})
    const absent = 'f'.repeat(40)
    const missing = run(directory, ['--base', absent])
    const unreadable = repository(
      { 'ratchets.json': 'not json', 'package.json': BASE_PACKAGE },
      AT_CEILINGS
    )
    const unreadableBase = git(unreadable, ['rev-parse', 'HEAD'])
    commit(unreadable, { 'ratchets.json': JSON.stringify(BASE_RATCHETS) })
    const unparsed = run(unreadable, ['--base', unreadableBase])

    expect(run(directory, ['--base', base]).status).toBe(0)
    expect(missing.out).toContain(`ratchets: base ${absent} is not a commit`)
    expect(missing.status).toBe(1)
    expect(unparsed.out).toContain(`ratchets: ${unreadableBase} has no readable ratchets.json`)
    expect(unparsed.status).toBe(1)
  })

  it('fails a comparison of nothing', () => {
    const empty = repository({ 'ratchets.json': '{}' }, AT_CEILINGS)
    const nothing = run(empty, ['--base', 'HEAD'])

    expect(nothing.out).toContain('ratchets: compared 0 against ')
    expect(nothing.status).toBe(1)
  })

  it('compares with RATCHETS_BASE, else the merge-base with origin/main, else the parent', () => {
    const raised = JSON.stringify({ ...BASE_RATCHETS, jscpd: { ...CEILINGS, clones: 3 } })
    const { directory, base } = since({ 'ratchets.json': raised }, { ...AT_CEILINGS, clones: 3 })
    const parent = run(directory, [])
    git(directory, ['update-ref', 'refs/remotes/origin/main', base])
    const runs = [
      run(directory, [], { RATCHETS_BASE: base }),
      run(directory, [], { RATCHETS_BASE: ZERO_SHA }),
      run(directory, [], { RATCHETS_BASE: '' }),
      run(directory, []),
      parent
    ]

    expect(runs.map((result) => result.out.includes(`compared 8 against ${base}`))).toStrictEqual(
      runs.map(() => true)
    )
    expect(runs.map((result) => result.status)).toStrictEqual(runs.map(() => 1))
    expect(run(directory, [], { RATCHETS_BASE: 'HEAD' }).status).toBe(0)
  })
})

describe('ratchets: a path renamed or deleted since the base', () => {
  afterEach(removeRepositories)

  const renamed = { 'src/app/app.ts': APP, 'src/app/cli.ts': CLI, 'src/gen/main.ts': GENERATOR }
  const removedAll = Object.keys(PATH_FILES)

  it('compares the floor of a renamed file or directory under its new key', () => {
    const kept = moved(
      { ...renamed, 'ratchets.json': floors({ 'src/app': 90 }, { 'src/gen/main.ts': 96 }) },
      removedAll
    )
    const passed = run(kept.directory, ['--base', kept.base])

    expect(passed.out).toContain(
      'ratchets: coverage.suite.src/main.lines is compared as coverage.suite.src/app.lines (path renamed to src/app)'
    )
    expect(passed.out).toContain(
      'ratchets: coverage.golden.files.src/gen/index.ts is compared as coverage.golden.files.src/gen/main.ts (path renamed to src/gen/main.ts)'
    )
    expect(passed.status).toBe(0)
  })

  it('fails the floor of a renamed path that fell, or that its new key does not hold', () => {
    const lowered = moved(
      { ...renamed, 'ratchets.json': floors({ 'src/app': 89 }, { 'src/gen/main.ts': 94 }) },
      removedAll
    )
    const unnamed = moved(
      { ...renamed, 'ratchets.json': floors({ 'src/app': 90 }, {}) },
      removedAll
    )
    const fell = run(lowered.directory, ['--base', lowered.base])
    const missing = run(unnamed.directory, ['--base', unnamed.base])

    expect(fell.out).toContain(
      `ratchets: coverage.suite.src/app.lines 90 → 89: a floor fell since ${lowered.base}`
    )
    expect(fell.out).toContain(
      `ratchets: coverage.golden.files.src/gen/main.ts 95 → 94: a floor fell since ${lowered.base}`
    )
    expect(fell.status).toBe(1)
    expect(missing.out).toContain(
      `ratchets: coverage.golden.files.src/gen/main.ts 95 → none: the ratchet vanished since ${unnamed.base}`
    )
    expect(missing.status).toBe(1)
  })

  it('drops the floor of a deleted file or directory, printing it', () => {
    const { directory, base } = moved({ 'ratchets.json': floors({}, {}) }, removedAll)
    const result = run(directory, ['--base', base])

    expect(result.out).toContain('ratchets: dropped coverage.suite.src/main.lines (path deleted)')
    expect(result.out).toContain(
      'ratchets: dropped coverage.golden.files.src/gen/index.ts (path deleted)'
    )
    expect(result.out).toContain(`ratchets: compared 8 against ${base}`)
    expect(result.status).toBe(0)
  })

  it('fails a vanished floor whose path still exists or moved to more than one place', () => {
    const kept = moved({ 'ratchets.json': floors({ 'src/main': 90 }, {}) })
    const split = moved(
      {
        'src/app/app.ts': APP,
        'src/lib/cli.ts': CLI,
        'ratchets.json': floors({ 'src/app': 90 }, { 'src/gen/index.ts': 95 })
      },
      ['src/main/app.ts', 'src/main/cli.ts']
    )
    const present = run(kept.directory, ['--base', kept.base])
    const parted = run(split.directory, ['--base', split.base])

    expect(present.out).toContain(
      `ratchets: coverage.golden.files.src/gen/index.ts 95 → none: the ratchet vanished since ${kept.base}`
    )
    expect(present.status).toBe(1)
    expect(parted.out).toContain(
      `ratchets: coverage.suite.src/main.lines 90 → none: the ratchet vanished since ${split.base}`
    )
    expect(parted.status).toBe(1)
  })
})
