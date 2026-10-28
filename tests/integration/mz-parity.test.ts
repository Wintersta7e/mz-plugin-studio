// The plugin loader stand-in the suite runs on, compared with RPG Maker MZ's own core scripts
// when a developer points MZ_CORESCRIPT_DIR at a local install: every generated and raw-mode
// plugin must behave the same in both. Without the variable nothing of an install is read, and
// the test says so.
import { describe, expect, it } from 'vitest'
import { conformanceCases, runConformance } from '../helpers/mz-conformance'
import type { ConformanceCase, ConformanceReport } from '../helpers/mz-conformance'
import { corescriptVersion, createMzCorescript } from '../helpers/mz-corescript'
import { createMzShim } from '../helpers/mz-runtime'
import type { MzRuntime } from '../helpers/mz-runtime'

const dir = process.env.MZ_CORESCRIPT_DIR ?? ''

/** What one case did on one runtime: its findings, its renamed loads and its trace. */
function behaviour(report: ConformanceReport, id: string): string {
  return JSON.stringify({
    findings: report.findings.filter((f) => f.caseId === id),
    renames: report.renames.filter((r) => r.caseId === id),
    trace: report.traces[id]
  })
}

function differing(a: ConformanceReport, b: ConformanceReport, cases: ConformanceCase[]): string[] {
  return cases.map((c) => c.id).filter((id) => behaviour(a, id) !== behaviour(b, id))
}

/** The stand-in with commands stored under the plugin name in lower case. */
function lowerCasedCommandKeys(): MzRuntime {
  const mz = createMzShim()
  const manager = mz.context.PluginManager as {
    registerCommand(plugin: string, command: string, fn: unknown): void
  }
  const register = manager.registerCommand.bind(manager)
  manager.registerCommand = (plugin, command, fn) => register(plugin.toLowerCase(), command, fn)
  return mz
}

// Skipped, not passed, without the variable: the run's skip counter allows this file by name.
describe.skipIf(dir === '')('plugin loader stand-in against a local MZ install', () => {
  const cases = conformanceCases()
  const core = (): MzRuntime => createMzCorescript(dir)

  it('gives every case the same report as the core scripts', () => {
    console.log(`mz parity: corescript ${corescriptVersion(dir)}`)
    const shim = runConformance(createMzShim, cases)
    const real = runConformance(core, cases)
    const differ = differing(shim, real, cases)
    console.log(
      `mz parity: plugins ${cases.length}, identical ${cases.length - differ.length}, ` +
        `differing ${differ.length}`
    )
    expect(cases.length).toBeGreaterThan(0)
    const first = differ[0]
    expect(
      first === undefined
        ? ''
        : `${first}\nshim ${behaviour(shim, first)}\nmz   ${behaviour(real, first)}`
    ).toBe('')
  }, 120_000)

  it('tells a stand-in that stores commands under another key from the core scripts', () => {
    const generated = cases.filter((c) => c.kind === 'generated')
    const differ = differing(
      runConformance(lowerCasedCommandKeys, generated),
      runConformance(core, generated),
      generated
    )
    expect(differ.length).toBeGreaterThan(0)
  }, 120_000)
})
