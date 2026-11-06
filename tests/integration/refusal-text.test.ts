// Main refuses a request with one message shape that the window recognises: every refusal is
// built from the shared prefix, and the window reads its reason back in plain words.
import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { refusalReason } from '../../src/renderer/src/lib/utilities'
import { ACCESS_DENIED, PROJECT_OPEN_CANCELLED, accessDenied } from '../../src/shared/ipc-types'

const SRC = fileURLToPath(new URL('../../src', import.meta.url))

/**
Every TypeScript source file under `directory`
*/
function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true, recursive: true })
    .filter((entry) => !entry.isDirectory() && /\.tsx?$/.test(entry.name))
    .map((entry) => path.join(entry.parentPath, entry.name))
}

/**
How `ipcRenderer.invoke` rejects when main's handler throws `error`
*/
const overIpc = (error: Error): Error =>
  new Error(`Error invoking remote method 'project:load': ${String(error)}`)

describe('refusal text', () => {
  it('only the shared contract spells out the refusal prefix', () => {
    const files = sourceFiles(SRC)
    process.stdout.write(`refusal prefix: scanned ${String(files.length)} source files\n`)

    expect(files.length).toBeGreaterThan(50)

    const writers = files
      .filter((file) => readFileSync(file, 'utf8').includes(ACCESS_DENIED.trim()))
      .map((file) => path.relative(SRC, file).replaceAll('\\', '/'))

    expect(writers).toStrictEqual(['shared/ipc-types.ts'])
  })

  it('the window reads the reason of a refusal as Electron delivers it', () => {
    const delivered = overIpc(accessDenied(PROJECT_OPEN_CANCELLED))

    expect(refusalReason(delivered)).toBe(PROJECT_OPEN_CANCELLED)
    expect(refusalReason(accessDenied('not the open project'))).toBe('not the open project')
  })

  it('an error that is not a refusal has no reason', () => {
    const failure = overIpc(new Error('data folder unreadable'))

    expect(refusalReason(failure)).toBeNull()
    expect(refusalReason('Access denied')).toBeNull()
  })
})
