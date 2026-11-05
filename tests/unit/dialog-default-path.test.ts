// Where each file dialog opens: the folder the renderer suggests when it is safe and still there,
// else the folder the same kind of dialog last chose while it is still there, else the app's own
// default. The folder check is awaited, so a slow drive never holds up the main process.
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'path'
import type {
  MessageBoxReturnValue,
  OpenDialogOptions,
  OpenDialogReturnValue,
  SaveDialogOptions,
  SaveDialogReturnValue
} from 'electron'
import { afterAll, describe, expect, it, vi } from 'vitest'
import {
  checkDialogFolder,
  createDialogHandlers,
  dialogKind,
  resolveDialogDefaultPath,
  type DialogDefaultRequest
} from '../../src/main/ipc/dialog'
import type { Handler } from '../../src/main/ipc/registration'
import type { InvokeChannel } from '../../src/shared/ipc-types'

let rows = 0

type Row = [label: string, request: Partial<DialogDefaultRequest>, expected: string | undefined]

const KIND = {
  'open-folder': 'open-folder',
  'open-file': 'open-file:.mzparams',
  'save-file': 'save-file:.js'
} as const

/** A request with nothing set but the channel; `existing` lists the folders that exist */
function request(
  partial: Partial<DialogDefaultRequest>,
  existing: readonly string[] = []
): DialogDefaultRequest {
  const channel = partial.channel ?? 'save-file'
  return {
    channel,
    kind: KIND[channel],
    rendererValue: undefined,
    lastDirectory: undefined,
    projectRoot: null,
    directoryExists: async (dir) => existing.includes(dir),
    ...partial
  }
}

afterAll(() => {
  console.log(`dialog defaults: rows ${rows}`)

  expect(rows).toBeGreaterThan(0)
})

