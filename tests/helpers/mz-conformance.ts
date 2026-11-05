// Runs every plugin the generator writes, and every file raw mode writes back, through an
// `MzRuntime`, and reports where the plugin does not behave as RPG Maker MZ's rules say: it
// must load, register its commands under its own file name, run them with the interpreter as
// `this`, and read each stored parameter and argument as its header declares it.
import { parse, type AnyNode } from 'acorn'
import { Script } from 'node:vm'
import {
  generatePlugin,
  generateRawMode,
  validatePlugin
} from '../../src/renderer/src/lib/generator/index'
import { annotationText } from '../../src/renderer/src/lib/generator/escape'
import { saveFileName } from '../../src/renderer/src/lib/plugin-output'
import { PluginParser } from '../../src/main/services/pluginParser'
import { findAnnotationBlocks } from '../../src/shared/annotation-blocks'
import {
  ID_BASED_PARAM_TYPES,
  toBaseline,
  type ParamType,
  type PluginDefinition,
  type PluginParameter,
  type PluginStruct
} from '../../src/shared/types/plugin'
import { GENERATOR_ENTRIES } from '../golden/corpus/generator'
import { EDITS, fixturePlugins, loadFixture } from '../golden/corpus/raw-mode'
import type { MzRuntime } from './mz-runtime'

export interface ConformanceCase {
  id: string
  /**
  The file the app saves the plugin to, and so the name MZ knows it by.
  */
  fileName: string
  code: string
  kind: 'generated' | 'raw-mode'
  definition: PluginDefinition
  /**
  The entry's own plugin name, when it is not a file name and the case runs under another.
  */
  renamedFrom?: string
  /**
  A corpus entry with hostile text in every field, its parameter types included: what its
  values read as is not compared, since the header's type is the payload by design.
  */
  hostile?: boolean
}

export type ConformanceKind =
  | 'load-error'
  | 'command-keys'
  | 'callback-this'
  | 'value'
  | 'empty-string-replaced'
  | 'header-code-differ'

export const CONFORMANCE_KINDS: readonly ConformanceKind[] = [
  'load-error',
  'command-keys',
  'callback-this',
  'value',
  'empty-string-replaced',
  'header-code-differ'
]

export interface ConformanceFinding {
  caseId: string
  kind: ConformanceKind
  detail: string
}

/**
A generated plugin loaded under another file name, and what it lost there.
*/
export interface RenameResult {
  caseId: string
  rename: 'case-swap' | 'other-name'
  /**
  The file name it was loaded under.
  */
  fileName: string
  hasCommands: boolean
  hasParameters: boolean
  commandsLost: boolean
  parametersLost: boolean
}

export interface ConformanceReport {
  findings: ConformanceFinding[]
  renames: RenameResult[]
  /**
  What each case did, line by line: identical traces mean identical behaviour.
  */
  traces: Record<string, string[]>
  counts: {
    plugins: number
    generated: number
    renamedName: number
    rawMode: number
    loads: number
    commands: number
    values: number
    types: Set<string>
    /**
    What the rules below leave out, each counted where it applies.
    */
    exempt: {
      /**
      Commands whose name the app refuses, so header and code need not agree on it.
      */
      commandNames: number
      /**
      Values of hostile entries, not compared.
      */
      hostileValues: number
      /**
      Parameters raw mode added to a file with no main block, which no header can declare.
      */
      noMainBlock: number
      /**
      Raw-mode cases loaded under the name the file's own code reads its parameters with.
      */
      ownName: number
    }
  }
}

/**
Pairs that fail today, by case: each is removed by the change that fixes it, and a listed
pair that holds fails the check as surely as an unlisted pair that fails.
*/
export const KNOWN_NONCONFORMING: Record<string, ConformanceKind[]> = {}

// --- Cases ---------------------------------------------------------------------------------

