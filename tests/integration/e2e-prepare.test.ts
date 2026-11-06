// Tests for the packaged test artifact checks: the twin's fuse wire differs from the release's
// in the inspect fuse only, every other file of the two trees is identical, and the renderer
// page loads no code editor at start
import { afterAll, afterEach, describe, expect, it } from 'vitest'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import {
  checkStartScripts,
  compareWires,
  diffTrees,
  formatWire,
  REUSE_FLAG,
  shouldReuse
} from '../../scripts/e2e-prepare.mjs'

const EXE = 'mz-plugin-studio'

// Wires as getCurrentFuseWire returns them: the version, then fuse index -> state char code
const RELEASE = '010011011'
const TWIN = '010111011'

function wire(states: string): Record<string, number | string> {
  const fuses = Array.from(states, (state, index): [string, number] => [
    String(index),
    state.codePointAt(0) ?? 0
  ])
  const entries: [string, number | string][] = [['version', '1'], ...fuses]
  return Object.fromEntries(entries)
}

const temporaryDirectories: string[] = []
const counts = { wire: 0, tree: 0, reuse: 0, start: 0 }
// Describe blocks run in shuffled order: the counts print once the last of the four ends
const describes = { total: 4, finished: 0 }

function removeTemporaryDirectories(): void {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true })
  }
}

function printCounts(): void {
  describes.finished += 1
  if (describes.finished < describes.total) return
  const cases = [
    `wire cases ${String(counts.wire)}`,
    `tree cases ${String(counts.tree)}`,
    `reuse cases ${String(counts.reuse)}`,
    `start script cases ${String(counts.start)}`
  ]
  process.stdout.write(`e2e-prepare: ${cases.join(', ')}\n`)
}

// A directory holding the given files, relative path -> content
function tree(files: Record<string, string>): string {
  const directory = mkdtempSync(path.join(tmpdir(), 'e2e-prepare-'))
  temporaryDirectories.push(directory)
  for (const [file, content] of Object.entries(files)) {
    mkdirSync(path.dirname(path.join(directory, file)), { recursive: true })
    writeFileSync(path.join(directory, file), content)
  }
  return directory
}

const unpacked = (): string => tree({ [EXE]: 'release', 'resources/app.asar': 'a' })

const page = (...scripts: string[]): string =>
  [
    '<head>',
    ...scripts.map((source, index) =>
      index === 0
        ? `<script type="module" crossorigin src="${source}"></script>`
        : `<link rel="modulepreload" crossorigin href="${source}">`
    ),
    '<link rel="stylesheet" crossorigin href="./assets/index-c3.css">',
    '</head>'
  ].join('\n')

describe(compareWires, () => {
  afterAll(printCounts)

  it('accepts wires that differ only in the inspect fuse', () => {
    counts.wire++

    expect(compareWires(wire(RELEASE), wire(TWIN))).toStrictEqual({
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

describe(diffTrees, () => {
  afterEach(removeTemporaryDirectories)

  afterAll(printCounts)

  it('reports a differing file other than the executable', async () => {
    expect.assertions(1)

    counts.tree++
    const release = tree({ [EXE]: 'release', 'resources/app.asar': 'a', 'locales/en.pak': 'e' })
    const twin = tree({ [EXE]: 'twin', 'resources/app.asar': 'b', 'locales/en.pak': 'e' })

    await expect(diffTrees(release, twin, EXE)).resolves.toStrictEqual({
      compared: 2,
      differing: ['resources/app.asar']
    })
  })

  it('reports a file present on one side only', async () => {
    expect.assertions(1)

    counts.tree++
    const release = tree({ [EXE]: 'release', 'a.pak': 'a', 'b.pak': 'b' })
    const twin = tree({ [EXE]: 'twin', 'a.pak': 'a', 'c.pak': 'c' })

    await expect(diffTrees(release, twin, EXE)).resolves.toStrictEqual({
      compared: 1,
      differing: ['b.pak (release only)', 'c.pak (twin only)']
    })
  })

  it('fails when no file was compared', async () => {
    expect.assertions(1)

    counts.tree++
    const release = tree({ [EXE]: 'release' })
    const twin = tree({ [EXE]: 'twin' })

    await expect(diffTrees(release, twin, EXE)).rejects.toThrow(/no file compared/)
  })
})

describe(shouldReuse, () => {
  afterEach(removeTemporaryDirectories)

  afterAll(printCounts)

  it('rebuilds an existing unpacked release unless asked to reuse it', () => {
    counts.reuse++

    expect(shouldReuse([], unpacked())).toBe(false)
  })

  it('reuses an existing unpacked release when asked', () => {
    counts.reuse++

    expect(shouldReuse([REUSE_FLAG], unpacked())).toBe(true)
  })

  it('builds when asked to reuse a release that is absent', () => {
    counts.reuse++

    const absent = path.join(unpacked(), 'absent')

    expect(shouldReuse([REUSE_FLAG], absent)).toBe(false)
  })
})

describe(checkStartScripts, () => {
  afterEach(removeTemporaryDirectories)

  afterAll(printCounts)

  const app = '// src/renderer/src/main.tsx\nrender();\n'
  const editor = '// node_modules/monaco-editor/esm/vs/editor/editor.api.js\nvar editor = {};\n'

  it('passes when the code editor sits only in a chunk loaded later, giving each size', () => {
    counts.start++
    const directory = tree({
      'index.html': page('./assets/index-a1.js', './assets/vendor-b2.js'),
      'assets/index-a1.js': `${app}import('./editor-d4.js');\n`,
      'assets/vendor-b2.js': '// node_modules/react/index.js\nvar react = {};\n',
      'assets/editor-d4.js': editor
    })

    expect(checkStartScripts(directory)).toStrictEqual([
      { file: './assets/index-a1.js', bytes: 65, editorBytes: 0 },
      { file: './assets/vendor-b2.js', bytes: 47, editorBytes: 0 }
    ])
  })

  it('fails naming a start script that holds the code editor', () => {
    counts.start++
    const directory = tree({
      'index.html': page('./assets/index-a1.js', './assets/vendor-b2.js'),
      'assets/index-a1.js': app,
      'assets/vendor-b2.js': `${app}${editor}`
    })

    expect(() => checkStartScripts(directory)).toThrow(
      './assets/vendor-b2.js loads the code editor at start'
    )
  })

  it('fails when the page loads no script', () => {
    counts.start++
    const directory = tree({ 'index.html': page() })

    expect(() => checkStartScripts(directory)).toThrow(/loads no script/)
  })

  it('fails when a script has no module comment to attribute its bytes by', () => {
    counts.start++
    const directory = tree({
      'index.html': page('./assets/index-a1.js'),
      'assets/index-a1.js': 'var a=1;render();\n'
    })

    expect(() => checkStartScripts(directory)).toThrow(/no module comment/)
  })
})
