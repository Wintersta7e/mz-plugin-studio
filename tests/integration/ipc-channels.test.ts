// Every channel main registers, called through the registration wrapper as a window's request
// reaches it: one valid call each on a project copy, then the access class of every channel that
// takes a path, refused before its handler runs.
import { existsSync, readdirSync } from 'node:fs'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import type { MessageBoxReturnValue, OpenDialogReturnValue, SaveDialogReturnValue } from 'electron'
import log from 'electron-log/main'
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest'
import type { AccessClass } from '../../src/main/file-access'
import {
  createInvokeHandlers,
  createSendListeners,
  type MainDependencies,
  type WindowPort
} from '../../src/main/ipc/handlers'
import { handleAll, onAll } from '../../src/main/ipc/registration'
import { INVOKE_CHANNELS, SEND_CHANNELS, type InvokeChannel } from '../../src/shared/ipc-types'
import { copyFixtureProject } from '../helpers/fixture-project'
import { createAppPage, createFakeRegistrar, type FakeRegistrar } from '../helpers/fake-ipc'

vi.mock<{ ipcMain: object }>(import('electron'), () => ({ ipcMain: {} }))

/**
The access class each channel's handler declares
*/
const EXPECTED_ACCESS: Record<InvokeChannel, AccessClass> = {
  'project:validate': 'project-load',
  'project:load': 'project-load',
  'plugin:save': 'current-project',
  'plugin:load': 'current-project',
  'plugin:read-raw': 'current-project',
  'plugin:list': 'current-project',
  'plugin:scan-headers': 'current-project',
  'plugin:save-to-path': 'granted-write',
  'plugin:read-by-path': 'granted-read',
  'plugin:parse': 'none',
  'dialog:open-folder': 'none',
  'dialog:save-file': 'none',
  'dialog:open-file': 'none',
  'dialog:message': 'none',
  'window-is-maximized': 'none',
  'log:open-folder': 'none'
}

/*
Each dialog answers in turn what a test queued with `mockResolvedValueOnce`; with nothing queued
the request fails
*/
const showOpenDialog = vi
  .fn<(...args: unknown[]) => Promise<OpenDialogReturnValue>>()
  .mockRejectedValue(new Error('no answer queued for showOpenDialog'))
const showSaveDialog = vi
  .fn<(...args: unknown[]) => Promise<SaveDialogReturnValue>>()
  .mockRejectedValue(new Error('no answer queued for showSaveDialog'))
const showMessageBox = vi
  .fn<(...args: unknown[]) => Promise<MessageBoxReturnValue>>()
  .mockRejectedValue(new Error('no answer queued for showMessageBox'))

const minimize = vi.fn<WindowPort['minimize']>()
const maximize = vi.fn<WindowPort['maximize']>()
const close = vi.fn<WindowPort['close']>()
const win: WindowPort = {
  minimize,
  maximize,
  unmaximize: vi.fn<WindowPort['unmaximize']>(),
  isMaximized: vi.fn<WindowPort['isMaximized']>().mockReturnValue(false),
  close
}
const openLogFolder = vi.fn<MainDependencies['openLogFolder']>().mockResolvedValue()
const setLogLevel = vi.fn<MainDependencies['setLogLevel']>()
const dependencies: MainDependencies = {
  dialog: { showOpenDialog, showSaveDialog, showMessageBox },
  getWindow: () => win,
  openLogFolder,
  setLogLevel
}
const handlers = createInvokeHandlers(dependencies)
const runs = new Map(INVOKE_CHANNELS.map((c) => [c, vi.spyOn(handlers[c], 'run')] as const))
const warn: MockInstance<(...params: unknown[]) => void> = vi.mocked(log.warn)

/**
The fake registrar with every handler and listener registered behind the sender check
*/
function registered(): FakeRegistrar {
  const page = createAppPage()
  const registrar = createFakeRegistrar(page.frame)
  handleAll(handlers, page.isTrustedSender, registrar.registrar)
  onAll(createSendListeners(dependencies), page.isTrustedSender, registrar.registrar)
  return registrar
}

const ipc = registered()

/**
Folders the running test made, removed after it
*/
const made: string[] = []

async function freshProject(): Promise<string> {
  const project = await copyFixtureProject()
  made.push(path.dirname(project))
  return project
}