/**
Every generator corpus entry as the app writes it, and every fixture written back by raw mode
after each edit. An entry whose plugin name is not a file name cannot be loaded at all, so it
runs under a plain name instead, keeping its own in `renamedFrom`.
*/
export function conformanceCases(): ConformanceCase[] {
  const cases: ConformanceCase[] = []
  let renamed = 0
  for (const entry of GENERATOR_ENTRIES) {
    let definition = entry.def
    let renamedFrom: string | undefined
    if (isPluginNameRefused(definition)) {
      renamedFrom = definition.meta.name
      renamed += 1
      const plain: PluginDefinition = {
        ...definition,
        meta: { ...definition.meta, name: `Hostile_${String(renamed)}` }
      }
      delete plain.importedFrom
      definition = plain
    }
    cases.push({
      id: `generator:${entry.name}`,
      fileName: saveFileName(definition),
      code: generatePlugin(definition),
      kind: 'generated',
      definition,
      ...(renamedFrom !== undefined && { renamedFrom }),
      ...(entry.name.startsWith('hostile-') && { hostile: true })
    })
  }
  for (const file of fixturePlugins()) {
    const opened = loadFixture(file)
    for (const edit of EDITS) {
      const definition = edit.apply(opened)
      cases.push({
        id: `raw-mode:${file.replace(/\.js$/, '')}.${edit.name}`,
        fileName: file,
        code: generateRawMode(definition, toBaseline(opened)),
        kind: 'raw-mode',
        definition
      })
    }
  }
  return cases
}

// --- Value sets and the reading each type gets ----------------------------------------------

export type ValueSetName = 'defaults' | 'absent' | 'edited'
const VALUE_SETS: readonly ValueSetName[] = ['defaults', 'absent', 'edited']

const isNumeric = (type: ParamType | undefined): boolean =>
  type === 'number' || (type !== undefined && ID_BASED_PARAM_TYPES.has(type))
const isJson = (type: ParamType): boolean =>
  type === 'struct' || type === 'array' || type === 'location'

/**
The header's `@default` text, as the editor stores it for a value the user never changed.
*/
const defaultText = (param: PluginParameter): string => String(param.default)

function structValue(name: string | undefined, structs: readonly PluginStruct[]): string {
  const fields = structs.find((s) => s.name === name)?.parameters ?? []
  return JSON.stringify(Object.fromEntries(fields.map((f) => [f.name, `${f.name} value`])))
}

function editedArray(param: PluginParameter, structs: readonly PluginStruct[]): string {
  if (param.arrayType === 'struct') {
    const item = structValue(param.structType, structs)
    return JSON.stringify([item, item])
  }
  if (isNumeric(param.arrayType)) return '["4","5"]'
  if (param.arrayType === 'boolean') return '["true","false"]'
  return '["a","b"]'
}

type ValueOf = (param: PluginParameter, structs: readonly PluginStruct[]) => string

// The edited value of each type that has one other than empty text
const EDITED: Partial<Record<ParamType, ValueOf>> = {
  boolean: (param) => (defaultText(param) === 'true' ? 'false' : 'true'),
  struct: (param, structs) => structValue(param.structType, structs),
  location: () => '{"mapId":"2","x":"3","y":"4"}',
  array: editedArray
}

/**
A value the user set: empty for text, zero for numbers, the other boolean, filled JSON.
*/
function editedValue(param: PluginParameter, structs: readonly PluginStruct[]): string {
  return isNumeric(param.type) ? '0' : (EDITED[param.type]?.(param, structs) ?? '')
}

function valueSet(
  set: ValueSetName,
  params: readonly PluginParameter[],
  structs: readonly PluginStruct[]
): Record<string, string> {
  if (set === 'absent') return {}
  if (set === 'edited')
    return Object.fromEntries(params.map((p) => [p.name, editedValue(p, structs)]))
  // A default that does not read as its type is the annotation check's finding; here the
  // editor is taken to store nothing for it
  return Object.fromEntries(
    params.filter((p) => canReadAsType(p, defaultText(p))).map((p) => [p.name, defaultText(p)])
  )
}

function canReadAsType(param: PluginParameter, text: string): boolean {
  if (text === '') return true
  try {
    readAs(param, text)
    return true
  } catch {
    return false
  }
}

const readStructItem = (item: unknown): unknown => JSON.parse(String(item)) as unknown
const readBooleanItem = (item: unknown): unknown => item === 'true'

/**
How each item of an array of `arrayType` is read; undefined when the items stay as stored.
*/
function itemReader(arrayType: ParamType | undefined): ((item: unknown) => unknown) | undefined {
  if (arrayType === 'struct') return readStructItem
  if (isNumeric(arrayType)) return Number
  if (arrayType === 'boolean') return readBooleanItem
  return undefined
}

function readArray(param: PluginParameter, text: string): unknown {
  const parsed: unknown = JSON.parse(text)
  const readItem = itemReader(param.arrayType)
  if (readItem === undefined) return parsed
  if (!Array.isArray(parsed)) throw new TypeError(`${text} is not a JSON array`)
  const items: unknown[] = parsed
  return items.map((item) => readItem(item))
}

