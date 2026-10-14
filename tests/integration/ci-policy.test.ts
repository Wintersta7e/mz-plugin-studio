// Tests for scripts/ci-policy.mjs, run as a child process against synthetic inputs
import { afterEach, describe, expect, it } from 'vitest'
import { spawnSync } from 'child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { dirname, join, resolve } from 'path'

const SCRIPT = resolve('scripts/ci-policy.mjs')

type AsarTree = { [name: string]: number | AsarTree }

function runPolicy(args: string[], cwd?: string): { status: number | null; out: string } {
  const result = spawnSync(process.execPath, [SCRIPT, ...args], { cwd, encoding: 'utf8' })
  return { status: result.status, out: result.stdout + result.stderr }
}

function lines(out: string): string[] {
  return out.split(/\r?\n/)
}

function headerOf(tree: AsarTree, next: { offset: number }): { files: Record<string, unknown> } {
  const files: Record<string, unknown> = {}
  for (const [name, node] of Object.entries(tree)) {
    if (typeof node === 'number') {
      files[name] = { size: node, offset: String(next.offset) }
      next.offset += node
    } else {
      files[name] = headerOf(node, next)
    }
  }
  return { files }
}

// Header only: u32le 4, header size H, H - 4, i32le JSON length, JSON padded to 4 bytes
function writeAsar(file: string, tree: AsarTree): void {
  const json = Buffer.from(JSON.stringify(headerOf(tree, { offset: 0 })))
  const size = 8 + Math.ceil(json.length / 4) * 4
  const buffer = Buffer.alloc(8 + size)
  buffer.writeUInt32LE(4, 0)
  buffer.writeUInt32LE(size, 4)
  buffer.writeUInt32LE(size - 4, 8)
  buffer.writeInt32LE(json.length, 12)
  json.copy(buffer, 16)
  writeFileSync(file, buffer)
}

const tempDirs: string[] = []

function tempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'ci-policy-'))
  tempDirs.push(dir)
  return dir
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) rmSync(dir, { recursive: true, force: true })
})

function writeFiles(root: string, files: Record<string, string>): void {
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true })
    writeFileSync(join(root, path), content)
  }
}

const ALLOWED: AsarTree = {
  out: { main: { 'index.js': 1000 } },
  resources: { 'icon.png': 200 },
  node_modules: {
    '@scope': { a: { 'index.js': 30 } },
    b: { node_modules: { c: { 'index.js': 40 } } }
  },
  'package.json': 5,
  LICENSE: 6,
  'THIRD_PARTY_LICENSES.md': 7
}

function checkAsar(tree: AsarTree): { status: number | null; out: string } {
  const file = join(tempDir(), 'app.asar')
  writeAsar(file, tree)
  return runPolicy(['package', file])
}