async function freshFolder(): Promise<string> {
  const folder = await mkdtemp(path.join(tmpdir(), 'ipc-channels-'))
  made.push(folder)
  return folder
}

async function removeMade(): Promise<void> {
  await Promise.all(
    made.splice(0).map(async (folder) => rm(folder, { recursive: true, force: true }))
  )
}

function clearCalls(): void {
  warn.mockClear()
  for (const spy of runs.values()) spy.mockClear()
}

/**
How many times the channel's handler ran; a channel without a spy counts as run
*/
function handlerRuns(channel: InvokeChannel): number {
  return runs.get(channel)?.mock.calls.length ?? Infinity
}

/**
The value's own keys, none for a value that is not an object
*/
function keysOf(value: unknown): Set<string> {
  return new Set(typeof value === 'object' && value !== null ? Object.keys(value) : [])
}

function field(value: unknown, key: string): unknown {
  return typeof value === 'object' && value !== null ? Reflect.get(value, key) : undefined
}

/**
The registrar's calls, recording each channel they drive
*/
function channelDriver(): {
  driven: Set<string>
  invoke: (channel: string, ...args: unknown[]) => Promise<unknown>
  send: (channel: string, ...args: unknown[]) => void
} {
  const driven = new Set<string>()
  return {
    driven,
    invoke: async (channel, ...args) => {
      driven.add(channel)
      return await ipc.invoke(channel, ...args)
    },
    send: (channel, ...args) => {
      driven.add(channel)
      ipc.send(channel, ...args)
    }
  }
}

/**
The dialog answers of one valid call per channel: the project folder opened first, `chosen` saved
to and opened, the message's second button
*/
function queueDialogAnswers(project: string, chosen: string): void {
  showOpenDialog
    .mockResolvedValueOnce({ canceled: false, filePaths: [project] })
    .mockResolvedValueOnce({ canceled: false, filePaths: [chosen] })
  showSaveDialog.mockResolvedValueOnce({ canceled: false, filePath: chosen })
  showMessageBox.mockResolvedValueOnce({ response: 1, checkboxChecked: false })
}

describe('ipc channels: valid calls', () => {
  beforeEach(clearCalls)

  afterEach(removeMade)

  it('answers a valid call on every channel', async () => {
    expect.assertions(5)

    const project = await freshProject()
    const chosen = path.join(await freshFolder(), 'Synthetic_Out.js')
    const plugin = 'Fixture_HandWritten.js'
    // The project channels act only on the open project, opened from the folder dialog
    queueDialogAnswers(project, chosen)
    const { driven, invoke, send } = channelDriver()

    const folder = await invoke('dialog:open-folder')
    const validated = await invoke('project:validate', project)
    const loaded = await invoke('project:load', project)
    const listed = await invoke('plugin:list', project)
    const headers = await invoke('plugin:scan-headers', project)
    const load = await invoke('plugin:load', project, plugin)
    const raw = await invoke('plugin:read-raw', project, plugin)
    const parsed = await invoke('plugin:parse', field(raw, 'content'))
    const saved = await invoke('plugin:save', project, 'Synthetic_New.js', '// new\n', {
      base: null
    })

    expect({ folder, validated, loaded, listed, headers, load: keysOf(load) }).toStrictEqual({
      folder: project,
      validated: { valid: true },
      loaded: expect.objectContaining({ gameTitle: expect.any(String) as unknown }) as unknown,
      listed: expect.arrayContaining([plugin]) as unknown,
      headers: expect.arrayContaining([expect.objectContaining({ filename: plugin })]) as unknown,
      load: new Set(['path', 'plugin', 'sha256'])
    })
    expect({ raw: keysOf(raw), parsed, saved }).toStrictEqual({
      raw: new Set(['content', 'path', 'sha256']),
      parsed: expect.objectContaining({
        meta: expect.objectContaining({ name: 'Fixture_HandWritten' }) as unknown
      }) as unknown,
      saved: expect.objectContaining({ success: true }) as unknown
    })

    const answers = {
      saveFile: await invoke('dialog:save-file', { defaultPath: 'Synthetic_Out.js' }),
      saveToPath: await invoke('plugin:save-to-path', chosen, '// out\n'),
      readByPath: await invoke('plugin:read-by-path', chosen),
      openFile: await invoke('dialog:open-file', {}),
      message: await invoke('dialog:message', { message: 'Synthetic' }),
      isMaximized: await invoke('window-is-maximized'),
      logFolder: await invoke('log:open-folder'),
      logFolderCalls: openLogFolder.mock.calls.length
    }
    send('window-minimize')
    send('window-maximize')
    send('window-close')
    send('log:set-level', true)

    expect({
      ...answers,
      sent: [minimize, maximize, close].map((spy) => spy.mock.calls.length),
      levels: setLogLevel.mock.calls
    }).toStrictEqual({
      saveFile: chosen,
      saveToPath: expect.objectContaining({ success: true, path: chosen }) as unknown,
      readByPath: '// out\n',
      openFile: chosen,
      message: 1,
      isMaximized: false,
      logFolder: undefined,
      logFolderCalls: 1,
      sent: [1, 1, 1],
      levels: [['debug']]
    })

    const channels = [...INVOKE_CHANNELS, ...SEND_CHANNELS]
    process.stdout.write(`channels tested ${String(driven.size)}/${String(channels.length)}\n`)

    expect(channels.length).toBeGreaterThan(0)
    expect({
      untested: channels.filter((c) => !driven.has(c)),
      handled: ipc.handled,
      listened: ipc.listened
    }).toStrictEqual({
      untested: [],
      handled: [...INVOKE_CHANNELS],
      listened: [...SEND_CHANNELS]
    })
  })
})