type ReadOf = (param: PluginParameter, text: string) => unknown

// The reading of each type other than plain text
const READ: Partial<Record<ParamType, ReadOf>> = {
  boolean: (_param, text) => text === 'true',
  struct: (_param, text) => JSON.parse(text) as unknown,
  location: (_param, text) => JSON.parse(text) as unknown,
  array: readArray
}

/**
A stored string read by its declared type.
*/
function readAs(param: PluginParameter, text: string): unknown {
  if (isNumeric(param.type)) return Number(text)
  const read = READ[param.type]
  return read === undefined ? text : read(param, text)
}

// What a number or JSON value left empty means: not set, so the default; with no default
// either, the empty value of its type.
const UNSET: Partial<Record<ParamType, string>> = {
  struct: '{}',
  array: '[]',
  location: '{"mapId":"0","x":"0","y":"0"}'
}

/**
What a plugin should compute for `stored`: the stored text read by its type; with the key
absent, or a number or JSON value stored empty, the header's default read the same way.
Text types keep an empty value: the user set it.
*/
function expectedValue(param: PluginParameter, stored: string | undefined): unknown {
  const isUnset =
    stored === undefined || (stored === '' && (isNumeric(param.type) || isJson(param.type)))
  let text = isUnset ? defaultText(param) : stored
  if (text === '' && isJson(param.type)) text = UNSET[param.type] ?? text
  try {
    return readAs(param, text)
  } catch (error) {
    return `unreadable: ${String(error)}`
  }
}

// --- Observation -----------------------------------------------------------------------------

const OBSERVED = '__mzConformanceObserved'
const RAW_MODE_REGIONS: readonly [string, string][] = [
  ['// --- New parameters (added by MZ Plugin Studio) ---', '// --- End new parameters ---'],
  ['// --- New commands (added by MZ Plugin Studio) ---', '// --- End new commands ---']
]

export interface Observation {
  code: string
  insertions: { at: number; text: string }[]
  /**
  Keys the observed constants read, in order.
  */
  parameterKeys: string[]
  /**
  Command names the observed code registers, in order.
  */
  commandNames: string[]
}

const isList = (value: unknown): value is readonly unknown[] => Array.isArray(value)

const isNode = (value: unknown): value is AnyNode =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as { type?: unknown }).type === 'string'

function children(node: AnyNode): AnyNode[] {
  const found: AnyNode[] = []
  const values: unknown[] = Object.values(node)
  for (const value of values) {
    if (isList(value)) found.push(...value.filter(isNode))
    else if (isNode(value)) found.push(value)
  }
  return found
}

/**
The key of the first `<object>['key']` read in `node`, when `object` is a name `accepts`.
*/
function readKey(node: AnyNode, isAccepted: (object: string) => boolean): string | null {
  if (
    node.type === 'MemberExpression' &&
    node.computed &&
    node.object.type === 'Identifier' &&
    isAccepted(node.object.name) &&
    node.property.type === 'Literal' &&
    typeof node.property.value === 'string'
  ) {
    return node.property.value
  }
  for (const child of children(node)) {
    const key = readKey(child, isAccepted)
    if (key !== null) return key
  }
  return null
}

/**
`const name = …<object>['key']…` declarations among `statements`.
*/
function readingConstants(
  statements: readonly AnyNode[],
  isAccepted: (object: string) => boolean,
  isInScope: (node: AnyNode) => boolean
): { name: string; key: string; end: number }[] {
  const found: { name: string; key: string; end: number }[] = []
  for (const statement of statements) {
    if (
      statement.type !== 'VariableDeclaration' ||
      statement.kind !== 'const' ||
      !isInScope(statement)
    )
      continue
    for (const declarator of statement.declarations) {
      if (declarator.id.type !== 'Identifier' || !declarator.init) continue
      const key = readKey(declarator.init, isAccepted)
      if (key !== null) found.push({ name: declarator.id.name, key, end: statement.end })
    }
  }
  return found
}

const recordedConstant = (constant: { name: string; key: string }): string =>
  `[${JSON.stringify(constant.key)}, typeof ${constant.name}, ${constant.name}]`

const record = (
  where: string,
  command: string | null,
  constants: { name: string; key: string }[]
): string =>
  `;globalThis.${OBSERVED}.push([${JSON.stringify(where)}, ${JSON.stringify(command)}, this, ` +
  `JSON.stringify([${constants.map((constant) => recordedConstant(constant)).join(', ')}])]);`

