// Every channel main registers, called through the registration wrapper as a window's request
// reaches it: one valid call each on a project copy, then the access class of every channel that
// takes a path, refused before its handler runs.
import { existsSync, readdirSync } from 'fs'
import { mkdtemp, rm } from 'fs/promises'
import { tmpdir } from 'os'
import { dirname, join, resolve } from 'path'
import log from 'electron-log/main'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AccessClass } from '../../src/main/file-access'
import { createInvokeHandlers, createSendListeners } from '../../src/main/ipc/handlers'
import type { DialogPort, MainDeps, WindowPort } from '../../src/main/ipc/handlers'
import { handleAll, onAll } from '../../src/main/ipc/registration'
import { INVOKE_CHANNELS, SEND_CHANNELS, type InvokeChannel } from '../../src/shared/ipc-types'
import { copyFixtureProject } from '../helpers/fixture-project'
import { createAppPage, createFakeRegistrar } from '../helpers/fake-ipc'

vi.mock('electron', () => ({ ipcMain: {} }))

/** The access class each channel's handler declares */
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

/** A dialog that records each call's options and answers from a queue */
function fakeDialog() {
  const answers: unknown[] = []
  const calls: { method: string; options: unknown }[] = []
  const answer = (method: string) =>
    vi.fn(async (options: unknown) => {
      calls.push({ method, options })
      if (answers.length === 0) throw new Error(`no answer queued for ${method}`)
      return answers.shift()
    })
  const dialog = {
    showOpenDialog: answer('showOpenDialog'),
    showSaveDialog: answer('showSaveDialog'),
    showMessageBox: answer('showMessageBox')
  }
  return { dialog: dialog as unknown as DialogPort, queue: (a: unknown) => answers.push(a), calls }
}

function fakeWindow() {
  return {
    minimize: vi.fn(),
    maximize: vi.fn(),
    unmaximize: vi.fn(),
    isMaximized: vi.fn(() => false),
    close: vi.fn()
  }
}

let project: string
let tmp: string
const dialogs = fakeDialog()
const win = fakeWindow()
const deps: MainDeps = {
  dialog: dialogs.dialog,
  getWindow: () => win as unknown as WindowPort,
  openLogFolder: vi.fn(async () => {}),
  setLogLevel: vi.fn()
}
const handlers = createInvokeHandlers(deps)
const page = createAppPage()
const ipc = createFakeRegistrar(page.frame)
const runs = new Map(INVOKE_CHANNELS.map((c) => [c, vi.spyOn(handlers[c], 'run')] as const))
handleAll(handlers, page.isTrustedSender, ipc.registrar)
onAll(createSendListeners(deps), page.isTrustedSender, ipc.registrar)

beforeAll(async () => {
  project = await copyFixtureProject()
  tmp = await mkdtemp(join(tmpdir(), 'ipc-channels-'))
})

afterAll(async () => {
  await rm(dirname(project), { recursive: true, force: true })
  await rm(tmp, { recursive: true, force: true })
})

beforeEach(() => {
  vi.mocked(log.warn).mockClear()
  for (const spy of runs.values()) spy.mockClear()
})

