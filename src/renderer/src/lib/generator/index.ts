import type {
  PluginDefinition,
  PluginParameter,
  PluginCommand,
  PluginStruct,
  ParamType
} from '../../types/plugin'
import { ID_BASED_PARAM_TYPES } from '../../types/plugin'
import { escapeJSString } from './escape'
import { stripCommentsAndStrings } from '../../../../shared/override-extractor'

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
function generateHeader(plugin: PluginDefinition): string {
  const lines: string[] = []

  lines.push('/*:')

  // Target
  if (plugin.meta.target) {
    lines.push(` * @target ${plugin.meta.target}`)
  }

  // Plugin description
  if (plugin.meta.description) {
    lines.push(` * @plugindesc ${plugin.meta.description}`)
  }

  // Author
  if (plugin.meta.author) {
    lines.push(` * @author ${plugin.meta.author}`)
  }

  // URL
  if (plugin.meta.url) {
    lines.push(` * @url ${plugin.meta.url}`)
  }

  // Dependencies
  for (const dep of plugin.meta.dependencies) {
    lines.push(` * @base ${dep}`)
  }

  // Order After
  for (const order of plugin.meta.orderAfter || []) {
    lines.push(` * @orderAfter ${order}`)
  }

  // Order Before
  for (const order of plugin.meta.orderBefore || []) {
    lines.push(` * @orderBefore ${order}`)
  }

  // Note Parameters (deployment notetag groups)
  // Kadokawa's MZ annotation reference documents only four note-asset tags:
  // @noteParam / @noteType / @noteDir / @noteData. @noteRequire is not part
  // of the spec and is dropped.
  for (const np of plugin.meta.noteParams || []) {
    lines.push(` * @noteParam ${np.name}`)
    lines.push(` * @noteType ${np.type}`)
    if (np.dir) lines.push(` * @noteDir ${np.dir}`)
    if (np.data) lines.push(` * @noteData ${np.data}`)
  }

  // Required assets — preserved during "Exclude unused files" deployment.
  for (const asset of plugin.meta.requiredAssets || []) {
    lines.push(` * @requiredAssets ${asset}`)
  }

  lines.push(' *')

  // Parameters
  for (const param of plugin.parameters) {
    lines.push(...generateParameterBlock(param, ' * '))
    lines.push(' *')
  }

  // Commands
  for (const cmd of plugin.commands) {
    lines.push(...generateCommandBlock(cmd))
    lines.push(' *')
  }

  // Help text
  if (plugin.meta.help) {
    lines.push(' * @help')
    for (const helpLine of plugin.meta.help.split('\n')) {
      lines.push(` * ${helpLine}`)
    }
  }

  lines.push(' */')

  return lines.join('\n')
}

/**
 * Generate a parameter block for the header
 */