/**
The object and method names of a call `<object>.<method>(…)` or `<object>[<method>](…)`, when
both are plain names.
*/
function calleeNames(
  node: AnyNode
): { object: string; method: string; isComputed: boolean } | null {
  if (
    node.type !== 'CallExpression' ||
    node.callee.type !== 'MemberExpression' ||
    node.callee.object.type !== 'Identifier' ||
    node.callee.property.type !== 'Identifier'
  ) {
    return null
  }
  return {
    object: node.callee.object.name,
    method: node.callee.property.name,
    isComputed: node.callee.computed
  }
}

/**
The name and body of a `PluginManager.registerCommand(…, 'name', function () {…})` call.
*/
function registeredCommand(node: AnyNode): { name: string; body: AnyNode[]; end: number } | null {
  if (node.type !== 'CallExpression') return null
  const callee = calleeNames(node)
  if (
    callee?.object !== 'PluginManager' ||
    callee.method !== 'registerCommand' ||
    callee.isComputed
  ) {
    return null
  }
  const name = node.arguments.at(1)
  const callback = node.arguments.at(2)
  return name?.type === 'Literal' &&
    typeof name.value === 'string' &&
    (callback?.type === 'FunctionExpression' || callback?.type === 'ArrowFunctionExpression') &&
    callback.body.type === 'BlockStatement'
    ? { name: name.value, body: callback.body.body, end: callback.body.end }
    : null
}

/**
Inserts statements that record what the plugin computed: after its parameter constants, and
at the end of each command it registers. Raw mode output is observed only where the app
added code; the rest is the file's own. The code is otherwise unchanged.
*/
export function observe(code: string, kind: ConformanceCase['kind']): Observation {
  const regions: [number, number][] = []
  if (kind === 'raw-mode') {
    for (const [open, close] of RAW_MODE_REGIONS) {
      const start = code.indexOf(open)
      if (start !== -1) regions.push([start, code.indexOf(close, start)])
    }
  } else {
    regions.push([0, code.length])
  }
  const isInScope = (node: AnyNode): boolean =>
    regions.some(([start, end]) => node.start >= start && node.end <= end)
  const isParameterObject = (name: string): boolean => kind === 'raw-mode' || name === 'params'
  const observation: Observation = { code, insertions: [], parameterKeys: [], commandNames: [] }

  const visit = (node: AnyNode): void => {
    const command = isInScope(node) ? registeredCommand(node) : null
    if (command !== null) {
      const constants = readingConstants(command.body, (o) => o === 'args', isInScope)
      observation.commandNames.push(command.name)
      observation.insertions.push({
        at: command.end - 1,
        text: record('command', command.name, constants)
      })
      return
    }
    if (node.type === 'Program' || node.type === 'BlockStatement') {
      const constants = readingConstants(node.body, isParameterObject, isInScope)
      const last = constants.at(-1)
      if (last !== undefined) {
        observation.parameterKeys.push(...constants.map((c) => c.key))
        observation.insertions.push({
          at: last.end,
          text: record('parameters', null, constants)
        })
      }
    }
    for (const child of children(node)) visit(child)
  }
  visit(parse(code, { ecmaVersion: 'latest', sourceType: 'script' }))

  let observed = code
  const latestFirst = observation.insertions.toSorted((a, b) => b.at - a.at)
  for (const { at, text } of latestFirst) {
    observed = observed.slice(0, at) + text + observed.slice(at)
  }
  observation.code = observed
  return observation
}

/**
The observed code with every inserted statement taken out again.
*/
export function unobserve(observation: Observation): string {
  // In ascending order each statement starts at its own offset once those before it are gone
  let code = observation.code
  const earliestFirst = observation.insertions.toSorted((a, b) => a.at - b.at)
  for (const { at, text } of earliestFirst) {
    code = code.slice(0, at) + code.slice(at + text.length)
  }
  return code
}

// --- Runner ------------------------------------------------------------------------------------

type Recorded = [string, string | null, unknown, string]

interface LoadedCase {
  runtime: MzRuntime
  errors: string[]
  /**
  Observed parameter constants: [key, typeof, value].
  */
  parameters: [string, string, unknown][]
}

const stemOf = (fileName: string): string => fileName.replace(/\.js$/i, '')
const swapCase = (text: string): string =>
  Array.from(text, (c) => (c === c.toLowerCase() ? c.toUpperCase() : c.toLowerCase())).join('')
