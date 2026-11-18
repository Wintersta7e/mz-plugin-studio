// Checks the lasting ceilings in ratchets.json from the repository root.
//   jscpd: runs jscpd over the tree under its own config (.jscpd.json) and holds its clones and
//          duplicated lines exactly at their ceilings: a rise fails, printing each clone, and so
//          does a fall, naming the ceiling to write, so a ceiling only moves down with the copies
//          it counts. A share would let new copies through as the code around them grows. A run
//          that wrote no report or scanned no file fails, printing how it ended and its last lines.
//   direction: compares every ratchet with its value at the base commit, the start of the change
//          under test: each number in ratchets.json (`jscpd` holds ceilings, `coverage` floors)
//          and each package.json script's `--at-least` (a floor) and `--max-warnings` (a
//          ceiling). Fails a ceiling that rose, a floor that fell, a ratchet the base holds and
//          the tree does not, a number outside the known sections, a base that is not a commit or
//          holds an unreadable file, and a comparison of nothing. A ratchet the base does not hold
//          passes, so a new one can land. The exact checks alone pass a commit that raises a count
//          and its ceiling together; this one does not.
// `node scripts/check-ratchets.mjs` runs both: the base is RATCHETS_BASE (CI names the pushed
// range's base: a push's previous tip, a pull request's base); an empty or all-zero value, or none,
// stands for the merge-base with origin/main, else HEAD's parent. `--base <ref>` runs the
// direction check alone against `ref`.
// The coverage floors in the same file are checked by scripts/check-coverage.mjs.
import { spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { parseArgs } from 'node:util'

const RATCHETS = 'ratchets.json'
const PACKAGE = 'package.json'
const JSCPD = 'node_modules/jscpd/run-jscpd.js'
const OUTPUT_TAIL = 20

/**
@typedef {{ sources: number, clones: number, duplicatedLines: number, percentage: number }} JscpdTotal
@typedef {'ceiling' | 'floor'} Direction
@typedef {{ value: number, direction: Direction }} Ratchet
*/

// Which way the numbers of each ratchets.json section may move: a ceiling only down, a floor up.
/**
@type {[string, Direction][]}
*/
const SECTION_DIRECTIONS = [
  ['jscpd', 'ceiling'],
  ['coverage', 'floor']
]
const SECTIONS = new Map(SECTION_DIRECTIONS)
const SECTION_NAMES = SECTION_DIRECTIONS.map(([name]) => name).join(', ')
// The package.json script flags that hold a ratchet.
/**
@type {[string, RegExp, Direction][]}
*/
const SCRIPT_FLAGS = [
  ['--at-least', /--at-least (?<value>\d+(?:\.\d+)?)/v, 'floor'],
  ['--max-warnings', /--max-warnings (?<value>\d+)/v, 'ceiling']
]

/**
@param {string} line
*/
const print = (line) => process.stdout.write(`ratchets: ${line}\n`)

/**
@param {unknown} value
@returns {value is Record<string, unknown>}
*/
const isRecord = (value) => typeof value === 'object' && value !== null && !Array.isArray(value)

/**
@param {unknown} value
@returns {value is unknown[]}
*/
const isArray = (value) => Array.isArray(value)

/**
A member of a parsed JSON value; undefined when the value holds no such member.
@param {unknown} value
@param {string} key
@returns {unknown}
*/
const member = (value, key) => (isRecord(value) ? value[key] : undefined)

/**
Parsed JSON; undefined when the text is not JSON.
@param {string} text
@returns {unknown}
*/
function parseJson(text) {
  try {
    /**
    @type {unknown}
    */
    const value = JSON.parse(text)
    return value
  } catch {
    return
  }
}

/**
Parsed JSON of a file; undefined when the file is absent or not JSON.
@param {string} file
*/
const readJson = (file) => (existsSync(file) ? parseJson(readFileSync(file, 'utf8')) : undefined)

/**
The totals of a jscpd JSON report; undefined when it holds none.
@param {unknown} report
@returns {JscpdTotal | undefined}
*/
function jscpdTotal(report) {
  const total = member(member(report, 'statistics'), 'total')
  const [sources, clones, duplicatedLines, percentage] = [
    'sources',
    'clones',
    'duplicatedLines',
    'percentage'
  ].map((key) => member(total, key))
  return typeof sources === 'number' &&
    typeof clones === 'number' &&
    typeof duplicatedLines === 'number' &&
    typeof percentage === 'number'
    ? { sources, clones, duplicatedLines, percentage }
    : undefined
}

/**
A side of a clone in a jscpd report as `file:start-end`.
@param {unknown} side
*/
const location = (side) =>
  `${String(member(side, 'name'))}:${String(member(side, 'start'))}-${String(member(side, 'end'))}`

/**
Each clone of a jscpd report as `file:start-end ↔ file:start-end`.
@param {unknown} report
*/
function clonesOf(report) {
  const duplicates = member(report, 'duplicates')
  return (isArray(duplicates) ? duplicates : []).map(
    (/** @type {unknown} */ clone) =>
      `${location(member(clone, 'firstFile'))} ↔ ${location(member(clone, 'secondFile'))}`
  )
}

/**
Runs jscpd with a JSON report into a temporary folder; its parsed report, or undefined after
printing how a run without one ended.
*/
function runJscpd() {
  const output = mkdtempSync(path.join(tmpdir(), 'ratchets-jscpd-'))
  try {
    const result = spawnSync(process.execPath, [JSCPD, '--reporters', 'json', '--output', output], {
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024
    })
    const report = readJson(path.join(output, 'jscpd-report.json'))
    if (result.status === 0 && jscpdTotal(report) !== undefined) return report
    const ending =
      result.error === undefined ? (result.signal ?? `exit ${result.status}`) : result.error.message
    print(`the jscpd run ${result.status === 0 ? 'wrote no report' : 'failed'} (${ending})`)
    const tail = `${result.stdout}${result.stderr}`
      .split('\n')
      .filter((line) => line.trim() !== '')
      .slice(-OUTPUT_TAIL)
    for (const line of tail) print(`jscpd | ${line}`)
    return
  } finally {
    rmSync(output, { recursive: true, force: true })
  }
}

/**
Whether jscpd's clones and duplicated lines sit exactly at their ceilings.
@param {unknown} ratchets
*/
function checkJscpd(ratchets) {
  const ceilings = member(ratchets, 'jscpd')
  /**
  @type {[string, unknown][]}
  */
  const named = ['clones', 'duplicatedLines'].map((key) => [key, member(ceilings, key)])
  const missing = named.filter(([, ceiling]) => typeof ceiling !== 'number')
  for (const [key] of missing) print(`${RATCHETS} holds no jscpd.${key} ceiling`)
  const report = runJscpd()
  const total = jscpdTotal(report)
  if (total === undefined) return false
  const { sources, clones, duplicatedLines, percentage } = total
  print(
    `jscpd files scanned ${sources}, clones ${clones}, duplicated lines ${duplicatedLines} ` +
      `(${percentage.toFixed(2)}%), ceilings clones ${String(member(ceilings, 'clones'))}, ` +
      `duplicated lines ${String(member(ceilings, 'duplicatedLines'))}`
  )
  if (sources === 0) {
    print('the jscpd run scanned no file')
    return false
  }
  /**
  @type {Record<string, number>}
  */
  const counts = { clones, duplicatedLines }
  let isOk = missing.length === 0
  let hasRisen = false
  for (const [key, ceiling] of named) {
    const count = counts[key] ?? 0
    if (typeof ceiling !== 'number' || count === ceiling) continue
    if (count > ceiling) {
      print(`jscpd.${key} ${count} rose above the ceiling ${ceiling} in ${RATCHETS}`)
      hasRisen = true
    } else {
      print(`lower jscpd.${key} in ${RATCHETS} to ${count}`)
    }
    isOk = false
  }
  if (hasRisen) for (const clone of clonesOf(report)) print(`clone ${clone}`)
  return isOk
}

/**
Each number of a parsed ratchets.json by its dotted key, with its section's direction, and the key
of each number outside a known section.
@param {unknown} ratchets
*/
function storeRatchets(ratchets) {
  /**
  @type {Map<string, Ratchet>}
  */
  const found = new Map()
  /**
  @type {string[]}
  */
  const unknown = []
  /**
  @param {unknown} value
  @param {string} key
  @param {Direction | undefined} direction
  */
  const walk = (value, key, direction) => {
    if (typeof value === 'number') {
      if (direction === undefined) unknown.push(key)
      else found.set(key, { value, direction })
    } else if (isRecord(value)) {
      for (const [name, inner] of Object.entries(value)) {
        walk(inner, `${key}.${name}`, direction)
      }
    }
  }
  const sections = Object.entries(isRecord(ratchets) ? ratchets : {})
  for (const [section, value] of sections) {
    walk(value, section, SECTIONS.get(section))
  }
  return { found, unknown }
}

/**
The ratchets the scripts of a parsed package.json hold, by `package.json scripts.<name> <flag>`.
@param {unknown} manifest
*/
function scriptRatchets(manifest) {
  /**
  @type {Map<string, Ratchet>}
  */
  const found = new Map()
  const scripts = member(manifest, 'scripts')
  const bodies = Object.entries(isRecord(scripts) ? scripts : {})
  for (const [name, body] of bodies) {
    for (const [flag, pattern, direction] of SCRIPT_FLAGS) {
      const value = typeof body === 'string' ? pattern.exec(body)?.groups?.['value'] : undefined
      if (value !== undefined) {
        found.set(`${PACKAGE} scripts.${name} ${flag}`, { value: Number(value), direction })
      }
    }
  }
  return found
}

/**
A file's text at a commit; undefined when the commit holds no such file.
@param {string} commit
@param {string} file
*/
function showFile(commit, file) {
  const result = spawnSync('git', ['show', `${commit}:${file}`], { encoding: 'utf8' })
  return result.status === 0 ? result.stdout : undefined
}

/**
The ratchets a commit holds; undefined, printing why, when one of its files is not readable.
@param {string} commit
*/
function ratchetsAt(commit) {
  /**
  @type {Map<string, Ratchet>}
  */
  const found = new Map()
  for (const file of [RATCHETS, PACKAGE]) {
    const text = showFile(commit, file)
    const parsed = text === undefined ? {} : parseJson(text)
    if (!isRecord(parsed)) {
      print(`${commit} has no readable ${file}`)
      return
    }
    const held = file === RATCHETS ? storeRatchets(parsed).found : scriptRatchets(parsed)
    for (const [key, ratchet] of held) found.set(key, ratchet)
  }
  return found
}

/**
The base commit RATCHETS_BASE names; with none, the merge-base with origin/main, else HEAD's parent.
*/
function namedBase() {
  const named = process.env['RATCHETS_BASE']
  if (named !== undefined && named !== '' && !/^0+$/v.test(named)) return named
  const result = spawnSync('git', ['merge-base', 'HEAD', 'origin/main'], { encoding: 'utf8' })
  return result.status === 0 ? result.stdout.trim() : 'HEAD^'
}

/**
Whether no ratchet moved toward lax since `base`; prints each that did and the count compared.
@param {string} base
@param {Record<string, unknown>} ratchets
*/
function checkDirection(base, ratchets) {
  const resolved = spawnSync('git', ['rev-parse', '--verify', '--quiet', `${base}^0`], {
    encoding: 'utf8'
  })
  if (resolved.status !== 0) {
    print(`base ${base} is not a commit`)
    return false
  }
  const commit = resolved.stdout.trim()
  const before = ratchetsAt(commit)
  if (before === undefined) return false
  const store = storeRatchets(ratchets)
  const now = new Map([...store.found, ...scriptRatchets(readJson(PACKAGE))])
  for (const key of store.unknown) {
    print(`${key} is in no section ${RATCHETS} knows (${SECTION_NAMES})`)
  }
  let isOk = store.unknown.length === 0
  for (const [key, { value, direction }] of before) {
    const current = now.get(key)?.value
    const moved = direction === 'ceiling' ? 'a ceiling rose' : 'a floor fell'
    if (current === undefined) {
      print(`${key} ${value} → none: the ratchet vanished since ${commit}`)
    } else if (direction === 'ceiling' ? current > value : current < value) {
      print(`${key} ${value} → ${current}: ${moved} since ${commit}`)
    } else {
      continue
    }
    isOk = false
  }
  print(`compared ${before.size} against ${commit}`)
  return isOk && before.size > 0
}

/**
The exit status of the ratchet checks.
@param {string[]} args
*/
function main(args) {
  /**
  @type {string | undefined}
  */
  let base
  try {
    base = parseArgs({ args, options: { base: { type: 'string' } } }).values.base
  } catch {
    print('usage: node scripts/check-ratchets.mjs [--base <ref>]')
    return 1
  }
  const ratchets = readJson(RATCHETS)
  if (!isRecord(ratchets)) {
    print(`${RATCHETS} is missing or not a JSON object`)
    return 1
  }
  if (base !== undefined) return checkDirection(base, ratchets) ? 0 : 1
  const isDirectionOk = checkDirection(namedBase(), ratchets)
  const isJscpdOk = checkJscpd(ratchets)
  return isJscpdOk && isDirectionOk ? 0 : 1
}

process.exitCode = main(process.argv.slice(2))
