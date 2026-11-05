// Checks the golden-file rules over a range of commits, from the repository root:
//   - a commit that changes src/ adds no golden file and no case to an existing golden;
//   - a commit that changes no src/ file deletes no golden line;
//   - a changed user-visible golden (generated output) comes with a CHANGELOG.md change,
//     unless a commit that changes no src/ file only adds whole cases (or index lines) to it.
// And the commit-message rules over the same range (older history predates them):
//   - a subject is at most 72 characters;
//   - the only trailer is `Co-Authored-By:` (exact case), naming an allowed co-author, read from
//     the whole body: a line with a hyphenated key (`Some-Key: value`) in any paragraph, and every
//     line of a last paragraph made only of `Key: value` lines (the block git reads as trailers);
//   - commits by the dependency-update bot are counted as skipped, not checked.
// Usage: node scripts/check-golden-commits.mjs <base>..<head>
//        node scripts/check-golden-commits.mjs --github-event   (range from the CI event)
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const GOLDEN = 'tests/golden/__golden__/'
const USER_VISIBLE = ['templates/', 'generator/', 'raw-mode/', 'mzparams/'].map((d) => GOLDEN + d)
const CASE_HEADER = '+// ==== case:'
const NO_COMMIT = /^0+$/
const MAX_SUBJECT = 72
const CO_AUTHOR_KEY = 'Co-Authored-By'
const CO_AUTHORS = ['Rooty', 'Leafy']
const ALLOWED_TRAILERS = CO_AUTHORS.map((name) => `${CO_AUTHOR_KEY}: ${name}`).join(' or ')
const RULES =
  `commit message rules: a subject of at most ${MAX_SUBJECT} characters; allowed trailer, ` +
  `in any paragraph: ${ALLOWED_TRAILERS} ` +
  '(exact case)'
// A prose line such as `Goldens: a.js` has a one-word key, so only these count everywhere.
const HYPHENATED_KEY = /^[A-Z0-9]+(?:-[A-Z0-9]+)+[ \t]*:/i
const KEY_LINE = /^([A-Z0-9][A-Z0-9-]*)[ \t]*:[ \t]*((?:[^ \t][\s\S]*)?)$/i
// The bot always signs off and writes long subjects; its pull requests would otherwise be red.
// Its author email is settable by anyone, so it never decides alone. In a pull request the
// opener's login decides, which only the hosting service sets. A push or a local run has no such
// signal without the service's API or signing key, so there the skip also needs the service's
// committer email: still settable, it limits the skip to commits forged on purpose.
const BOT_LOGIN = 'dependabot[bot]'
const BOT_EMAIL = '49699333+dependabot[bot]@users.noreply.github.com'
const HOST_COMMITTER_EMAIL = 'noreply@github.com'

/**
A property of a value parsed from JSON, read the way `value.key` reads it: undefined and null
throw, and a key no object holds is undefined.
@param {unknown} value
@param {string} key
@returns {unknown}
*/
function field(value, key) {
  if (value === undefined || value === null) {
    throw new TypeError(`Cannot read properties of ${String(value)} (reading '${key}')`)
  }
  return typeof value === 'object' ? Reflect.get(value, key) : undefined
}

/**
The commit range a CI event pushed, or why there is none.
@param {{ name: string | undefined; payload: unknown; sha: string | undefined }} event
@returns {{ range: string; openedBy?: string } | { skip: string }}
*/
export function resolveRange({ name, payload, sha }) {
  if (name === 'push') {
    if (String(field(payload, 'ref') ?? '').startsWith('refs/tags/')) {
      return { skip: 'push (tag ref)' }
    }
    const before = field(payload, 'before')
    return !before || NO_COMMIT.test(String(before))
      ? { skip: 'push (no previous commit)' }
      : { range: `${String(before)}..${String(sha)}` }
  }
  if (name === 'pull_request') {
    const pullRequest = field(payload, 'pull_request')
    const base = field(field(pullRequest, 'base'), 'sha')
    const head = field(field(pullRequest, 'head'), 'sha')
    const user = field(pullRequest, 'user')
    const login = user === undefined || user === null ? undefined : field(user, 'login')
    return { range: `${String(base)}..${String(head)}`, openedBy: String(login ?? '') }
  }
  return { skip: `${String(name)} (no pushed range)` }
}

