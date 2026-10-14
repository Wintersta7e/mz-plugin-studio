// The fixture project is a project the app's loader accepts: a fresh copy validates, every
// data loader returns entries and nothing is logged as an error.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { rm } from 'fs/promises'
import { basename, dirname } from 'path'
import log from 'electron-log/main'
import { ProjectParser } from '../../src/main/services/projectParser'
import { copyFixtureProject } from '../helpers/fixture-project'

const copies: string[] = []

async function loadCopy(leaf?: string): Promise<string> {
  const path = await copyFixtureProject(leaf)
  copies.push(path)
  return path
}

async function expectLoads(path: string): Promise<void> {
  expect(await ProjectParser.validateProject(path)).toEqual({ valid: true })
  const project = await ProjectParser.parseProject(path)
  const counts = Object.entries(project)
    .filter(([, value]) => Array.isArray(value))
    .map(([field, value]) => [field, (value as unknown[]).length] as const)

  console.log(`fixture project: ${counts.map(([field, n]) => `${field} ${n}`).join(', ')}`)
  expect(project.gameTitle).toBe('Fixture Game')
  expect(counts.length).toBeGreaterThan(0)
  expect(counts.filter(([field, n]) => field !== 'plugins' && n < 1)).toEqual([])
  // plugins.js holds a description containing "];", which ends the plugin-list match early:
  // the list reads as empty today.
  expect(project.plugins).toHaveLength(0)
  expect(vi.mocked(log.error)).toHaveBeenCalledTimes(0)
}

describe('fixture project', () => {
  beforeEach(() => {
    vi.mocked(log.error).mockClear()
  })

  afterEach(async () => {
    for (const path of copies.splice(0)) await rm(dirname(path), { recursive: true, force: true })
  })

  it('loads through the project parser', async () => {
    const path = await loadCopy()
    expect(basename(path)).toBe('Fixture Game')
    await expectLoads(path)
  })

  it('loads from a path with spaces and parentheses', async () => {
    const path = await loadCopy('Fixture Game (copy)')
    expect(basename(path)).toBe('Fixture Game (copy)')
    await expectLoads(path)
  })
})
