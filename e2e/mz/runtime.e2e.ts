// Every case at the browser level: each template the app registers, each plugin the authoring
// test saved through the app (that file runs first), and each conformance case under each value
// set, booted once each and judged on every check. The run prints what it
// ran and fails on a shortfall against the registry or a count of 0 where cases ran.
import { everyRun, failedCases, summaryShortfalls } from './every-case'
import { expect, test } from './fixtures'

test.describe('every case at the browser level', () => {
  // A failed test restarts the worker, which would boot every case again for the next test
  test.describe.configure({ mode: 'serial', timeout: 3_600_000 })

  test('prints the counts of every case it ran', async ({ mz }, testInfo) => {
    const runs = await everyRun(mz, testInfo.outputPath())

    expect(summaryShortfalls(mz, runs)).toStrictEqual([])
  })

  test('every case loads, boots and computes what its header declares', async ({
    mz
  }, testInfo) => {
    const runs = await everyRun(mz, testInfo.outputPath())

    expect(failedCases(runs)).toStrictEqual([])
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