/**
The trailer-shaped lines of a commit body (everything after the subject paragraph).
@param {string} body
@returns {string[]}
*/
export function trailerLines(body) {
  const paragraphs = body
    .trim()
    .split(/\n[ \t]*\n/)
    .map((paragraph) => paragraph.split('\n').filter((line) => line.trim() !== ''))
  const last = paragraphs.length - 1
  const block = (paragraphs.at(-1) ?? []).every(
    (line) => KEY_LINE.test(line) || /^[ \t]/.test(line)
  )
  return paragraphs.flatMap((lines, index) =>
    lines.filter(
      (line) => HYPHENATED_KEY.test(line) || (block && index === last && KEY_LINE.test(line))
    )
  )
}

/**
What breaks the commit-message rules in one commit's subject and body.
@param {{ subject: string; body: string }} message
@returns {string[]}
*/
export function messageProblems({ subject, body }) {
  /**
  @type {string[]}
  */
  const problems = []
  const length = [...subject].length
  if (length > MAX_SUBJECT) problems.push(`subject over ${MAX_SUBJECT} characters (${length})`)
  for (const line of trailerLines(body)) {
    const [, key, value = ''] = KEY_LINE.exec(line) ?? []
    if (key !== CO_AUTHOR_KEY) problems.push(`trailer not allowed: ${key}`)
    else if (!CO_AUTHORS.includes(value)) problems.push(`co-author not allowed: ${value}`)
  }
  return problems
}

/**
@param {string} line
*/
const print = (line) => process.stdout.write(`${line}\n`)
/**
@param {string[]} args
*/
const git = (args) => execFileSync('git', args, { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 })

/**
Each changed path of a commit with its status letter.
@param {string} sha
*/
function changedPaths(sha) {
  return git(['diff-tree', '-r', '--root', '--no-renames', '--no-commit-id', '--name-status', sha])
    .split('\n')
    .filter((line) => line !== '')
    .map((line) => {
      const [status = '', file = ''] = line.split('\t', 2)
      return { status, file }
    })
}

/**
@typedef {{ headers: number, deleted: number }} GoldenLines
*/

/**
Added case headers and deleted lines per golden file of a commit.
@param {string} sha
*/
function goldenLines(sha) {
  const out = git(['show', '--format=', '--unified=0', '--no-renames', sha, '--', GOLDEN])
  /**
  @type {Map<string | undefined, GoldenLines>}
  */
  const files = new Map()
  /**
  @type {string | undefined}
  */
  let file
  // The counts of the file whose hunks the lines are in; undefined outside a hunk.
  /**
  @type {GoldenLines | undefined}
  */
  let hunk
  for (const line of out.split('\n')) {
    if (line.startsWith('diff --git ')) {
      file = undefined
      hunk = undefined
    } else if (hunk === undefined) {
      if (line.startsWith('--- a/') || line.startsWith('+++ b/')) {
        file = line.slice(6).replace(/\t$/, '')
      } else if (line.startsWith('@@')) {
        hunk = files.get(file) ?? { headers: 0, deleted: 0 }
        files.set(file, hunk)
      }
    } else if (line.startsWith(CASE_HEADER)) {
      hunk.headers++
    } else if (line.startsWith('-')) {
      hunk.deleted++
    }
  }
  return files
}

/**
A golden split into the units a case adds: one line per entry of a JSON index, else the text
before the first case header and then each case block.
@param {string} file
@param {string} text
*/
const caseUnits = (file, text) =>
  file.endsWith('.json') ? text.split('\n') : ('\n' + text).split(/\n(?=\/\/ ==== case:)/)

