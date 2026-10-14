// Every golden file maps to a corpus case, and every template, parameter type, fixture plugin,
// persisted store and parameter export has its goldens. The counts come from the template
// registry, the parameter type set and the fixture folders, so adding one without goldens fails.
import { describe, it, expect } from 'vitest'
import { existsSync, readdirSync, readFileSync, statSync } from 'fs'
import { dirname, join, resolve, sep } from 'path'
import {
  getTemplate,
  getTemplatesByCategory
} from '../../src/renderer/src/lib/generator/templates/index'
import { CATEGORIES } from '../../src/renderer/src/lib/generator/templates/types'
import { ALL_PARAM_TYPES } from '../../src/shared/types/plugin'
import type { PluginParameter } from '../../src/shared/types/plugin'
import { ALL_PAYLOADS, COMMENT_PAYLOADS } from '../helpers/hostile'
import { GENERATOR_ENTRIES, countHostileLeaves } from './corpus/generator'
import { V160_FIXTURE } from './corpus/mzparams'
import { persistedStores } from './corpus/persisted'
import { EDITS, fixturePlugins } from './corpus/raw-mode'
import { templateCases, templateIds } from './corpus/templates'

// Resolved from the repository root, like the fixture helpers.
const ROOT = resolve(process.cwd(), 'tests/golden/__golden__')
const HEADER = '// ==== case: '
const PARSES = 'raw-mode/_parses.json'
const STORE_STATES = ['default', 'populated']

/** Every file under the golden folder, relative to it, with `/` separators. */
function goldenFiles(): Set<string> {
  return new Set(
    readdirSync(ROOT, { encoding: 'utf8', recursive: true })
      .filter((path) => statSync(join(ROOT, path)).isFile())
      .map((path) => path.split(sep).join('/'))
  )
}

const caseHeaders = (path: string): string[] =>
  existsSync(join(ROOT, path))
    ? readFileSync(join(ROOT, path), 'utf8')
        .split('\n')
        .filter((line) => line.startsWith(HEADER))
    : []

const hasCase = (headers: string[], name: string): boolean =>
  headers.some((header) => header.startsWith(`${HEADER}${name} `))

const stem = (file: string): string => file.replace(/\.js$/, '')

const ids = templateIds()
const plugins = fixturePlugins()
const storeKeys = persistedStores().map((s) => s.key)
const mzparamsFiles = readdirSync(dirname(V160_FIXTURE)).filter((f) => /^v.*\.mzparams$/.test(f))
const mzparamsGolden = (file: string): string =>
  `mzparams/${file.replace(/\.mzparams$/, '')}-to-generate.js`
const hostileEntries = COMMENT_PAYLOADS.map((payload) => ({
  payload,
  entry: GENERATOR_ENTRIES.find((e) => e.name === `hostile-${payload.name}`)
}))
const generatorGoldens = (name: string): string[] => [
  `generator/${name}.js`,
  `generator/${name}.exports.txt`
]

/** The golden files the corpus cases map to. */
function expectedFiles(): string[] {
  return [
    ...ids.map((id) => `templates/${id}.js`),
    ...GENERATOR_ENTRIES.flatMap((e) => generatorGoldens(e.name)),
    ...plugins.flatMap((f) => EDITS.map((e) => `raw-mode/${stem(f)}.${e.name}.js`)),
    PARSES,
    ...plugins.map((f) => `parser/${stem(f)}.json`),
    ...storeKeys.flatMap((k) => STORE_STATES.map((s) => `persisted/${k}.${s}.json`)),
    ...mzparamsFiles.map(mzparamsGolden)
  ]
}

