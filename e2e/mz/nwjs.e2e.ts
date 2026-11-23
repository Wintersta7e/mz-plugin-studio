// The NW.js level: the engine MZ playtests with, started once per boot on the copy the browser
// level serves. It records which syntax forms the engine compiles beside the browser's figure,
// boots every case, and shows that a form only the browser compiles fails in the engine.
import path from 'node:path'
import { release } from 'node:os'
import { ENGINE_PROBES, type EngineProbe } from '../../tests/helpers/engine-probes'
import { headCommit } from '../global-setup'
import { engineOnlyCase } from './cases'
import { everyRun, failedCases, summaryShortfalls } from './every-case'
import { expect, test, type MzHarness } from './fixtures'
import type { EngineProbeReport } from './observer'

// The probe boots once per level: the tests below share each record
const probed = new WeakMap<MzHarness, Promise<EngineProbeReport>>()

async function probeOf(harness: MzHarness): Promise<EngineProbeReport> {
  const started = probed.get(harness) ?? harness.probe()
  probed.set(harness, started)
  return started
}

/**
The probe line of one level: the latest year with a compiled probe (0 for none), how many
compiled, and the tree and host it ran on.
*/
function probeLine(level: string, engine: string, record: EngineProbeReport): string {
  const compiled = record.probes.filter((probe) => probe.compiled)
  const latest = Math.max(0, ...compiled.map(({ year }) => year))
  return (
    `engine-probe: level ${level} ${engine} ymax ${String(latest)}` +
    ` compiled ${String(compiled.length)}/${String(record.probes.length)}` +
    ` tree ${headCommit()} host ${release()}`
  )
}

/**
The first probe of the table the engine did not compile, the lowest year first; throws when it
compiled every one.
*/
function firstUncompiled(record: EngineProbeReport): EngineProbe {
  const failed = new Set(record.probes.filter((probe) => !probe.compiled).map(({ id }) => id))
  const [first] = ENGINE_PROBES.filter(({ id }) => failed.has(id)).toSorted(
    (left, right) => left.year - right.year
  )
  if (first === undefined) {
    throw new Error('NW.js compiled every probe: no form fails in the engine alone')
  }
  return first
}

test.describe('every case at the NW.js level', () => {
  // A failed test restarts the worker, which would launch every case again for the next test
  test.describe.configure({ mode: 'serial', timeout: 7_200_000 })

  test('records the engine probe', async ({ mz, nwjs }, testInfo) => {
    const record = await probeOf(nwjs)
    const contrast = await probeOf(mz)
    const { nw, chromium, node } = record.versions
    const kept = testInfo.outputPath('engine-probe')
    const keptFile = path.relative(process.cwd(), `${kept}.json`)
    nwjs.keep(kept, { ...record, tree: headCommit(), host: release() })
    mz.keep(testInfo.outputPath('engine-probe-browser'), contrast)
    nwjs.print(probeLine('nwjs', `nw ${nw} chromium ${chromium} node ${node}`, record))
    mz.print(probeLine('browser', mz.engine, contrast))
    nwjs.print(`engine-probe: record ${keptFile}`)

    expect([nw, chromium, node].filter((version) => version === '')).toStrictEqual([])
    expect(record.probes).toHaveLength(ENGINE_PROBES.length)
  })

  test('an engine-only form passes the browser and fails in NW.js', async ({ mz, nwjs }) => {
    const probe = firstUncompiled(await probeOf(nwjs))
    const kase = engineOnlyCase(probe.source)
    const browser = await mz.run(kase)
    const engine = await nwjs.run(kase)

    expect(browser.parts).toStrictEqual({ o1: [], o2: [], o3: [], o4: [], hostile: [] })
    expect(engine.parts.o1, `the ${probe.id} form loaded in NW.js`).not.toStrictEqual([])

    nwjs.print(`engine-only: ${probe.id} browser pass nwjs fail`)
  })

  test('prints the counts of every case it ran', async ({ nwjs }, testInfo) => {
    const runs = await everyRun(nwjs, testInfo.outputPath())

    expect(summaryShortfalls(nwjs, runs)).toStrictEqual([])
  })

  test('every case loads, boots and computes what its header declares', async ({
    nwjs
  }, testInfo) => {
    const runs = await everyRun(nwjs, testInfo.outputPath())

    expect(failedCases(runs)).toStrictEqual([])
  })
})
