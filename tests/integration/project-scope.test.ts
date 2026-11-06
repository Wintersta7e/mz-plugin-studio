// Which project the project file channels act on: only the one main loaded last, and main loads
// only a folder the user chose in the folder dialog or confirmed opening in a native message box.
// Each case starts from fresh main modules, as a new app session does; a user data folder kept
// between two sessions stands for a restart.
import { existsSync } from 'node:fs'
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import type { MessageBoxReturnValue, OpenDialogReturnValue, SaveDialogReturnValue } from 'electron'
import { afterAll, afterEach, describe, expect, it, vi } from 'vitest'
import type * as FileAccess from '../../src/main/file-access'
import type { MainDependencies } from '../../src/main/ipc/handlers'
import {
  ACCESS_DENIED,
  INVOKE_CHANNELS,
  PROJECT_OPEN_CANCELLED,
  type InvokeChannel
} from '../../src/shared/ipc-types'
import { afterAllTests } from '../helpers/after-all-tests'
import { copyFixtureProject } from '../helpers/fixture-project'

vi.mock<{ ipcMain: object }>(import('electron'), () => ({ ipcMain: {} }))

/**
Every filesystem call under a synthetic network host: on Windows looking one up sends the
user's credentials. Matched by the host name, as a posix join folds the leading `//`.
*/
const { NETWORK_HOST, networkCalls, renameFailures } = vi.hoisted(() => ({
  NETWORK_HOST: 'synthetic-host',
  networkCalls: [] as string[],
  /**
  Errors the next renames fail with, one each
  */
  renameFailures: [] as Error[]
}))
vi.mock(import('node:fs/promises'), async (importOriginal) => {
  const actual: Record<string, unknown> = { ...(await importOriginal()) }
  const recorded = Object.entries(actual).map(([name, member]): [string, unknown] => {
    if (typeof member !== 'function') return [name, member]
    return [
      name,
      (...args: unknown[]): unknown => {
        if (typeof args[0] === 'string' && args[0].includes(NETWORK_HOST)) {
          networkCalls.push(`${name} ${args[0]}`)
        }
        const failure = name === 'rename' ? renameFailures.shift() : undefined
        return failure === undefined
          ? Reflect.apply(member, undefined, args)
          : Promise.reject(failure)
      }
    ]
  })
  const wrapped: Record<string, unknown> = Object.fromEntries(recorded)
  return wrapped
})

const PROJECT_CHANNELS = [
  'plugin:save',
  'plugin:load',
  'plugin:read-raw',
  'plugin:list',
  'plugin:scan-headers'
] as const

/**
Each project channel's arguments on project folder `p`
*/
const callsOn = (p: string): Record<(typeof PROJECT_CHANNELS)[number], unknown[]> => ({
  'plugin:save': [p, 'Synthetic_Scope.js', '// scope\n', { base: null }],
  'plugin:load': [p, 'Fixture_HandWritten.js'],
  'plugin:read-raw': [p, 'Fixture_HandWritten.js'],
  'plugin:list': [p],
  'plugin:scan-headers': [p]
})

const CANCEL = 1

/**
Folders the running test made, removed after it
*/
const temps: string[] = []

/**
Fresh main modules registered on a stand-in for `ipcMain`, the dialogs answering what the test
queued
*/
async function session(userData?: string) {
  vi.resetModules()
  const access: typeof FileAccess = await import('../../src/main/file-access')
  const { registerMainHandlers } = await import('../helpers/fake-ipc')
  const { default: log } = await import('electron-log/main')
  if (userData !== undefined) access.setProjectRootsDirectory(userData)
  const dialog = {
    showOpenDialog: vi
      .fn<(...args: unknown[]) => Promise<OpenDialogReturnValue>>()
      .mockRejectedValue(new Error('no folder chosen')),
    showMessageBox: vi
      .fn<(...args: unknown[]) => Promise<MessageBoxReturnValue>>()
      .mockRejectedValue(new Error('unexpected message box'))
  }
  const ipc = registerMainHandlers(dialog)
  return {
    access,
    ipc,
    dialog,
    log,
    /**
    The user picks `folder` in the Open Project dialog
    */
    choose: async (folder: string): Promise<unknown> => {
      dialog.showOpenDialog.mockResolvedValueOnce({ canceled: false, filePaths: [folder] })
      return await ipc.invoke('dialog:open-folder')
    },
    /**
    The next confirm is answered with `response`
    */
    answer: (response: number): void => {
      dialog.showMessageBox.mockResolvedValueOnce({ response, checkboxChecked: false })
    }
  }
}

