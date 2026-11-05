// Runs every plugin the generator writes, and every file raw mode writes back, through an
// `MzRuntime`, and reports where the plugin does not behave as RPG Maker MZ's rules say: it
// must load, register its commands under its own file name, run them with the interpreter as
// `this`, and read each stored parameter and argument as its header declares it.
import { parse } from 'acorn'
import type { AnyNode } from 'acorn'
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
import { ID_BASED_PARAM_TYPES, toBaseline } from '../../src/shared/types/plugin'
import type {
  ParamType,
  PluginDefinition,
  PluginParameter,
  PluginStruct
} from '../../src/shared/types/plugin'
import { GENERATOR_ENTRIES } from '../golden/corpus/generator'
import { EDITS, fixturePlugins, loadFixture } from '../golden/corpus/raw-mode'
import type { MzRuntime } from './mz-runtime'

export interface ConformanceCase {
  id: string
  /** The file the app saves the plugin to, and so the name MZ knows it by. */
  fileName: string
  code: string
  kind: 'generated' | 'raw-mode'
  definition: PluginDefinition
  /** The entry's own plugin name, when it is not a file name and the case runs under another. */
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

/** A generated plugin loaded under another file name, and what it lost there. */
export interface RenameResult {
  caseId: string
  rename: 'case-swap' | 'other-name'
  /** The file name it was loaded under. */
  fileName: string
  hasCommands: boolean
  hasParameters: boolean
  commandsLost: boolean
  parametersLost: boolean
}

export interface ConformanceReport {
  findings: ConformanceFinding[]
  renames: RenameResult[]
  /** What each case did, line by line: identical traces mean identical behaviour. */
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
    /** What the rules below leave out, each counted where it applies. */
    exempt: {
      /** Commands whose name the app refuses, so header and code need not agree on it. */
      commandNames: number
      /** Values of hostile entries, not compared. */
      hostileValues: number
      /** Parameters raw mode added to a file with no main block, which no header can declare. */
      noMainBlock: number
      /** Raw-mode cases loaded under the name the file's own code reads its parameters with. */
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
    let def = entry.def
    let renamedFrom: string | undefined
    if (isPluginNameRefused(def)) {
      renamedFrom = def.meta.name
      const { importedFrom: _importedFrom, ...rest } = def
      def = { ...rest, meta: { ...def.meta, name: `Hostile_${++renamed}` } }
    }
    cases.push({
      id: `generator:${entry.name}`,
      fileName: saveFileName(def),
      code: generatePlugin(def),
      kind: 'generated',
      definition: def,
      ...(renamedFrom !== undefined && { renamedFrom }),
      ...(entry.name.startsWith('hostile-') && { hostile: true })
    })
  }
  for (const file of fixturePlugins()) {
    const opened = loadFixture(file)
    for (const edit of EDITS) {
      const def = edit.apply(opened)
      cases.push({
        id: `raw-mode:${file.replace(/\.js$/, '')}.${edit.name}`,
        fileName: file,
        code: generateRawMode(def, toBaseline(opened)),
        kind: 'raw-mode',
        definition: def
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

/** The header's `@default` text, as the editor stores it for a value the user never changed. */
const defaultText = (param: PluginParameter): string => String(param.default ?? '')

function structValue(name: string | undefined, structs: readonly PluginStruct[]): string {
  const fields = structs.find((s) => s.name === name)?.parameters ?? []
  return JSON.stringify(Object.fromEntries(fields.map((f) => [f.name, `${f.name} value`])))
}

/** A value the user set: empty for text, zero for numbers, the other boolean, filled JSON. */
function editedValue(param: PluginParameter, structs: readonly PluginStruct[]): string {
  if (isNumeric(param.type)) return '0'
  switch (param.type) {
    case 'boolean': {
      return defaultText(param) === 'true' ? 'false' : 'true'
    }
    case 'struct': {
      return structValue(param.structType, structs)
    }
    case 'location': {
      return '{"mapId":"2","x":"3","y":"4"}'
    }
    case 'array': {
      if (param.arrayType === 'struct') {
        const item = structValue(param.structType, structs)
        return JSON.stringify([item, item])
      }
      if (isNumeric(param.arrayType)) return '["4","5"]'
      if (param.arrayType === 'boolean') return '["true","false"]'
      return '["a","b"]'
    }
    default: {
      return ''
    }
  }
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
    params.filter((p) => readsAsType(p, defaultText(p))).map((p) => [p.name, defaultText(p)])
  )
}

function readsAsType(param: PluginParameter, text: string): boolean {
  if (text === '') return true
  try {
    readAs(param, text)
    return true
  } catch {
    return false
  }
}

/** A stored string read by its declared type. */
function readAs(param: PluginParameter, text: string): unknown {
  if (isNumeric(param.type)) return Number(text)
  switch (param.type) {
    case 'boolean': {
      return text === 'true'
    }
    case 'struct':
    case 'location': {
      return JSON.parse(text)
    }
    case 'array': {
      const items = JSON.parse(text) as string[]
      if (param.arrayType === 'struct') return items.map((s) => JSON.parse(s) as unknown)
      if (isNumeric(param.arrayType)) return items.map(Number)
      if (param.arrayType === 'boolean') return items.map((v) => v === 'true')
      return items
    }
    default: {
      return text
    }
  }
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
  /** Keys the observed constants read, in order. */
  parameterKeys: string[]
  /** Command names the observed code registers, in order. */
  commandNames: string[]
}

const isNode = (value: unknown): value is AnyNode =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as { type?: unknown }).type === 'string'

function children(node: AnyNode): AnyNode[] {
  const found: AnyNode[] = []
  for (const value of Object.values(node)) {
    if (Array.isArray(value)) found.push(...value.filter(isNode))
    else if (isNode(value)) found.push(value)
  }
  return found
}

/** The key of the first `<object>['key']` read in `node`, when `object` is a name `accepts`. */
function readKey(node: AnyNode, accepts: (object: string) => boolean): string | null {
  if (
    node.type === 'MemberExpression' &&
    node.computed &&
    node.object.type === 'Identifier' &&
    accepts(node.object.name) &&
    node.property.type === 'Literal' &&
    typeof node.property.value === 'string'
  ) {
    return node.property.value
  }
  for (const child of children(node)) {
    const key = readKey(child, accepts)
    if (key !== null) return key
  }
  return null
}

/** `const name = …<object>['key']…` declarations among `statements`. */
function readingConstants(
  statements: readonly AnyNode[],
  accepts: (object: string) => boolean,
  inScope: (node: AnyNode) => boolean
): { name: string; key: string; end: number }[] {
  const found: { name: string; key: string; end: number }[] = []
  for (const statement of statements) {
    if (statement.type !== 'VariableDeclaration' || statement.kind !== 'const') continue
    if (!inScope(statement)) continue
    for (const declarator of statement.declarations) {
      if (declarator.id.type !== 'Identifier' || declarator.init == null) continue
      const key = readKey(declarator.init, accepts)
      if (key !== null) found.push({ name: declarator.id.name, key, end: statement.end })
    }
  }
  return found
}

const record = (
  where: string,
  command: string | null,
  constants: { name: string; key: string }[]
): string =>
  `;globalThis.${OBSERVED}.push([${JSON.stringify(where)}, ${JSON.stringify(command)}, this, ` +
  `JSON.stringify([${constants.map((c) => `[${JSON.stringify(c.key)}, typeof ${c.name}, ${c.name}]`).join(', ')}])]);`

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
  const inScope = (node: AnyNode): boolean =>
    regions.some(([start, end]) => node.start >= start && node.end <= end)
  const parameterObject = (name: string): boolean => kind === 'raw-mode' || name === 'params'
  const observation: Observation = { code, insertions: [], parameterKeys: [], commandNames: [] }

  const visit = (node: AnyNode): void => {
    if (
      node.type === 'CallExpression' &&
      node.callee.type === 'MemberExpression' &&
      !node.callee.computed &&
      node.callee.object.type === 'Identifier' &&
      node.callee.object.name === 'PluginManager' &&
      node.callee.property.type === 'Identifier' &&
      node.callee.property.name === 'registerCommand' &&
      inScope(node)
    ) {
      const [, name, callback] = node.arguments
      if (
        name?.type === 'Literal' &&
        typeof name.value === 'string' &&
        (callback?.type === 'FunctionExpression' || callback?.type === 'ArrowFunctionExpression') &&
        callback.body.type === 'BlockStatement'
      ) {
        const constants = readingConstants(callback.body.body, (o) => o === 'args', inScope)
        observation.commandNames.push(name.value)
        observation.insertions.push({
          at: callback.body.end - 1,
          text: record('command', name.value, constants)
        })
        return
      }
    }
    if (node.type === 'Program' || node.type === 'BlockStatement') {
      const constants = readingConstants(node.body, parameterObject, inScope)
      if (constants.length > 0) {
        observation.parameterKeys.push(...constants.map((c) => c.key))
        observation.insertions.push({
          at: constants[constants.length - 1].end,
          text: record('parameters', null, constants)
        })
      }
    }
    for (const child of children(node)) visit(child)
  }
  visit(parse(code, { ecmaVersion: 'latest', sourceType: 'script' }))

  let observed = code
  for (const { at, text } of [...observation.insertions].sort((a, b) => b.at - a.at)) {
    observed = observed.slice(0, at) + text + observed.slice(at)
  }
  observation.code = observed
  return observation
}

/** The observed code with every inserted statement taken out again. */
export function unobserve(observation: Observation): string {
  // In ascending order each statement starts at its own offset once those before it are gone
  let code = observation.code
  for (const { at, text } of [...observation.insertions].sort((a, b) => a.at - b.at)) {
    code = code.slice(0, at) + code.slice(at + text.length)
  }
  return code
}

// --- Runner ------------------------------------------------------------------------------------

type Recorded = [string, string | null, unknown, string]

interface LoadedCase {
  runtime: MzRuntime
  errors: string[]
  /** Observed parameter constants: [key, typeof, value]. */
  parameters: [string, string, unknown][]
}

const stemOf = (fileName: string): string => fileName.replace(/\.js$/i, '')
const swapCase = (text: string): string =>
  [...text].map((c) => (c === c.toLowerCase() ? c.toUpperCase() : c.toLowerCase())).join('')
const show = (value: unknown): string => JSON.stringify(value) ?? 'undefined'
const UNDECLARED_COMMAND = 'UndeclaredCommand'

/**
Whether `validatePlugin` refuses the plugin's name as not being an identifier.
*/
function isPluginNameRefused(definition: PluginDefinition): boolean {
  return validatePlugin(definition).errors.some((error) => error.startsWith('Plugin name must be'))
}

/** Command names `validatePlugin` refuses as not being identifiers. */
export function refusedCommandNames(def: PluginDefinition): Set<string> {
  const errors = new Set(validatePlugin(def).errors)
  return new Set(
    def.commands
      .map((cmd) => cmd.name)
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
    if (
      argument === null &&
      node.type === 'CallExpression' &&
      node.callee.type === 'MemberExpression' &&
      node.callee.object.type === 'Identifier' &&
      node.callee.object.name === 'PluginManager' &&
      node.callee.property.type === 'Identifier' &&
      node.callee.property.name === 'parameters' &&
      node.arguments[0] !== undefined
    ) {
      argument = node.arguments[0]
    }
    for (const child of children(node)) visit(child)
  }
  visit(program)
  const found = argument as AnyNode | null
  if (found?.type === 'Literal' && typeof found.value === 'string') return found.value
  if (found?.type === 'Identifier') return literals.get(found.name) ?? null
  return null
}

function recorded(runtime: MzRuntime): Recorded[] {
  return runtime.context[OBSERVED] as Recorded[]
}

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
    errors: report.errors.map((e) => `${e.name}: ${e.message}`),
    parameters: observed.flatMap(([, , , json]) => JSON.parse(json) as [string, string, unknown][])
  }
}

/** Runs a command; a command that throws was found and ran. */
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
  readonly trace: string[] = []
  /** Keys read by code no header can declare: raw mode's additions to a file with no main block. */
  undeclaredKeysExempt = false
  private readonly exempted = new Set<string>()
  constructor(
    readonly c: ConformanceCase,
    readonly report: ConformanceReport,
    private readonly seen: Set<string>
  ) {}

