// Generated plugins, and the files raw mode writes back, run in a stand-in for RPG Maker MZ's
// plugin loader: each must load, register its commands under its own file name, run them with
// the interpreter as `this`, and read every stored value as its header declares it. The
// stand-in's own behaviour is tested first, on plugins written here.
import { describe, expect, it } from 'vitest'
import { generatePlugin } from '../../src/renderer/src/lib/generator/index'
import { fileNameMismatch } from '../../src/renderer/src/lib/plugin-output'
import { ALL_PARAM_TYPES, type PluginDefinition } from '../../src/shared/types/plugin'
import { GENERATOR_ENTRIES } from '../golden/corpus/generator'
import {
  CONFORMANCE_KINDS,
  KNOWN_NONCONFORMING,
  conformanceCases,
  observe,
  runConformance,
  unobserve,
  type ConformanceCase,
  type ConformanceKind,
  type ConformanceReport
} from '../helpers/mz-conformance'
import { createMzShim, type MzPluginEntry, type MzRuntime } from '../helpers/mz-runtime'

const sources = (byName: Record<string, string>): Map<string, string> =>
  new Map(Object.entries(byName).map(([name, source]) => [`js/plugins/${name}.js`, source]))

const entry = (
  name: string,
  parameters: Record<string, string> = {},
  isOn = true
): MzPluginEntry => ({
  name,
  status: isOn,
  description: '',
  parameters
})

/**
The value the plugins left on the runtime's global object under `name`
*/
function globalValue(mz: MzRuntime, name: string): unknown {
  return mz.context[name]
}

describe('plugin loader stand-in: loading', () => {
  it('skips a plugin that is turned off', () => {
    const mz = createMzShim()
    const report = mz.load([entry('Off', {}, false)], sources({ Off: 'globalThis.ran = true;' }))

    expect(report.errors).toStrictEqual([])
    expect(globalValue(mz, 'ran')).toBeUndefined()
  })

  it('loads only the first of two entries with the same name', () => {
    const mz = createMzShim()
    const code = 'globalThis.seen = (globalThis.seen || "") + PluginManager.parameters("Twice").a;'
    mz.load([entry('Twice', { a: '1' }), entry('Twice', { a: '2' })], sources({ Twice: code }))

    expect(globalValue(mz, 'seen')).toBe('1')
  })

  it('finds parameters under any letter case of the plugin name', () => {
    const mz = createMzShim()
    const code = 'globalThis.lower = PluginManager.parameters("foo").a;'
    mz.load([entry('Foo', { a: 'x' })], sources({ Foo: code }))

    expect(globalValue(mz, 'lower')).toBe('x')
    expect(mz.parameters('FOO')).toStrictEqual({ a: 'x' })
    expect(mz.parameters('Other')).toStrictEqual({})
  })
})

describe('plugin loader stand-in: commands', () => {
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

    expect(globalValue(mz, 'self')).toBe(mz.interpreter)
    expect(globalValue(mz, 'count')).toBe(1)
    expect(globalValue(mz, 'value')).toBe('given')
  })

  it('keeps the later of two registrations of one command', () => {
    const mz = createMzShim()
    const code =
      'PluginManager.registerCommand("Foo", "Run", function () { globalThis.which = 1; });' +
      'PluginManager.registerCommand("Foo", "Run", function () { globalThis.which = 2; });'
    mz.load([entry('Foo')], sources({ Foo: code }))
    mz.runCommand(['Foo', 'Run', '', {}])

    expect(globalValue(mz, 'which')).toBe(2)
  })
})

describe('plugin loader stand-in: subfolders and failures', () => {
  it('stores and finds a plugin in a subfolder by its bare name', () => {
    const mz = createMzShim()
    const code =
      'globalThis.a = PluginManager.parameters("Foo").a;' +
      'PluginManager.registerCommand("Foo", "Run", function () { globalThis.ran = true; });'
    const report = mz.load([entry('sub/Foo', { a: '1' })], sources({ 'sub/Foo': code }))

    expect(report.errors).toStrictEqual([])
    expect(globalValue(mz, 'a')).toBe('1')
    expect(mz.runCommand(['sub/Foo', 'Run', '', {}])).toBe(true)
    expect(globalValue(mz, 'ran')).toBe(true)
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

    expect(report.errors).toMatchObject([
      { name: 'Throws' },
      { name: 'Broken' },
      { name: 'Missing', message: 'Failed to load: js/plugins/Missing.js' }
    ])
    expect(globalValue(mz, 'next')).toBe(true)
  })
})

function fixtureGeneratedDefinition(): PluginDefinition {
  const found = GENERATOR_ENTRIES.find((corpusEntry) => corpusEntry.name === 'fixture-generated')
  if (found === undefined) throw new Error('the corpus has no fixture-generated entry')
  return found.def
}

const fixtureGenerated = fixtureGeneratedDefinition()
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

/**
The fixture plugin's code with `from` replaced once, failing when `from` is not there.
*/
function changedFixture(from: string, to: string): string {
  expect(fixtureCode).toContain(from)

  return fixtureCode.replace(from, () => to)
}

