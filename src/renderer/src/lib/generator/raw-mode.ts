import type { PluginBaseline, PluginDefinition } from '../../types/plugin'
import { escapeJSString } from './escape'
import { generateHeader, generateStructDefinition } from './header'
import { generateAccessorParser, quotedAnnotationName, registrationLines } from './body'
import { camelCase } from './naming'
import {
  parseScript,
  type AnyNode,
  type ArrowFunctionExpression,
  type BlockStatement,
  type FunctionExpression,
  type Program
} from './parse'
import { findAnnotationBlocks, type AnnotationBlock } from '../../../../shared/annotation-blocks'

/**
Whether raw mode can rewrite the file's main annotation block (/*: or /*:en).
*/
export function hasMainBlock(source: string): boolean {
  return findAnnotationBlocks(source).some((b) => b.kind === 'main')
}

/**
A separator parameter only groups others in the MZ editor; no code reads it.
*/
const isSeparator = (name: string): boolean => name.includes('---') || name.includes('===')

/**
Raw mode had code to place in a file that does not parse as JavaScript.
*/
export class RawModeParseError extends Error {
  readonly parseError: string

  constructor(parseError: string) {
    super(`The file is not valid JavaScript: ${parseError}`)
    this.parseError = parseError
    this.name = 'RawModeParseError'
  }
}

const isNode = (value: unknown): value is AnyNode =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as { type?: unknown }).type === 'string'

function childNodes(node: AnyNode): AnyNode[] {
  const values: unknown[] = Object.values(node)
  return values.flat().filter(isNode)
}

/**
Adds every name the code declares or reads to `names`; property names and labels are not names.
*/
function collectNames(node: AnyNode, names: Set<string>): void {
  if (node.type === 'Identifier') {
    names.add(node.name)
    return
  }
  const notAName = nonNameChild(node)
  for (const child of childNodes(node)) if (child !== notAName) collectNames(child, names)
}

/**
The child of `node` that is a property name or a label rather than a name, if it has one.
*/
function nonNameChild(node: AnyNode): AnyNode | undefined {
  if (node.type === 'MemberExpression' && !node.computed) return node.property
  if (
    (node.type === 'Property' ||
      node.type === 'MethodDefinition' ||
      node.type === 'PropertyDefinition') &&
    !node.computed
  ) {
    return node.key
  }
  if (
    node.type === 'LabeledStatement' ||
    node.type === 'BreakStatement' ||
    node.type === 'ContinueStatement'
  ) {
    return node.label ?? undefined
  }
  return undefined
}

type CalledFunction = (FunctionExpression | ArrowFunctionExpression) & { body: BlockStatement }

const hasBlockBody = (
  callee: FunctionExpression | ArrowFunctionExpression
): callee is CalledFunction => callee.body.type === 'BlockStatement'

/**
The function a statement calls in place: `(function () {…})()`, `(function () {…}())`, `(() => {…})()`.
*/
function calledFunction(statement: AnyNode): CalledFunction | undefined {
  if (statement.type !== 'ExpressionStatement' || statement.expression.type !== 'CallExpression')
    return undefined
  const callee = statement.expression.callee
  if (callee.type !== 'FunctionExpression' && callee.type !== 'ArrowFunctionExpression')
    return undefined
  return hasBlockBody(callee) ? callee : undefined
}

/**
Whether the code calls `PluginManager.parameters`, outside the functions it defines.
*/
function doesReadParameters(node: AnyNode): boolean {
  if (
    node.type === 'CallExpression' &&
    node.callee.type === 'MemberExpression' &&
    !node.callee.computed &&
    node.callee.object.type === 'Identifier' &&
    node.callee.object.name === 'PluginManager' &&
    node.callee.property.type === 'Identifier' &&
    node.callee.property.name === 'parameters'
  ) {
    return true
  }
  if (
    node.type === 'FunctionExpression' ||
    node.type === 'ArrowFunctionExpression' ||
    node.type === 'FunctionDeclaration'
  ) {
    return false
  }
  return childNodes(node).some((child) => doesReadParameters(child))
}

