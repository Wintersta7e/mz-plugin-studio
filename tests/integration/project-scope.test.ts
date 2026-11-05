// Which project the project file channels act on: only the one main loaded last, and main loads
// only a folder the user chose in the folder dialog or confirmed opening in a native message box.
// Each case starts from fresh main modules, as a new app session does; a user data folder kept
// between two sessions stands for a restart.
import { existsSync } from 'node:fs'
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path, { dirname, join } from 'node:path'
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type * as FileAccess from '../../src/main/file-access'
import type { DialogPort } from '../../src/main/ipc/handlers'
import {
  ACCESS_DENIED,
  INVOKE_CHANNELS,
  PROJECT_OPEN_CANCELLED,
  type InvokeChannel
} from '../../src/shared/ipc-types'
import { copyFixtureProject } from '../helpers/fixture-project'

vi.mock('electron', () => ({ ipcMain: {} }))

/**
Every filesystem call under a synthetic network host: on Windows looking one up sends the
user's credentials. Matched by the host name, as a posix join folds the leading `//`.
*/
const { NETWORK_HOST, networkCalls, renameFailures } = vi.hoisted(() => ({
  NETWORK_HOST: 'synthetic-host',
  networkCalls: [] as string[],
  /** Errors the next renames fail with, one each */
  renameFailures: [] as Error[]
}))
vi.mock('fs/promises', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>()
  const recorded = Object.entries(actual).map(([name, member]) => {
    if (typeof member !== 'function') return [name, member]
    const fn = member as (...args: unknown[]) => unknown
    return [
      name,
      (...args: unknown[]) => {
        if (typeof args[0] === 'string' && args[0].includes(NETWORK_HOST)) {
          networkCalls.push(`${name} ${args[0]}`)
        }
        const failure = name === 'rename' ? renameFailures.shift() : undefined
        return failure === undefined ? fn(...args) : Promise.reject(failure)
      }
    ]
  })
  return Object.fromEntries(recorded)
})

const PROJECT_CHANNELS = [
  'plugin:save',
  'plugin:load',
  'plugin:read-raw',
  'plugin:list',
  'plugin:scan-headers'
] as const

/** Each project channel's arguments on project folder `p` */
const callsOn = (p: string): Record<(typeof PROJECT_CHANNELS)[number], unknown[]> => ({
  'plugin:save': [p, 'Synthetic_Scope.js', '// scope\n', { base: null }],
  'plugin:load': [p, 'Fixture_HandWritten.js'],
  'plugin:read-raw': [p, 'Fixture_HandWritten.js'],
  'plugin:list': [p],
  'plugin:scan-headers': [p]
})

const CANCEL = 1

let checked = 0
let a: string
let b: string
const temps: string[] = []

/** Fresh main modules registered on a stand-in for `ipcMain`, the dialogs answering from queues */
async function session(userData?: string) {
  vi.resetModules()
  const access: typeof FileAccess = await import('../../src/main/file-access')
  const { registerMainHandlers } = await import('../helpers/fake-ipc')
  const log = (await import('electron-log/main')).default
  if (userData !== undefined) access.setProjectRootsDir(userData)
  const folders: string[] = []
  const responses: number[] = []
  const dialog = {
    showOpenDialog: vi.fn(async () => ({ canceled: false, filePaths: [folders.shift()] })),
    showMessageBox: vi.fn(async (_options: Record<string, unknown>) => {
      const response = responses.shift()
      if (response === undefined) throw new Error('unexpected message box')
      return { response, checkboxChecked: false }
    })
  }
  const ipc = registerMainHandlers(dialog as unknown as Partial<DialogPort>)
  return {
    access,
    ipc,
    dialog,
    log,
    /** The user picks `folder` in the Open Project dialog */
    choose: (folder: string) => {
      folders.push(folder)
      return ipc.invoke('dialog:open-folder')
    },
    /** The next confirm is answered with `response` */
    answer: (response: number) => responses.push(response)
  }
}

async function tempDir(prefix: string): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), prefix))
  temps.push(dir)
  return dir
}

const scopeFile = (project: string) => join(project, 'js', 'plugins', 'Synthetic_Scope.js')

beforeEach(async () => {
  a = await copyFixtureProject('Synthetic A')
  b = await copyFixtureProject('Synthetic B')
  temps.push(dirname(a), dirname(b))
})

afterEach(async () => {
  for (const dir of temps.splice(0)) await rm(dir, { recursive: true, force: true })
})

afterAll(() => {
  console.log(`project scope: channels checked ${checked}`)

  expect(checked).toBeGreaterThan(0)
})