describe('conformance runner', () => {
  it('reports none of the bitten kinds on the unchanged plugin', () => {
    const kinds = kindsOf(fixtureCode)
    const bitten: ConformanceKind[] = [
      'command-keys',
      'callback-this',
      'value',
      'header-code-differ'
    ]

    expect(bitten.filter((kind) => kinds.has(kind))).toStrictEqual([])
  })

  it('reports commands registered under another letter case of the plugin name', () => {
    const code = changedFixture(
      "PLUGIN_NAME = 'Fixture_Generated'",
      "PLUGIN_NAME = 'fixture_generated'"
    )

    expect(kindsOf(code).has('command-keys')).toBe(true)
  })

  it('reports a command callback that does not get the interpreter as this', () => {
    const code = changedFixture('function(args) {', '(args) => {')

    expect(kindsOf(code).has('callback-this')).toBe(true)
  })

  it('reports a parameter read as another type than its header declares', () => {
    const code = changedFixture("Number(params['Speed']", "String(params['Speed']")

    expect(kindsOf(code).has('value')).toBe(true)
  })

  it('reports a parameter key the header does not declare', () => {
    const code = changedFixture("params['Speed']", "params['speed']")

    expect(kindsOf(code).has('header-code-differ')).toBe(true)
  })
})

const cases = conformanceCases()

/**
Each case's test title: its id, marked when the case is listed as failing today
*/
const caseRows: [string, ConformanceCase][] = cases.map((c) => [
  `${c.id}${(KNOWN_NONCONFORMING[c.id] ?? []).length > 0 ? ' (fails today)' : ''}`,
  c
])

describe('every generated and raw-mode plugin in the plugin loader', () => {
  let report: ConformanceReport | undefined
  const corpusReport = (): ConformanceReport => (report ??= runConformance(createMzShim, cases))

  it('observes the code without changing it otherwise', () => {
    const observed = cases.map((c) => ({ c, observation: observe(c.code, c.kind) }))

    expect(
      observed
        .filter(({ c, observation }) => unobserve(observation) !== c.code)
        .map(({ c }) => c.id)
    ).toStrictEqual([])
    expect(observed.flatMap(({ observation }) => observation.insertions).length).toBeGreaterThan(0)
  })

  it.each(caseRows)('%s', (_title, c) => {
    const listed = KNOWN_NONCONFORMING[c.id] ?? []
    const found = corpusReport().findings.filter((f) => f.caseId === c.id)

    // Every kind listed as failing today has a finding, and no other kind has one
    expect({
      missing: CONFORMANCE_KINDS.filter(
        (kind) => listed.includes(kind) && found.every((f) => f.kind !== kind)
      ),
      unexpected: found.filter((f) => !listed.includes(f.kind)).map((f) => `${f.kind}: ${f.detail}`)
    }).toStrictEqual({ missing: [], unexpected: [] })
  })

  it('loses the commands under a case-swapped file name, and everything under another name', () => {
    const { renames } = corpusReport()
    const withSomething = cases.filter(
      (c) =>
        c.kind === 'generated' &&
        (c.definition.parameters.length > 0 || c.definition.commands.length > 0)
    )

    expect(new Set(renames.map((r) => r.caseId))).toStrictEqual(
      new Set(withSomething.map((c) => c.id))
    )

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
      ).toStrictEqual(lost)
    }
  })

  it('runs every case, lists only cases that exist and reads every parameter type', () => {
    const { counts } = corpusReport()
    const known = Object.values(KNOWN_NONCONFORMING).flat().length
    const { commandNames, hostileValues, noMainBlock, ownName } = counts.exempt
    process.stdout.write(
      `mz runtime: plugins ${String(counts.plugins)} (generated ${String(counts.generated)}, ` +
        `renamed-name ${String(counts.renamedName)}, raw-mode ${String(counts.rawMode)}), ` +
        `loads ${String(counts.loads)}, commands ${String(counts.commands)}, ` +
        `values ${String(counts.values)}, ` +
        `types ${String(counts.types.size)}/${String(ALL_PARAM_TYPES.size)}, known ${String(known)}\n`
    )
    // Each rule that leaves something out says how much: refused command names, hostile
    // entries' values, parameters added to a file with no main block, files loaded under the
    // name their own code reads parameters with
    process.stdout.write(
      `mz runtime exempt: refused command names ${String(commandNames)}, ` +
        `hostile values ${String(hostileValues)}, no main block ${String(noMainBlock)}, ` +
        `own parameters name ${String(ownName)}\n`
    )

    expect(counts.plugins).toBeGreaterThan(0)
    expect(counts.values).toBeGreaterThan(0)
    expect(counts.types.size).toBe(ALL_PARAM_TYPES.size)

    const listedButMissing = Object.keys(KNOWN_NONCONFORMING).filter((id) =>
      cases.every((c) => c.id !== id)
    )

    expect(listedButMissing).toStrictEqual([])
  })
})
