// Checks a coverage report from the repository root.
//   suite:  every tracked source file is reported, and each directory's line and branch coverage
//           is at or above its floors (coverage/coverage-summary.json).
//   golden: each tracked generator file, covered by the golden tests alone, is at or above its
//           line floor (coverage/golden/coverage-summary.json).
// Each floor is its measured value rounded down to the integer. A value below its floor fails, and
// so does one a whole point or more above it, naming the floor to write, so a floor only moves up
// with the coverage it holds. Floors are measured on the local Node (`node --version`), while CI
// runs the Node that `engines` in package.json names.
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { relative, sep } from 'node:path'

const GENERATOR = 'src/renderer/src/lib/generator'

const FLOORS = {
  // A file counts toward the deepest directory holding it, so `src/renderer/src/lib` excludes
  // `generator/` and `src/renderer/src` holds only the files no deeper directory owns (App.tsx,
  // main.tsx); a file with lines that no directory owns fails the check. `global` is the whole
  // report.
  suite: {
    'src/main': { lines: 94, branches: 93 },
    'src/preload': { lines: 44, branches: 0 },
    'src/shared': { lines: 100, branches: 100 },
    'src/renderer/src/stores': { lines: 96, branches: 89 },
    'src/renderer/src/lib': { lines: 96, branches: 88 },
    [GENERATOR]: { lines: 98, branches: 95 },
    'src/renderer/src/components': { lines: 92, branches: 85 },
    'src/renderer/src': { lines: 90, branches: 83 },
    global: { lines: 96, branches: 90 }
  },
  golden: {
    // Every generator file, the category modules under templates/ included: a new one needs its
    // own floor.
    files: {
      [`${GENERATOR}/index.ts`]: 96,
      [`${GENERATOR}/escape.ts`]: 97,
      [`${GENERATOR}/class-registry.ts`]: 100,
      [`${GENERATOR}/templates/index.ts`]: 92,
      [`${GENERATOR}/templates/types.ts`]: 100,
      [`${GENERATOR}/templates/actor-party.ts`]: 100,
      [`${GENERATOR}/templates/audio-system.ts`]: 96,
      [`${GENERATOR}/templates/battle-system.ts`]: 94,
      [`${GENERATOR}/templates/custom-window.ts`]: 100,
      [`${GENERATOR}/templates/database-ext.ts`]: 99,
      [`${GENERATOR}/templates/input-handler.ts`]: 100,
      [`${GENERATOR}/templates/map-events.ts`]: 100,
      [`${GENERATOR}/templates/menu-system.ts`]: 100,
      [`${GENERATOR}/templates/message-system.ts`]: 97,
      [`${GENERATOR}/templates/method-alias.ts`]: 100,
      [`${GENERATOR}/templates/plugin-commands.ts`]: 97,
      [`${GENERATOR}/templates/save-load.ts`]: 99,
      [`${GENERATOR}/templates/scene-hooks.ts`]: 100,
      [`${GENERATOR}/templates/sprite-system.ts`]: 100,
      [`${GENERATOR}/templates/values.ts`]: 100
    }
  }
}

const SUMMARY = {
  suite: 'coverage/coverage-summary.json',
  golden: 'coverage/golden/coverage-summary.json'
}

const print = (line) => process.stdout.write(`${line}\n`)
const percent = ({ covered, total }) => (total === 0 ? 100 : (covered / total) * 100)
// The percentage rounded down to the integer, in integer arithmetic so that 57 of 100 is 57.
/**
@param {{ covered: number, total: number }} counts
*/
const wholePercent = ({ covered, total }) =>
  total === 0 ? 100 : Math.floor((covered * 100) / total)
const atFloor = (lines, floor) => `${percent(lines).toFixed(2)}% (floor ${floor}%)`
const below = (sum, floors) =>
  wholePercent(sum.lines) < floors.lines || wholePercent(sum.branches) < floors.branches
const bothAtFloor = (sum, floors) =>
  `lines ${atFloor(sum.lines, floors.lines)}, branches ${atFloor(sum.branches, floors.branches)}`
// How far each floor sits below its measured value, printed for every floor; a floor a whole
// point or more below it also prints the floor to write. Whether the floor must rise.
const printSlack = (scope, metric, counts, floor) => {
  print(
    `floor ${scope} ${metric}: measured ${percent(counts).toFixed(2)}%, floor ${floor}%, ` +
      `slack ${(percent(counts) - floor).toFixed(2)}%`
  )
  const isRising = wholePercent(counts) > floor
  if (isRising) {
    print(
      `coverage floor ${scope} ${metric}: raise the floor to ${wholePercent(counts)} ` +
        `(measured ${percent(counts).toFixed(2)}%)`
    )
  }
  return isRising
}
const printSlacks = (scope, sum, floors) =>
  ['lines', 'branches']
    .map((metric) => printSlack(scope, metric, sum[metric], floors[metric]))
    .includes(true)
// Whether a directory or the whole report fails: a floor to raise, no file, or a value below one.
/**
@param {string} scope
@param {{ lines: { covered: number, total: number }, branches: { covered: number, total: number } }} sum
@param {{ lines: number, branches: number }} floors
@param {number} files
*/
const scopeFails = (scope, sum, floors, files) =>
  printSlacks(scope, sum, floors) || files === 0 || below(sum, floors)

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
    if (owner === undefined) {
      if (entry.lines.total > 0) {
        print(`coverage file without a floor directory: ${path}`)
        failed = true
      }
      continue
    }
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
    if (scopeFails(dir, sum, floors, sum.files)) failed = true
  }
  print(`coverage floor global: ${bothAtFloor(total, FLOORS.suite.global)}, files ${files.size}`)
  if (scopeFails('global', total, FLOORS.suite.global, files.size)) failed = true
  return failed
}

function goldenFloor(path) {
  return path in FLOORS.golden.files ? FLOORS.golden.files[path] : undefined
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
      const isRising = printSlack(path, 'lines', lines, floor)
      if (!isRising && wholePercent(lines) >= floor) atBar++
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
