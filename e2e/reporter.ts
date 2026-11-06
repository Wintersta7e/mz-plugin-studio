// Prints the run's final outcomes and fails a run that skipped, retried or passed nothing, so a
// suite that silently stops testing cannot stay green.
import type { FullConfig, FullResult, Reporter, Suite } from '@playwright/test/reporter'

export default class E2eReporter implements Reporter {
  private suite: Suite | undefined

  onBegin(_config: FullConfig, suite: Suite): void {
    this.suite = suite
  }

  async onEnd(_result: FullResult): Promise<{ status: FullResult['status'] } | undefined> {
    const tests = this.suite?.allTests() ?? []
    const outcomes = tests.map((test) => test.outcome())
    const tally = (outcome: string): number => outcomes.filter((o) => o === outcome).length
    const passed = tally('expected')
    const failed = tally('unexpected')
    const skipped = tally('skipped')
    const flaky = tally('flaky')
    const retries = tests.reduce((sum, test) => sum + Math.max(0, test.results.length - 1), 0)
    process.stdout.write(
      `e2e: passed ${passed}, failed ${failed}, skipped ${skipped}, flaky ${flaky}, retries ${retries}\n`
    )
    return passed === 0 || failed > 0 || skipped > 0 || flaky > 0 || retries > 0
      ? { status: 'failed' }
      : undefined
  }

  printsToStdio(): boolean {
    return false
  }
}
