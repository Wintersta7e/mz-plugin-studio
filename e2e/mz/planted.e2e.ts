// Plugins built to break one check each: the run must turn red on each of them, and must still
// pass a plugin that does nothing while the stock engine logs errors of its own.
import { plantedCases } from './cases'
import { expect, test } from './fixtures'

const planted = plantedCases()

test.describe('planted defects at the browser level', () => {
  test('a plugin that throws at load fails the load check', async ({ mz }) => {
    const verdict = await mz.run(planted.throwsAtLoad)

    expect(verdict.parts.o1).toContain('uncaught: Uncaught Error: planted at load')
  })

  test('a plugin that logs one console error fails the load check', async ({ mz }) => {
    const verdict = await mz.run(planted.logsError)

    expect(verdict.parts.o1).toContain('console.error: planted')
  })

  test('a plugin that logs nothing passes although the stock boot logs errors', async ({ mz }) => {
    expect(
      mz.baselineErrors.length,
      `${mz.engine} logged no error on a boot with no case plugin, so the baseline proves nothing`
    ).toBeGreaterThan(0)

    const verdict = await mz.run(planted.silent)

    expect(verdict).toStrictEqual({
      id: planted.silent.id,
      parts: { o1: [], o2: [], o3: [], o4: [], hostile: [] }
    })
  })
})
