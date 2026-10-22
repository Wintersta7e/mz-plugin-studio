// The plugin save handlers, called directly on a fresh temporary project for each test:
// what a save does to a file that already exists at its target.
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { recordWriteGrant } from '../../src/main/file-access'
import { savePluginFile, savePluginToPath } from '../../src/main/ipc/plugin'

let tmp: string

beforeEach(async () => {
  tmp = await mkdtemp(join(tmpdir(), 'save-guard-'))
})

afterEach(async () => {
  await rm(tmp, { recursive: true, force: true })
})

describe('saving over an existing file', () => {
  it('plugin:save replaces an existing file without reading it', async () => {
    const target = join(tmp, 'js', 'plugins', 'Foo.js')
    await mkdir(join(tmp, 'js', 'plugins'), { recursive: true })
    await writeFile(target, 'A')
    await expect(savePluginFile(tmp, 'Foo.js', 'B')).resolves.toEqual({
      success: true,
      path: target
    })
    expect(await readFile(target, 'utf8')).toBe('B')
  })

  it('plugin:save-to-path replaces an existing granted file', async () => {
    const target = join(tmp, 'Foo.js')
    await writeFile(target, 'A')
    recordWriteGrant(target)
    await expect(savePluginToPath(target, 'B')).resolves.toEqual({ success: true, path: target })
    expect(await readFile(target, 'utf8')).toBe('B')
  })
})
