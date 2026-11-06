// The commit-message rules the commit check applies to each pushed commit: a subject of at most
// 72 characters, and no trailer anywhere in the body but a co-author line naming an allowed
// co-author.
import { describe, it, expect } from 'vitest'
import { messageProblems } from '../../scripts/check-golden-commits.mjs'

const subject = (length: number): string => 'x'.repeat(length)
// One code point, two UTF-16 units: the limit counts characters, not units.
const WIDE = '\u{1D465}'
const NONE = { subject: 'fix: short subject', body: '' }

const PASSING = [
  { subject: subject(72), body: '' },
  { subject: WIDE.repeat(72), body: '' },
  NONE,
  { ...NONE, body: 'Co-Authored-By: Rooty\n' },
  { ...NONE, body: 'Why.\n\nCo-Authored-By: Leafy\n' },
  // A one-word key is prose outside the last paragraph, or in a last paragraph that also has prose.
  { ...NONE, body: 'Goldens: a.js\nWhy: drift.\n\nCo-Authored-By: Rooty\n' },
  { ...NONE, body: 'Why: the notes drifted, so\nthey are rewritten.\n' }
]

const FAILING: [{ subject: string; body: string }, string][] = [
  [{ subject: subject(73), body: '' }, 'subject over 72 characters (73)'],
  [{ subject: WIDE.repeat(73), body: '' }, 'subject over 72 characters (73)'],
  [{ ...NONE, body: 'Co-authored-by: Rooty' }, 'trailer not allowed: Co-authored-by'],
  [
    { ...NONE, body: 'Signed-off-by: Someone <someone@example.invalid>' },
    'trailer not allowed: Signed-off-by'
  ],
  [{ ...NONE, body: 'Change-Id: I0' }, 'trailer not allowed: Change-Id'],
  [{ ...NONE, body: 'Why.\n\nFixes: 12' }, 'trailer not allowed: Fixes'],
  [
    { ...NONE, body: 'Why.\nClaude-Session: x\nCo-Authored-By: Rooty' },
    'trailer not allowed: Claude-Session'
  ],
  [
    { ...NONE, body: 'Claude-Session: x\n\nCo-Authored-By: Rooty' },
    'trailer not allowed: Claude-Session'
  ],
  [{ ...NONE, body: 'Why.\n\nClaude-Session : x' }, 'trailer not allowed: Claude-Session'],
  [
    { ...NONE, body: 'Co-Authored-By: Someone <someone@example.invalid>' },
    'co-author not allowed: Someone <someone@example.invalid>'
  ]
]

describe('commit message rules', () => {
  it('passes a subject of at most 72 characters with no trailer or an allowed co-author', () => {
    expect(PASSING.map((message) => [message.body, messageProblems(message)])).toStrictEqual(
      PASSING.map((message) => [message.body, []])
    )
  })

  it('names each long subject, foreign trailer and unknown co-author', () => {
    expect(FAILING.map(([message]) => [message.body, messageProblems(message)])).toStrictEqual(
      FAILING.map(([message, problem]) => [message.body, [problem]])
    )

    process.stdout.write(`commit message cases ${String(PASSING.length + FAILING.length)}\n`)

    expect(PASSING.length + FAILING.length).toBeGreaterThan(0)
  })
})
