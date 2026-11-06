// The golden commit check run against throwaway repositories: a clean range passes, and each
// rule fails on the commit that breaks it.
import { describe, it, expect, afterEach } from 'vitest'
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

const SCRIPT = path.resolve(process.cwd(), 'scripts/check-golden-commits.mjs')
const GOLDEN = 'tests/golden/__golden__'
// No user or system git configuration reaches the throwaway repositories.
const ENV = { ...process.env, GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_NOSYSTEM: '1' }
const IDENTITY = ['-c', 'user.name=Test', '-c', 'user.email=test@example.invalid']

const repos: string[] = []

interface Run {
  status: number | null
  lines: string[]
}

function makeRepository(): { directory: string; base: string } {
  const directory = mkdtempSync(path.join(tmpdir(), 'golden-commits-'))
  repos.push(directory)
  git(directory, 'init', '-q', '-b', 'main')
  write(directory, 'README.md', 'Fixture\n')
  return { directory, base: commit(directory, 'base') }
}

function git(directory: string, ...args: string[]): string {
  return execFileSync('git', args, { cwd: directory, env: ENV, encoding: 'utf8' }).trim()
}

function write(repository: string, file: string, text: string): void {
  mkdirSync(path.dirname(path.join(repository, file)), { recursive: true })
  writeFileSync(path.join(repository, file), text)
}

/**
Stages everything and commits; returns the full SHA.
*/
function commit(directory: string, message: string): string {
  git(directory, 'add', '-A')
  git(directory, ...IDENTITY, 'commit', '-q', '-m', message)
  return git(directory, 'rev-parse', 'HEAD')
}

