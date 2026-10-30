// Generated plugins, and the files raw mode writes back, run in a stand-in for RPG Maker MZ's
// plugin loader: each must load, register its commands under its own file name, run them with
// the interpreter as `this`, and read every stored value as its header declares it. The
// stand-in's own behaviour is tested first, on plugins written here.
import { describe, expect, it } from 'vitest'
import { generatePlugin } from '../../src/renderer/src/lib/generator/index'
import { fileNameMismatch } from '../../src/renderer/src/lib/plugin-output'
import { ALL_PARAM_TYPES } from '../../src/shared/types/plugin'
import { GENERATOR_ENTRIES } from '../golden/corpus/generator'
import {
  CONFORMANCE_KINDS,
  KNOWN_NONCONFORMING,
  conformanceCases,
  observe,
  runConformance,
  unobserve
} from '../helpers/mz-conformance'
import type { ConformanceCase, ConformanceKind, ConformanceReport } from '../helpers/mz-conformance'
import { createMzShim } from '../helpers/mz-runtime'
import type { MzPluginEntry } from '../helpers/mz-runtime'

const sources = (byName: Record<string, string>): Map<string, string> =>
  new Map(Object.entries(byName).map(([name, source]) => [`js/plugins/${name}.js`, source]))

const entry = (
  name: string,
  parameters: Record<string, string> = {},
  status = true
): MzPluginEntry => ({
  name,
  status,
  description: '',
  parameters
})

describe('plugin loader stand-in', () => {
  it('skips a plugin that is turned off', () => {
    const mz = createMzShim()
    const report = mz.load([entry('Off', {}, false)], sources({ Off: 'globalThis.ran = true;' }))
    expect(report.errors).toEqual([])
    expect(mz.context.ran).toBeUndefined()
  })

  it('loads only the first of two entries with the same name', () => {
    const mz = createMzShim()
    const code = 'globalThis.seen = (globalThis.seen || "") + PluginManager.parameters("Twice").a;'
    mz.load([entry('Twice', { a: '1' }), entry('Twice', { a: '2' })], sources({ Twice: code }))
    expect(mz.context.seen).toBe('1')
  })

  it('finds parameters under any letter case of the plugin name', () => {
    const mz = createMzShim()
    const code = 'globalThis.lower = PluginManager.parameters("foo").a;'
    mz.load([entry('Foo', { a: 'x' })], sources({ Foo: code }))
    expect(mz.context.lower).toBe('x')
    expect(mz.parameters('FOO')).toEqual({ a: 'x' })
    expect(mz.parameters('Other')).toEqual({})
  })

  it('finds a command only under the letter case it was registered with', () => {
    const mz = createMzShim()
    const code = 'PluginManager.registerCommand("Foo", "Run", function () {});'
    mz.load([entry('Foo')], sources({ Foo: code }))
    expect(mz.runCommand(['Foo', 'Run', '', {}])).toBe(true)
    expect(mz.runCommand(['foo', 'Run', '', {}])).toBe(false)
    expect(mz.runCommand(['Foo', 'run', '', {}])).toBe(false)
  })

  it('does nothing for a command nobody registered', () => {
    const mz = createMzShim()
    mz.load([entry('Foo')], sources({ Foo: '' }))
    expect(() => mz.runCommand(['Foo', 'Missing', '', {}])).not.toThrow()
    expect(mz.runCommand(['Foo', 'Missing', '', {}])).toBe(false)
  })

  it('runs a command with the interpreter as this and the args as its one argument', () => {
    const mz = createMzShim()
    const code =
      'PluginManager.registerCommand("Foo", "Run", function (args) {' +
      ' globalThis.self = this; globalThis.count = arguments.length; globalThis.value = args.v; });'
    mz.load([entry('Foo')], sources({ Foo: code }))
    mz.runCommand(['Foo', 'Run', 'Label', { v: 'given' }])
    expect(mz.context.self).toBe(mz.interpreter)
    expect(mz.context.count).toBe(1)
    expect(mz.context.value).toBe('given')
  })

  it('keeps the later of two registrations of one command', () => {
    const mz = createMzShim()
    const code =
      'PluginManager.registerCommand("Foo", "Run", function () { globalThis.which = 1; });' +
      'PluginManager.registerCommand("Foo", "Run", function () { globalThis.which = 2; });'
    mz.load([entry('Foo')], sources({ Foo: code }))
    mz.runCommand(['Foo', 'Run', '', {}])
    expect(mz.context.which).toBe(2)
  })

  it('stores and finds a plugin in a subfolder by its bare name', () => {
    const mz = createMzShim()
    const code =
      'globalThis.a = PluginManager.parameters("Foo").a;' +
      'PluginManager.registerCommand("Foo", "Run", function () { globalThis.ran = true; });'
    const report = mz.load([entry('sub/Foo', { a: '1' })], sources({ 'sub/Foo': code }))
    expect(report.errors).toEqual([])
    expect(mz.context.a).toBe('1')
    expect(mz.runCommand(['sub/Foo', 'Run', '', {}])).toBe(true)
    expect(mz.context.ran).toBe(true)
  })

  it('reports a plugin that throws, one that does not parse and one that is missing, and loads the next', () => {
    const mz = createMzShim()
    const report = mz.load(
      [entry('Throws'), entry('Broken'), entry('Missing'), entry('Next')],
      sources({
        Throws: 'throw new Error("boom");',
        Broken: 'const = 1;',
        Next: 'globalThis.next = true;'
      })
    )
    expect(report.errors.map((e) => e.name)).toEqual(['Throws', 'Broken', 'Missing'])
    expect(report.errors[2].message).toBe('Failed to load: js/plugins/Missing.js')
    expect(mz.context.next).toBe(true)
  })
})

