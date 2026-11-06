// Loading a plugin from a project copy: the definition records the file it came from and keeps
// the file's text, so raw mode can save it back. A file that is not UTF-8 is refused, since its
// text could not be written back unchanged.
import { readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import log from 'electron-log/main'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { setCurrentProjectRoot } from '../../src/main/file-access'
import { loadPluginFile, readRawPlugin } from '../../src/main/ipc/plugin'
import { IPC_CHANNELS } from '../../src/shared/ipc-types'
import { registerMainHandlers } from '../helpers/fake-ipc'
import { copyFixtureProject } from '../helpers/fixture-project'

vi.mock<{ ipcMain: object }>(import('electron'), () => ({ ipcMain: {} }))

const projects: string[] = []

/**
A fresh copy of the fixture project, removed after the test
*/
async function freshProject(): Promise<string> {
  const project = await copyFixtureProject()
  projects.push(project)
  return project
}

/**
The handler main registers for `channel`, called as an invoke from the renderer reaches it,
with `project` as the open project.
*/
function handlerFor(project: string, channel: string): (...args: unknown[]) => Promise<unknown> {
  const ipc = registerMainHandlers()
  setCurrentProjectRoot(project)
  return async (...args) => ipc.invoke(channel, ...args)
}

describe('loading a plugin file', () => {
  beforeEach(() => {
    vi.mocked(log.warn).mockClear()
    vi.mocked(log.error).mockClear()
  })

  afterEach(async () => {
    for (const project of projects.splice(0)) {
      await rm(path.dirname(project), { recursive: true, force: true })
    }
  })

  it('records the file name and keeps the file text', async () => {
    expect.assertions(3)

    const project = await freshProject()
    const { plugin } = await loadPluginFile(project, 'Fixture_HandWritten.js')
    const text = await readFile(
      path.join(project, 'js', 'plugins', 'Fixture_HandWritten.js'),
      'utf8'
    )

    expect(plugin.importedFrom).toBe('Fixture_HandWritten.js')
    expect(plugin.rawSource).toBe(text)
    expect(plugin.meta.name).toBe('Fixture_HandWritten')
  })

  it('names the file when it cannot be read', async () => {
    expect.assertions(1)

    const project = await freshProject()

    await expect(loadPluginFile(project, 'Missing.js')).rejects.toThrow(
      /^Failed to load plugin "Missing\.js": /
    )
  })

  it('keeps a UTF-8 byte order mark in the file text', async () => {
    expect.assertions(3)

    const project = await freshProject()
    const { plugin } = await loadPluginFile(project, 'Fixture_Bom.js')
    const raw = await readRawPlugin(project, 'Fixture_Bom.js')
    const byPath = await handlerFor(
      project,
      IPC_CHANNELS.PLUGIN_READ_BY_PATH
    )(path.join(project, 'js', 'plugins', 'Fixture_Bom.js'))

    expect(plugin.rawSource?.startsWith('\u{FEFF}')).toBe(true)
    expect(raw.content.startsWith('\u{FEFF}')).toBe(true)
    expect(byPath).toBe(raw.content)
  })

  it('refuses a file that is not UTF-8, naming it, and logs a warning', async () => {
    expect.assertions(5)

    const project = await freshProject()
    // Shift_JIS text, which is not valid UTF-8
    const shiftJis = Buffer.from([0x83, 0x65, 0x83, 0x58, 0x83, 0x67])
    await writeFile(
      path.join(project, 'js', 'plugins', 'NotUtf8.js'),
      Buffer.concat([Buffer.from('/*:\n * @plugindesc '), shiftJis, Buffer.from('\n */\n')])
    )
    const notUtf8 = 'NotUtf8.js is not UTF-8. The app reads only UTF-8 files'

    await expect(loadPluginFile(project, 'NotUtf8.js')).rejects.toThrow(
      `Failed to load plugin "NotUtf8.js": ${notUtf8}`
    )
    await expect(readRawPlugin(project, 'NotUtf8.js')).rejects.toThrow(notUtf8)
    expect(vi.mocked(log.warn)).toHaveBeenCalledTimes(2)
    expect(vi.mocked(log.warn)).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('NotUtf8.js'),
      expect.anything()
    )
    expect(vi.mocked(log.error)).not.toHaveBeenCalled()
  })

  it('refuses a file that is not UTF-8 when it is read by path, naming it', async () => {
    expect.assertions(1)

    const project = await freshProject()
    const file = path.join(project, 'js', 'plugins', 'NotUtf8.js')
    // Shift_JIS text, which is not valid UTF-8
    const shiftJis = Buffer.from([0x83, 0x65, 0x83, 0x58, 0x83, 0x67])
    await writeFile(
      file,
      Buffer.concat([Buffer.from('/*:\n * @plugindesc '), shiftJis, Buffer.from('\n */\n')])
    )

    await expect(handlerFor(project, IPC_CHANNELS.PLUGIN_READ_BY_PATH)(file)).rejects.toThrow(
      'NotUtf8.js is not UTF-8. The app reads only UTF-8 files'
    )
  })
})
