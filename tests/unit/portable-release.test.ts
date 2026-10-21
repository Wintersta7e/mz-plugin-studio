// The portable build cannot replace itself, so nothing may check for, download or install
// an update, and the packager is given no update feed or targets other than Windows.
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const ROOT = fileURLToPath(new URL('../../', import.meta.url))
const read = (file: string): string => readFileSync(join(ROOT, file), 'utf8')

const UPDATER =
  /update:(available|downloaded|download|install)\b|UPDATE_(AVAILABLE|DOWNLOADED|DOWNLOAD|INSTALL)\b|electron-updater|setupAutoUpdater|autoUpdater|app-update|UpdateAPI|updateApi|onUpdateAvailable|onUpdateDownloaded|downloadUpdate|installUpdate|api\.update\b/

const REMOVED_LINE =
  '- The app no longer checks GitHub for updates; download new versions from the Releases page.'

function sourceFiles(): string[] {
  return (readdirSync(join(ROOT, 'src'), { recursive: true }) as string[])
    .filter((file) => /\.(ts|tsx)$/.test(file))
    .map((file) => join('src', file).split('\\').join('/'))
    .sort()
}

describe('portable release without an updater', () => {
  it('no source or packaging file names the updater', () => {
    const files = [...sourceFiles(), 'package.json', 'electron-builder.yml']
    const hits = files.flatMap((file) =>
      read(file)
        .split(/\r?\n/)
        .flatMap((line, index) =>
          UPDATER.test(line) ? [`${file}:${index + 1}: ${line.trim()}`] : []
        )
    )
    console.log(`updater scan: files ${files.length}, hits ${hits.length}`)
    for (const hit of hits) console.log(hit)
    expect(files.length).toBeGreaterThan(2)
    expect(hits).toEqual([])
  })

  it('the updater module is gone', () => {
    expect(existsSync(join(ROOT, 'src/main/updater.ts'))).toBe(false)
  })

  it('the packager gets no update feed and no mac or Linux target', () => {
    const topLevel = read('electron-builder.yml')
      .split(/\r?\n/)
      .flatMap((line) => /^([\w-]+):/.exec(line)?.[1] ?? [])
    expect(topLevel).toContain('win')
    for (const key of ['publish', 'mac', 'dmg', 'linux', 'appImage']) {
      expect(topLevel, key).not.toContain(key)
    }
  })

  it('package.json builds only Windows and ships no updater', () => {
    const pkg = JSON.parse(read('package.json')) as {
      scripts: Record<string, string>
      dependencies: Record<string, string>
    }
    expect(pkg.scripts).not.toHaveProperty('build:mac')
    expect(pkg.scripts).not.toHaveProperty('build:linux')
    expect(pkg.dependencies).not.toHaveProperty('electron-updater')
  })

  it('the changelog tells users where new versions come from', () => {
    const changelog = read('CHANGELOG.md').split(/\r?\n/)
    const start = changelog.indexOf('## [Unreleased]')
    expect(start).toBeGreaterThanOrEqual(0)
    const end = changelog.findIndex((line, index) => index > start && line.startsWith('## ['))
    const unreleased = changelog.slice(start, end < 0 ? undefined : end)
    const removed = unreleased.indexOf('### Removed')
    expect(removed).toBeGreaterThan(0)
    expect(unreleased.indexOf(REMOVED_LINE)).toBeGreaterThan(removed)
  })
})
