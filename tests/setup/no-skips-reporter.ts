// Fails the run when a test was skipped, left as a todo or marked to pass by failing, however the
// source wrote it: the run's own results decide, not a scan of the test text. One rule allows a
// skip by name: the RPG Maker MZ parity check without MZ_CORESCRIPT_DIR, which needs a local
// install that never enters the repository. A run filtered by test name skips the rest on
// purpose, so it is counted but not failed.
import { relative } from 'path'
import type { Reporter, TestModule, Vitest } from 'vitest/node'

const PARITY_FILE = 'tests/integration/mz-parity.test.ts'

export default class NoSkipsReporter implements Reporter {
  private vitest: Vitest | undefined

  onInit(vitest: Vitest): void {
    this.vitest = vitest
  }

  onTestRunEnd(testModules: ReadonlyArray<TestModule>): void {
    const vitest = this.vitest!
    const parityAllowed = (process.env.MZ_CORESCRIPT_DIR ?? '') === ''
    const found: string[] = []
    let skipped = 0
    let expectedFails = 0
    let parity = 0
    for (const module of testModules) {
      const file = relative(vitest.config.root, module.moduleId).split('\\').join('/')
      for (const test of module.children.allTests()) {
        if (test.options.fails) {
          expectedFails++
          found.push(`expected to fail: ${file} > ${test.fullName}`)
        }
        if (test.result().state !== 'skipped') continue
        if (parityAllowed && file === PARITY_FILE) {
          parity++
        } else {
          skipped++
          found.push(`${test.options.mode}: ${file} > ${test.fullName}`)
        }
      }
    }
    const filtered = vitest.config.testNamePattern !== undefined
    vitest.logger.log(
      `skipped or todo tests ${skipped}; expected-to-fail tests ${expectedFails}; ` +
        `allowed: mz parity without MZ_CORESCRIPT_DIR ${parity}` +
        (filtered ? '; not failed: the run is filtered by test name' : '')
    )
    for (const line of found) vitest.logger.log(`  ${line}`)
    // How each project ordered its tests, and the seed that replays a shuffled run.
    const orders = vitest.projects.map(
      (project) =>
        `${project.name} ${project.config.sequence.shuffle === true ? 'shuffled' : 'in order'}`
    )
    const seed = String(vitest.config.sequence.seed)
    vitest.logger.log(`test order: ${orders.join(', ')}; seed ${seed}`)
    if (found.length > 0 && !filtered) process.exitCode = 1
  }
}
