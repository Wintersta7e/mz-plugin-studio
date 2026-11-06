// Reports what the strict configuration still holds back, from the repository root.
//   default:          the frozen lint findings in eslint-suppressions.json against the base
//                     commit's (baseCommit), and the type-check errors each pending flag still
//                     has. Fails a rise in any (file, rule) entry unless the change under test
//                     changes the lint config or a lint package version; fails a file's pending
//                     count off the exact ceiling pending-ceilings.json holds for it (printing
//                     the errors of a file above it and the tsc command), a pending flag
//                     without a ceiling or a ceiling without a pending flag, a pending flag
//                     with no error left (it must move to its program), and a pending check
//                     whose tsc did not finish (printing how it ended and its last lines).
//   --report knip:    the dead-code findings by type, of the whole tree (exits 0 on findings) and
//                     of the production code alone (fails unless at its ceiling).
//   --report jscpd:   the copied code's clones and duplicated lines (fails unless both are at the
//                     ceilings given as --clones and --duplicated-lines, or without a report).
//   --report typecov: the type coverage of each program (fails unless each program's count of
//                     identifiers without a type is at the ceiling given as --<program>, or
//                     when a run fails).
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

/**
@param {string} line
*/
const print = (line) => process.stdout.write(`${line}\n`)
/**
@param {string[]} args
*/
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
// A file's text at the base commit; undefined when the base or the file is absent.
/**
@param {string} base
@param {string} file
*/
const baseFile = (base, file) => {
  const result = spawnSync('git', ['show', `${base}:${file}`], { encoding: 'utf8' })
  return result.status === 0 ? result.stdout : undefined
}
// Whether a revision resolves to a commit (`^0` peels a tag and fails on anything else).
/**
@param {string} revision
*/
const isCommit = (revision) =>
  spawnSync('git', ['rev-parse', '--verify', '--quiet', `${revision}^0`]).status === 0
/**
@param {string} commit
@param {string} file
*/
const hasFile = (commit, file) =>
  spawnSync('git', ['cat-file', '-e', `${commit}:${file}`]).status === 0
// Parsed JSON; undefined when the text is absent or not JSON.
/**
@param {string | undefined} text
@returns {unknown}
*/
const parseJson = (text) => {
  /**
  @type {unknown}
  */
  let value
  try {
    value = text === undefined ? text : JSON.parse(text)
  } catch {
    value = undefined
  }
  return value
}
/**
@param {unknown} value
@returns {value is Record<string, unknown>}
*/
const isRecord = (value) => typeof value === 'object' && value !== null && !Array.isArray(value)

/**
@typedef {{ file: string, rule: string, count: number }} SuppressionEntry
*/
// The (file, rule, count) entries of a suppressions file's text; undefined if unreadable.
/**
@param {string | undefined} text
@returns {SuppressionEntry[] | undefined}
*/
function suppressionEntries(text) {
  const data = parseJson(text)
  const entries = isRecord(data)
    ? Object.entries(data).flatMap(([file, rules]) =>
        Object.entries(isRecord(rules) ? rules : {}).map(([rule, entry]) => ({
          file,
          rule,
          count: isRecord(entry) ? entry['count'] : undefined
        }))
      )
    : undefined
  return entries?.every((entry) => hasCount(entry)) ? entries : undefined
}
/**
@param {{ file: string, rule: string, count: unknown }} entry
@returns {entry is SuppressionEntry}
*/
const hasCount = (entry) => typeof entry.count === 'number'
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
  for (const [, specifier = ''] of config.matchAll(
    /^import\s[^'"]*['"](?<specifier>[^'"]+)['"]/gmv
  )) {
    if (specifier.startsWith('.') || specifier.startsWith('node:')) continue
    const parts = specifier.split('/')
    names.add(parts.slice(0, specifier.startsWith('@') ? 2 : 1).join('/'))
  }
  return names
}

// The devDependencies of a package.json text; none when it is absent or holds none.
/**
@param {string | undefined} text
@returns {Record<string, unknown>}
*/
function devDependencies(text) {
  const manifest = parseJson(text)
  const { devDependencies: dependencies } = isRecord(manifest) ? manifest : {}
  return isRecord(dependencies) ? dependencies : {}
}

// Whether the working tree changes the lint config or the version of a lint package since base.
/**
@param {string} base
*/
function changesLintSetup(base) {
  const changed = git(['diff', '--name-only', base]).split('\n')
  if (changed.some((file) => LINT_CONFIGS.has(file))) return true
  const before = devDependencies(baseFile(base, 'package.json'))
  const after = devDependencies(readFileSync('package.json', 'utf8'))
  return [...lintPackages()].some((name) => before[name] !== after[name])
}

