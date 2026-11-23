// What a case needs from a runtime, and how one load is judged, written for a runtime other
// than the stand-in: each case's loads run here on the stand-in and are judged load by load,
// with the same rules and the same reading of each value as the corpus run.
import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import * as ts from 'typescript'
import { describe, expect, it } from 'vitest'
import {
  CONFORMANCE_KINDS,
  KNOWN_NONCONFORMING,
  OBSERVED,
  caseExpectations,
  conformanceCases,
  judgeLoad,
  type CaseExpectation,
  type ConformanceCase,
  type ConformanceFinding,
  type LoadPlan,
  type LoadRecord
} from '../helpers/mz-conformance'
import { createMzShim } from '../helpers/mz-runtime'

const ROOT = path.join(import.meta.dirname, '../..')

const isList = (value: unknown): value is readonly unknown[] => Array.isArray(value)

const isRecordedCall = (value: unknown): value is [string, string | null, unknown, string] =>
  isList(value) &&
  value.length === 4 &&
  typeof value[0] === 'string' &&
  (value[1] === null || typeof value[1] === 'string') &&
  typeof value[3] === 'string'

/**
Runs one load on a fresh stand-in: the observed code under the load name with the load's
stored values, then each command by the file's own name, as an event calls it.
*/
function runLoad(expectation: CaseExpectation, load: LoadPlan): LoadRecord {
  const runtime = createMzShim()
  const observed: unknown[] = []
  runtime.context[OBSERVED] = observed
  const report = runtime.load(
    [{ name: expectation.loadName, status: true, description: '', parameters: load.stored }],
    new Map([[`js/plugins/${expectation.loadName}.js`, expectation.observedCode]])
  )
  const stem = expectation.case.fileName.replace(/\.js$/i, '')
  const ran: string[] = []
  for (const command of load.commands) {
    let isRan: boolean
    try {
      isRan = runtime.runCommand([stem, command.name, command.name, command.args])
    } catch {
      isRan = true
    }
    if (isRan) ran.push(command.name)
  }
  return {
    errors: report.errors.map((error) => `${error.name}: ${error.message}`),
    calls: observed
      .filter((call) => isRecordedCall(call))
      .map(([where, command, self, constants]) => [
        where,
        command,
        self === runtime.interpreter,
        constants
      ]),
    ran
  }
}

const NOT_LOADED: LoadPlan = { set: 'defaults', stored: {}, commands: [] }
const NOTHING_RECORDED: LoadRecord = { errors: [], calls: [], ran: [] }

/**
Every finding of a case's loads; a case that loads nothing is judged once on nothing.
*/
function judgeCase(expectation: CaseExpectation): ConformanceFinding[] {
  return expectation.loads.length === 0
    ? judgeLoad(expectation, NOT_LOADED, NOTHING_RECORDED)
    : expectation.loads.flatMap((load) => judgeLoad(expectation, load, runLoad(expectation, load)))
}

function fixtureCase(): ConformanceCase {
  const found = conformanceCases().find((c) => c.id === 'generator:fixture-generated')
  if (found === undefined) throw new Error('the corpus has no fixture-generated case')
  return found
}

/**
The case with `from` replaced once in its code, failing when `from` is not there.
*/
function changedCase(c: ConformanceCase, from: string, to: string): ConformanceCase {
  expect(c.code).toContain(from)

  return { ...c, id: `${c.id} changed`, code: c.code.replace(from, () => to) }
}

const sourceFile = (file: string): ts.SourceFile =>
  ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true)

/**
Declarations named `name` in `file`: functions, variables, methods, properties and classes.
*/
function declarationsNamed(file: ts.SourceFile, name: string): number {
  let count = 0
  const visit = (node: ts.Node): void => {
    if (
      (ts.isFunctionDeclaration(node) ||
        ts.isVariableDeclaration(node) ||
        ts.isMethodDeclaration(node) ||
        ts.isPropertyDeclaration(node) ||
        ts.isClassDeclaration(node)) &&
      node.name !== undefined &&
      ts.isIdentifier(node.name) &&
      node.name.text === name
    ) {
      count++
    }
    ts.forEachChild(node, visit)
  }
  visit(file)
  return count
}

describe('conformance expectations for a second runtime', () => {
  it('judges every case load by load as the corpus run does', () => {
    const expectations = conformanceCases().map((c) => caseExpectations(c))
    const differing = expectations.flatMap((expectation) => {
      const { id } = expectation.case
      const listed = KNOWN_NONCONFORMING[id] ?? []
      const found = judgeCase(expectation)
      const missing = CONFORMANCE_KINDS.filter(
        (kind) => listed.includes(kind) && found.every((f) => f.kind !== kind)
      )
      const unexpected = found.filter((f) => !listed.includes(f.kind))
      return [
        ...missing.map((kind) => `${id}: no ${kind} finding`),
        ...unexpected.map((f) => `${id}: ${f.kind}: ${f.detail}`)
      ]
    })
    const loads = expectations.flatMap((expectation) => expectation.loads)
    const commands = loads.flatMap((load) => load.commands).length

    expect(
      Math.min(expectations.length, loads.length, commands),
      `case expectations: cases ${String(expectations.length)} loads ${String(loads.length)} commands ${String(commands)}`
    ).toBeGreaterThan(0)
    expect(
      differing,
      `case expectations: cases ${String(expectations.length)} loads ${String(loads.length)} commands ${String(commands)}`
    ).toStrictEqual([])
  })

  it('finds a number parameter read as text', () => {
    const c = changedCase(fixtureCase(), "Number(params['Speed']", "String(params['Speed']")
    const kinds = new Set(judgeCase(caseExpectations(c)).map((f) => f.kind))

    expect([...kinds]).toContain('value')
  })

  it('judges code that does not parse as one load error, with nothing to load', () => {
    const c = changedCase(fixtureCase(), 'function(args) {', 'function(')
    const expectation = caseExpectations(c)

    expect(expectation.loads).toStrictEqual([])
    expect(judgeCase(expectation).map((f) => f.kind)).toStrictEqual(['load-error'])
  })

  it('defines the expected value of a stored parameter once', () => {
    const files = ['tests', 'e2e'].flatMap((directory) =>
      readdirSync(path.join(ROOT, directory), { recursive: true, encoding: 'utf8' })
        .filter((p) => /\.tsx?$/u.test(p))
        .map((p) => path.join(ROOT, directory, p))
    )
    const definitions = files.reduce(
      (sum, file) => sum + declarationsNamed(sourceFile(file), 'expectedValue'),
      0
    )

    expect(files.length, `files scanned: ${String(files.length)}`).toBeGreaterThan(0)
    expect(
      definitions,
      `expectedValue definitions ${String(definitions)} in ${String(files.length)} files`
    ).toBe(1)
  })
})