function generateParameterBlock(param: PluginParameter, prefix: string = ' * '): string[] {
  const lines: string[] = []

  lines.push(`${prefix}@param ${param.name}`)

  if (param.text && param.text !== param.name) {
    lines.push(`${prefix}@text ${param.text}`)
  }

  if (param.desc) {
    lines.push(`${prefix}@desc ${param.desc}`)
  }

  // Type
  lines.push(`${prefix}@type ${formatParamType(param)}`)

  // Boolean-specific @on/@off labels
  if (param.type === 'boolean') {
    if (param.onLabel) {
      lines.push(`${prefix}@on ${param.onLabel}`)
    }
    if (param.offLabel) {
      lines.push(`${prefix}@off ${param.offLabel}`)
    }
  }

  // Type-specific attributes
  if (param.type === 'number') {
    if (param.min !== undefined) {
      lines.push(`${prefix}@min ${param.min}`)
    }
    if (param.max !== undefined) {
      lines.push(`${prefix}@max ${param.max}`)
    }
    if (param.decimals !== undefined) {
      lines.push(`${prefix}@decimals ${param.decimals}`)
    }
  }

  if ((param.type === 'file' || param.type === 'animation') && param.dir) {
    lines.push(`${prefix}@dir ${param.dir}`)
  }
  // @require is MV-era — explicitly discontinued in MZ per Kadokawa docs.
  // Use @requiredAssets at the plugin level instead.

  // Options for select/combo type
  if ((param.type === 'select' || param.type === 'combo') && param.options) {
    for (const opt of param.options) {
      lines.push(`${prefix}@option ${opt.text}`)
      if (opt.value !== opt.text) {
        lines.push(`${prefix}@value ${opt.value}`)
      }
    }
  }

  // Default value
  if (param.default !== undefined && param.default !== '') {
    lines.push(`${prefix}@default ${formatDefaultValue(param.default, param.type)}`)
  }

  // Parent (for nested parameters)
  if (param.parent) {
    lines.push(`${prefix}@parent ${param.parent}`)
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
function generateCommandBlock(cmd: PluginCommand): string[] {
  const lines: string[] = []

  lines.push(` * @command ${cmd.name}`)

  if (cmd.text && cmd.text !== cmd.name) {
    lines.push(` * @text ${cmd.text}`)
  }

  if (cmd.desc) {
    lines.push(` * @desc ${cmd.desc}`)
  }

  // Command arguments
  for (const arg of cmd.args) {
    lines.push(' *')
    lines.push(` * @arg ${arg.name}`)

    if (arg.text && arg.text !== arg.name) {
      lines.push(` * @text ${arg.text}`)
    }

    if (arg.desc) {
      lines.push(` * @desc ${arg.desc}`)
    }

    lines.push(` * @type ${formatParamType(arg)}`)

    // Boolean-specific @on/@off labels
    if (arg.type === 'boolean') {
      if (arg.onLabel) lines.push(` * @on ${arg.onLabel}`)
      if (arg.offLabel) lines.push(` * @off ${arg.offLabel}`)
    }

    if (arg.type === 'number') {
      if (arg.min !== undefined) lines.push(` * @min ${arg.min}`)
      if (arg.max !== undefined) lines.push(` * @max ${arg.max}`)
      if (arg.decimals !== undefined) lines.push(` * @decimals ${arg.decimals}`)
    }

    if ((arg.type === 'file' || arg.type === 'animation') && arg.dir) {
      lines.push(` * @dir ${arg.dir}`)
    }
    // @require dropped (MV-era, discontinued in MZ)

    if ((arg.type === 'select' || arg.type === 'combo') && arg.options) {
      for (const opt of arg.options) {
        lines.push(` * @option ${opt.text}`)
        if (opt.value !== opt.text) {
          lines.push(` * @value ${opt.value}`)
        }
      }
    }

    if (arg.default !== undefined && arg.default !== '') {
      lines.push(` * @default ${formatDefaultValue(arg.default, arg.type)}`)
    }
  }

  return lines
}

/**
 * Generate localized header blocks for multi-language support
 */
function generateLocalizedHeaders(plugin: PluginDefinition): string | null {
  const localizations = plugin.meta.localizations
  if (!localizations || Object.keys(localizations).length === 0) {
    return null
  }

  const parts: string[] = []

  for (const [lang, content] of Object.entries(localizations)) {
    if (!content.description && !content.help) continue

    const lines: string[] = []
    lines.push(`/*:${lang}`)

    if (content.description) {
      lines.push(` * @plugindesc ${content.description}`)
    }

    if (content.help) {
      lines.push(' * @help')
      for (const helpLine of content.help.split('\n')) {
        lines.push(` * ${helpLine}`)
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
function generateStructDefinition(struct: PluginStruct): string {
  const lines: string[] = []

  lines.push(`/*~struct~${struct.name}:`)

  for (const param of struct.parameters) {
    lines.push(...generateParameterBlock(param, ' * '))
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

  // Register commands if any exist (skip commands already handled in customCode)
  const customCode = plugin.customCode || ''
  const commandsToGenerate = plugin.commands.filter(
    (cmd) =>
      !customCode.includes(`registerCommand(PLUGIN_NAME, '${cmd.name}'`) &&
      !customCode.includes(`registerCommand(PLUGIN_NAME, "${cmd.name}"`) &&
      !customCode.includes(`registerCommand("${pluginName}", '${cmd.name}'`) &&
      !customCode.includes(`registerCommand("${pluginName}", "${cmd.name}"`)
  )

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
      lines.push(
        `        console.log('${escapeJSString(cmd.name)} called with:', { ${cmd.args.map((a) => camelCase(a.name)).join(', ')} });`
      )
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

/**
 * Generate plugin output in "raw mode": only regenerate the metadata header
 * blocks (main header, localized headers, struct definitions) while preserving
 * the original code body verbatim from rawSource.
 *
 * This ensures maximum round-trip fidelity for imported plugins — only the
 * structured metadata that the UI can edit is regenerated; all code remains
 * exactly as the original author wrote it.
 */
export function generateRawMode(plugin: PluginDefinition): string {
  if (!plugin.rawSource) {
    return generatePlugin(plugin)
  }

  let output = plugin.rawSource

  // 1. Replace the main /*: ... */ block with regenerated header
  // The main header is /*: followed by whitespace/newline (not a language code like /*:ja or /*:en).
  // Use a regex to find /*: that is NOT followed by two lowercase letters (BUG-13 fix).
  const mainHeaderRe = /\/\*:(?![a-z]{2})/g
  const mainHeaderMatch = mainHeaderRe.exec(output)
  if (!mainHeaderMatch) {
    return generatePlugin(plugin)
  }
  const mainStart = mainHeaderMatch.index

  const mainEnd = output.indexOf('*/', mainStart + 3)
  if (mainEnd === -1) {
    return generatePlugin(plugin)
  }

  // Extract preamble (license, version history, etc.) from original block
  const originalBlock = output.slice(mainStart, mainEnd + 2)
  const preamble = extractHeaderPreamble(originalBlock)

  // Build replacement header with preamble injected
  const header = generateHeader(plugin)
  let newMain: string
  if (preamble) {
    const firstNL = header.indexOf('\n')
    newMain = header.slice(0, firstNL + 1) + preamble + header.slice(firstNL + 1)
  } else {
    newMain = header
  }

  output = output.slice(0, mainStart) + newMain + output.slice(mainEnd + 2)

  // 2. Replace existing /*~struct~Name: ... */ blocks and add new ones
  for (const struct of plugin.structs) {
    const tag = `/*~struct~${struct.name}:`
    const sStart = output.indexOf(tag)
    if (sStart !== -1) {
      const sEnd = output.indexOf('*/', sStart + tag.length)
      if (sEnd !== -1) {
        const newStruct = generateStructDefinition(struct)
        output = output.slice(0, sStart) + newStruct + output.slice(sEnd + 2)
      }
    } else {
      // New struct — insert before the IIFE or at end of header section
      const newStruct = generateStructDefinition(struct)
      const iifeMatch = output.match(/\(\s*\(\s*\)\s*(?:=>)?\s*\{/)
      if (iifeMatch && iifeMatch.index !== undefined) {
        output =
          output.slice(0, iifeMatch.index) + newStruct + '\n\n' + output.slice(iifeMatch.index)
      } else {
        output += '\n\n' + newStruct
      }
    }
  }

  // 3. Inject parameter parsing for new parameters not already in the body
  // Strip comments/strings so we don't match param names inside string literals (BUG-15)
  const strippedOutput = stripCommentsAndStrings(output)
  if (plugin.parameters.length > 0) {
    const newParams = plugin.parameters.filter(
      (p) =>
        !p.name.includes('---') &&
        !p.name.includes('===') &&
        !strippedOutput.includes(`params['${p.name}']`) &&
        !strippedOutput.includes(`params["${p.name}"]`)
    )
    if (newParams.length > 0) {
      const pluginName = plugin.meta.name || 'NewPlugin'
      const parsingLines: string[] = []

      // Check if PluginManager.parameters() already exists in body
      const hasParamsDecl = output.includes('PluginManager.parameters(')
      if (!hasParamsDecl) {
        parsingLines.push(`    const PLUGIN_NAME = '${escapeJSString(pluginName)}';`)
        parsingLines.push(`    const params = PluginManager.parameters(PLUGIN_NAME);`)
      }

      parsingLines.push(`    // --- New parameters (added by MZ Plugin Studio) ---`)
      for (const param of newParams) {
        parsingLines.push(`    const ${camelCase(param.name)} = ${generateParamParser(param)};`)
      }
      parsingLines.push(`    // --- End new parameters ---`)

      // Find injection point: after existing params declaration, or after 'use strict', or after IIFE opening
      const injection = '\n' + parsingLines.join('\n') + '\n'
      const paramsIdx = output.indexOf('PluginManager.parameters(')
      if (paramsIdx !== -1) {
        // Inject after the line that contains PluginManager.parameters(...)
        const lineEnd = output.indexOf('\n', paramsIdx)
        if (lineEnd !== -1) {
          output = output.slice(0, lineEnd + 1) + injection + output.slice(lineEnd + 1)
        }
      } else {
        // No existing params — inject after 'use strict' or IIFE opening
        const strictIdx = output.indexOf("'use strict'")
        if (strictIdx !== -1) {
          const lineEnd = output.indexOf('\n', strictIdx)
          if (lineEnd !== -1) {
            output = output.slice(0, lineEnd + 1) + injection + output.slice(lineEnd + 1)
          }
        } else {
          const iifeMatch = output.match(/\(\s*\(\s*\)\s*(?:=>)?\s*\{/)
          if (iifeMatch && iifeMatch.index !== undefined) {
            const iifeEnd = iifeMatch.index + iifeMatch[0].length
            const nextNL = output.indexOf('\n', iifeEnd)
            if (nextNL !== -1) {
              output = output.slice(0, nextNL + 1) + injection + output.slice(nextNL + 1)
            }
          }
        }
      }
    }
  }

  // 4. Inject command registration for new commands not already in the body
  // Re-strip after potential param injection to check against clean source (BUG-15)
  const strippedForCmds = stripCommentsAndStrings(output)
  const newCommands = plugin.commands.filter(
    (cmd) =>
      !strippedForCmds.includes(`registerCommand(PLUGIN_NAME, '${cmd.name}'`) &&
      !strippedForCmds.includes(`registerCommand(PLUGIN_NAME, "${cmd.name}"`) &&
      !strippedForCmds.includes(`registerCommand("${plugin.meta.name}", '${cmd.name}'`) &&
      !strippedForCmds.includes(`registerCommand("${plugin.meta.name}", "${cmd.name}"`)
  )
  if (newCommands.length > 0) {
    const pluginName = plugin.meta.name || 'NewPlugin'
    const cmdLines: string[] = []

    // Ensure PLUGIN_NAME exists
    if (!output.includes('PLUGIN_NAME')) {
      cmdLines.push(`    const PLUGIN_NAME = '${escapeJSString(pluginName)}';`)
    }

    cmdLines.push(`    // --- New commands (added by MZ Plugin Studio) ---`)
    for (const cmd of newCommands) {
      cmdLines.push(
        `    PluginManager.registerCommand(PLUGIN_NAME, '${escapeJSString(cmd.name)}', function(args) {`
      )
      for (const arg of cmd.args) {
        cmdLines.push(`        const ${camelCase(arg.name)} = ${generateArgParser(arg)};`)
      }
      cmdLines.push('')
      cmdLines.push(`        // TODO: Implement ${escapeJSString(cmd.name)} logic`)
      cmdLines.push(
        `        console.log('${escapeJSString(cmd.name)} called with:', { ${cmd.args.map((a) => camelCase(a.name)).join(', ')} });`
      )
      cmdLines.push('    });')
    }
    cmdLines.push(`    // --- End new commands ---`)

    // Find injection point: before closing })(); — match only when at start of a line
    // (not inside strings/comments). Scan backwards to find the last occurrence.
    const iifeClosingRe = /^\s*\}\s*\)\s*\(\s*\)\s*;?\s*$/gm
    let closingIife = -1
    let iifeCloseMatch: RegExpExecArray | null
    while ((iifeCloseMatch = iifeClosingRe.exec(output)) !== null) {
      closingIife = iifeCloseMatch.index
    }
    if (closingIife !== -1) {
      const injection = '\n' + cmdLines.join('\n') + '\n'
      output = output.slice(0, closingIife) + injection + '\n' + output.slice(closingIife)
    }
  }

  return output
}

/**
 * Extract preamble text from an MZ annotation comment block (/*: ... ).
 * Captures license text, version history, social links, etc. that appear
 * before the first recognized MZ annotation (@target, @plugindesc, etc.).
 */
function extractHeaderPreamble(blockContent: string): string {
  const lines = blockContent.split('\n')

  // Line 0 is the /*: opener — only extract from main header, not /*:ja etc.
  if (!/^\/\*:\s*$/.test(lines[0].replace(/\r$/, ''))) return ''

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
          ? escapeJSString(param.default)
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
  return `'${escapeJSString(String(value ?? ''))}'`
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
    for (const cmd of plugin.commands) {
      const hasImplementation =
        plugin.customCode.includes(`'${cmd.name}'`) || plugin.customCode.includes(`"${cmd.name}"`)
      if (!hasImplementation) {
        warnings.push(`Command "${cmd.name}" has no implementation in custom code`)
      }
    }
  }

  return { valid: errors.length === 0, errors, warnings }
}

/**
 * Generate a command skeleton for insertion into customCode
 */
export function generateCommandSkeleton(cmd: PluginCommand): string {
  const lines: string[] = []
  lines.push(`// --- ${cmd.name} ---`)
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
  return `// Parameter '${param.name}' (${param.type}) is available as: ${camelCase(param.name)}`
}
