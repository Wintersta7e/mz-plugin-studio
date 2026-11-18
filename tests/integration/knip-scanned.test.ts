// The knip reporter that counts the files a run analysed, run by the real knip against throwaway
// packages: knip itself passes a run whose entries match nothing, so the reporter fails it.
import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'

const ROOT = path.resolve(import.meta.dirname, '../..')
const KNIP = path.join(ROOT, 'node_modules/knip/bin/knip.js')
const REPORTER = path.join(ROOT, 'scripts/knip-scanned.mjs')

const directories: string[] = []

// knip in a package whose only module is src/index.ts, with the entry and project globs `globs`.
const knip = (globs: string): { status: number | null; out: string } => {
  const prefix = path.join(tmpdir(), 'knip-scanned-')
  const directory = realpathSync(mkdtempSync(prefix))
  directories.push(directory)
  mkdirSync(path.join(directory, 'src'))
  const files = {
    'package.json': JSON.stringify({ name: 'fixture', version: '0.0.0' }),
    'knip.json': JSON.stringify({ entry: [globs], project: [globs] }),
    'src/index.ts': 'export const value = 1\n'
  }
  for (const [file, text] of Object.entries(files)) {
    writeFileSync(path.join(directory, file), text)
  }
  const result = spawnSync(
    process.execPath,
    [KNIP, '--reporter', 'symbols', '--reporter', REPORTER],
    { cwd: directory, encoding: 'utf8' }
  )
  return { status: result.status, out: `${result.stdout}${result.stderr}` }
}

describe('knip scanned files', () => {
  afterEach(() => {
    for (const directory of directories.splice(0)) {
      rmSync(directory, { recursive: true, force: true })
    }
  })

  it('(o) fails a knip run that scanned no file', () => {
    const result = knip('nothing/**/*.ts')

    expect(result.out).toContain('knip scanned: files 0 of 0')
    expect(result.out).toContain('knip scanned: the run analysed no file')
    expect(result.status).toBe(1)
  })

  it('passes a run that analysed its files, printing their count', () => {
    const result = knip('src/**/*.ts')

    expect(result.out).toContain('knip scanned: files 1 of 1')
    expect(result.status).toBe(0)
  })
})
