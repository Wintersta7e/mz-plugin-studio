// Tests for `ci-policy fuses`: the packaged executable's fuse wire holds the required states
import { afterEach, describe, expect, it } from 'vitest'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { FuseV1Options } from '@electron/fuses'

const SCRIPT = fileURLToPath(new URL('../../scripts/ci-policy.mjs', import.meta.url))
const BUILDER_CONFIG = fileURLToPath(new URL('../../electron-builder.yml', import.meta.url))
const SENTINEL = 'dL7pKGdnNz796PbbjQWNKmHXBZaB9tsX'

// The wire of an unfused Electron binary (41 and 45 alike), and the one the packaged app must carry
const STOCK = '101100011'
const PRODUCTION = '010011011'

// electron-builder's `electronFuses:` keys and the wire index each one sets
const BUILDER_KEYS = new Map([
  ['runAsNode', 0],
  ['enableCookieEncryption', 1],
  ['enableNodeOptionsEnvironmentVariable', 2],
  ['enableNodeCliInspectArguments', 3],
  ['enableEmbeddedAsarIntegrityValidation', 4],
  ['onlyLoadAppFromAsar', 5],
  ['loadBrowserProcessSpecificV8Snapshot', 6],
  ['grantFileProtocolExtraPrivileges', 7]
])

// What the production wire prints when it passes
const PASSING_LINES = [
  'fuse RunAsNode: disabled (required disabled)\n',
  'fuse GrantFileProtocolExtraPrivileges: enabled (required enabled)\n',
  'fuse WasmTrapHandlers: enabled (default, not checked)\n',
  'fuses: wire version 1, fuses 9, checked 7\n',
  'ci-policy fuses: ok\n'
]

// The installed fuses package's names, and the stock wire padded to as many fuses
const NAMES = Object.values(FuseV1Options).filter((v): v is string => typeof v === 'string')
const PADDED_STOCK = STOCK.padEnd(NAMES.length, '0')

const PRIVILEGES_OFF = 'FAIL fuse GrantFileProtocolExtraPrivileges: disabled, required enabled\n'
const SNAPSHOT_UNCHECKED =
  'fuse LoadBrowserProcessSpecificV8Snapshot: enabled (default, not checked)\n'
const NODE_OPTIONS_INHERITED =
  'FAIL fuse EnableNodeOptionsEnvironmentVariable: inherit, required disabled\n'

const temporaryDirectories: string[] = []

function wire(states: string, version = 1): Buffer {
  return Buffer.concat([
    Buffer.from(SENTINEL, 'latin1'),
    Buffer.from([version, states.length]),
    Buffer.from(states, 'latin1')
  ])
}

// A fake executable: filler, the given wires, filler
function binary(...wires: Buffer[]): string {
  const directory = mkdtempSync(path.join(tmpdir(), 'ci-policy-fuses-'))
  temporaryDirectories.push(directory)
  const file = path.join(directory, 'app.exe')
  const filler = Buffer.alloc(64, 0xcc)
  writeFileSync(file, Buffer.concat([filler, ...wires.flatMap((each) => [each, filler])]))
  return file
}

function fuses(file: string): { status: number | null; out: string } {
  const result = spawnSync(process.execPath, [SCRIPT, 'fuses', file], { encoding: 'utf8' })
  return { status: result.status, out: result.stdout + result.stderr }
}

// The `electronFuses:` block of electron-builder.yml as key -> boolean; an unknown key throws
function builderFuses(): Map<string, boolean> {
  const lines = readFileSync(BUILDER_CONFIG, 'utf8').split(/\r?\n/)
  const start = lines.indexOf('electronFuses:')
  const fuses = new Map<string, boolean>()
  if (start === -1) return fuses
  const following = lines.slice(start + 1)
  for (const line of following) {
    if (!line.startsWith('  ')) break
    if (line.trimStart().startsWith('#')) continue
    const match = /^ {2}(\w+): (true|false)$/.exec(line)
    const key = match?.at(1)
    if (key === undefined || !BUILDER_KEYS.has(key)) {
      throw new Error(`unknown electronFuses line: ${line}`)
    }
    fuses.set(key, match?.at(2) === 'true')
  }
  return fuses
}