describe('dialog default path', () => {
  const save: Row[] = [
    [
      'a file name opens in the folder last chosen for its kind',
      {
        kind: 'save-file:.mzparams',
        rendererValue: 'Plugin.mzparams',
        lastDirectory: '/work/exports'
      },
      '/work/exports/Plugin.mzparams'
    ],
    [
      'a file name alone when no folder is known',
      { kind: 'save-file:.mzparams', rendererValue: 'Plugin.mzparams' },
      'Plugin.mzparams'
    ],
    [
      "a plugin opens in the open project's plugins folder",
      { rendererValue: 'MyPlugin.js', projectRoot: '/work/Game', lastDirectory: '/work/out' },
      '/work/Game/js/plugins/MyPlugin.js'
    ],
    [
      'a plugin without a project opens in the folder last chosen',
      { rendererValue: 'MyPlugin.js', lastDirectory: '/work/out' },
      '/work/out/MyPlugin.js'
    ],
    [
      'a file name alone when the folder last chosen is gone',
      { rendererValue: 'MyPlugin.js', lastDirectory: '/work/gone' },
      'MyPlugin.js'
    ],
    ['no file name: the folder alone', { lastDirectory: '/work/out' }, '/work/out'],
    [
      'no file name and the folder last chosen is gone: no default',
      { lastDirectory: '/work/gone' },
      undefined
    ],
    ['nothing known: no default', {}, undefined],
    [
      'a full path the renderer asks again at stays as it is',
      {
        rendererValue: '/work/Other/js/plugins/MyPlugin.js',
        projectRoot: '/work/Game',
        lastDirectory: '/work/out'
      },
      '/work/Other/js/plugins/MyPlugin.js'
    ],
    [
      "another kind never opens in the project's plugins folder",
      { kind: 'save-file:.md', rendererValue: 'Plugin_README.md', projectRoot: '/work/Game' },
      'Plugin_README.md'
    ]
  ]

  it.each(save)('save: %s', async (_label, partial, expected) => {
    rows++
    const existing = ['/work/exports', '/work/out']

    expect(await resolveDialogDefaultPath(request(partial, existing), path.posix)).toBe(expected)
  })

  it('opens the folder dialog beside the most recent project when its parent exists', async () => {
    rows++
    const seed = { channel: 'open-folder', rendererValue: '/work/Games/Proj' } as const

    expect(await resolveDialogDefaultPath(request(seed, ['/work/Games']), path.posix)).toBe(
      '/work/Games'
    )
  })

  it('falls back to the folder last chosen while it exists, then to none, when that parent is gone', async () => {
    rows += 3
    const seed = { channel: 'open-folder', rendererValue: '/work/Games/Proj' } as const
    const last = { ...seed, lastDirectory: '/work/Other' }

    expect(await resolveDialogDefaultPath(request(last, ['/work/Other']), path.posix)).toBe(
      '/work/Other'
    )
    expect(await resolveDialogDefaultPath(request(last), path.posix)).toBeUndefined()
    expect(await resolveDialogDefaultPath(request(seed), path.posix)).toBeUndefined()
  })

  it('waits for a slow folder check and keeps it from blocking other work', async () => {
    rows++
    const checks: ((exists: boolean) => void)[] = []
    const slow = request({
      channel: 'open-folder',
      rendererValue: '/work/Games/Proj',
      lastDirectory: '/work/Other',
      directoryExists: () => new Promise<boolean>((resolve) => checks.push(resolve))
    })
    const resolved = resolveDialogDefaultPath(slow, path.posix)
    // Other work runs while the check is still out
    let ran = false
    await new Promise<void>((resolve) =>
      setTimeout(() => {
        ran = true
        resolve()
      }, 0)
    )

    expect(ran).toBe(true)
    expect(checks).toHaveLength(1)

    checks[0](false)
    // Then the folder last chosen is checked the same way
    await vi.waitFor(() => expect(checks).toHaveLength(2))
    checks[1](true)

    expect(await resolved).toBe('/work/Other')
  })

  const open: Row[] = [
    [
      'the folder last chosen for its kind',
      { lastDirectory: '/work/last', projectRoot: '/work/Game' },
      '/work/last'
    ],
    ['the folder last chosen is gone: no default', { lastDirectory: '/work/gone' }, undefined],
    ['nothing known: no default', {}, undefined],
    [
      "a plugin opens in the open project's plugins folder",
      { kind: 'open-file:.js', projectRoot: '/work/Game' },
      '/work/Game/js/plugins'
    ],
    [
      "a plugin opens in the project's plugins folder before the folder last chosen",
      { kind: 'open-file:.js', projectRoot: '/work/Game', lastDirectory: '/work/out' },
      '/work/Game/js/plugins'
    ],
    [
      'no plugins folder in the project: the folder last chosen',
      { kind: 'open-file:.js', projectRoot: '/work/Bare', lastDirectory: '/work/out' },
      '/work/out'
    ],
    [
      'no plugins folder in the project and the folder last chosen is gone: no default',
      { kind: 'open-file:.js', projectRoot: '/work/Bare', lastDirectory: '/work/gone' },
      undefined
    ],
    [
      'no plugins folder in the project: no default',
      { kind: 'open-file:.js', projectRoot: '/work/Bare' },
      undefined
    ],
    [
      "another kind never opens in the project's plugins folder",
      { projectRoot: '/work/Game' },
      undefined
    ]
  ]

  it.each(open)('open: %s', async (_label, partial, expected) => {
    rows++
    const existing = ['/work/Game/js/plugins', '/work/Bare', '/work/last', '/work/out']

    expect(
      await resolveDialogDefaultPath(
        request({ channel: 'open-file', ...partial }, existing),
        path.posix
      )
    ).toBe(expected)
  })

  it.each([
    ['open-folder', undefined, 'open-folder'],
    ['open-folder', [{ name: 'n', extensions: ['js'] }], 'open-folder'],
    ['open-file', [{ name: 'MZ Parameters', extensions: ['mzparams'] }], 'open-file:.mzparams'],
    ['open-file', undefined, 'open-file:.js'],
    ['save-file', undefined, 'save-file:.js'],
    ['save-file', [{ name: 'TypeScript Declaration', extensions: ['d.ts'] }], 'save-file:.d.ts'],
    [
      'save-file',
      [
        { name: 'JSON', extensions: ['json', 'js'] },
        { name: 'Markdown', extensions: ['md'] }
      ],
      'save-file:.json'
    ]
  ] as const)('kind of %s with filters %j is %s', (channel, filters, expected) => {
    rows++

    expect(dialogKind(channel, filters)).toBe(expected)
  })
})

describe('dialog folders kept across restarts', () => {
  // A drive or filesystem root is kept, though a project may not be one; network, device and
  // relative paths never are
  it.each([
    ['win32', 'D:\\', true],
    ['win32', 'd:/', true],
    ['win32', 'D:\\Games', true],
    ['win32', 'D:', false],
    ['win32', '\\', false],
    ['win32', '/', false],
    ['win32', '\\\\server\\share\\', false],
    ['win32', '\\\\server\\share\\Games', false],
    ['win32', '\\\\?\\D:\\', false],
    ['win32', '\\\\.\\D:\\', false],
    ['win32', '\\??\\D:\\', false],
    ['win32', 'Games', false],
    ['posix', '/', true],
    ['posix', '/work', true],
    ['posix', '//server/share', false],
    ['posix', 'work', false],
    ['posix', '/\0', false]
  ] as const)('%s %j is kept: %s', (platform, folder, kept) => {
    rows++

    expect(checkDialogFolder(folder, path[platform])).toBe(kept ? folder : undefined)
  })
})

