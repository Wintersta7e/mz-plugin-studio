// Tests for `ci-policy diff-coverage`: the changed-lines report checked something, unless the
// change holds no executable line
import { describe, expect, it, onTestFinished } from 'vitest'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

const SCRIPT = path.join(import.meta.dirname, '..', '..', 'scripts', 'ci-policy.mjs')

const LCOV = [
  'TN:',
  'SF:src/shared/a.ts',
  'DA:1,1',
  'end_of_record',
  'TN:',
  'SF:src/shared/b.ts',
  'DA:1,0',
  'end_of_record',
  ''
].join('\n')

// Writes the lcov text and the report JSON (each left out when undefined) and runs the check
function diffCoverage(
  lcov: string | undefined,
  report: string | undefined
): { status: number | null; out: string } {
  const directory = mkdtempSync(path.join(tmpdir(), 'ci-policy-diff-coverage-'))
  onTestFinished(() => {
    rmSync(directory, { recursive: true, force: true })
  })
  const lcovFile = path.join(directory, 'lcov.info')
  const reportFile = path.join(directory, 'diff-cover.json')
  if (lcov !== undefined) writeFileSync(lcovFile, lcov)
  if (report !== undefined) writeFileSync(reportFile, report)
  const result = spawnSync(process.execPath, [SCRIPT, 'diff-coverage', lcovFile, reportFile], {
    encoding: 'utf8'
  })
  return { status: result.status, out: result.stdout + result.stderr }
}

const report = (lines: number): string =>
  JSON.stringify({ total_num_lines: lines, total_percent_covered: 100 })

describe('ci-policy diff-coverage', () => {
  it('passes a report that measured changed lines', () => {
    const { status, out } = diffCoverage(LCOV, report(21))

    expect(out).toContain('diff coverage: lcov source files 2\n')
    expect(out).toContain('diff coverage: measured lines 21\n')
    expect(out).toContain('ci-policy diff-coverage: ok')
    expect(status).toBe(0)
  })

  it('passes a change with no executable line when coverage ran', () => {
    const { status, out } = diffCoverage(LCOV, report(0))

    expect(out).toContain('diff coverage: measured lines 0 (no executable change)\n')
    expect(status).toBe(0)
  })

  it('fails an lcov report that lists no source file', () => {
    const { status, out } = diffCoverage('TN:\n', report(0))

    expect(out).toContain('diff coverage: lcov source files 0\n')
    expect(out).toContain('FAIL lcov lists no source file: coverage did not run')
    expect(status).toBe(1)
  })

  it('fails when no lcov report exists', () => {
    const { status, out } = diffCoverage(undefined, report(0))

    expect(out).toContain('not found: ')
    expect(status).toBe(1)
  })

  it('fails a report without a count of measured lines', () => {
    const { status, out } = diffCoverage(LCOV, JSON.stringify({ total_percent_covered: 100 }))

    expect(out).toContain('FAIL report has no total_num_lines count')
    expect(status).toBe(1)
  })

  it('fails when no report exists', () => {
    const { status, out } = diffCoverage(LCOV, undefined)

    expect(out).toContain('not found: ')
    expect(status).toBe(1)
  })
})
