// Loading a plugin from a project copy: the definition records the file it came from and keeps
// the file's text, so raw mode can save it back.
import { readFile, rm } from 'fs/promises'
import { dirname, join } from 'path'
import { afterEach, describe, expect, it } from 'vitest'
import { loadPluginFile } from '../../src/main/ipc/plugin'
import { copyFixtureProject } from '../helpers/fixture-project'

let project: string | null = null

afterEach(async () => {
  if (project !== null) await rm(dirname(project), { recursive: true, force: true })
  project = null
})

describe('loading a plugin file', () => {
  it('records the file name and keeps the file text', async () => {
    project = await copyFixtureProject()
    const { plugin } = await loadPluginFile(project, 'Fixture_HandWritten.js')
    const text = await readFile(join(project, 'js', 'plugins', 'Fixture_HandWritten.js'), 'utf-8')
    expect(plugin.importedFrom).toBe('Fixture_HandWritten.js')
    expect(plugin.rawSource).toBe(text)
    expect(plugin.meta.name).toBe('Fixture_HandWritten')
  })

  it('names the file when it cannot be read', async () => {
    project = await copyFixtureProject()
    await expect(loadPluginFile(project, 'Missing.js')).rejects.toThrow(
      /^Failed to load plugin "Missing\.js": /
    )
  })
})
