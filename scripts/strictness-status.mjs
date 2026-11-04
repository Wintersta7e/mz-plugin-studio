// Reports what the strict configuration still holds back, from the repository root.
//   default:          the frozen lint findings in eslint-suppressions.json against the base
//                     commit's (baseCommit), and the type-check errors each pending flag still
//                     has. Fails a rise in any (file, rule) entry unless the change under test
//                     changes the lint config or a lint package version; fails a pending count
//                     off the exact ceiling pending-ceilings.json holds for it, a pending flag
//                     without a ceiling or a ceiling without a pending flag, a pending flag
//                     with no error left (it must move to its program), and a pending check
//                     whose tsc did not finish (printing how it ended and its last lines).
//   --report knip:    the dead-code findings by type, of the whole tree (exits 0 on findings) and
//                     of the production code alone (fails unless at its ceiling).
//   --report jscpd:   the copied code's clones and duplicated lines (fails unless both are at the
//                     ceilings given as --clones and --duplicated-lines, or without a report).
//   --report typecov: the type coverage of each program; exits 0 below 100%.
// The reports otherwise fail only when a run printed no summary or scanned nothing, and then
// print how the run ended and its last lines.
import { execFileSync, spawn, spawnSync } from 'node:child_process'
import { closeSync, existsSync, mkdtempSync, openSync, readFileSync, rmSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { parseArgs } from 'node:util'

const SUPPRESSIONS = 'eslint-suppressions.json'
const LINT_CONFIGS = new Set(['eslint.config.mjs', 'lint-scope.json'])
const PENDING_CEILINGS = 'pending-ceilings.json'
const PENDING_FILE = /^tsconfig\.(?<program>[\w\-]+)\.pending\.json$/v
const TYPECOV_PROGRAMS = ['node', 'web', 'test', 'tools', 'scripts', 'e2e']
// Each pending check is a full type-check of its program; four at a time bounds memory.
const TSC_JOBS = 4

const print = (line) => process.stdout.write(`${line}\n`)
const git = (args) => execFileSync('git', args, { encoding: 'utf8' })
// The commit the working tree is measured against, the start of the change under test. CI names
// it in STRICTNESS_BASE: the pushed range's base (a push's previous tip, a pull request's base);
// an empty or all-zero value (a new branch, an event without a pushed range) stands for the
// merge-base with origin/main. Unset (a local run): HEAD while tracked files hold uncommitted
// changes (a gate run before committing), else HEAD's parent. Undefined without a merge-base.
function baseCommit() {
  const named = process.env['STRICTNESS_BASE']
  if (named === undefined) {
    return git(['status', '--porcelain', '--untracked-files=no']) === '' ? 'HEAD^' : 'HEAD'
  }
  if (named !== '' && !/^0+$/v.test(named)) return named
  const result = spawnSync('git', ['merge-base', 'HEAD', 'origin/main'], { encoding: 'utf8' })
  return result.status === 0 ? result.stdout.trim() : undefined
}
// A file's text at the base commit; null when the base or the file is absent.
const baseFile = (base, file) => {
  const result = spawnSync('git', ['show', `${base}:${file}`], { encoding: 'utf8' })
  return result.status === 0 ? result.stdout : null
}
// Parsed JSON; null when the text is absent or not JSON.
const parseJson = (text) => {
  try {
    return text === null ? null : JSON.parse(text)
  } catch {
    return null
  }
}

/**
@typedef {{ file: string, rule: string, count: number }} SuppressionEntry
*/
// The (file, rule, count) entries of a suppressions file's text; null if unreadable.
/**
@param {string | null} text
@returns {SuppressionEntry[] | null}
*/
function suppressionEntries(text) {
  const data = parseJson(text)
  return typeof data !== 'object' || data === null || Array.isArray(data)
    ? null
    : Object.entries(data).flatMap(([file, rules]) =>
        Object.entries(rules).map(([rule, { count }]) => ({ file, rule, count }))
      )
}
/**
@param {SuppressionEntry[]} entries
*/
const violations = (entries) => entries.reduce((sum, { count }) => sum + count, 0)
/**
@param {SuppressionEntry} entry
*/
const entryName = ({ file, rule }) => `${file} ${rule}`

// The packages the ESLint config imports, plus ESLint and TypeScript themselves.
function lintPackages() {
  const config = readFileSync('eslint.config.mjs', 'utf8')
  const names = new Set(['eslint', 'typescript'])
  for (const match of config.matchAll(/^import\s[^'"]*['"](?<specifier>[^'"]+)['"]/gmv)) {
    const { specifier } = match.groups
    if (specifier.startsWith('.') || specifier.startsWith('node:')) continue
    const parts = specifier.split('/')
    names.add(specifier.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0])
  }
  return names
}

// Whether the working tree changes the lint config or the version of a lint package since base.
function changesLintSetup(base) {
  const changed = git(['diff', '--name-only', base]).split('\n')
  if (changed.some((file) => LINT_CONFIGS.has(file))) return true
  const before = parseJson(baseFile(base, 'package.json'))?.devDependencies ?? {}
  const after = parseJson(readFileSync('package.json', 'utf8'))?.devDependencies ?? {}
  return [...lintPackages()].some((name) => before[name] !== after[name])
}

function checkSuppressions(tracked) {
  const now = suppressionEntries(
    existsSync(SUPPRESSIONS) ? readFileSync(SUPPRESSIONS, 'utf8') : null
  )
  if (now === null) {
    print(`eslint-suppressions: ${SUPPRESSIONS} missing or unreadable`)
    return false
  }
  const base = baseCommit()
  if (base === undefined) {
    print('eslint-suppressions: no base commit; HEAD and origin/main have no merge-base')
    return false
  }
  const parent = suppressionEntries(baseFile(base, SUPPRESSIONS))
  if (parent === null) {
    print(`eslint-suppressions: ${base} has no readable ${SUPPRESSIONS}`)
    return false
  }
  const files = [...new Set(now.map(({ file }) => file))]
  const delta = violations(now) - violations(parent)
  print(
    `eslint-suppressions: ${violations(now)} violations in ${now.length} entries, ${files.length} files (parent ${violations(parent)}, delta ${delta > 0 ? '+' : ''}${delta})`
  )
  const untracked = files.filter((name) => !tracked.has(name))
  for (const file of untracked) print(`eslint-suppressions: entry for an untracked file ${file}`)
  let isOk = untracked.length === 0
  const before = new Map(parent.map((entry) => [entryName(entry), entry.count]))
  const rises = now
    .map((entry) => ({ ...entry, name: entryName(entry), was: before.get(entryName(entry)) ?? 0 }))
    .filter(({ count, was }) => count > was)
  if (rises.length > 0 && !changesLintSetup(base)) {
    for (const { name, count, was } of rises) {
      print(`eslint-suppressions: ${name}: ${count} (parent ${was})`)
    }
    print('eslint-suppressions: the count rose without a lint config or lint package change')
    isOk = false
  }
  return isOk
}

// Every (program, config, flag) a tracked pending file holds.
function pendingPairs(tracked) {
  const pairs = []
  const files = [...tracked].toSorted((left, right) => left.localeCompare(right))
  for (const file of files) {
    const program = PENDING_FILE.exec(path.posix.basename(file))?.groups?.program
    if (program === undefined) continue
    const pending = JSON.parse(readFileSync(file, 'utf8'))
    const config = path.posix.join(path.posix.dirname(file), pending.extends)
    const flags = Object.keys(pending.compilerOptions ?? {})
    for (const flag of flags) pairs.push({ program, config, flag })
  }
  return pairs
}

const TSC = path.join(
  path.dirname(createRequire(import.meta.url).resolve('typescript/package.json')),
  'bin/tsc'
)
const ERROR_AT = /^.+\(\d+,\d+\): error TS\d+:/gmv
const ERROR_ANYWHERE = /^error TS\d+:/mv

// The type-check errors the program has with the flag on, and how the tsc run ended. The count is
// undefined when tsc did not finish a check: killed, stopped on an error without a location, or
// an exit status that does not match the errors it printed.
function pendingErrors({ config, flag }) {
  return new Promise((resolve) => {
    const args = [
      TSC,
      '--noEmit',
      '-p',
      config,
      '--composite',
      'false',
      '--pretty',
      'false',
      `--${flag}`
    ]
    const child = spawn(process.execPath, args, { stdio: ['ignore', 'pipe', 'pipe'] })
    let out = ''
    child.stdout.on('data', (chunk) => (out += chunk))
    child.stderr.on('data', (chunk) => (out += chunk))
    child.on('close', (code, signal) => {
      const located = (out.match(ERROR_AT) ?? []).length
      const isChecked =
        signal === null &&
        !ERROR_ANYWHERE.test(out) &&
        (code === 0 ? located === 0 : code === 2 && located > 0)
      const ending = signal ?? `exit ${code}`
      resolve({
        count: isChecked ? located : undefined,
        run: { out, bytes: Buffer.byteLength(out), ending }
      })
    })
  })
}

// Why a pending count fails against its ceiling; undefined when it holds the ceiling. Each count
// is held exactly, so a rise fails and so does a fall: the commit that fixes errors lowers the
// ceiling with them.
/**
@param {number} count
@param {unknown} ceiling
*/
function pendingProblem(count, ceiling) {
  if (count === 0) return 'no error left; move the flag to its program'
  if (typeof ceiling !== 'number' || !Number.isSafeInteger(ceiling) || ceiling < 0) {
    return `${PENDING_CEILINGS} names no ceiling`
  }
  if (count > ceiling) return `the count rose above the ceiling ${ceiling}`
  return count < ceiling
    ? `the count fell; lower its ceiling in ${PENDING_CEILINGS} to ${count}`
    : undefined
}

// Ceilings named for a (program, flag) that no pending file holds.
/**
@param {Record<string, unknown>} ceilings
@param {{ program: string, flag: string }[]} pairs
*/
function staleCeilings(ceilings, pairs) {
  const pending = new Set(pairs.map(({ program, flag }) => `${program} ${flag}`))
  return Object.entries(ceilings).flatMap(([program, flags]) =>
    Object.keys(typeof flags === 'object' && flags !== null ? flags : {})
      .map((flag) => `${program} ${flag}`)
      .filter((name) => !pending.has(name))
  )
}

async function checkPending(tracked) {
  const pairs = pendingPairs(tracked)
  const results = Array.from({ length: pairs.length })
  let next = 0
  const worker = async () => {
    while (next < pairs.length) {
      const index = next
      next += 1
      results[index] = await pendingErrors(pairs[index])
    }
  }
  await Promise.all(Array.from({ length: TSC_JOBS }, worker))
  const ceilings = existsSync(PENDING_CEILINGS)
    ? parseJson(readFileSync(PENDING_CEILINGS, 'utf8'))
    : undefined
  if (typeof ceilings !== 'object' || !ceilings || Array.isArray(ceilings)) {
    print(`pending: ${PENDING_CEILINGS} missing or unreadable`)
    return false
  }
  let isOk = true
  for (const [index, { program, flag }] of pairs.entries()) {
    const { count, run } = results[index]
    if (count === undefined) {
      printFailedRun(`pending ${program} ${flag}`, 'tsc failed', run)
      isOk = false
      continue
    }
    const ceiling = ceilings[program]?.[flag]
    print(`pending ${program} ${flag}: ${count} errors, ceiling ${ceiling ?? 'none'}`)
    const problem = pendingProblem(count, ceiling)
    if (problem === undefined) continue
    print(`pending ${program} ${flag}: ${problem}`)
    isOk = false
  }
  for (const name of staleCeilings(ceilings, pairs)) {
    print(`pending ${name}: ${PENDING_CEILINGS} holds a ceiling for a flag no pending file holds`)
    isOk = false
  }
  return isOk
}

// Runs an npm script with extra arguments and returns its output, its size in bytes, its exit
// status and how it ended. The child writes into regular files rather than pipes: a file write
// completes before the child can exit, so no output depends on a reader keeping up.
/**
@param {string} script
@param {string[]} [extra]
*/
function npmRun(script, extra = []) {
  const npm = process.env.npm_execpath
  const [command, args] = npm === undefined ? ['npm', []] : [process.execPath, [npm]]
  const tail = extra.length === 0 ? [] : ['--', ...extra]
  const directory = mkdtempSync(path.join(tmpdir(), 'strictness-run-'))
  const files = [path.join(directory, 'stdout'), path.join(directory, 'stderr')]
  try {
    const fds = files.map((file) => openSync(file, 'w'))
    let result
    try {
      result = spawnSync(command, [...args, 'run', '-s', script, ...tail], {
        stdio: ['ignore', ...fds]
      })
    } finally {
      for (const fd of fds) closeSync(fd)
    }
    const output = Buffer.concat(files.map((file) => readFileSync(file)))
    const ending =
      result.error === undefined ? (result.signal ?? `exit ${result.status}`) : result.error.message
    return { status: result.status, out: output.toString('utf8'), bytes: output.length, ending }
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
}

// A run with no usable summary prints how it ended, how many bytes it printed and its last lines,
// so a failure that does not recur still leaves its cause in the log.
const OUTPUT_TAIL = 20
/**
@param {string} label
@param {string} reason
@param {{ out: string, bytes: number, ending: string }} run
*/
function printFailedRun(label, reason, { out, bytes, ending }) {
  print(`${label}: ${reason} (${ending}, ${bytes} bytes received)`)
  const tail = out
    .split('\n')
    .filter((line) => line.trim() !== '')
    .slice(-OUTPUT_TAIL)
  for (const line of tail) print(`${label} | ${line}`)
}

// A knip run's findings by type; whether it printed a usable summary, its total and its output.
/**
@param {string} script
@param {string} label
*/
function reportKnipRun(script, label) {
  const run = npmRun(script)
  const { status, out } = run
  const types = Array.from(
    out.matchAll(/^(?<type>[A-Z][\w ]+) \((?<count>\d+)\)$/gmv),
    ({ groups }) => ({ type: groups.type, count: Number(groups.count) })
  )
  const hints = types.filter(({ type }) => type === 'Configuration hints')
  const issues = types.filter(({ type }) => type !== 'Configuration hints')
  for (const { type, count } of types) print(`${label} ${type.toLowerCase()}: ${count}`)
  const total = issues.reduce((sum, { count }) => sum + count, 0)
  print(`${label} issues: ${total}`)
  const isClean = out.includes('Knip found no issues')
  const isEmpty = issues.length === 0 && !isClean
  const isHintOnly = total === 0 && status !== 0
  const isOk = !isEmpty && !isHintOnly && hints.length === 0
  if (!isOk) printFailedRun(label, 'config hints or no parsable summary', run)
  return { isOk, total, out }
}

// The parsed package.json; null when it is not JSON.
/**
@returns {{ scripts?: Partial<Record<string, string>> } | null}
*/
function readManifest() {
  return parseJson(readFileSync('package.json', 'utf8'))
}

// The production run holds its ceiling in its own `--max-issues`, above which knip fails. A
// count below it fails here too, so the ceiling only moves down with the findings it counts.
const KNIP_PRODUCTION = 'knip:production'
const KNIP_CEILING = /--max-issues (?<ceiling>\d+)/v
const KNIP_SCANNED = /^knip scanned: files (?<files>\d+)/mv
function reportKnipProduction() {
  const { isOk, total, out } = reportKnipRun(KNIP_PRODUCTION, 'knip production')
  if (!isOk) return false
  const ceiling = KNIP_CEILING.exec(readManifest()?.scripts?.[KNIP_PRODUCTION] ?? '')?.groups
    .ceiling
  const files = Number(KNIP_SCANNED.exec(out)?.groups.files ?? 0)
  print(`knip production: files scanned ${files}, issues ${total}, ceiling ${ceiling ?? 'none'}`)
  if (files === 0) {
    print('knip production: the run scanned no file')
    return false
  }
  if (ceiling === undefined) {
    print(`knip production: the ${KNIP_PRODUCTION} script names no --max-issues ceiling`)
    return false
  }
  if (total > Number(ceiling)) {
    print(`knip production: the count rose above the ceiling ${ceiling}`)
    return false
  }
  if (total < Number(ceiling)) {
    print(`knip production: the count fell; lower --max-issues to ${total}`)
    return false
  }
  return true
}

function reportKnip() {
  const isAllOk = reportKnipRun('knip', 'knip').isOk
  return reportKnipProduction() && isAllOk
}

// The copy-paste run's clones and duplicated lines, each held exactly at the ceiling the
// `jscpd:report` script names: a rise fails, and so does a fall, so a ceiling only moves down
// with the copies it counts. A share would let new copies through as the code around them grows.
/**
@typedef {{ sources: number, clones: number, duplicatedLines: number, percentage: number }} JscpdTotal
@param {string[]} args
*/
function reportJscpd(args) {
  const { values } = parseArgs({
    args,
    options: { clones: { type: 'string' }, 'duplicated-lines': { type: 'string' } }
  })
  const output = mkdtempSync(path.join(tmpdir(), 'jscpd-'))
  const report = path.join(output, 'jscpd-report.json')
  try {
    const run = npmRun('jscpd', ['--reporters', 'json', '--output', output])
    /**
    @type {{ statistics?: { total?: JscpdTotal } } | null | undefined}
    */
    const parsed = existsSync(report) ? parseJson(readFileSync(report, 'utf8')) : undefined
    const total = parsed?.statistics?.total
    if (total === undefined || run.status !== 0) {
      printFailedRun('jscpd', run.status === 0 ? 'the run wrote no report' : 'the run failed', run)
      return false
    }
    const { sources, clones, duplicatedLines, percentage } = total
    const ceilings = { clones: values.clones, lines: values['duplicated-lines'] }
    print(
      `jscpd: files scanned ${sources}, clones ${clones}, duplicated lines ${duplicatedLines} ` +
        `(${percentage.toFixed(2)}%), ceilings clones ${ceilings.clones ?? 'none'}, ` +
        `duplicated lines ${ceilings.lines ?? 'none'}`
    )
    if (sources === 0) {
      print('jscpd: the run scanned no file')
      return false
    }
    /**
    @type {[string, number, string | undefined][]}
    */
    const counts = [
      ['clones', clones, ceilings.clones],
      ['duplicated-lines', duplicatedLines, ceilings.lines]
    ]
    let isOk = true
    for (const [name, count, ceiling] of counts) {
      if (ceiling === undefined) print(`jscpd: the jscpd:report script names no --${name} ceiling`)
      else if (count > Number(ceiling)) print(`jscpd: ${name} rose above the ceiling ${ceiling}`)
      else if (count < Number(ceiling)) print(`jscpd: ${name} fell; lower --${name} to ${count}`)
      else continue
      isOk = false
    }
    return isOk
  } finally {
    rmSync(output, { recursive: true, force: true })
  }
}

function reportTypecov() {
  let isOk = true
  for (const program of TYPECOV_PROGRAMS) {
    const run = npmRun(`typecov:${program}`)
    const groups = /\((?<covered>\d+) \/ (?<total>\d+)\) (?<pct>[\d.]+)%/v.exec(run.out)?.groups
    if (groups === undefined || Number(groups.total) === 0) {
      printFailedRun(`typecov ${program}`, 'no summary or nothing scanned', run)
      isOk = false
      continue
    }
    print(`typecov ${program}: (${groups.covered} / ${groups.total}) ${groups.pct}%`)
  }
  return isOk
}

const [flag, kind] = process.argv.slice(2)
let ok
if (flag === '--report' && kind === 'knip') ok = reportKnip()
else if (flag === '--report' && kind === 'jscpd') ok = reportJscpd(process.argv.slice(4))
else if (flag === '--report' && kind === 'typecov') ok = reportTypecov()
else if (flag === undefined) {
  const tracked = new Set(git(['ls-files', '-z']).split('\0').filter(Boolean))
  const suppressionsOk = checkSuppressions(tracked)
  ok = (await checkPending(tracked)) && suppressionsOk
} else {
  print('usage: node scripts/strictness-status.mjs [--report knip|jscpd|typecov]')
  ok = false
}
process.exitCode = ok ? 0 : 1
