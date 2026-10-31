// The project header scan that feeds the dependency analyzer, called through its IPC registration
// over a temporary project folder. It reads @base, @orderAfter and @orderBefore as the importer does.
import { mkdir, mkdtemp, rm, writeFile } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { IPC_CHANNELS } from '../../src/shared/ipc-types'
import type { ScannedPluginHeader } from '../../src/shared/ipc-types'
import { registerMainHandlers } from '../helpers/fake-ipc'

vi.mock('electron', () => ({ ipcMain: {} }))

let tmp: string

beforeEach(async () => {
  tmp = await mkdtemp(join(tmpdir(), 'scan-headers-'))
  await mkdir(join(tmp, 'js', 'plugins'), { recursive: true })
})

afterEach(async () => {
  await rm(tmp, { recursive: true, force: true })
})

/** Writes `files` into the project's plugins folder and runs the scan over it. */
async function scan(files: Record<string, string>): Promise<ScannedPluginHeader[]> {
  for (const [name, content] of Object.entries(files)) {
    await writeFile(join(tmp, 'js', 'plugins', name), content)
  }
  const ipc = registerMainHandlers()
  const results = (await ipc.invoke(IPC_CHANNELS.PLUGIN_SCAN_HEADERS, tmp)) as ScannedPluginHeader[]
  return results.sort((a, b) => a.filename.localeCompare(b.filename))
}

const order = (h: ScannedPluginHeader) => [h.filename, h.base, h.orderAfter, h.orderBefore]

it('reads load-order tags that start a line', async () => {
  const results = await scan({
    'Demo.js':
      '/*:\n * @target MZ\n * @base CoreLib\n * @orderAfter CoreLib\n * @orderBefore Last\n */\n',
    'Bare.js': '/*:\n@target MZ\n@base CoreLib\n*/\n'
  })
  expect(results.map(order)).toEqual([
    ['Bare.js', ['CoreLib'], [], []],
    ['Demo.js', ['CoreLib'], ['CoreLib'], ['Last']]
  ])
})

it('reads no dependency from help text, a guarded help line or an empty tag', async () => {
  const results = await scan({
    'Mention.js':
      '/*:\n * @target MZ\n * @help\n * Requires @base CoreLib, @orderAfter A and @orderBefore B\n */\n',
    'Guarded.js': '/*:\n * @target MZ\n * @help\n * ​@base CoreLib\n */\n',
    'Empty.js': '/*:\n * @base\n * @orderAfter\n * @orderBefore\n * @target MZ\n */\n'
  })
  expect(results.map(order)).toEqual([
    ['Empty.js', [], [], []],
    ['Guarded.js', [], [], []],
    ['Mention.js', [], [], []]
  ])
})
