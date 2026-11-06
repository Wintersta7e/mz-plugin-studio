import {
  ID_BASED_PARAM_TYPES,
  type PluginBaseline,
  type PluginDefinition,
  type PluginParameter,
  type PluginCommand,
  type PluginStruct,
  type PluginMeta,
  type NoteParam,
  type ParamType
} from '../../types/plugin'
import {
  parse,
  type AnyNode,
  type ArrowFunctionExpression,
  type BlockStatement,
  type FunctionExpression,
  type Program
} from 'acorn'
import { annotationText, escapeBlockComment, escapeJSString, escapeLineComment } from './escape'
import { stripCommentsOnly } from '../../../../shared/override-extractor'
import { findAnnotationBlocks, type AnnotationBlock } from '../../../../shared/annotation-blocks'
import { COMPACT_PARAM_TAG } from '../../../../shared/compact-param'

/**
Receives each field's text as it is written into an annotation comment, with its label.
*/
type BlockSink = (field: string, value: string) => void

/**
A language code MZ reads after `/*:`; any other key is left out of the output.
*/
const LOCALIZATION_KEY = /^[A-Z_]+$/i

function blockValue(sink: BlockSink | undefined, field: string, value: string): string {
  sink?.(field, value)
  return annotationText(value)
}

/**
The annotation line ` * <tag> <value>`; `sink` receives the value labelled `<owner> <tag>`.
*/
function tagLine(sink: BlockSink | undefined, owner: string, tag: string, value: string): string {
  const text = blockValue(sink, `${owner} ${tag}`, value)
  return ` * ${tag} ${text}`
}

/**
Whether a help line would be read as a tag: its first non-space character is `@`.
*/
const HELP_TAG_LINE = /^(\s*)@/

/**
A plugin or command name the validator accepts: an identifier, as code that names it uses it.
*/
const isIdentifierName = (name: string): boolean => /^[A-Z_]\w*$/i.test(name)

/**
A help line as written: a zero-width space goes before a leading `@`, so MZ shows the line
as help instead of reading it as a tag. A guarded line starts with that space, which is not
whitespace, so writing it again adds no second one.
*/
function helpText(line: string): string {
  return line.replace(HELP_TAG_LINE, '$1\u{200B}@')
}

/**
Find names of `PluginManager.registerCommand(...)` calls already present in
comment-stripped source. Both quote styles, both PLUGIN_NAME and the literal
plugin name. Used to skip re-emitting commands the user already wrote.
*/
function findRegisteredCommandNames(strippedSource: string, pluginName: string): Set<string> {
  const names = new Set<string>()
  const escapedName = pluginName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const pattern = new RegExp(
    String.raw`registerCommand\s*\(\s*(?:PLUGIN_NAME|"${escapedName}"|'${escapedName}')\s*,\s*['"]([^'"]+)['"]`,
    'g'
  )
  for (const match of strippedSource.matchAll(pattern)) {
    const name = match.at(1)
    if (name !== undefined) names.add(name)
  }
  return names
}

/**
Generate a complete RPG Maker MZ plugin from a PluginDefinition
*/
export function generatePlugin(plugin: PluginDefinition): string {
  // Generate header comment
  const parts = [generateHeader(plugin)]

  // Generate localized headers
  const localizedHeaders = generateLocalizedHeaders(plugin)
  if (localizedHeaders !== undefined) {
    parts.push(localizedHeaders)
  }

  // Generate struct definitions
  for (const struct of plugin.structs) {
    parts.push(generateStructDefinition(struct))
  }

  // Generate plugin body
  parts.push(generateBody(plugin))

  return parts.join('\n\n')
}

/**
Generate the plugin header comment block with all metadata, parameters, and commands.
`shouldKeepRequire` writes the `@noteRequire` and `@require` lines an imported file had, which
raw mode keeps when it rewrites the file's blocks.
*/
function generateHeader(
  plugin: PluginDefinition,
  sink?: BlockSink,
  shouldKeepRequire = false
): string {
  const lines: string[] = ['/*:', ...headerMetaLines(plugin.meta, sink, shouldKeepRequire), ' *']

  // Parameters
  for (const param of plugin.parameters) {
    lines.push(
      ...generateParameterBlock(param, `Parameter "${param.name}"`, sink, shouldKeepRequire)
    )
    lines.push(' *')
  }

  // Commands
  for (const command of plugin.commands) {
    lines.push(...generateCommandBlock(command, sink, shouldKeepRequire))
    lines.push(' *')
  }

  // Help text
  if (plugin.meta.help) {
    lines.push(' * @help')
    for (const helpLine of plugin.meta.help.split(/\r\n|\r|\n/)) {
      lines.push(` * ${helpText(blockValue(sink, 'Plugin @help', helpLine))}`)
    }
  }

  lines.push(' */')

  return lines.join('\n')
}

