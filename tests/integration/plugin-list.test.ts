// The list of a project's plugin files, called through its IPC registration over a temporary
// project folder: a missing plugins folder holds no plugins, any other failure to list it is an error.
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { setCurrentProjectRoot } from '../../src/main/file-access'
import { IPC_CHANNELS } from '../../src/shared/ipc-types'
import { registerMainHandlers } from '../helpers/fake-ipc'

vi.mock<{ ipcMain: object }>(import('electron'), () => ({ ipcMain: {} }))

/**
Project folders the running test made, removed after it
*/
const made = new Set<string>()

/**
A fresh project folder holding only `js/`, opened as the current project
*/
async function freshProject(): Promise<string> {
  const project = await mkdtemp(path.join(tmpdir(), 'plugin-list-'))
  made.add(project)
  await mkdir(path.join(project, 'js'))
  setCurrentProjectRoot(project)
  return project
}

const isList = (value: unknown): value is readonly unknown[] => Array.isArray(value)

function isNameList(value: unknown): value is string[] {
  return isList(value) && value.every((entry) => typeof entry === 'string')
}

async function list(projectPath: string): Promise<string[]> {
  const answer = await registerMainHandlers().invoke(IPC_CHANNELS.PLUGIN_LIST, projectPath)
  if (!isNameList(answer)) throw new TypeError('the list did not answer file names')
  return answer.toSorted((a, b) => a.localeCompare(b))
}

describe('listing a project’s plugins', () => {
  afterEach(async () => {
    for (const project of made) await rm(project, { recursive: true, force: true })
    made.clear()
  })

  it('answers no files when the project has no plugins folder', async () => {
    expect.assertions(1)

    await expect(list(await freshProject())).resolves.toStrictEqual([])
  })

  it('fails when the plugins folder is a file', async () => {
    expect.assertions(1)

    const root = await freshProject()
    await writeFile(path.join(root, 'js', 'plugins'), 'not a folder\n')

    await expect(list(root)).rejects.toThrow('ENOTDIR')
  })

  it('answers the folder’s .js files without the ones starting with an underscore', async () => {
    expect.assertions(1)

    const root = await freshProject()
    const plugins = path.join(root, 'js', 'plugins')
    await mkdir(plugins)
    for (const name of ['Beta.js', 'Alpha.js', '_Disabled.js', 'notes.txt']) {
      await writeFile(path.join(plugins, name), '// plugin\n')
    }

    await expect(list(root)).resolves.toStrictEqual(['Alpha.js', 'Beta.js'])
  })
})