const fixtureGenerated = GENERATOR_ENTRIES.find((e) => e.name === 'fixture-generated')!.def
const fixtureCode = generatePlugin(fixtureGenerated)

function kindsOf(code: string): Set<ConformanceKind> {
  const bite: ConformanceCase = {
    id: 'bite',
    fileName: 'Fixture_Generated.js',
    code,
    kind: 'generated',
    definition: fixtureGenerated
  }
  return new Set(runConformance(createMzShim, [bite]).findings.map((f) => f.kind))
}

/** `code` with `from` replaced once, failing when `from` is not there. */
function changed(code: string, from: string, to: string): string {
  expect(code).toContain(from)
  return code.replace(from, to)
}

describe('conformance runner', () => {
  it('reports none of the bitten kinds on the unchanged plugin', () => {
    const kinds = kindsOf(fixtureCode)
    for (const kind of ['command-keys', 'callback-this', 'value', 'header-code-differ'] as const) {
      expect(kinds.has(kind), kind).toBe(false)
    }
  })

  it('reports commands registered under another letter case of the plugin name', () => {
    const code = changed(
      fixtureCode,
      "PLUGIN_NAME = 'Fixture_Generated'",
      "PLUGIN_NAME = 'fixture_generated'"
    )
    expect(kindsOf(code).has('command-keys')).toBe(true)
  })

  it('reports a command callback that does not get the interpreter as this', () => {
    const code = changed(fixtureCode, 'function(args) {', '(args) => {')
    expect(kindsOf(code).has('callback-this')).toBe(true)
  })

  it('reports a parameter read as another type than its header declares', () => {
    const code = changed(fixtureCode, "Number(params['Speed']", "String(params['Speed']")
    expect(kindsOf(code).has('value')).toBe(true)
  })

  it('reports a parameter key the header does not declare', () => {
    const code = changed(fixtureCode, "params['Speed']", "params['speed']")
    expect(kindsOf(code).has('header-code-differ')).toBe(true)
  })
})

const cases = conformanceCases()
let report: ConformanceReport | null = null
const corpusReport = (): ConformanceReport => (report ??= runConformance(createMzShim, cases))

describe('every generated and raw-mode plugin in the plugin loader', () => {
  it('observes the code without changing it otherwise', () => {
    let observed = 0
    for (const c of cases) {
      const observation = observe(c.code, c.kind)
      expect(unobserve(observation), c.id).toBe(c.code)
      observed += observation.insertions.length
    }
    expect(observed).toBeGreaterThan(0)
  })

  for (const c of cases) {
    const listed = KNOWN_NONCONFORMING[c.id] ?? []
    it(`${c.id}${listed.length > 0 ? ' (fails today)' : ''}`, () => {
      const found = corpusReport().findings.filter((f) => f.caseId === c.id)
      for (const kind of CONFORMANCE_KINDS) {
        const details = found.filter((f) => f.kind === kind).map((f) => f.detail)
        if (listed.includes(kind)) expect(details, `${kind} expected to fail`).not.toEqual([])
        else expect(details, kind).toEqual([])
      }
    })
  }

  it('loses the commands under a case-swapped file name, and everything under another name', () => {
    const { renames } = corpusReport()
    const withSomething = cases.filter(
      (c) =>
        c.kind === 'generated' &&
        (c.definition.parameters.length > 0 || c.definition.commands.length > 0)
    )
    expect(new Set(renames.map((r) => r.caseId))).toEqual(new Set(withSomething.map((c) => c.id)))
    for (const r of renames) {
      expect(r.commandsLost, `${r.caseId} ${r.rename} commands`).toBe(r.hasCommands)
      expect(r.parametersLost, `${r.caseId} ${r.rename} parameters`).toBe(
        r.rename === 'other-name' && r.hasParameters
      )
    }
  })

  it('the save warning names exactly what a plugin loses under another file name', () => {
    const { renames } = corpusReport()
    expect(renames.length).toBeGreaterThan(0)
    for (const r of renames) {
      const c = cases.find((x) => x.id === r.caseId)
      const lost =
        r.commandsLost || r.parametersLost
          ? { commands: r.commandsLost, parameters: r.parametersLost }
          : null
      expect(
        c && fileNameMismatch(c.definition, r.fileName, c.code),
        `${r.caseId} ${r.rename}`
      ).toEqual(lost)
    }
  })

  it('runs every case, lists only cases that exist and reads every parameter type', () => {
    const { counts } = corpusReport()
    const known = Object.values(KNOWN_NONCONFORMING).flat().length
    const { commandNames, hostileValues, noMainBlock, ownName } = counts.exempt
    console.log(
      `mz runtime: plugins ${counts.plugins} (generated ${counts.generated}, renamed-name ${counts.renamedName}, ` +
        `raw-mode ${counts.rawMode}), loads ${counts.loads}, commands ${counts.commands}, values ${counts.values}, ` +
        `types ${counts.types.size}/${ALL_PARAM_TYPES.size}, known ${known}`
    )
    // Each rule that leaves something out says how much: refused command names, hostile
    // entries' values, parameters added to a file with no main block, files loaded under the
    // name their own code reads parameters with
    console.log(
      `mz runtime exempt: refused command names ${commandNames}, hostile values ${hostileValues}, ` +
        `no main block ${noMainBlock}, own parameters name ${ownName}`
    )
    expect(counts.plugins).toBeGreaterThan(0)
    expect(counts.values).toBeGreaterThan(0)
    expect(counts.types.size).toBe(ALL_PARAM_TYPES.size)
    const ids = new Set(cases.map((c) => c.id))
    expect(Object.keys(KNOWN_NONCONFORMING).filter((id) => !ids.has(id))).toEqual([])
  })
})