describe('ipc channels', () => {
  it('answers a valid call on every channel', async () => {
    const driven = new Set<string>()
    const invoke = (channel: string, ...args: unknown[]): Promise<unknown> => {
      driven.add(channel)
      return ipc.invoke(channel, ...args)
    }
    const send = (channel: string, ...args: unknown[]): void => {
      driven.add(channel)
      ipc.send(channel, ...args)
    }
    const plugin = 'Fixture_HandWritten.js'

    // The project channels act only on the open project, opened from the folder dialog
    dialogs.queue({ canceled: false, filePaths: [project] })

    await expect(invoke('dialog:open-folder')).resolves.toBe(project)
    await expect(invoke('project:validate', project)).resolves.toEqual({ valid: true })

    const loaded = (await invoke('project:load', project)) as { gameTitle: unknown }

    expect(typeof loaded.gameTitle).toBe('string')
    expect(await invoke('plugin:list', project)).toContain(plugin)

    const headers = (await invoke('plugin:scan-headers', project)) as { filename: string }[]

    expect(headers.map((h) => h.filename)).toContain(plugin)

    const load = (await invoke('plugin:load', project, plugin)) as Record<string, unknown>

    expect(Object.keys(load).sort()).toEqual(['path', 'plugin', 'sha256'])

    const raw = (await invoke('plugin:read-raw', project, plugin)) as Record<string, unknown>

    expect(Object.keys(raw).sort()).toEqual(['content', 'path', 'sha256'])

    const parsed = (await invoke('plugin:parse', raw.content)) as { meta: { name: string } }

    expect(parsed.meta.name).toBe('Fixture_HandWritten')

    const saved = await invoke('plugin:save', project, 'Synthetic_New.js', '// new\n', {
      base: null
    })

    expect(saved).toMatchObject({ success: true })

    const chosen = join(tmp, 'Synthetic_Out.js')
    dialogs.queue({ canceled: false, filePath: chosen })

    await expect(invoke('dialog:save-file', { defaultPath: 'Synthetic_Out.js' })).resolves.toBe(
      chosen
    )
    await expect(invoke('plugin:save-to-path', chosen, '// out\n')).resolves.toMatchObject({
      success: true,
      path: chosen
    })
    await expect(invoke('plugin:read-by-path', chosen)).resolves.toBe('// out\n')

    dialogs.queue({ canceled: false, filePaths: [chosen] })

    await expect(invoke('dialog:open-file', {})).resolves.toBe(chosen)

    dialogs.queue({ response: 1 })

    await expect(invoke('dialog:message', { message: 'Synthetic' })).resolves.toBe(1)
    await expect(invoke('window-is-maximized')).resolves.toBe(false)
    await expect(invoke('log:open-folder')).resolves.toBeUndefined()
    expect(deps.openLogFolder).toHaveBeenCalledOnce()

    send('window-minimize')

    expect(win.minimize).toHaveBeenCalledOnce()

    send('window-maximize')

    expect(win.maximize).toHaveBeenCalledOnce()

    send('window-close')

    expect(win.close).toHaveBeenCalledOnce()

    send('log:set-level', true)

    expect(deps.setLogLevel).toHaveBeenCalledWith('debug')

    const channels = [...INVOKE_CHANNELS, ...SEND_CHANNELS]
    console.log(`channels tested ${driven.size}/${channels.length}`)

    expect(channels.length).toBeGreaterThan(0)
    expect(channels.filter((c) => !driven.has(c))).toEqual([])
    expect(ipc.handled).toEqual([...INVOKE_CHANNELS])
    expect(ipc.listened).toEqual([...SEND_CHANNELS])
  })

  it('declares the expected access class on every channel', () => {
    for (const channel of INVOKE_CHANNELS) {
      expect({ channel, access: handlers[channel].access }).toEqual({
        channel,
        access: EXPECTED_ACCESS[channel]
      })
    }
  })

  it('refuses a bad path on every guarded channel before its handler runs', async () => {
    const outside = dirname(project)
    const badPaths = ['js/plugins/x.js', `${project}/js/plugins/../../../x.json`]
    /** Each guarded channel's arguments with `p` where it takes its path */
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
    /** Channels whose bad path reached the handler, or was refused without one warning */
    const unguarded = new Set<string>()
    for (const channel of guarded) {
      const args = argsWith[channel]
      if (args === undefined) {
        unguarded.add(channel)
        continue
      }
      for (const bad of badPaths) {
        vi.mocked(log.warn).mockClear()
        runs.get(channel)!.mockClear()

        await expect(ipc.invoke(channel, ...args(bad))).rejects.toThrow(/^Invalid path: /)

        const warned = vi.mocked(log.warn).mock.calls.map((call) => String(call[0]))
        const refusedHere =
          runs.get(channel)!.mock.calls.length === 0 &&
          warned.length === 1 &&
          warned[0].startsWith(`[ipc] refused ${channel}: Invalid path: `)
        if (!refusedHere) unguarded.add(channel)
      }
    }
    console.log(`channels guarded ${guarded.length - unguarded.size}/${guarded.length}`)

    expect(guarded.length).toBeGreaterThan(0)
    expect([...unguarded]).toEqual([])
    expect(readdirSync(outside)).toEqual(['Fixture Game'])
    expect(existsSync(resolve('js'))).toBe(false)
    expect(existsSync(join(project, 'js', 'plugins', 'Synthetic_Bad.js'))).toBe(false)
  })
})
