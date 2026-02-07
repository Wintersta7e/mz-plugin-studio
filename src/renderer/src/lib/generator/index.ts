import type {
  PluginDefinition,
  PluginParameter,
  PluginCommand,
  PluginStruct,
  ParamType
} from '../../types/plugin'

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

  if (param.type === 'file' && param.dir) {
    lines.push(`${prefix}@dir ${param.dir}`)
  }

  // Options for select type
  if (param.type === 'select' && param.options) {
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
  if (param.type === 'struct' && param.structType) {
    return `struct<${param.structType}>`
  }

  if (param.type === 'array') {
    if (param.structType) {
      return `struct<${param.structType}>[]`
    }
    if (param.arrayType) {
      return `${param.arrayType}[]`
    }
    return 'string[]'
  }

  return param.type
}

/**
 * Format a default value for output
 */
function formatDefaultValue(value: string | number | boolean | undefined, _type: ParamType): string {
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

    if (arg.type === 'file' && arg.dir) {
      lines.push(` * @dir ${arg.dir}`)
    }

    if (arg.type === 'select' && arg.options) {
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
  lines.push(`    const PLUGIN_NAME = '${pluginName}';`)
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
    (cmd) => !customCode.includes(`registerCommand(PLUGIN_NAME, '${cmd.name}'`)
  )

  if (commandsToGenerate.length > 0) {
    lines.push('    // Register plugin commands')

    for (const cmd of commandsToGenerate) {
      lines.push('')
      lines.push(`    PluginManager.registerCommand(PLUGIN_NAME, '${cmd.name}', function(args) {`)

      // Parse command arguments
      for (const arg of cmd.args) {
        lines.push(`        const ${camelCase(arg.name)} = ${generateArgParser(arg)};`)
      }

      lines.push('')
      lines.push('        // TODO: Implement command logic')
      lines.push(`        console.log('${cmd.name} called with:', { ${cmd.args.map((a) => camelCase(a.name)).join(', ')} });`)
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
 * Generate parameter parsing expression
 */
function generateParamParser(param: PluginParameter): string {
  const accessor = `params['${param.name}']`
  const defaultVal = formatJSDefault(param.default, param.type)

  switch (param.type) {
    case 'number':
      return `Number(${accessor} || ${defaultVal})`

    case 'boolean':
      return `${accessor} === 'true'`

    case 'struct':
      return `JSON.parse(${accessor} || '{}')`

    case 'array':
      return `JSON.parse(${accessor} || '[]')`

    case 'variable':
    case 'switch':
    case 'actor':
    case 'class':
    case 'skill':
    case 'item':
    case 'weapon':
    case 'armor':
    case 'enemy':
    case 'troop':
    case 'state':
    case 'animation':
    case 'tileset':
    case 'common_event':
      return `Number(${accessor} || ${defaultVal})`

    default:
      return `${accessor} || ${defaultVal}`
  }
}

/**
 * Generate command argument parsing expression
 */
function generateArgParser(arg: PluginParameter): string {
  const accessor = `args['${arg.name}']`
  const defaultVal = formatJSDefault(arg.default, arg.type)

  switch (arg.type) {
    case 'number':
      return `Number(${accessor} || ${defaultVal})`

    case 'boolean':
      return `${accessor} === 'true'`

    case 'struct':
      return `JSON.parse(${accessor} || '{}')`

    case 'array':
      return `JSON.parse(${accessor} || '[]')`

    case 'variable':
    case 'switch':
    case 'actor':
    case 'class':
    case 'skill':
    case 'item':
    case 'weapon':
    case 'armor':
    case 'enemy':
    case 'troop':
    case 'state':
    case 'animation':
    case 'tileset':
    case 'common_event':
      return `Number(${accessor} || ${defaultVal})`

    default:
      return `${accessor} || ${defaultVal}`
  }
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
  if (type === 'number' || type === 'variable' || type === 'switch' ||
      type === 'actor' || type === 'class' || type === 'skill' ||
      type === 'item' || type === 'weapon' || type === 'armor' ||
      type === 'enemy' || type === 'troop' || type === 'state' ||
      type === 'animation' || type === 'tileset' || type === 'common_event') {
    return '0'
  }
  return `'${String(value ?? '').replace(/'/g, "\\'")}'`
}

/**
 * Convert parameter name to camelCase
 */
export function camelCase(str: string): string {
  if (!str) return 'unnamed'
  return str
    .replace(/[^a-zA-Z0-9]/g, ' ')
    .split(' ')
    .map((word, index) =>
      index === 0 ? word.toLowerCase() : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    )
    .join('') || 'unnamed'
}

/**
 * Generate only the header portion (for quick preview)
 */
export function generateHeaderOnly(plugin: PluginDefinition): string {
  return generateHeader(plugin)
}

/**
 * Validate a plugin definition
 * Note: RPG Maker MZ allows any string for parameter names (often used as section dividers like "---Settings---")
 * We only strictly validate plugin name and command names since those are used in code.
 */
export function validatePlugin(plugin: PluginDefinition): { valid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = []
  const warnings: string[] = []

  // Plugin name must be a valid identifier (used in PluginManager.parameters())
  if (!plugin.meta.name || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(plugin.meta.name)) {
    errors.push('Plugin name must be a valid identifier (letters, numbers, underscores, cannot start with number)')
  }

  // Check for duplicate parameter names (but allow any string - MZ supports it)
  const paramNames = new Set<string>()
  for (const param of plugin.parameters) {
    if (!param.name) {
      errors.push('Parameter name cannot be empty')
    } else if (paramNames.has(param.name)) {
      errors.push(`Duplicate parameter name: ${param.name}`)
    }
    paramNames.add(param.name)

    // Warn (not error) if parameter name isn't a valid identifier - it will still work in MZ
    // but won't be easily accessible in code
    if (param.name && !/^[A-Za-z_][A-Za-z0-9_]*$/.test(param.name)) {
      // Don't warn for obvious section dividers (contain dashes or are all caps with spaces)
      const isSectionDivider = param.name.includes('---') || param.name.includes('===')
      if (!isSectionDivider) {
        warnings.push(`Parameter "${param.name}" is not a valid JS identifier (will still work in MZ)`)
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
  }

  // Check struct references
  const structNames = new Set(plugin.structs.map((s) => s.name))
  for (const param of plugin.parameters) {
    if (param.type === 'struct' && param.structType && !structNames.has(param.structType)) {
      warnings.push(`Parameter "${param.name}" references struct "${param.structType}" which is not defined in this plugin`)
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
  lines.push(`PluginManager.registerCommand(PLUGIN_NAME, '${cmd.name}', function(args) {`)
  lines.push(`    // TODO: Implement ${cmd.name} logic`)
  lines.push('});')
  return lines.join('\n')
}

/**
 * Generate a parameter usage comment for insertion into customCode
 */
export function generateParameterComment(param: PluginParameter): string {
  return `// Parameter '${param.name}' (${param.type}) is available as: ${camelCase(param.name)}`
}
