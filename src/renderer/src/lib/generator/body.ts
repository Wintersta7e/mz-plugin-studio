import {
  ID_BASED_PARAM_TYPES,
  type ParamType,
  type PluginCommand,
  type PluginDefinition,
  type PluginParameter
} from '../../types/plugin'
import { annotationText, escapeJSString, escapeLineComment } from './escape'
import {
  formatDefaultValue,
  generateHeader,
  generateLocalizedHeaders,
  generateStructDefinition
} from './header'
import { camelCase } from './naming'
import { stripCommentsOnly } from '../../../../shared/override-extractor'

/**
A parameter, argument or command name as the single-quoted string generated code reads it by:
the text MZ reads from its annotation line, so the key matches what MZ passes in.
*/
export function quotedAnnotationName(name: string): string {
  return `'${escapeJSString(annotationText(name))}'`
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
An added command's registration, its arguments parsed into constants with distinct names.
*/
export function registrationLines(command: PluginCommand, name: string): string[] {
  const lines = [
    `    PluginManager.registerCommand(${name}, ${quotedAnnotationName(command.name)}, function(args) {`
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
Generate a parsing expression for a parameter/argument accessor.
*/
export function generateAccessorParser(accessor: string, param: PluginParameter): string {
  // With the key absent the code reads the header's `@default` text as MZ stores it, whatever
  // JavaScript type the default was given (a parameter file may hold a number for a text type)
  const shown = annotationText(formatDefaultValue(param.default))
  const defaultValue = formatJSDefault(shown, param.type)

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
      const defaultText = shown === 'true' ? 'true' : 'false'
      return `(${accessor} ?? '${defaultText}') === 'true'`
    }

    case 'location': {
      return `JSON.parse(${accessor} || '${jsonFallback(shown, '{"mapId":"0","x":"0","y":"0"}')}')`
    }

    case 'struct': {
      return `JSON.parse(${accessor} || '${jsonFallback(shown, '{}')}')`
    }

    case 'array': {
      // MZ double-encodes struct<X>[]: outer JSON array of JSON strings.
      // Without the inner parse each element remains a string literal.
      const parsed = `JSON.parse(${accessor} || '${jsonFallback(shown, '[]')}')`
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
The JSON text a struct, array or location reads when its key is absent: the `@default` text
shown, else `empty`.
*/
function jsonFallback(shown: string, empty: string): string {
  return shown === '' ? empty : escapeJSString(shown)
}

function generateParamParser(param: PluginParameter): string {
  return generateAccessorParser(`params[${quotedAnnotationName(param.name)}]`, param)
}

function generateArgParser(arg: PluginParameter): string {
  return generateAccessorParser(`args[${quotedAnnotationName(arg.name)}]`, arg)
}

/**
The JavaScript literal a number or scalar falls back to: the `@default` text shown, read as a
number for a number or ID-based type (0 when there is none), else as that text.
*/
function formatJSDefault(shown: string, type: ParamType): string {
  if (type === 'number' || ID_BASED_PARAM_TYPES.has(type)) {
    return shown === '' ? '0' : String(Number(shown))
  }
  return `'${escapeJSString(shown)}'`
}

/**
Generate a command skeleton for insertion into customCode
*/
export function generateCommandSkeleton(command: PluginCommand): string {
  const lines = [
    `// --- ${escapeLineComment(command.name)} ---`,
    `PluginManager.registerCommand(PLUGIN_NAME, ${quotedAnnotationName(command.name)}, function(args) {`,
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
