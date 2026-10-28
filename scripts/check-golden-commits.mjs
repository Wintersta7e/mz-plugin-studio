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
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const GOLDEN = 'tests/golden/__golden__/'
const USER_VISIBLE = ['templates/', 'generator/', 'raw-mode/', 'mzparams/'].map((d) => GOLDEN + d)
const CASE_HEADER = '+// ==== case:'
const NO_COMMIT = /^0+$/
const MAX_SUBJECT = 72
const CO_AUTHOR_KEY = 'Co-Authored-By'
const CO_AUTHORS = ['Rooty', 'Leafy']
const RULES =
  `commit message rules: a subject of at most ${MAX_SUBJECT} characters; allowed trailer, ` +
  `in any paragraph: ${CO_AUTHORS.map((name) => `${CO_AUTHOR_KEY}: ${name}`).join(' or ')} ` +
  '(exact case)'
// A prose line such as `Goldens: a.js` has a one-word key, so only these count everywhere.
const HYPHENATED_KEY = /^[A-Za-z0-9]+(?:-[A-Za-z0-9]+)+[ \t]*:/
const KEY_LINE = /^([A-Za-z0-9][A-Za-z0-9-]*)[ \t]*:[ \t]*([\s\S]*)$/
// The bot always signs off and writes long subjects; its pull requests would otherwise be red.
// Its author email is settable by anyone, so it never decides alone. In a pull request the
// opener's login decides, which only the hosting service sets. A push or a local run has no such
// signal without the service's API or signing key, so there the skip also needs the service's
// committer email: still settable, it limits the skip to commits forged on purpose.
const BOT_LOGIN = 'dependabot[bot]'
const BOT_EMAIL = '49699333+dependabot[bot]@users.noreply.github.com'
const HOST_COMMITTER_EMAIL = 'noreply@github.com'

/**
 * The commit range a CI event pushed, or why there is none.
 * @param {{ name: string; payload: object; sha: string }} event
 * @returns {{ range: string; openedBy?: string } | { skip: string }}
 */
export function resolveRange({ name, payload, sha }) {
  if (name === 'push') {
    if (String(payload.ref ?? '').startsWith('refs/tags/')) return { skip: 'push (tag ref)' }
    if (!payload.before || NO_COMMIT.test(payload.before)) {
      return { skip: 'push (no previous commit)' }
    }
    return { range: `${payload.before}..${sha}` }
  }
  if (name === 'pull_request') {
    const { base, head, user } = payload.pull_request
    return { range: `${base.sha}..${head.sha}`, openedBy: user?.login ?? '' }
  }
  return { skip: `${name} (no pushed range)` }
}

/**
 * The trailer-shaped lines of a commit body (everything after the subject paragraph).
 * @param {string} body
 * @returns {string[]}
 */
export function trailerLines(body) {
  const paragraphs = body
    .trim()
    .split(/\n[ \t]*\n/)
    .map((paragraph) => paragraph.split('\n').filter((line) => line.trim() !== ''))
  const last = paragraphs.length - 1
  const block = paragraphs[last].every((line) => KEY_LINE.test(line) || /^[ \t]/.test(line))
  return paragraphs.flatMap((lines, i) =>
    lines.filter(
      (line) => HYPHENATED_KEY.test(line) || (block && i === last && KEY_LINE.test(line))
    )
  )
}

/**
 * What breaks the commit-message rules in one commit's subject and body.
 * @param {{ subject: string; body: string }} message
 * @returns {string[]}
 */
export function messageProblems({ subject, body }) {
  const problems = []
  const length = [...subject].length
  if (length > MAX_SUBJECT) problems.push(`subject over ${MAX_SUBJECT} characters (${length})`)
  for (const line of trailerLines(body)) {
    const [, key, value] = KEY_LINE.exec(line)
    if (key !== CO_AUTHOR_KEY) problems.push(`trailer not allowed: ${key}`)
    else if (!CO_AUTHORS.includes(value)) problems.push(`co-author not allowed: ${value}`)
  }
  return problems
}

const print = (line) => process.stdout.write(`${line}\n`)
const git = (args) => execFileSync('git', args, { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 })

/** Each changed path of a commit with its status letter. */
function changedPaths(sha) {
  return git(['diff-tree', '-r', '--root', '--no-renames', '--no-commit-id', '--name-status', sha])
    .split('\n')
    .filter((line) => line !== '')
    .map((line) => {
      const [status, path] = line.split('\t')
      return { status, path }
    })
}

/** Added case headers and deleted lines per golden file of a commit. */
function goldenLines(sha) {
  const out = git(['show', '--format=', '--unified=0', '--no-renames', sha, '--', GOLDEN])
  const files = new Map()
  let path = null
  let inHunk = false
  for (const line of out.split('\n')) {
    if (line.startsWith('diff --git ')) {
      path = null
      inHunk = false
    } else if (!inHunk) {
      if (line.startsWith('--- a/') || line.startsWith('+++ b/')) {
        path = line.slice(6).replace(/\t$/, '')
      } else if (line.startsWith('@@')) {
        inHunk = true
        if (!files.has(path)) files.set(path, { headers: 0, deleted: 0 })
      }
    } else if (line.startsWith(CASE_HEADER)) {
      files.get(path).headers++
    } else if (line.startsWith('-')) {
      files.get(path).deleted++
    }
  }
  return files
}