async function freshFolder(prefix: string): Promise<string> {
  const folder = await mkdtemp(path.join(tmpdir(), prefix))
  temps.push(folder)
  return folder
}

/**
Two copies of the fixture project, `Synthetic A` and `Synthetic B`
*/
async function twoProjects(): Promise<{ a: string; b: string }> {
  const a = await copyFixtureProject('Synthetic A')
  const b = await copyFixtureProject('Synthetic B')
  temps.push(path.dirname(a), path.dirname(b))
  return { a, b }
}

async function removeTemps(): Promise<void> {
  for (const folder of temps.splice(0)) await rm(folder, { recursive: true, force: true })
}

const scopeFile = (project: string): string =>
  path.join(project, 'js', 'plugins', 'Synthetic_Scope.js')

/**
The kept list of granted folders in `userData`, as its file holds it
*/
async function readKept(userData: string): Promise<unknown> {
  const kept: unknown = JSON.parse(
    await readFile(path.join(userData, 'project-roots.json'), 'utf8')
  )
  return kept
}

/**
The folders the kept list names, none when it names none
*/
async function keptRoots(userData: string): Promise<unknown[]> {
  const roots = field(await readKept(userData), 'roots')
  const list: unknown[] = Array.isArray(roots) ? roots : []
  return list
}

function field(value: unknown, key: string): unknown {
  return typeof value === 'object' && value !== null ? Reflect.get(value, key) : undefined
}

// Describe blocks run in shuffled order: the count prints once the last of them ends
const counted = { checked: 0, describes: 0 }
const DESCRIBES = 4

function checkedProblems(): string[] {
  counted.describes += 1
  if (counted.describes < DESCRIBES) return []
  process.stdout.write(`project scope: channels checked ${String(counted.checked)}\n`)
  return counted.checked > 0 ? [] : ['no project channel was checked']
}

describe('project scope: channels', () => {
  afterEach(removeTemps)

  afterAll(afterAllTests(checkedProblems))

  it('names the five channels that act on the open project', async () => {
    expect.assertions(1)

    const { createInvokeHandlers } = await import('../../src/main/ipc/handlers')
    const handlers = createInvokeHandlers({
      dialog: {
        showOpenDialog: vi.fn<(...args: unknown[]) => Promise<OpenDialogReturnValue>>(),
        showSaveDialog: vi.fn<(...args: unknown[]) => Promise<SaveDialogReturnValue>>(),
        showMessageBox: vi.fn<(...args: unknown[]) => Promise<MessageBoxReturnValue>>()
      },
      getWindow: vi.fn<MainDependencies['getWindow']>(),
      openLogFolder: vi.fn<MainDependencies['openLogFolder']>().mockResolvedValue(),
      setLogLevel: vi.fn<MainDependencies['setLogLevel']>()
    })
    const scoped = INVOKE_CHANNELS.filter(
      (c: InvokeChannel) => handlers[c].access === 'current-project'
    )

    expect(scoped).toStrictEqual([...PROJECT_CHANNELS])
  })

  it('refuses every project channel before a project is loaded, and writes nothing', async () => {
    expect.assertions(6)

    const { a } = await twoProjects()
    const { ipc } = await session()
    for (const channel of PROJECT_CHANNELS) {
      counted.checked += 1

      await expect(ipc.invoke(channel, ...callsOn(a)[channel])).rejects.toThrow(
        'Access denied: no project is open'
      )
    }

    expect(existsSync(scopeFile(a))).toBe(false)
  })

  it('acts on the project opened in the folder dialog and refuses another valid project', async () => {
    expect.assertions(13)

    const { a, b } = await twoProjects()
    const { ipc, dialog, choose } = await session()
    await choose(a)
    await ipc.invoke('project:load', a)
    for (const channel of PROJECT_CHANNELS) {
      counted.checked += 1

      await expect(ipc.invoke(channel, ...callsOn(a)[channel])).resolves.toSatisfy(Boolean)
      await expect(ipc.invoke(channel, ...callsOn(b)[channel])).rejects.toThrow(
        'Access denied: not the open project'
      )
    }

    await expect(readFile(scopeFile(a), 'utf8')).resolves.toBe('// scope\n')
    expect(existsSync(scopeFile(b))).toBe(false)
    expect(dialog.showMessageBox).not.toHaveBeenCalled()
  })
})

