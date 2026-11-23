// Each engine probe is labelled with the edition that added its syntax: it parses at that edition
// and at no earlier one, and every edition up to the parser's latest has its forms listed.
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { parse, type ecmaVersion } from 'acorn'
import { describe, expect, it } from 'vitest'
import { EDITION_FORMS, ENGINE_PROBES } from '../helpers/engine-probes'

const ACORN_TYPES = path.join(import.meta.dirname, '../../node_modules/acorn/dist/acorn.d.ts')
const FIRST_YEAR = 2015
const EDITIONS: readonly ecmaVersion[] = [
  5, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026
]

/**
The highest year in the parser's own `ecmaVersion` declaration.
*/
function latestYear(): number {
  const declaration = /export type ecmaVersion = ([^\n]+)/u.exec(readFileSync(ACORN_TYPES, 'utf8'))
  const years = (declaration?.[1] ?? '').match(/\b\d{4}\b/gu) ?? []
  return Math.max(0, ...years.map(Number))
}

/**
Whether `source` parses as a function body at edition `year`; the reason when it does not.
*/
function parsesAt(source: string, year: number): true | string {
  const edition = EDITIONS.find((listed) => listed === year)
  if (edition === undefined) return `edition ${String(year)} is not listed here`
  try {
    parse(`(function(){${source}\n})`, { ecmaVersion: edition, sourceType: 'script' })
    return true
  } catch (error) {
    return String(error)
  }
}

const previous = (year: number): number => (year === FIRST_YEAR ? 5 : year - 1)

describe('engine probes', () => {
  it('labels each probe with the edition that added its syntax', () => {
    const mislabelled = ENGINE_PROBES.flatMap((probe) => {
      const atYear = parsesAt(probe.source, probe.year)
      const before = parsesAt(probe.source, previous(probe.year))
      return [
        ...(atYear === true ? [] : [`${probe.id}: fails at ${String(probe.year)}: ${atYear}`]),
        ...(before === true
          ? [`${probe.id}: already parses at ${String(previous(probe.year))}`]
          : [])
      ]
    })

    expect(ENGINE_PROBES.length, `probes: ${String(ENGINE_PROBES.length)}`).toBeGreaterThan(0)
    expect(mislabelled, `probes checked: ${String(ENGINE_PROBES.length)}`).toStrictEqual([])
  })

  it('lists the forms of every edition up to the parser latest, one probe per form', () => {
    const last = latestYear()
    const years = Array.from(
      { length: Math.max(0, last - FIRST_YEAR + 1) },
      (_, index) => index + FIRST_YEAR
    )
    const forms = years.flatMap((year) =>
      (EDITION_FORMS[year] ?? []).map((form) => ({ ...form, year }))
    )
    const excluded = forms.filter((form) => form.excluded !== undefined)
    const problems = [
      ...years
        .filter((year) => (EDITION_FORMS[year] ?? []).length === 0)
        .map((year) => `${String(year)}: no forms listed`),
      ...Object.keys(EDITION_FORMS)
        .map(Number)
        .filter((year) => !years.includes(year))
        .map((year) => `${String(year)}: past the parser latest ${String(last)}`),
      ...excluded
        .filter((form) => form.excluded === '')
        .map((form) => `${form.id}: excluded with no reason`),
      ...years
        .filter(
          (year) =>
            ENGINE_PROBES.every((probe) => probe.year !== year) &&
            (EDITION_FORMS[year] ?? []).some((form) => form.excluded === undefined)
        )
        .map((year) => `${String(year)}: no probe`),
      ...forms
        .filter((form) => form.excluded === undefined)
        .filter(
          (form) =>
            ENGINE_PROBES.filter((probe) => probe.id === form.id && probe.year === form.year)
              .length !== 1
        )
        .map((form) => `${form.id} (${String(form.year)}): not exactly one probe`),
      ...ENGINE_PROBES.filter((probe) =>
        forms.every(
          (form) => form.id !== probe.id || form.year !== probe.year || form.excluded !== undefined
        )
      ).map((probe) => `${probe.id} (${String(probe.year)}): no form`)
    ]

    expect(
      ENGINE_PROBES.length,
      `engine probes: checked ${String(ENGINE_PROBES.length)} years ${String(FIRST_YEAR)}-${String(last)} excluded ${String(excluded.length)}`
    ).toBeGreaterThan(0)
    expect(
      problems,
      `engine probes: checked ${String(ENGINE_PROBES.length)} years ${String(FIRST_YEAR)}-${String(last)} excluded ${String(excluded.length)}`
    ).toStrictEqual([])
  })
})
