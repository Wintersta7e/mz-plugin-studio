// Tests for `ci-policy osv-ignores`: every advisory ignore is explained and expires within 90 days
import { afterEach, describe, expect, it } from 'vitest'
import { spawnSync } from 'child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { fileURLToPath } from 'url'

const SCRIPT = fileURLToPath(new URL('../../scripts/ci-policy.mjs', import.meta.url))
const ROOT = fileURLToPath(new URL('../../', import.meta.url))

const tempDirs: string[] = []

afterEach(() => {
  for (const dir of tempDirs.splice(0)) rmSync(dir, { recursive: true, force: true })
})

// A directory holding osv-scanner.toml with this text, or no file when text is undefined
function configDir(text: string | undefined): string {
  const dir = mkdtempSync(join(tmpdir(), 'ci-policy-osv-'))
  tempDirs.push(dir)
  if (text !== undefined) writeFileSync(join(dir, 'osv-scanner.toml'), text)
  return dir
}

function osvIgnores(cwd: string): { status: number | null; out: string } {
  const result = spawnSync(process.execPath, [SCRIPT, 'osv-ignores'], { cwd, encoding: 'utf8' })
  return { status: result.status, out: result.stdout + result.stderr }
}

function daysAhead(days: number): string {
  return new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10)
}

function entry(lines: string[]): string {
  return ['# advisories ignored on purpose', '', '[[IgnoredVulns]]', ...lines, ''].join('\n')
}

const ID = 'id = "GHSA-xxxx-xxxx-xxxx"'
const REASON = 'reason = "Not reachable: the affected function is never called."'

describe('ci-policy osv-ignores', () => {
  it('passes a comment-only file as zero entries', () => {
    const { status, out } = osvIgnores(configDir('# no ignores\n# none at all\n'))
    expect(out).toContain('ci-policy osv-ignores: entries 0\n')
    expect(out).toContain('ci-policy osv-ignores: nearest expiry none\n')
    expect(status).toBe(0)
  })

  it('passes an entry that expires in 30 days', () => {
    const until = daysAhead(30)
    const { status, out } = osvIgnores(configDir(entry([ID, `ignoreUntil = ${until}`, REASON])))
    expect(out).toContain('ci-policy osv-ignores: entries 1\n')
    expect(out).toContain(`ci-policy osv-ignores: nearest expiry ${until}\n`)
    expect(status).toBe(0)
  })

  it('accepts an expiry with a UTC time', () => {
    const until = `${daysAhead(30)}T12:00:00Z`
    expect(osvIgnores(configDir(entry([ID, `ignoreUntil = ${until}`, REASON]))).status).toBe(0)
  })

  it('fails an entry that expires in 120 days', () => {
    const { status, out } = osvIgnores(
      configDir(entry([ID, `ignoreUntil = ${daysAhead(120)}`, REASON]))
    )
    expect(out).toContain('ci-policy osv-ignores: FAILED')
    expect(status).toBe(1)
  })

  it('fails an empty reason', () => {
    const text = entry([ID, `ignoreUntil = ${daysAhead(30)}`, 'reason = ""'])
    expect(osvIgnores(configDir(text)).status).toBe(1)
  })

  it('fails a missing reason', () => {
    const { status, out } = osvIgnores(configDir(entry([ID, `ignoreUntil = ${daysAhead(30)}`])))
    expect(out).toContain('reason')
    expect(status).toBe(1)
  })

  it('fails an extra key', () => {
    const text = entry([ID, `ignoreUntil = ${daysAhead(30)}`, REASON, 'effectiveUntil = 1'])
    expect(osvIgnores(configDir(text)).status).toBe(1)
  })

  it('fails an unknown table', () => {
    const text = `[[PackageOverrides]]\nname = "x"\nignore = true\n`
    expect(osvIgnores(configDir(text)).status).toBe(1)
  })

  it('fails when the file is missing', () => {
    const { status, out } = osvIgnores(configDir(undefined))
    expect(out).toContain('osv-scanner.toml')
    expect(status).toBe(1)
  })

  it("passes the repository's own file", () => {
    expect(osvIgnores(ROOT).status).toBe(0)
  })
})