describe('ci-policy package', () => {
  it('accepts the allowed layout and reports its sizes and packages', () => {
    const { status, out } = checkAsar(ALLOWED)
    expect(status).toBe(0)
    expect(lines(out)).toContain(
      'entries 7; total 1288 bytes; out/ 1000 bytes; node_modules/ 70 bytes (budget 2097152)'
    )
    expect(lines(out)).toContain(
      'top-level: LICENSE, THIRD_PARTY_LICENSES.md, node_modules/, out/, package.json, resources/'
    )
    expect(lines(out)).toContain('node_modules packages 3: @scope/a, b, c')
    expect(lines(out)).toContain('ci-policy package: ok')
  })

  it('rejects a top-level entry outside the allowed set', () => {
    const { status, out } = checkAsar({ ...ALLOWED, tests: { 'a.test.ts': 1 } })
    expect(lines(out)).toContain('FAIL disallowed top-level entry: tests/')
    expect(status).toBe(1)
  })

  it('rejects an allowed name of the wrong kind', () => {
    const { status, out } = checkAsar({ ...ALLOWED, out: 1 })
    expect(lines(out)).toContain('FAIL disallowed top-level entry: out')
    expect(status).toBe(1)
  })

  it('accepts node_modules at the budget and rejects one byte over', () => {
    const atBudget = checkAsar({ ...ALLOWED, node_modules: { x: { 'index.js': 2097152 } } })
    expect(atBudget.status).toBe(0)
    const over = checkAsar({ ...ALLOWED, node_modules: { x: { 'index.js': 2097153 } } })
    expect(lines(over.out)).toContain('FAIL node_modules/ 2097153 bytes > budget 2097152')
    expect(over.status).toBe(1)
  })

  it('requires the third-party licence file', () => {
    const { 'THIRD_PARTY_LICENSES.md': _omitted, ...tree } = ALLOWED
    const { status, out } = checkAsar(tree)
    expect(lines(out)).toContain('FAIL missing: THIRD_PARTY_LICENSES.md')
    expect(status).toBe(1)
  })

  it('fails an archive with no entries', () => {
    const { status, out } = checkAsar({})
    expect(lines(out)).toContain('FAIL 0 entries scanned')
    expect(status).toBe(1)
  })

  it('fails a file that is not an asar archive', () => {
    const file = join(tempDir(), 'app.asar')
    writeFileSync(file, Buffer.alloc(64, 0xff))
    const { status, out } = runPolicy(['package', file])
    expect(lines(out)).toContain('FAIL not an asar header')
    expect(status).toBe(1)
  })

  it('fails a path that does not exist', () => {
    const missing = join(tempDir(), 'missing.asar')
    const { status, out } = runPolicy(['package', missing])
    expect(lines(out)).toContain(`not found: ${missing}`)
    expect(status).toBe(1)
  })
})

const MAIN_SOURCE = [
  'import {',
  '  one,',
  '  type Two',
  "} from 'a/sub'",
  "import { type T, v } from '@s/b'",
  "import { type Only } from 'typeonly1'",
  "import type D from 'typeonly2'",
  "export type { E } from 'typeonly3'",
  "import { app } from 'electron'",
  "import { join } from 'path'",
  "import { readFile } from 'node:fs/promises'",
  "import y from './y'",
  ''
].join('\n')

const DEPENDENCIES = { a: '1.0.0', '@s/b': '1.0.0', f: '1.0.0', g: '1.0.0' }

function sourceRoot(dependencies: Record<string, string>, mainSource = MAIN_SOURCE): string {
  const root = tempDir()
  writeFiles(root, {
    'package.json': JSON.stringify({ name: 'fixture', dependencies }),
    'src/main/x.ts': mainSource,
    'src/preload/p.ts': "const m = await import('f')\n",
    'src/shared/s.ts': "import 'g'\n",
    'src/shared/t.d.ts': "import z from 'dts-only'\n"
  })
  return root
}

