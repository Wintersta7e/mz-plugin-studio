// Checks a coverage report from the repository root against the floors ratchets.json holds.
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
import path from 'node:path'

const GENERATOR = 'src/renderer/src/lib/generator'

// The floors live in ratchets.json under `coverage`. `suite` holds one entry per directory: a file
// counts toward the deepest directory holding it, so `src/renderer/src/lib` excludes `generator/`
// and `src/renderer/src` holds only the files no deeper directory owns (App.tsx, main.tsx); a file
// with lines that no directory owns fails the check. Its `global` entry is the whole report.
// `golden.files` holds every generator file, the category modules under templates/ included: a new
// one needs its own floor.
const RATCHETS = 'ratchets.json'

const SUMMARY = {
  suite: 'coverage/coverage-summary.json',
  golden: 'coverage/golden/coverage-summary.json'
}

/**
@typedef {{ covered: number, total: number }} Counts
@typedef {{ lines: Counts, branches: Counts | undefined }} Entry
@typedef {{ lines: Counts, branches: Counts }} Sum
@typedef {{ lines: number, branches: number }} Floors
@typedef {{ directory: string, floors: Floors, lines: Counts, branches: Counts, files: number }} DirectorySum
@typedef {{ suite: Map<string, Floors>, global: Floors, golden: Map<string, number> }} AllFloors
*/

/**
@param {string} line
*/
const print = (line) => process.stdout.write(`${line}\n`)
/**
@param {Counts} counts
*/
const percent = ({ covered, total }) => (total === 0 ? 100 : (covered / total) * 100)
// The percentage rounded down to the integer, in integer arithmetic so that 57 of 100 is 57.
/**
@param {Counts} counts
*/
const wholePercent = ({ covered, total }) =>
  total === 0 ? 100 : Math.floor((covered * 100) / total)
/**
@param {Counts} lines
@param {number} floor
*/
const atFloor = (lines, floor) => `${percent(lines).toFixed(2)}% (floor ${floor}%)`
/**
@param {Sum} sum
@param {Floors} floors
*/
const isBelow = (sum, floors) =>
  wholePercent(sum.lines) < floors.lines || wholePercent(sum.branches) < floors.branches
/**
@param {Sum} sum
@param {Floors} floors
*/
const bothAtFloor = (sum, floors) =>
  `lines ${atFloor(sum.lines, floors.lines)}, branches ${atFloor(sum.branches, floors.branches)}`
// How far each floor sits below its measured value, printed for every floor; a floor a whole
// point or more below it also prints the floor to write. Whether the floor must rise.
/**
@param {string} scope
@param {string} metric
@param {Counts} counts
@param {number} floor
*/
const printSlack = (scope, metric, counts, floor) => {
  print(
    `floor ${scope} ${metric}: measured ${percent(counts).toFixed(2)}%, floor ${floor}%, ` +
      `slack ${(percent(counts) - floor).toFixed(2)}%`
  )
  const isRising = wholePercent(counts) > floor
  if (isRising) {
    print(
      `coverage floor ${scope} ${metric}: raise the floor in ${RATCHETS} to ` +
        `${wholePercent(counts)} ` +
        `(measured ${percent(counts).toFixed(2)}%)`
    )
  }
  return isRising
}
// Prints the slack of both floors; whether either must rise.
/**
@param {string} scope
@param {Sum} sum
@param {Floors} floors
*/
const isEitherRising = (scope, sum, floors) =>
  [
    printSlack(scope, 'lines', sum.lines, floors.lines),
    printSlack(scope, 'branches', sum.branches, floors.branches)
  ].includes(true)
// Whether a directory or the whole report fails: a floor to raise, no file, or a value below one.
/**
@param {string} scope
@param {Sum} sum
@param {Floors} floors
@param {number} files
*/
const doesScopeFail = (scope, sum, floors, files) =>
  isEitherRising(scope, sum, floors) || files === 0 || isBelow(sum, floors)
/**
@returns {Counts}
*/
const zero = () => ({ covered: 0, total: 0 })
/**
@param {Counts} sum
@param {Counts} counts
*/
const addCounts = (sum, counts) => {
  sum.covered += counts.covered
  sum.total += counts.total
}

