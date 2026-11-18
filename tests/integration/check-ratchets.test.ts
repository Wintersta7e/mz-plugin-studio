// The ratchet check run against throwaway folders whose jscpd is a fake writing a JSON report: the
// copied code's clones and duplicated lines are held exactly at the ceilings ratchets.json holds.
import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'

const SCRIPT = path.resolve(import.meta.dirname, '../../scripts/check-ratchets.mjs')

interface JscpdTotal {
  sources: number
  clones: number
  duplicatedLines: number
}
interface Clone {
  first: string
  second: string
}
const CEILINGS = { clones: 2, duplicatedLines: 20 }
const JSCPD_CEILINGS = { jscpd: CEILINGS }
const AT_CEILINGS: JscpdTotal = { sources: 3, clones: 2, duplicatedLines: 20 }
const CLONES: Clone[] = [
  { first: 'src/a.ts:1-12', second: 'src/b.ts:4-15' },
  { first: 'src/a.ts:30-37', second: 'src/c.ts:9-16' }
]

const directories: string[] = []

// A duplicate entry of a jscpd JSON report for a clone written `file:start-end`.
const duplicate = ({ first, second }: Clone): Record<string, unknown> => {
  const side = (location: string): Record<string, unknown> => {
    const [name, lines = ''] = location.split(':', 2)
    const [start, end] = lines.split('-').map(Number)
    return { name, start, end }
  }
  return { firstFile: side(first), secondFile: side(second) }
}

// The check in a folder whose ratchets.json holds `ratchets` and whose jscpd writes a report with
// these totals and clones into the folder `--output` names, or no report.
const check = (
  total: JscpdTotal | undefined,
  ratchets: Record<string, unknown> = JSCPD_CEILINGS,
  clones: Clone[] = CLONES
): { status: number | null; out: string } => {
  const directory = mkdtempSync(path.join(tmpdir(), 'check-ratchets-'))
  directories.push(directory)
  const report = JSON.stringify({
    statistics: { total: { ...total, percentage: 2.5 } },
    duplicates: clones.map((clone) => duplicate(clone))
  })
  const fake = [
    "import { writeFileSync } from 'node:fs'",
    "const output = process.argv[process.argv.indexOf('--output') + 1]",
    total === undefined ? '' : `writeFileSync(\`\${output}/jscpd-report.json\`, '${report}')`
  ].join('\n')
  mkdirSync(path.join(directory, 'node_modules/jscpd'), { recursive: true })
  writeFileSync(path.join(directory, 'node_modules/jscpd/run-jscpd.js'), fake)
  writeFileSync(path.join(directory, 'ratchets.json'), JSON.stringify(ratchets))
  const result = spawnSync(process.execPath, [SCRIPT], { cwd: directory, encoding: 'utf8' })
  return { status: result.status, out: `${result.stdout}${result.stderr}` }
}

describe('ratchets: jscpd', () => {
  afterEach(() => {
    for (const directory of directories.splice(0)) {
      rmSync(directory, { recursive: true, force: true })
    }
  })

  it('(p) passes the jscpd clones and duplicated lines at their ceilings', () => {
    const result = check(AT_CEILINGS)

    expect(result.out).toContain(
      'ratchets: jscpd files scanned 3, clones 2, duplicated lines 20 (2.50%), ceilings clones 2, duplicated lines 20'
    )
    expect(result.out).not.toContain('ratchets: clone ')
    expect(result.status).toBe(0)
  })

  it('(q) fails the jscpd clones or duplicated lines above their ceilings', () => {
    const clones = check({ ...AT_CEILINGS, clones: 3 })
    const lines = check({ ...AT_CEILINGS, duplicatedLines: 21 })

    expect(clones.out).toContain(
      'ratchets: jscpd.clones 3 rose above the ceiling 2 in ratchets.json'
    )
    expect(clones.status).toBe(1)
    expect(lines.out).toContain(
      'ratchets: jscpd.duplicatedLines 21 rose above the ceiling 20 in ratchets.json'
    )
    expect(lines.status).toBe(1)
  })

  it('names each clone above the ceiling', () => {
    const third = { first: 'src/d.ts:2-9', second: 'src/e.ts:2-9' }
    const result = check({ ...AT_CEILINGS, clones: 3 }, JSCPD_CEILINGS, [...CLONES, third])
    const printed = result.out.split('\n').filter((line) => line.startsWith('ratchets: clone '))

    expect(printed).toStrictEqual(
      [...CLONES, third].map(({ first, second }) => `ratchets: clone ${first} ↔ ${second}`)
    )
    expect(result.status).toBe(1)
  })

  it('(r) fails the jscpd clones or duplicated lines below their ceilings', () => {
    const clones = check({ ...AT_CEILINGS, clones: 1 })
    const lines = check({ ...AT_CEILINGS, duplicatedLines: 19 })

    expect(clones.out).toContain('ratchets: lower jscpd.clones in ratchets.json to 1')
    expect(clones.status).toBe(1)
    expect(lines.out).toContain('ratchets: lower jscpd.duplicatedLines in ratchets.json to 19')
    expect(lines.status).toBe(1)
  })

  it('(s) fails a jscpd run that scanned no file', () => {
    const result = check({ ...AT_CEILINGS, sources: 0 })

    expect(result.out).toContain('ratchets: the jscpd run scanned no file')
    expect(result.status).toBe(1)
  })

  it('(t) fails a jscpd run that wrote no report, and ceilings that are not named', () => {
    const missing = check(undefined)
    const unnamed = check(AT_CEILINGS, {})

    expect(missing.out).toContain('ratchets: the jscpd run wrote no report (exit 0)')
    expect(missing.status).toBe(1)
    expect(unnamed.out).toContain('ratchets: ratchets.json holds no jscpd.clones ceiling')
    expect(unnamed.out).toContain('ratchets: ratchets.json holds no jscpd.duplicatedLines ceiling')
    expect(unnamed.status).toBe(1)
  })
})