/**
The header's plugin-level tags, from `@target` to `@requiredAssets`.
*/
function headerMetaLines(
  meta: PluginMeta,
  sink: BlockSink | undefined,
  shouldKeepRequire: boolean
): string[] {
  const lines: string[] = []

  // Target
  if (meta.target) {
    lines.push(` * @target ${blockValue(sink, 'Plugin @target', meta.target)}`)
  }

  // Plugin description
  if (meta.description) {
    lines.push(` * @plugindesc ${blockValue(sink, 'Plugin @plugindesc', meta.description)}`)
  }

  // Author
  if (meta.author) {
    lines.push(` * @author ${blockValue(sink, 'Plugin @author', meta.author)}`)
  }

  // URL
  if (meta.url) {
    lines.push(` * @url ${blockValue(sink, 'Plugin @url', meta.url)}`)
  }

  // Dependencies
  for (const dependency of meta.dependencies) {
    lines.push(` * @base ${blockValue(sink, 'Plugin @base', dependency)}`)
  }

  // Order After
  const orderAfter = meta.orderAfter ?? []
  for (const order of orderAfter) {
    lines.push(` * @orderAfter ${blockValue(sink, 'Plugin @orderAfter', order)}`)
  }

  // Order Before
  const orderBefore = meta.orderBefore ?? []
  for (const order of orderBefore) {
    lines.push(` * @orderBefore ${blockValue(sink, 'Plugin @orderBefore', order)}`)
  }

  lines.push(...noteParamLines(meta.noteParams ?? [], sink, shouldKeepRequire))

  // Required assets — preserved during "Exclude unused files" deployment.
  const requiredAssets = meta.requiredAssets ?? []
  for (const asset of requiredAssets) {
    lines.push(` * @requiredAssets ${blockValue(sink, 'Plugin @requiredAssets', asset)}`)
  }

  return lines
}

/**
The tags of each deployment notetag group. The official MZ annotation reference documents only
four note-asset tags: @noteParam / @noteType / @noteDir / @noteData. @noteRequire is not part
of the spec and is dropped, except where raw mode keeps an imported file's lines.
*/
function noteParamLines(
  noteParams: readonly NoteParam[],
  sink: BlockSink | undefined,
  shouldKeepRequire: boolean
): string[] {
  const lines: string[] = []
  // `@noteDir` and `@noteData` are written for text that is not empty, `@noteRequire` for true;
  // the plugin store checks these field types when it loads a saved note group.
  for (const np of noteParams) {
    lines.push(` * @noteParam ${blockValue(sink, 'Plugin @noteParam', np.name)}`)
    lines.push(` * @noteType ${blockValue(sink, 'Plugin @noteType', np.type)}`)
    if (np.dir !== undefined && np.dir !== '') {
      lines.push(` * @noteDir ${blockValue(sink, 'Plugin @noteDir', np.dir)}`)
    }
    if (np.data !== undefined && np.data !== '') {
      lines.push(` * @noteData ${blockValue(sink, 'Plugin @noteData', np.data)}`)
    }
    if (shouldKeepRequire && np.require === true) lines.push(' * @noteRequire 1')
  }
  return lines
}

/**
Generate a parameter block for the header
*/
function generateParameterBlock(
  param: PluginParameter,
  owner: string,
  sink: BlockSink | undefined,
  shouldKeepRequire: boolean
): string[] {
  const lines = [
    tagLine(sink, owner, '@param', param.name),
    ...fieldLines(param, owner, sink, shouldKeepRequire)
  ]

  // Parent (for nested parameters)
  if (param.parent !== undefined && param.parent !== '') {
    lines.push(tagLine(sink, owner, '@parent', param.parent))
  }

  return lines
}

/**
The tags a parameter and a command argument share, from `@text` to `@default`.
*/
function fieldLines(
  param: PluginParameter,
  owner: string,
  sink: BlockSink | undefined,
  shouldKeepRequire: boolean
): string[] {
  const lines: string[] = []

  if (param.text && param.text !== param.name) {
    lines.push(tagLine(sink, owner, '@text', param.text))
  }

  if (param.desc) {
    lines.push(tagLine(sink, owner, '@desc', param.desc))
  }

  // Type
  lines.push(tagLine(sink, owner, '@type', formatParamType(param)))
  lines.push(...typeSettingLines(param, owner, sink))

  if (
    (param.type === 'file' || param.type === 'animation') &&
    param.dir !== undefined &&
    param.dir !== ''
  ) {
    lines.push(tagLine(sink, owner, '@dir', param.dir))
  }
  // @require is MV-era — discontinued in MZ per the official MZ annotation reference.
  // Use @requiredAssets at the plugin level instead. Raw mode keeps an imported file's line.
  if (shouldKeepRequire && param.require === true) lines.push(' * @require 1')

  lines.push(...optionLines(param, owner, sink))

  // Default value
  if (param.default !== '') {
    lines.push(tagLine(sink, owner, '@default', formatDefaultValue(param.default)))
  }

  return lines
}