/**
@param {Set<string>} tracked
*/
function checkSuppressions(tracked) {
  const now = suppressionEntries(
    existsSync(SUPPRESSIONS) ? readFileSync(SUPPRESSIONS, 'utf8') : undefined
  )
  if (now === undefined) {
    print(`eslint-suppressions: ${SUPPRESSIONS} missing or unreadable`)
    return false
  }
  const base = baseCommit()
  if (base === undefined) {
    print('eslint-suppressions: no base commit; HEAD and origin/main have no merge-base')
    return false
  }
  if (!isCommit(base)) {
    print(`eslint-suppressions: base ${base} is not a commit`)
    return false
  }
  // A base older than the suppressions file froze nothing, so each entry now counts from zero.
  const isAbsent = !hasFile(base, SUPPRESSIONS)
  if (isAbsent) {
    print(`eslint-suppressions: ${base} has no ${SUPPRESSIONS}; its entries count as zero`)
  }
  const parent = isAbsent ? [] : suppressionEntries(baseFile(base, SUPPRESSIONS))
  if (parent === undefined) {
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

/**
@typedef {{ program: string, config: string, flag: string }} PendingPair
*/

// Every (program, config, flag) a tracked pending file holds.
/**
@param {Set<string>} tracked
*/
function pendingPairs(tracked) {
  /**
  @type {PendingPair[]}
  */
  const pairs = []
  const files = [...tracked].toSorted((left, right) => left.localeCompare(right))
  for (const file of files) {
    const program = PENDING_FILE.exec(path.posix.basename(file))?.groups?.['program']
    if (program === undefined) continue
    /**
    @type {unknown}
    */
    const pending = JSON.parse(readFileSync(file, 'utf8'))
    const { extends: base, compilerOptions } = isRecord(pending) ? pending : {}
    if (typeof base !== 'string') throw new TypeError(`${file}: no extends path`)
    const config = path.posix.join(path.posix.dirname(file), base)
    const flags = isRecord(compilerOptions) ? Object.keys(compilerOptions) : []
    for (const flag of flags) pairs.push({ program, config, flag })
  }
  return pairs
}

const TSC = path.join(
  path.dirname(createRequire(import.meta.url).resolve('typescript/package.json')),
  'bin/tsc'
)
const ERROR_AT = /^(?<file>.+?)\(\d+,\d+\): error TS\d+:.*$/gmv
const ERROR_ANYWHERE = /^error TS\d+:/mv
// The tsc arguments of a pending check, after the tsc path.
/**
@param {{ config: string, flag: string }} pair
*/
const pendingArgs = ({ config, flag }) => [
  '--noEmit',
  '-p',
  config,
  '--composite',
  'false',
  '--pretty',
  'false',
  `--${flag}`
]

// The type-check error lines the program has with the flag on, by file, and how the tsc run
// ended. The errors are undefined when tsc did not finish a check: killed, stopped on an error
// without a location, or an exit status that does not match the errors it printed.
/**
@param {{ config: string, flag: string }} pair
@returns {Promise<{ errors: Map<string, string[]> | undefined, run: { out: string, bytes: number, ending: string } }>}
*/
function pendingErrors(pair) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [TSC, ...pendingArgs(pair)], {
      stdio: ['ignore', 'pipe', 'pipe']
    })
    let out = ''
    /**
    @param {Buffer} chunk
    */
    const collect = (chunk) => {
      out += chunk.toString()
    }
    child.stdout.on('data', collect)
    child.stderr.on('data', collect)
    child.on('close', (code, signal) => {
      /**
      @type {Map<string, string[]>}
      */
      const errors = new Map()
      for (const match of out.matchAll(ERROR_AT)) {
        const file = match.groups?.['file'] ?? ''
        errors.set(file, [...(errors.get(file) ?? []), match[0]])
      }
      const isChecked =
        signal === null &&
        !ERROR_ANYWHERE.test(out) &&
        (code === 0 ? errors.size === 0 : code === 2 && errors.size > 0)
      const ending = signal ?? `exit ${code}`
      resolve({
        errors: isChecked ? errors : undefined,
        run: { out, bytes: Buffer.byteLength(out), ending }
      })
    })
  })
}

// A pending flag's ceilings, one positive error count per file; undefined when malformed.
/**
@param {unknown} value
@returns {Map<string, number> | undefined}
*/
function fileCeilings(value) {
  const entries = isRecord(value) ? Object.entries(value) : undefined
  return entries?.every((entry) => isCeiling(entry)) ? new Map(entries) : undefined
}
/**
@param {[string, unknown]} entry
@returns {entry is [string, number]}
*/
const isCeiling = (entry) => {
  const [, count] = entry
  return typeof count === 'number' && Number.isSafeInteger(count) && count > 0
}

