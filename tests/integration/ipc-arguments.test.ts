// The argument check of every channel: a value of the wrong shape is refused before the handler
// runs, or dropped where the channel has a safe default; a valid value passes as a fresh copy.
import { mkdtempSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import path, { join } from 'path'
import log from 'electron-log/main'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createInvokeHandlers, createSendListeners } from '../../src/main/ipc/handlers'
import type { DialogPort, MainDeps, WindowPort } from '../../src/main/ipc/handlers'
import { handleAll, onAll } from '../../src/main/ipc/registration'
import { INVOKE_CHANNELS, type InvokeChannel, type SendChannel } from '../../src/shared/ipc-types'
import { createAppPage, createFakeRegistrar } from '../helpers/fake-ipc'

vi.mock('electron', () => ({ ipcMain: {} }))

const showMessageBox = vi.fn(async (_options: unknown) => ({ response: 1 }))
const showSaveDialog = vi.fn(async (_options: unknown) => ({ canceled: true, filePath: '' }))
const deps: MainDeps = {
  dialog: {
    showOpenDialog: vi.fn(async () => ({ canceled: true, filePaths: [] })),
    showSaveDialog,
    showMessageBox
  } as unknown as DialogPort,
  getWindow: () => null as WindowPort | null,
  openLogFolder: vi.fn(async () => {}),
  setLogLevel: vi.fn()
}
const handlers = createInvokeHandlers(deps)
const listeners = createSendListeners(deps)
const runs = new Map(INVOKE_CHANNELS.map((c) => [c, vi.spyOn(handlers[c], 'run')] as const))
const page = createAppPage()
const ipc = createFakeRegistrar(page.frame)
handleAll(handlers, page.isTrustedSender, ipc.registrar)
onAll(listeners, page.isTrustedSender, ipc.registrar)

let cases = 0

beforeEach(() => {
  vi.mocked(log.warn).mockClear()
  for (const spy of runs.values()) spy.mockClear()
})

/** The channel refuses `args` through the wrapper, logs it once and never runs its handler */
async function refuses(channel: InvokeChannel, ...args: unknown[]): Promise<void> {
  cases++
  vi.mocked(log.warn).mockClear()
  await expect(ipc.invoke(channel, ...args)).rejects.toThrow(`Invalid arguments: ${channel}`)
  expect(runs.get(channel)).not.toHaveBeenCalled()
  expect(vi.mocked(log.warn).mock.calls).toEqual([
    [`[ipc] refused ${channel}: Invalid arguments: ${channel}`]
  ])
}

/** The channel's check turns `args` into `expected` */
function passes(channel: InvokeChannel, args: unknown[], expected: unknown[]): void {
  cases++
  expect(handlers[channel].check(args)).toEqual(expected)
}

function listens(channel: SendChannel, args: unknown[], expected: unknown[]): void {
  cases++
  expect(listeners[channel].check(args)).toEqual(expected)
}

const base = { path: '/p/js/plugins/a.js', sha256: null }

