// Loading a plugin from a project copy: the definition records the file it came from and keeps
// the file's text, so raw mode can save it back. A file that is not UTF-8 is refused, since its
// text could not be written back unchanged.
import { readFile, rm, writeFile } from 'fs/promises'
import { dirname, join } from 'path'
import log from 'electron-log/main'
import type { IpcMain } from 'electron'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { loadPluginFile, readRawPlugin, setupPluginHandlers } from '../../src/main/ipc/plugin'
import { IPC_CHANNELS } from '../../src/shared/ipc-types'
import { copyFixtureProject } from '../helpers/fixture-project'

let project: string | null = null

beforeEach(() => {
  vi.mocked(log.warn).mockClear()
  vi.mocked(log.error).mockClear()
})

afterEach(async () => {
  if (project !== null) await rm(dirname(project), { recursive: true, force: true })
  project = null
})

/** The handler main registers for `channel`, called as an invoke from the renderer reaches it. */
function handlerFor(channel: string): (...args: unknown[]) => Promise<unknown> {
  type Handler = (event: unknown, ...args: unknown[]) => Promise<unknown>
  const handlers = new Map<string, Handler>()
  const ipcMain = { handle: (name: string, fn: Handler) => handlers.set(name, fn) }
  setupPluginHandlers(ipcMain as unknown as IpcMain)
  return (...args) => handlers.get(channel)!({}, ...args)
}

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

  it('keeps a UTF-8 byte order mark in the file text', async () => {
    project = await copyFixtureProject()
    const { plugin } = await loadPluginFile(project, 'Fixture_Bom.js')
    const raw = await readRawPlugin(project, 'Fixture_Bom.js')
    const byPath = await handlerFor(IPC_CHANNELS.PLUGIN_READ_BY_PATH)(
      join(project, 'js', 'plugins', 'Fixture_Bom.js')
    )
    expect(plugin.rawSource?.startsWith('﻿')).toBe(true)
    expect(raw.content.startsWith('﻿')).toBe(true)
    expect(byPath).toBe(raw.content)
  })

  it('refuses a file that is not UTF-8, naming it, and logs a warning', async () => {
    project = await copyFixtureProject()
    // Shift_JIS text, which is not valid UTF-8
    const shiftJis = Buffer.from([0x83, 0x65, 0x83, 0x58, 0x83, 0x67])
    await writeFile(
      join(project, 'js', 'plugins', 'NotUtf8.js'),
      Buffer.concat([Buffer.from('/*:\n * @plugindesc '), shiftJis, Buffer.from('\n */\n')])
    )
    const notUtf8 = 'NotUtf8.js is not UTF-8, so the app cannot keep its text unchanged'
    await expect(loadPluginFile(project, 'NotUtf8.js')).rejects.toThrow(
      `Failed to load plugin "NotUtf8.js": ${notUtf8}`
    )
    await expect(readRawPlugin(project, 'NotUtf8.js')).rejects.toThrow(notUtf8)
    expect(vi.mocked(log.warn)).toHaveBeenCalledTimes(2)
    expect(String(vi.mocked(log.warn).mock.calls[0][0])).toContain('NotUtf8.js')
    expect(vi.mocked(log.error)).not.toHaveBeenCalled()
  })

  it('refuses a file that is not UTF-8 when it is read by path, naming it', async () => {
    project = await copyFixtureProject()
    const file = join(project, 'js', 'plugins', 'NotUtf8.js')
    // Shift_JIS text, which is not valid UTF-8
    const shiftJis = Buffer.from([0x83, 0x65, 0x83, 0x58, 0x83, 0x67])
    await writeFile(
      file,
      Buffer.concat([Buffer.from('/*:\n * @plugindesc '), shiftJis, Buffer.from('\n */\n')])
    )
    await expect(handlerFor(IPC_CHANNELS.PLUGIN_READ_BY_PATH)(file)).rejects.toThrow(
      'NotUtf8.js is not UTF-8, so the app cannot keep its text unchanged'
    )
  })
})
