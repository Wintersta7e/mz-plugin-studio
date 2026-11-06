// Every golden file maps to a corpus case, and every template, parameter type, fixture plugin,
// persisted store and parameter export has its goldens. The counts come from the template
// registry, the parameter type set and the fixture folders, so adding one without goldens fails.
import { describe, it, expect } from 'vitest'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import {
  getTemplate,
  getTemplatesByCategory
} from '../../src/renderer/src/lib/generator/templates/index'
import { CATEGORIES } from '../../src/renderer/src/lib/generator/templates/types'
import { ALL_PARAM_TYPES, type PluginParameter } from '../../src/shared/types/plugin'
import { ALL_PAYLOADS, COMMENT_PAYLOADS } from '../helpers/hostile'
import { GENERATOR_ENTRIES, countHostileLeaves } from './corpus/generator'
import { V160_FIXTURE } from './corpus/mzparams'
import { byCodeUnit } from './corpus/normalise'
import { parserPatternCases } from './corpus/parser-patterns'
import { persistedStores } from './corpus/persisted'
import { EDITS, fixturePlugins } from './corpus/raw-mode'
import { templateCases, templateIds } from './corpus/templates'
import { typeViolatingDefaultCases, typeViolatingTemplateCases } from './corpus/type-violating'

// Resolved from the repository root, like the fixture helpers.
const ROOT = path.resolve(process.cwd(), 'tests/golden/__golden__')
const HEADER = '// ==== case: '
const PARSES = 'raw-mode/_parses.json'
const STORE_STATES = ['default', 'populated']

/**
Every file under the golden folder, relative to it, with `/` separators.
*/
function goldenFiles(): Set<string> {
  return new Set(
    readdirSync(ROOT, { encoding: 'utf8', recursive: true })
      .filter((file) => statSync(path.join(ROOT, file)).isFile())
      .map((file) => file.split(path.sep).join('/'))
  )
}

const caseHeaders = (file: string): string[] =>
  existsSync(path.join(ROOT, file))
    ? readFileSync(path.join(ROOT, file), 'utf8')
        .split('\n')
        .filter((line) => line.startsWith(HEADER))
    : []

const hasCase = (headers: string[], name: string): boolean =>
  headers.some((header) => header.startsWith(`${HEADER}${name} `))

const stem = (file: string): string => file.replace(/\.js$/, '')

const ids = templateIds()
const plugins = fixturePlugins()
const storeKeys = persistedStores().map((s) => s.key)
const mzparamsFiles = readdirSync(path.dirname(V160_FIXTURE)).filter((f) =>
  /^v.*\.mzparams$/.test(f)
)
const mzparamsGolden = (file: string): string =>
  `mzparams/${file.replace(/\.mzparams$/, '')}-to-generate.js`
const hostileEntries = COMMENT_PAYLOADS.map((payload) => ({
  payload,
  entry: GENERATOR_ENTRIES.find((candidate) => candidate.name === `hostile-${payload.name}`)
}))
const generatorGoldens = (name: string): string[] => [
  `generator/${name}.js`,
  `generator/${name}.exports.txt`
]
const typeViolatingGolden = (id: string): string => `templates/${id}.type-violating.js`
const patternGolden = (name: string): string => `parser/pattern-${name}.json`
const patternNames = parserPatternCases.map((c) => c.name)

/**
The golden files the corpus cases map to.
*/
function expectedFiles(): string[] {
  return [
    ...ids.flatMap((id) => [`templates/${id}.js`, typeViolatingGolden(id)]),
    ...GENERATOR_ENTRIES.flatMap(({ name }) => generatorGoldens(name)),
    ...typeViolatingDefaultCases.map((c) => `generator/${c.name}.js`),
    ...plugins.flatMap((f) => EDITS.map((edit) => `raw-mode/${stem(f)}.${edit.name}.js`)),
    PARSES,
    ...plugins.map((f) => `parser/${stem(f)}.json`),
    ...patternNames.map((name) => patternGolden(name)),
    ...storeKeys.flatMap((k) => STORE_STATES.map((s) => `persisted/${k}.${s}.json`)),
    ...mzparamsFiles.map((file) => mzparamsGolden(file))
  ]
}

