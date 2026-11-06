// A project's optional data files: one that is missing or unreadable loads as an empty list.
// A missing file is normal for a project and logged at debug; any other failure at error.
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import log from 'electron-log/main'
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest'
import { ProjectParser } from '../../src/main/services/projectParser'

const logError: MockInstance<(...params: unknown[]) => void> = vi.mocked(log.error)
const logDebug: MockInstance<(...params: unknown[]) => void> = vi.mocked(log.debug)

/**
Project folders the running test made, removed after it
*/
const made: string[] = []

/**
A new project folder with an empty `data` folder
*/
async function freshRoot(): Promise<string> {
  const root = await mkdtemp(path.join(tmpdir(), 'project-load-errors-'))
  made.push(root)
  await mkdir(path.join(root, 'data'))
  return root
}

describe('optional project data files', () => {
  beforeEach(() => {
    logError.mockClear()
    logDebug.mockClear()
  })

  afterEach(async () => {
    await Promise.all(
      made.splice(0).map(async (root) => rm(root, { recursive: true, force: true }))
    )
  })

  it('a missing optional data file is logged at debug, not as an error', async () => {
    expect.assertions(3)

    const root = await freshRoot()

    await expect(ProjectParser.getSkills(root)).resolves.toStrictEqual([])
    expect(logError).not.toHaveBeenCalled()
    expect(logDebug.mock.calls.map((call) => String(call[0]))).toStrictEqual([
      expect.stringContaining('Skills.json')
    ])
  })

  it('a malformed optional data file is logged as an error', async () => {
    expect.assertions(3)

    const root = await freshRoot()
    await writeFile(path.join(root, 'data', 'Skills.json'), '[null, {"id": 1,')

    await expect(ProjectParser.getSkills(root)).resolves.toStrictEqual([])
    expect(logDebug).not.toHaveBeenCalled()
    expect(logError.mock.calls.map((call) => [String(call[0]), call[1]])).toStrictEqual([
      [expect.stringContaining('Skills.json'), expect.any(SyntaxError)]
    ])
  })
})
