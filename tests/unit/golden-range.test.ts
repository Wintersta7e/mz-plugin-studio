// Which commits the golden commit check reads for each CI event: a push checks what it pushed,
// a pull request its own commits, and an event that pushed nothing is skipped with its reason.
import { describe, it, expect } from 'vitest'
import { resolveRange } from '../../scripts/check-golden-commits.mjs'

const BEFORE = 'b'.repeat(40)
const SHA = 'c'.repeat(40)

describe('golden commit range', () => {
  it('push with a previous commit checks before..sha', () => {
    const payload = { ref: 'refs/heads/main', before: BEFORE }
    expect(resolveRange({ name: 'push', payload, sha: SHA })).toEqual({
      range: `${BEFORE}..${SHA}`
    })
  })

  it('push whose previous commit is all zeros is skipped', () => {
    const payload = { ref: 'refs/heads/main', before: '0'.repeat(40) }
    expect(resolveRange({ name: 'push', payload, sha: SHA })).toEqual({
      skip: 'push (no previous commit)'
    })
  })

  it('push with no previous commit is skipped', () => {
    const payload = { ref: 'refs/heads/main' }
    expect(resolveRange({ name: 'push', payload, sha: SHA })).toEqual({
      skip: 'push (no previous commit)'
    })
  })

  it('push of a tag is skipped', () => {
    const payload = { ref: 'refs/tags/v1.6.1', before: BEFORE }
    expect(resolveRange({ name: 'push', payload, sha: SHA })).toEqual({ skip: 'push (tag ref)' })
  })

  it('pull request checks base..head', () => {
    const payload = {
      pull_request: { base: { sha: 'a'.repeat(40) }, head: { sha: 'd'.repeat(40) } }
    }
    expect(resolveRange({ name: 'pull_request', payload, sha: SHA })).toEqual({
      range: `${'a'.repeat(40)}..${'d'.repeat(40)}`
    })
  })

  for (const name of ['schedule', 'workflow_dispatch', 'workflow_call']) {
    it(`${name} is skipped`, () => {
      expect(resolveRange({ name, payload: {}, sha: SHA })).toEqual({
        skip: `${name} (no pushed range)`
      })
    })
  }
})
