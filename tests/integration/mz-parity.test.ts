// The plugin loader stand-in the suite runs on, compared with RPG Maker MZ's own core scripts
// when a developer points MZ_CORESCRIPT_DIR at a local install: every generated and raw-mode
// plugin must behave the same in both. Without the variable nothing of an install is read, and
// the test says so.
import { describe, expect, it } from 'vitest'
import {
  conformanceCases,
  runConformance,
  type ConformanceCase,
  type ConformanceReport
} from '../helpers/mz-conformance'
import { corescriptVersion, createMzCorescript } from '../helpers/mz-corescript'
import { createMzShim, type MzRuntime } from '../helpers/mz-runtime'

const { MZ_CORESCRIPT_DIR: coreDirectory = '' } = process.env

/**
What one case did on one runtime: its findings, its renamed loads and its trace.
*/
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

interface CommandRegistry {
  registerCommand: (plugin: string, command: string, handler: unknown) => void
}

function isCommandRegistry(value: unknown): value is CommandRegistry {
  return (
    typeof value === 'object' &&
    value !== null &&
    'registerCommand' in value &&
    typeof value.registerCommand === 'function'
  )
}

/**
The stand-in with commands stored under the plugin name in lower case.
*/
function lowerCasedCommandKeys(): MzRuntime {
  const mz = createMzShim()
  const { PluginManager: manager }: Record<string, unknown> = mz.context
  if (!isCommandRegistry(manager)) throw new Error('the stand-in has no command registry')
  const register = manager.registerCommand.bind(manager)
  manager.registerCommand = (plugin, command, handler) => {
    register(plugin.toLowerCase(), command, handler)
  }
  return mz
}

const core = (): MzRuntime => createMzCorescript(coreDirectory)

// Skipped, not passed, without the variable: the run's skip counter allows this file by name.
describe.skipIf(coreDirectory === '')('plugin loader stand-in against a local MZ install', () => {
  const cases = conformanceCases()

  it('gives every case the same report as the core scripts', () => {
    process.stdout.write(`mz parity: corescript ${corescriptVersion(coreDirectory)}\n`)
    const shim = runConformance(createMzShim, cases)
    const real = runConformance(core, cases)
    const differ = differing(shim, real, cases)
    process.stdout.write(
      `mz parity: plugins ${String(cases.length)}, ` +
        `identical ${String(cases.length - differ.length)}, differing ${String(differ.length)}\n`
    )

    expect(cases.length).toBeGreaterThan(0)
    // The first differing case, with both behaviours
    expect(
      differ
        .slice(0, 1)
        .map((first) => `${first}\nshim ${behaviour(shim, first)}\nmz   ${behaviour(real, first)}`)
    ).toStrictEqual([])
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