/**
@param {unknown} value
@returns {value is Record<string, unknown>}
*/
const isRecord = (value) => typeof value === 'object' && value !== null && !Array.isArray(value)

/**
A summary's covered and total figures; throws when the summary holds no such pair.
@param {unknown} value
@param {string} name
@returns {Counts}
*/
function readCounts(value, name) {
  const { covered, total } = isRecord(value) ? value : {}
  if (typeof covered !== 'number' || typeof total !== 'number') {
    throw new TypeError(`coverage summary entry without counts: ${name}`)
  }
  return { covered, total }
}

/**
A summary entry's line figures and, when it has them, its branch figures.
@param {unknown} value
@param {string} name
@returns {Entry}
*/
function readEntry(value, name) {
  const { lines, branches } = isRecord(value) ? value : {}
  return {
    lines: readCounts(lines, name),
    branches: branches === undefined ? undefined : readCounts(branches, name)
  }
}

/**
Report entries by repository-relative path, with `/` separators.
@param {string} file
*/
function readReport(file) {
  /**
  @type {unknown}
  */
  const summary = JSON.parse(readFileSync(file, 'utf8'))
  const { total, ...entries } = isRecord(summary) ? summary : {}
  /**
  @type {Map<string, Entry>}
  */
  const files = new Map()
  for (const [key, value] of Object.entries(entries)) {
    files.set(path.relative(process.cwd(), key).split(path.sep).join('/'), readEntry(value, key))
  }
  return { files, total: readEntry(total, 'total') }
}

/**
A whole-number floor; throws naming its key when the value is not one.
@param {unknown} value
@param {string} key
*/
function readFloor(value, key) {
  if (typeof value !== 'number' || !Number.isSafeInteger(value)) {
    throw new TypeError(`${RATCHETS} holds no whole-number floor at ${key}`)
  }
  return value
}

/**
The coverage floors ratchets.json holds; throws naming the first value that is not a floor.
@returns {AllFloors}
*/
function readFloors() {
  /**
  @type {unknown}
  */
  const ratchets = JSON.parse(readFileSync(RATCHETS, 'utf8'))
  const { coverage } = isRecord(ratchets) ? ratchets : {}
  const { suite, golden } = isRecord(coverage) ? coverage : {}
  const { files } = isRecord(golden) ? golden : {}
  /**
  @type {Map<string, Floors>}
  */
  const directories = new Map()
  const suiteEntries = Object.entries(isRecord(suite) ? suite : {})
  for (const [directory, floors] of suiteEntries) {
    const { lines, branches } = isRecord(floors) ? floors : {}
    const key = `coverage.suite.${directory}`
    directories.set(directory, {
      lines: readFloor(lines, `${key}.lines`),
      branches: readFloor(branches, `${key}.branches`)
    })
  }
  const global = directories.get('global')
  if (global === undefined) throw new TypeError(`${RATCHETS} holds no coverage.suite.global floors`)
  directories.delete('global')
  const goldenFloors = new Map(
    Object.entries(isRecord(files) ? files : {}).map(([file, floor]) => [
      file,
      readFloor(floor, `coverage.golden.files.${file}`)
    ])
  )
  return { suite: directories, global, golden: goldenFloors }
}

/**
Tracked TypeScript sources under `directory`, declaration files excluded.
@param {string} directory
*/
function trackedSources(directory) {
  const out = execFileSync(
    'git',
    ['ls-files', '-z', '--', `:(glob)${directory}/**/*.ts`, `:(glob)${directory}/**/*.tsx`],
    { encoding: 'utf8' }
  )
  return out.split('\0').filter((file) => file !== '' && !file.endsWith('.d.ts'))
}

/**
An entry with its branch figures, or none when it has none.
@param {[string, Entry]} item
@returns {[string, Sum][]}
*/
const withBranches = ([file, { lines, branches }]) =>
  branches === undefined ? [] : [[file, { lines, branches }]]

