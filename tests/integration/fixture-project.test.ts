// The fixture project is a project the app's loader accepts: a fresh copy validates, every
// data loader returns entries and nothing is logged as an error.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { rm } from 'node:fs/promises'
import path from 'node:path'
import log from 'electron-log/main'
import { ProjectParser } from '../../src/main/services/projectParser'
import { copyFixtureProject } from '../helpers/fixture-project'

const copies: string[] = []

async function loadCopy(leaf?: string): Promise<string> {
  const copy = await copyFixtureProject(leaf)
  copies.push(copy)
  return copy
}

async function expectLoads(copy: string): Promise<void> {
  await expect(ProjectParser.validateProject(copy)).resolves.toStrictEqual({ valid: true })

  const project = await ProjectParser.parseProject(copy)
  const counts = Object.entries(project).flatMap(([field, value]) =>
    Array.isArray(value) ? [[field, value.length] as const] : []
  )
  const listed = counts.map(([field, n]) => [field, String(n)].join(' ')).join(', ')

  process.stdout.write(`fixture project: ${listed}\n`)

  expect(project.gameTitle).toBe('Fixture Game')
  expect(counts.length).toBeGreaterThan(0)
  expect(counts.filter(([, n]) => n < 1)).toStrictEqual([])
  expect(vi.mocked(log.error)).toHaveBeenCalledTimes(0)
}

describe('fixture project', () => {
  beforeEach(() => {
    vi.mocked(log.error).mockClear()
  })

  afterEach(async () => {
    for (const copy of copies.splice(0))
      await rm(path.dirname(copy), { recursive: true, force: true })
  })

  it('loads through the project parser', async () => {
    expect.assertions(6)

    const copy = await loadCopy()

    expect(path.basename(copy)).toBe('Fixture Game')

    await expectLoads(copy)
  })

  it('loads from a path with spaces and parentheses', async () => {
    expect.assertions(6)

    const copy = await loadCopy('Fixture Game (copy)')

    expect(path.basename(copy)).toBe('Fixture Game (copy)')

    await expectLoads(copy)
  })
})
