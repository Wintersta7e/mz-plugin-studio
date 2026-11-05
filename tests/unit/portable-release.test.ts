// The portable build cannot replace itself, so nothing may check for, download or install
// an update, and the packager is given no update feed or targets other than Windows.
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const ROOT = fileURLToPath(new URL('../../', import.meta.url))
const read = (file: string): string => readFileSync(path.join(ROOT, file), 'utf8')

const UPDATER =
  /update:(?:available|downloaded|download|install)\b|UPDATE_(?:AVAILABLE|DOWNLOADED|DOWNLOAD|INSTALL)\b|electron-updater|setupAutoUpdater|autoUpdater|app-update|UpdateAPI|updateApi|onUpdateAvailable|onUpdateDownloaded|downloadUpdate|installUpdate|api\.update\b/

const REMOVED_LINE =
  '- The app no longer checks GitHub for updates; download new versions from the Releases page.'

function byCodeUnit(left: string, right: string): number {
  if (left === right) return 0
  return left < right ? -1 : 1
}

function sourceFiles(): string[] {
  return readdirSync(path.join(ROOT, 'src'), { recursive: true, encoding: 'utf8' })
    .filter((file) => /\.tsx?$/.test(file))
    .map((file) => path.join('src', file).replaceAll('\\', '/'))
    .toSorted(byCodeUnit)
}

/**
A member of a value parsed from JSON; undefined when the value holds no such member.
*/
function member(value: unknown, key: string): unknown {
  return typeof value === 'object' && value !== null ? Reflect.get(value, key) : undefined
}

// The lines of a file the updater pattern matches, as `file:line: text`
function updaterHits(file: string): string[] {
  return read(file)
    .split(/\r?\n/)
    .map((line, index) => ({ line, number: index + 1 }))
    .filter(({ line }) => UPDATER.test(line))
    .map(({ line, number }) => `${file}:${String(number)}: ${line.trim()}`)
}

describe('portable release without an updater', () => {
  it('no source or packaging file names the updater', () => {
    const files = [...sourceFiles(), 'package.json', 'electron-builder.yml']
    const hits = files.flatMap((file) => updaterHits(file))
    process.stdout.write(
      [
        `updater scan: files ${String(files.length)}, hits ${String(hits.length)}`,
        ...hits,
        ''
      ].join('\n')
    )

    expect(files.length).toBeGreaterThan(2)
    expect(hits).toStrictEqual([])
  })

  it('the updater module is gone', () => {
    expect(existsSync(path.join(ROOT, 'src/main/updater.ts'))).toBe(false)
  })

  it('the packager gets no update feed and no mac or Linux target', () => {
    const topLevel = read('electron-builder.yml')
      .split(/\r?\n/)
      .flatMap((line) => /^([\w-]+):/.exec(line)?.[1] ?? [])

    expect(topLevel).toContain('win')
    expect(
      ['publish', 'mac', 'dmg', 'linux', 'appImage'].filter((key) => topLevel.includes(key))
    ).toStrictEqual([])
  })

  it('package.json builds only Windows and ships no updater', () => {
    const manifest: unknown = JSON.parse(read('package.json'))

    expect(member(manifest, 'scripts')).not.toHaveProperty('build:mac')
    expect(member(manifest, 'scripts')).not.toHaveProperty('build:linux')
    expect(member(manifest, 'dependencies')).not.toHaveProperty('electron-updater')
  })

  it('the 1.7.0 notes tell users where new versions come from', () => {
    const changelog = read('CHANGELOG.md').split(/\r?\n/)
    const start = changelog.findIndex((line) => line.startsWith('## [1.7.0] - '))

    expect(start).toBeGreaterThanOrEqual(0)

    const end = changelog.findIndex((line, index) => index > start && line.startsWith('## ['))
    const release = changelog.slice(start, end === -1 ? changelog.length : end)
    const removed = release.indexOf('### Removed')

    expect(removed).toBeGreaterThan(0)
    expect(release.indexOf(REMOVED_LINE)).toBeGreaterThan(removed)
  })
})
