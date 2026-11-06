// The golden commit check run against throwaway repositories: a clean range passes, and each
// rule fails on the commit that breaks it.
import { describe, it, expect, afterEach } from 'vitest'
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'

const SCRIPT = resolve(process.cwd(), 'scripts/check-golden-commits.mjs')
const GOLDEN = 'tests/golden/__golden__'
// No user or system git configuration reaches the throwaway repositories.
const ENV = { ...process.env, GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_NOSYSTEM: '1' }
const IDENTITY = ['-c', 'user.name=Test', '-c', 'user.email=test@example.invalid']

const repos: string[] = []

interface Run {
  status: number | null
  lines: string[]
}

function makeRepo(): { dir: string; base: string } {
  const dir = mkdtempSync(join(tmpdir(), 'golden-commits-'))
  repos.push(dir)
  git(dir, 'init', '-q', '-b', 'main')
  write(dir, 'README.md', 'Fixture\n')
  return { dir, base: commit(dir, 'base') }
}

function git(dir: string, ...args: string[]): string {
  return execFileSync('git', args, { cwd: dir, env: ENV, encoding: 'utf8' }).trim()
}

function write(dir: string, path: string, text: string): void {
  mkdirSync(dirname(join(dir, path)), { recursive: true })
  writeFileSync(join(dir, path), text)
}

/** Stages everything and commits; returns the full SHA. */
function commit(dir: string, message: string): string {
  git(dir, 'add', '-A')
  git(dir, ...IDENTITY, 'commit', '-q', '-m', message)
  return git(dir, 'rev-parse', 'HEAD')
}

function check(dir: string, args: string[], env: Record<string, string> = {}): Run {
  const result = spawnSync(process.execPath, [SCRIPT, ...args], {
    cwd: dir,
    env: { ...ENV, ...env },
    encoding: 'utf8'
  })
  return { status: result.status, lines: result.stdout.split('\n').filter((l) => l !== '') }
}

const counts = (
  n: number,
  s: number,
  x: number,
  y: number,
  z: number,
  w: number,
  { subjects = 0, trailers = 0, coAuthors = 0, bots = 0 } = {}
): string =>
  `commits ${n}; src commits ${s}; golden files added in src commits ${x}; ` +
  `case headers added in src commits ${y}; user-visible golden changes without CHANGELOG ${z}; ` +
  `golden lines deleted in test-only commits ${w}; subjects over 72 ${subjects}; ` +
  `trailers not allowed ${trailers}; co-authors not allowed ${coAuthors}; ` +
  `bot commits skipped ${bots}`

const short = (sha: string): string => sha.slice(0, 7)

const RULES =
  'commit message rules: a subject of at most 72 characters; allowed trailer, in any paragraph: ' +
  'Co-Authored-By: Rooty or Co-Authored-By: Leafy (exact case)'
// The committer the hosting service writes on the bot's commits.
const HOST_IDENTITY = ['-c', 'user.name=GitHub', '-c', 'user.email=noreply@github.com']

/** A dependency-update bot commit with a long subject and a sign-off; returns the full SHA. */
function botCommit(dir: string, committer: string[]): string {
  write(dir, 'notes.txt', 'a\n')
  git(dir, 'add', '-A')
  git(
    dir,
    ...committer,
    'commit',
    '-q',
    '--author=dependabot[bot] <49699333+dependabot[bot]@users.noreply.github.com>',
    '-m',
    `chore(deps): ${'x'.repeat(70)}\n\nSigned-off-by: dependabot[bot] <support@example.invalid>`
  )
  return git(dir, 'rev-parse', 'HEAD')
}

const botFailure = (sha: string): Run => ({
  status: 1,
  lines: [
    counts(1, 0, 0, 0, 0, 0, { subjects: 1, trailers: 1 }),
    `FAIL ${short(sha)} commit message: subject over 72 characters (83)`,
    `FAIL ${short(sha)} commit message: trailer not allowed: Signed-off-by`,
    RULES
  ]
})

afterEach(() => {
  for (const dir of repos.splice(0)) rmSync(dir, { recursive: true, force: true })
})

