// Gate logs are read by the count lines tests print; a silenced run would hide them.
import { readdirSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import config from '../../vitest.config'

// The one golden suite that reads what stores saved to localStorage, which only jsdom provides.
const PERSISTED_SUITE = 'tests/golden/persisted.test.ts'

const isMatchedBy = (file: string, globs: string[] | undefined): boolean =>
  (globs ?? []).some((glob) => path.matchesGlob(file, glob))

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

  it('runs every golden suite under node but the persisted-state one, which alone runs in jsdom', () => {
    const projects = (config.test?.projects ?? []).flatMap((project) =>
      typeof project === 'object' && 'test' in project ? [project.test] : []
    )
    const environments = (file: string): (string | undefined)[] =>
      projects
        .filter(
          (project) => isMatchedBy(file, project.include) && !isMatchedBy(file, project.exclude)
        )
        .map((project) => project.environment)
    const suites = readdirSync('tests/golden', { recursive: true, encoding: 'utf8' })
      .filter((file) => file.endsWith('.test.ts'))
      .map((file) => `tests/golden/${file.split(path.sep).join('/')}`)
    const jsdomSuites = suites.filter((file) => environments(file).includes('jsdom'))
    process.stdout.write(
      `golden suites ${String(suites.length)}, under jsdom ${String(jsdomSuites.length)}\n`
    )

    expect(suites.length, `golden suites: ${String(suites.length)}`).toBeGreaterThan(1)

    const nodeSuites = suites.filter((file) => file !== PERSISTED_SUITE)

    expect(nodeSuites.map((suite) => [suite, environments(suite)])).toStrictEqual(
      nodeSuites.map((suite) => [suite, ['node']])
    )

    expect(environments(PERSISTED_SUITE)).toStrictEqual(['jsdom'])
    expect(jsdomSuites).toStrictEqual([PERSISTED_SUITE])
  })
})
