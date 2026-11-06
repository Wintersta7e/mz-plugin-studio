// The plugin save handlers, called directly on a fresh temporary project for each test: what a
// save does to a file that already exists at its target. With a guard, the file is replaced only
// when it is the tab's own file, unchanged since the tab read or saved it, and still compiles
// unless the user chose to break it; otherwise nothing is written and the result says why.
import { createHash } from 'node:crypto'
import {
  chmod,
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rename,
  rm,
  stat,
  symlink,
  writeFile
} from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterAll, afterEach, describe, expect, it, vi } from 'vitest'
import { recordWriteGrant } from '../../src/main/file-access'
import {
  loadPluginFile,
  readRawPlugin,
  isSamePath,
  savePluginFile,
  savePluginToPath
} from '../../src/main/ipc/plugin'
import type { SaveConflict, SaveGuard, SaveResult } from '../../src/shared/ipc-types'
import { afterAllTests } from '../helpers/after-all-tests'

// A full disk: while set, every write of a file's bytes stores only the first half, then fails
const disk = vi.hoisted(() => ({ full: false }))

vi.mock(import('node:fs/promises'), async (importOriginal) => {
  const actual = await importOriginal()
  const half = (data: unknown): Buffer => {
    let bytes: Buffer | undefined
    if (typeof data === 'string') bytes = Buffer.from(data)
    if (data instanceof Uint8Array) bytes = Buffer.from(data)
    if (bytes === undefined) throw new TypeError('the full disk stand-in writes text or bytes only')
    return bytes.subarray(0, Math.floor(bytes.length / 2))
  }
  const noSpace = (): Error =>
    Object.assign(new Error('ENOSPC: no space left on device, write'), { code: 'ENOSPC' })
  const writeFile = async (...args: Parameters<typeof actual.writeFile>): Promise<void> => {
    const [file, data, options] = args
    if (!disk.full) {
      await actual.writeFile(file, data, options)
      return
    }
    await actual.writeFile(file, half(data), options)
    throw noSpace()
  }
  const open = async (...args: Parameters<typeof actual.open>): ReturnType<typeof actual.open> => {
    const handle = await actual.open(...args)
    if (!disk.full) return handle
    const write = handle.writeFile.bind(handle)
    return Object.assign(handle, {
      writeFile: async (
        data: Parameters<typeof write>[0],
        options?: Parameters<typeof write>[1]
      ): Promise<void> => {
        await write(half(data), options)
        throw noSpace()
      }
    })
  }
  return { ...actual, writeFile, open, rename: vi.fn<typeof actual.rename>(actual.rename) }
})

// Describe blocks run in shuffled order: the count prints once the last counting one ends
const counted = { cases: 0, describes: 0, ended: 0 }

/**
The `afterAll` listener of a describe whose tests count cases
*/
function countCases(): () => void {
  counted.describes += 1
  return afterAllTests(() => {
    counted.ended += 1
    if (counted.ended < counted.describes) return []
    process.stdout.write(`save guard cases ${String(counted.cases)}\n`)
    return counted.cases > 0 ? [] : ['no save case ran']
  })
}

/**
Project folders the running test made, removed after it
*/
const made: string[] = []

async function freshProject(): Promise<string> {
  const root = await mkdtemp(path.join(tmpdir(), 'save-guard-'))
  made.push(root)
  return root
}

async function removeMade(): Promise<void> {
  for (const folder of made.splice(0)) await rm(folder, { recursive: true, force: true })
}

const sha = (bytes: Uint8Array | string): string => createHash('sha256').update(bytes).digest('hex')

const COMPILES = 'var a = 1;\n'
const BROKEN = 'var a = ;\n'

/**
`js/plugins/Foo.js` of the project `root`, holding `text` when there is one
*/
async function projectFile(root: string, text?: string): Promise<string> {
  const target = path.join(root, 'js', 'plugins', 'Foo.js')
  if (text !== undefined) {
    await mkdir(path.join(root, 'js', 'plugins'), { recursive: true })
    await writeFile(target, text)
  }
  return target
}