function isPluginNameDeclaration(statement: AnyNode): boolean {
  const name = 'PLUGIN_NAME'
  return statement.type === 'VariableDeclaration'
    ? statement.declarations.some((d) => d.id.type === 'Identifier' && d.id.name === name)
    : (statement.type === 'FunctionDeclaration' || statement.type === 'ClassDeclaration') &&
        statement.id?.name === name
}

/**
Index `end`, or the start of the next line when only blanks or a line comment follow it.
*/
function afterNode(source: string, end: number): number {
  const lineEnd = source.indexOf('\n', end)
  const rest = source.slice(end, lineEnd === -1 ? source.length : lineEnd)
  if (!/^[ \t]*(?:\/\/.*)?\r?$/.test(rest)) return end
  return lineEnd === -1 ? source.length : lineEnd + 1
}

/**
Where raw mode puts code it adds to a file, read from the file's syntax tree.
*/
interface Placement {
  /**
  Start of the first top-level IIFE: a struct block without a block of its own goes there
  */
  iifeStart: number | undefined
  /**
  The body of the IIFE added code goes into; undefined for the script's top level
  */
  body: BlockStatement | undefined
  /**
  The variable the file reads its parameters into, and the end of its declaration
  */
  parameters: { name: string; end: number } | undefined
  /**
  Where code for added parameters goes when the file has no parameters variable
  */
  start: number
  /**
  The index from which the file's own `PLUGIN_NAME` holds its value in that scope
  */
  pluginNameFrom: number | undefined
  /**
  Every name the file declares or reads; a name added code declares is added here
  */
  names: Set<string>
}

/**
A statement of the script's top level or of a function body.
*/
type ScopeStatement = Program['body'][number]

/**
A top-level statement, with the function it calls in place if it calls one.
*/
interface StatementUnit {
  statement: ScopeStatement
  fn: CalledFunction | undefined
}

/**
A top-level statement that calls a function in place, with that function.
*/
interface CallUnit {
  statement: ScopeStatement
  fn: CalledFunction
}

/**
The first declaration in `scope` of a variable read from `PluginManager.parameters`.
*/
function parametersDeclaration(
  scope: readonly AnyNode[]
): { name: string; end: number } | undefined {
  for (const statement of scope) {
    if (statement.type !== 'VariableDeclaration') continue
    const declarator = statement.declarations.find(
      (d) =>
        d.id.type === 'Identifier' &&
        d.init !== null &&
        d.init !== undefined &&
        doesReadParameters(d.init)
    )
    if (declarator?.id.type === 'Identifier') {
      return { name: declarator.id.name, end: statement.end }
    }
  }
  return undefined
}

/**
The first declaration of the top level or of a top-level IIFE body reading the parameters,
with that IIFE.
*/
function findParameters(
  units: readonly StatementUnit[]
): { variable: { name: string; end: number }; call: CallUnit | undefined } | undefined {
  for (const unit of units) {
    const variable = parametersDeclaration(
      unit.fn === undefined ? [unit.statement] : unit.fn.body.body
    )
    if (variable !== undefined) {
      return {
        variable,
        call: unit.fn === undefined ? undefined : { statement: unit.statement, fn: unit.fn }
      }
    }
  }
  return undefined
}

/**
The script's syntax tree; a syntax error is raised as a RawModeParseError.
*/
function parseRawSource(source: string): Program {
  try {
    return parseScript(source)
  } catch (error) {
    if (error instanceof SyntaxError) throw new RawModeParseError(error.message)
    throw error
  }
}