/**
 * A golden split into the units a case adds: one line per entry of a JSON index, else the text
 * before the first case header and then each case block.
 */
const caseUnits = (path, text) =>
  path.endsWith('.json') ? text.split('\n') : ('\n' + text).split(/\n(?=\/\/ ==== case:)/)

/** True when the commit's version of a golden keeps every earlier unit, in order, and only adds units. */
function onlyAddsCases(sha, path) {
  const [oldHead, ...oldUnits] = caseUnits(path, git(['show', `${sha}^:${path}`]))
  const [newHead, ...newUnits] = caseUnits(path, git(['show', `${sha}:${path}`]))
  if (oldHead !== newHead) return false
  let next = 0
  for (const unit of newUnits) if (unit === oldUnits[next]) next++
  return next === oldUnits.length
}

/** A commit's subject (first paragraph joined, as git shows it), author and committer emails and body. */
function commitMessage(sha) {
  const format = '%s%x00%ae%x00%ce%x00%b'
  const [subject, email, committer, body] = git(['show', '-s', `--format=${format}`, sha]).split(
    '\0'
  )
  return { subject, email, committer, body }
}

/**
 * True for a dependency-update bot commit: in a pull request the bot must have opened it, else
 * the hosting service must have committed it.
 */
const isBotCommit = ({ email, committer }, openedBy) =>
  email === BOT_EMAIL &&
  (openedBy === undefined ? committer === HOST_COMMITTER_EMAIL : openedBy === BOT_LOGIN)

/**
 * Counts every rule over the range; returns the exit code.
 * @param {string} range
 * @param {string} [openedBy] who opened the pull request the range belongs to
 */
function checkRange(range, openedBy) {
  const commits = git(['rev-list', '--no-merges', '--reverse', range])
    .split('\n')
    .filter((sha) => sha !== '')
  if (commits.length === 0) {
    print(`G5: range ${range} has 0 commits`)
    return 1
  }
  const counts = { src: 0, x: 0, y: 0, z: 0, w: 0, subjects: 0, trailers: 0, coAuthors: 0, bots: 0 }
  const failures = []
  const fail = (sha, rule, path) => failures.push(`FAIL ${sha.slice(0, 7)} ${rule}: ${path}`)
  for (const sha of commits) {
    const message = commitMessage(sha)
    if (isBotCommit(message, openedBy)) {
      counts.bots++
    } else {
      for (const problem of messageProblems(message)) {
        if (problem.startsWith('subject')) counts.subjects++
        else if (problem.startsWith('trailer')) counts.trailers++
        else counts.coAuthors++
        fail(sha, 'commit message', problem)
      }
    }
    const paths = changedPaths(sha)
    const touchesSrc = paths.some(({ path }) => path.startsWith('src/'))
    const touchesChangelog = paths.some(({ path }) => path === 'CHANGELOG.md')
    const golden = paths.filter(({ path }) => path.startsWith(GOLDEN))
    const lines = golden.length > 0 ? goldenLines(sha) : new Map()
    if (touchesSrc) counts.src++
    for (const { status, path } of golden) {
      const { headers, deleted } = lines.get(path) ?? { headers: 0, deleted: 0 }
      if (touchesSrc && status === 'A') {
        counts.x++
        fail(sha, 'golden file added in src commit', path)
      }
      if (touchesSrc && status === 'M' && headers > 0) {
        counts.y += headers
        fail(sha, 'case header added in src commit', path)
      }
      const existing = status === 'M' || status === 'D'
      if (
        existing &&
        !touchesChangelog &&
        USER_VISIBLE.some((dir) => path.startsWith(dir)) &&
        !(!touchesSrc && status === 'M' && onlyAddsCases(sha, path))
      ) {
        counts.z++
        fail(sha, 'user-visible golden changed without CHANGELOG', path)
      }
      if (existing && !touchesSrc && deleted > 0) {
        counts.w += deleted
        fail(sha, 'golden lines deleted in test-only commit', path)
      }
    }
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

function main(arg) {
  if (arg === '--github-event') {
    const resolved = resolveRange({
      name: process.env.GITHUB_EVENT_NAME,
      payload: JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8')),
      sha: process.env.GITHUB_SHA
    })
    if ('skip' in resolved) {
      print(`G5 skipped: ${resolved.skip}`)
      return 0
    }
    return checkRange(resolved.range, resolved.openedBy)
  }
  if (arg === undefined || !arg.includes('..')) {
    print('usage: node scripts/check-golden-commits.mjs <base>..<head> | --github-event')
    return 1
  }
  return checkRange(arg)
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  process.exit(main(process.argv[2]))
}