/**
A file outside any project, chosen in a save dialog, holding `A`
*/
async function chosenFile(root: string): Promise<string> {
  const target = path.join(root, 'Chosen.js')
  await writeFile(target, 'A')
  recordWriteGrant(target)
  return target
}

const guard = (base: SaveGuard['base'], extra: Partial<SaveGuard> = {}): SaveGuard => ({
  base,
  ...extra
})

const unchanged = (target: string): SaveGuard => guard({ path: target, sha256: sha(COMPILES) })

const pluginsFolder = async (root: string): Promise<string[]> =>
  await readdir(path.join(root, 'js', 'plugins'))

/**
The result of a save that wrote nothing
*/
function conflictOf(result: SaveResult): Extract<SaveResult, { success: false }> {
  if (result.success) throw new Error('expected a conflict')
  return result
}

/**
The save wrote nothing and named `conflict` and the sha256 of the bytes left on disk (2 assertions)
*/
async function expectConflict(
  result: SaveResult,
  conflict: SaveConflict,
  target: string,
  before: string
): Promise<void> {
  counted.cases += 1

  expect(result).toMatchObject({ success: false, path: target, conflict, diskSha256: sha(before) })
  await expect(readFile(target, 'utf8')).resolves.toBe(before)
}

/**
The save wrote `content` and returned the sha256 of the bytes now on disk (2 assertions)
*/
async function expectWritten(result: SaveResult, target: string, content: string): Promise<void> {
  counted.cases += 1
  const bytes = await readFile(target)

  expect(bytes.toString('utf8')).toBe(content)
  expect(result).toMatchObject({ success: true, path: target, sha256: sha(bytes) })
}

/**
After a test that may fill the disk or refuse a rename: a working disk again, and no project folders
*/
async function resetDisk(): Promise<void> {
  disk.full = false
  vi.mocked(rename).mockClear()
  await removeMade()
}

describe('saving over an existing file', () => {
  afterEach(removeMade)

  afterAll(countCases())

  it('plugin:save leaves an existing file the tab did not come from as it was', async () => {
    expect.assertions(2)

    const root = await freshProject()
    const target = await projectFile(root, 'A')
    await expectConflict(
      await savePluginFile(root, 'Foo.js', 'B', guard(null)),
      'exists-unrelated',
      target,
      'A'
    )
  })

  it('plugin:save-to-path replaces an existing granted file', async () => {
    expect.assertions(2)

    const target = await chosenFile(await freshProject())
    await expectWritten(await savePluginToPath(target, 'B'), target, 'B')
  })
})

describe('the save guard: base and target', () => {
  afterEach(removeMade)

  afterAll(countCases())

  it('writes an absent target, creating its folder', async () => {
    expect.assertions(2)

    const root = await freshProject()
    const target = await projectFile(root)
    await expectWritten(
      await savePluginFile(root, 'Foo.js', COMPILES, guard(null)),
      target,
      COMPILES
    )
  })

  it('writes over the base when its bytes are unchanged', async () => {
    expect.assertions(2)

    const root = await freshProject()
    const target = await projectFile(root, 'A')
    const base = { path: target, sha256: sha('A') }
    await expectWritten(await savePluginFile(root, 'Foo.js', 'B', guard(base)), target, 'B')
  })

  it('refuses the base when it changed on disk or its sha256 is unknown', async () => {
    expect.assertions(4)

    const root = await freshProject()
    const target = await projectFile(root, 'A')
    for (const sha256 of [sha('other'), null]) {
      const result = await savePluginFile(root, 'Foo.js', 'B', guard({ path: target, sha256 }))
      await expectConflict(result, 'changed-on-disk', target, 'A')
    }
  })

  it('plugin:save refuses a file the tab did not come from', async () => {
    expect.assertions(4)

    const root = await freshProject()
    const target = await projectFile(root, 'A')
    const other = { path: path.join(root, 'js', 'plugins', 'Bar.js'), sha256: sha('A') }
    for (const base of [null, other]) {
      const result = await savePluginFile(root, 'Foo.js', 'B', guard(base))
      await expectConflict(result, 'exists-unrelated', target, 'A')
    }
  })

  it('plugin:save-to-path writes a file the tab did not come from', async () => {
    expect.assertions(4)

    const root = await freshProject()
    const target = await chosenFile(root)
    await expectWritten(await savePluginToPath(target, 'B', guard(null)), target, 'B')
    const other = { path: path.join(root, 'Other.js'), sha256: sha('B') }
    await expectWritten(await savePluginToPath(target, 'C', guard(other)), target, 'C')
  })

  it('plugin:save-to-path without a guard writes over an existing file', async () => {
    expect.assertions(2)

    const target = await chosenFile(await freshProject())
    await expectWritten(await savePluginToPath(target, 'B'), target, 'B')
  })
})

