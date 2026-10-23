// The plugin save handlers, called directly on a fresh temporary project for each test: what a
// save does to a file that already exists at its target. With a guard, the file is replaced only
// when it is the tab's own file, unchanged since the tab read or saved it, and still compiles
// unless the user chose to break it; otherwise nothing is written and the result says why.
import { createHash } from 'crypto'
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
} from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { recordWriteGrant } from '../../src/main/file-access'
import {
  loadPluginFile,
  readRawPlugin,
  samePath,
  savePluginFile,
  savePluginToPath
} from '../../src/main/ipc/plugin'
import type { SaveConflict, SaveGuard, SaveResult } from '../../src/shared/ipc-types'
import type * as FsPromises from 'fs/promises'

// A full disk: while set, every write of a file's bytes stores only the first half, then fails
const disk = vi.hoisted(() => ({ full: false }))

vi.mock('fs/promises', async (importOriginal) => {
  const actual = await importOriginal<typeof FsPromises>()
  const half = (data: any): Buffer => {
    const bytes = Buffer.from(data)
    return bytes.subarray(0, Math.floor(bytes.length / 2))
  }
  const noSpace = (): Error =>
    Object.assign(new Error('ENOSPC: no space left on device, write'), { code: 'ENOSPC' })
  const writeFile = async (file: any, data: any, options?: any): Promise<void> => {
    if (!disk.full) return actual.writeFile(file, data, options)
    await actual.writeFile(file, half(data), options)
    throw noSpace()
  }
  const open = async (...args: Parameters<typeof actual.open>): ReturnType<typeof actual.open> => {
    const handle = await actual.open(...args)
    if (!disk.full) return handle
    const write = handle.writeFile.bind(handle)
    return Object.assign(handle, {
      writeFile: async (data: any, options?: any): Promise<void> => {
        await write(half(data), options)
        throw noSpace()
      }
    })
  }
  return { ...actual, writeFile, open, rename: vi.fn(actual.rename) }
})

let tmp: string
let cases = 0

beforeEach(async () => {
  tmp = await mkdtemp(join(tmpdir(), 'save-guard-'))
})

afterEach(async () => {
  await rm(tmp, { recursive: true, force: true })
})

afterAll(() => {
  console.log(`save guard cases ${cases}`)
  expect(cases).toBeGreaterThan(0)
})

const sha = (bytes: Uint8Array | string): string => createHash('sha256').update(bytes).digest('hex')

const COMPILES = 'var a = 1;\n'
const BROKEN = 'var a = ;\n'

/** `js/plugins/Foo.js` of the temporary project, holding `text` unless it is null */
async function projectFile(text: string | null): Promise<string> {
  const target = join(tmp, 'js', 'plugins', 'Foo.js')
  if (text !== null) {
    await mkdir(join(tmp, 'js', 'plugins'), { recursive: true })
    await writeFile(target, text)
  }
  return target
}

/** A file outside any project, chosen in a save dialog, holding `text` */
async function chosenFile(text: string): Promise<string> {
  const target = join(tmp, 'Chosen.js')
  await writeFile(target, text)
  recordWriteGrant(target)
  return target
}

const guard = (base: SaveGuard['base'], extra: Partial<SaveGuard> = {}): SaveGuard => ({
  base,
  ...extra
})

/** The save wrote nothing and named `conflict` and the sha256 of the bytes left on disk */
async function expectConflict(
  result: SaveResult,
  conflict: SaveConflict,
  target: string,
  before: string
): Promise<void> {
  cases++
  expect(result).toMatchObject({ success: false, path: target, conflict, diskSha256: sha(before) })
  expect(await readFile(target, 'utf8')).toBe(before)
}

/** The save wrote `content` and returned the sha256 of the bytes now on disk */
async function expectWritten(result: SaveResult, target: string, content: string): Promise<void> {
  cases++
  const bytes = await readFile(target)
  expect(bytes.toString('utf8')).toBe(content)
  expect(result).toMatchObject({ success: true, path: target, sha256: sha(bytes) })
}

