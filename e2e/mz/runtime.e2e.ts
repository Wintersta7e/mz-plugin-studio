// Every case at the browser level: each template the app registers, and each conformance case
// under each value set, booted once each and judged on every check. The run prints what it
// ran and fails on a shortfall against the registry or a count of 0 where cases ran.
import path from 'node:path'
import { CATEGORIES, getAllTemplates } from '../../src/renderer/src/lib/generator/templates/index'
import { corpusCases, templateCases, type CaseVerdict, type MzCase } from './cases'
import { expect, test, type MzHarness } from './fixtures'

interface CaseRun {
  kase: MzCase
  verdict: CaseVerdict
}

const fileOf = (id: string): string => id.replaceAll(/[^\w.-]/g, '_')

async function runEvery(mz: MzHarness, output: string): Promise<CaseRun[]> {
  const runs: CaseRun[] = []
  for (const kase of [...templateCases(), ...corpusCases()]) {
    // One boot at a time: each one resets and installs into the same copy
    const kept = path.join(output, fileOf(kase.id))
    runs.push({ kase, verdict: await mz.run(kase, kept) })
  }
  return runs
}

// Every case boots in turn on the one copy, once: the tests below share the one run
const shared: { every?: Promise<CaseRun[]> } = {}

async function everyRun(mz: MzHarness, output: string): Promise<CaseRun[]> {
  shared.every ??= runEvery(mz, output)
  return shared.every
}

/**
How many cases of the run `isCounted` keeps, a conformance case's value sets counted once.
*/
const distinct = (runs: readonly CaseRun[], isCounted: (kase: MzCase) => boolean): number =>
  new Set(
    runs
      .filter(({ kase }) => isCounted(kase))
      .map(({ kase }) => kase.expectation?.case.id ?? kase.id)
  ).size

function countsOf(mz: MzHarness, runs: readonly CaseRun[]): Record<string, number> {
  const sum = (key: 'commands' | 'values'): number =>
    runs.reduce((total, { verdict }) => total + verdict[key], 0)
  return {
    templates: distinct(runs, (kase) => kase.kind === 'template'),
    corpus: distinct(runs, (kase) => kase.kind === 'generated'),
    raw: distinct(runs, (kase) => kase.kind === 'raw-mode'),
    categories: distinct(runs, (kase) => kase.kind === 'authored'),
    commands: sum('commands'),
    values: sum('values'),
    hostile: distinct(runs, (kase) => kase.expectation?.case.hostile === true),
    'baseline-errors': mz.baselineErrors.length,
    'manifest-files': mz.manifestFiles,
    ...mz.counts()
  }
}

/**
The level's summary line, then whether the NW.js level runs.
*/
function printCounts(mz: MzHarness, counts: Record<string, number>, registry: number): void {
  const shown = (name: string): string => String(counts[name])
  mz.print(
    `mz-runtime: level ${mz.level} templates ${shown('templates')}/${String(registry)}` +
      ` corpus ${shown('corpus')} raw ${shown('raw')}` +
      ` categories ${shown('categories')}/${String(CATEGORIES.length)}` +
      ` commands ${shown('commands')} values ${shown('values')} hostile ${shown('hostile')}` +
      ` baseline-errors ${shown('baseline-errors')} manifest-files ${shown('manifest-files')}` +
      ` launches ${shown('launches')} reports ${shown('reports')}`
  )
  if ((process.env['MZ_NWJS_EXE'] ?? '') === '') mz.print('nwjs level: not selected')
}

// No authoring through the app feeds this run's cases
const ZEROS_ALLOWED = new Set(['categories'])

/**
Every way the counts fall short: a count of 0, fewer templates than the registry holds, fewer
reports read than boots started.
*/
function shortfalls(counts: Record<string, number>, registry: number): string[] {
  const { templates = 0, launches = 0, reports = 0 } = counts
  return [
    ...Object.entries(counts)
      .filter(([name, count]) => count === 0 && !ZEROS_ALLOWED.has(name))
      .map(([name]) => `${name} 0`),
    ...(templates < registry ? [`templates ${String(templates)}/${String(registry)}`] : []),
    ...(reports === launches ? [] : [`reports ${String(reports)} launches ${String(launches)}`])
  ]
}

test.describe('every case at the browser level', () => {
  // A failed test restarts the worker, which would boot every case again for the next test
  test.describe.configure({ mode: 'serial', timeout: 3_600_000 })

  test('prints the counts of every case it ran', async ({ mz }, testInfo) => {
    const runs = await everyRun(mz, testInfo.outputPath())
    const counts = countsOf(mz, runs)
    const registry = getAllTemplates().length
    printCounts(mz, counts, registry)

    expect(shortfalls(counts, registry)).toStrictEqual([])
  })

  test('every case loads, boots and computes what its header declares', async ({
    mz
  }, testInfo) => {
    const runs = await everyRun(mz, testInfo.outputPath())
    const failed = runs
      .map(({ verdict }) => ({
        id: verdict.id,
        parts: Object.fromEntries(
          Object.entries(verdict.parts).filter(([, found]) => found.length > 0)
        )
      }))
      .filter(({ parts }) => Object.keys(parts).length > 0)

    expect(failed).toStrictEqual([])
  })

  test('hostile cases leave the sentinel unset', async ({ mz }, testInfo) => {
    const runs = await everyRun(mz, testInfo.outputPath())
    const hostile = runs.filter(({ kase }) => kase.expectation?.case.hostile === true)

    expect(hostile.length, 'hostile cases run').toBeGreaterThan(0)
    expect(
      hostile.filter(({ verdict }) => verdict.parts.hostile.length > 0).map(({ kase }) => kase.id)
    ).toStrictEqual([])
  })
})