describe('project scope: loading', () => {
  afterEach(removeTemps)

  afterAll(afterAllTests(checkedProblems))

  it('refuses to load a folder that is not an RPG Maker MZ project and keeps the open one', async () => {
    expect.assertions(4)

    const { a } = await twoProjects()
    const { ipc, dialog, choose } = await session()
    await choose(a)
    await ipc.invoke('project:load', a)
    const empty = await freshFolder('project-scope-empty-')

    await expect(ipc.invoke('project:load', empty)).rejects.toThrow(
      'Access denied: not an RPG Maker MZ project folder'
    )

    await choose(empty)

    await expect(ipc.invoke('project:load', empty)).rejects.toThrow(
      'Access denied: not an RPG Maker MZ project folder'
    )
    expect(dialog.showMessageBox).not.toHaveBeenCalled()

    counted.checked += 1

    await expect(ipc.invoke('plugin:list', a)).resolves.toContain('Fixture_HandWritten.js')
  })

  it('asks before loading a folder never chosen in the folder dialog, and Cancel loads nothing', async () => {
    expect.assertions(5)

    const { a, b } = await twoProjects()
    const { ipc, dialog, choose, answer, access } = await session()
    await choose(b)
    await ipc.invoke('project:load', b)
    answer(CANCEL)

    await expect(ipc.invoke('project:load', a)).rejects.toThrow(
      `${ACCESS_DENIED}${PROJECT_OPEN_CANCELLED}`
    )
    expect(dialog.showMessageBox.mock.calls).toStrictEqual([
      [
        expect.objectContaining({
          buttons: ['Open', 'Cancel'],
          defaultId: CANCEL,
          cancelId: CANCEL
        })
      ]
    ])

    const detail = String(field(dialog.showMessageBox.mock.calls[0]?.[0], 'detail'))

    // Folders opened before grants were kept, or dropped from the kept list, were chosen once
    expect({
      namesTheFolder: detail.includes(a),
      hasNoRecordLine: detail.includes('The app has no record of this folder being chosen'),
      saysNeverChosen: /was not chosen|never chosen/.test(detail),
      openProject: access.getCurrentProjectRoot()
    }).toStrictEqual({
      namesTheFolder: true,
      hasNoRecordLine: true,
      saysNeverChosen: false,
      openProject: path.resolve(b)
    })

    counted.checked += 1

    await expect(ipc.invoke('plugin:save', ...callsOn(a)['plugin:save'])).rejects.toThrow(
      'Access denied: not the open project'
    )
    expect({
      isScopeFileWritten: existsSync(scopeFile(a)),
      isGranted: await access.isProjectRootGranted(a)
    }).toStrictEqual({ isScopeFileWritten: false, isGranted: false })
  })

  it('loads a folder the user confirms and does not ask again this session', async () => {
    expect.assertions(3)

    const { a } = await twoProjects()
    const { ipc, dialog, answer } = await session()
    answer(0)

    await expect(ipc.invoke('project:load', a)).resolves.toMatchObject({ path: a })

    await ipc.invoke('project:load', a)

    expect(dialog.showMessageBox).toHaveBeenCalledTimes(1)

    counted.checked += 1

    await expect(ipc.invoke('plugin:list', a)).resolves.toContain('Fixture_HandWritten.js')
  })
})