/**
A boolean's `@on`/`@off` labels and a number's `@min`/`@max`/`@decimals`.
*/
function typeSettingLines(
  param: PluginParameter,
  owner: string,
  sink: BlockSink | undefined
): string[] {
  const lines: string[] = []

  // Boolean-specific @on/@off labels
  if (param.type === 'boolean') {
    if (param.onLabel !== undefined && param.onLabel !== '') {
      lines.push(tagLine(sink, owner, '@on', param.onLabel))
    }
    if (param.offLabel !== undefined && param.offLabel !== '') {
      lines.push(tagLine(sink, owner, '@off', param.offLabel))
    }
  } else if (param.type === 'number') {
    // Type-specific attributes
    if (param.min !== undefined) {
      lines.push(tagLine(sink, owner, '@min', String(param.min)))
    }
    if (param.max !== undefined) {
      lines.push(tagLine(sink, owner, '@max', String(param.max)))
    }
    if (param.decimals !== undefined) {
      lines.push(tagLine(sink, owner, '@decimals', String(param.decimals)))
    }
  }

  return lines
}

/**
The `@option`/`@value` pairs of a select or combo.
*/
function optionLines(param: PluginParameter, owner: string, sink: BlockSink | undefined): string[] {
  const lines: string[] = []
  if ((param.type === 'select' || param.type === 'combo') && param.options) {
    for (const opt of param.options) {
      lines.push(tagLine(sink, owner, '@option', opt.text))
      if (opt.value !== opt.text) {
        lines.push(tagLine(sink, owner, '@value', opt.value))
      }
    }
  }
  return lines
}

/**
Format the @type value based on parameter type
*/
function formatParamType(param: PluginParameter): string {
  // Use rawType for round-trip fidelity when available
  if (param.rawType !== undefined && param.rawType !== '') {
    return param.rawType
  }

  if (param.type === 'struct' && param.structType !== undefined && param.structType !== '') {
    return `struct<${param.structType}>`
  }

  if (param.type === 'array') {
    if (param.structType !== undefined && param.structType !== '') {
      return `struct<${param.structType}>[]`
    }
    if (param.arrayType !== undefined) {
      return `${param.arrayType}[]`
    }
    return 'string[]'
  }

  return param.type
}

/**
Format a default value for output
*/
function formatDefaultValue(value: string | number | boolean): string {
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false'
  }
  if (typeof value === 'number') {
    return String(value)
  }
  return value
}

/**
Generate a command block for the header
*/
function generateCommandBlock(
  command: PluginCommand,
  sink?: BlockSink,
  shouldKeepRequire = false
): string[] {
  const lines: string[] = []
  const owner = `Command "${command.name}"`

  lines.push(tagLine(sink, owner, '@command', command.name))

  if (command.text && command.text !== command.name) {
    lines.push(tagLine(sink, owner, '@text', command.text))
  }

  if (command.desc) {
    lines.push(tagLine(sink, owner, '@desc', command.desc))
  }

  // Command arguments
  for (const arg of command.args) {
    const argOwner = `${owner} argument "${arg.name}"`
    lines.push(' *')
    lines.push(tagLine(sink, argOwner, '@arg', arg.name))
    lines.push(...fieldLines(arg, argOwner, sink, shouldKeepRequire))
  }

  return lines
}

/**
Generate localized header blocks for multi-language support
*/
function generateLocalizedHeaders(plugin: PluginDefinition, sink?: BlockSink): string | undefined {
  const localizations = plugin.meta.localizations
  if (!localizations || Object.keys(localizations).length === 0) {
    return undefined
  }

  const parts: string[] = []

  for (const [lang, content] of Object.entries(localizations)) {
    if (!LOCALIZATION_KEY.test(lang)) continue
    const description = content.description ?? ''
    const help = content.help ?? ''
    if (description === '' && help === '') continue

    const owner = `Localization "${lang}"`
    const lines = [`/*:${blockValue(sink, owner, lang)}`]

    if (description !== '') {
      lines.push(tagLine(sink, owner, '@plugindesc', description))
    }

    if (help !== '') {
      lines.push(' * @help')
      const helpField = `${owner} @help`
      for (const helpLine of help.split(/\r\n|\r|\n/)) {
        lines.push(` * ${helpText(blockValue(sink, helpField, helpLine))}`)
      }
    }

    lines.push(' */')
    parts.push(lines.join('\n'))
  }

  return parts.length > 0 ? parts.join('\n\n') : undefined
}

/**
Generate struct definition comment block
*/
function generateStructDefinition(
  struct: PluginStruct,
  sink?: BlockSink,
  shouldKeepRequire = false
): string {
  const structOwner = `Struct "${struct.name}"`
  const lines = [`/*~struct~${blockValue(sink, structOwner, struct.name)}:`]

  for (const param of struct.parameters) {
    const owner = `Struct "${struct.name}" field "${param.name}"`
    lines.push(...generateParameterBlock(param, owner, sink, shouldKeepRequire))
    lines.push(' *')
  }

  lines.push(' */')

  return lines.join('\n')
}

