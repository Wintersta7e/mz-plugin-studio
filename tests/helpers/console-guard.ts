// Fails a test on console.error/console.warn output the test did not state it expects. Recorded
// output goes into the failure message; expected output prints nothing.
import { format } from 'node:util'

export type ConsoleLevel = 'error' | 'warn'

export interface ConsoleGuard {
  expect(level: ConsoleLevel, pattern: RegExp): void
  finish(): string[]
}

const LEVELS: ConsoleLevel[] = ['error', 'warn']

interface Expectation {
  level: ConsoleLevel
  pattern: RegExp
  met: boolean
}

export function createConsoleGuard(target: Pick<Console, ConsoleLevel>): ConsoleGuard {
  const originals = { error: target.error, warn: target.warn }
  const expectations: Expectation[] = []
  const unexpected: string[] = []
  const record =
    (level: ConsoleLevel) =>
    (...args: unknown[]): void => {
      const text = format(...args)
      const expectation = expectations.find(
        (candidate) => candidate.level === level && candidate.pattern.test(text)
      )
      if (expectation) expectation.met = true
      else unexpected.push(`unexpected console.${level}: ${text}`)
    }
  const installed: Pick<Console, ConsoleLevel> = { error: record('error'), warn: record('warn') }
  for (const level of LEVELS) target[level] = installed[level]

  return {
    expect(level, pattern) {
      expectations.push({ level, pattern, met: false })
    },
    finish() {
      const problems = [...unexpected]
      for (const level of LEVELS) {
        if (target[level] !== installed[level]) {
          problems.push(`console.${level} was replaced during the test; use expectConsole`)
        }
        target[level] = originals[level]
      }
      for (const { level, pattern, met } of expectations) {
        if (!met) problems.push(`expected console.${level} matching ${String(pattern)}, none came`)
      }
      return problems
    }
  }
}

// The guard of the test that is running, if any
const current: { guard: ConsoleGuard | undefined } = { guard: undefined }

/**
States that the running test expects a console call at this level matching the pattern.
*/
export function expectConsole(level: ConsoleLevel, pattern: RegExp): void {
  if (!current.guard) throw new Error('expectConsole called outside a running test')
  current.guard.expect(level, pattern)
}

export function startTestGuard(target: Pick<Console, ConsoleLevel>): void {
  current.guard = createConsoleGuard(target)
}

export function endTestGuard(): string[] {
  const { guard } = current
  current.guard = undefined
  return guard ? guard.finish() : []
}
