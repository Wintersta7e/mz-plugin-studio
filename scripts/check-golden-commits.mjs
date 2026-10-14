// Checks the golden-file rules over a range of commits, from the repository root:
//   - a commit that changes src/ adds no golden file and no case to an existing golden;
//   - a commit that changes no src/ file deletes no golden line;
//   - a changed user-visible golden (generated output) comes with a CHANGELOG.md change.
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

/**
 * The commit range a CI event pushed, or why there is none.
 * @param {{ name: string; payload: object; sha: string }} event
 * @returns {{ range: string } | { skip: string }}
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
    return { range: `${payload.pull_request.base.sha}..${payload.pull_request.head.sha}` }
  }
  return { skip: `${name} (no pushed range)` }
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

/** Counts every rule over the range; returns the exit code. */
function checkRange(range) {
  const commits = git(['rev-list', '--no-merges', '--reverse', range])
    .split('\n')
    .filter((sha) => sha !== '')
  if (commits.length === 0) {
    print(`G5: range ${range} has 0 commits`)
    return 1
  }
  const counts = { src: 0, x: 0, y: 0, z: 0, w: 0 }
  const failures = []
  const fail = (sha, rule, path) => failures.push(`FAIL ${sha.slice(0, 7)} ${rule}: ${path}`)
  for (const sha of commits) {
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
      if (existing && !touchesChangelog && USER_VISIBLE.some((dir) => path.startsWith(dir))) {
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
      `golden lines deleted in test-only commits ${counts.w}`
  )
  for (const line of failures) print(line)
  return counts.x + counts.y + counts.z + counts.w > 0 ? 1 : 0
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
    return checkRange(resolved.range)
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
