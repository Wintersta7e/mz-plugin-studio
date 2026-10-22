// A project's optional data files: one that is missing or unreadable loads as an empty list,
// and the parser logs it.
import { mkdir, mkdtemp, rm, writeFile } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import log from 'electron-log/main'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ProjectParser } from '../../src/main/services/projectParser'

let root: string

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'project-load-errors-'))
  await mkdir(join(root, 'data'))
  vi.mocked(log.error).mockClear()
  vi.mocked(log.debug).mockClear()
})

afterEach(async () => {
  await rm(root, { recursive: true, force: true })
})

describe('optional project data files', () => {
  it('a missing optional data file is logged as an error', async () => {
    expect(await ProjectParser.getSkills(root)).toEqual([])
    expect(vi.mocked(log.error)).toHaveBeenCalledTimes(1)
    expect(String(vi.mocked(log.error).mock.calls[0][0])).toContain('Skills.json')
  })

  it('a malformed optional data file is logged as an error', async () => {
    await writeFile(join(root, 'data', 'Skills.json'), '[null, {"id": 1,')
    expect(await ProjectParser.getSkills(root)).toEqual([])
    expect(vi.mocked(log.error)).toHaveBeenCalledTimes(1)
    expect(String(vi.mocked(log.error).mock.calls[0][0])).toContain('Skills.json')
  })
})