  /** Counts one exemption of `what` under `rule`, once per case. */
  exempt(rule: keyof ConformanceReport['counts']['exempt'], what: string): void {
    if (this.exempted.has(`${rule}|${what}`)) return
    this.exempted.add(`${rule}|${what}`)
    this.report.counts.exempt[rule]++
  }

  find(kind: ConformanceKind, detail: string): void {
    const key = `${this.c.id}|${kind}|${detail}`
    if (this.seen.has(key)) return
    this.seen.add(key)
    this.report.findings.push({ caseId: this.c.id, kind, detail })
  }

  /** Compares observed constants with what the header declares for `stored`. */
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
        if (this.undeclaredKeysExempt) {
          this.exempt('noMainBlock', key)
          continue
        }
        this.find(
          'header-code-differ',
          `${where} reads ${show(key)}, which the header does not declare`
        )
        continue
      }
      if (this.c.hostile === true) {
        this.exempt('hostileValues', `${where} ${key}`)
        continue
      }
      this.report.counts.values++
      this.report.counts.types.add(param.type)
      const expected = expectedValue(param, stored[key])
      if (type === typeof expected && show(value) === show(expected)) continue
      const what = `${where} ${show(key)}: expected ${show(expected)}, read ${type} ${show(value)}`
      if (set === 'absent') this.find('header-code-differ', `default of ${what}`)
      else if (stored[key] === '' && expected === '') this.find('empty-string-replaced', what)
      else this.find('value', `${set}: ${what}`)
    }
  }
}

