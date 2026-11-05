// Main refuses a request with one message shape that the window recognises: every refusal is
// built from the shared prefix, and the window reads its reason back in plain words.
import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { refusalReason } from '../../src/renderer/src/lib/utils'
import { ACCESS_DENIED, PROJECT_OPEN_CANCELLED, accessDenied } from '../../src/shared/ipc-types'

const SRC = fileURLToPath(new URL('../../src', import.meta.url))

/** Every TypeScript source file under `dir` */
function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const file = join(dir, entry.name)
    if (entry.isDirectory()) return sourceFiles(file)
    return /\.tsx?$/.test(entry.name) ? [file] : []
  })
}

/** How `ipcRenderer.invoke` rejects when main's handler throws `error` */
const overIpc = (error: Error): Error =>
  new Error(`Error invoking remote method 'project:load': ${String(error)}`)

describe('refusal text', () => {
  it('only the shared contract spells out the refusal prefix', () => {
    const files = sourceFiles(SRC)
    console.log(`refusal prefix: scanned ${files.length} source files`)

    expect(files.length).toBeGreaterThan(50)

    const writers = files
      .filter((file) => readFileSync(file, 'utf8').includes(ACCESS_DENIED.trim()))
      .map((file) => relative(SRC, file).replaceAll('\\', '/'))

    expect(writers).toEqual(['shared/ipc-types.ts'])
  })

  it('the window reads the reason of a refusal as Electron delivers it', () => {
    expect(refusalReason(overIpc(accessDenied(PROJECT_OPEN_CANCELLED)))).toBe(
      PROJECT_OPEN_CANCELLED
    )
    expect(refusalReason(accessDenied('not the open project'))).toBe('not the open project')
  })

  it('an error that is not a refusal has no reason', () => {
    expect(refusalReason(overIpc(new Error('data folder unreadable')))).toBeNull()
    expect(refusalReason('Access denied')).toBeNull()
  })
})
