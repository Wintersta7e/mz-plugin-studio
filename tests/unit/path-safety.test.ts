// Which paths the IPC path guard accepts, one row per input and path flavour
import path from 'path'
import { describe, it, expect } from 'vitest'
import {
  assertSafeFilePath,
  assertSafeFilename,
  assertSafeProjectPath,
  type PlatformPath
} from '../../src/shared/path-safety'

type Platform = 'posix' | 'win32'

interface Row {
  fn: (input: string, pathImpl?: PlatformPath) => void
  input: string
  platform: Platform
  today: 'accept' | 'reject'
  /** Part of the error message, for rows that reject */
  error?: string | RegExp
}

const PATH_RULES: Record<Platform, PlatformPath> = { posix: path.posix, win32: path.win32 }

const NOT_A_PATH = 'Invalid path: expected a non-empty path without NUL characters'
const NOT_ABSOLUTE = 'Invalid path: must be an absolute path'
const DOT_DOT = "Invalid path: '..' segments are not allowed"
const ROOT = 'Invalid path: a drive or filesystem root cannot be a project folder'
const NAME_SEPARATOR = 'Invalid filename: must not contain path separators or traversal'
const NAME_EXTENSION = 'Invalid filename: must have .js extension'

const ROWS: Row[] = [
  // assertSafeFilePath
  {
    fn: assertSafeFilePath,
    input: '/home/u/proj/js/plugins/../../../../etc/x.json',
    platform: 'posix',
    today: 'reject',
    error: DOT_DOT
  },
  {
    fn: assertSafeFilePath,
    input: '../../x.js',
    platform: 'posix',
    today: 'reject',
    error: NOT_ABSOLUTE
  },
  {
    fn: assertSafeFilePath,
    input: 'plugins/MyPlugin.js',
    platform: 'posix',
    today: 'reject',
    error: NOT_ABSOLUTE
  },
  { fn: assertSafeFilePath, input: '/home/u/My..Plugins/a.js', platform: 'posix', today: 'accept' },
  { fn: assertSafeFilePath, input: '/home/u/proj/plugin.js', platform: 'posix', today: 'accept' },
  {
    fn: assertSafeFilePath,
    input: '/home/u/proj/plugin.mzparams',
    platform: 'posix',
    today: 'accept'
  },
  { fn: assertSafeFilePath, input: '/home/u/proj/data.json', platform: 'posix', today: 'accept' },
  { fn: assertSafeFilePath, input: '/home/u/proj/README.md', platform: 'posix', today: 'accept' },
  { fn: assertSafeFilePath, input: '/home/u/proj/types.ts', platform: 'posix', today: 'accept' },
  { fn: assertSafeFilePath, input: '/home/u/proj/plugin.JS', platform: 'posix', today: 'accept' },
  { fn: assertSafeFilePath, input: '/home/u/proj/data.Json', platform: 'posix', today: 'accept' },
  {
    fn: assertSafeFilePath,
    input: '/home/u/proj/tool.exe',
    platform: 'posix',
    today: 'reject',
    error: 'File extension ".exe" is not allowed'
  },
  {
    fn: assertSafeFilePath,
    input: '/home/u/proj/run.sh',
    platform: 'posix',
    today: 'reject',
    error: 'File extension ".sh" is not allowed'
  },
  {
    fn: assertSafeFilePath,
    input: '/home/u/proj/page.html',
    platform: 'posix',
    today: 'reject',
    error: 'File extension ".html" is not allowed'
  },
  {
    fn: assertSafeFilePath,
    input: '/home/u/proj/noextension',
    platform: 'posix',
    today: 'reject',
    error: 'File extension "" is not allowed'
  },
  {
    fn: assertSafeFilePath,
    input: '/home/u/proj/evil\0.js',
    platform: 'posix',
    today: 'reject',
    error: NOT_A_PATH
  },
  {
    fn: assertSafeFilePath,
    input: 'C:\\Games\\proj\\js\\plugins\\..\\..\\..\\..\\x.json',
    platform: 'win32',
    today: 'reject',
    error: DOT_DOT
  },
  {
    fn: assertSafeFilePath,
    input: 'C:/Games/My..Game/js/plugins/a.js',
    platform: 'win32',
    today: 'accept'
  },
  {
    fn: assertSafeFilePath,
    input: 'C:\\Games\\proj\\js\\plugins\\a.js',
    platform: 'win32',
    today: 'accept'
  },
  { fn: assertSafeFilePath, input: '\\\\host\\share\\x.js', platform: 'win32', today: 'accept' },
  {
    fn: assertSafeFilePath,
    input: '\\\\?\\C:\\x.js',
    platform: 'win32',
    today: 'reject',
    error: NOT_ABSOLUTE
  },
  {
    fn: assertSafeFilePath,
    input: '\\\\.\\C:\\x.js',
    platform: 'win32',
    today: 'reject',
    error: NOT_ABSOLUTE
  },
  {
    fn: assertSafeFilePath,
    input: 'C:x.js',
    platform: 'win32',
    today: 'reject',
    error: NOT_ABSOLUTE
  },
  {
    fn: assertSafeFilePath,
    input: '\\foo\\x.js',
    platform: 'win32',
    today: 'reject',
    error: NOT_ABSOLUTE
  },
  {
    fn: assertSafeFilePath,
    input: 'C:\\Games\\tool.exe',
    platform: 'win32',
    today: 'reject',
    error: 'File extension ".exe" is not allowed'
  },

  // assertSafeFilename
  { fn: assertSafeFilename, input: 'Foo..Bar.js', platform: 'posix', today: 'accept' },
  {
    fn: assertSafeFilename,
    input: 'foo\\bar.js',
    platform: 'posix',
    today: 'reject',
    error: NAME_SEPARATOR
  },
  { fn: assertSafeFilename, input: 'MyPlugin.js', platform: 'posix', today: 'accept' },
  { fn: assertSafeFilename, input: 'my.plugin.v2.js', platform: 'posix', today: 'accept' },
  { fn: assertSafeFilename, input: 'My Plugin.js', platform: 'posix', today: 'accept' },
  { fn: assertSafeFilename, input: 'my-plugin_v2.js', platform: 'posix', today: 'accept' },
  { fn: assertSafeFilename, input: 'プラグイン.js', platform: 'posix', today: 'accept' },
  {
    fn: assertSafeFilename,
    input: 'README',
    platform: 'posix',
    today: 'reject',
    error: NAME_EXTENSION
  },
  {
    fn: assertSafeFilename,
    input: 'foo/bar.js',
    platform: 'posix',
    today: 'reject',
    error: NAME_SEPARATOR
  },
  {
    fn: assertSafeFilename,
    input: '..',
    platform: 'posix',
    today: 'reject',
    error: NAME_SEPARATOR
  },
  {
    fn: assertSafeFilename,
    input: '../evil.js',
    platform: 'posix',
    today: 'reject',
    error: NAME_SEPARATOR
  },
  { fn: assertSafeFilename, input: '..js', platform: 'posix', today: 'accept' },
  {
    fn: assertSafeFilename,
    input: 'plugin\0.js',
    platform: 'posix',
    today: 'reject',
    error: 'Invalid filename: "plugin\\u0000.js"'
  },
  { fn: assertSafeFilename, input: 'Foo..Bar.js', platform: 'win32', today: 'accept' },
  {
    fn: assertSafeFilename,
    input: 'foo\\bar.js',
    platform: 'win32',
    today: 'reject',
    error: NAME_SEPARATOR
  },
  {
    fn: assertSafeFilename,
    input: 'x.js:ads.js',
    platform: 'win32',
    today: 'reject',
    error: 'Invalid filename: "x.js:ads.js"'
  },

  // assertSafeProjectPath
  { fn: assertSafeProjectPath, input: '/home/u/My..Game', platform: 'posix', today: 'accept' },
  {
    fn: assertSafeProjectPath,
    input: '/home/u/../../etc',
    platform: 'posix',
    today: 'reject',
    error: DOT_DOT
  },
  { fn: assertSafeProjectPath, input: '/', platform: 'posix', today: 'reject', error: ROOT },
  { fn: assertSafeProjectPath, input: '/home/u/rpg/project', platform: 'posix', today: 'accept' },
  { fn: assertSafeProjectPath, input: '/home/u/rpg/project/', platform: 'posix', today: 'accept' },
  {
    fn: assertSafeProjectPath,
    input: '/home/u/My Project/RPG',
    platform: 'posix',
    today: 'accept'
  },
  { fn: assertSafeProjectPath, input: '/home/u/ゲーム/', platform: 'posix', today: 'accept' },
  {
    fn: assertSafeProjectPath,
    input: '//server/share/project',
    platform: 'posix',
    today: 'accept'
  },
  {
    fn: assertSafeProjectPath,
    input: '../foo',
    platform: 'posix',
    today: 'reject',
    error: NOT_ABSOLUTE
  },
  {
    fn: assertSafeProjectPath,
    input: 'my-project',
    platform: 'posix',
    today: 'reject',
    error: NOT_ABSOLUTE
  },
  {
    fn: assertSafeProjectPath,
    input: 'C:/Games/project',
    platform: 'posix',
    today: 'reject',
    error: NOT_ABSOLUTE
  },
  { fn: assertSafeProjectPath, input: 'C:\\Games\\My..Game', platform: 'win32', today: 'accept' },
  {
    fn: assertSafeProjectPath,
    input: 'C:\\Games\\..\\..\\Windows',
    platform: 'win32',
    today: 'reject',
    error: DOT_DOT
  },
  { fn: assertSafeProjectPath, input: 'C:\\', platform: 'win32', today: 'reject', error: ROOT },
  { fn: assertSafeProjectPath, input: 'C:/', platform: 'win32', today: 'reject', error: ROOT },
  {
    fn: assertSafeProjectPath,
    input: '\\\\host\\share',
    platform: 'win32',
    today: 'reject',
    error: ROOT
  },
  {
    fn: assertSafeProjectPath,
    input: '\\\\host\\share\\Games\\proj',
    platform: 'win32',
    today: 'accept'
  },
  {
    fn: assertSafeProjectPath,
    input: '\\\\?\\C:\\Games\\proj',
    platform: 'win32',
    today: 'reject',
    error: NOT_ABSOLUTE
  },

  // Input that is not a usable path: the guard's own error, never a TypeError from path
  ...(['posix', 'win32'] as const).flatMap((platform) =>
    [assertSafeFilePath, assertSafeFilename, assertSafeProjectPath].flatMap((fn) =>
      ['', 'a\0.js', undefined as unknown as string].map(
        (input): Row => ({ fn, input, platform, today: 'reject', error: /^Invalid/ })
      )
    )
  )
]

describe('path guard', () => {
  it('has rows for every platform it checks', () => {
    const posix = ROWS.filter((row) => row.platform === 'posix').length
    const win32 = ROWS.filter((row) => row.platform === 'win32').length
    console.log(`path guard rows: ${ROWS.length} (posix ${posix}, win32 ${win32})`)
    expect(posix).toBeGreaterThan(0)
    expect(win32).toBeGreaterThan(0)
  })

  for (const row of ROWS) {
    it(`${row.fn.name} ${row.today}s ${JSON.stringify(row.input)} (${row.platform})`, () => {
      const call = (): void => row.fn(row.input, PATH_RULES[row.platform])
      if (row.today === 'accept') {
        expect(call).not.toThrow()
      } else {
        expect(call).toThrow(row.error)
        expect(call).not.toThrow(TypeError)
      }
    })
  }
})
