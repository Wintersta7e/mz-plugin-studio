// Tests for the packaged test artifact checks: the twin's fuse wire differs from the release's
// in the inspect fuse only, and every other file of the two trees is identical
import { afterAll, afterEach, describe, expect, it } from 'vitest'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { dirname, join } from 'path'
import { compareWires, diffTrees, formatWire } from '../../scripts/e2e-prepare.mjs'

const EXE = 'mz-plugin-studio'

// Wires as getCurrentFuseWire returns them: the version, then fuse index -> state char code
const RELEASE = '010011011'
const TWIN = '010111011'

function wire(states: string): Record<string, number | string> {
  return Object.fromEntries([
    ['version', '1'],
    ...[...states].map((state, index) => [String(index), state.charCodeAt(0)])
  ])
}

const tempDirs: string[] = []
const counts = { wire: 0, tree: 0 }

afterEach(() => {
  for (const dir of tempDirs.splice(0)) rmSync(dir, { recursive: true, force: true })
})

afterAll(() => {
  console.log(`e2e-prepare: wire cases ${counts.wire}, tree cases ${counts.tree}`)
})

// A directory holding the given files, relative path -> content
function tree(files: Record<string, string>): string {
  const dir = mkdtempSync(join(tmpdir(), 'e2e-prepare-'))
  tempDirs.push(dir)
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(dirname(join(dir, path)), { recursive: true })
    writeFileSync(join(dir, path), content)
  }
  return dir
}

describe('compareWires', () => {
  it('accepts wires that differ only in the inspect fuse', () => {
    counts.wire++
    expect(compareWires(wire(RELEASE), wire(TWIN))).toEqual({
      diff: ['EnableNodeCliInspectArguments 0→1']
    })
  })

  it('rejects a second differing fuse, naming it', () => {
    counts.wire++
    expect(() => compareWires(wire(RELEASE), wire('110111011'))).toThrow(/RunAsNode/)
  })

  it('rejects a release with the inspect fuse on', () => {
    counts.wire++
    expect(() => compareWires(wire(TWIN), wire(TWIN))).toThrow(
      /release has EnableNodeCliInspectArguments/
    )
  })

  it('rejects wires with no difference', () => {
    counts.wire++
    expect(() => compareWires(wire(RELEASE), wire(RELEASE))).toThrow(
      /EnableNodeCliInspectArguments/
    )
  })

  it('prints each fuse state as 0, 1 or r', () => {
    counts.wire++
    expect(formatWire(wire('01r'))).toBe(
      'RunAsNode=0 EnableCookieEncryption=1 EnableNodeOptionsEnvironmentVariable=r'
    )
  })
})

describe('diffTrees', () => {
  it('reports a differing file other than the executable', async () => {
    counts.tree++
    const release = tree({ [EXE]: 'release', 'resources/app.asar': 'a', 'locales/en.pak': 'e' })
    const twin = tree({ [EXE]: 'twin', 'resources/app.asar': 'b', 'locales/en.pak': 'e' })
    expect(await diffTrees(release, twin, EXE)).toEqual({
      compared: 2,
      differing: ['resources/app.asar']
    })
  })

  it('reports a file present on one side only', async () => {
    counts.tree++
    const release = tree({ [EXE]: 'release', 'a.pak': 'a', 'b.pak': 'b' })
    const twin = tree({ [EXE]: 'twin', 'a.pak': 'a', 'c.pak': 'c' })
    expect(await diffTrees(release, twin, EXE)).toEqual({
      compared: 1,
      differing: ['b.pak (release only)', 'c.pak (twin only)']
    })
  })

  it('fails when no file was compared', async () => {
    counts.tree++
    const release = tree({ [EXE]: 'release' })
    const twin = tree({ [EXE]: 'twin' })
    await expect(diffTrees(release, twin, EXE)).rejects.toThrow(/no file compared/)
  })
})
