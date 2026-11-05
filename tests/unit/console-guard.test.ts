// The guard that fails a test on console.error/console.warn output it did not state it expects.
// Each case drives its own fake console, never the real one.
import { describe, expect, it, vi } from 'vitest'
import { createConsoleGuard } from '../helpers/console-guard'

function fakeConsole(): Pick<Console, 'error' | 'warn'> {
  return { error: vi.fn<Console['error']>(), warn: vi.fn<Console['warn']>() }
}

describe('console guard', () => {
  it('reports an error nobody expected, with its formatted text', () => {
    const target = fakeConsole()
    const guard = createConsoleGuard(target)
    target.error('failed %d times:', 2, 'boom')

    expect(guard.finish()).toStrictEqual(['unexpected console.error: failed 2 times: boom'])
  })

  it('accepts a call that matches an expectation', () => {
    const target = fakeConsole()
    const guard = createConsoleGuard(target)
    guard.expect('warn', /deprecated/)
    target.warn('this option is deprecated')

    expect(guard.finish()).toStrictEqual([])
  })

  it('reports an expectation that no call met', () => {
    const guard = createConsoleGuard(fakeConsole())
    guard.expect('warn', /deprecated/)

    expect(guard.finish()).toStrictEqual(['expected console.warn matching /deprecated/, none came'])
  })

  it('does not let an expected warning excuse an error with the same text', () => {
    const target = fakeConsole()
    const guard = createConsoleGuard(target)
    guard.expect('warn', /boom/)
    target.error('boom')

    expect(guard.finish()).toStrictEqual([
      'unexpected console.error: boom',
      'expected console.warn matching /boom/, none came'
    ])
  })

  it('reports a console method replaced during the test', () => {
    const target = fakeConsole()
    const guard = createConsoleGuard(target)
    vi.spyOn(target, 'error')

    expect(guard.finish()).toStrictEqual([
      'console.error was replaced during the test; use expectConsole'
    ])
  })

  it('puts the original methods back when it finishes', () => {
    const target = fakeConsole()
    const { error, warn } = target
    const guard = createConsoleGuard(target)

    expect(target.error).not.toBe(error)

    guard.finish()

    expect(target.error).toBe(error)
    expect(target.warn).toBe(warn)
  })
})
