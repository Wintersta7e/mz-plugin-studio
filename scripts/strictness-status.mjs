// Reports what the strict configuration still holds back, from the repository root.
//   default:          the frozen lint findings in eslint-suppressions.json against the parent
//                     commit's, and the type-check errors each pending flag still has. Fails a
//                     rise unless the commit changes the lint config or a lint package version,
//                     and fails a pending flag with no error left (it must move to its program).
//   --report knip:    the dead-code findings by type; exits 0 on findings.
//   --report typecov: the type coverage of each program; exits 0 below 100%.
// The reports fail only when a run printed no summary or scanned nothing.
import { execFileSync, spawn, spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'

const SUPPRESSIONS = 'eslint-suppressions.json'
const LINT_CONFIGS = new Set(['eslint.config.mjs', 'lint-scope.json'])
const PENDING_FILE = /^tsconfig\.(?<program>[\w\-]+)\.pending\.json$/v
const TYPECOV_PROGRAMS = ['node', 'web', 'test', 'tools', 'scripts', 'e2e']
// Each pending check is a full type-check of its program; four at a time bounds memory.
const TSC_JOBS = 4

const print = (line) => process.stdout.write(`${line}\n`)
const git = (args) => execFileSync('git', args, { encoding: 'utf8' })
// A file's text at the parent commit; null when the parent or the file is absent.
const parentFile = (file) => {
  const result = spawnSync('git', ['show', `HEAD^:${file}`], { encoding: 'utf8' })
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

// N violations, E entries and F files of a suppressions file's text; null if unreadable.
function countSuppressions(text) {
  const data = parseJson(text)
  if (typeof data !== 'object' || data === null || Array.isArray(data)) return null
  let violations = 0
  let entries = 0
  for (const rules of Object.values(data)) {
    for (const { count } of Object.values(rules)) {
      violations += count
      entries += 1
    }
  }
  return { violations, entries, files: Object.keys(data) }
}

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

// Whether HEAD changes the lint config or the version of a lint package.
function changesLintSetup() {
  const changed = git(['diff', '--name-only', 'HEAD^', 'HEAD']).split('\n')
  if (changed.some((file) => LINT_CONFIGS.has(file))) return true
  const before = parseJson(parentFile('package.json'))?.devDependencies ?? {}
  const after = parseJson(readFileSync('package.json', 'utf8'))?.devDependencies ?? {}
  return [...lintPackages()].some((name) => before[name] !== after[name])
}

function checkSuppressions(tracked) {
  const now = countSuppressions(
    existsSync(SUPPRESSIONS) ? readFileSync(SUPPRESSIONS, 'utf8') : null
  )
  if (now === null) {
    print(`eslint-suppressions: ${SUPPRESSIONS} missing or unreadable`)
    return false
  }
  const parent = countSuppressions(parentFile(SUPPRESSIONS))
  if (parent === null) {
    print(`eslint-suppressions: the parent commit has no readable ${SUPPRESSIONS}`)
    return false
  }
  const delta = now.violations - parent.violations
  print(
    `eslint-suppressions: ${now.violations} violations in ${now.entries} entries, ${now.files.length} files (parent ${parent.violations}, delta ${delta > 0 ? '+' : ''}${delta})`
  )
  const untracked = now.files.filter((name) => !tracked.has(name))
  for (const file of untracked) print(`eslint-suppressions: entry for an untracked file ${file}`)
  let isOk = untracked.length === 0
  if (delta > 0 && !changesLintSetup()) {
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

// The type-check errors the program has with the flag on; undefined when tsc could not run.
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
    child.on('close', () =>
      resolve(ERROR_ANYWHERE.test(out) ? undefined : (out.match(ERROR_AT) ?? []).length)
    )
  })
}

async function checkPending(tracked) {
  const pairs = pendingPairs(tracked)
  const counts = Array.from({ length: pairs.length })
  let next = 0
  const worker = async () => {
    while (next < pairs.length) {
      const index = next
      next += 1
      counts[index] = await pendingErrors(pairs[index])
    }
  }
  await Promise.all(Array.from({ length: TSC_JOBS }, worker))
  let isOk = true
  for (const [index, { program, flag }] of pairs.entries()) {
    const count = counts[index]
    print(`pending ${program} ${flag}: ${count ?? 'tsc failed,'} errors`)
    if (count === undefined || count === 0) isOk = false
  }
  return isOk
}

// Runs an npm script and returns its output and exit status.
function npmRun(script) {
  const npm = process.env.npm_execpath
  const [command, args] = npm === undefined ? ['npm', []] : [process.execPath, [npm]]
  const result = spawnSync(command, [...args, 'run', '-s', script], { encoding: 'utf8' })
  return { status: result.status, out: `${result.stdout}${result.stderr}` }
}

function reportKnip() {
  const { status, out } = npmRun('knip')
  const types = Array.from(
    out.matchAll(/^(?<type>[A-Z][\w ]+) \((?<count>\d+)\)$/gmv),
    ({ groups }) => ({ type: groups.type, count: Number(groups.count) })
  )
  const hints = types.filter(({ type }) => type === 'Configuration hints')
  const issues = types.filter(({ type }) => type !== 'Configuration hints')
  for (const { type, count } of types) print(`knip ${type.toLowerCase()}: ${count}`)
  const total = issues.reduce((sum, { count }) => sum + count, 0)
  print(`knip issues: ${total}`)
  const isClean = out.includes('Knip found no issues')
  const isEmpty = issues.length === 0 && !isClean
  const isHintOnly = total === 0 && status !== 0
  if (isEmpty || isHintOnly || hints.length > 0) {
    print('knip: config hints or no parsable summary')
    return false
  }
  return true
}

function reportTypecov() {
  let isOk = true
  for (const program of TYPECOV_PROGRAMS) {
    const { out } = npmRun(`typecov:${program}`)
    const groups = /\((?<covered>\d+) \/ (?<total>\d+)\) (?<pct>[\d.]+)%/v.exec(out)?.groups
    if (groups === undefined || Number(groups.total) === 0) {
      print(`typecov ${program}: no summary or nothing scanned`)
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
else if (flag === '--report' && kind === 'typecov') ok = reportTypecov()
else if (flag === undefined) {
  const tracked = new Set(git(['ls-files', '-z']).split('\0').filter(Boolean))
  const suppressionsOk = checkSuppressions(tracked)
  ok = (await checkPending(tracked)) && suppressionsOk
} else {
  print('usage: node scripts/strictness-status.mjs [--report knip|typecov]')
  ok = false
}
process.exitCode = ok ? 0 : 1