describe('project scope: kept folders', () => {
  afterEach(removeTemps)

  afterAll(afterAllTests(checkedProblems))

  it('keeps a folder chosen in the folder dialog granted after a restart', async () => {
    expect.assertions(4)

    const { a } = await twoProjects()
    const userData = await freshFolder('project-scope-user-data-')
    const first = await session(userData)
    await first.choose(a)
    const second = await session(userData)

    expect(second.access.getCurrentProjectRoot()).toBeUndefined()

    await second.ipc.invoke('project:load', a)

    expect(second.dialog.showMessageBox).not.toHaveBeenCalled()

    counted.checked += 1

    await expect(second.ipc.invoke('plugin:list', a)).resolves.toContain('Fixture_HandWritten.js')
    await expect(readKept(userData)).resolves.toStrictEqual({ roots: [path.resolve(a)] })
  })

  it('grants nothing from a missing or broken file of granted folders, and never fails on it', async () => {
    expect.hasAssertions()

    const { a } = await twoProjects()
    const userData = await freshFolder('project-scope-user-data-')
    const missing = await session(userData)
    missing.answer(CANCEL)

    await expect(missing.ipc.invoke('project:load', a)).rejects.toThrow(/^Access denied: /)
    expect(missing.log.warn).not.toHaveBeenCalledWith(expect.stringMatching(/^\[file-access\]/))

    for (const broken of ['not json', '{"roots": "x"}', 'null']) {
      await writeFile(path.join(userData, 'project-roots.json'), broken)
      const s = await session(userData)
      s.answer(CANCEL)

      await expect(s.ipc.invoke('project:load', a)).rejects.toThrow(/^Access denied: /)
      expect(s.dialog.showMessageBox).toHaveBeenCalledTimes(1)
      expect(s.log.warn).toHaveBeenCalledWith(expect.stringMatching(/^\[file-access\] Ignoring /))
    }
  })

  it('keeps the most recently granted folders, each once', async () => {
    expect.assertions(1)

    const userData = await freshFolder('project-scope-user-data-')
    const { access } = await session(userData)
    const roots = Array.from({ length: access.MAX_PROJECT_ROOTS + 3 }, (_, index) =>
      path.resolve(`/Synthetic_Root_${String(index)}`)
    )
    const repeated = path.resolve('/Synthetic_Root_5')
    for (const root of roots) await access.recordProjectRoot(root)
    await access.recordProjectRoot(repeated)
    const kept = await keptRoots(userData)

    expect({
      count: kept.length,
      first: kept[0],
      second: kept[1],
      distinct: new Set(kept).size
    }).toStrictEqual({
      count: access.MAX_PROJECT_ROOTS,
      first: repeated,
      second: roots.at(-1),
      distinct: access.MAX_PROJECT_ROOTS
    })
  })

  it('keeps a granted folder when the system refuses saving the kept list for a moment', async () => {
    expect.assertions(3)

    const { a } = await twoProjects()
    const userData = await freshFolder('project-scope-user-data-')
    const { access, log } = await session(userData)
    const locked = Object.assign(new Error('EPERM: operation not permitted, rename'), {
      code: 'EPERM'
    })
    renameFailures.push(locked)
    await access.recordProjectRoot(a)

    expect(renameFailures).toStrictEqual([])
    await expect(readKept(userData)).resolves.toStrictEqual({ roots: [path.resolve(a)] })
    expect(log.warn).not.toHaveBeenCalled()
  })
})

describe('project scope: network folders, instances and win32', () => {
  afterEach(removeTemps)

  afterAll(afterAllTests(checkedProblems))

  it('refuses a network folder not chosen in the folder dialog without looking it up', async () => {
    expect.assertions(4)

    const { ipc, dialog } = await session()
    const network = `//${NETWORK_HOST}/share/Proj`
    networkCalls.length = 0

    await expect(ipc.invoke('project:validate', network)).rejects.toThrow(/^Access denied: /)
    await expect(ipc.invoke('project:load', network)).rejects.toThrow(/^Access denied: /)
    expect(networkCalls).toStrictEqual([])
    expect(dialog.showMessageBox).not.toHaveBeenCalled()
  })

  it('looks up a network folder once it was chosen in the folder dialog', async () => {
    expect.assertions(4)

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

  it('leaves a readable kept list and no temporary file when two app instances save at once', async () => {
    expect.assertions(4)

    const userData = await freshFolder('project-scope-user-data-')
    const first = await session(userData)
    const second = await session(userData)
    await Promise.all(
      Array.from({ length: 10 }, (_, index) => [
        first.access.recordProjectRoot(path.resolve(`/Synthetic_First_${String(index)}`)),
        second.access.recordProjectRoot(path.resolve(`/Synthetic_Second_${String(index)}`))
      ]).flat()
    )
    const kept = await keptRoots(userData)
    const names = await readdir(userData)

    expect(kept.length).toBeGreaterThan(0)
    expect(names.filter((name) => name.endsWith('.tmp'))).toStrictEqual([])
    expect(first.log.warn).not.toHaveBeenCalled()
    expect(second.log.warn).not.toHaveBeenCalled()
  })

  it('compares the open project case-insensitively on win32', async () => {
    expect.assertions(3)

    const { access } = await session()
    access.setCurrentProjectRoot('C:\\Games\\Proj', path.win32)
    counted.checked += 1

    expect(() => {
      access.authorize('current-project', 'c:\\games\\PROJ', path.win32)
    }).not.toThrow()
    expect(() => {
      access.authorize('current-project', 'C:\\Games\\Proj\\', path.win32)
    }).not.toThrow()
    expect(() => {
      access.authorize('current-project', 'C:\\Games\\Proj2', path.win32)
    }).toThrow('Access denied: not the open project')
  })
})
