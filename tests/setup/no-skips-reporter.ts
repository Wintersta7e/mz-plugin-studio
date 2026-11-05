// Fails the run when a test was skipped, left as a todo or marked to pass by failing, however the
// source wrote it: the run's own results decide, not a scan of the test text. One rule allows a
// skip by name: the RPG Maker MZ parity check without MZ_CORESCRIPT_DIR, which needs a local
// install that never enters the repository. A run filtered by test name skips the rest on
// purpose, so it is counted but not failed.
import path from 'node:path'
import type { Reporter, TestModule, Vitest } from 'vitest/node'

const PARITY_FILE = 'tests/integration/mz-parity.test.ts'

interface Tally {
  found: string[]
  skipped: number
  expectedFails: number
  parity: number
}

function tallyModule(
  tally: Tally,
  file: string,
  module: TestModule,
  isParityAllowed: boolean
): void {
  for (const testCase of module.children.allTests()) {
    if (testCase.options.fails === true) {
      tally.expectedFails++
      tally.found.push(`expected to fail: ${file} > ${testCase.fullName}`)
    }
    if (testCase.result().state !== 'skipped') continue
    if (isParityAllowed && file === PARITY_FILE) {
      tally.parity++
    } else {
      tally.skipped++
      tally.found.push(`${testCase.options.mode}: ${file} > ${testCase.fullName}`)
    }
  }
}

export default class NoSkipsReporter implements Reporter {
  private vitest: Vitest | undefined

  onInit(vitest: Vitest): void {
    this.vitest = vitest
  }

  onTestRunEnd(testModules: readonly TestModule[]): void {
    const { vitest } = this
    if (vitest === undefined) throw new Error('the reporter ended a run it was not started for')
    const { MZ_CORESCRIPT_DIR = '' } = process.env
    const isParityAllowed = MZ_CORESCRIPT_DIR === ''
    const tally: Tally = { found: [], skipped: 0, expectedFails: 0, parity: 0 }
    for (const module of testModules) {
      const file = path.relative(vitest.config.root, module.moduleId).replaceAll('\\', '/')
      tallyModule(tally, file, module, isParityAllowed)
    }
    const { found, skipped, expectedFails, parity } = tally
    const isFiltered = vitest.config.testNamePattern !== undefined
    vitest.logger.log(
      `skipped or todo tests ${String(skipped)}; expected-to-fail tests ${String(expectedFails)}; ` +
        `allowed: mz parity without MZ_CORESCRIPT_DIR ${String(parity)}` +
        (isFiltered ? '; not failed: the run is filtered by test name' : '')
    )
    for (const line of found) vitest.logger.log(`  ${line}`)
    // How each project ordered its tests, and the seed that replays a shuffled run.
    const orders = vitest.projects.map(
      (project) =>
        `${project.name} ${project.config.sequence.shuffle === true ? 'shuffled' : 'in order'}`
    )
    const seed = String(vitest.config.sequence.seed)
    vitest.logger.log(`test order: ${orders.join(', ')}; seed ${seed}`)
    if (!isFiltered && found.length > 0) process.exitCode = 1
  }
}
