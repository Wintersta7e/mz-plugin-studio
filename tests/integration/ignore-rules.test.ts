// Coverage output and local tool scripts must never show up as untracked changes
import { describe, it, expect } from 'vitest'
import { spawnSync } from 'node:child_process'

const IGNORED_PATHS = [
  'coverage/coverage-summary.json',
  'coverage/golden/coverage-summary.json',
  '.dev/tools/term-scan.mjs'
]

describe('ignore rules', () => {
  it.each(IGNORED_PATHS)('%s is ignored by git', (path) => {
    const result = spawnSync('git', ['check-ignore', '-q', path], { cwd: process.cwd() })

    expect(result.status).toBe(0)
  })
})