describe('ci-policy runtime-deps', () => {
  it('counts value imports and skips type-only, relative, builtin and electron imports', () => {
    const { status, out } = runPolicy(['runtime-deps'], sourceRoot(DEPENDENCIES))
    expect(status).toBe(0)
    expect(lines(out)).toContain(
      'ci-policy runtime-deps: files scanned 3 (src/main 1, src/preload 1, src/shared 1)'
    )
    expect(lines(out)).toContain('value imports 4: @s/b, a, f, g')
    expect(lines(out)).toContain('ci-policy runtime-deps: ok')
  })

  it('fails a dependency nothing imports', () => {
    const { status, out } = runPolicy(['runtime-deps'], sourceRoot({ ...DEPENDENCIES, c: '1.0.0' }))
    expect(lines(out)).toContain('in dependencies, not imported 1: c')
    expect(status).toBe(1)
  })

  it('fails an import missing from dependencies', () => {
    const root = sourceRoot(DEPENDENCIES, `${MAIN_SOURCE}export { h } from 'h'\n`)
    const { status, out } = runPolicy(['runtime-deps'], root)
    expect(lines(out)).toContain('imported, not in dependencies 1: h')
    expect(status).toBe(1)
  })

  it('fails when no source file is scanned', () => {
    const root = tempDir()
    writeFiles(root, { 'package.json': JSON.stringify({ name: 'fixture', dependencies: {} }) })
    const { status, out } = runPolicy(['runtime-deps'], root)
    expect(lines(out)).toContain(
      'ci-policy runtime-deps: files scanned 0 (src/main 0, src/preload 0, src/shared 0)'
    )
    expect(status).toBe(1)
  })

  it('reads an import clause that holds a line comment', () => {
    const source = [
      'import {',
      "  one, // was from 'old-name'",
      '  two',
      "} from 'line-comment'",
      'import {',
      '  type A, // a type',
      '  type B',
      "} from 'typeonly-commented'",
      ''
    ].join('\n')
    const root = sourceRoot({ 'line-comment': '1.0.0', f: '1.0.0', g: '1.0.0' }, source)
    const { status, out } = runPolicy(['runtime-deps'], root)
    expect(lines(out)).toContain('value imports 3: f, g, line-comment')
    expect(lines(out)).toContain('unclassified imports 0:')
    expect(status).toBe(0)
  })

  it('reads an import clause that holds a block comment', () => {
    const source = [
      "import { one /* why */, two } from 'block-comment'",
      "import /* default */ three from 'block-default'",
      ''
    ].join('\n')
    const dependencies = {
      'block-comment': '1.0.0',
      'block-default': '1.0.0',
      f: '1.0.0',
      g: '1.0.0'
    }
    const { status, out } = runPolicy(['runtime-deps'], sourceRoot(dependencies, source))
    expect(lines(out)).toContain('value imports 4: block-comment, block-default, f, g')
    expect(status).toBe(0)
  })

  it('reads a re-export that follows a local type export', () => {
    const source = "export type { E }\nexport { h } from 'after-type-export'\n"
    const dependencies = { 'after-type-export': '1.0.0', f: '1.0.0', g: '1.0.0' }
    const { status, out } = runPolicy(['runtime-deps'], sourceRoot(dependencies, source))
    expect(lines(out)).toContain('value imports 3: after-type-export, f, g')
    expect(status).toBe(0)
  })

  it('reads a default import named type as a value import', () => {
    const source = "import type from 'default-named-type'\n"
    const dependencies = { 'default-named-type': '1.0.0', f: '1.0.0', g: '1.0.0' }
    const { status, out } = runPolicy(['runtime-deps'], sourceRoot(dependencies, source))
    expect(lines(out)).toContain('value imports 3: default-named-type, f, g')
    expect(status).toBe(0)
  })

  it('fails a from-import no pattern reads, naming its file and line', () => {
    const source = "import { app } from 'electron'\nimport { 'a-b' as ab } from 'quoted-name'\n"
    const { status, out } = runPolicy(
      ['runtime-deps'],
      sourceRoot({ f: '1.0.0', g: '1.0.0' }, source)
    )
    expect(lines(out)).toContain('unclassified imports 1: src/main/x.ts:2')
    expect(lines(out)).toContain('ci-policy runtime-deps: FAILED')
    expect(status).toBe(1)
  })

  it('passes on the repository tree', () => {
    const { status, out } = runPolicy(['runtime-deps'])
    const lineStarting = (prefix: string) => lines(out).find((line) => line.startsWith(prefix))
    expect(lineStarting('in dependencies, not imported')).toBe('in dependencies, not imported 0:')
    expect(lineStarting('imported, not in dependencies')).toBe('imported, not in dependencies 0:')
    expect(lineStarting('unclassified imports')).toBe('unclassified imports 0:')
    expect(out).toMatch(/files scanned [1-9]\d* \(/)
    expect(status).toBe(0)
  })
})

describe('ci-policy usage', () => {
  it('fails without a subcommand or with an unknown one', () => {
    for (const args of [[], ['bogus']]) {
      const { status, out } = runPolicy(args)
      expect(out).toContain('usage: ci-policy <package <app.asar> | runtime-deps>')
      expect(status).toBe(1)
    }
  })
})