/**
Generate the plugin body (IIFE with parameter parsing and command registration)
Always regenerates template sections (param parsing, command registration)
and appends preserved custom code.
*/
function generateBody(plugin: PluginDefinition): string {
  const lines: string[] = ['(() => {', `    'use strict';`, '']

  // Plugin name constant
  const pluginName = plugin.meta.name || 'NewPlugin'
  lines.push(`    const PLUGIN_NAME = '${escapeJSString(pluginName)}';`)
  lines.push('')

  // Parse parameters if any exist
  lines.push(...parameterParsingLines(plugin.parameters))

  // Register commands if any exist (skip commands already handled in customCode).
  // Strip comments first so `// registerCommand(PLUGIN_NAME, 'Foo')` doesn't
  // suppress generation of Foo. String literals are preserved so real calls
  // (with the command name in quotes) still match.
  const customCode = plugin.customCode ?? ''
  const alreadyRegistered = customCode
    ? findRegisteredCommandNames(stripCommentsOnly(customCode), pluginName)
    : new Set<string>()
  const commandsToGenerate = plugin.commands.filter(
    (command) => !alreadyRegistered.has(command.name)
  )

  if (commandsToGenerate.length > 0) {
    lines.push('    // Register plugin commands')

    for (const command of commandsToGenerate) {
      lines.push('', ...registrationLines(command, 'PLUGIN_NAME'))
    }

    lines.push('')
  }

  // Add preserved custom code or placeholder
  lines.push(...customCodeLines(plugin.customCode))
  lines.push('')

  lines.push('})();')

  return lines.join('\n')
}

/**
The body's parameter parsing: the parameters read once, then one constant per parameter.
*/
function parameterParsingLines(parameters: readonly PluginParameter[]): string[] {
  const lines: string[] = []
  if (parameters.length > 0) {
    lines.push('    // Parse plugin parameters')
    lines.push('    const params = PluginManager.parameters(PLUGIN_NAME);')
    lines.push('')

    for (const param of parameters) {
      // Skip section divider parameters (they're just for organization in MZ editor)
      if (param.name.includes('---') || param.name.includes('===')) continue
      lines.push(`    const ${camelCase(param.name)} = ${generateParamParser(param)};`)
    }

    lines.push('')
  }
  return lines
}

/**
The user's code indented into the IIFE, or a placeholder comment when there is none.
*/
function customCodeLines(customCode = ''): string[] {
  if (customCode.trim() === '') return ['    // Custom plugin code goes here']
  // Indent the custom code properly — always add 4-space base indent for IIFE nesting
  const customLines = customCode
    .split('\n')
    .map((customLine) => (customLine.trim() === '' ? '' : `    ${customLine}`))
  return ['    // ========== Custom Plugin Code ==========', ...customLines]
}

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

/**
Parses code the way MZ loads a plugin: as a classic script.
*/
const parseScript = (code: string): Program =>
  parse(code, { ecmaVersion: 'latest', sourceType: 'script' })

