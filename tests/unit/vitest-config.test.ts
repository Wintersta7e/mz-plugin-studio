// Gate logs are read by the count lines tests print; a silenced run would hide them.
import { describe, expect, it } from 'vitest'
import config from '../../vitest.config'

describe('vitest config', () => {
  it('keeps console output from tests', () => {
    expect(config.test?.silent).toBe(false)
  })

  it('rejects a focused test outside CI too', () => {
    expect(config.test?.allowOnly).toBe(false)
  })

  it('fails every run on a skipped test through the skip counter', () => {
    expect(config.test?.reporters).toStrictEqual(['default', './tests/setup/no-skips-reporter.ts'])
  })

  it('shuffles the tests of every project', () => {
    const projects = config.test?.projects ?? []

    expect(config.test?.sequence?.shuffle).toBe(true)
    expect(projects.length).toBeGreaterThan(0)

    for (const project of projects) {
      const isInherited =
        typeof project === 'object' && 'extends' in project && project.extends === true
      const own = typeof project === 'object' && 'test' in project ? project.test : undefined

      expect(isInherited).toBe(true)
      expect(own?.sequence).toBeUndefined()
    }
  })

  it('every project fails a test on unexpected console output', () => {
    const projects = config.test?.projects ?? []
    process.stdout.write(`projects ${String(projects.length)}\n`)

    expect(projects.length).toBeGreaterThan(0)

    for (const project of projects) {
      const setupFiles =
        typeof project === 'object' && 'test' in project ? project.test.setupFiles : undefined

      expect([setupFiles ?? []].flat()).toContain('tests/setup/console.ts')
    }
  })
})