/**
The index from which the file's own `PLUGIN_NAME` holds its value in the owner's scope: the end
of its declaration there, else the owner's body when the owner takes it as a parameter or an
earlier top-level statement declares it.
*/
function pluginNameStart(
  statements: readonly ScopeStatement[],
  own: ScopeStatement | undefined,
  owner: CallUnit | undefined
): number | undefined {
  if (own !== undefined) return own.end
  if (owner === undefined) return undefined
  const outer = statements.find((s) => isPluginNameDeclaration(s))
  const isParam = owner.fn.params.some((p) => p.type === 'Identifier' && p.name === 'PLUGIN_NAME')
  return isParam || (outer !== undefined && outer.end <= owner.statement.start)
    ? owner.fn.body.start
    : undefined
}

/**
Where code for added parameters goes in the owner's body: after its directives and its own
`PLUGIN_NAME`; the end of the file when there is no owner.
*/
function addedCodeStart(
  source: string,
  scope: readonly ScopeStatement[],
  owner: CallUnit | undefined,
  own: ScopeStatement | undefined
): number {
  if (owner === undefined) return source.length
  const directives = scope.filter(
    (s) => s.type === 'ExpressionStatement' && s.directive !== undefined
  )
  const start = afterNode(source, directives.at(-1)?.end ?? owner.fn.body.start + 1)
  return own === undefined ? start : Math.max(start, afterNode(source, own.end))
}

/**
Where added code goes: the parameters variable's scope, else the first IIFE, else the top level.
*/
function placementOf(source: string): Placement {
  const program = parseRawSource(source)
  const statements = program.body
  const units = statements.map((statement) => ({ statement, fn: calledFunction(statement) }))
  const firstCall = units.find((unit): unit is CallUnit => unit.fn !== undefined)
  const site = findParameters(units)
  const owner = site === undefined ? firstCall : site.call
  const scope = owner === undefined ? statements : owner.fn.body.body
  const own = scope.find((s) => isPluginNameDeclaration(s))

  const names = new Set<string>()
  collectNames(program, names)
  return {
    iifeStart: firstCall?.statement.start,
    body: owner?.fn.body,
    parameters: site?.variable,
    start: addedCodeStart(source, scope, owner, own),
    pluginNameFrom: pluginNameStart(statements, own, owner),
    names
  }
}

/**
`name`, suffixed with `_` until no name of the file uses it; then taken.
*/
function freeName(place: Placement, name: string): string {
  let free = name
  while (place.names.has(free)) free += '_'
  place.names.add(free)
  return free
}

/**
A replacement of [start, end) in the source; its text is built with \n.
*/
interface SourceEdit {
  start: number
  end: number
  text: string
}

/**
What raw mode's added code shares: the file, its placement (read from the syntax tree only when
code or a block is added), and the constant added code declares for the plugin name when the
file's own is out of reach, with whether it went into the IIFE body, where later added code can
read it too.
*/
interface AddedCode {
  source: string
  pluginName: string
  placement: () => Placement
  nameConstant: string | undefined
  isNameInBody: boolean
}

/**
Generate plugin output in "raw mode" for an imported plugin: the file's own text, with only
the annotation blocks whose content changed since `baseline` rewritten and code added only
for parameters and commands absent from `baseline`. Language blocks are never touched, the
file's line endings are kept, and an unedited plugin is written back byte for byte.
*/
export function generateRawMode(plugin: PluginDefinition, baseline: PluginBaseline): string {
  const source = plugin.rawSource
  if (source === undefined || source === '') {
    throw new Error('generateRawMode needs rawSource')
  }
  const blocks = findAnnotationBlocks(source)
  let parsed: Placement | undefined
  const added: AddedCode = {
    source,
    pluginName: plugin.meta.name || 'NewPlugin',
    placement: () => (parsed ??= placementOf(source)),
    nameConstant: undefined,
    isNameInBody: false
  }
  // In this order: parameter code may declare the plugin name constant command code reads
  const edits = [
    ...mainBlockEdits(plugin, baseline, source, blocks),
    ...structEdits(plugin, baseline, blocks, added),
    ...parameterEdits(plugin, baseline, added),
    ...commandEdits(plugin, baseline, added)
  ]
  return applyEdits(source, edits)
}