/**
True when the commit's version of a golden keeps every earlier unit, in order, and only adds units.
@param {string} sha
@param {string} file
*/
function onlyAddsCases(sha, file) {
  const [oldHead, ...oldUnits] = caseUnits(file, git(['show', `${sha}^:${file}`]))
  const [newHead, ...newUnits] = caseUnits(file, git(['show', `${sha}:${file}`]))
  if (oldHead !== newHead) return false
  let next = 0
  for (const unit of newUnits) if (unit === oldUnits[next]) next++
  return next === oldUnits.length
}

/**
A commit's subject (first paragraph joined, as git shows it), author and committer emails and body.
@param {string} sha
*/
function commitMessage(sha) {
  const format = '%s%x00%ae%x00%ce%x00%b'
  const [subject = '', email = '', committer = '', body = ''] = git([
    'show',
    '-s',
    `--format=${format}`,
    sha
  ]).split('\0', 4)
  return { subject, email, committer, body }
}

/**
True for a dependency-update bot commit: in a pull request the bot must have opened it, else
the hosting service must have committed it.
@param {{ email: string, committer: string }} message
@param {string | undefined} openedBy
*/
const isBotCommit = ({ email, committer }, openedBy) =>
  email === BOT_EMAIL &&
  (openedBy === undefined ? committer === HOST_COMMITTER_EMAIL : openedBy === BOT_LOGIN)

/**
@typedef {{ src: number, x: number, y: number, z: number, w: number, subjects: number, trailers: number, coAuthors: number, bots: number }} RuleCounts
@typedef {(sha: string, rule: string, file: string) => void} Fail
@typedef {{ sha: string, touchesSource: boolean, touchesChangelog: boolean, counts: RuleCounts, fail: Fail }} CommitScope
@typedef {{ status: string, file: string }} Change
*/

/**
The commit-message rules on one commit, unless the dependency-update bot made it.
@param {string} sha
@param {string | undefined} openedBy
@param {RuleCounts} counts
@param {Fail} fail
*/
function checkMessage(sha, openedBy, counts, fail) {
  const message = commitMessage(sha)
  if (isBotCommit(message, openedBy)) {
    counts.bots++
    return
  }
  for (const problem of messageProblems(message)) {
    if (problem.startsWith('subject')) counts.subjects++
    else if (problem.startsWith('trailer')) counts.trailers++
    else counts.coAuthors++
    fail(sha, 'commit message', problem)
  }
}

/**
The rules on a golden a commit that changes src/ touches: it adds no file and no case header.
@param {CommitScope} scope
@param {Change} change
@param {number} headers
*/
function checkSourceGolden({ sha, touchesSource, counts, fail }, { status, file }, headers) {
  if (!touchesSource) return
  if (status === 'A') {
    counts.x++
    fail(sha, 'golden file added in src commit', file)
  }
  if (status !== 'M' || headers <= 0) return
  counts.y += headers
  fail(sha, 'case header added in src commit', file)
}

/**
The rules on a changed or deleted golden: a user-visible one comes with a CHANGELOG change unless
a commit that changes no src/ file only adds cases to it, and such a commit deletes no line.
@param {CommitScope} scope
@param {Change} change
@param {number} deleted
*/
function checkExistingGolden(scope, { status, file }, deleted) {
  const { sha, touchesSource, touchesChangelog, counts, fail } = scope
  if (status !== 'M' && status !== 'D') return
  if (
    !touchesChangelog &&
    USER_VISIBLE.some((directory) => file.startsWith(directory)) &&
    !(!touchesSource && status === 'M' && onlyAddsCases(sha, file))
  ) {
    counts.z++
    fail(sha, 'user-visible golden changed without CHANGELOG', file)
  }
  if (touchesSource || deleted <= 0) return
  counts.w += deleted
  fail(sha, 'golden lines deleted in test-only commit', file)
}

