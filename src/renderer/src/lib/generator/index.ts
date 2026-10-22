import type {
  PluginBaseline,
  PluginDefinition,
  PluginParameter,
  PluginCommand,
  PluginStruct,
  ParamType
} from '../../types/plugin'
import { parse } from 'acorn'
import type {
  AnyNode,
  ArrowFunctionExpression,
  BlockStatement,
  FunctionExpression,
  Program
} from 'acorn'
import { ID_BASED_PARAM_TYPES } from '../../types/plugin'
import { escapeBlockComment, escapeJSString, escapeLineComment } from './escape'
import { stripCommentsOnly } from '../../../../shared/override-extractor'
import { findAnnotationBlocks } from '../../../../shared/annotation-blocks'

/** Receives each field's text as it is written into an annotation comment, with its label. */
type BlockSink = (field: string, value: string) => void

/** A language code MZ reads after `/*:`; any other key is left out of the output. */
const LOCALIZATION_KEY = /^[A-Za-z_]+$/

function blockValue(sink: BlockSink | undefined, field: string, value: string): string {
  sink?.(field, value)
  return escapeBlockComment(value)
}

/**
 * Find names of `PluginManager.registerCommand(...)` calls already present in
 * comment-stripped source. Both quote styles, both PLUGIN_NAME and the literal
 * plugin name. Used to skip re-emitting commands the user already wrote.
 */
function findRegisteredCommandNames(strippedSource: string, pluginName: string): Set<string> {
  const names = new Set<string>()
  const escapedName = pluginName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const pattern = new RegExp(
    String.raw`registerCommand\s*\(\s*(?:PLUGIN_NAME|"${escapedName}"|'${escapedName}')\s*,\s*['"]([^'"]+)['"]`,
    'g'
  )
  for (const match of strippedSource.matchAll(pattern)) {
    names.add(match[1])
  }
  return names
}

/**
 * Generate a complete RPG Maker MZ plugin from a PluginDefinition
 */