/**
A `@version` line in an annotation block.
*/
const VERSION_LINE = /^[^\S\r\n]*(?:\*[^\S\r\n]*)?@version(?!\S)/m

/**
The main block, rewritten when its rendering changed since `baseline`. It carries `@version`
when the file's block held one or the version was edited, so a file without the tag gains none.
*/
function mainBlockEdits(
  plugin: PluginDefinition,
  baseline: PluginBaseline,
  source: string,
  blocks: readonly AnnotationBlock[]
): SourceEdit[] {
  const main = blocks.find((b) => b.kind === 'main')
  if (main === undefined) return []
  const block = source.slice(main.start, main.end).replaceAll('\r\n', '\n')
  const isVersionShown = VERSION_LINE.test(block) || plugin.meta.version !== baseline.meta.version
  const header = generateHeader(plugin, undefined, true, isVersionShown)
  if (header === generateHeader(baseline, undefined, true, isVersionShown)) return []
  const preamble = extractHeaderPreamble(block)
  const rest = header.slice(header.indexOf('\n') + 1)
  return [{ start: main.start, end: main.end, text: `${main.opener}\n${preamble}${rest}` }]
}

/**
Struct blocks: a struct's own block (bare, else :en) is rewritten when its rendering changed;
translated blocks stay; a struct without its own block is added before the IIFE.
*/
function structEdits(
  plugin: PluginDefinition,
  baseline: PluginBaseline,
  blocks: readonly AnnotationBlock[],
  added: AddedCode
): SourceEdit[] {
  const { source } = added
  const edits: SourceEdit[] = []
  for (const struct of plugin.structs) {
    const text = generateStructDefinition(struct, undefined, true)
    const before = baseline.structs.find((s) => s.name === struct.name)
    if (before !== undefined && generateStructDefinition(before, undefined, true) === text) continue
    const own = blocks.filter((b) => b.kind === 'struct' && b.structName === struct.name)
    const block = own.find((b) => b.lang === '') ?? own.find((b) => b.lang === 'en')
    if (block === undefined) {
      const at = added.placement().iifeStart
      edits.push(
        at === undefined
          ? { start: source.length, end: source.length, text: `\n\n${text}` }
          : { start: at, end: at, text: `${text}\n\n` }
      )
    } else {
      edits.push({
        start: block.start,
        end: block.end,
        text: block.opener + text.slice(text.indexOf('\n'))
      })
    }
  }
  return edits
}

/**
How added code at `at` reads the plugin name: the file's `PLUGIN_NAME` when it holds its value
there, else the constant added code declares, with the line declaring it.
*/
function pluginNameAt(
  added: AddedCode,
  place: Placement,
  at: number
): { name: string; line?: string } {
  if (place.pluginNameFrom !== undefined && place.pluginNameFrom <= at)
    return { name: 'PLUGIN_NAME' }
  added.nameConstant ??= freeName(place, 'PLUGIN_NAME')
  return {
    name: added.nameConstant,
    line: `    const ${added.nameConstant} = '${escapeJSString(added.pluginName)}';`
  }
}

/**
Added lines as code: at the script top level a block keeps added names out of the scope every
plugin shares.
*/
function scopedLines(place: Placement, lines: readonly string[]): string {
  return place.body === undefined ? `{\n${lines.join('\n')}\n}` : lines.join('\n')
}