const show = (value: unknown): string => (value === undefined ? 'undefined' : JSON.stringify(value))
const commandKey = (stem: string, name: string): string => show(`${stem}:${name}`)
const UNDECLARED_COMMAND = 'UndeclaredCommand'

/**
Whether `validatePlugin` refuses the plugin's name as not being an identifier.
*/
function isPluginNameRefused(definition: PluginDefinition): boolean {
  return validatePlugin(definition).errors.some((error) => error.startsWith('Plugin name must be'))
}

/**
Command names `validatePlugin` refuses as not being identifiers.
*/
export function refusedCommandNames(definition: PluginDefinition): Set<string> {
  const errors = new Set(validatePlugin(definition).errors)
  return new Set(
    definition.commands
      .map((command) => command.name)
      .filter((name) => errors.has(`Invalid command name: ${name} (must be valid identifier)`))
  )
}

/**
The plugin name a file's code passes to its first `PluginManager.parameters(…)`, as a string
or a constant holding one; null when it is neither.
*/
function ownParametersName(code: string): string | null {
  const program = parse(code, { ecmaVersion: 'latest', sourceType: 'script' })
  const literals = new Map<string, string>()
  let argument: AnyNode | null = null
  const visit = (node: AnyNode): void => {
    if (
      node.type === 'VariableDeclarator' &&
      node.id.type === 'Identifier' &&
      node.init?.type === 'Literal' &&
      typeof node.init.value === 'string'
    ) {
      literals.set(node.id.name, node.init.value)
    }
    if (argument === null && node.type === 'CallExpression' && node.arguments.length > 0) {
      const callee = calleeNames(node)
      if (callee?.object === 'PluginManager' && callee.method === 'parameters') {
        argument = node.arguments.at(0) ?? null
      }
    }
    for (const child of children(node)) visit(child)
  }
  visit(program)
  const found = argument as AnyNode | null
  if (found?.type === 'Literal' && typeof found.value === 'string') return found.value
  if (found?.type === 'Identifier') return literals.get(found.name) ?? null
  return null
}

const isRecorded = (value: unknown): value is Recorded =>
  isList(value) &&
  value.length === 4 &&
  typeof value[0] === 'string' &&
  (value[1] === null || typeof value[1] === 'string') &&
  typeof value[3] === 'string'

const isObservedConstant = (value: unknown): value is [string, string, unknown] =>
  isList(value) &&
  value.length === 3 &&
  typeof value[0] === 'string' &&
  typeof value[1] === 'string'

/**
A copy of `value`, a list each of whose items `isItem` accepts; throws on any other shape.
*/
function listOf<T>(value: unknown, isItem: (item: unknown) => item is T, what: string): T[] {
  if (!isList(value)) throw new TypeError(`${what} is not a list`)
  const items: T[] = []
  for (const item of value) {
    if (!isItem(item)) throw new TypeError(`${what} holds a malformed item`)
    items.push(item)
  }
  return items
}

/**
The calls the observed code recorded so far.
*/
const recorded = (runtime: MzRuntime): Recorded[] =>
  listOf(runtime.context[OBSERVED], isRecorded, OBSERVED)

/**
The constants one recorded call observed: [key, typeof, value].
*/
const observedConstants = (json: string): [string, string, unknown][] =>
  listOf(JSON.parse(json), isObservedConstant, json)

function loadCase(
  createRuntime: () => MzRuntime,
  stem: string,
  code: string,
  parameters: Record<string, string>
): LoadedCase {
  const runtime = createRuntime()
  // eslint-disable-next-line sonarjs/code-eval -- seeds the observation list in the test runtime context
  new Script(`globalThis.${OBSERVED} = [];`).runInContext(runtime.context)
  const report = runtime.load(
    [{ name: stem, status: true, description: '', parameters }],
    new Map([[`js/plugins/${stem}.js`, code]])
  )
  const observed = recorded(runtime).filter(([where]) => where === 'parameters')
  return {
    runtime,
    errors: report.errors.map((error) => `${error.name}: ${error.message}`),
    parameters: observed.flatMap((call) => observedConstants(call[3]))
  }
}

/**
Runs a command; a command that throws was found and ran.
*/
function run(
  loaded: LoadedCase,
  stem: string,
  command: string,
  args: Record<string, string>
): { ran: boolean; calls: Recorded[] } {
  const before = recorded(loaded.runtime).length
  let isRan: boolean
  try {
    isRan = loaded.runtime.runCommand([stem, command, command, args])
  } catch {
    isRan = true
  }
  return { ran: isRan, calls: recorded(loaded.runtime).slice(before) }
}