// The stock wire with each configured fuse set
function applyFuses(fuses: Map<string, boolean>): string {
  const flipped = new Map(
    fuses.entries().map(([key, on]) => [BUILDER_KEYS.get(key), on ? '1' : '0'] as const)
  )
  return STOCK.replaceAll(/./g, (state, index: number) => flipped.get(index) ?? state)
}

function removeTemporaryDirectories(): void {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true })
  }
}

// The fuse names a run prints, in wire order
function printedNames(out: string): (string | undefined)[] {
  return out
    .matchAll(/^fuse (\w+): /gm)
    .map((match) => match.at(1))
    .toArray()
}

// The expected fragments the output does not contain
function missingFrom(out: string, fragments: readonly string[]): string[] {
  return fragments.filter((fragment) => !out.includes(fragment))
}

describe('ci-policy fuses', () => {
  afterEach(removeTemporaryDirectories)

  it('passes the production wire and prints every fuse', () => {
    const { status, out } = fuses(binary(wire(PRODUCTION)))

    expect(out.match(/^fuse /gm)).toHaveLength(9)
    expect(missingFrom(out, PASSING_LINES)).toStrictEqual([])
    expect(status).toBe(0)
  })

  it("fails an unfused Electron binary's wire, naming RunAsNode", () => {
    const { status, out } = fuses(binary(wire(STOCK)))

    expect(out).toContain('FAIL fuse RunAsNode: enabled, required disabled\n')
    expect(out).toContain('ci-policy fuses: FAILED (6 problems)\n')
    expect(status).toBe(1)
  })

  it('fails when file protocol privileges are off', () => {
    const { status, out } = fuses(binary(wire('010011001')))

    expect(out).toContain(PRIVILEGES_OFF)
    expect(status).toBe(1)
  })

  it('does not check the two fuses left at their default', () => {
    const { status, out } = fuses(binary(wire('010011110')))

    expect(out).toContain(SNAPSHOT_UNCHECKED)
    expect(out).toContain('fuse WasmTrapHandlers: disabled (default, not checked)\n')
    expect(status).toBe(0)
  })

  it('fails a removed or inherited required fuse', () => {
    const { status, out } = fuses(binary(wire(`r1\u{90}011011`)))

    expect(out).toContain('FAIL fuse RunAsNode: removed, required disabled\n')
    expect(out).toContain(NODE_OPTIONS_INHERITED)
    expect(status).toBe(1)
  })

  it('fails a file without a fuse wire', () => {
    const { status, out } = fuses(binary())

    expect(out).toContain('FAIL no fuse wire found\n')
    expect(status).toBe(1)
  })

  it('fails a file with two fuse wires', () => {
    const { status, out } = fuses(binary(wire(PRODUCTION), wire(PRODUCTION)))

    expect(out).toContain('FAIL 2 fuse wires found\n')
    expect(status).toBe(1)
  })

  it('fails a wire shorter than eight fuses', () => {
    const { status, out } = fuses(binary(wire('010')))

    expect(out).toContain('FAIL wire length 3, expected at least 8\n')
    expect(status).toBe(1)
  })

  it('fails a wire of another version', () => {
    const { status, out } = fuses(binary(wire(PRODUCTION, 2)))

    expect(out).toContain('FAIL wire version 2, expected 1\n')
    expect(status).toBe(1)
  })

  it('fails a missing file', () => {
    const { status, out } = fuses(path.join(tmpdir(), 'ci-policy-fuses-absent.exe'))

    expect(out).toContain('not found: ')
    expect(status).toBe(1)
  })

  it('names each fuse as the installed fuses package does, in wire order', () => {
    const { out } = fuses(binary(wire(PADDED_STOCK)))
    const printed = printedNames(out)
    const report = `${String(printed.length)} printed, ${String(NAMES.length)} in the fuses package`
    process.stdout.write(`fuse names: ${report}\n`)

    expect(printed).toStrictEqual(NAMES)
  })

  it('agrees with the fuses electron-builder.yml asks the packager for', () => {
    const configured = builderFuses()

    expect(configured.size).toBeGreaterThan(0)

    const passing = binary(wire(applyFuses(configured)))

    expect(fuses(passing).status).toBe(0)

    configured.set('runAsNode', true)
    const failing = binary(wire(applyFuses(configured)))
    const { status, out } = fuses(failing)

    expect(out).toContain('FAIL fuse RunAsNode: enabled, required disabled\n')
    expect(status).toBe(1)
  })
})