describe('saving over an existing file', () => {
  it('plugin:save leaves an existing file the tab did not come from as it was', async () => {
    const target = await projectFile('A')
    await expectConflict(
      await savePluginFile(tmp, 'Foo.js', 'B', guard(null)),
      'exists-unrelated',
      target,
      'A'
    )
  })

  it('plugin:save-to-path replaces an existing granted file', async () => {
    const target = await chosenFile('A')
    await expectWritten(await savePluginToPath(target, 'B'), target, 'B')
  })
})

describe('the save guard', () => {
  it('writes an absent target, creating its folder', async () => {
    const target = await projectFile(null)
    await expectWritten(
      await savePluginFile(tmp, 'Foo.js', COMPILES, guard(null)),
      target,
      COMPILES
    )
  })

  it('writes over the base when its bytes are unchanged', async () => {
    const target = await projectFile('A')
    const base = { path: target, sha256: sha('A') }
    await expectWritten(await savePluginFile(tmp, 'Foo.js', 'B', guard(base)), target, 'B')
  })

  it('refuses the base when it changed on disk or its sha256 is unknown', async () => {
    const target = await projectFile('A')
    for (const sha256 of [sha('other'), null]) {
      const result = await savePluginFile(tmp, 'Foo.js', 'B', guard({ path: target, sha256 }))
      await expectConflict(result, 'changed-on-disk', target, 'A')
    }
  })

  it('plugin:save refuses a file the tab did not come from', async () => {
    const target = await projectFile('A')
    const other = { path: join(tmp, 'js', 'plugins', 'Bar.js'), sha256: sha('A') }
    for (const base of [null, other]) {
      const result = await savePluginFile(tmp, 'Foo.js', 'B', guard(base))
      await expectConflict(result, 'exists-unrelated', target, 'A')
    }
  })

  it('plugin:save-to-path writes a file the tab did not come from', async () => {
    const target = await chosenFile('A')
    await expectWritten(await savePluginToPath(target, 'B', guard(null)), target, 'B')
    const other = { path: join(tmp, 'Other.js'), sha256: sha('B') }
    await expectWritten(await savePluginToPath(target, 'C', guard(other)), target, 'C')
  })

  it('plugin:save-to-path without a guard writes over an existing file', async () => {
    const target = await chosenFile('A')
    await expectWritten(await savePluginToPath(target, 'B'), target, 'B')
  })

  it('refuses code that would stop a compiling file from compiling', async () => {
    const target = await projectFile(COMPILES)
    const base = { path: target, sha256: sha(COMPILES) }
    const result = await savePluginFile(tmp, 'Foo.js', `\n\n${BROKEN}`, guard(base))
    await expectConflict(result, 'would-break', target, COMPILES)
    expect(result).toMatchObject({ syntaxError: { line: 3 } })
  })

  it('writes code that does not compile to a new file, with a warning', async () => {
    const target = await projectFile(null)
    const result = await savePluginFile(tmp, 'Foo.js', BROKEN, guard(null))
    await expectWritten(result, target, BROKEN)
    expect(result).toMatchObject({ syntaxWarning: { line: 1 } })
  })

  it('writes over a file that already did not compile, with a warning', async () => {
    const target = await projectFile(BROKEN)
    const base = { path: target, sha256: sha(BROKEN) }
    const result = await savePluginFile(tmp, 'Foo.js', BROKEN, guard(base))
    await expectWritten(result, target, BROKEN)
    expect(result).toMatchObject({ syntaxWarning: { line: 1 } })
  })

  it('writes code nested too deeply for the compiler to check', async () => {
    const target = await projectFile(COMPILES)
    const base = { path: target, sha256: sha(COMPILES) }
    const deep = '(function(){'.repeat(600) + '})()'.repeat(600)
    const result = await savePluginFile(tmp, 'Foo.js', deep, guard(base))
    await expectWritten(result, target, deep)
    expect(result).not.toHaveProperty('syntaxWarning')
  })

  it('overwriteBroken skips exactly the compile check', async () => {
    const target = await projectFile(COMPILES)
    const base = { path: target, sha256: sha(COMPILES) }
    const forced = guard(base, { overwriteBroken: true })
    const result = await savePluginFile(tmp, 'Foo.js', BROKEN, forced)
    await expectWritten(result, target, BROKEN)
    expect(result).toMatchObject({ syntaxWarning: { line: 1 } })
  })

  it('overwriteBroken does not skip a changed or unrelated file', async () => {
    const target = await projectFile('A')
    const changed = guard({ path: target, sha256: sha('other') }, { overwriteBroken: true })
    await expectConflict(
      await savePluginFile(tmp, 'Foo.js', 'B', changed),
      'changed-on-disk',
      target,
      'A'
    )
    const unrelated = guard(null, { overwriteBroken: true })
    await expectConflict(
      await savePluginFile(tmp, 'Foo.js', 'B', unrelated),
      'exists-unrelated',
      target,
      'A'
    )
  })

  it('a retry is bound to the bytes the user was shown', async () => {
    const target = await projectFile('A')
    const first = await savePluginFile(tmp, 'Foo.js', 'B', guard(null))
    await expectConflict(first, 'exists-unrelated', target, 'A')
    if (first.success) throw new Error('expected a conflict')
    const shown = { path: first.path, sha256: first.diskSha256 }
    await writeFile(target, 'A2')
    const second = await savePluginFile(tmp, 'Foo.js', 'B', guard(shown))
    await expectConflict(second, 'changed-on-disk', target, 'A2')
    if (second.success) throw new Error('expected a conflict')
    const retry = guard({ path: second.path, sha256: second.diskSha256 })
    await expectWritten(await savePluginFile(tmp, 'Foo.js', 'B', retry), target, 'B')
  })

  it('rejects a target that is a folder and writes nothing', async () => {
    const target = await projectFile(null)
    await mkdir(target, { recursive: true })
    await expect(savePluginFile(tmp, 'Foo.js', 'B', guard(null))).rejects.toMatchObject({
      code: 'EISDIR'
    })
    await expect(
      savePluginFile(tmp, 'Foo.js', 'B', guard({ path: target, sha256: null }))
    ).rejects.toMatchObject({ code: 'EISDIR' })
    cases++
  })

  it('treats an unreadable file as present, never as absent', async () => {
    const target = await projectFile('A')
    await chmod(target, 0o200)
    try {
      await expect(savePluginFile(tmp, 'Foo.js', 'B', guard(null))).rejects.toMatchObject({
        code: 'EACCES'
      })
    } finally {
      await chmod(target, 0o600)
    }
    expect(await readFile(target, 'utf8')).toBe('A')
    cases++
  })
})