/**
Why `code` does not parse as a classic script, or undefined when it does.
*/
export function scriptParseError(code: string): string | undefined {
  try {
    parseScript(code)
    return undefined
  } catch (error) {
    if (error instanceof SyntaxError) return error.message
    throw error
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
The main block, rewritten when its rendering changed since `baseline`.
*/
function mainBlockEdits(
  plugin: PluginDefinition,
  baseline: PluginBaseline,
  source: string,
  blocks: readonly AnnotationBlock[]
): SourceEdit[] {
  const main = blocks.find((b) => b.kind === 'main')
  const header = generateHeader(plugin, undefined, true)
  if (main === undefined || header === generateHeader(baseline, undefined, true)) return []
  const preamble = extractHeaderPreamble(
    source.slice(main.start, main.end).replaceAll('\r\n', '\n')
  )
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
    const accessor = `${variable}['${escapeJSString(annotationText(param.name))}']`
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
An added command's registration, its arguments parsed into constants with distinct names.
*/
function registrationLines(command: PluginCommand, name: string): string[] {
  const lines = [
    `    PluginManager.registerCommand(${name}, '${escapeJSString(annotationText(command.name))}', function(args) {`
  ]
  const argNames = new Set<string>()
  const constants: string[] = []
  for (const arg of command.args) {
    let constant = camelCase(arg.name)
    while (argNames.has(constant)) constant += '_'
    argNames.add(constant)
    constants.push(constant)
    lines.push(`        const ${constant} = ${generateArgParser(arg)};`)
  }
  lines.push('')
  lines.push('        // TODO: Implement command logic')
  if (command.args.length > 0) {
    lines.push(`        // Parsed args available as: ${constants.join(', ')}`)
  }
  lines.push('    });')
  return lines
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
    /^\s*\*\s*@(?:target|plugindesc|author|url|base|orderAfter|orderBefore|param|command|help|noteParam|noteType|noteDir|noteData|noteRequire|requiredAssets|require)\b/

  const preambleLines: string[] = []
  for (const line of lines.slice(1)) {
    if (mzAnnotation.test(line)) break
    preambleLines.push(line)
  }

  return preambleLines.length === 0 ? '' : preambleLines.join('\n') + '\n'
}

/**
Generate a parsing expression for a parameter/argument accessor.
*/
function generateAccessorParser(accessor: string, param: PluginParameter): string {
  const defaultValue = formatJSDefault(param.default, param.type)

  // Every type but number, boolean, location, struct and array is a scalar read: an ID-based
  // type as a number, any other as the text stored
  if (isScalarType(param.type)) return scalarAccessor(accessor, param.type, defaultValue)

  switch (param.type) {
    case 'number': {
      return `Number(${accessor} || ${defaultValue})`
    }

    case 'boolean': {
      // MZ omits the param key entirely when the user never opens the Plugin
      // Manager, so `accessor` may be undefined even when @default is true.
      // Nullish-coalesce to the declared default before comparing.
      const defaultText = param.default === true ? 'true' : 'false'
      return `(${accessor} ?? '${defaultText}') === 'true'`
    }

    case 'location': {
      return `JSON.parse(${accessor} || '{"mapId":"0","x":"0","y":"0"}')`
    }

    case 'struct': {
      return `JSON.parse(${accessor} || '${jsonFallback(param, '{}')}')`
    }

    case 'array': {
      // MZ double-encodes struct<X>[]: outer JSON array of JSON strings.
      // Without the inner parse each element remains a string literal.
      const parsed = `JSON.parse(${accessor} || '${jsonFallback(param, '[]')}')`
      const inner = param.arrayType
      if (inner === 'struct' && param.structType !== undefined && param.structType !== '') {
        return `${parsed}.map(s => JSON.parse(s))`
      }
      if (inner === 'number' || (inner && ID_BASED_PARAM_TYPES.has(inner))) {
        return `${parsed}.map(Number)`
      }
      if (inner === 'boolean') {
        return `${parsed}.map(v => v === 'true')`
      }
      return parsed
    }
  }
}

/**
The types whose accessor is not a scalar read, or `number`'s own.
*/
const NON_SCALAR_TYPES = [
  'number',
  'boolean',
  'location',
  'struct',
  'array'
] as const satisfies readonly ParamType[]

type ScalarType = Exclude<ParamType, (typeof NON_SCALAR_TYPES)[number]>

const NON_SCALAR: ReadonlySet<ParamType> = new Set<ParamType>(NON_SCALAR_TYPES)

const isScalarType = (type: ParamType): type is ScalarType => !NON_SCALAR.has(type)

/**
The expression reading a scalar: a number for an ID-based type, else the text as stored.
*/
function scalarAccessor(accessor: string, type: ScalarType, defaultValue: string): string {
  // `??`, not `||`: a value set to empty in MZ is stored as "" and must stay empty
  return ID_BASED_PARAM_TYPES.has(type)
    ? `Number(${accessor} || ${defaultValue})`
    : `${accessor} ?? ${defaultValue}`
}

/**
The JSON text a struct or array reads when its key is absent: its `@default`, else `empty`.
*/
function jsonFallback(param: PluginParameter, empty: string): string {
  return typeof param.default === 'string' && param.default !== ''
    ? escapeJSString(annotationText(param.default))
    : empty
}

function generateParamParser(param: PluginParameter): string {
  return generateAccessorParser(`params['${escapeJSString(annotationText(param.name))}']`, param)
}

function generateArgParser(arg: PluginParameter): string {
  return generateAccessorParser(`args['${escapeJSString(annotationText(arg.name))}']`, arg)
}

/**
Format default value for JavaScript code
*/
function formatJSDefault(value: string | number | boolean, type: ParamType): string {
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false'
  }
  if (typeof value === 'number') {
    return String(value)
  }
  if (type === 'number' || ID_BASED_PARAM_TYPES.has(type)) {
    return '0'
  }
  return `'${escapeJSString(annotationText(value))}'`
}

// Reserved words that would cause a SyntaxError if used as `const <name>`.
// Includes ES2024 reserved + strict-mode reserved + contextual keywords that
// collide inside `'use strict'` IIFEs, plus `eval`/`arguments` (not bindable in
// strict mode) and `params`/`args` (declared by the generated code itself).
// Suffixing with `_` is safer than prefixing because it preserves the visible
// name in generated code.
export const JS_RESERVED: ReadonlySet<string> = new Set([
  'break',
  'case',
  'catch',
  'class',
  'const',
  'continue',
  'debugger',
  'default',
  'delete',
  'do',
  'else',
  'enum',
  'export',
  'extends',
  'false',
  'finally',
  'for',
  'function',
  'if',
  'implements',
  'import',
  'in',
  'instanceof',
  'interface',
  'let',
  'new',
  'null',
  'package',
  'private',
  'protected',
  'public',
  'return',
  'static',
  'super',
  'switch',
  'this',
  'throw',
  'true',
  'try',
  'typeof',
  'var',
  'void',
  'while',
  'with',
  'yield',
  'async',
  'await',
  'of',
  'eval',
  'arguments',
  'params',
  'args'
])

/**
Convert parameter name to a valid JS camelCase identifier.
Guarantees: output is always a syntactically legal strict-mode identifier
(never a reserved word, never starts with a digit, never empty).
*/
function camelCase(string_: string): string {
  if (!string_) return 'unnamed'
  // Fast path: already a valid identifier with no separators (e.g. myCombo → myCombo)
  if (/^[a-z$][a-z0-9$]*$/i.test(string_)) {
    const normalized = string_.charAt(0).toLowerCase() + string_.slice(1)
    return sanitizeIdentifier(normalized)
  }
  // Strip leading/trailing underscores, split on non-alphanumeric
  const stripped = string_.replaceAll(/^_+|_+$/g, '')
  const words = stripped
    .replaceAll(/[^a-z0-9]/gi, ' ')
    .split(' ')
    .filter(Boolean)
  const result = words
    // The first word's first char goes lower case (keeping internal camelCase), each later
    // word's upper case; the rest is preserved
    .map(
      (word, index) =>
        (index === 0 ? word.charAt(0).toLowerCase() : word.charAt(0).toUpperCase()) + word.slice(1)
    )
    .join('')
  return sanitizeIdentifier(result)
}

function sanitizeIdentifier(name: string): string {
  if (!name) return 'unnamed'
  // Digit-start: prefix with underscore so `const 123abc` becomes `const _123abc`
  if (/^\d/.test(name)) {
    return '_' + name
  }
  // Reserved word: suffix with underscore so `const class` becomes `const class_`
  if (JS_RESERVED.has(name)) {
    return name + '_'
  }
  return name
}

/**
Generate only the header portion (for quick preview)
*/
export function generateHeaderOnly(plugin: PluginDefinition): string {
  return generateHeader(plugin)
}

const MZ_BUILTIN_COMMANDS = new Set([
  'ShowText',
  'ShowChoices',
  'InputNumber',
  'SelectItem',
  'ShowScrollingText',
  'Wait',
  'FadeoutScreen',
  'FadeinScreen',
  'TintScreen',
  'FlashScreen',
  'ShakeScreen',
  'SetWeatherEffect',
  'PlayBGM',
  'FadeoutBGM',
  'SaveBGM',
  'ResumeBGM',
  'PlayBGS',
  'FadeoutBGS',
  'PlayME',
  'PlaySE',
  'StopSE',
  'PlayMovie',
  'ChangeTransparency',
  'ShowAnimation',
  'ShowBalloonIcon',
  'EraseEvent',
  'ChangePlayerFollowers',
  'GatherFollowers',
  'FreezeGame'
])

/**
What validation found: errors and warnings, each list in the order the checks ran.
*/
interface ValidationProblems {
  errors: string[]
  warnings: string[]
}

/**
Validate a plugin definition with nine checks, in this order: the plugin name and localization
keys, parameter names, commands and their arguments, struct names and references, struct
defaults, unused structs, parents, command implementations, and field text. Each check's own
comment says what it reports. RPG Maker MZ allows any string as a parameter name (section
dividers such as "---Settings---" among them), so a name that is not an identifier only warns.
*/
export function validatePlugin(plugin: PluginDefinition): {
  valid: boolean
  errors: string[]
  warnings: string[]
} {
  const problems: ValidationProblems = { errors: [], warnings: [] }
  checkPluginName(plugin, problems)
  checkParameterNames(plugin.parameters, problems)
  checkCommands(plugin.commands, problems)
  checkStructReferences(plugin, problems)
  checkStructDefaults(plugin.parameters, problems)
  checkUnusedStructs(plugin, problems)
  checkParents(plugin.parameters, problems)
  checkImplementations(plugin, problems)
  checkFieldText(plugin, problems)
  const { errors, warnings } = problems
  return { valid: errors.length === 0, errors, warnings }
}

/**
The plugin name and the localization keys, which code and MZ read.
*/
function checkPluginName(plugin: PluginDefinition, { errors }: ValidationProblems): void {
  // Plugin name must be a valid identifier (used in PluginManager.parameters())
  if (!isIdentifierName(plugin.meta.name)) {
    errors.push(
      'Plugin name must be a valid identifier (letters, numbers, underscores, cannot start with number)'
    )
  }

  const languages = Object.keys(plugin.meta.localizations ?? {})
  for (const lang of languages) {
    if (!LOCALIZATION_KEY.test(lang)) {
      errors.push(
        `Localization "${lang}" is left out: a language code may contain only letters and underscores.`
      )
    }
  }
}

/**
Parameter names: empty and duplicate names, names that are not identifiers, and names whose
generated identifiers collide or differ from the name.
*/
function checkParameterNames(
  parameters: readonly PluginParameter[],
  problems: ValidationProblems
): void {
  const { errors, warnings } = problems
  // Check for duplicate parameter names (but allow any string - MZ supports it)
  const paramNames = new Set<string>()
  // Collect post-transform identifiers to detect collisions after camelCase sanitization
  const identifierOrigins = new Map<string, string>()
  for (const param of parameters) {
    if (!param.name) {
      errors.push('Parameter name cannot be empty')
    } else if (paramNames.has(param.name)) {
      errors.push(`Duplicate parameter name: ${param.name}`)
    }
    paramNames.add(param.name)

    const isSectionDivider =
      !!param.name && (param.name.includes('---') || param.name.includes('==='))

    // Warn (not error) if parameter name isn't a valid identifier - it will still work in MZ
    // but won't be easily accessible in code
    if (!isSectionDivider && param.name && !isIdentifierName(param.name)) {
      warnings.push(
        `Parameter "${param.name}" is not a valid JS identifier (will still work in MZ)`
      )
    }

    if (!isSectionDivider && param.name) {
      checkGeneratedIdentifier(param.name, identifierOrigins, problems)
    }
  }
}

/**
Post-transform collision detection: two params with different raw names can camelCase() to the
same identifier (e.g., "foo-bar" and "Foo Bar"), which produces duplicate `const` declarations
inside the IIFE. `identifierOrigins` maps each identifier to the first name that gave it.
*/
function checkGeneratedIdentifier(
  name: string,
  identifierOrigins: Map<string, string>,
  { errors, warnings }: ValidationProblems
): void {
  const identifier = camelCase(name)
  const previousOrigin = identifierOrigins.get(identifier)
  if (previousOrigin === undefined || previousOrigin === name) {
    identifierOrigins.set(identifier, name)
  } else {
    errors.push(
      `Parameters "${previousOrigin}" and "${name}" both generate identifier "${identifier}" — rename one to avoid a duplicate declaration`
    )
  }

  // Warn about reserved-word and digit-start transforms so users know the
  // generated variable differs from their parameter name.
  if (identifier !== name) {
    if (JS_RESERVED.has(name)) {
      warnings.push(
        `Parameter "${name}" is a reserved name; the generated variable will be "${identifier}"`
      )
    } else if (/^\d/.test(name)) {
      warnings.push(
        `Parameter "${name}" starts with a digit; the generated variable will be "${identifier}"`
      )
    }
  }
}

/**
Two arguments of one command with one name, or whose names make one identifier, which the
registration code declares a constant for each.
*/
function checkArguments(command: PluginCommand, errors: string[]): void {
  const argNames = new Set<string>()
  const identifierOrigins = new Map<string, string>()
  for (const arg of command.args) {
    if (argNames.has(arg.name)) {
      errors.push(`Duplicate argument name in command ${command.name}: ${arg.name}`)
    }
    argNames.add(arg.name)
    const identifier = camelCase(arg.name)
    const origin = identifierOrigins.get(identifier)
    if (origin === undefined) {
      identifierOrigins.set(identifier, arg.name)
    } else if (origin !== arg.name) {
      errors.push(
        `Arguments "${origin}" and "${arg.name}" of command ${command.name} both generate identifier "${identifier}" — rename one to avoid a duplicate declaration`
      )
    }
  }
}

/**
Command names must be valid identifiers (used in PluginManager.registerCommand()); duplicate
commands, arguments that clash, and commands that shadow a built-in one.
*/
function checkCommands(
  commands: readonly PluginCommand[],
  { errors, warnings }: ValidationProblems
): void {
  const commandNames = new Set<string>()
  for (const command of commands) {
    if (commandNames.has(command.name)) {
      errors.push(`Duplicate command name: ${command.name}`)
    }
    commandNames.add(command.name)

    if (!isIdentifierName(command.name)) {
      errors.push(`Invalid command name: ${command.name} (must be valid identifier)`)
    }

    checkArguments(command, errors)

    if (MZ_BUILTIN_COMMANDS.has(command.name)) {
      warnings.push(`Command "${command.name}" shadows a built-in RPG Maker MZ command`)
    }
  }
}

/**
Each struct name more than one struct of the plugin holds, once, in the order structs repeat it.
*/
export function duplicateStructNames(structs: readonly PluginStruct[]): string[] {
  const seen = new Set<string>()
  const repeated = new Set<string>()
  for (const { name } of structs) {
    if (seen.has(name)) repeated.add(name)
    seen.add(name)
  }
  return [...repeated]
}

/**
Two structs of one name, which a file cannot tell apart (error), and struct parameters that name
a struct the plugin does not define (warning).
*/
function checkStructReferences(
  plugin: PluginDefinition,
  { errors, warnings }: ValidationProblems
): void {
  for (const name of duplicateStructNames(plugin.structs)) {
    errors.push(`Duplicate struct name: ${name}`)
  }
  const structNames = new Set(plugin.structs.map((s) => s.name))
  for (const param of plugin.parameters) {
    if (
      param.type === 'struct' &&
      param.structType !== undefined &&
      param.structType !== '' &&
      !structNames.has(param.structType)
    ) {
      warnings.push(
        `Parameter "${param.name}" references struct "${param.structType}" which is not defined in this plugin`
      )
    }
  }
}

/**
Struct parameter defaults that are not a JSON object (warning).
*/
function checkStructDefaults(
  parameters: readonly PluginParameter[],
  { warnings }: ValidationProblems
): void {
  for (const param of parameters) {
    if (
      param.type === 'struct' &&
      typeof param.default === 'string' &&
      param.default.trim() !== '' &&
      param.default.trim() !== '{}'
    ) {
      try {
        const parsed: unknown = JSON.parse(param.default)
        if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
          warnings.push(`Parameter "${param.name}" struct default is not a valid JSON object`)
        }
      } catch {
        warnings.push(`Parameter "${param.name}" has invalid JSON in struct default`)
      }
    }
  }
}

/**
Struct definitions no parameter or command argument references (warning).
*/
function checkUnusedStructs(plugin: PluginDefinition, { warnings }: ValidationProblems): void {
  const referencedStructs = new Set<string>()
  for (const param of plugin.parameters) {
    if (param.structType !== undefined && param.structType !== '')
      referencedStructs.add(param.structType)
  }
  for (const command of plugin.commands) {
    for (const arg of command.args) {
      if (arg.structType !== undefined && arg.structType !== '')
        referencedStructs.add(arg.structType)
    }
  }
  for (const struct of plugin.structs) {
    if (!referencedStructs.has(struct.name)) {
      warnings.push(
        `Struct "${struct.name}" is defined but not referenced by any parameter or command argument`
      )
    }
  }
}

/**
Parameters referencing a nonexistent parent (error).
*/
function checkParents(
  parameters: readonly PluginParameter[],
  { errors }: ValidationProblems
): void {
  const paramNames = new Set(parameters.map((p) => p.name))
  for (const param of parameters) {
    if (param.parent !== undefined && param.parent !== '' && !paramNames.has(param.parent)) {
      errors.push(`Parameter "${param.name}" references nonexistent parent "${param.parent}"`)
    }
  }
}

/**
Commands with no implementation in custom code (warning).
*/
function checkImplementations(plugin: PluginDefinition, { warnings }: ValidationProblems): void {
  if (plugin.customCode === undefined || plugin.customCode === '') return
  // Ignore comments to avoid false positives (e.g., a `// 'Heal'` note counting as impl)
  const strippedImpl = stripCommentsOnly(plugin.customCode)
  for (const command of plugin.commands) {
    const hasImplementation =
      strippedImpl.includes(`'${command.name}'`) || strippedImpl.includes(`"${command.name}"`)
    if (!hasImplementation) {
      warnings.push(`Command "${command.name}" has no implementation in custom code`)
    }
  }
}

/**
Field text written escaped or read by MZ as a tag (warning, once per field and kind).
*/
function checkFieldText(plugin: PluginDefinition, { warnings }: ValidationProblems): void {
  const reported = new Set<string>()
  const report = (key: string, warning: string): void => {
    if (reported.has(key)) return
    reported.add(key)
    warnings.push(warning)
  }
  const collect: BlockSink = (field, value) => {
    if (escapeBlockComment(value) !== value) {
      report(
        `escaped ${field}`,
        String.raw`${field}: "*/" is written as "*\/" so it cannot end the comment.`
      )
    }
    if (/[\r\n]/.test(value)) {
      report(
        `line break ${field}`,
        `${field}: a line break is written as a space, because each annotation is one line.`
      )
    }
    if (field.endsWith('@help') && HELP_TAG_LINE.test(value)) {
      report(
        `tag ${field}`,
        `${field}: a line starting with "@" is written with an invisible zero-width space before the "@", so RPG Maker MZ shows it as help text instead of reading it as an annotation tag.`
      )
    }
    if (field.endsWith(' @param') && COMPACT_PARAM_TAG.test(value)) {
      report(
        `setting tag ${field}`,
        `${field}: the name holds an "@" setting tag, so when the plugin is opened again the name ends before that tag and the rest is read as the parameter's settings.`
      )
    }
  }
  generateHeader(plugin, collect)
  generateLocalizedHeaders(plugin, collect)
  for (const struct of plugin.structs) {
    generateStructDefinition(struct, collect)
  }
}

/**
Generate a command skeleton for insertion into customCode
*/
export function generateCommandSkeleton(command: PluginCommand): string {
  const lines = [
    `// --- ${escapeLineComment(command.name)} ---`,
    `PluginManager.registerCommand(PLUGIN_NAME, '${escapeJSString(annotationText(command.name))}', function(args) {`,
    `    // TODO: Implement ${escapeJSString(command.name)} logic`,
    '});'
  ]
  return lines.join('\n')
}

/**
Generate a parameter usage comment for insertion into customCode
*/
export function generateParameterComment(param: PluginParameter): string {
  const text = `Parameter '${param.name}' (${param.type}) is available as: ${camelCase(param.name)}`
  return `// ${escapeLineComment(text)}`
}