describe('the save guard: compile check', () => {
  afterEach(removeMade)

  afterAll(countCases())

  it('refuses code that would stop a compiling file from compiling', async () => {
    expect.assertions(3)

    const root = await freshProject()
    const target = await projectFile(root, COMPILES)
    const base = { path: target, sha256: sha(COMPILES) }
    const result = await savePluginFile(root, 'Foo.js', `\n\n${BROKEN}`, guard(base))
    await expectConflict(result, 'would-break', target, COMPILES)

    expect(result).toMatchObject({ syntaxError: { line: 3 } })
  })

  it('writes code that does not compile to a new file, with a warning', async () => {
    expect.assertions(3)

    const root = await freshProject()
    const target = await projectFile(root)
    const result = await savePluginFile(root, 'Foo.js', BROKEN, guard(null))
    await expectWritten(result, target, BROKEN)

    expect(result).toMatchObject({ syntaxWarning: { line: 1 } })
  })

  it('writes over a file that already did not compile, with a warning', async () => {
    expect.assertions(3)

    const root = await freshProject()
    const target = await projectFile(root, BROKEN)
    const base = { path: target, sha256: sha(BROKEN) }
    const result = await savePluginFile(root, 'Foo.js', BROKEN, guard(base))
    await expectWritten(result, target, BROKEN)

    expect(result).toMatchObject({ syntaxWarning: { line: 1 } })
  })

  it('writes code nested too deeply for the compiler to check', async () => {
    expect.assertions(3)

    const root = await freshProject()
    const target = await projectFile(root, COMPILES)
    const base = { path: target, sha256: sha(COMPILES) }
    const deep = '(function(){'.repeat(600) + '})()'.repeat(600)
    const result = await savePluginFile(root, 'Foo.js', deep, guard(base))
    await expectWritten(result, target, deep)

    expect(result).not.toHaveProperty('syntaxWarning')
  })

  it('overwriteBroken skips exactly the compile check', async () => {
    expect.assertions(3)

    const root = await freshProject()
    const target = await projectFile(root, COMPILES)
    const base = { path: target, sha256: sha(COMPILES) }
    const forced = guard(base, { overwriteBroken: true })
    const result = await savePluginFile(root, 'Foo.js', BROKEN, forced)
    await expectWritten(result, target, BROKEN)

    expect(result).toMatchObject({ syntaxWarning: { line: 1 } })
  })
})

