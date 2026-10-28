// Every test fails on console.error/console.warn output it did not state with expectConsole.
import { afterEach, beforeEach } from 'vitest'
import { endTestGuard, startTestGuard } from '../helpers/console-guard'

beforeEach(() => {
  startTestGuard(console)
})

afterEach(() => {
  const problems = endTestGuard()
  if (problems.length > 0) throw new Error(problems.join('\n'))
})
