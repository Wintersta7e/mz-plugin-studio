// The commit-message rules the commit check applies to each pushed commit: a subject of at most
// 72 characters, and no trailer but a co-author line naming an allowed co-author.
import { describe, it, expect } from 'vitest'
import { messageProblems } from '../../scripts/check-golden-commits.mjs'

const subject = (length: number): string => 'x'.repeat(length)
// One code point, two UTF-16 units: the limit counts characters, not units.
const WIDE = '\u{1D465}'
const NONE = { subject: 'fix: short subject', trailers: [] }

const PASSING = [
  { subject: subject(72), trailers: [] },
  { subject: WIDE.repeat(72), trailers: [] },
  NONE,
  { ...NONE, trailers: ['Co-Authored-By: Rooty'] },
  { ...NONE, trailers: ['Co-Authored-By: Leafy'] }
]

const FAILING: [{ subject: string; trailers: string[] }, string][] = [
  [{ subject: subject(73), trailers: [] }, 'subject over 72 characters (73)'],
  [{ subject: WIDE.repeat(73), trailers: [] }, 'subject over 72 characters (73)'],
  [{ ...NONE, trailers: ['Co-authored-by: Rooty'] }, 'trailer not allowed: Co-authored-by'],
  [
    { ...NONE, trailers: ['Signed-off-by: Someone <someone@example.invalid>'] },
    'trailer not allowed: Signed-off-by'
  ],
  [{ ...NONE, trailers: ['Change-Id: I0'] }, 'trailer not allowed: Change-Id'],
  [
    { ...NONE, trailers: ['Co-Authored-By: Someone <someone@example.invalid>'] },
    'co-author not allowed: Someone <someone@example.invalid>'
  ]
]

describe('commit message rules', () => {
  it('passes a subject of at most 72 characters with no trailer or an allowed co-author', () => {
    for (const message of PASSING) expect(messageProblems(message), message.subject).toEqual([])
  })

  it('names each long subject, foreign trailer and unknown co-author', () => {
    for (const [message, problem] of FAILING) expect(messageProblems(message)).toEqual([problem])
    console.log(`commit message cases ${PASSING.length + FAILING.length}`)
    expect(PASSING.length + FAILING.length).toBeGreaterThan(0)
  })
})