function runGenerated(createRuntime: () => MzRuntime, run_: CaseRun): void {
  const { c, report } = run_
  const header = PluginParser.parsePlugin(c.code, c.fileName)
  const observation = observe(c.code, c.kind)
  const stem = stemOf(c.fileName)
  const declaredCommands = new Set(header.commands.map((cmd) => cmd.name))
  // A command name the app refuses (validatePlugin's identifier rule) is read from the header in
  // a way MZ's own reading is not known to share, so neither it nor its header reading is
  // compared: the header names that belong to no accepted command. Names are compared as the
  // header line holds them, which is also what the code registers.
  const refused = new Set([...refusedCommandNames(c.definition)].map(annotationText))
  const accepted = new Set(
    c.definition.commands.map((cmd) => annotationText(cmd.name)).filter((n) => !refused.has(n))
  )
  const readOfRefused = (name: string): boolean => refused.size > 0 && !accepted.has(name)
  for (const name of observation.commandNames) {
    if (refused.has(name)) {
      run_.exempt('commandNames', name)
    } else if (!declaredCommands.has(name)) {
      run_.find(
        'header-code-differ',
        `code registers ${show(name)}, which the header does not declare`
      )
    }
  }
  for (const set of VALUE_SETS) {
    const stored = valueSet(set, header.parameters, header.structs)
    const loaded = loadCase(createRuntime, stem, observation.code, stored)
    report.counts.loads++
    for (const error of loaded.errors) run_.find('load-error', error)
    run_.compare('parameter', set, header.parameters, stored, loaded.parameters)
    for (const command of header.commands) {
      const args = valueSet(set, command.args, header.structs)
      const result = run(loaded, stem, command.name, args)
      run_.trace.push(`${set} run ${show(command.name)} ${result.ran}`)
      if (!result.ran) {
        if (observation.commandNames.includes(command.name)) {
          run_.find('command-keys', `${show(`${stem}:${command.name}`)} is not registered`)
        } else if (readOfRefused(command.name)) {
          run_.exempt('commandNames', `header ${command.name}`)
        } else {
          run_.find(
            'header-code-differ',
            `header declares ${show(command.name)}, which the code does not register`
          )
        }
        continue
      }
      report.counts.commands++
      for (const [, , self, json] of result.calls) {
        const isInterpreter = self === loaded.runtime.interpreter
        run_.trace.push(`${set} this ${show(command.name)} ${isInterpreter}`)
        if (!isInterpreter)
          run_.find('callback-this', `${show(command.name)} runs without the interpreter as this`)
        const observed = JSON.parse(json) as [string, string, unknown][]
        run_.compare(`argument of ${show(command.name)}`, set, command.args, args, observed)
      }
    }
    const undeclared = run(loaded, stem, UNDECLARED_COMMAND, {})
    if (undeclared.ran) run_.find('command-keys', `${show(UNDECLARED_COMMAND)} ran`)
  }
  renames(createRuntime, run_, observation, header)
}