describe('replacing a file', () => {
  const pluginsFolder = (): Promise<string[]> => readdir(join(tmp, 'js', 'plugins'))
  const unchanged = (target: string): SaveGuard => guard({ path: target, sha256: sha(COMPILES) })

  afterEach(() => {
    disk.full = false
    vi.mocked(rename).mockClear()
  })

  it('leaves the file as it was when the disk fills mid-write', async () => {
    const target = await projectFile(COMPILES)
    disk.full = true
    const save = savePluginFile(tmp, 'Foo.js', 'var b = 2;\n'.repeat(100), unchanged(target))
    await expect(save).rejects.toMatchObject({ code: 'ENOSPC' })
    disk.full = false
    expect(await readFile(target, 'utf8')).toBe(COMPILES)
    expect(await pluginsFolder()).toEqual(['Foo.js'])
    cases++
  })

  it('retries a rename the system refuses for a moment', async () => {
    const target = await projectFile(COMPILES)
    const locked = Object.assign(new Error('EPERM: operation not permitted, rename'), {
      code: 'EPERM'
    })
    vi.mocked(rename).mockRejectedValueOnce(locked).mockRejectedValueOnce(locked)
    await expectWritten(await savePluginFile(tmp, 'Foo.js', 'B', unchanged(target)), target, 'B')
    expect(rename).toHaveBeenCalledTimes(3)
    expect(await pluginsFolder()).toEqual(['Foo.js'])
  })

  it('leaves the file as it was and no temporary file when the rename fails', async () => {
    const target = await projectFile(COMPILES)
    const across = Object.assign(new Error('EXDEV: cross-device link not permitted, rename'), {
      code: 'EXDEV'
    })
    vi.mocked(rename).mockRejectedValueOnce(across)
    const save = savePluginFile(tmp, 'Foo.js', 'B', unchanged(target))
    await expect(save).rejects.toMatchObject({ code: 'EXDEV' })
    expect(await readFile(target, 'utf8')).toBe(COMPILES)
    expect(await pluginsFolder()).toEqual(['Foo.js'])
    cases++
  })

  it('refuses a read-only file up front and leaves it as it was', async () => {
    const target = await projectFile(COMPILES)
    // On win32 this sets the read-only attribute, which the system reports as EPERM
    await chmod(target, 0o444)
    try {
      const save = savePluginFile(tmp, 'Foo.js', 'B', unchanged(target))
      await expect(save).rejects.toMatchObject({
        code: process.platform === 'win32' ? 'EPERM' : 'EACCES'
      })
    } finally {
      await chmod(target, 0o644)
    }
    expect(await readFile(target, 'utf8')).toBe(COMPILES)
    expect(await pluginsFolder()).toEqual(['Foo.js'])
    expect(rename).not.toHaveBeenCalled()
    cases++
  })

  it("keeps the file's permissions", async () => {
    const target = await projectFile(COMPILES)
    await chmod(target, 0o640)
    await expectWritten(await savePluginFile(tmp, 'Foo.js', 'B', unchanged(target)), target, 'B')
    expect((await stat(target)).mode & 0o777).toBe(0o640)
  })

  it('writes through a link to the file it names', async () => {
    const target = await projectFile(null)
    const shared = join(tmp, 'Shared.js')
    await writeFile(shared, COMPILES)
    await mkdir(join(tmp, 'js', 'plugins'), { recursive: true })
    await symlink(shared, target)
    await expectWritten(await savePluginFile(tmp, 'Foo.js', 'B', unchanged(target)), target, 'B')
    expect((await lstat(target)).isSymbolicLink()).toBe(true)
    expect(await readFile(shared, 'utf8')).toBe('B')
  })
})