/**
The golden-file rules on one commit.
@param {string} sha
@param {RuleCounts} counts
@param {Fail} fail
*/
function checkGoldens(sha, counts, fail) {
  const changes = changedPaths(sha)
  const touchesSource = changes.some(({ file }) => file.startsWith('src/'))
  const touchesChangelog = changes.some(({ file }) => file === 'CHANGELOG.md')
  const golden = changes.filter(({ file }) => file.startsWith(GOLDEN))
  /**
  @type {Map<string | undefined, GoldenLines>}
  */
  const lines = golden.length > 0 ? goldenLines(sha) : new Map()
  if (touchesSource) counts.src++
  const scope = { sha, touchesSource, touchesChangelog, counts, fail }
  for (const change of golden) {
    const { headers, deleted } = lines.get(change.file) ?? { headers: 0, deleted: 0 }
    checkSourceGolden(scope, change, headers)
    checkExistingGolden(scope, change, deleted)
  }
}

/**
Counts every rule over the range; returns the exit code.
@param {string} range
@param {string} [openedBy] who opened the pull request the range belongs to
*/
function checkRange(range, openedBy) {
  const commits = git(['rev-list', '--no-merges', '--reverse', range])
    .split('\n')
    .filter((sha) => sha !== '')
  if (commits.length === 0) {
    print(`G5: range ${range} has 0 commits`)
    return 1
  }
  /**
  @type {RuleCounts}
  */
  const counts = { src: 0, x: 0, y: 0, z: 0, w: 0, subjects: 0, trailers: 0, coAuthors: 0, bots: 0 }
  /**
  @type {string[]}
  */
  const failures = []
  /**
  @type {Fail}
  */
  const fail = (sha, rule, file) => {
    failures.push(`FAIL ${sha.slice(0, 7)} ${rule}: ${file}`)
  }
  for (const sha of commits) {
    checkMessage(sha, openedBy, counts, fail)
    checkGoldens(sha, counts, fail)
  }
  print(
    `commits ${commits.length}; src commits ${counts.src}; ` +
      `golden files added in src commits ${counts.x}; case headers added in src commits ${counts.y}; ` +
      `user-visible golden changes without CHANGELOG ${counts.z}; ` +
      `golden lines deleted in test-only commits ${counts.w}; ` +
      `subjects over ${MAX_SUBJECT} ${counts.subjects}; trailers not allowed ${counts.trailers}; ` +
      `co-authors not allowed ${counts.coAuthors}; bot commits skipped ${counts.bots}`
  )
  for (const line of failures) print(line)
  const messages = counts.subjects + counts.trailers + counts.coAuthors
  if (messages > 0) print(RULES)
  const golden = counts.x + counts.y + counts.z + counts.w
  return golden + messages > 0 ? 1 : 0
}

/**
The range the CI event names, checked; the exit code.
*/
function checkEvent() {
  const eventPath = process.env['GITHUB_EVENT_PATH']
  if (eventPath === undefined) throw new TypeError('GITHUB_EVENT_PATH is not set')
  /**
  @type {unknown}
  */
  const payload = JSON.parse(readFileSync(eventPath, 'utf8'))
  const resolved = resolveRange({
    name: process.env['GITHUB_EVENT_NAME'],
    payload,
    sha: process.env['GITHUB_SHA']
  })
  if ('skip' in resolved) {
    print(`G5 skipped: ${resolved.skip}`)
    return 0
  }
  return checkRange(resolved.range, resolved.openedBy)
}

/**
@param {string | undefined} arg
*/
function main(arg) {
  if (arg === '--github-event') return checkEvent()
  if (arg === undefined || !arg.includes('..')) {
    print('usage: node scripts/check-golden-commits.mjs <base>..<head> | --github-event')
    return 1
  }
  return checkRange(arg)
}

// Runs the check the command line names and sets the exit code.
function runCommandLine() {
  process.exitCode = main(process.argv[2])
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  runCommandLine()
}
