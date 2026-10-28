// Gate logs are read by the count lines tests print; a silenced run would hide them.
import { describe, expect, it } from 'vitest'
import config from '../../vitest.config'

describe('vitest config', () => {
  it('keeps console output from tests', () => {
    expect(config.test?.silent).toBe(false)
  })

  it('every project fails a test on unexpected console output', () => {
    const projects = config.test?.projects ?? []
    console.log(`projects ${projects.length}`)
    expect(projects.length).toBeGreaterThan(0)
    for (const project of projects) {
      const setupFiles =
        typeof project === 'object' && 'test' in project ? project.test?.setupFiles : undefined
      expect([setupFiles ?? []].flat()).toContain('tests/setup/console.ts')
    }
  })
})
