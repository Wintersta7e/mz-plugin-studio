import type {
  PluginBaseline,
  PluginDefinition,
  PluginParameter,
  PluginCommand,
  PluginStruct,
  ParamType
} from '../../types/plugin'
import { ID_BASED_PARAM_TYPES } from '../../types/plugin'
import { escapeBlockComment, escapeJSString, escapeLineComment } from './escape'
import { stripCommentsAndStrings, stripCommentsOnly } from '../../../../shared/override-extractor'
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
 * Generate the plugin header comment block with all metadata, parameters, and commands
 */
function generateHeader(plugin: PluginDefinition, sink?: BlockSink): string {
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
  // of the spec and is dropped.
  for (const np of plugin.meta.noteParams || []) {
    lines.push(` * @noteParam ${blockValue(sink, 'Plugin @noteParam', np.name)}`)
    lines.push(` * @noteType ${blockValue(sink, 'Plugin @noteType', np.type)}`)
    if (np.dir) lines.push(` * @noteDir ${blockValue(sink, 'Plugin @noteDir', np.dir)}`)
    if (np.data) lines.push(` * @noteData ${blockValue(sink, 'Plugin @noteData', np.data)}`)
  }

  // Required assets — preserved during "Exclude unused files" deployment.
  for (const asset of plugin.meta.requiredAssets || []) {
    lines.push(` * @requiredAssets ${blockValue(sink, 'Plugin @requiredAssets', asset)}`)
  }

  lines.push(' *')

  // Parameters
  for (const param of plugin.parameters) {
    lines.push(...generateParameterBlock(param, ' * ', `Parameter "${param.name}"`, sink))
    lines.push(' *')
  }

  // Commands
  for (const cmd of plugin.commands) {
    lines.push(...generateCommandBlock(cmd, sink))
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
  sink?: BlockSink
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
  // Use @requiredAssets at the plugin level instead.

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
function generateCommandBlock(cmd: PluginCommand, sink?: BlockSink): string[] {
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
    // @require dropped (MV-era, discontinued in MZ)

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
function generateStructDefinition(struct: PluginStruct, sink?: BlockSink): string {
  const lines: string[] = []

  lines.push(`/*~struct~${blockValue(sink, `Struct "${struct.name}"`, struct.name)}:`)

  for (const param of struct.parameters) {
    const owner = `Struct "${struct.name}" field "${param.name}"`
    lines.push(...generateParameterBlock(param, ' * ', owner, sink))
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

const IIFE_OPEN = /\(\s*\(\s*\)\s*(?:=>)?\s*\{/
const IIFE_CLOSE_LINE = /^\s*\}\s*\)\s*\(\s*\)\s*;?\s*$/gm

/** Index just past the line holding `index`, or the end of the text. */
function afterLine(text: string, index: number): number {
  const lineEnd = text.indexOf('\n', index)
  return lineEnd === -1 ? text.length : lineEnd + 1
}

/** Index of the parenthesis closing the one at `open`, in comment- and string-stripped code. */
function closingParen(stripped: string, open: number): number {
  let depth = 0
  for (let i = open; i < stripped.length; i++) {
    if (stripped[i] === '(') depth++
    else if (stripped[i] === ')' && --depth === 0) return i
  }
  return -1
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
  const stripped = stripCommentsAndStrings(source)
  // Replacements of [start, end) in the source; text is built with \n
  const edits: { start: number; end: number; text: string }[] = []

  // 1. The main block, when its rendering changed
  const main = blocks.find((b) => b.kind === 'main')
  const header = generateHeader(plugin)
  if (main !== undefined && header !== generateHeader(baseline)) {
    const preamble = extractHeaderPreamble(
      source.slice(main.start, main.end).replace(/\r\n/g, '\n')
    )
    const rest = header.slice(header.indexOf('\n') + 1)
    edits.push({ start: main.start, end: main.end, text: `${main.opener}\n${preamble}${rest}` })
  }

  // 2. Struct blocks: a struct's own block (bare, else :en) is rewritten when its rendering
  // changed; translated blocks stay; a struct without its own block is added before the IIFE
  const iifeOpen = IIFE_OPEN.exec(stripped)
  for (const struct of plugin.structs) {
    const text = generateStructDefinition(struct)
    const before = baseline.structs.find((s) => s.name === struct.name)
    if (before !== undefined && generateStructDefinition(before) === text) continue
    const own = blocks.filter((b) => b.kind === 'struct' && b.structName === struct.name)
    const block = own.find((b) => b.lang === '') ?? own.find((b) => b.lang === 'en')
    if (block !== undefined) {
      edits.push({
        start: block.start,
        end: block.end,
        text: block.opener + text.slice(text.indexOf('\n'))
      })
    } else if (iifeOpen !== null) {
      edits.push({ start: iifeOpen.index, end: iifeOpen.index, text: `${text}\n\n` })
    } else {
      edits.push({ start: source.length, end: source.length, text: `\n\n${text}` })
    }
  }

  const pluginName = plugin.meta.name || 'NewPlugin'
  const nameLine = `    const PLUGIN_NAME = '${escapeJSString(pluginName)}';`
  const hasPluginName = /\bPLUGIN_NAME\b/.test(stripped)
  let declaredPluginName = false

  // 3. Parsing code for parameters added since load, after the parameters call when there is one
  const knownParams = new Set(baseline.parameters.map((p) => p.name))
  const newParams = plugin.parameters.filter(
    (p) => !isSeparator(p.name) && !knownParams.has(p.name)
  )
  if (newParams.length > 0) {
    const lines: string[] = []
    const call = stripped.indexOf('PluginManager.parameters(')
    const close =
      call === -1 ? -1 : closingParen(stripped, call + 'PluginManager.parameters'.length)
    // The variable the file keeps its parameters in, when the call is assigned to one
    const variable =
      close === -1
        ? undefined
        : /(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*$/.exec(
            stripped.slice(stripped.lastIndexOf('\n', call) + 1, call)
          )?.[1]
    if (variable === undefined) {
      if (!hasPluginName) {
        lines.push(nameLine)
        declaredPluginName = true
      }
      lines.push(`    const params = PluginManager.parameters(PLUGIN_NAME);`)
    }
    lines.push(`    // --- New parameters (added by MZ Plugin Studio) ---`)
    for (const param of newParams) {
      const accessor = `${variable ?? 'params'}['${escapeJSString(param.name)}']`
      lines.push(`    const ${camelCase(param.name)} = ${generateAccessorParser(accessor, param)};`)
    }
    lines.push(`    // --- End new parameters ---`)
    const strict = stripCommentsOnly(source).indexOf("'use strict'")
    const at =
      variable !== undefined
        ? afterLine(source, close)
        : strict !== -1
          ? afterLine(source, strict)
          : iifeOpen !== null
            ? afterLine(source, iifeOpen.index + iifeOpen[0].length)
            : -1
    if (at === -1) {
      edits.push({
        start: source.length,
        end: source.length,
        text: `\n{\n${lines.join('\n')}\n}\n`
      })
      declaredPluginName = false
    } else {
      edits.push({ start: at, end: at, text: `\n${lines.join('\n')}\n` })
    }
  }

  // 4. Registration code for commands added since load, before the closing IIFE line
  const knownCommands = new Set(baseline.commands.map((c) => c.name))
  const newCommands = plugin.commands.filter((cmd) => !knownCommands.has(cmd.name))
  if (newCommands.length > 0) {
    let closing = -1
    for (const match of stripped.matchAll(IIFE_CLOSE_LINE)) {
      // The start of the line holding the closing brace (the match may begin on a blank line)
      closing = stripped.lastIndexOf('\n', match.index + match[0].indexOf('}')) + 1
    }
    const lines: string[] = []
    if (!hasPluginName && (!declaredPluginName || closing === -1)) lines.push(nameLine)
    lines.push(`    // --- New commands (added by MZ Plugin Studio) ---`)
    for (const cmd of newCommands) {
      lines.push(
        `    PluginManager.registerCommand(PLUGIN_NAME, '${escapeJSString(cmd.name)}', function(args) {`
      )
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
    lines.push(`    // --- End new commands ---`)
    edits.push(
      closing === -1
        ? { start: source.length, end: source.length, text: `\n{\n${lines.join('\n')}\n}\n` }
        : { start: closing, end: closing, text: `\n${lines.join('\n')}\n\n` }
    )
  }

  // Apply from the end so earlier offsets stay valid; equal offsets keep their order
  let output = source
  const ordered = edits.map((e, i) => ({ ...e, i })).sort((a, b) => b.start - a.start || b.i - a.i)
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
// collide inside `'use strict'` IIFEs. Suffixing with `_` is safer than
// prefixing because it preserves the visible name in generated code.
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
  'of'
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
            `Parameter "${param.name}" is a JS reserved word; the generated variable will be "${identifier}"`
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