// Why a pending flag's errors fail against its ceilings, one line each; empty when every file
// holds its ceiling. Each file's count is held exactly, so a rise fails, an error moved to another
// file fails, and so does a fall: the commit that fixes errors lowers the ceiling with them. A
// rise prints that file's error lines.
/**
@param {Map<string, string[]>} errors
@param {Map<string, number> | undefined} ceilings
*/
function pendingProblems(errors, ceilings) {
  if (errors.size === 0) return ['no error left; move the flag to its program']
  if (ceilings === undefined) return [`${PENDING_CEILINGS} names no ceiling`]
  const files = [...new Set([...errors.keys(), ...ceilings.keys()])].toSorted((left, right) =>
    left.localeCompare(right)
  )
  /**
  @type {string[]}
  */
  const problems = []
  for (const file of files) {
    const lines = errors.get(file) ?? []
    const ceiling = ceilings.get(file) ?? 0
    if (lines.length > ceiling) {
      problems.push(`${file}: ${lines.length} errors, above its ceiling ${ceiling}`, ...lines)
    } else if (lines.length === 0) {
      problems.push(`${file}: no error left; remove its ceiling from ${PENDING_CEILINGS}`)
    } else if (lines.length < ceiling) {
      problems.push(
        `${file}: the count fell; lower its ceiling in ${PENDING_CEILINGS} to ${lines.length}`
      )
    }
  }
  return problems
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

// Whether a pending flag's tsc run finished and its errors hold their ceilings; prints both.
/**
@param {{ program: string, config: string, flag: string }} pair
@param {{ errors: Map<string, string[]> | undefined, run: { out: string, bytes: number, ending: string } }} result
@param {unknown} value the flag's entry in the ceilings file
*/
function checkPendingFlag(pair, { errors, run }, value) {
  const label = `pending ${pair.program} ${pair.flag}`
  if (errors === undefined) {
    printFailedRun(label, 'tsc failed', run)
    return false
  }
  const held = fileCeilings(value)
  let count = 0
  for (const lines of errors.values()) count += lines.length
  let ceiling = 0
  if (held !== undefined) {
    for (const each of held.values()) ceiling += each
  }
  print(`${label}: ${count} errors in ${errors.size} files, ceiling ${held ? ceiling : 'none'}`)
  const problems = pendingProblems(errors, held)
  for (const problem of problems) print(`${label}: ${problem}`)
  if (problems.some((problem) => problem.includes(', above its ceiling '))) {
    print(`${label}: reproduce with npx tsc ${pendingArgs(pair).join(' ')}`)
  }
  return problems.length === 0
}

/**
@param {Set<string>} tracked
*/
async function checkPending(tracked) {
  const pairs = pendingPairs(tracked)
  /**
  @type {{ pair: PendingPair, result: Awaited<ReturnType<typeof pendingErrors>> }[]}
  */
  const checked = []
  // The workers take the pairs in order from one iterator, each starting the next as one ends.
  const queue = pairs.entries()
  const worker = async () => {
    for (const [index, pair] of queue) checked[index] = { pair, result: await pendingErrors(pair) }
  }
  await Promise.all(Array.from({ length: TSC_JOBS }, worker))
  const ceilings = existsSync(PENDING_CEILINGS)
    ? parseJson(readFileSync(PENDING_CEILINGS, 'utf8'))
    : undefined
  if (!isRecord(ceilings)) {
    print(`pending: ${PENDING_CEILINGS} missing or unreadable`)
    return false
  }
  let isOk = true
  for (const { pair, result } of checked) {
    const flags = ceilings[pair.program]
    if (!checkPendingFlag(pair, result, isRecord(flags) ? flags[pair.flag] : undefined)) {
      isOk = false
    }
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
  const npm = process.env['npm_execpath']
  const [command, args] = npm === undefined ? ['npm', []] : [process.execPath, [npm]]
  const tail = extra.length === 0 ? [] : ['--', ...extra]
  const directory = mkdtempSync(path.join(tmpdir(), 'strictness-run-'))
  const files = [path.join(directory, 'stdout'), path.join(directory, 'stderr')]
  try {
    const fds = files.map((file) => openSync(file, 'w'))
    /**
    @type {import('node:child_process').SpawnSyncReturns<Buffer>}
    */
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
    ([, type = '', count = '']) => ({ type, count: Number(count) })
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

// The text of a package.json script; empty when package.json is not JSON or has no such script.
/**
@param {string} name
*/
function packageScript(name) {
  const manifest = parseJson(readFileSync('package.json', 'utf8'))
  const { scripts } = isRecord(manifest) ? manifest : {}
  const script = isRecord(scripts) ? scripts[name] : undefined
  return typeof script === 'string' ? script : ''
}

// The production run holds its ceiling in its own `--max-issues`, above which knip fails. A
// count below it fails here too, so the ceiling only moves down with the findings it counts.
const KNIP_PRODUCTION = 'knip:production'
const KNIP_CEILING = /--max-issues (?<ceiling>\d+)/v
const KNIP_SCANNED = /^knip scanned: files (?<files>\d+)/mv
function reportKnipProduction() {
  const { isOk, total, out } = reportKnipRun(KNIP_PRODUCTION, 'knip production')
  if (!isOk) return false
  const [, ceiling] = KNIP_CEILING.exec(packageScript(KNIP_PRODUCTION)) ?? []
  const [, scanned = '0'] = KNIP_SCANNED.exec(out) ?? []
  const files = Number(scanned)
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
*/

// The totals of a jscpd JSON report; undefined when it holds none.
/**
@param {unknown} report
@returns {JscpdTotal | undefined}
*/
function jscpdTotal(report) {
  const { statistics } = isRecord(report) ? report : {}
  const { total } = isRecord(statistics) ? statistics : {}
  const { sources, clones, duplicatedLines, percentage } = isRecord(total) ? total : {}
  return typeof sources === 'number' &&
    typeof clones === 'number' &&
    typeof duplicatedLines === 'number' &&
    typeof percentage === 'number'
    ? { sources, clones, duplicatedLines, percentage }
    : undefined
}

/**
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
    const total = jscpdTotal(
      existsSync(report) ? parseJson(readFileSync(report, 'utf8')) : undefined
    )
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

// Each program's count of identifiers without a type is held exactly at the ceiling the
// `typecov:report` script names as `--<program>`: a rise fails, and so does a fall, so a ceiling
// only moves down with the identifiers it counts. A percentage would move with every typed line.
/**
@param {string} program
@param {string | undefined} ceiling
@param {number} uncovered
*/
function typecovProblem(program, ceiling, uncovered) {
  if (ceiling === undefined) return `the typecov:report script names no --${program} ceiling`
  if (uncovered > Number(ceiling)) return `the uncovered count rose above the ceiling ${ceiling}`
  if (uncovered < Number(ceiling))
    return `the uncovered count fell; lower --${program} to ${uncovered}`
  return ''
}
/**
@param {string[]} args
*/
function reportTypecov(args) {
  const { values } = parseArgs({
    args,
    options: Object.fromEntries(TYPECOV_PROGRAMS.map((program) => [program, { type: 'string' }]))
  })
  let isOk = true
  for (const program of TYPECOV_PROGRAMS) {
    const label = `typecov ${program}`
    const run = npmRun(`typecov:${program}`)
    const groups = /\((?<covered>\d+) \/ (?<total>\d+)\) (?<pct>[\d.]+)%/v.exec(run.out)?.groups
    if (groups === undefined || Number(groups['total']) === 0) {
      printFailedRun(label, 'no summary or nothing scanned', run)
      isOk = false
      continue
    }
    const { covered, total, pct } = groups
    const uncovered = Number(total) - Number(covered)
    const ceiling = values[program]
    print(
      `${label}: (${covered} / ${total}) ${pct}%, uncovered ${uncovered}, ` +
        `ceiling ${ceiling ?? 'none'}`
    )
    const problem = typecovProblem(program, ceiling, uncovered)
    if (problem === '' && run.status === 0) continue
    if (problem === '') printFailedRun(label, 'the run failed', run)
    else print(`${label}: ${problem}`)
    isOk = false
  }
  return isOk
}

const [flag, kind] = process.argv.slice(2)
/**
@type {boolean}
*/
let isOk
if (flag === '--report' && kind === 'knip') isOk = reportKnip()
else if (flag === '--report' && kind === 'jscpd') isOk = reportJscpd(process.argv.slice(4))
else if (flag === '--report' && kind === 'typecov') isOk = reportTypecov(process.argv.slice(4))
else if (flag === undefined) {
  const tracked = new Set(git(['ls-files', '-z']).split('\0').filter(Boolean))
  const suppressionsOk = checkSuppressions(tracked)
  isOk = (await checkPending(tracked)) && suppressionsOk
} else {
  print('usage: node scripts/strictness-status.mjs [--report knip|jscpd|typecov]')
  isOk = false
}
process.exitCode = isOk ? 0 : 1