/**
Parsing code for parameters added since load, after the file's parameters variable when it has
one.
*/
function parameterEdits(
  plugin: PluginDefinition,
  baseline: PluginBaseline,
  added: AddedCode
): SourceEdit[] {
  const knownParams = new Set(baseline.parameters.map((p) => p.name))
  const newParams = plugin.parameters.filter(
    (p) => !isSeparator(p.name) && !knownParams.has(p.name)
  )
  if (newParams.length === 0) return []
  const place = added.placement()
  const lines: string[] = []
  let variable = place.parameters?.name
  const at =
    place.parameters === undefined ? place.start : afterNode(added.source, place.parameters.end)
  if (variable === undefined) {
    const { name, line } = pluginNameAt(added, place, at)
    if (line !== undefined) {
      lines.push(line)
      added.isNameInBody = place.body !== undefined
    }
    variable = freeName(place, 'params')
    lines.push(`    const ${variable} = PluginManager.parameters(${name});`)
  }
  lines.push(`    // --- New parameters (added by MZ Plugin Studio) ---`)
  for (const param of newParams) {
    const accessor = `${variable}[${quotedAnnotationName(param.name)}]`
    const constant = freeName(place, camelCase(param.name))
    lines.push(`    const ${constant} = ${generateAccessorParser(accessor, param)};`)
  }
  lines.push(`    // --- End new parameters ---`)
  return [{ start: at, end: at, text: `\n${scopedLines(place, lines)}\n` }]
}

/**
The start of the line closing the IIFE body, or its closing brace when code shares that line;
the end of the file at the top level.
*/
function bodyCloseAt(source: string, place: Placement): number {
  if (place.body === undefined) return source.length
  const close = place.body.end - 1
  const lineStart = source.lastIndexOf('\n', close) + 1
  return /^[ \t]*$/.test(source.slice(lineStart, close)) ? lineStart : close
}

/**
Registration code for commands added since load, at the end of the IIFE body.
*/
function commandEdits(
  plugin: PluginDefinition,
  baseline: PluginBaseline,
  added: AddedCode
): SourceEdit[] {
  const knownCommands = new Set(baseline.commands.map((c) => c.name))
  const newCommands = plugin.commands.filter((command) => !knownCommands.has(command.name))
  if (newCommands.length === 0) return []
  const place = added.placement()
  const at = bodyCloseAt(added.source, place)
  const lines: string[] = []
  let name = added.nameConstant
  if (name === undefined || !added.isNameInBody) {
    const reach = pluginNameAt(added, place, at)
    name = reach.name
    if (reach.line !== undefined) lines.push(reach.line)
  }
  lines.push(`    // --- New commands (added by MZ Plugin Studio) ---`)
  for (const command of newCommands) {
    lines.push(...registrationLines(command, name))
  }
  lines.push(`    // --- End new commands ---`)
  return [
    {
      start: at,
      end: at,
      text:
        place.body === undefined ? `\n${scopedLines(place, lines)}\n` : `\n${lines.join('\n')}\n\n`
    }
  ]
}

/**
`source` with `edits` applied in the file's line endings. They apply from the end so earlier
offsets stay valid; at one offset a replacement goes before an insertion, and insertions keep
their order.
*/
function applyEdits(source: string, edits: readonly SourceEdit[]): string {
  const eol = source.includes('\r\n') ? '\r\n' : '\n'
  let output = source
  const ordered = edits
    .map((edit, index) => ({ ...edit, i: index }))
    .toSorted((a, b) => b.start - a.start || b.end - a.end || b.i - a.i)
  for (const edit of ordered) {
    const text = eol === '\n' ? edit.text : edit.text.split('\n').join(eol)
    output = output.slice(0, edit.start) + text + output.slice(edit.end)
  }
  return output
}

/**
Extract preamble text from an MZ annotation comment block (/*: ... ).
Captures license text, version history, social links, etc. that appear
before the first recognized MZ annotation (@target, @plugindesc, etc.).
*/
function extractHeaderPreamble(blockContent: string): string {
  // Line 0 is the opener of the main block
  const lines = blockContent.split('\n')

  // Known MZ annotation tags that mark the end of the preamble
  const mzAnnotation =
    /^\s*\*\s*@(?:target|plugindesc|author|version|url|base|orderAfter|orderBefore|param|command|help|noteParam|noteType|noteDir|noteData|noteRequire|requiredAssets|require)\b/

  const preambleLines: string[] = []
  for (const line of lines.slice(1)) {
    if (mzAnnotation.test(line)) break
    preambleLines.push(line)
  }

  return preambleLines.length === 0 ? '' : preambleLines.join('\n') + '\n'
}
