// The project header scan that feeds the dependency analyzer, called through its IPC registration
// over a temporary project folder. It reads @base, @orderAfter and @orderBefore as the importer does.
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { setCurrentProjectRoot } from '../../src/main/file-access'
import { IPC_CHANNELS, type ScannedPluginHeader } from '../../src/shared/ipc-types'
import { registerMainHandlers } from '../helpers/fake-ipc'

vi.mock<{ ipcMain: object }>(import('electron'), () => ({ ipcMain: {} }))

/**
Project folders the running test made, removed after it
*/
const projects: string[] = []

async function removeProjects(): Promise<void> {
  for (const project of projects.splice(0)) await rm(project, { recursive: true, force: true })
}

function isHeader(value: unknown): value is ScannedPluginHeader {
  return (
    typeof value === 'object' &&
    value !== null &&
    'filename' in value &&
    typeof value.filename === 'string'
  )
}

function isList(value: unknown): value is readonly unknown[] {
  return Array.isArray(value)
}

function isHeaderList(value: unknown): value is ScannedPluginHeader[] {
  return isList(value) && value.every((entry) => isHeader(entry))
}

/**
Writes `files` into a fresh project's plugins folder and runs the scan over it
*/
async function scan(files: Record<string, string>): Promise<ScannedPluginHeader[]> {
  const project = await mkdtemp(path.join(tmpdir(), 'scan-headers-'))
  projects.push(project)
  await mkdir(path.join(project, 'js', 'plugins'), { recursive: true })
  for (const [name, content] of Object.entries(files)) {
    await writeFile(path.join(project, 'js', 'plugins', name), content)
  }
  const ipc = registerMainHandlers()
  // The scan acts only on the open project; this folder holds plugins only, so it is set directly
  setCurrentProjectRoot(project)
  const results = await ipc.invoke(IPC_CHANNELS.PLUGIN_SCAN_HEADERS, project)
  if (!isHeaderList(results)) throw new Error('the scan did not answer a list of plugin headers')
  return results.toSorted((a, b) => a.filename.localeCompare(b.filename))
}

const order = (h: ScannedPluginHeader) => [h.filename, h.base, h.orderAfter, h.orderBefore]

describe('scan headers', () => {
  afterEach(removeProjects)

  it('reads load-order tags that start a line', async () => {
    expect.assertions(1)

    const results = await scan({
      'Demo.js':
        '/*:\n * @target MZ\n * @base CoreLib\n * @orderAfter CoreLib\n * @orderBefore Last\n */\n',
      'Bare.js': '/*:\n@target MZ\n@base CoreLib\n*/\n'
    })

    expect(results.map((header) => order(header))).toStrictEqual([
      ['Bare.js', ['CoreLib'], [], []],
      ['Demo.js', ['CoreLib'], ['CoreLib'], ['Last']]
    ])
  })

  it('reads no dependency from help text, a guarded help line or an empty tag', async () => {
    expect.assertions(1)

    const results = await scan({
      'Mention.js':
        '/*:\n * @target MZ\n * @help\n * Requires @base CoreLib, @orderAfter A and @orderBefore B\n */\n',
      'Guarded.js': '/*:\n * @target MZ\n * @help\n * \u{200B}@base CoreLib\n */\n',
      'Empty.js': '/*:\n * @base\n * @orderAfter\n * @orderBefore\n * @target MZ\n */\n'
    })

    expect(results.map((header) => order(header))).toStrictEqual([
      ['Empty.js', [], [], []],
      ['Guarded.js', [], [], []],
      ['Mention.js', [], [], []]
    ])
  })
})
