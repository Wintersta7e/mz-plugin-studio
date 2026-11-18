// Reports what the strict configuration still holds back, from the repository root: the frozen
// lint findings in eslint-suppressions.json against the base commit's (baseCommit), and the
// type-check errors each pending flag still has. Fails a rise in any (file, rule) entry unless the
// change under test changes the lint config or a lint package version; fails a file's pending
// count off the exact ceiling pending-ceilings.json holds for it (printing the errors of a file
// above it and the tsc command), a pending flag without a ceiling or a ceiling without a pending
// flag, a pending flag with no error left (it must move to its program), and a pending check whose
// tsc did not finish (printing how it ended and its last lines).
import { execFileSync, spawn, spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'

const SUPPRESSIONS = 'eslint-suppressions.json'
const LINT_CONFIGS = new Set(['eslint.config.mjs', 'lint-scope.json'])
const PENDING_CEILINGS = 'pending-ceilings.json'
const PENDING_FILE = /^tsconfig\.(?<program>[\w\-]+)\.pending\.json$/v
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

if (process.argv.length > 2) {
  print('usage: node scripts/strictness-status.mjs')
  process.exitCode = 1
} else {
  const tracked = new Set(git(['ls-files', '-z']).split('\0').filter(Boolean))
  const suppressionsOk = checkSuppressions(tracked)
  const isOk = (await checkPending(tracked)) && suppressionsOk
  process.exitCode = isOk ? 0 : 1
}