describe('ipc arguments', () => {
  it('takes one string on the project, list, scan, read-by-path and parse channels', async () => {
    for (const channel of [
      'project:validate',
      'project:load',
      'plugin:list',
      'plugin:scan-headers',
      'plugin:read-by-path'
    ] as const) {
      await refuses(channel, 42)
      await refuses(channel)
      passes(channel, ['/p', 'extra'], ['/p'])
    }
    await refuses('plugin:parse', 42)
    passes('plugin:parse', ['/*: */'], ['/*: */'])
  })

  it('takes two strings on load and read-raw', async () => {
    for (const channel of ['plugin:load', 'plugin:read-raw'] as const) {
      await refuses(channel, '/p')
      await refuses(channel, '/p', 3)
      passes(channel, ['/p', 'a.js'], ['/p', 'a.js'])
    }
  })

  it('requires a save guard on save and checks its shape', async () => {
    await refuses('plugin:save', '/p', 'a.js', 'code')
    await refuses('plugin:save', '/p', 'a.js', 'code', null)
    await refuses('plugin:save', '/p', 'a.js', 'code', {})
    await refuses('plugin:save', '/p', 'a.js', 'code', { base: { path: 1, sha256: null } })
    await refuses('plugin:save', '/p', 'a.js', 'code', { base: { path: '/p/a.js', sha256: 5 } })
    await refuses('plugin:save', '/p', 'a.js', 'code', { base: null, overwriteBroken: 'yes' })
    await refuses('plugin:save', '/p', 'a.js', 7, { base: null })
    passes('plugin:save', ['/p', 'a.js', 'code', { base }], ['/p', 'a.js', 'code', { base }])
    passes(
      'plugin:save',
      ['/p', 'a.js', 'code', { base: null, overwriteBroken: true }],
      ['/p', 'a.js', 'code', { base: null, overwriteBroken: true }]
    )
    const extra = { base: { ...base, size: 3 }, force: ['changed-on-disk'] }
    const [, , , guard] = handlers['plugin:save'].check(['/p', 'a.js', 'code', extra])
    cases++
    expect(guard).toStrictEqual({ base })
  })

  it('takes an optional save guard on save-to-path', async () => {
    passes('plugin:save-to-path', ['/p/a.js', 'code'], ['/p/a.js', 'code'])
    passes('plugin:save-to-path', ['/p/a.js', 'code', { base }], ['/p/a.js', 'code', { base }])
    await refuses('plugin:save-to-path', '/p/a.js', 'code', null)
    await refuses('plugin:save-to-path', '/p/a.js', 'code', { base: { path: 1 } })
    await refuses('plugin:save-to-path', '/p/a.js')
  })

  it('never logs the content of a refused request', async () => {
    const secret = 'Synthetic content that stays out of the log'
    await refuses('plugin:save', '/p', 'a.js', secret, { base: { path: 1 } })
    expect(JSON.stringify(vi.mocked(log.warn).mock.calls)).not.toContain(secret)
  })

  it('checks message dialog options', async () => {
    await refuses('dialog:message', 'Synthetic')
    await refuses('dialog:message', {})
    await refuses('dialog:message', { message: 'm', buttons: [] })
    await refuses('dialog:message', { message: 'm', buttons: ['1', '2', '3', '4', '5'] })
    await refuses('dialog:message', { message: 'm', buttons: ['OK', 2] })
    await refuses('dialog:message', { message: 'm', defaultId: 1 })
    await refuses('dialog:message', { message: 'm', defaultId: 0.5 })
    await refuses('dialog:message', { message: 'm', buttons: ['A', 'B'], cancelId: -1 })
    await refuses('dialog:message', { message: 'm', type: 'fatal' })
    await refuses('dialog:message', { message: 'm', title: 3 })
    passes('dialog:message', [{ message: 'm', icon: 'x' }], [{ message: 'm' }])

    cases++
    showMessageBox.mockClear()
    const options = { message: 'm', buttons: ['Overwrite', 'Cancel'], defaultId: 1, cancelId: 1 }
    await expect(ipc.invoke('dialog:message', options)).resolves.toBe(1)
    expect(showMessageBox).toHaveBeenCalledWith(
      expect.objectContaining({ buttons: ['Overwrite', 'Cancel'], defaultId: 1, cancelId: 1 })
    )
  })

  it('reduces save and open dialog options to what they may carry', async () => {
    const filters = [{ name: 'JavaScript', extensions: ['js'] }]
    passes('dialog:save-file', ['x'], [{}])
    passes('dialog:save-file', [], [{}])
    passes('dialog:save-file', [{ defaultPath: 5 }], [{}])
    passes(
      'dialog:save-file',
      [{ defaultPath: 'a.js', filters }],
      [{ defaultPath: 'a.js', filters }]
    )
    passes('dialog:save-file', [{ filters: [{ name: 'n', extensions: [1] }] }], [{}])
    passes('dialog:save-file', [{ filters: 'js' }], [{}])
    passes('dialog:open-file', [null], [{}])

    for (const defaultPath of ['../x.js', '\\\\server\\share\\x.js', '//server/share/x.js']) {
      passes('dialog:save-file', [{ defaultPath, filters }], [{ filters }])
    }
    passes('dialog:save-file', [{ defaultPath: 'Plugin.js' }], [{ defaultPath: 'Plugin.js' }])
    // Save asks again at a full path: the folder of the file it last chose
    const remembered = path.resolve('/work/Games/Proj/js/plugins/Synthetic_Plugin.js')
    passes('dialog:save-file', [{ defaultPath: remembered }], [{ defaultPath: remembered }])
    passes('dialog:save-file', [{ defaultPath: path.resolve('/work/Games/Proj') }], [{}])

    const ext = (extensions: string[]): unknown => [{ name: 'n', extensions }]
    for (const rejected of [
      Array.from({ length: 5 }, () => filters[0]),
      [{ name: 'n'.repeat(65), extensions: ['js'] }],
      ext(['exe']),
      ext(['js', 'ts', 'md', 'json', 'mzparams']),
      ext(['j*s']),
      ext([]),
      ext(['x'.repeat(14) + '.js'])
    ]) {
      passes('dialog:save-file', [{ filters: rejected }], [{}])
      passes('dialog:open-file', [{ filters: rejected }], [{}])
    }
    const declarations = [{ name: 'Type declarations', extensions: ['d.ts'] }]
    passes('dialog:save-file', [{ filters: declarations }], [{ filters: declarations }])
    const four = [
      { name: 'n'.repeat(64), extensions: ['js', 'ts', 'md', 'json'] },
      { name: 'MZ Parameters', extensions: ['mzparams'] },
      { name: 'JSON', extensions: ['JSON'] },
      { name: 'Markdown', extensions: ['md'] }
    ]
    passes('dialog:open-file', [{ filters: four }], [{ filters: four }])

    cases++
    showSaveDialog.mockClear()
    await ipc.invoke('dialog:save-file', { defaultPath: '\\\\server\\share\\x.js' })
    expect(showSaveDialog.mock.calls[0][0]).toEqual(
      expect.not.objectContaining({ defaultPath: expect.anything() })
    )

    cases++
    showSaveDialog.mockClear()
    await expect(ipc.invoke('dialog:save-file', { filters: [{ name: 1 }] })).resolves.toBeNull()
    expect(showSaveDialog).toHaveBeenCalledWith(
      expect.objectContaining({ filters: [{ name: 'JavaScript', extensions: ['js'] }] })
    )
  })

  it('keeps a safe start folder on the open dialogs and drops any other', () => {
    const folder = mkdtempSync(join(tmpdir(), 'dialog-seed-'))
    try {
      const filters = [{ name: 'MZ Parameters', extensions: ['mzparams'] }]
      for (const rejected of [
        '\\\\server\\share\\Proj',
        '//server/share/Proj',
        'Games/Proj',
        'Proj',
        `${folder}/../Proj`,
        path.parse(folder).root,
        7
      ]) {
        passes('dialog:open-folder', [{ defaultPath: rejected }], [{}])
        passes('dialog:open-file', [{ defaultPath: rejected, filters }], [{ filters }])
      }
      passes('dialog:open-folder', [{ defaultPath: folder }], [{ defaultPath: folder }])
      passes('dialog:open-folder', [{ defaultPath: folder, title: 'x' }], [{ defaultPath: folder }])
      passes('dialog:open-folder', ['/p'], [{}])
      passes('dialog:open-folder', [], [{}])
      passes('dialog:open-file', [{ defaultPath: folder }], [{ defaultPath: folder }])
      passes(
        'dialog:open-file',
        [{ defaultPath: folder, filters }],
        [{ defaultPath: folder, filters }]
      )
    } finally {
      rmSync(folder, { recursive: true, force: true })
    }
  })

  it('ignores extra arguments on the channels that take none', () => {
    passes('window-is-maximized', [1], [])
    passes('log:open-folder', [1], [])
    listens('window-minimize', ['x'], [])
    listens('window-maximize', ['x'], [])
    listens('window-close', ['x'], [])
  })

  it('turns on debug logging only for true', () => {
    for (const [value, level] of [
      ['yes', 'info'],
      [1, 'info'],
      [true, 'debug']
    ] as const) {
      cases++
      vi.mocked(deps.setLogLevel).mockClear()
      ipc.send('log:set-level', value)
      expect(deps.setLogLevel).toHaveBeenCalledExactlyOnceWith(level)
    }
    listens('log:set-level', ['yes'], [false])
  })

  it('counts its cases', () => {
    console.log(`argument cases ${cases}`)
    expect(cases).toBeGreaterThan(0)
  })
})