export function generatePlugin(plugin: PluginDefinition): string {
  const parts: string[] = []

  // Generate header comment
  parts.push(generateHeader(plugin))

  // Generate localized headers
  const localizedHeaders = generateLocalizedHeaders(plugin)
  if (localizedHeaders) {
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
 * Generate the plugin header comment block with all metadata, parameters, and commands.
 * `keepRequire` writes the `@noteRequire` and `@require` lines an imported file had, which
 * raw mode keeps when it rewrites the file's blocks.
 */
function generateHeader(plugin: PluginDefinition, sink?: BlockSink, keepRequire = false): string {
  const lines: string[] = []

  lines.push('/*:')

  // Target
  if (plugin.meta.target) {
    lines.push(` * @target ${blockValue(sink, 'Plugin @target', plugin.meta.target)}`)
  }

  // Plugin description
  if (plugin.meta.description) {
    lines.push(` * @plugindesc ${blockValue(sink, 'Plugin @plugindesc', plugin.meta.description)}`)
  }

  // Author
  if (plugin.meta.author) {
    lines.push(` * @author ${blockValue(sink, 'Plugin @author', plugin.meta.author)}`)
  }

  // URL
  if (plugin.meta.url) {
    lines.push(` * @url ${blockValue(sink, 'Plugin @url', plugin.meta.url)}`)
  }

  // Dependencies
  for (const dep of plugin.meta.dependencies) {
    lines.push(` * @base ${blockValue(sink, 'Plugin @base', dep)}`)
  }

  // Order After
  for (const order of plugin.meta.orderAfter || []) {
    lines.push(` * @orderAfter ${blockValue(sink, 'Plugin @orderAfter', order)}`)
  }

  // Order Before
  for (const order of plugin.meta.orderBefore || []) {
    lines.push(` * @orderBefore ${blockValue(sink, 'Plugin @orderBefore', order)}`)
  }

  // Note Parameters (deployment notetag groups)
  // The official MZ annotation reference documents only four note-asset tags:
  // @noteParam / @noteType / @noteDir / @noteData. @noteRequire is not part
  // of the spec and is dropped, except where raw mode keeps an imported file's lines.
  for (const np of plugin.meta.noteParams || []) {
    lines.push(` * @noteParam ${blockValue(sink, 'Plugin @noteParam', np.name)}`)
    lines.push(` * @noteType ${blockValue(sink, 'Plugin @noteType', np.type)}`)
    if (np.dir) lines.push(` * @noteDir ${blockValue(sink, 'Plugin @noteDir', np.dir)}`)
    if (np.data) lines.push(` * @noteData ${blockValue(sink, 'Plugin @noteData', np.data)}`)
    if (keepRequire && np.require) lines.push(' * @noteRequire 1')
  }

  // Required assets — preserved during "Exclude unused files" deployment.
  for (const asset of plugin.meta.requiredAssets || []) {
    lines.push(` * @requiredAssets ${blockValue(sink, 'Plugin @requiredAssets', asset)}`)
  }

  lines.push(' *')

  // Parameters
  for (const param of plugin.parameters) {
    lines.push(
      ...generateParameterBlock(param, ' * ', `Parameter "${param.name}"`, sink, keepRequire)
    )
    lines.push(' *')
  }

  // Commands
  for (const cmd of plugin.commands) {
    lines.push(...generateCommandBlock(cmd, sink, keepRequire))
    lines.push(' *')
  }

  // Help text
  if (plugin.meta.help) {
    lines.push(' * @help')
    for (const helpLine of plugin.meta.help.split('\n')) {
      lines.push(` * ${blockValue(sink, 'Plugin @help', helpLine)}`)
    }
  }

  lines.push(' */')

  return lines.join('\n')
}

/**
 * Generate a parameter block for the header
 */
function generateParameterBlock(
  param: PluginParameter,
  prefix: string = ' * ',
  owner: string = `Parameter "${param.name}"`,
  sink?: BlockSink,
  keepRequire = false
): string[] {
  const lines: string[] = []

  lines.push(`${prefix}@param ${blockValue(sink, `${owner} @param`, param.name)}`)

  if (param.text && param.text !== param.name) {
    lines.push(`${prefix}@text ${blockValue(sink, `${owner} @text`, param.text)}`)
  }

  if (param.desc) {
    lines.push(`${prefix}@desc ${blockValue(sink, `${owner} @desc`, param.desc)}`)
  }

  // Type
  lines.push(`${prefix}@type ${blockValue(sink, `${owner} @type`, formatParamType(param))}`)

  // Boolean-specific @on/@off labels
  if (param.type === 'boolean') {
    if (param.onLabel) {
      lines.push(`${prefix}@on ${blockValue(sink, `${owner} @on`, param.onLabel)}`)
    }
    if (param.offLabel) {
      lines.push(`${prefix}@off ${blockValue(sink, `${owner} @off`, param.offLabel)}`)
    }
  }

  // Type-specific attributes
  if (param.type === 'number') {
    if (param.min !== undefined) {
      lines.push(`${prefix}@min ${blockValue(sink, `${owner} @min`, String(param.min))}`)
    }
    if (param.max !== undefined) {
      lines.push(`${prefix}@max ${blockValue(sink, `${owner} @max`, String(param.max))}`)
    }
    if (param.decimals !== undefined) {
      lines.push(
        `${prefix}@decimals ${blockValue(sink, `${owner} @decimals`, String(param.decimals))}`
      )
    }
  }

  if ((param.type === 'file' || param.type === 'animation') && param.dir) {
    lines.push(`${prefix}@dir ${blockValue(sink, `${owner} @dir`, param.dir)}`)
  }
  // @require is MV-era — discontinued in MZ per the official MZ annotation reference.
  // Use @requiredAssets at the plugin level instead. Raw mode keeps an imported file's line.
  if (keepRequire && param.require) lines.push(`${prefix}@require 1`)

  // Options for select/combo type
  if ((param.type === 'select' || param.type === 'combo') && param.options) {
    for (const opt of param.options) {
      lines.push(`${prefix}@option ${blockValue(sink, `${owner} @option`, opt.text)}`)
      if (opt.value !== opt.text) {
        lines.push(`${prefix}@value ${blockValue(sink, `${owner} @value`, opt.value)}`)
      }
    }
  }

  // Default value
  if (param.default !== undefined && param.default !== '') {
    lines.push(
      `${prefix}@default ${blockValue(sink, `${owner} @default`, formatDefaultValue(param.default, param.type))}`
    )
  }

  // Parent (for nested parameters)
  if (param.parent) {
    lines.push(`${prefix}@parent ${blockValue(sink, `${owner} @parent`, param.parent)}`)
  }

  return lines
}

/**
 * Format the @type value based on parameter type
 */
function formatParamType(param: PluginParameter): string {
  // Use rawType for round-trip fidelity when available
  if (param.rawType) {
    return param.rawType
  }

  if (param.type === 'struct' && param.structType) {
    return `struct<${param.structType}>`
  }

  if (param.type === 'array') {
    if (param.structType) {
      return `struct<${param.structType}>[]`
    }
    if (param.arrayType) {
      if (param.arrayType === 'struct' && param.structType) {
        return `struct<${param.structType}>[]`
      }
      return `${param.arrayType}[]`
    }
    return 'string[]'
  }

  return param.type
}

/**
 * Format a default value for output
 */
function formatDefaultValue(
  value: string | number | boolean | undefined,
  _type: ParamType
): string {
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false'
  }
  if (typeof value === 'number') {
    return String(value)
  }
  return String(value ?? '')
}

/**
 * Generate a command block for the header
 */
function generateCommandBlock(cmd: PluginCommand, sink?: BlockSink, keepRequire = false): string[] {
  const lines: string[] = []
  const owner = `Command "${cmd.name}"`

  lines.push(` * @command ${blockValue(sink, `${owner} @command`, cmd.name)}`)

  if (cmd.text && cmd.text !== cmd.name) {
    lines.push(` * @text ${blockValue(sink, `${owner} @text`, cmd.text)}`)
  }

  if (cmd.desc) {
    lines.push(` * @desc ${blockValue(sink, `${owner} @desc`, cmd.desc)}`)
  }

  // Command arguments
  for (const arg of cmd.args) {
    const argOwner = `${owner} argument "${arg.name}"`
    lines.push(' *')
    lines.push(` * @arg ${blockValue(sink, `${argOwner} @arg`, arg.name)}`)

    if (arg.text && arg.text !== arg.name) {
      lines.push(` * @text ${blockValue(sink, `${argOwner} @text`, arg.text)}`)
    }

    if (arg.desc) {
      lines.push(` * @desc ${blockValue(sink, `${argOwner} @desc`, arg.desc)}`)
    }

    lines.push(` * @type ${blockValue(sink, `${argOwner} @type`, formatParamType(arg))}`)

    // Boolean-specific @on/@off labels
    if (arg.type === 'boolean') {
      if (arg.onLabel) lines.push(` * @on ${blockValue(sink, `${argOwner} @on`, arg.onLabel)}`)
      if (arg.offLabel) lines.push(` * @off ${blockValue(sink, `${argOwner} @off`, arg.offLabel)}`)
    }

    if (arg.type === 'number') {
      if (arg.min !== undefined)
        lines.push(` * @min ${blockValue(sink, `${argOwner} @min`, String(arg.min))}`)
      if (arg.max !== undefined)
        lines.push(` * @max ${blockValue(sink, `${argOwner} @max`, String(arg.max))}`)
      if (arg.decimals !== undefined)
        lines.push(
          ` * @decimals ${blockValue(sink, `${argOwner} @decimals`, String(arg.decimals))}`
        )
    }

    if ((arg.type === 'file' || arg.type === 'animation') && arg.dir) {
      lines.push(` * @dir ${blockValue(sink, `${argOwner} @dir`, arg.dir)}`)
    }
    // @require dropped (MV-era, discontinued in MZ), except where raw mode keeps the file's line
    if (keepRequire && arg.require) lines.push(' * @require 1')

    if ((arg.type === 'select' || arg.type === 'combo') && arg.options) {
      for (const opt of arg.options) {
        lines.push(` * @option ${blockValue(sink, `${argOwner} @option`, opt.text)}`)
        if (opt.value !== opt.text) {
          lines.push(` * @value ${blockValue(sink, `${argOwner} @value`, opt.value)}`)
        }
      }
    }

    if (arg.default !== undefined && arg.default !== '') {
      lines.push(
        ` * @default ${blockValue(sink, `${argOwner} @default`, formatDefaultValue(arg.default, arg.type))}`
      )
    }
  }

  return lines
}

/**
 * Generate localized header blocks for multi-language support
 */
function generateLocalizedHeaders(plugin: PluginDefinition, sink?: BlockSink): string | null {
  const localizations = plugin.meta.localizations
  if (!localizations || Object.keys(localizations).length === 0) {
    return null
  }

  const parts: string[] = []

  for (const [lang, content] of Object.entries(localizations)) {
    if (!LOCALIZATION_KEY.test(lang)) continue
    if (!content.description && !content.help) continue

    const lines: string[] = []
    lines.push(`/*:${blockValue(sink, `Localization "${lang}"`, lang)}`)

    if (content.description) {
      lines.push(
        ` * @plugindesc ${blockValue(sink, `Localization "${lang}" @plugindesc`, content.description)}`
      )
    }

    if (content.help) {
      lines.push(' * @help')
      for (const helpLine of content.help.split('\n')) {
        lines.push(` * ${blockValue(sink, `Localization "${lang}" @help`, helpLine)}`)
      }
    }

    lines.push(' */')
    parts.push(lines.join('\n'))
  }

  return parts.length > 0 ? parts.join('\n\n') : null
}

/**
 * Generate struct definition comment block
 */
function generateStructDefinition(
  struct: PluginStruct,
  sink?: BlockSink,
  keepRequire = false
): string {
  const lines: string[] = []

  lines.push(`/*~struct~${blockValue(sink, `Struct "${struct.name}"`, struct.name)}:`)

  for (const param of struct.parameters) {
    const owner = `Struct "${struct.name}" field "${param.name}"`
    lines.push(...generateParameterBlock(param, ' * ', owner, sink, keepRequire))
    lines.push(' *')
  }

  lines.push(' */')

  return lines.join('\n')
}

/**
 * Generate the plugin body (IIFE with parameter parsing and command registration)
 * Always regenerates template sections (param parsing, command registration)
 * and appends preserved custom code.
 */
function generateBody(plugin: PluginDefinition): string {
  const lines: string[] = []

  lines.push('(() => {')
  lines.push(`    'use strict';`)
  lines.push('')

  // Plugin name constant
  const pluginName = plugin.meta.name || 'NewPlugin'
  lines.push(`    const PLUGIN_NAME = '${escapeJSString(pluginName)}';`)
  lines.push('')

  // Parse parameters if any exist
  if (plugin.parameters.length > 0) {
    lines.push('    // Parse plugin parameters')
    lines.push('    const params = PluginManager.parameters(PLUGIN_NAME);')
    lines.push('')

    for (const param of plugin.parameters) {
      // Skip section divider parameters (they're just for organization in MZ editor)
      if (param.name.includes('---') || param.name.includes('===')) continue
      lines.push(`    const ${camelCase(param.name)} = ${generateParamParser(param)};`)
    }

    lines.push('')
  }

  // Register commands if any exist (skip commands already handled in customCode).
  // Strip comments first so `// registerCommand(PLUGIN_NAME, 'Foo')` doesn't
  // suppress generation of Foo. String literals are preserved so real calls
  // (with the command name in quotes) still match.
  const customCode = plugin.customCode || ''
  const alreadyRegistered = customCode
    ? findRegisteredCommandNames(stripCommentsOnly(customCode), pluginName)
    : new Set<string>()
  const commandsToGenerate = plugin.commands.filter((cmd) => !alreadyRegistered.has(cmd.name))

  if (commandsToGenerate.length > 0) {
    lines.push('    // Register plugin commands')

    for (const cmd of commandsToGenerate) {
      lines.push('')
      lines.push(
        `    PluginManager.registerCommand(PLUGIN_NAME, '${escapeJSString(cmd.name)}', function(args) {`
      )

      // Parse command arguments
      for (const arg of cmd.args) {
        lines.push(`        const ${camelCase(arg.name)} = ${generateArgParser(arg)};`)
      }

      lines.push('')
      lines.push('        // TODO: Implement command logic')
      if (cmd.args.length > 0) {
        lines.push(
          `        // Parsed args available as: ${cmd.args.map((a) => camelCase(a.name)).join(', ')}`
        )
      }
      lines.push('    });')
    }

    lines.push('')
  }

  // Add preserved custom code or placeholder
  if (plugin.customCode && plugin.customCode.trim()) {
    lines.push('    // ========== Custom Plugin Code ==========')
    // Indent the custom code properly — always add 4-space base indent for IIFE nesting
    const customLines = plugin.customCode.split('\n')
    for (const customLine of customLines) {
      if (customLine.trim() === '') {
        lines.push('')
      } else {
        lines.push(`    ${customLine}`)
      }
    }
    lines.push('')
  } else {
    lines.push('    // Custom plugin code goes here')
    lines.push('')
  }

  lines.push('})();')

  return lines.join('\n')
}

/** Whether raw mode can rewrite the file's main annotation block (/*: or /*:en). */
export function hasMainBlock(source: string): boolean {
  return findAnnotationBlocks(source).some((b) => b.kind === 'main')
}

/** A separator parameter only groups others in the MZ editor; no code reads it. */
const isSeparator = (name: string): boolean => name.includes('---') || name.includes('===')

/** Raw mode had code to place in a file that does not parse as JavaScript. */
export class RawModeParseError extends Error {
  constructor(readonly parseError: string) {
    super(`The file is not valid JavaScript: ${parseError}`)
    this.name = 'RawModeParseError'
  }
}

/** Parses code the way MZ loads a plugin: as a classic script. */
const parseScript = (code: string): Program =>
  parse(code, { ecmaVersion: 'latest', sourceType: 'script' })

/** Why `code` does not parse as a classic script, or null when it does. */
export function scriptParseError(code: string): string | null {
  try {
    parseScript(code)
    return null
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
  const children: AnyNode[] = []
  for (const value of Object.values(node)) {
    if (Array.isArray(value)) children.push(...value.filter(isNode))
    else if (isNode(value)) children.push(value)
  }
  return children
}

/** Adds every name the code declares or reads to `names`; property names and labels are not names. */
function collectNames(node: AnyNode, names: Set<string>): void {
  if (node.type === 'Identifier') {
    names.add(node.name)
    return
  }
  const notAName =
    node.type === 'MemberExpression' && !node.computed
      ? node.property
      : (node.type === 'Property' ||
            node.type === 'MethodDefinition' ||
            node.type === 'PropertyDefinition') &&
          !node.computed
        ? node.key
        : node.type === 'LabeledStatement' ||
            node.type === 'BreakStatement' ||
            node.type === 'ContinueStatement'
          ? node.label
          : null
  for (const child of childNodes(node)) if (child !== notAName) collectNames(child, names)
}

type CalledFunction = (FunctionExpression | ArrowFunctionExpression) & { body: BlockStatement }

/** The function a statement calls in place: `(function () {…})()`, `(function () {…}())`, `(() => {…})()`. */
function calledFunction(statement: AnyNode): CalledFunction | null {
  if (statement.type !== 'ExpressionStatement') return null
  if (statement.expression.type !== 'CallExpression') return null
  const callee = statement.expression.callee
  return (callee.type === 'FunctionExpression' || callee.type === 'ArrowFunctionExpression') &&
    callee.body.type === 'BlockStatement'
    ? (callee as CalledFunction)
    : null
}

/** Whether the code calls `PluginManager.parameters`, outside the functions it defines. */
function readsParameters(node: AnyNode): boolean {
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
  return childNodes(node).some(readsParameters)
}

function declares(statement: AnyNode, name: string): boolean {
  if (statement.type === 'VariableDeclaration') {
    return statement.declarations.some((d) => d.id.type === 'Identifier' && d.id.name === name)
  }
  return (
    (statement.type === 'FunctionDeclaration' || statement.type === 'ClassDeclaration') &&
    statement.id?.name === name
  )
}

/** Index `end`, or the start of the next line when only blanks or a line comment follow it. */
function afterNode(source: string, end: number): number {
  const lineEnd = source.indexOf('\n', end)
  const rest = source.slice(end, lineEnd === -1 ? source.length : lineEnd)
  if (!/^[ \t]*(?:\/\/.*)?\r?$/.test(rest)) return end
  return lineEnd === -1 ? source.length : lineEnd + 1
}

/** Where raw mode puts code it adds to a file, read from the file's syntax tree. */
interface Placement {
  /** Start of the first top-level IIFE: a struct block without a block of its own goes there */
  iifeStart: number | null
  /** The body of the IIFE added code goes into; null for the script's top level */
  body: BlockStatement | null
  /** The variable the file reads its parameters into, and the end of its declaration */
  parameters: { name: string; end: number } | null
  /** Where code for added parameters goes when the file has no parameters variable */
  start: number
  /** The index from which the file's own `PLUGIN_NAME` holds its value in that scope */
  pluginNameFrom: number | null
  /** Every name the file declares or reads; a name added code declares is added here */
  names: Set<string>
}

/** Where added code goes: the parameters variable's scope, else the first IIFE, else the top level. */
function placementOf(source: string): Placement {
  let program: Program
  try {
    program = parseScript(source)
  } catch (error) {
    if (error instanceof SyntaxError) throw new RawModeParseError(error.message)
    throw error
  }
  const statements = program.body
  const called = statements.map(calledFunction)
  const first = called.findIndex((fn) => fn !== null)

  // The first declaration of the top level or of a top-level IIFE body reading the parameters
  let parameters: { name: string; end: number; owner: number | null } | null = null
  for (let i = 0; i < statements.length && parameters === null; i++) {
    const fn = called[i]
    for (const statement of fn === null ? [statements[i]] : fn.body.body) {
      if (statement.type !== 'VariableDeclaration') continue
      const declarator = statement.declarations.find(
        (d) => d.id.type === 'Identifier' && d.init != null && readsParameters(d.init)
      )
      if (declarator !== undefined && declarator.id.type === 'Identifier') {
        parameters = { name: declarator.id.name, end: statement.end, owner: fn === null ? null : i }
        break
      }
    }
  }
  const owner = parameters !== null ? parameters.owner : first === -1 ? null : first
  const fn = owner === null ? null : called[owner]
  const scope = fn === null ? statements : fn.body.body

  const own = scope.find((s) => declares(s, 'PLUGIN_NAME'))
  let pluginNameFrom = own === undefined ? null : own.end
  if (fn !== null && owner !== null && pluginNameFrom === null) {
    const outer = statements.find((s) => declares(s, 'PLUGIN_NAME'))
    const isParam = fn.params.some((p) => p.type === 'Identifier' && p.name === 'PLUGIN_NAME')
    if (isParam || (outer !== undefined && outer.end <= statements[owner].start)) {
      pluginNameFrom = fn.body.start
    }
  }

  let start = source.length
  if (fn !== null) {
    const directives = scope.filter(
      (s) => s.type === 'ExpressionStatement' && s.directive !== undefined
    )
    start = afterNode(source, directives.at(-1)?.end ?? fn.body.start + 1)
    if (own !== undefined) start = Math.max(start, afterNode(source, own.end))
  }

  const names = new Set<string>()
  collectNames(program, names)
  return {
    iifeStart: first === -1 ? null : statements[first].start,
    body: fn === null ? null : fn.body,
    parameters: parameters && { name: parameters.name, end: parameters.end },
    start,
    pluginNameFrom,
    names
  }
}

/** `name`, suffixed with `_` until no name of the file uses it; then taken. */
function freeName(place: Placement, name: string): string {
  let free = name
  while (place.names.has(free)) free += '_'
  place.names.add(free)
  return free
}

/**
 * Generate plugin output in "raw mode" for an imported plugin: the file's own text, with only
 * the annotation blocks whose content changed since `baseline` rewritten and code added only
 * for parameters and commands absent from `baseline`. Language blocks are never touched, the
 * file's line endings are kept, and an unedited plugin is written back byte for byte.
 */
export function generateRawMode(plugin: PluginDefinition, baseline: PluginBaseline): string {
  const source = plugin.rawSource
  if (!source) {
    throw new Error('generateRawMode needs rawSource')
  }
  const eol = source.includes('\r\n') ? '\r\n' : '\n'
  const blocks = findAnnotationBlocks(source)
  // Replacements of [start, end) in the source; text is built with \n
  const edits: { start: number; end: number; text: string }[] = []
  // Read from the syntax tree, only when code or a block is added
  let parsed: Placement | undefined
  const placement = (): Placement => (parsed ??= placementOf(source))

  // 1. The main block, when its rendering changed
  const main = blocks.find((b) => b.kind === 'main')
  const header = generateHeader(plugin, undefined, true)
  if (main !== undefined && header !== generateHeader(baseline, undefined, true)) {
    const preamble = extractHeaderPreamble(
      source.slice(main.start, main.end).replace(/\r\n/g, '\n')
    )
    const rest = header.slice(header.indexOf('\n') + 1)
    edits.push({ start: main.start, end: main.end, text: `${main.opener}\n${preamble}${rest}` })
  }

  // 2. Struct blocks: a struct's own block (bare, else :en) is rewritten when its rendering
  // changed; translated blocks stay; a struct without its own block is added before the IIFE
  for (const struct of plugin.structs) {
    const text = generateStructDefinition(struct, undefined, true)
    const before = baseline.structs.find((s) => s.name === struct.name)
    if (before !== undefined && generateStructDefinition(before, undefined, true) === text) continue
    const own = blocks.filter((b) => b.kind === 'struct' && b.structName === struct.name)
    const block = own.find((b) => b.lang === '') ?? own.find((b) => b.lang === 'en')
    if (block !== undefined) {
      edits.push({
        start: block.start,
        end: block.end,
        text: block.opener + text.slice(text.indexOf('\n'))
      })
    } else {
      const at = placement().iifeStart
      edits.push(
        at === null
          ? { start: source.length, end: source.length, text: `\n\n${text}` }
          : { start: at, end: at, text: `${text}\n\n` }
      )
    }
  }

  const pluginName = plugin.meta.name || 'NewPlugin'
  // The constant added code declares for the plugin name when the file's own is out of reach,
  // and whether it went into the IIFE body, where later added code can read it too
  let nameConstant: string | undefined
  let nameInBody = false
  const pluginNameAt = (place: Placement, at: number): { name: string; line?: string } => {
    if (place.pluginNameFrom !== null && place.pluginNameFrom <= at) return { name: 'PLUGIN_NAME' }
    nameConstant ??= freeName(place, 'PLUGIN_NAME')
    return {
      name: nameConstant,
      line: `    const ${nameConstant} = '${escapeJSString(pluginName)}';`
    }
  }
  // At the script top level a block keeps added names out of the scope every plugin shares
  const wrap = (place: Placement, lines: string[]): string =>
    place.body === null ? `{\n${lines.join('\n')}\n}` : lines.join('\n')

  // 3. Parsing code for parameters added since load, after the file's parameters variable when
  // it has one
  const knownParams = new Set(baseline.parameters.map((p) => p.name))
  const newParams = plugin.parameters.filter(
    (p) => !isSeparator(p.name) && !knownParams.has(p.name)
  )
  if (newParams.length > 0) {
    const place = placement()
    const lines: string[] = []
    let variable = place.parameters?.name
    const at = place.parameters === null ? place.start : afterNode(source, place.parameters.end)
    if (variable === undefined) {
      const { name, line } = pluginNameAt(place, at)
      if (line !== undefined) {
        lines.push(line)
        nameInBody = place.body !== null
      }
      variable = freeName(place, 'params')
      lines.push(`    const ${variable} = PluginManager.parameters(${name});`)
    }
    lines.push(`    // --- New parameters (added by MZ Plugin Studio) ---`)
    for (const param of newParams) {
      const accessor = `${variable}['${escapeJSString(param.name)}']`
      const constant = freeName(place, camelCase(param.name))
      lines.push(`    const ${constant} = ${generateAccessorParser(accessor, param)};`)
    }
    lines.push(`    // --- End new parameters ---`)
    edits.push({ start: at, end: at, text: `\n${wrap(place, lines)}\n` })
  }

  // 4. Registration code for commands added since load, at the end of the IIFE body
  const knownCommands = new Set(baseline.commands.map((c) => c.name))
  const newCommands = plugin.commands.filter((cmd) => !knownCommands.has(cmd.name))
  if (newCommands.length > 0) {
    const place = placement()
    // The start of the line closing the body, or the closing brace when code shares its line
    let at = source.length
    if (place.body !== null) {
      const close = place.body.end - 1
      const lineStart = source.lastIndexOf('\n', close) + 1
      at = /^[ \t]*$/.test(source.slice(lineStart, close)) ? lineStart : close
    }
    const lines: string[] = []
    let name = nameConstant
    if (!nameInBody || name === undefined) {
      const reach = pluginNameAt(place, at)
      name = reach.name
      if (reach.line !== undefined) lines.push(reach.line)
    }
    lines.push(`    // --- New commands (added by MZ Plugin Studio) ---`)
    for (const cmd of newCommands) {
      lines.push(
        `    PluginManager.registerCommand(${name}, '${escapeJSString(cmd.name)}', function(args) {`
      )
      const argNames = new Set<string>()
      const constants = cmd.args.map((arg) => {
        let constant = camelCase(arg.name)
        while (argNames.has(constant)) constant += '_'
        argNames.add(constant)
        return constant
      })
      cmd.args.forEach((arg, i) => {
        lines.push(`        const ${constants[i]} = ${generateArgParser(arg)};`)
      })
      lines.push('')
      lines.push('        // TODO: Implement command logic')
      if (cmd.args.length > 0) {
        lines.push(`        // Parsed args available as: ${constants.join(', ')}`)
      }
      lines.push('    });')
    }
    lines.push(`    // --- End new commands ---`)
    edits.push(
      place.body === null
        ? { start: at, end: at, text: `\n${wrap(place, lines)}\n` }
        : { start: at, end: at, text: `\n${lines.join('\n')}\n\n` }
    )
  }

  // Apply from the end so earlier offsets stay valid; at one offset a replacement goes before
  // an insertion, and insertions keep their order
  let output = source
  const ordered = edits
    .map((e, i) => ({ ...e, i }))
    .sort((a, b) => b.start - a.start || b.end - a.end || b.i - a.i)
  for (const edit of ordered) {
    const text = eol === '\n' ? edit.text : edit.text.replace(/\n/g, eol)
    output = output.slice(0, edit.start) + text + output.slice(edit.end)
  }
  return output
}

/**
 * Extract preamble text from an MZ annotation comment block (/*: ... ).
 * Captures license text, version history, social links, etc. that appear
 * before the first recognized MZ annotation (@target, @plugindesc, etc.).
 */
function extractHeaderPreamble(blockContent: string): string {
  // Line 0 is the opener of the main block
  const lines = blockContent.split('\n')

  // Known MZ annotation tags that mark the end of the preamble
  const mzAnnotation =
    /^\s*\*\s*@(?:target|plugindesc|author|url|base|orderAfter|orderBefore|param|command|help|noteParam|noteType|noteDir|noteData|noteRequire|requiredAssets|require)\b/

  const preambleLines: string[] = []
  for (let i = 1; i < lines.length; i++) {
    if (mzAnnotation.test(lines[i])) break
    preambleLines.push(lines[i])
  }

  if (preambleLines.length === 0) return ''

  return preambleLines.join('\n') + '\n'
}

/**
 * Generate body using original codeBody (for plugins that shouldn't be regenerated)
 * Use this when you want to preserve the exact original implementation.
 */
export function generateBodyPreserved(plugin: PluginDefinition): string {
  if (plugin.codeBody) {
    return plugin.codeBody
  }
  return generateBody(plugin)
}

/**
 * Generate a parsing expression for a parameter/argument accessor.
 */
function generateAccessorParser(accessor: string, param: PluginParameter): string {
  const defaultVal = formatJSDefault(param.default, param.type)

  switch (param.type) {
    case 'number':
      return `Number(${accessor} || ${defaultVal})`

    case 'boolean': {
      // MZ omits the param key entirely when the user never opens the Plugin
      // Manager, so `accessor` may be undefined even when @default is true.
      // Nullish-coalesce to the declared default before comparing.
      const defBool = param.default === true ? 'true' : 'false'
      return `(${accessor} ?? '${defBool}') === 'true'`
    }

    case 'location':
      return `JSON.parse(${accessor} || '{"mapId":"0","x":"0","y":"0"}')`

    case 'struct': {
      const fallback =
        param.default && typeof param.default === 'string' && param.default !== ''
          ? escapeJSString(escapeBlockComment(param.default))
          : '{}'
      return `JSON.parse(${accessor} || '${fallback}')`
    }

    case 'array': {
      // MZ double-encodes struct<X>[]: outer JSON array of JSON strings.
      // Without the inner parse each element remains a string literal.
      const inner = param.arrayType
      if (inner === 'struct' && param.structType) {
        return `JSON.parse(${accessor} || '[]').map(s => JSON.parse(s))`
      }
      if (inner === 'number' || (inner && ID_BASED_PARAM_TYPES.has(inner))) {
        return `JSON.parse(${accessor} || '[]').map(Number)`
      }
      if (inner === 'boolean') {
        return `JSON.parse(${accessor} || '[]').map(v => v === 'true')`
      }
      return `JSON.parse(${accessor} || '[]')`
    }

    default:
      if (ID_BASED_PARAM_TYPES.has(param.type)) {
        return `Number(${accessor} || ${defaultVal})`
      }
      return `${accessor} || ${defaultVal}`
  }
}

function generateParamParser(param: PluginParameter): string {
  return generateAccessorParser(`params['${escapeJSString(param.name)}']`, param)
}

function generateArgParser(arg: PluginParameter): string {
  return generateAccessorParser(`args['${escapeJSString(arg.name)}']`, arg)
}

/**
 * Format default value for JavaScript code
 */
function formatJSDefault(value: string | number | boolean | undefined, type: ParamType): string {
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false'
  }
  if (typeof value === 'number') {
    return String(value)
  }
  if (type === 'number' || ID_BASED_PARAM_TYPES.has(type)) {
    return '0'
  }
  return `'${escapeJSString(escapeBlockComment(String(value ?? '')))}'`
}

// Reserved words that would cause a SyntaxError if used as `const <name>`.
// Includes ES2024 reserved + strict-mode reserved + contextual keywords that
// collide inside `'use strict'` IIFEs, plus `eval`/`arguments` (not bindable in
// strict mode) and `params`/`args` (declared by the generated code itself).
// Suffixing with `_` is safer than prefixing because it preserves the visible
// name in generated code.
const JS_RESERVED: ReadonlySet<string> = new Set([
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
 * Convert parameter name to a valid JS camelCase identifier.
 * Guarantees: output is always a syntactically legal strict-mode identifier
 * (never a reserved word, never starts with a digit, never empty).
 */
export function camelCase(str: string): string {
  if (!str) return 'unnamed'
  // Fast path: already a valid identifier with no separators (e.g. myCombo → myCombo)
  if (/^[a-zA-Z$][a-zA-Z0-9$]*$/.test(str)) {
    const normalized = str.charAt(0).toLowerCase() + str.slice(1)
    return sanitizeIdentifier(normalized)
  }
  // Strip leading/trailing underscores, split on non-alphanumeric
  const stripped = str.replace(/^_+|_+$/g, '')
  const words = stripped
    .replace(/[^a-zA-Z0-9]/g, ' ')
    .split(' ')
    .filter(Boolean)
  const result = words
    .map((word, index) => {
      if (index === 0) {
        // First word: lowercase first char, preserve rest (keeps internal camelCase)
        return word.charAt(0).toLowerCase() + word.slice(1)
      }
      // Subsequent words: uppercase first char, preserve rest
      return word.charAt(0).toUpperCase() + word.slice(1)
    })
    .join('')
  return sanitizeIdentifier(result)
}

function sanitizeIdentifier(name: string): string {
  if (!name) return 'unnamed'
  // Digit-start: prefix with underscore so `const 123abc` becomes `const _123abc`
  if (/^[0-9]/.test(name)) {
    return '_' + name
  }
  // Reserved word: suffix with underscore so `const class` becomes `const class_`
  if (JS_RESERVED.has(name)) {
    return name + '_'
  }
  return name
}

/**
 * Generate only the header portion (for quick preview)
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
 * Validate a plugin definition
 * Note: RPG Maker MZ allows any string for parameter names (often used as section dividers like "---Settings---")
 * We only strictly validate plugin name and command names since those are used in code.
 */
export function validatePlugin(plugin: PluginDefinition): {
  valid: boolean
  errors: string[]
  warnings: string[]
} {
  const errors: string[] = []
  const warnings: string[] = []

  // Plugin name must be a valid identifier (used in PluginManager.parameters())
  if (!plugin.meta.name || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(plugin.meta.name)) {
    errors.push(
      'Plugin name must be a valid identifier (letters, numbers, underscores, cannot start with number)'
    )
  }

  for (const lang of Object.keys(plugin.meta.localizations ?? {})) {
    if (!LOCALIZATION_KEY.test(lang)) {
      errors.push(
        `Localization "${lang}" is left out: a language code may contain only letters and underscores.`
      )
    }
  }

  // Check for duplicate parameter names (but allow any string - MZ supports it)
  const paramNames = new Set<string>()
  // Collect post-transform identifiers to detect collisions after camelCase sanitization
  const identifierOrigins = new Map<string, string>()
  for (const param of plugin.parameters) {
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
    if (param.name && !/^[A-Za-z_][A-Za-z0-9_]*$/.test(param.name)) {
      if (!isSectionDivider) {
        warnings.push(
          `Parameter "${param.name}" is not a valid JS identifier (will still work in MZ)`
        )
      }
    }

    // Post-transform collision detection: two params with different raw names
    // can camelCase() to the same identifier (e.g., "foo-bar" and "Foo Bar")
    // which produces duplicate `const` declarations inside the IIFE.
    if (param.name && !isSectionDivider) {
      const identifier = camelCase(param.name)
      const previousOrigin = identifierOrigins.get(identifier)
      if (previousOrigin && previousOrigin !== param.name) {
        errors.push(
          `Parameters "${previousOrigin}" and "${param.name}" both generate identifier "${identifier}" — rename one to avoid a duplicate declaration`
        )
      } else {
        identifierOrigins.set(identifier, param.name)
      }

      // Warn about reserved-word and digit-start transforms so users know the
      // generated variable differs from their parameter name.
      if (identifier !== param.name) {
        if (JS_RESERVED.has(param.name)) {
          warnings.push(
            `Parameter "${param.name}" is a reserved name; the generated variable will be "${identifier}"`
          )
        } else if (/^[0-9]/.test(param.name)) {
          warnings.push(
            `Parameter "${param.name}" starts with a digit; the generated variable will be "${identifier}"`
          )
        }
      }
    }
  }

  // Command names must be valid identifiers (used in PluginManager.registerCommand())
  const cmdNames = new Set<string>()
  for (const cmd of plugin.commands) {
    if (cmdNames.has(cmd.name)) {
      errors.push(`Duplicate command name: ${cmd.name}`)
    }
    cmdNames.add(cmd.name)

    if (!cmd.name || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(cmd.name)) {
      errors.push(`Invalid command name: ${cmd.name} (must be valid identifier)`)
    }

    // Check command arguments
    const argNames = new Set<string>()
    for (const arg of cmd.args) {
      if (argNames.has(arg.name)) {
        errors.push(`Duplicate argument name in command ${cmd.name}: ${arg.name}`)
      }
      argNames.add(arg.name)
    }

    if (MZ_BUILTIN_COMMANDS.has(cmd.name)) {
      warnings.push(`Command "${cmd.name}" shadows a built-in RPG Maker MZ command`)
    }
  }

  // Check struct references
  const structNames = new Set(plugin.structs.map((s) => s.name))
  for (const param of plugin.parameters) {
    if (param.type === 'struct' && param.structType && !structNames.has(param.structType)) {
      warnings.push(
        `Parameter "${param.name}" references struct "${param.structType}" which is not defined in this plugin`
      )
    }
  }

  // Validate struct param defaults are valid JSON
  for (const param of plugin.parameters) {
    if (
      param.type === 'struct' &&
      typeof param.default === 'string' &&
      param.default.trim() !== '' &&
      param.default.trim() !== '{}'
    ) {
      try {
        const parsed = JSON.parse(param.default)
        if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
          warnings.push(`Parameter "${param.name}" struct default is not a valid JSON object`)
        }
      } catch {
        warnings.push(`Parameter "${param.name}" has invalid JSON in struct default`)
      }
    }
  }

  // Unused struct definitions (warning)
  const referencedStructs = new Set<string>()
  for (const param of plugin.parameters) {
    if (param.structType) referencedStructs.add(param.structType)
  }
  for (const cmd of plugin.commands) {
    for (const arg of cmd.args) {
      if (arg.structType) referencedStructs.add(arg.structType)
    }
  }
  for (const struct of plugin.structs) {
    if (!referencedStructs.has(struct.name)) {
      warnings.push(
        `Struct "${struct.name}" is defined but not referenced by any parameter or command argument`
      )
    }
  }

  // Parameters referencing nonexistent parent (error)
  for (const param of plugin.parameters) {
    if (param.parent && !paramNames.has(param.parent)) {
      errors.push(`Parameter "${param.name}" references nonexistent parent "${param.parent}"`)
    }
  }

  // Commands with no implementation in custom code (warning)
  if (plugin.customCode) {
    // Ignore comments to avoid false positives (e.g., a `// 'Heal'` note counting as impl)
    const strippedImpl = stripCommentsOnly(plugin.customCode)
    for (const cmd of plugin.commands) {
      const hasImplementation =
        strippedImpl.includes(`'${cmd.name}'`) || strippedImpl.includes(`"${cmd.name}"`)
      if (!hasImplementation) {
        warnings.push(`Command "${cmd.name}" has no implementation in custom code`)
      }
    }
  }

  // Field text written escaped or read by MZ as a tag (warning, once per field and kind)
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
        `${field}: "*/" is written as "*\\/" so it cannot end the comment.`
      )
    }
    const tag = /@(\w+)/.exec(value)
    if (tag) {
      report(`tag ${field}`, `${field}: "@${tag[1]}" is read by MZ as a new annotation tag.`)
    }
  }
  generateHeader(plugin, collect)
  generateLocalizedHeaders(plugin, collect)
  for (const struct of plugin.structs) {
    generateStructDefinition(struct, collect)
  }

  return { valid: errors.length === 0, errors, warnings }
}

/**
 * Generate a command skeleton for insertion into customCode
 */
export function generateCommandSkeleton(cmd: PluginCommand): string {
  const lines: string[] = []
  lines.push(`// --- ${escapeLineComment(cmd.name)} ---`)
  lines.push(
    `PluginManager.registerCommand(PLUGIN_NAME, '${escapeJSString(cmd.name)}', function(args) {`
  )
  lines.push(`    // TODO: Implement ${escapeJSString(cmd.name)} logic`)
  lines.push('});')
  return lines.join('\n')
}

/**
 * Generate a parameter usage comment for insertion into customCode
 */
export function generateParameterComment(param: PluginParameter): string {
  const text = `Parameter '${param.name}' (${param.type}) is available as: ${camelCase(param.name)}`
  return `// ${escapeLineComment(text)}`
}