/**
Each floor directory's summed figures; prints each file with lines that no directory owns.
@param {Map<string, Sum>} files
@param {Map<string, Floors>} suiteFloors
*/
function directorySums(files, suiteFloors) {
  /**
  @type {DirectorySum[]}
  */
  const sums = [...suiteFloors].map(([directory, floors]) => ({
    directory,
    floors,
    lines: zero(),
    branches: zero(),
    files: 0
  }))
  let isFailed = false
  for (const [file, entry] of files) {
    const owner = sums
      .filter(({ directory }) => file.startsWith(`${directory}/`))
      .toSorted((a, b) => b.directory.length - a.directory.length)
      .at(0)
    if (owner === undefined) {
      if (entry.lines.total > 0) {
        print(`coverage file without a floor directory: ${file}`)
        isFailed = true
      }
      continue
    }
    addCounts(owner.lines, entry.lines)
    addCounts(owner.branches, entry.branches)
    owner.files++
  }
  return { sums, isFailed }
}

/**
@param {{ files: Map<string, Entry>, total: Entry }} report
@param {AllFloors} floors
*/
function checkSuite({ files, total }, floors) {
  let isFailed = false
  const tracked = trackedSources('src')
  const reported = tracked.filter((file) => files.has(file)).length
  print(`coverage scope: ${reported} reported / ${tracked.length} tracked`)
  if (tracked.length === 0 || reported !== tracked.length) isFailed = true

  const missing = [...files].find(([, { branches }]) => branches === undefined)
  if (missing !== undefined) {
    print(`coverage summary entry without branches: ${missing[0]}`)
    return true
  }
  if (total.branches === undefined) {
    print('coverage summary entry without branches: total')
    return true
  }
  const totalSum = { lines: total.lines, branches: total.branches }

  const { sums, isFailed: isUnowned } = directorySums(
    new Map([...files].flatMap((item) => withBranches(item))),
    floors.suite
  )
  if (isUnowned) isFailed = true
  for (const sum of sums) {
    print(`coverage floor ${sum.directory}: ${bothAtFloor(sum, sum.floors)}, files ${sum.files}`)
    if (doesScopeFail(sum.directory, sum, sum.floors, sum.files)) isFailed = true
  }
  print(`coverage floor global: ${bothAtFloor(totalSum, floors.global)}, files ${files.size}`)
  if (doesScopeFail('global', totalSum, floors.global, files.size)) isFailed = true
  return isFailed
}

/**
Strings in code-unit order, the order `Array#sort` gives them without a compare function.
@param {string} left
@param {string} right
*/
const byCodeUnits = (left, right) => (left < right ? -1 : Number(left > right))

/**
@param {{ files: Map<string, Entry> }} report
@param {Map<string, number>} goldenFloors
*/
function checkGolden({ files }, goldenFloors) {
  const paths = [...new Set([...trackedSources(GENERATOR), ...goldenFloors.keys()])].toSorted(
    byCodeUnits
  )
  let atBar = 0
  for (const file of paths) {
    const floor = goldenFloors.get(file)
    const lines = files.get(file)?.lines
    if (floor === undefined) {
      print(`golden coverage ${file}: no floor`)
    } else if (lines === undefined) {
      print(`golden coverage ${file}: missing (floor ${floor}%)`)
    } else {
      print(`golden coverage ${file}: ${atFloor(lines, floor)}`)
      const isRising = printSlack(file, 'lines', lines, floor)
      if (!isRising && wholePercent(lines) >= floor) atBar++
    }
  }
  print(`golden coverage: ${atBar}/${paths.length} files at bar`)
  return paths.length === 0 || atBar !== paths.length
}

/**
The exit status of a check of the mode's report.
@param {string | undefined} mode
*/
function main(mode) {
  if (mode !== 'suite' && mode !== 'golden') {
    print('usage: node scripts/check-coverage.mjs suite|golden')
    return 1
  }
  if (!existsSync(RATCHETS)) {
    print(`coverage floors missing: ${RATCHETS}`)
    return 1
  }
  if (!existsSync(SUMMARY[mode])) {
    print(`coverage summary missing: ${SUMMARY[mode]}`)
    return 1
  }
  const floors = readFloors()
  const report = readReport(SUMMARY[mode])
  const isFailed =
    mode === 'suite' ? checkSuite(report, floors) : checkGolden(report, floors.golden)
  return isFailed ? 1 : 0
}

process.exitCode = main(process.argv[2])