describe('golden commit check', () => {
  it('passes a test-only commit adding a golden and a src commit without golden changes', () => {
    const { dir, base } = makeRepo()
    write(dir, `${GOLDEN}/templates/a.js`, '// ==== case: base\nlet a\n')
    commit(dir, 'test: add a golden')
    write(dir, 'src/a.ts', 'export const a = 1\n')
    commit(dir, 'feat: change src')

    expect(check(dir, [`${base}..HEAD`])).toEqual({ status: 0, lines: [counts(2, 1, 0, 0, 0, 0)] })
  })

  it('fails a src commit that adds a golden file', () => {
    const { dir, base } = makeRepo()
    write(dir, 'src/a.ts', 'export const a = 1\n')
    write(dir, `${GOLDEN}/templates/b.js`, '// ==== case: base\nlet b\n')
    const sha = commit(dir, 'feat: change src with a new golden')

    expect(check(dir, [`${base}..HEAD`])).toEqual({
      status: 1,
      lines: [
        counts(1, 1, 1, 0, 0, 0),
        `FAIL ${short(sha)} golden file added in src commit: ${GOLDEN}/templates/b.js`
      ]
    })
  })

  it('fails a src commit that adds a case header to an existing golden', () => {
    const { dir, base } = makeRepo()
    write(dir, `${GOLDEN}/templates/a.js`, '// ==== case: base\nlet a\n')
    commit(dir, 'test: add a golden')
    write(dir, 'src/a.ts', 'export const a = 1\n')
    write(dir, 'CHANGELOG.md', '- Changed a\n')
    write(dir, `${GOLDEN}/templates/a.js`, '// ==== case: base\nlet a\n// ==== case: more\nlet b\n')
    const sha = commit(dir, 'feat: change src and add a case')

    expect(check(dir, [`${base}..HEAD`])).toEqual({
      status: 1,
      lines: [
        counts(2, 1, 0, 1, 0, 0),
        `FAIL ${short(sha)} case header added in src commit: ${GOLDEN}/templates/a.js`
      ]
    })
  })

  it('passes a src commit whose case headers only lose fields', () => {
    const repository = makeRepo()
    const golden = `${GOLDEN}/templates/a.js`
    write(
      repository.dir,
      golden,
      '// ==== case: odd: two words {"a":1,"b":[2],"c":" {"}\nlet a\n\n' +
        '// ==== case: base {"a":1,"b":[2],"d":null}\nlet b\n'
    )
    commit(repository.dir, 'test: add a golden')
    write(repository.dir, 'src/a.ts', 'export const a = 1\n')
    write(repository.dir, 'CHANGELOG.md', '- Dropped a field\n')
    write(
      repository.dir,
      golden,
      '// ==== case: odd: two words {"a":1,"c":" {"}\nlet a\n\n// ==== case: base {"a":1}\nlet b\n'
    )
    commit(repository.dir, 'feat: drop a field')

    expect(check(repository.dir, [`${repository.base}..HEAD`])).toStrictEqual({
      status: 0,
      lines: [counts(2, 1, 0, 0, 0, 0)]
    })
  })

  const HEADER_CHANGES: [title: string, before: string, after: string][] = [
    ['loses a field and changes another value', 'one {"a":1,"b":2}', 'one {"a":3}'],
    ['gains a field', 'one {"a":1}', 'one {"a":1,"b":2}'],
    ['loses a field under another case name', 'one {"a":1,"b":2}', 'two {"a":1}'],
    ['loses a field of a nested value', 'one {"a":{"x":1,"y":2}}', 'one {"a":{"x":1}}']
  ]

  it.each(HEADER_CHANGES)('fails a src commit whose case header %s', (_, before, after) => {
    const repository = makeRepo()
    const golden = `${GOLDEN}/templates/a.js`
    write(repository.dir, golden, `// ==== case: ${before}\nlet a\n`)
    commit(repository.dir, 'test: add a golden')
    write(repository.dir, 'src/a.ts', 'export const a = 1\n')
    write(repository.dir, 'CHANGELOG.md', '- Changed a case\n')
    write(repository.dir, golden, `// ==== case: ${after}\nlet a\n`)
    const sha = commit(repository.dir, 'feat: change a case header')

    expect(check(repository.dir, [`${repository.base}..HEAD`])).toStrictEqual({
      status: 1,
      lines: [
        counts(2, 1, 0, 1, 0, 0),
        `FAIL ${short(sha)} case header added in src commit: ${golden}`
      ]
    })
  })

  it('fails a test-only commit that deletes a golden line', () => {
    const { dir, base } = makeRepo()
    write(dir, `${GOLDEN}/parser/p.json`, '{\n  "a": 1\n}\n')
    commit(dir, 'test: add a golden')
    write(dir, `${GOLDEN}/parser/p.json`, '{\n}\n')
    const sha = commit(dir, 'test: drop a golden line')

    expect(check(dir, [`${base}..HEAD`])).toEqual({
      status: 1,
      lines: [
        counts(2, 0, 0, 0, 0, 1),
        `FAIL ${short(sha)} golden lines deleted in test-only commit: ${GOLDEN}/parser/p.json`
      ]
    })
  })

  it('fails a user-visible golden change without a CHANGELOG change, and passes it with one', () => {
    const { dir, base } = makeRepo()
    write(dir, `${GOLDEN}/generator/g.js`, 'let a\n')
    commit(dir, 'test: add a golden')
    write(dir, 'src/a.ts', 'export const a = 1\n')
    write(dir, `${GOLDEN}/generator/g.js`, 'let b\n')
    const sha = commit(dir, 'fix: change output')

    expect(check(dir, [`${base}..HEAD`])).toEqual({
      status: 1,
      lines: [
        counts(2, 1, 0, 0, 1, 0),
        `FAIL ${short(sha)} user-visible golden changed without CHANGELOG: ${GOLDEN}/generator/g.js`
      ]
    })

    git(dir, ...IDENTITY, 'reset', '-q', '--soft', 'HEAD^')
    write(dir, 'CHANGELOG.md', '- Changed output\n')
    commit(dir, 'fix: change output with a changelog entry')

    expect(check(dir, [`${base}..HEAD`])).toEqual({ status: 0, lines: [counts(2, 1, 0, 0, 0, 0)] })
  })

  it('passes a test-only commit that only adds whole cases to a user-visible golden', () => {
    const { dir, base } = makeRepo()
    write(dir, `${GOLDEN}/templates/a.js`, '// ==== case: one\nlet a\n\n// ==== case: two\nlet b\n')
    commit(dir, 'test: add a golden')
    write(
      dir,
      `${GOLDEN}/templates/a.js`,
      '// ==== case: one\nlet a\n\n// ==== case: new\nlet n\n\n// ==== case: two\nlet b\n\n' +
        '// ==== case: last\nlet z\n'
    )
    commit(dir, 'test: add two cases')

    expect(check(dir, [`${base}..HEAD`])).toEqual({ status: 0, lines: [counts(2, 0, 0, 0, 0, 0)] })
  })

  it('fails a test-only commit that adds a case and changes a line of an existing case', () => {
    const { dir, base } = makeRepo()
    write(dir, `${GOLDEN}/templates/a.js`, '// ==== case: one\nlet a\n')
    commit(dir, 'test: add a golden')
    write(dir, `${GOLDEN}/templates/a.js`, '// ==== case: one\nlet b\n\n// ==== case: two\nlet c\n')
    const sha = commit(dir, 'test: add a case and change another')

    expect(check(dir, [`${base}..HEAD`])).toEqual({
      status: 1,
      lines: [
        counts(2, 0, 0, 0, 1, 1),
        `FAIL ${short(sha)} user-visible golden changed without CHANGELOG: ${GOLDEN}/templates/a.js`,
        `FAIL ${short(sha)} golden lines deleted in test-only commit: ${GOLDEN}/templates/a.js`
      ]
    })
  })

  it('passes a test-only commit that only adds entries to a user-visible index', () => {
    const { dir, base } = makeRepo()
    write(dir, `${GOLDEN}/raw-mode/_parses.json`, '{\n  "a.none": false,\n  "c.none": true\n}\n')
    commit(dir, 'test: add an index')
    write(
      dir,
      `${GOLDEN}/raw-mode/_parses.json`,
      '{\n  "a.none": false,\n  "b.none": true,\n  "c.none": true\n}\n'
    )
    commit(dir, 'test: add an entry')

    expect(check(dir, [`${base}..HEAD`])).toEqual({ status: 0, lines: [counts(2, 0, 0, 0, 0, 0)] })
  })

  it('fails a test-only commit that adds an index entry and changes another', () => {
    const { dir, base } = makeRepo()
    write(dir, `${GOLDEN}/raw-mode/_parses.json`, '{\n  "a.none": false,\n  "c.none": true\n}\n')
    commit(dir, 'test: add an index')
    write(
      dir,
      `${GOLDEN}/raw-mode/_parses.json`,
      '{\n  "a.none": true,\n  "b.none": true,\n  "c.none": true\n}\n'
    )
    const sha = commit(dir, 'test: add an entry and change another')

    expect(check(dir, [`${base}..HEAD`])).toEqual({
      status: 1,
      lines: [
        counts(2, 0, 0, 0, 1, 1),
        `FAIL ${short(sha)} user-visible golden changed without CHANGELOG: ${GOLDEN}/raw-mode/_parses.json`,
        `FAIL ${short(sha)} golden lines deleted in test-only commit: ${GOLDEN}/raw-mode/_parses.json`
      ]
    })
  })

  it('passes a parser golden change without a CHANGELOG change', () => {
    const { dir, base } = makeRepo()
    write(dir, `${GOLDEN}/parser/p.json`, '{\n  "a": 1\n}\n')
    commit(dir, 'test: add a golden')
    write(dir, 'src/a.ts', 'export const a = 1\n')
    write(dir, `${GOLDEN}/parser/p.json`, '{\n  "a": 2\n}\n')
    commit(dir, 'fix: change parser output')

    expect(check(dir, [`${base}..HEAD`])).toEqual({ status: 0, lines: [counts(2, 1, 0, 0, 0, 0)] })
  })

  it('does not count a merge commit', () => {
    const { dir, base } = makeRepo()
    git(dir, 'checkout', '-q', '-b', 'side')
    write(dir, `${GOLDEN}/templates/a.js`, '// ==== case: base\nlet a\n')
    commit(dir, 'test: add a golden')
    git(dir, 'checkout', '-q', 'main')
    write(dir, 'src/a.ts', 'export const a = 1\n')
    commit(dir, 'feat: change src')
    git(dir, ...IDENTITY, 'merge', '-q', '--no-ff', '-m', 'merge side', 'side')

    expect(git(dir, 'rev-list', '--count', `${base}..HEAD`)).toBe('3')
    expect(check(dir, [`${base}..HEAD`])).toEqual({ status: 0, lines: [counts(2, 1, 0, 0, 0, 0)] })
  })

  it('fails a commit whose subject is over 72 characters', () => {
    const { dir, base } = makeRepo()
    write(dir, 'notes.txt', 'a\n')
    const sha = commit(dir, `docs: ${'x'.repeat(67)}`)

    expect(check(dir, [`${base}..HEAD`])).toEqual({
      status: 1,
      lines: [
        counts(1, 0, 0, 0, 0, 0, { subjects: 1 }),
        `FAIL ${short(sha)} commit message: subject over 72 characters (73)`,
        RULES
      ]
    })
  })

  it('fails a commit that ends in a trailer other than an allowed co-author', () => {
    const { dir, base } = makeRepo()
    write(dir, 'notes.txt', 'a\n')
    const sha = commit(dir, 'docs: add notes\n\nSigned-off-by: Someone <someone@example.invalid>')

    expect(check(dir, [`${base}..HEAD`])).toEqual({
      status: 1,
      lines: [
        counts(1, 0, 0, 0, 0, 0, { trailers: 1 }),
        `FAIL ${short(sha)} commit message: trailer not allowed: Signed-off-by`,
        RULES
      ]
    })
  })

  it.each([
    [
      'in a paragraph that also holds prose',
      'Why, said here.\nClaude-Session: x\nCo-Authored-By: Rooty'
    ],
    ['in an earlier paragraph', 'Why.\n\nClaude-Session: x\n\nCo-Authored-By: Rooty'],
    ['in the final trailer block', 'Why.\n\nCo-Authored-By: Rooty\nClaude-Session: x']
  ])('fails a machine trailer %s', (_, body) => {
    const { dir, base } = makeRepo()
    write(dir, 'notes.txt', 'a\n')
    const sha = commit(dir, `docs: add notes\n\n${body}`)

    expect(check(dir, [`${base}..HEAD`])).toEqual({
      status: 1,
      lines: [
        counts(1, 0, 0, 0, 0, 0, { trailers: 1 }),
        `FAIL ${short(sha)} commit message: trailer not allowed: Claude-Session`,
        RULES
      ]
    })
  })

  it('passes prose lines that read like a key and a value', () => {
    const { dir, base } = makeRepo()
    write(dir, 'notes.txt', 'a\n')
    commit(
      dir,
      'docs: add notes\n\nGoldens: a.js, b.js\nWhy: they drifted.\n\nCo-Authored-By: Leafy'
    )
    write(dir, 'notes.txt', 'b\n')
    commit(dir, 'docs: change notes\n\nWhy: the notes drifted, so\nthey are rewritten.')

    expect(check(dir, [`${base}..HEAD`])).toEqual({ status: 0, lines: [counts(2, 0, 0, 0, 0, 0)] })
  })

  it('states the allowed trailer when a co-author line has another case', () => {
    const { dir, base } = makeRepo()
    write(dir, 'notes.txt', 'a\n')
    const sha = commit(dir, 'docs: add notes\n\nCo-authored-by: X <x@example.invalid>')

    expect(check(dir, [`${base}..HEAD`])).toEqual({
      status: 1,
      lines: [
        counts(1, 0, 0, 0, 0, 0, { trailers: 1 }),
        `FAIL ${short(sha)} commit message: trailer not allowed: Co-authored-by`,
        RULES
      ]
    })
  })

  it('skips the message rules for a bot commit that the hosting service committed', () => {
    const { dir, base } = makeRepo()
    botCommit(dir, HOST_IDENTITY)

    expect(check(dir, [`${base}..HEAD`])).toEqual({
      status: 0,
      lines: [counts(1, 0, 0, 0, 0, 0, { bots: 1 })]
    })
  })

  it('checks a commit that only carries the bot author email', () => {
    const { dir, base } = makeRepo()
    const sha = botCommit(dir, IDENTITY)

    expect(check(dir, [`${base}..HEAD`])).toEqual(botFailure(sha))
  })

  it('skips bot commits in a pull request only when the bot opened it', () => {
    const { dir, base } = makeRepo()
    const sha = botCommit(dir, HOST_IDENTITY)
    const event = join(dir, 'event.json')
    const run = (login: string): Run => {
      const pull = { base: { sha: base }, head: { sha }, user: { login } }
      writeFileSync(event, JSON.stringify({ pull_request: pull }))
      return check(dir, ['--github-event'], {
        GITHUB_EVENT_NAME: 'pull_request',
        GITHUB_EVENT_PATH: event,
        GITHUB_SHA: sha
      })
    }

    expect(run('dependabot[bot]')).toEqual({
      status: 0,
      lines: [counts(1, 0, 0, 0, 0, 0, { bots: 1 })]
    })
    expect(run('someone')).toEqual(botFailure(sha))
  })

  it('fails an empty range', () => {
    const { dir } = makeRepo()

    expect(check(dir, ['HEAD..HEAD'])).toEqual({
      status: 1,
      lines: ['G5: range HEAD..HEAD has 0 commits']
    })
  })

  it('skips a tag push read from the CI event', () => {
    const { dir, base } = makeRepo()
    const event = join(dir, 'event.json')
    writeFileSync(event, JSON.stringify({ ref: 'refs/tags/v1.6.1', before: base }))
    const run = check(dir, ['--github-event'], {
      GITHUB_EVENT_NAME: 'push',
      GITHUB_EVENT_PATH: event,
      GITHUB_SHA: base
    })

    expect(run).toEqual({ status: 0, lines: ['G5 skipped: push (tag ref)'] })
  })
})