describe('golden inventory', () => {
  it('every template, type, fixture, store and export has goldens, and no golden is an orphan', () => {
    const onDisk = goldenFiles()
    const expected = expectedFiles()
    const missing = expected.filter((path) => !onDisk.has(path))
    const orphans = [...onDisk].filter((path) => !expected.includes(path))

    const registryIds = CATEGORIES.flatMap((c) => getTemplatesByCategory(c.id).map((t) => t.id))
    let cases = 0
    let templatesDone = 0
    for (const id of ids) {
      const headers = caseHeaders(`templates/${id}.js`)
      const corpus = templateCases(id)
      cases += headers.length
      if (headers.length === corpus.length && corpus.every((c) => hasCase(headers, c.name))) {
        templatesDone++
      }
    }

    const typesOf = (lists: PluginParameter[][]): Set<string> =>
      new Set(lists.flat().map((p) => p.type))
    const defs = GENERATOR_ENTRIES.map((e) => e.def)
    const asParam = typesOf(defs.map((d) => d.parameters))
    const asField = typesOf(defs.flatMap((d) => d.structs.map((s) => s.parameters)))
    const asArg = typesOf(defs.flatMap((d) => d.commands.map((c) => c.args)))
    const typesDone = [...ALL_PARAM_TYPES].filter(
      (t) => asParam.has(t) && asField.has(t) && asArg.has(t)
    ).length

    const parses: Record<string, boolean> = onDisk.has(PARSES)
      ? JSON.parse(readFileSync(join(ROOT, PARSES), 'utf8'))
      : {}
    const fixturesDone = plugins.filter((f) =>
      EDITS.every(
        (e) => onDisk.has(`raw-mode/${stem(f)}.${e.name}.js`) && `${stem(f)}.${e.name}` in parses
      )
    ).length
    const rawMode = [...onDisk].filter((p) => p.startsWith('raw-mode/') && p !== PARSES).length
    const parsesFalse = Object.values(parses).filter((parsed) => !parsed).length
    const parserDone = plugins.filter((f) => onDisk.has(`parser/${stem(f)}.json`)).length
    const storesDone = storeKeys.filter((k) =>
      STORE_STATES.every((s) => onDisk.has(`persisted/${k}.${s}.json`))
    ).length
    const mzparamsDone = mzparamsFiles.filter((f) => onDisk.has(mzparamsGolden(f))).length
    const leaves = { holding: 0, total: 0 }
    for (const { payload, entry } of hostileEntries) {
      if (entry === undefined) continue
      const count = countHostileLeaves(entry.def, payload.text)
      leaves.holding += count.holding
      leaves.total += count.total
    }

    console.log(
      `golden: templates ${templatesDone}/${ids.length} (cases ${cases}); ` +
        `param types ${typesDone}/${ALL_PARAM_TYPES.size}; ` +
        `fixtures ${fixturesDone}/${plugins.length} (raw-mode ${rawMode}, parses-false ${parsesFalse}); ` +
        `parser ${parserDone}/${plugins.length}; ` +
        `persisted keys ${storesDone}/${storeKeys.length} × ${STORE_STATES.length}; ` +
        `mzparams ${mzparamsDone}; hostile leaves ${leaves.holding}/${leaves.total}; ` +
        `files ${onDisk.size}, orphans ${orphans.length}`
    )

    for (const denominator of [
      ids.length,
      ALL_PARAM_TYPES.size,
      plugins.length,
      storeKeys.length,
      mzparamsFiles.length,
      leaves.total,
      onDisk.size
    ]) {
      expect(denominator).toBeGreaterThan(0)
    }
    expect(registryIds.sort()).toEqual(ids)
    expect(templatesDone).toBe(ids.length)
    expect(typesDone).toBe(ALL_PARAM_TYPES.size)
    expect(fixturesDone).toBe(plugins.length)
    expect(Object.keys(parses)).toHaveLength(plugins.length * EDITS.length)
    expect(rawMode).toBe(plugins.length * EDITS.length)
    expect(parserDone).toBe(plugins.length)
    expect(storesDone).toBe(storeKeys.length)
    expect(mzparamsDone).toBe(mzparamsFiles.length)
    expect(leaves.holding).toBe(leaves.total)
    expect(missing).toEqual([])
    expect(orphans).toEqual([])
  })

  it('hostile goldens cover every comment payload and every template text field', () => {
    const onDisk = goldenFiles()
    const payloadsDone = hostileEntries.filter(
      ({ entry }) =>
        entry !== undefined && generatorGoldens(entry.name).every((path) => onDisk.has(path))
    ).length
    let textFields = 0
    let hostileCases = 0
    for (const id of ids) {
      const headers = caseHeaders(`templates/${id}.js`)
      for (const field of getTemplate(id)?.fields ?? []) {
        if (field.type !== 'text') continue
        textFields++
        hostileCases += ALL_PAYLOADS.filter((p) => hasCase(headers, `${field.id}=${p.name}`)).length
      }
    }

    console.log(
      `golden hostile: generator entries ${payloadsDone}/${COMMENT_PAYLOADS.length} payloads, ` +
        `template cases ${hostileCases} (text fields ${textFields} × payloads ${ALL_PAYLOADS.length})`
    )

    expect(COMMENT_PAYLOADS.length).toBeGreaterThan(0)
    expect(textFields).toBeGreaterThan(0)
    expect(payloadsDone).toBe(COMMENT_PAYLOADS.length)
    expect(hostileCases).toBe(textFields * ALL_PAYLOADS.length)
  })
})