describe('project scope', () => {
  it('names the five channels that act on the open project', async () => {
    const { createInvokeHandlers } = await import('../../src/main/ipc/handlers')
    const handlers = createInvokeHandlers({
      dialog: {} as DialogPort,
      getWindow: () => null,
      openLogFolder: async () => {},
      setLogLevel: () => {}
    })
    const scoped = INVOKE_CHANNELS.filter(
      (c: InvokeChannel) => handlers[c].access === 'current-project'
    )

    expect(scoped).toEqual([...PROJECT_CHANNELS])
  })

  it('refuses every project channel before a project is loaded, and writes nothing', async () => {
    const { ipc } = await session()
    for (const channel of PROJECT_CHANNELS) {
      checked++

      await expect(ipc.invoke(channel, ...callsOn(a)[channel])).rejects.toThrow(
        'Access denied: no project is open'
      )
    }

    expect(existsSync(scopeFile(a))).toBe(false)
  })

  it('acts on the project opened in the folder dialog and refuses another valid project', async () => {
    const { ipc, dialog, choose } = await session()
    await choose(a)
    await ipc.invoke('project:load', a)
    for (const channel of PROJECT_CHANNELS) {
      checked++

      await expect(ipc.invoke(channel, ...callsOn(a)[channel])).resolves.toBeTruthy()
      await expect(ipc.invoke(channel, ...callsOn(b)[channel])).rejects.toThrow(
        'Access denied: not the open project'
      )
    }

    expect(await readFile(scopeFile(a), 'utf8')).toBe('// scope\n')
    expect(existsSync(scopeFile(b))).toBe(false)
    expect(dialog.showMessageBox).not.toHaveBeenCalled()
  })

  it('refuses to load a folder that is not an RPG Maker MZ project and keeps the open one', async () => {
    const { ipc, dialog, choose } = await session()
    await choose(a)
    await ipc.invoke('project:load', a)
    const empty = await tempDir('project-scope-empty-')

    await expect(ipc.invoke('project:load', empty)).rejects.toThrow(
      'Access denied: not an RPG Maker MZ project folder'
    )

    await choose(empty)

    await expect(ipc.invoke('project:load', empty)).rejects.toThrow(
      'Access denied: not an RPG Maker MZ project folder'
    )
    expect(dialog.showMessageBox).not.toHaveBeenCalled()

    checked++

    expect(await ipc.invoke('plugin:list', a)).toContain('Fixture_HandWritten.js')
  })

  it('asks before loading a folder never chosen in the folder dialog, and Cancel loads nothing', async () => {
    const { ipc, dialog, choose, answer, access } = await session()
    await choose(b)
    await ipc.invoke('project:load', b)
    answer(CANCEL)

    await expect(ipc.invoke('project:load', a)).rejects.toThrow(
      `${ACCESS_DENIED}${PROJECT_OPEN_CANCELLED}`
    )
    expect(dialog.showMessageBox).toHaveBeenCalledTimes(1)

    const options = dialog.showMessageBox.mock.calls[0][0]

    expect(options).toMatchObject({
      buttons: ['Open', 'Cancel'],
      defaultId: CANCEL,
      cancelId: CANCEL
    })
    expect(String(options.detail)).toContain(a)
    // Folders opened before grants were kept, or dropped from the kept list, were chosen once
    expect(String(options.detail)).toContain('The app has no record of this folder being chosen')
    expect(String(options.detail)).not.toMatch(/was not chosen|never chosen/)
    expect(access.getCurrentProjectRoot()).toBe(path.resolve(b))

    checked++

    await expect(ipc.invoke('plugin:save', ...callsOn(a)['plugin:save'])).rejects.toThrow(
      'Access denied: not the open project'
    )
    expect(existsSync(scopeFile(a))).toBe(false)
    expect(await access.isProjectRootGranted(a)).toBe(false)
  })

  it('loads a folder the user confirms and does not ask again this session', async () => {
    const { ipc, dialog, answer } = await session()
    answer(0)
    const loaded = (await ipc.invoke('project:load', a)) as { path: string }

    expect(loaded.path).toBe(a)

    await ipc.invoke('project:load', a)

    expect(dialog.showMessageBox).toHaveBeenCalledTimes(1)

    checked++

    expect(await ipc.invoke('plugin:list', a)).toContain('Fixture_HandWritten.js')
  })

  it('keeps a folder chosen in the folder dialog granted after a restart', async () => {
    const userData = await tempDir('project-scope-user-data-')
    const first = await session(userData)
    await first.choose(a)
    const second = await session(userData)

    expect(second.access.getCurrentProjectRoot()).toBeNull()

    await second.ipc.invoke('project:load', a)

    expect(second.dialog.showMessageBox).not.toHaveBeenCalled()

    checked++

    expect(await second.ipc.invoke('plugin:list', a)).toContain('Fixture_HandWritten.js')

    const kept = JSON.parse(await readFile(join(userData, 'project-roots.json'), 'utf8'))

    expect(kept).toEqual({ roots: [path.resolve(a)] })
  })

  it('grants nothing from a missing or broken file of granted folders, and never fails on it', async () => {
    const userData = await tempDir('project-scope-user-data-')
    const missing = await session(userData)
    missing.answer(CANCEL)

    await expect(missing.ipc.invoke('project:load', a)).rejects.toThrow(/^Access denied: /)
    expect(missing.log.warn).not.toHaveBeenCalledWith(expect.stringMatching(/^\[file-access\]/))

    for (const broken of ['not json', '{"roots": "x"}', 'null']) {
      await writeFile(join(userData, 'project-roots.json'), broken)
      const s = await session(userData)
      s.answer(CANCEL)

      await expect(s.ipc.invoke('project:load', a)).rejects.toThrow(/^Access denied: /)
      expect(s.dialog.showMessageBox).toHaveBeenCalledTimes(1)
      expect(s.log.warn).toHaveBeenCalledWith(expect.stringMatching(/^\[file-access\] Ignoring /))
    }
  })

  it('keeps the most recently granted folders, each once', async () => {
    const userData = await tempDir('project-scope-user-data-')
    const { access } = await session(userData)
    const roots = Array.from({ length: access.MAX_PROJECT_ROOTS + 3 }, (_, i) =>
      path.resolve(`/Synthetic_Root_${i}`)
    )
    for (const root of roots) await access.recordProjectRoot(root)
    await access.recordProjectRoot(roots[5])
    const kept = JSON.parse(await readFile(join(userData, 'project-roots.json'), 'utf8')) as {
      roots: string[]
    }

    expect(kept.roots).toHaveLength(access.MAX_PROJECT_ROOTS)
    expect(kept.roots[0]).toBe(roots[5])
    expect(kept.roots[1]).toBe(roots[roots.length - 1])
    expect(new Set(kept.roots).size).toBe(kept.roots.length)
  })

  it('refuses a network folder not chosen in the folder dialog without looking it up', async () => {
    const { ipc, dialog } = await session()
    const network = `//${NETWORK_HOST}/share/Proj`
    networkCalls.length = 0

    await expect(ipc.invoke('project:validate', network)).rejects.toThrow(/^Access denied: /)
    await expect(ipc.invoke('project:load', network)).rejects.toThrow(/^Access denied: /)
    expect(networkCalls).toEqual([])
    expect(dialog.showMessageBox).not.toHaveBeenCalled()
  })

  it('looks up a network folder once it was chosen in the folder dialog', async () => {
    const { ipc, dialog, access } = await session()
    const network = `//${NETWORK_HOST}/share/Proj`
    await access.recordProjectRoot(network)
    networkCalls.length = 0

    await expect(ipc.invoke('project:validate', network)).resolves.toMatchObject({ valid: false })
    await expect(ipc.invoke('project:load', network)).rejects.toThrow(
      'Access denied: not an RPG Maker MZ project folder'
    )
    expect(networkCalls.length).toBeGreaterThan(0)
    expect(dialog.showMessageBox).not.toHaveBeenCalled()
  })

  it('keeps a granted folder when the system refuses saving the kept list for a moment', async () => {
    const userData = await tempDir('project-scope-user-data-')
    const { access, log } = await session(userData)
    const locked = Object.assign(new Error('EPERM: operation not permitted, rename'), {
      code: 'EPERM'
    })
    renameFailures.push(locked)
    await access.recordProjectRoot(a)

    expect(renameFailures).toEqual([])

    const kept = JSON.parse(await readFile(join(userData, 'project-roots.json'), 'utf8'))

    expect(kept).toEqual({ roots: [path.resolve(a)] })
    expect(log.warn).not.toHaveBeenCalled()
  })

  it('leaves a readable kept list and no temporary file when two app instances save at once', async () => {
    const userData = await tempDir('project-scope-user-data-')
    const first = await session(userData)
    const second = await session(userData)
    await Promise.all(
      Array.from({ length: 10 }, (_, i) => [
        first.access.recordProjectRoot(path.resolve(`/Synthetic_First_${i}`)),
        second.access.recordProjectRoot(path.resolve(`/Synthetic_Second_${i}`))
      ]).flat()
    )
    const kept = JSON.parse(await readFile(join(userData, 'project-roots.json'), 'utf8')) as {
      roots: string[]
    }

    expect(kept.roots.length).toBeGreaterThan(0)
    expect((await readdir(userData)).filter((name) => name.endsWith('.tmp'))).toEqual([])
    expect(first.log.warn).not.toHaveBeenCalled()
    expect(second.log.warn).not.toHaveBeenCalled()
  })

  it('compares the open project case-insensitively on win32', async () => {
    const { access } = await session()
    access.setCurrentProjectRoot('C:\\Games\\Proj', path.win32)
    checked++

    expect(() => access.authorize('current-project', 'c:\\games\\PROJ', path.win32)).not.toThrow()
    expect(() => access.authorize('current-project', 'C:\\Games\\Proj\\', path.win32)).not.toThrow()
    expect(() => access.authorize('current-project', 'C:\\Games\\Proj2', path.win32)).toThrow(
      'Access denied: not the open project'
    )
  })
})