describe('ipc channels: access classes', () => {
  beforeEach(clearCalls)

  afterEach(removeMade)

  it('declares the expected access class on every channel', () => {
    for (const channel of INVOKE_CHANNELS) {
      expect({ channel, access: handlers[channel].access }).toStrictEqual({
        channel,
        access: EXPECTED_ACCESS[channel]
      })
    }
  })

  it('refuses a bad path on every guarded channel before its handler runs', async () => {
    expect.hasAssertions()

    const project = await freshProject()
    const outside = path.dirname(project)
    const badPaths = ['js/plugins/x.js', `${project}/js/plugins/../../../x.json`]
    /**
    Each guarded channel's arguments with `p` where it takes its path
    */
    const argsWith: Partial<Record<InvokeChannel, (p: string) => unknown[]>> = {
      'project:validate': (p) => [p],
      'project:load': (p) => [p],
      'plugin:save': (p) => [p, 'Synthetic_Bad.js', '// bad\n', { base: null }],
      'plugin:load': (p) => [p, 'Fixture_HandWritten.js'],
      'plugin:read-raw': (p) => [p, 'Fixture_HandWritten.js'],
      'plugin:list': (p) => [p],
      'plugin:scan-headers': (p) => [p],
      'plugin:save-to-path': (p) => [p, '// bad\n'],
      'plugin:read-by-path': (p) => [p]
    }
    const guarded = INVOKE_CHANNELS.filter((c) => EXPECTED_ACCESS[c] !== 'none')
    /**
    Channels whose bad path reached the handler, or was refused without one warning
    */
    const unguarded = new Set<string>()
    for (const channel of guarded) {
      const args = argsWith[channel]
      if (args === undefined) {
        unguarded.add(channel)
        continue
      }
      for (const bad of badPaths) {
        clearCalls()

        await expect(ipc.invoke(channel, ...args(bad))).rejects.toThrow(/^Invalid path: /)

        const warned = warn.mock.calls.map((call) => String(call[0]))
        const isRefusedHere =
          handlerRuns(channel) === 0 &&
          warned.length === 1 &&
          warned.every((line) => line.startsWith(`[ipc] refused ${channel}: Invalid path: `))
        if (!isRefusedHere) unguarded.add(channel)
      }
    }
    process.stdout.write(
      `channels guarded ${String(guarded.length - unguarded.size)}/${String(guarded.length)}\n`
    )

    expect(guarded.length).toBeGreaterThan(0)
    expect({
      unguarded: [...unguarded],
      outside: readdirSync(outside),
      isCwdJsMade: existsSync(path.resolve('js')),
      isBadSaved: existsSync(path.join(project, 'js', 'plugins', 'Synthetic_Bad.js'))
    }).toStrictEqual({
      unguarded: [],
      outside: ['Fixture Game'],
      isCwdJsMade: false,
      isBadSaved: false
    })
  })
})