class CaseRun {
  private readonly exempted = new Set<string>()
  private readonly seen: Set<string>
  readonly trace: string[] = []
  /**
  Keys read by code no header can declare: raw mode's additions to a file with no main block.
  */
  undeclaredKeysExempt = false
  readonly c: ConformanceCase
  readonly report: ConformanceReport

  constructor(c: ConformanceCase, report: ConformanceReport, seen: Set<string>) {
    this.c = c
    this.report = report
    this.seen = seen
  }

  private undeclaredKey(where: string, key: string): void {
    if (this.undeclaredKeysExempt) {
      this.exempt('noMainBlock', key)
      return
    }
    this.addFinding(
      'header-code-differ',
      `${where} reads ${show(key)}, which the header does not declare`
    )
  }

  private compareValue(
    where: string,
    set: ValueSetName,
    param: PluginParameter,
    storedText: string | undefined,
    [type, value]: [string, unknown]
  ): void {
    this.report.counts.values++
    this.report.counts.types.add(param.type)
    const expected = expectedValue(param, storedText)
    if (type === typeof expected && show(value) === show(expected)) return
    const what = `${where}: expected ${show(expected)}, read ${type} ${show(value)}`
    if (set === 'absent') this.addFinding('header-code-differ', `default of ${what}`)
    else if (expected === '' && storedText === '') this.addFinding('empty-string-replaced', what)
    else this.addFinding('value', `${set}: ${what}`)
  }

  /**
  Counts one exemption of `what` under `rule`, once per case.
  */
  exempt(rule: keyof ConformanceReport['counts']['exempt'], what: string): void {
    if (this.exempted.has(`${rule}|${what}`)) return
    this.exempted.add(`${rule}|${what}`)
    this.report.counts.exempt[rule]++
  }

  addFinding(kind: ConformanceKind, detail: string): void {
    const key = `${this.c.id}|${kind}|${detail}`
    if (this.seen.has(key)) return
    this.seen.add(key)
    this.report.findings.push({ caseId: this.c.id, kind, detail })
  }

  /**
  Compares observed constants with what the header declares for `stored`.
  */
  compare(
    where: string,
    set: ValueSetName,
    declared: readonly PluginParameter[],
    stored: Record<string, string>,
    observed: [string, string, unknown][]
  ): void {
    for (const [key, type, value] of observed) {
      const param = declared.find((p) => p.name === key)
      this.trace.push(`${set} ${where} ${show(key)} ${type} ${show(value)}`)
      if (param === undefined) {
        this.undeclaredKey(where, key)
        continue
      }
      if (this.c.hostile === true) {
        this.exempt('hostileValues', `${where} ${key}`)
        continue
      }
      this.compareValue(`${where} ${show(key)}`, set, param, stored[key], [type, value])
    }
  }
}

interface CommandHeader {
  name: string
  args: readonly PluginParameter[]
}

/**
One load of a case under one value set, as its commands run against it.
*/
interface SetLoad {
  run_: CaseRun
  loaded: LoadedCase
  stem: string
  set: ValueSetName
  structs: readonly PluginStruct[]
}

/**
Command names the app refuses, as the header line holds them, and which header names belong
to no accepted command.
*/
function refusedHeaderNames(definition: PluginDefinition): {
  refused: Set<string>
  isReadOfRefused: (name: string) => boolean
} {
  const refused = new Set([...refusedCommandNames(definition)].map((name) => annotationText(name)))
  const accepted = new Set(
    definition.commands
      .map((command) => annotationText(command.name))
      .filter((n) => !refused.has(n))
  )
  return { refused, isReadOfRefused: (name) => refused.size > 0 && !accepted.has(name) }
}

function runGeneratedCommand(
  load: SetLoad,
  command: CommandHeader,
  observation: Observation,
  isReadOfRefused: (name: string) => boolean
): void {
  const { run_, loaded, stem, set } = load
  const args = valueSet(set, command.args, load.structs)
  const result = run(loaded, stem, command.name, args)
  run_.trace.push(`${set} run ${show(command.name)} ${String(result.ran)}`)
  if (!result.ran) {
    if (observation.commandNames.includes(command.name)) {
      run_.addFinding('command-keys', `${commandKey(stem, command.name)} is not registered`)
    } else if (isReadOfRefused(command.name)) {
      run_.exempt('commandNames', `header ${command.name}`)
    } else {
      run_.addFinding(
        'header-code-differ',
        `header declares ${show(command.name)}, which the code does not register`
      )
    }
    return
  }
  run_.report.counts.commands++
  for (const call of result.calls) {
    const isInterpreter = call[2] === loaded.runtime.interpreter
    run_.trace.push(`${set} this ${show(command.name)} ${String(isInterpreter)}`)
    if (!isInterpreter)
      run_.addFinding('callback-this', `${show(command.name)} runs without the interpreter as this`)
    const observed = observedConstants(call[3])
    run_.compare(`argument of ${show(command.name)}`, set, command.args, args, observed)
  }
}

