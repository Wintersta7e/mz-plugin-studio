// Checks the lasting ceilings in ratchets.json from the repository root.
//   jscpd: runs jscpd over the tree under its own config (.jscpd.json) and holds its clones and
//          duplicated lines exactly at their ceilings: a rise fails, printing each clone, and so
//          does a fall, naming the ceiling to write, so a ceiling only moves down with the copies
//          it counts. A share would let new copies through as the code around them grows. A run
//          that wrote no report or scanned no file fails, printing how it ended and its last lines.
// The coverage floors in the same file are checked by scripts/check-coverage.mjs.
import { spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

const RATCHETS = 'ratchets.json'
const JSCPD = 'node_modules/jscpd/run-jscpd.js'
const OUTPUT_TAIL = 20

/**
@typedef {{ sources: number, clones: number, duplicatedLines: number, percentage: number }} JscpdTotal
*/

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
Parsed JSON of a file; undefined when the file is absent or not JSON.
@param {string} file
@returns {unknown}
*/
function readJson(file) {
  if (!existsSync(file)) return
  try {
    /**
    @type {unknown}
    */
    const value = JSON.parse(readFileSync(file, 'utf8'))
    return value
  } catch {
    return
  }
}

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
The exit status of the ratchet checks.
@param {string[]} args
*/
function main(args) {
  if (args.length > 0) {
    print('usage: node scripts/check-ratchets.mjs')
    return 1
  }
  const ratchets = readJson(RATCHETS)
  if (!isRecord(ratchets)) {
    print(`${RATCHETS} is missing or not a JSON object`)
    return 1
  }
  return checkJscpd(ratchets) ? 0 : 1
}

process.exitCode = main(process.argv.slice(2))
