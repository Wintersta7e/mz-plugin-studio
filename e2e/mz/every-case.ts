// Every case at one level: each template the app registers, each plugin the authoring test saved
// through the app (that file runs first), and each conformance case under each value set, booted
// once each, with the level's summary line and every way its counts fall short.
import path from 'node:path'
import { CATEGORIES, getAllTemplates } from '../../src/renderer/src/lib/generator/templates/index'
import { authoredCases, corpusCases, templateCases, type CaseVerdict, type MzCase } from './cases'
import type { MzHarness } from './fixtures'

export interface CaseRun {
  kase: MzCase
  verdict: CaseVerdict
}

const fileOf = (id: string): string => id.replaceAll(/[^\w.-]/g, '_')

/**
Boots every case once at `mz`'s level, keeping each report under `output`.
*/
async function runEvery(mz: MzHarness, output: string): Promise<CaseRun[]> {
  const runs: CaseRun[] = []
  for (const kase of [...templateCases(), ...authoredCases(), ...corpusCases()]) {
    // One boot at a time: each one resets and installs into the same copy
    const kept = path.join(output, fileOf(kase.id))
    runs.push({ kase, verdict: await mz.run(kase, kept) })
  }
  return runs
}

// Every case boots in turn on the one copy, once per level: the tests of a level share its run
const shared = new WeakMap<MzHarness, Promise<CaseRun[]>>()

/**
The one run of every case at `mz`'s level, started by the first test that asks for it.
*/
export async function everyRun(mz: MzHarness, output: string): Promise<CaseRun[]> {
  const started = shared.get(mz) ?? runEvery(mz, output)
  shared.set(mz, started)
  return started
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

/**
Every way the counts fall short: a count of 0, fewer templates than the registry holds, fewer
plugins authored than there are categories, fewer reports read than boots started.
*/
function shortfalls(counts: Record<string, number>, registry: number): string[] {
  const { templates = 0, categories = 0, launches = 0, reports = 0 } = counts
  const categoryCount = CATEGORIES.length
  return [
    ...Object.entries(counts)
      .filter(([, count]) => count === 0)
      .map(([name]) => `${name} 0`),
    ...(templates < registry ? [`templates ${String(templates)}/${String(registry)}`] : []),
    ...(categories < categoryCount
      ? [`categories ${String(categories)}/${String(categoryCount)}`]
      : []),
    ...(reports === launches ? [] : [`reports ${String(reports)} launches ${String(launches)}`])
  ]
}

/**
Prints the level's summary line and returns every way its counts fall short.
*/
export function summaryShortfalls(mz: MzHarness, runs: readonly CaseRun[]): string[] {
  const counts = countsOf(mz, runs)
  const registry = getAllTemplates().length
  printCounts(mz, counts, registry)
  return shortfalls(counts, registry)
}

/**
Each case of the run a check failed, with only the checks that found something.
*/
export function failedCases(
  runs: readonly CaseRun[]
): { id: string; parts: Record<string, string[]> }[] {
  return runs
    .map(({ verdict }) => ({
      id: verdict.id,
      parts: Object.fromEntries(
        Object.entries(verdict.parts).filter(([, found]) => found.length > 0)
      )
    }))
    .filter(({ parts }) => Object.keys(parts).length > 0)
}