describe('naming one file', () => {
  it('ignores case on win32', () => {
    expect(samePath('C:\\P\\Foo.js', 'c:\\p\\FOO.JS', 'win32')).toBe(true)
  })

  it('keeps case on posix', () => {
    expect(samePath('/p/Foo.js', '/p/FOO.JS', 'linux')).toBe(false)
    expect(samePath('/p/x/../Foo.js', '/p/Foo.js', 'linux')).toBe(true)
  })
})

describe('reading a plugin file', () => {
  const TEXT = '\uFEFF/*:\r\n * @plugindesc Bom\r\n */\r\nvar a = 1;\r\n'

  it('load and read-raw return the path and the sha256 of the bytes', async () => {
    const target = join(tmp, 'js', 'plugins', 'Bom.js')
    await mkdir(join(tmp, 'js', 'plugins'), { recursive: true })
    await writeFile(target, TEXT)
    const bytes = await readFile(target)
    const loaded = await loadPluginFile(tmp, 'Bom.js')
    expect({ path: loaded.path, sha256: loaded.sha256 }).toEqual({
      path: target,
      sha256: sha(bytes)
    })
    expect(loaded.plugin.importedFrom).toBe('Bom.js')
    await expect(readRawPlugin(tmp, 'Bom.js')).resolves.toEqual({
      content: bytes.toString('utf8'),
      path: target,
      sha256: sha(bytes)
    })
  })
})