function check(directory: string, args: string[], environment: Record<string, string> = {}): Run {
  const result = spawnSync(process.execPath, [SCRIPT, ...args], {
    cwd: directory,
    env: { ...ENV, ...environment },
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
  { subjects = 0, trailers = 0, bots = 0 } = {}
): string =>
  `commits ${String(n)}; src commits ${String(s)}; golden files added in src commits ${String(x)}; ` +
  `case headers added in src commits ${String(y)}; ` +
  `user-visible golden changes without CHANGELOG ${String(z)}; ` +
  `golden lines deleted in test-only commits ${String(w)}; subjects over 72 ${String(subjects)}; ` +
  `trailers not allowed ${String(trailers)}; co-authors not allowed 0; ` +
  `bot commits skipped ${String(bots)}`

const short = (sha: string): string => sha.slice(0, 7)

const RULES =
  'commit message rules: a subject of at most 72 characters; allowed trailer, in any paragraph: ' +
  'Co-Authored-By: Rooty or Co-Authored-By: Leafy (exact case)'
// The committer the hosting service writes on the bot's commits.
const HOST_IDENTITY = ['-c', 'user.name=GitHub', '-c', 'user.email=noreply@github.com']

/**
A dependency-update bot commit with a long subject and a sign-off; returns the full SHA.
*/
function botCommit(directory: string, committer: string[]): string {
  write(directory, 'notes.txt', 'a\n')
  git(directory, 'add', '-A')
  git(
    directory,
    ...committer,
    'commit',
    '-q',
    '--author=dependabot[bot] <49699333+dependabot[bot]@users.noreply.github.com>',
    '-m',
    `chore(deps): ${'x'.repeat(70)}\n\nSigned-off-by: dependabot[bot] <support@example.invalid>`
  )
  return git(directory, 'rev-parse', 'HEAD')
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

function removeRepositories(): void {
  for (const directory of repos.splice(0)) rmSync(directory, { recursive: true, force: true })
}

describe('golden commit check: golden files in src commits', () => {
  afterEach(removeRepositories)

  it('passes a test-only commit adding a golden and a src commit without golden changes', () => {
    const { directory, base } = makeRepository()
    write(directory, `${GOLDEN}/templates/a.js`, '// ==== case: base\nlet a\n')
    commit(directory, 'test: add a golden')
    write(directory, 'src/a.ts', 'export const a = 1\n')
    commit(directory, 'feat: change src')

    expect(check(directory, [`${base}..HEAD`])).toStrictEqual({
      status: 0,
      lines: [counts(2, 1, 0, 0, 0, 0)]
    })
  })

  it('fails a src commit that adds a golden file', () => {
    const { directory, base } = makeRepository()
    write(directory, 'src/a.ts', 'export const a = 1\n')
    write(directory, `${GOLDEN}/templates/b.js`, '// ==== case: base\nlet b\n')
    const sha = commit(directory, 'feat: change src with a new golden')

    expect(check(directory, [`${base}..HEAD`])).toStrictEqual({
      status: 1,
      lines: [
        counts(1, 1, 1, 0, 0, 0),
        `FAIL ${short(sha)} golden file added in src commit: ${GOLDEN}/templates/b.js`
      ]
    })
  })

  it('fails a src commit that adds a case header to an existing golden', () => {
    const { directory, base } = makeRepository()
    write(directory, `${GOLDEN}/templates/a.js`, '// ==== case: base\nlet a\n')
    commit(directory, 'test: add a golden')
    write(directory, 'src/a.ts', 'export const a = 1\n')
    write(directory, 'CHANGELOG.md', '- Changed a\n')
    write(
      directory,
      `${GOLDEN}/templates/a.js`,
      '// ==== case: base\nlet a\n// ==== case: more\nlet b\n'
    )
    const sha = commit(directory, 'feat: change src and add a case')

    expect(check(directory, [`${base}..HEAD`])).toStrictEqual({
      status: 1,
      lines: [
        counts(2, 1, 0, 1, 0, 0),
        `FAIL ${short(sha)} case header added in src commit: ${GOLDEN}/templates/a.js`
      ]
    })
  })
})

describe('golden commit check: case headers in src commits', () => {
  afterEach(removeRepositories)

  it('passes a src commit whose case headers only lose fields', () => {
    const repository = makeRepository()
    const golden = `${GOLDEN}/templates/a.js`
    write(
      repository.directory,
      golden,
      '// ==== case: odd: two words {"a":1,"b":[2],"c":" {"}\nlet a\n\n' +
        '// ==== case: base {"a":1,"b":[2],"d":null}\nlet b\n'
    )
    commit(repository.directory, 'test: add a golden')
    write(repository.directory, 'src/a.ts', 'export const a = 1\n')
    write(repository.directory, 'CHANGELOG.md', '- Dropped a field\n')
    write(
      repository.directory,
      golden,
      '// ==== case: odd: two words {"a":1,"c":" {"}\nlet a\n\n// ==== case: base {"a":1}\nlet b\n'
    )
    commit(repository.directory, 'feat: drop a field')

    expect(check(repository.directory, [`${repository.base}..HEAD`])).toStrictEqual({
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
    const repository = makeRepository()
    const golden = `${GOLDEN}/templates/a.js`
    write(repository.directory, golden, `// ==== case: ${before}\nlet a\n`)
    commit(repository.directory, 'test: add a golden')
    write(repository.directory, 'src/a.ts', 'export const a = 1\n')
    write(repository.directory, 'CHANGELOG.md', '- Changed a case\n')
    write(repository.directory, golden, `// ==== case: ${after}\nlet a\n`)
    const sha = commit(repository.directory, 'feat: change a case header')

    expect(check(repository.directory, [`${repository.base}..HEAD`])).toStrictEqual({
      status: 1,
      lines: [
        counts(2, 1, 0, 1, 0, 0),
        `FAIL ${short(sha)} case header added in src commit: ${golden}`
      ]
    })
  })
})

describe('golden commit check: test-only and user-visible goldens', () => {
  afterEach(removeRepositories)

  it('fails a test-only commit that deletes a golden line', () => {
    const { directory, base } = makeRepository()
    write(directory, `${GOLDEN}/parser/p.json`, '{\n  "a": 1\n}\n')
    commit(directory, 'test: add a golden')
    write(directory, `${GOLDEN}/parser/p.json`, '{\n}\n')
    const sha = commit(directory, 'test: drop a golden line')

    expect(check(directory, [`${base}..HEAD`])).toStrictEqual({
      status: 1,
      lines: [
        counts(2, 0, 0, 0, 0, 1),
        `FAIL ${short(sha)} golden lines deleted in test-only commit: ${GOLDEN}/parser/p.json`
      ]
    })
  })

  it('fails a user-visible golden change without a CHANGELOG change, and passes it with one', () => {
    const { directory, base } = makeRepository()
    write(directory, `${GOLDEN}/generator/g.js`, 'let a\n')
    commit(directory, 'test: add a golden')
    write(directory, 'src/a.ts', 'export const a = 1\n')
    write(directory, `${GOLDEN}/generator/g.js`, 'let b\n')
    const sha = commit(directory, 'fix: change output')

    expect(check(directory, [`${base}..HEAD`])).toStrictEqual({
      status: 1,
      lines: [
        counts(2, 1, 0, 0, 1, 0),
        `FAIL ${short(sha)} user-visible golden changed without CHANGELOG: ${GOLDEN}/generator/g.js`
      ]
    })

    git(directory, ...IDENTITY, 'reset', '-q', '--soft', 'HEAD^')
    write(directory, 'CHANGELOG.md', '- Changed output\n')
    commit(directory, 'fix: change output with a changelog entry')

    expect(check(directory, [`${base}..HEAD`])).toStrictEqual({
      status: 0,
      lines: [counts(2, 1, 0, 0, 0, 0)]
    })
  })

  it('passes a test-only commit that only adds whole cases to a user-visible golden', () => {
    const { directory, base } = makeRepository()
    write(
      directory,
      `${GOLDEN}/templates/a.js`,
      '// ==== case: one\nlet a\n\n// ==== case: two\nlet b\n'
    )
    commit(directory, 'test: add a golden')
    write(
      directory,
      `${GOLDEN}/templates/a.js`,
      '// ==== case: one\nlet a\n\n// ==== case: new\nlet n\n\n// ==== case: two\nlet b\n\n' +
        '// ==== case: last\nlet z\n'
    )
    commit(directory, 'test: add two cases')

    expect(check(directory, [`${base}..HEAD`])).toStrictEqual({
      status: 0,
      lines: [counts(2, 0, 0, 0, 0, 0)]
    })
  })
})

describe('golden commit check: added cases and index entries', () => {
  afterEach(removeRepositories)

  it('fails a test-only commit that adds a case and changes a line of an existing case', () => {
    const { directory, base } = makeRepository()
    write(directory, `${GOLDEN}/templates/a.js`, '// ==== case: one\nlet a\n')
    commit(directory, 'test: add a golden')
    write(
      directory,
      `${GOLDEN}/templates/a.js`,
      '// ==== case: one\nlet b\n\n// ==== case: two\nlet c\n'
    )
    const sha = commit(directory, 'test: add a case and change another')

    expect(check(directory, [`${base}..HEAD`])).toStrictEqual({
      status: 1,
      lines: [
        counts(2, 0, 0, 0, 1, 1),
        `FAIL ${short(sha)} user-visible golden changed without CHANGELOG: ${GOLDEN}/templates/a.js`,
        `FAIL ${short(sha)} golden lines deleted in test-only commit: ${GOLDEN}/templates/a.js`
      ]
    })
  })

  it('passes a test-only commit that only adds entries to a user-visible index', () => {
    const { directory, base } = makeRepository()
    write(
      directory,
      `${GOLDEN}/raw-mode/_parses.json`,
      '{\n  "a.none": false,\n  "c.none": true\n}\n'
    )
    commit(directory, 'test: add an index')
    write(
      directory,
      `${GOLDEN}/raw-mode/_parses.json`,
      '{\n  "a.none": false,\n  "b.none": true,\n  "c.none": true\n}\n'
    )
    commit(directory, 'test: add an entry')

    expect(check(directory, [`${base}..HEAD`])).toStrictEqual({
      status: 0,
      lines: [counts(2, 0, 0, 0, 0, 0)]
    })
  })

  it('fails a test-only commit that adds an index entry and changes another', () => {
    const { directory, base } = makeRepository()
    write(
      directory,
      `${GOLDEN}/raw-mode/_parses.json`,
      '{\n  "a.none": false,\n  "c.none": true\n}\n'
    )
    commit(directory, 'test: add an index')
    write(
      directory,
      `${GOLDEN}/raw-mode/_parses.json`,
      '{\n  "a.none": true,\n  "b.none": true,\n  "c.none": true\n}\n'
    )
    const sha = commit(directory, 'test: add an entry and change another')

    expect(check(directory, [`${base}..HEAD`])).toStrictEqual({
      status: 1,
      lines: [
        counts(2, 0, 0, 0, 1, 1),
        `FAIL ${short(sha)} user-visible golden changed without CHANGELOG: ${GOLDEN}/raw-mode/_parses.json`,
        `FAIL ${short(sha)} golden lines deleted in test-only commit: ${GOLDEN}/raw-mode/_parses.json`
      ]
    })
  })

  it('passes a parser golden change without a CHANGELOG change', () => {
    const { directory, base } = makeRepository()
    write(directory, `${GOLDEN}/parser/p.json`, '{\n  "a": 1\n}\n')
    commit(directory, 'test: add a golden')
    write(directory, 'src/a.ts', 'export const a = 1\n')
    write(directory, `${GOLDEN}/parser/p.json`, '{\n  "a": 2\n}\n')
    commit(directory, 'fix: change parser output')

    expect(check(directory, [`${base}..HEAD`])).toStrictEqual({
      status: 0,
      lines: [counts(2, 1, 0, 0, 0, 0)]
    })
  })
})

describe('golden commit check: merges and commit messages', () => {
  afterEach(removeRepositories)

  it('does not count a merge commit', () => {
    const { directory, base } = makeRepository()
    git(directory, 'checkout', '-q', '-b', 'side')
    write(directory, `${GOLDEN}/templates/a.js`, '// ==== case: base\nlet a\n')
    commit(directory, 'test: add a golden')
    git(directory, 'checkout', '-q', 'main')
    write(directory, 'src/a.ts', 'export const a = 1\n')
    commit(directory, 'feat: change src')
    git(directory, ...IDENTITY, 'merge', '-q', '--no-ff', '-m', 'merge side', 'side')

    expect(git(directory, 'rev-list', '--count', `${base}..HEAD`)).toBe('3')
    expect(check(directory, [`${base}..HEAD`])).toStrictEqual({
      status: 0,
      lines: [counts(2, 1, 0, 0, 0, 0)]
    })
  })

  it('fails a commit whose subject is over 72 characters', () => {
    const { directory, base } = makeRepository()
    write(directory, 'notes.txt', 'a\n')
    const sha = commit(directory, `docs: ${'x'.repeat(67)}`)

    expect(check(directory, [`${base}..HEAD`])).toStrictEqual({
      status: 1,
      lines: [
        counts(1, 0, 0, 0, 0, 0, { subjects: 1 }),
        `FAIL ${short(sha)} commit message: subject over 72 characters (73)`,
        RULES
      ]
    })
  })

  it('fails a commit that ends in a trailer other than an allowed co-author', () => {
    const { directory, base } = makeRepository()
    write(directory, 'notes.txt', 'a\n')
    const sha = commit(
      directory,
      'docs: add notes\n\nSigned-off-by: Someone <someone@example.invalid>'
    )

    expect(check(directory, [`${base}..HEAD`])).toStrictEqual({
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
    const { directory, base } = makeRepository()
    write(directory, 'notes.txt', 'a\n')
    const sha = commit(directory, `docs: add notes\n\n${body}`)

    expect(check(directory, [`${base}..HEAD`])).toStrictEqual({
      status: 1,
      lines: [
        counts(1, 0, 0, 0, 0, 0, { trailers: 1 }),
        `FAIL ${short(sha)} commit message: trailer not allowed: Claude-Session`,
        RULES
      ]
    })
  })
})

describe('golden commit check: trailer wording', () => {
  afterEach(removeRepositories)

  it('passes prose lines that read like a key and a value', () => {
    const { directory, base } = makeRepository()
    write(directory, 'notes.txt', 'a\n')
    commit(
      directory,
      'docs: add notes\n\nGoldens: a.js, b.js\nWhy: they drifted.\n\nCo-Authored-By: Leafy'
    )
    write(directory, 'notes.txt', 'b\n')
    commit(directory, 'docs: change notes\n\nWhy: the notes drifted, so\nthey are rewritten.')

    expect(check(directory, [`${base}..HEAD`])).toStrictEqual({
      status: 0,
      lines: [counts(2, 0, 0, 0, 0, 0)]
    })
  })

  it('states the allowed trailer when a co-author line has another case', () => {
    const { directory, base } = makeRepository()
    write(directory, 'notes.txt', 'a\n')
    const sha = commit(directory, 'docs: add notes\n\nCo-authored-by: X <x@example.invalid>')

    expect(check(directory, [`${base}..HEAD`])).toStrictEqual({
      status: 1,
      lines: [
        counts(1, 0, 0, 0, 0, 0, { trailers: 1 }),
        `FAIL ${short(sha)} commit message: trailer not allowed: Co-authored-by`,
        RULES
      ]
    })
  })
})

describe('golden commit check: bot commits and ranges', () => {
  afterEach(removeRepositories)

  it('skips the message rules for a bot commit that the hosting service committed', () => {
    const { directory, base } = makeRepository()
    botCommit(directory, HOST_IDENTITY)

    expect(check(directory, [`${base}..HEAD`])).toStrictEqual({
      status: 0,
      lines: [counts(1, 0, 0, 0, 0, 0, { bots: 1 })]
    })
  })

  it('checks a commit that only carries the bot author email', () => {
    const { directory, base } = makeRepository()
    const sha = botCommit(directory, IDENTITY)

    expect(check(directory, [`${base}..HEAD`])).toStrictEqual(botFailure(sha))
  })

  it('skips bot commits in a pull request only when the bot opened it', () => {
    const { directory, base } = makeRepository()
    const sha = botCommit(directory, HOST_IDENTITY)
    const event = path.join(directory, 'event.json')
    const run = (login: string): Run => {
      const pull = { base: { sha: base }, head: { sha }, user: { login } }
      writeFileSync(event, JSON.stringify({ pull_request: pull }))
      return check(directory, ['--github-event'], {
        GITHUB_EVENT_NAME: 'pull_request',
        GITHUB_EVENT_PATH: event,
        GITHUB_SHA: sha
      })
    }

    expect(run('dependabot[bot]')).toStrictEqual({
      status: 0,
      lines: [counts(1, 0, 0, 0, 0, 0, { bots: 1 })]
    })
    expect(run('someone')).toStrictEqual(botFailure(sha))
  })

  it('fails an empty range', () => {
    const { directory } = makeRepository()

    expect(check(directory, ['HEAD..HEAD'])).toStrictEqual({
      status: 1,
      lines: ['G5: range HEAD..HEAD has 0 commits']
    })
  })

  it('skips a tag push read from the CI event', () => {
    const { directory, base } = makeRepository()
    const event = path.join(directory, 'event.json')
    writeFileSync(event, JSON.stringify({ ref: 'refs/tags/v1.6.1', before: base }))
    const run = check(directory, ['--github-event'], {
      GITHUB_EVENT_NAME: 'push',
      GITHUB_EVENT_PATH: event,
      GITHUB_SHA: base
    })

    expect(run).toStrictEqual({ status: 0, lines: ['G5 skipped: push (tag ref)'] })
  })
})