function runGenerated(createRuntime: () => MzRuntime, run_: CaseRun): void {
  const { c, report } = run_
  const header = PluginParser.parsePlugin(c.code, c.fileName)
  const observation = observe(c.code, c.kind)
  const stem = stemOf(c.fileName)
  const declaredCommands = new Set(header.commands.map((command) => command.name))
  // A command name the app refuses (validatePlugin's identifier rule) is read from the header in
  // a way MZ's own reading is not known to share, so neither it nor its header reading is
  // compared: the header names that belong to no accepted command. Names are compared as the
  // header line holds them, which is also what the code registers.
  const { refused, isReadOfRefused } = refusedHeaderNames(c.definition)
  for (const name of observation.commandNames) {
    if (refused.has(name)) {
      run_.exempt('commandNames', name)
    } else if (!declaredCommands.has(name)) {
      run_.addFinding(
        'header-code-differ',
        `code registers ${show(name)}, which the header does not declare`
      )
    }
  }
  for (const set of VALUE_SETS) {
    const stored = valueSet(set, header.parameters, header.structs)
    const loaded = loadCase(createRuntime, stem, observation.code, stored)
    report.counts.loads++
    for (const error of loaded.errors) run_.addFinding('load-error', error)
    run_.compare('parameter', set, header.parameters, stored, loaded.parameters)
    const load: SetLoad = { run_, loaded, stem, set, structs: header.structs }
    for (const command of header.commands) {
      runGeneratedCommand(load, command, observation, isReadOfRefused)
    }
    const undeclared = run(loaded, stem, UNDECLARED_COMMAND, {})
    if (undeclared.ran) run_.addFinding('command-keys', `${show(UNDECLARED_COMMAND)} ran`)
  }
  renames(createRuntime, run_, observation, header)
}

/**
A value of `param` that differs from what an absent key reads.
*/
function distinctValue(param: PluginParameter, structs: readonly PluginStruct[]): string {
  if (isNumeric(param.type)) return '7'
  if (param.type === 'boolean') return param.default === true ? 'false' : 'true'
  if (isJson(param.type)) return editedValue(param, structs)
  return 'distinct'
}

const readsOf = (loaded: LoadedCase): string => show(loaded.parameters)

/**
Loads the plugin under its case-swapped file name and under another name, and records
whether the commands it registers still run and whether it still reads its parameters,
stored under the names its header declares, as MZ stores them.
*/
function renames(
  createRuntime: () => MzRuntime,
  run_: CaseRun,
  observation: Observation,
  header: PluginDefinition
): void {
  const { c, report } = run_
  const stem = stemOf(c.fileName)
  const stored = Object.fromEntries(
    header.parameters
      .filter((p) => observation.parameterKeys.includes(p.name))
      .map((p) => [p.name, distinctValue(p, header.structs)])
  )
  const runs = (loaded: LoadedCase, as: string): string[] =>
    observation.commandNames.filter((name) => run(loaded, as, name, {}).ran)
  const proper = loadCase(createRuntime, stem, observation.code, stored)
  const unset = loadCase(createRuntime, stem, observation.code, {})
  report.counts.loads += 2
  const hasParameters = observation.parameterKeys.length > 0
  if (hasParameters && readsOf(proper) === readsOf(unset)) {
    throw new Error(
      `${c.id}: stored parameters read the same as none; the rename check cannot tell`
    )
  }
  const ranProperly = runs(proper, stem)
  const hasCommands = ranProperly.length > 0
  if (!hasCommands && !hasParameters) return
  for (const [rename, as] of [
    ['case-swap', swapCase(stem)],
    ['other-name', `Renamed_${stem}`]
  ] as const) {
    const loaded = loadCase(createRuntime, as, observation.code, stored)
    report.counts.loads += 1
    const ran = runs(loaded, as)
    const result: RenameResult = {
      caseId: c.id,
      rename,
      fileName: `${as}.js`,
      hasCommands,
      hasParameters,
      commandsLost: ranProperly.some((name) => !ran.includes(name)),
      parametersLost: hasParameters && readsOf(loaded) !== readsOf(proper)
    }
    report.renames.push(result)
    run_.trace.push(`rename ${rename} ${show(result)}`)
  }
}