// Case headers in the template goldens, and the templates whose goldens hold every case.
function templateCounts(): { cases: number; templatesDone: number } {
  let cases = 0
  let templatesDone = 0
  for (const id of ids) {
    const files: [string, { name: string }[]][] = [
      [`templates/${id}.js`, templateCases(id)],
      [typeViolatingGolden(id), typeViolatingTemplateCases(id)]
    ]
    let isDone = true
    for (const [file, corpus] of files) {
      const headers = caseHeaders(file)
      cases += headers.length
      if (headers.length !== corpus.length || corpus.some((c) => !hasCase(headers, c.name))) {
        isDone = false
      }
    }
    if (isDone) templatesDone++
  }
  return { cases, templatesDone }
}

const typesOf = (lists: PluginParameter[][]): Set<string> =>
  new Set(lists.flat().map((p) => p.type))

// Parameter types the generator entries use as a parameter, a struct field and a command argument.
function typesDone(): number {
  const definitions = GENERATOR_ENTRIES.map((generatorEntry) => generatorEntry.def)
  const asParam = typesOf(definitions.map((d) => d.parameters))
  const asField = typesOf(definitions.flatMap((d) => d.structs.map((s) => s.parameters)))
  const asArg = typesOf(definitions.flatMap((d) => d.commands.map((c) => c.args)))
  return [...ALL_PARAM_TYPES].filter((t) => asParam.has(t) && asField.has(t) && asArg.has(t)).length
}

// The compile result of each raw-mode golden, as its golden records them.
function readParses(onDisk: Set<string>): Map<string, unknown> {
  if (!onDisk.has(PARSES)) return new Map()
  const parsed: unknown = JSON.parse(readFileSync(path.join(ROOT, PARSES), 'utf8'))
  return new Map(typeof parsed === 'object' && parsed !== null ? Object.entries(parsed) : [])
}

// String leaves of the hostile generator entries, and those that carry their payload.
function hostileLeaves(): { holding: number; total: number } {
  const leaves = { holding: 0, total: 0 }
  for (const { payload, entry } of hostileEntries) {
    if (entry === undefined) continue
    const count = countHostileLeaves(entry.def, payload.text)
    leaves.holding += count.holding
    leaves.total += count.total
  }
  return leaves
}

interface Inventory {
  onDisk: Set<string>
  missing: string[]
  orphans: string[]
  parses: Map<string, unknown>
  cases: number
  templatesDone: number
  typesDone: number
  fixturesDone: number
  rawMode: number
  parsesFalse: number
  parserDone: number
  patternsDone: number
  storesDone: number
  mzparamsDone: number
  leaves: { holding: number; total: number }
}

// What the golden folder holds against what the corpus maps to, counted per kind of golden.
function takeInventory(): Inventory {
  const onDisk = goldenFiles()
  const expected = expectedFiles()
  const parses = readParses(onDisk)
  return {
    onDisk,
    missing: expected.filter((file) => !onDisk.has(file)),
    orphans: [...onDisk].filter((file) => !expected.includes(file)),
    parses,
    ...templateCounts(),
    typesDone: typesDone(),
    fixturesDone: plugins.filter((f) =>
      EDITS.every(
        (edit) =>
          onDisk.has(`raw-mode/${stem(f)}.${edit.name}.js`) && parses.has(`${stem(f)}.${edit.name}`)
      )
    ).length,
    rawMode: [...onDisk].filter((file) => file.startsWith('raw-mode/') && file !== PARSES).length,
    parsesFalse: parses
      .values()
      .filter((parsed) => parsed !== true)
      .toArray().length,
    parserDone: plugins.filter((f) => onDisk.has(`parser/${stem(f)}.json`)).length,
    patternsDone: patternNames.filter((name) => onDisk.has(patternGolden(name))).length,
    storesDone: storeKeys.filter((k) =>
      STORE_STATES.every((s) => onDisk.has(`persisted/${k}.${s}.json`))
    ).length,
    mzparamsDone: mzparamsFiles.filter((f) => onDisk.has(mzparamsGolden(f))).length,
    leaves: hostileLeaves()
  }
}

