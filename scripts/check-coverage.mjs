// Checks a coverage report from the repository root.
//   suite:  every tracked source file is reported, and each directory's line and branch coverage
//           is at or above its floors (coverage/coverage-summary.json).
//   golden: each tracked generator file, covered by the golden tests alone, is at or above its
//           line floor (coverage/golden/coverage-summary.json).
// Floors only rise: each is the measured value rounded down when it was set.
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { relative, sep } from 'node:path'

const GENERATOR = 'src/renderer/src/lib/generator'

const FLOORS = {
  // A file counts toward the deepest directory holding it, so `src/renderer/src/lib` excludes
  // `generator/`; `global` is the whole report.
  suite: {
    'src/main': { lines: 60, branches: 77 },
    'src/preload': { lines: 0, branches: 0 },
    'src/shared': { lines: 86, branches: 98 },
    'src/renderer/src/stores': { lines: 83, branches: 87 },
    'src/renderer/src/lib': { lines: 93, branches: 87 },
    [GENERATOR]: { lines: 91, branches: 85 },
    'src/renderer/src/components': { lines: 0, branches: 50 },
    global: { lines: 69, branches: 75 }
  },
  golden: {
    // Each category module under templates/, that is every file there but index.ts and types.ts.
    templateModules: 80,
    files: {
      [`${GENERATOR}/index.ts`]: 90,
      [`${GENERATOR}/escape.ts`]: 60,
      // Below the 60% bar: lines 109-176 are exports no production code calls
      // (getClassOptions, getMethodOptions, searchClassesAndMethods).
      [`${GENERATOR}/class-registry.ts`]: 31,
      // Below the 60% bar: lines 31, 66, 74, 84-109 and 167 are exports only unit tests call
      // (unregisterTemplate, hasTemplate, getTemplateCount, generateFromTemplate, clearTemplates).
      [`${GENERATOR}/templates/index.ts`]: 51,
      [`${GENERATOR}/templates/types.ts`]: 60
    }
  }
}

const SUMMARY = {
  suite: 'coverage/coverage-summary.json',
  golden: 'coverage/golden/coverage-summary.json'
}

const print = (line) => process.stdout.write(`${line}\n`)
const percent = ({ covered, total }) => (total === 0 ? 100 : (covered / total) * 100)
const atFloor = (lines, floor) => `${percent(lines).toFixed(2)}% (floor ${floor}%)`
const below = (sum, floors) =>
  percent(sum.lines) < floors.lines || percent(sum.branches) < floors.branches
const bothAtFloor = (sum, floors) =>
  `lines ${atFloor(sum.lines, floors.lines)}, branches ${atFloor(sum.branches, floors.branches)}`

/** Report entries ({ lines, branches }) by repository-relative path, with `/` separators. */
function readReport(path) {
  const summary = JSON.parse(readFileSync(path, 'utf8'))
  const files = new Map()
  for (const [key, { lines, branches }] of Object.entries(summary)) {
    if (key !== 'total')
      files.set(relative(process.cwd(), key).split(sep).join('/'), { lines, branches })
  }
  return { files, total: { lines: summary.total.lines, branches: summary.total.branches } }
}

/** Tracked TypeScript sources under `dir`, declaration files excluded. */
function trackedSources(dir) {
  const out = execFileSync(
    'git',
    ['ls-files', '-z', '--', `:(glob)${dir}/**/*.ts`, `:(glob)${dir}/**/*.tsx`],
    { encoding: 'utf8' }
  )
  return out.split('\0').filter((path) => path !== '' && !path.endsWith('.d.ts'))
}

function checkSuite({ files, total }) {
  let failed = false
  const tracked = trackedSources('src')
  const reported = tracked.filter((path) => files.has(path)).length
  print(`coverage scope: ${reported} reported / ${tracked.length} tracked`)
  if (tracked.length === 0 || reported !== tracked.length) failed = true

  for (const [path, entry] of [...files, ['total', total]]) {
    if (entry.branches === undefined) {
      print(`coverage summary entry without branches: ${path}`)
      return true
    }
  }

  const dirs = Object.keys(FLOORS.suite).filter((dir) => dir !== 'global')
  const zero = () => ({ covered: 0, total: 0 })
  const sums = new Map(dirs.map((dir) => [dir, { lines: zero(), branches: zero(), files: 0 }]))
  for (const [path, entry] of files) {
    const owner = dirs
      .filter((dir) => path.startsWith(`${dir}/`))
      .sort((a, b) => b.length - a.length)[0]
    if (owner === undefined) continue
    const sum = sums.get(owner)
    for (const kind of ['lines', 'branches']) {
      sum[kind].covered += entry[kind].covered
      sum[kind].total += entry[kind].total
    }
    sum.files++
  }
  for (const [dir, sum] of sums) {
    const floors = FLOORS.suite[dir]
    print(`coverage floor ${dir}: ${bothAtFloor(sum, floors)}, files ${sum.files}`)
    if (sum.files === 0 || below(sum, floors)) failed = true
  }
  print(`coverage floor global: ${bothAtFloor(total, FLOORS.suite.global)}, files ${files.size}`)
  if (files.size === 0 || below(total, FLOORS.suite.global)) failed = true
  return failed
}

function goldenFloor(path) {
  if (path in FLOORS.golden.files) return FLOORS.golden.files[path]
  return path.startsWith(`${GENERATOR}/templates/`) ? FLOORS.golden.templateModules : undefined
}

function checkGolden({ files }) {
  const paths = [
    ...new Set([...trackedSources(GENERATOR), ...Object.keys(FLOORS.golden.files)])
  ].sort()
  let atBar = 0
  for (const path of paths) {
    const floor = goldenFloor(path)
    const lines = files.get(path)?.lines
    if (floor === undefined) {
      print(`golden coverage ${path}: no floor`)
    } else if (lines === undefined) {
      print(`golden coverage ${path}: missing (floor ${floor}%)`)
    } else {
      print(`golden coverage ${path}: ${atFloor(lines, floor)}`)
      if (percent(lines) >= floor) atBar++
    }
  }
  print(`golden coverage: ${atBar}/${paths.length} files at bar`)
  return paths.length === 0 || atBar !== paths.length
}

const mode = process.argv[2]
if (mode !== 'suite' && mode !== 'golden') {
  print('usage: node scripts/check-coverage.mjs suite|golden')
  process.exit(1)
}
if (!existsSync(SUMMARY[mode])) {
  print(`coverage summary missing: ${SUMMARY[mode]}`)
  process.exit(1)
}
const report = readReport(SUMMARY[mode])
process.exit((mode === 'suite' ? checkSuite(report) : checkGolden(report)) ? 1 : 0)
