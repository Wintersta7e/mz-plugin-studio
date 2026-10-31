// Where each file dialog opens: the folder the renderer suggests when it is safe and still there,
// else the folder the same kind of dialog last chose this session, else the app's own default.
import path from 'path'
import { afterAll, describe, expect, it } from 'vitest'
import {
  dialogKind,
  resolveDialogDefaultPath,
  type DialogDefaultRequest
} from '../../src/main/ipc/dialog'

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
    directoryExists: (dir) => existing.includes(dir),
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
    ['no file name: the folder alone', { lastDirectory: '/work/out' }, '/work/out'],
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

  it.each(save)('save: %s', (_label, partial, expected) => {
    rows++
    expect(resolveDialogDefaultPath(request(partial), path.posix)).toBe(expected)
  })

  it('opens the folder dialog beside the most recent project when its parent exists', () => {
    rows++
    const seed = { channel: 'open-folder', rendererValue: '/work/Games/Proj' } as const
    expect(resolveDialogDefaultPath(request(seed, ['/work/Games']), path.posix)).toBe('/work/Games')
  })

  it('falls back to the folder last chosen, then to none, when that parent is gone', () => {
    rows += 2
    const seed = { channel: 'open-folder', rendererValue: '/work/Games/Proj' } as const
    expect(
      resolveDialogDefaultPath(request({ ...seed, lastDirectory: '/work/Other' }), path.posix)
    ).toBe('/work/Other')
    expect(resolveDialogDefaultPath(request(seed), path.posix)).toBeUndefined()
  })

  it('opens the file dialog in the suggested folder, else the one last chosen', () => {
    rows += 3
    const open = { channel: 'open-file' } as const
    expect(
      resolveDialogDefaultPath(
        request({ ...open, rendererValue: '/work/params', lastDirectory: '/work/last' }),
        path.posix
      )
    ).toBe('/work/params')
    expect(
      resolveDialogDefaultPath(request({ ...open, lastDirectory: '/work/last' }), path.posix)
    ).toBe('/work/last')
    expect(resolveDialogDefaultPath(request(open), path.posix)).toBeUndefined()
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