describe('the save guard: retries and failed reads', () => {
  afterEach(removeMade)

  afterAll(countCases())

  it('overwriteBroken does not skip a changed or unrelated file', async () => {
    expect.assertions(4)

    const root = await freshProject()
    const target = await projectFile(root, 'A')
    const changed = guard({ path: target, sha256: sha('other') }, { overwriteBroken: true })
    await expectConflict(
      await savePluginFile(root, 'Foo.js', 'B', changed),
      'changed-on-disk',
      target,
      'A'
    )
    const unrelated = guard(null, { overwriteBroken: true })
    await expectConflict(
      await savePluginFile(root, 'Foo.js', 'B', unrelated),
      'exists-unrelated',
      target,
      'A'
    )
  })

  it('a retry is bound to the bytes the user was shown', async () => {
    expect.assertions(6)

    const root = await freshProject()
    const target = await projectFile(root, 'A')
    const first = await savePluginFile(root, 'Foo.js', 'B', guard(null))
    await expectConflict(first, 'exists-unrelated', target, 'A')
    const shownFirst = conflictOf(first)
    const shown = { path: shownFirst.path, sha256: shownFirst.diskSha256 }
    await writeFile(target, 'A2')
    const second = await savePluginFile(root, 'Foo.js', 'B', guard(shown))
    await expectConflict(second, 'changed-on-disk', target, 'A2')
    const shownSecond = conflictOf(second)
    const retry = guard({ path: shownSecond.path, sha256: shownSecond.diskSha256 })
    await expectWritten(await savePluginFile(root, 'Foo.js', 'B', retry), target, 'B')
  })

  it('rejects a target that is a folder and writes nothing', async () => {
    expect.assertions(2)

    const root = await freshProject()
    const target = await projectFile(root)
    await mkdir(target, { recursive: true })

    await expect(savePluginFile(root, 'Foo.js', 'B', guard(null))).rejects.toMatchObject({
      code: 'EISDIR'
    })
    await expect(
      savePluginFile(root, 'Foo.js', 'B', guard({ path: target, sha256: null }))
    ).rejects.toMatchObject({ code: 'EISDIR' })

    counted.cases += 1
  })

  it('treats an unreadable file as present, never as absent', async () => {
    expect.assertions(2)

    const root = await freshProject()
    const target = await projectFile(root, 'A')
    await chmod(target, 0o200)
    try {
      await expect(savePluginFile(root, 'Foo.js', 'B', guard(null))).rejects.toMatchObject({
        code: 'EACCES'
      })
    } finally {
      await chmod(target, 0o600)
    }

    await expect(readFile(target, 'utf8')).resolves.toBe('A')

    counted.cases += 1
  })
})

describe('replacing a file: failed writes', () => {
  afterEach(resetDisk)

  afterAll(countCases())

  it('leaves the file as it was when the disk fills mid-write', async () => {
    expect.assertions(3)

    const root = await freshProject()
    const target = await projectFile(root, COMPILES)
    disk.full = true
    const save = savePluginFile(root, 'Foo.js', 'var b = 2;\n'.repeat(100), unchanged(target))

    await expect(save).rejects.toMatchObject({ code: 'ENOSPC' })

    disk.full = false

    await expect(readFile(target, 'utf8')).resolves.toBe(COMPILES)
    await expect(pluginsFolder(root)).resolves.toStrictEqual(['Foo.js'])

    counted.cases += 1
  })

  it('retries a rename the system refuses for a moment', async () => {
    expect.assertions(4)

    const root = await freshProject()
    const target = await projectFile(root, COMPILES)
    const locked = Object.assign(new Error('EPERM: operation not permitted, rename'), {
      code: 'EPERM'
    })
    vi.mocked(rename).mockRejectedValueOnce(locked).mockRejectedValueOnce(locked)
    await expectWritten(await savePluginFile(root, 'Foo.js', 'B', unchanged(target)), target, 'B')

    expect(rename).toHaveBeenCalledTimes(3)
    await expect(pluginsFolder(root)).resolves.toStrictEqual(['Foo.js'])
  })

  it('leaves the file as it was and no temporary file when the rename fails', async () => {
    expect.assertions(3)

    const root = await freshProject()
    const target = await projectFile(root, COMPILES)
    const across = Object.assign(new Error('EXDEV: cross-device link not permitted, rename'), {
      code: 'EXDEV'
    })
    vi.mocked(rename).mockRejectedValueOnce(across)
    const save = savePluginFile(root, 'Foo.js', 'B', unchanged(target))

    await expect(save).rejects.toMatchObject({ code: 'EXDEV' })
    await expect(readFile(target, 'utf8')).resolves.toBe(COMPILES)
    await expect(pluginsFolder(root)).resolves.toStrictEqual(['Foo.js'])

    counted.cases += 1
  })

  it('refuses a read-only file up front and leaves it as it was', async () => {
    expect.assertions(4)

    const root = await freshProject()
    const target = await projectFile(root, COMPILES)
    // On win32 this sets the read-only attribute, which the system reports as EPERM
    await chmod(target, 0o444)
    try {
      const save = savePluginFile(root, 'Foo.js', 'B', unchanged(target))

      await expect(save).rejects.toMatchObject({
        code: process.platform === 'win32' ? 'EPERM' : 'EACCES'
      })
    } finally {
      await chmod(target, 0o644)
    }

    await expect(readFile(target, 'utf8')).resolves.toBe(COMPILES)
    await expect(pluginsFolder(root)).resolves.toStrictEqual(['Foo.js'])
    expect(rename).not.toHaveBeenCalled()

    counted.cases += 1
  })
})