function runRawModeCommands(
  load: SetLoad,
  commands: readonly CommandHeader[],
  ran: Set<string>
): void {
  const { run_, loaded, stem, set } = load
  for (const command of commands) {
    const args = valueSet(set, command.args, load.structs)
    const result = run(loaded, stem, command.name, args)
    run_.trace.push(`${set} run ${show(command.name)} ${String(result.ran)}`)
    if (result.ran) {
      ran.add(command.name)
      run_.report.counts.commands++
    }
    for (const call of result.calls) {
      if (call[2] !== loaded.runtime.interpreter) {
        run_.addFinding(
          'callback-this',
          `${show(command.name)} runs without the interpreter as this`
        )
      }
      const observed = observedConstants(call[3])
      run_.compare(`argument of ${show(command.name)}`, set, command.args, args, observed)
    }
  }
}

function runRawMode(
  createRuntime: () => MzRuntime,
  run_: CaseRun,
  ranUnedited: ReadonlySet<string> | undefined
): Set<string> {
  const { c, report } = run_
  const header = PluginParser.parsePlugin(c.code, c.fileName)
  const observation = observe(c.code, c.kind)
  // A file whose own code reads its parameters under another name is loaded under that name,
  // the only one under which its code finds them; events still call its commands by file name
  const stem = stemOf(c.fileName)
  let loadName = stem
  const ownName = ownParametersName(c.code)
  if (ownName !== null && ownName !== stem) {
    run_.exempt('ownName', c.id)
    loadName = ownName
  }
  run_.undeclaredKeysExempt = findAnnotationBlocks(c.code).every((b) => b.kind !== 'main')
  const ran = new Set<string>()
  for (const set of VALUE_SETS) {
    const stored = valueSet(set, header.parameters, header.structs)
    const loaded = loadCase(createRuntime, loadName, observation.code, stored)
    report.counts.loads++
    for (const error of loaded.errors) run_.addFinding('load-error', error)
    run_.compare('added parameter', set, header.parameters, stored, loaded.parameters)
    // An added command the header could not declare (no main block) is still run by its name
    const undeclared = observation.commandNames
      .filter((name) => header.commands.every((command) => command.name !== name))
      .map((name): CommandHeader => ({ name, args: [] }))
    const load: SetLoad = { run_, loaded, stem, set, structs: header.structs }
    runRawModeCommands(load, [...header.commands, ...undeclared], ran)
  }
  const declared = new Set(header.commands.map((command) => command.name))
  const ranBefore = ranUnedited ?? new Set<string>()
  for (const name of ranBefore) {
    if (declared.has(name) && !ran.has(name)) {
      run_.addFinding(
        'command-keys',
        `${commandKey(stem, name)} ran before the edit and no longer does`
      )
    }
  }
  for (const name of observation.commandNames) {
    if (!ran.has(name))
      run_.addFinding('command-keys', `added ${commandKey(stem, name)} does not run`)
  }
  return ran
}

/**
Runs every case on a fresh runtime per load and reports what does not conform.
*/
export function runConformance(
  createRuntime: () => MzRuntime,
  cases: readonly ConformanceCase[]
): ConformanceReport {
  const report: ConformanceReport = {
    findings: [],
    renames: [],
    traces: {},
    counts: {
      plugins: cases.length,
      generated: cases.filter((c) => c.kind === 'generated').length,
      renamedName: cases.filter((c) => c.renamedFrom !== undefined).length,
      rawMode: cases.filter((c) => c.kind === 'raw-mode').length,
      loads: 0,
      commands: 0,
      values: 0,
      types: new Set(),
      exempt: { commandNames: 0, hostileValues: 0, noMainBlock: 0, ownName: 0 }
    }
  }
  const seen = new Set<string>()
  const ranUnedited = new Map<string, Set<string>>()
  for (const c of cases) {
    const caseRun = new CaseRun(c, report, seen)
    if (c.kind === 'generated') {
      runGenerated(createRuntime, caseRun)
    } else {
      const ran = runRawMode(createRuntime, caseRun, ranUnedited.get(c.fileName))
      if (c.id.endsWith('.none')) ranUnedited.set(c.fileName, ran)
    }
    report.traces[c.id] = caseRun.trace
  }
  return report
}