/**
Runs the handler on `raw` after its argument check, as the IPC registration does
*/
async function invoke<C extends InvokeChannel>(handler: Handler<C>, raw: unknown): Promise<void> {
  await handler.run(...handler.check([raw]))
}

/**
The options of every dialog the channel showed for `raw`, each dialog cancelled
*/
async function shown(
  channel: 'dialog:save-file' | 'dialog:open-folder' | 'dialog:open-file',
  raw: unknown
): Promise<unknown[]> {
  const showOpenDialog = vi
    .fn<(options: OpenDialogOptions) => Promise<OpenDialogReturnValue>>()
    .mockResolvedValue({ canceled: true, filePaths: [] })
  const showSaveDialog = vi
    .fn<(options: SaveDialogOptions) => Promise<SaveDialogReturnValue>>()
    .mockResolvedValue({ canceled: true, filePath: '' })
  const showMessageBox = vi
    .fn<() => Promise<MessageBoxReturnValue>>()
    .mockResolvedValue({ response: 0, checkboxChecked: false })
  const handlers = createDialogHandlers({ showOpenDialog, showSaveDialog, showMessageBox })
  await invoke(handlers[channel], raw)
  return [...showOpenDialog.mock.calls, ...showSaveDialog.mock.calls].map(([options]) => options)
}

describe('the options each dialog opens with', () => {
  // Through the handlers, with no project open and no folder chosen before: the whole options
  // object the dialog receives, for a renderer default path that is absent, kept and dropped
  const JS = [{ name: 'JavaScript', extensions: ['js'] }]
  const SAVE = { filters: JS, properties: ['showOverwriteConfirmation'] }
  const FOLDER = { properties: ['openDirectory'], title: 'Select RPG Maker MZ Project Folder' }
  const FILE = { properties: ['openFile'], filters: JS }

  it('save: no default path without one from the renderer', async () => {
    expect.assertions(1)
    await expect(shown('dialog:save-file', {})).resolves.toStrictEqual([SAVE])
  })

  it('save: a file name or a full path from the renderer is the default path', async () => {
    expect.assertions(2)

    const full = path.join(tmpdir(), 'MyPlugin.js')

    await expect(shown('dialog:save-file', { defaultPath: 'MyPlugin.js' })).resolves.toStrictEqual([
      { defaultPath: 'MyPlugin.js', ...SAVE }
    ])
    await expect(shown('dialog:save-file', { defaultPath: full })).resolves.toStrictEqual([
      { defaultPath: full, ...SAVE }
    ])
  })

  it.each([
    ['a network path', '\\\\host\\share\\MyPlugin.js'],
    ['a relative path', '../MyPlugin.js'],
    ['a file type that cannot be saved', 'MyPlugin.exe'],
    ['a value that is not text', 5]
  ])('save: %s from the renderer is dropped', async (_label, defaultPath) => {
    expect.assertions(1)
    await expect(shown('dialog:save-file', { defaultPath })).resolves.toStrictEqual([SAVE])
  })

  it('folder: no default path without one from the renderer', async () => {
    expect.assertions(1)
    await expect(shown('dialog:open-folder', {})).resolves.toStrictEqual([FOLDER])
  })

  it("folder: the renderer's project opens the dialog in its parent folder", async () => {
    expect.assertions(1)

    const parent = await mkdtemp(path.join(tmpdir(), 'dialog-options-'))
    try {
      await expect(
        shown('dialog:open-folder', { defaultPath: path.join(parent, 'Proj') })
      ).resolves.toStrictEqual([{ defaultPath: parent, ...FOLDER }])
    } finally {
      await rm(parent, { recursive: true, force: true })
    }
  })

  it.each([
    ['a relative path', 'Games/Proj'],
    ['a network path', '\\\\host\\share\\Proj'],
    ['a value that is not text', 5]
  ])('folder: %s from the renderer is dropped', async (_label, defaultPath) => {
    expect.assertions(1)
    await expect(shown('dialog:open-folder', { defaultPath })).resolves.toStrictEqual([FOLDER])
  })

  it.each([
    ['absent', {}],
    ['a full path', { defaultPath: path.join(tmpdir(), 'MyPlugin.js') }],
    ['a network path', { defaultPath: '\\\\host\\share\\MyPlugin.js' }]
  ])('file: a renderer default path %s never reaches the dialog', async (_label, raw) => {
    expect.assertions(1)
    await expect(shown('dialog:open-file', raw)).resolves.toStrictEqual([FILE])
  })
})