describe('replacing a file: what it keeps', () => {
  afterEach(resetDisk)

  afterAll(countCases())

  it("keeps the file's permissions", async () => {
    expect.assertions(3)

    const root = await freshProject()
    const target = await projectFile(root, COMPILES)
    await chmod(target, 0o640)
    await expectWritten(await savePluginFile(root, 'Foo.js', 'B', unchanged(target)), target, 'B')
    const { mode } = await stat(target)

    expect(mode & 0o777).toBe(0o640)
  })

  it('writes through a link to the file it names', async () => {
    expect.assertions(4)

    const root = await freshProject()
    const target = await projectFile(root)
    const shared = path.join(root, 'Shared.js')
    await writeFile(shared, COMPILES)
    await mkdir(path.join(root, 'js', 'plugins'), { recursive: true })
    await symlink(shared, target)
    await expectWritten(await savePluginFile(root, 'Foo.js', 'B', unchanged(target)), target, 'B')
    const link = await lstat(target)

    expect(link.isSymbolicLink()).toBe(true)
    await expect(readFile(shared, 'utf8')).resolves.toBe('B')
  })
})

describe('naming one file', () => {
  it('ignores case on win32', () => {
    expect(isSamePath('C:\\P\\Foo.js', 'c:\\p\\FOO.JS', 'win32')).toBe(true)
  })

  it('keeps case on posix', () => {
    expect(isSamePath('/p/Foo.js', '/p/FOO.JS', 'linux')).toBe(false)
    expect(isSamePath('/p/x/../Foo.js', '/p/Foo.js', 'linux')).toBe(true)
  })
})

describe('reading a plugin file', () => {
  const TEXT = '\u{FEFF}/*:\r\n * @plugindesc Bom\r\n */\r\nvar a = 1;\r\n'

  afterEach(removeMade)

  it('load and read-raw return the path and the sha256 of the bytes', async () => {
    expect.assertions(3)

    const root = await freshProject()
    const target = path.join(root, 'js', 'plugins', 'Bom.js')
    await mkdir(path.join(root, 'js', 'plugins'), { recursive: true })
    await writeFile(target, TEXT)
    const bytes = await readFile(target)
    const loaded = await loadPluginFile(root, 'Bom.js')

    expect({ path: loaded.path, sha256: loaded.sha256 }).toStrictEqual({
      path: target,
      sha256: sha(bytes)
    })
    expect(loaded.plugin.importedFrom).toBe('Bom.js')
    await expect(readRawPlugin(root, 'Bom.js')).resolves.toStrictEqual({
      content: bytes.toString('utf8'),
      path: target,
      sha256: sha(bytes)
    })
  })
})
