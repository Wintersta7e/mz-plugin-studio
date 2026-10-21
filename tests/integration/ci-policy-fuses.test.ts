// Tests for `ci-policy fuses`: the packaged executable's fuse wire holds the required states
import { afterEach, describe, expect, it } from 'vitest'
import { spawnSync } from 'child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { fileURLToPath } from 'url'

const SCRIPT = fileURLToPath(new URL('../../scripts/ci-policy.mjs', import.meta.url))
const BUILDER_CONFIG = fileURLToPath(new URL('../../electron-builder.yml', import.meta.url))
const SENTINEL = 'dL7pKGdnNz796PbbjQWNKmHXBZaB9tsX'

// The wire of an unfused Electron 41 binary, and the one the packaged app must carry
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

const tempDirs: string[] = []

afterEach(() => {
  for (const dir of tempDirs.splice(0)) rmSync(dir, { recursive: true, force: true })
})

function wire(states: string, version = 1, length = states.length): Buffer {
  return Buffer.concat([
    Buffer.from(SENTINEL, 'latin1'),
    Buffer.from([version, length]),
    Buffer.from(states, 'latin1')
  ])
}

// A fake executable: filler, the given wires, filler
function binary(...wires: Buffer[]): string {
  const dir = mkdtempSync(join(tmpdir(), 'ci-policy-fuses-'))
  tempDirs.push(dir)
  const file = join(dir, 'app.exe')
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
  if (start < 0) return fuses
  for (const line of lines.slice(start + 1)) {
    if (!line.startsWith('  ')) break
    if (line.trim().startsWith('#')) continue
    const match = /^ {2}(\w+): (true|false)$/.exec(line)
    if (!match || !BUILDER_KEYS.has(match[1]))
      throw new Error(`unknown electronFuses line: ${line}`)
    fuses.set(match[1], match[2] === 'true')
  }
  return fuses
}

function applyFuses(states: string, fuses: Map<string, boolean>): string {
  const flipped = [...states]
  for (const [key, on] of fuses) flipped[BUILDER_KEYS.get(key) as number] = on ? '1' : '0'
  return flipped.join('')
}

describe('ci-policy fuses', () => {
  it('passes the production wire and prints every fuse', () => {
    const { status, out } = fuses(binary(wire(PRODUCTION)))
    expect(out.match(/^fuse /gm)).toHaveLength(9)
    expect(out).toContain('fuse RunAsNode: disabled (required disabled)\n')
    expect(out).toContain('fuse GrantFileProtocolExtraPrivileges: enabled (required enabled)\n')
    expect(out).toContain('fuse WasmTrapHandlers: enabled (default, not checked)\n')
    expect(out).toContain('fuses: wire version 1, fuses 9, checked 7\n')
    expect(out).toContain('ci-policy fuses: ok\n')
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
    expect(out).toContain(
      'FAIL fuse GrantFileProtocolExtraPrivileges: disabled, required enabled\n'
    )
    expect(status).toBe(1)
  })

  it('does not check the two fuses left at their default', () => {
    const { status, out } = fuses(binary(wire('010011110')))
    expect(out).toContain(
      'fuse LoadBrowserProcessSpecificV8Snapshot: enabled (default, not checked)\n'
    )
    expect(out).toContain('fuse WasmTrapHandlers: disabled (default, not checked)\n')
    expect(status).toBe(0)
  })

  it('fails a removed or inherited required fuse', () => {
    const { status, out } = fuses(binary(wire(`r1${'\x90'}011011`)))
    expect(out).toContain('FAIL fuse RunAsNode: removed, required disabled\n')
    expect(out).toContain(
      'FAIL fuse EnableNodeOptionsEnvironmentVariable: inherit, required disabled\n'
    )
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
    const { status, out } = fuses(join(tmpdir(), 'ci-policy-fuses-absent.exe'))
    expect(out).toContain('not found: ')
    expect(status).toBe(1)
  })

  it('agrees with the fuses electron-builder.yml asks the packager for', () => {
    const configured = builderFuses()
    expect(configured.size).toBeGreaterThan(0)
    expect(fuses(binary(wire(applyFuses(STOCK, configured)))).status).toBe(0)
    configured.set('runAsNode', true)
    const { status, out } = fuses(binary(wire(applyFuses(STOCK, configured))))
    expect(out).toContain('FAIL fuse RunAsNode: enabled, required disabled\n')
    expect(status).toBe(1)
  })
})