// The one line that states every count of the inventory.
const inventoryLine = (inventory: Inventory): string =>
  `golden: templates ${String(inventory.templatesDone)}/${String(ids.length)} (cases ${String(inventory.cases)}); ` +
  `param types ${String(inventory.typesDone)}/${String(ALL_PARAM_TYPES.size)}; ` +
  `fixtures ${String(inventory.fixturesDone)}/${String(plugins.length)} ` +
  `(raw-mode ${String(inventory.rawMode)}, parses-false ${String(inventory.parsesFalse)}); ` +
  `parser ${String(inventory.parserDone)}/${String(plugins.length)} ` +
  `(patterns ${String(inventory.patternsDone)}/${String(patternNames.length)}); ` +
  `persisted keys ${String(inventory.storesDone)}/${String(storeKeys.length)} × ${String(STORE_STATES.length)}; ` +
  `mzparams ${String(inventory.mzparamsDone)}; ` +
  `hostile leaves ${String(inventory.leaves.holding)}/${String(inventory.leaves.total)}; ` +
  `files ${String(inventory.onDisk.size)}, orphans ${String(inventory.orphans.length)}`

describe('golden inventory', () => {
  it('every template, type, fixture, store and export has goldens, and no golden is an orphan', () => {
    const inventory = takeInventory()
    const registryIds = CATEGORIES.flatMap((c) => getTemplatesByCategory(c.id).map((t) => t.id))
    process.stdout.write(`${inventoryLine(inventory)}\n`)

    for (const denominator of [
      ids.length,
      ALL_PARAM_TYPES.size,
      plugins.length,
      patternNames.length,
      storeKeys.length,
      mzparamsFiles.length,
      inventory.leaves.total,
      inventory.onDisk.size
    ]) {
      expect(denominator).toBeGreaterThan(0)
    }

    expect({
      registryIds: registryIds.toSorted(byCodeUnit),
      templatesDone: inventory.templatesDone,
      typesDone: inventory.typesDone,
      fixturesDone: inventory.fixturesDone,
      parses: inventory.parses.size,
      rawMode: inventory.rawMode,
      parserDone: inventory.parserDone,
      storesDone: inventory.storesDone,
      mzparamsDone: inventory.mzparamsDone,
      holding: inventory.leaves.holding,
      missing: inventory.missing,
      orphans: inventory.orphans
    }).toStrictEqual({
      registryIds: ids,
      templatesDone: ids.length,
      typesDone: ALL_PARAM_TYPES.size,
      fixturesDone: plugins.length,
      parses: plugins.length * EDITS.length,
      rawMode: plugins.length * EDITS.length,
      parserDone: plugins.length,
      storesDone: storeKeys.length,
      mzparamsDone: mzparamsFiles.length,
      holding: inventory.leaves.total,
      missing: [],
      orphans: []
    })
  })

  it('hostile goldens cover every comment payload and every template text field', () => {
    const onDisk = goldenFiles()
    const payloadsDone = hostileEntries.filter(
      ({ entry }) =>
        entry !== undefined && generatorGoldens(entry.name).every((file) => onDisk.has(file))
    ).length
    let textFields = 0
    let hostileCases = 0
    for (const id of ids) {
      const headers = caseHeaders(`templates/${id}.js`)
      const fields = getTemplate(id)?.fields ?? []
      for (const field of fields) {
        if (field.type !== 'text') continue
        textFields++
        hostileCases += ALL_PAYLOADS.filter((p) => hasCase(headers, `${field.id}=${p.name}`)).length
      }
    }

    process.stdout.write(
      `golden hostile: generator entries ${String(payloadsDone)}/${String(COMMENT_PAYLOADS.length)} payloads, ` +
        `template cases ${String(hostileCases)} (text fields ${String(textFields)} × payloads ${String(ALL_PAYLOADS.length)})\n`
    )

    expect(COMMENT_PAYLOADS.length).toBeGreaterThan(0)
    expect(textFields).toBeGreaterThan(0)
    expect(payloadsDone).toBe(COMMENT_PAYLOADS.length)
    expect(hostileCases).toBe(textFields * ALL_PAYLOADS.length)
  })
})
