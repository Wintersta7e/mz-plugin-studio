// Which default paths a file dialog may open with, decided from the text alone: a default path
// is looked up before the user acts, so no row may touch the filesystem.
import path from 'path'
import { describe, expect, it, vi } from 'vitest'
import {
  checkSaveDefaultPath,
  classifyDialogDefault,
  type DialogDefaultClass
} from '../../src/main/ipc/dialog'
import type { PlatformPath } from '../../src/shared/path-safety'

const { fsSpies, spyOnFunctions } = vi.hoisted(() => {
  const fsSpies: { name: string; calls: () => number }[] = []
  /** The module with each of its functions wrapped in a spy, as both its exports and its default */
  function spyOnFunctions(label: string, module: Record<string, unknown>): Record<string, unknown> {
    const wrapped: Record<string, unknown> = {}
    for (const [key, member] of Object.entries(module)) {
      if (key === 'default') continue
      // Lower-case members are functions; upper-case ones are classes, kept as they are
      if (typeof member === 'function' && /^[a-z]/.test(key)) {
        const spy = vi.fn(member as (...args: unknown[]) => unknown)
        fsSpies.push({ name: `${label}.${key}`, calls: () => spy.mock.calls.length })
        wrapped[key] = spy
      } else {
        wrapped[key] = member
      }
    }
    return { ...wrapped, default: wrapped }
  }
  return { fsSpies, spyOnFunctions }
})

vi.mock('fs', async (importOriginal) => spyOnFunctions('fs', await importOriginal()))
vi.mock('node:fs', async (importOriginal) => spyOnFunctions('node:fs', await importOriginal()))
vi.mock('fs/promises', async (importOriginal) =>
  spyOnFunctions('fs/promises', await importOriginal())
)

type Platform = 'posix' | 'win32'

const PATH_RULES: Record<Platform, PlatformPath> = { posix: path.posix, win32: path.win32 }
const BOTH: Platform[] = ['posix', 'win32']

interface Row {
  input: unknown
  platforms: Platform[]
  expected: DialogDefaultClass | null
}

const longName = (length: number): string => `${'a'.repeat(length - 3)}.js`

const CLASS_ROWS: Row[] = [
  ...['Plugin.js', 'Plugin.d.ts', 'My Plugin.mzparams', longName(255)].map(
    (input): Row => ({ input, platforms: BOTH, expected: 'filename' })
  ),
  ...[
    'Plugin.txt',
    '..',
    '.',
    'x\0.js',
    longName(256),
    'a/b.js',
    'a\\b.js',
    'C:x.js',
    7,
    '',
    '\\\\server\\share\\Proj',
    '//server/share/Proj',
    '\\\\?\\C:\\x',
    '\\\\.\\pipe\\x',
    '/work/../etc'
  ].map((input): Row => ({ input, platforms: BOTH, expected: null })),
  { input: '/work/Games/Proj', platforms: ['posix'], expected: 'directory-seed' },
  // Rooted without a drive: not an absolute path on Windows
  { input: '/work/Games/Proj', platforms: ['win32'], expected: null },
  { input: 'C:\\Games\\Proj', platforms: ['win32'], expected: 'directory-seed' },
  { input: 'C:\\Games\\Proj', platforms: ['posix'], expected: null },
  { input: 'C:\\', platforms: ['win32'], expected: null }
]

interface SaveRow {
  input: unknown
  platforms: Platform[]
  kept: boolean
}

const SAVE_ROWS: SaveRow[] = [
  { input: 'Synthetic_Plugin.js', platforms: BOTH, kept: true },
  // Save asks again in the folder of the file it last chose, at a file named after the plugin
  { input: 'C:\\Games\\Proj\\js\\plugins\\Synthetic_Plugin.js', platforms: ['win32'], kept: true },
  { input: 'C:/Games/Proj/js/plugins/Synthetic_Plugin.js', platforms: ['win32'], kept: true },
  { input: 'C:\\Games\\Proj\\Synthetic.d.ts', platforms: ['win32'], kept: true },
  { input: '/work/Games/Proj/js/plugins/Synthetic_Plugin.js', platforms: ['posix'], kept: true },
  { input: '/work/Games/Proj/js/plugins/Synthetic_Plugin.js', platforms: ['win32'], kept: false },
  { input: 'C:\\Games\\Proj', platforms: ['win32'], kept: false },
  { input: '/work/Games/Proj', platforms: ['posix'], kept: false },
  { input: 'C:\\Games\\Proj\\Synthetic.exe', platforms: ['win32'], kept: false },
  { input: '\\\\server\\share\\Synthetic.js', platforms: BOTH, kept: false },
  { input: '//server/share/Synthetic.js', platforms: BOTH, kept: false },
  { input: '/work/../Synthetic.js', platforms: BOTH, kept: false },
  { input: 'C:\\Games\\..\\Synthetic.js', platforms: ['win32'], kept: false },
  { input: '../Synthetic.js', platforms: BOTH, kept: false },
  { input: 'C:Synthetic.js', platforms: BOTH, kept: false },
  { input: 'C:\\Games\\Proj\\js\\plugins\\CON.js', platforms: ['win32'], kept: false },
  { input: 'C:\\Games\\Proj\\Synthetic.js:hidden.js', platforms: ['win32'], kept: false },
  { input: 7, platforms: BOTH, kept: false }
]

let rows = 0

describe('dialog default path', () => {
  for (const row of CLASS_ROWS) {
    for (const platform of row.platforms) {
      it(`classifies ${JSON.stringify(row.input)} as ${row.expected} (${platform})`, () => {
        rows++

        expect(classifyDialogDefault(row.input, PATH_RULES[platform])).toBe(row.expected)
      })
    }
  }

  for (const row of SAVE_ROWS) {
    for (const platform of row.platforms) {
      const verb = row.kept ? 'keeps' : 'drops'

      it(`save dialog ${verb} ${JSON.stringify(row.input)} (${platform})`, () => {
        rows++
        const expected = row.kept ? row.input : undefined

        expect(checkSaveDefaultPath(row.input, PATH_RULES[platform])).toBe(expected)
      })
    }
  }

  it('counts its rows and touched no file', () => {
    console.log(`dialog default rows ${rows}`)

    expect(rows).toBeGreaterThan(0)
    expect(fsSpies.length).toBeGreaterThan(0)
    expect(fsSpies.filter((spy) => spy.calls() > 0).map((spy) => spy.name)).toEqual([])
  })
})