/** A value of `param` that differs from what an absent key reads. */
function distinctValue(param: PluginParameter, structs: readonly PluginStruct[]): string {
  if (isNumeric(param.type)) return '7'
  if (param.type === 'boolean') return param.default === true ? 'false' : 'true'
  if (isJson(param.type)) return editedValue(param, structs)
  return 'distinct'
}

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
  const reads = (loaded: LoadedCase): string => show(loaded.parameters)
  const runs = (loaded: LoadedCase, as: string): string[] =>
    observation.commandNames.filter((name) => run(loaded, as, name, {}).ran)
  const proper = loadCase(createRuntime, stem, observation.code, stored)
  const unset = loadCase(createRuntime, stem, observation.code, {})
  report.counts.loads += 2
  const hasParameters = observation.parameterKeys.length > 0
  if (hasParameters && reads(proper) === reads(unset)) {
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
      parametersLost: hasParameters && reads(loaded) !== reads(proper)
    }
    report.renames.push(result)
    run_.trace.push(`rename ${rename} ${show(result)}`)
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
    for (const error of loaded.errors) run_.find('load-error', error)
    run_.compare('added parameter', set, header.parameters, stored, loaded.parameters)
    // An added command the header could not declare (no main block) is still run by its name
    const undeclared = observation.commandNames
      .filter((name) => header.commands.every((cmd) => cmd.name !== name))
      .map((name) => ({ name, args: [] as PluginParameter[] }))
    for (const command of [...header.commands, ...undeclared]) {
      const args = valueSet(set, command.args, header.structs)
      const result = run(loaded, stem, command.name, args)
      run_.trace.push(`${set} run ${show(command.name)} ${result.ran}`)
      if (result.ran) {
        ran.add(command.name)
        report.counts.commands++
      }
      for (const [, , self, json] of result.calls) {
        if (self !== loaded.runtime.interpreter) {
          run_.find('callback-this', `${show(command.name)} runs without the interpreter as this`)
        }
        const observed = JSON.parse(json) as [string, string, unknown][]
        run_.compare(`argument of ${show(command.name)}`, set, command.args, args, observed)
      }
    }
  }
  const declared = new Set(header.commands.map((cmd) => cmd.name))
  for (const name of ranUnedited ?? []) {
    if (declared.has(name) && !ran.has(name)) {
      run_.find('command-keys', `${show(`${stem}:${name}`)} ran before the edit and no longer does`)
    }
  }
  for (const name of observation.commandNames) {
    if (!ran.has(name)) run_.find('command-keys', `added ${show(`${stem}:${name}`)} does not run`)
  }
  return ran
}

/** Runs every case on a fresh runtime per load and reports what does not conform. */
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
