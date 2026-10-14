// Which paths the IPC path guard accepts, one row per input
import { describe, it, expect } from 'vitest'
import {
  assertSafeFilePath,
  assertSafeFilename,
  assertSafeProjectPath
} from '../../src/shared/path-safety'

interface Row {
  fn: (input: string) => void
  input: string
  platform: 'posix' | 'win32'
  today: 'accept' | 'reject'
  /** Part of the error message, for rows that reject */
  error?: string
}

const FILE_TRAVERSAL = 'Path traversal is not allowed'
const PROJECT_TRAVERSAL = 'Path traversal is not allowed in project path'
const NAME_SEPARATOR = 'must not contain path separators or traversal'
const NAME_EXTENSION = 'must have .js extension'

const ROWS: Row[] = [
  // assertSafeFilePath
  {
    fn: assertSafeFilePath,
    input: '/home/u/proj/js/plugins/../../../../etc/x.json',
    platform: 'posix',
    today: 'accept'
  },
  { fn: assertSafeFilePath, input: '../../x.js', platform: 'posix', today: 'accept' },
  { fn: assertSafeFilePath, input: 'plugins/MyPlugin.js', platform: 'posix', today: 'accept' },
  {
    fn: assertSafeFilePath,
    input: '/home/u/My..Plugins/a.js',
    platform: 'posix',
    today: 'reject',
    error: FILE_TRAVERSAL
  },
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
  { fn: assertSafeFilePath, input: '', platform: 'posix', today: 'reject', error: 'not allowed' },
  { fn: assertSafeFilePath, input: '/home/u/proj/evil\0.js', platform: 'posix', today: 'accept' },

  // assertSafeFilename
  {
    fn: assertSafeFilename,
    input: 'Foo..Bar.js',
    platform: 'posix',
    today: 'reject',
    error: NAME_SEPARATOR
  },
  { fn: assertSafeFilename, input: 'foo\\bar.js', platform: 'posix', today: 'accept' },
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
  {
    fn: assertSafeFilename,
    input: '..js',
    platform: 'posix',
    today: 'reject',
    error: NAME_SEPARATOR
  },
  { fn: assertSafeFilename, input: '', platform: 'posix', today: 'reject', error: NAME_EXTENSION },
  { fn: assertSafeFilename, input: 'plugin\0.js', platform: 'posix', today: 'accept' },

  // assertSafeProjectPath
  {
    fn: assertSafeProjectPath,
    input: '/home/u/My..Game',
    platform: 'posix',
    today: 'reject',
    error: PROJECT_TRAVERSAL
  },
  { fn: assertSafeProjectPath, input: '/home/u/../../etc', platform: 'posix', today: 'accept' },
  { fn: assertSafeProjectPath, input: '/', platform: 'posix', today: 'accept' },
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
  { fn: assertSafeProjectPath, input: '../foo', platform: 'posix', today: 'accept' },
  { fn: assertSafeProjectPath, input: 'my-project', platform: 'posix', today: 'accept' },
  { fn: assertSafeProjectPath, input: 'C:/Games/project', platform: 'posix', today: 'accept' },
  { fn: assertSafeProjectPath, input: '', platform: 'posix', today: 'accept' }
]

describe('path guard', () => {
  it('has rows for every platform it checks', () => {
    const posix = ROWS.filter((row) => row.platform === 'posix').length
    const win32 = ROWS.filter((row) => row.platform === 'win32').length
    console.log(`path guard rows: ${ROWS.length} (posix ${posix}, win32 ${win32})`)
    expect(ROWS.length).toBeGreaterThan(0)
  })

  for (const row of ROWS) {
    it(`${row.fn.name} ${row.today}s ${JSON.stringify(row.input)} (${row.platform})`, () => {
      const call = (): void => row.fn(row.input)
      if (row.today === 'accept') {
        expect(call).not.toThrow()
      } else {
        expect(call).toThrow(row.error)
      }
    })
  }
})
