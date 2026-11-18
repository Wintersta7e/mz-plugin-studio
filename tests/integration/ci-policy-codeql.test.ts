// Tests for `ci-policy codeql`: the analysis wrote SARIF files and they hold no result
import { describe, expect, it, onTestFinished } from 'vitest'
import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

const SCRIPT = path.join(import.meta.dirname, '..', '..', 'scripts', 'ci-policy.mjs')

const result = (ruleId: string, uri: string, startLine: number): unknown => ({
  ruleId,
  message: { text: 'finding' },
  locations: [{ physicalLocation: { artifactLocation: { uri }, region: { startLine } } }]
})

const sarif = (...results: unknown[][]): string =>
  JSON.stringify({ version: '2.1.0', runs: results.map((each) => ({ results: each })) })

// Writes each named file into a fresh SARIF directory (none when undefined) and runs the check
function codeql(files: Record<string, string> | undefined): { status: number | null; out: string } {
  const parent = mkdtempSync(path.join(tmpdir(), 'ci-policy-codeql-'))
  onTestFinished(() => {
    rmSync(parent, { recursive: true, force: true })
  })
  const directory = path.join(parent, 'sarif')
  if (files !== undefined) {
    mkdirSync(directory)
    for (const [name, text] of Object.entries(files))
      writeFileSync(path.join(directory, name), text)
  }
  const run = spawnSync(process.execPath, [SCRIPT, 'codeql', directory], { encoding: 'utf8' })
  return { status: run.status, out: run.stdout + run.stderr }
}

describe('ci-policy codeql', () => {
  it('passes SARIF files whose runs hold no result', () => {
    const { status, out } = codeql({
      'actions.sarif': sarif([]),
      'javascript.sarif': sarif([], [])
    })

    expect(out).toContain('codeql: files 2, runs 3, results 0\n')
    expect(out).toContain('ci-policy codeql: ok')
    expect(status).toBe(0)
  })

  it('fails on a result and names its rule, file and line', () => {
    const { status, out } = codeql({
      'javascript.sarif': sarif([
        result('js/indirect-command-line-injection', 'scripts/probe.mjs', 2)
      ])
    })

    expect(out).toContain('codeql: js/indirect-command-line-injection scripts/probe.mjs:2\n')
    expect(out).toContain('codeql: files 1, runs 1, results 1\n')
    expect(out).toContain('FAIL 1 result')
    expect(status).toBe(1)
  })

  it('fails a directory without a SARIF file: the analysis wrote nothing', () => {
    const { status, out } = codeql({ 'notes.txt': 'not a report' })

    expect(out).toContain('codeql: files 0, runs 0, results 0\n')
    expect(out).toContain('FAIL no SARIF file: the analysis wrote nothing')
    expect(status).toBe(1)
  })

  it('fails a SARIF file that holds no run', () => {
    const { status, out } = codeql({ 'javascript.sarif': sarif() })

    expect(out).toContain('FAIL javascript.sarif holds no run')
    expect(status).toBe(1)
  })

  it('fails a SARIF file whose run has no results list', () => {
    const { status, out } = codeql({
      'javascript.sarif': JSON.stringify({ version: '2.1.0', runs: [{}] })
    })

    expect(out).toContain('FAIL javascript.sarif run 1 has no results list')
    expect(status).toBe(1)
  })

  it('fails a SARIF file that is not JSON', () => {
    const { status, out } = codeql({ 'javascript.sarif': '{' })

    expect(out).toContain('(not JSON)')
    expect(status).toBe(1)
  })

  it('fails when the SARIF directory does not exist', () => {
    const { status, out } = codeql(undefined)

    expect(out).toContain('not found: ')
    expect(status).toBe(1)
  })
})
