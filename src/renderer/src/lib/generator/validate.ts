import type {
  PluginCommand,
  PluginDefinition,
  PluginParameter,
  PluginStruct
} from '../../types/plugin'
import { escapeBlockComment } from './escape'
import {
  HELP_TAG_LINE,
  LOCALIZATION_KEY,
  generateHeader,
  generateLocalizedHeaders,
  generateStructDefinition,
  type BlockSink
} from './header'
import { JS_RESERVED, camelCase, isIdentifierName } from './naming'
import { stripCommentsOnly } from '../../../../shared/override-extractor'
import { COMPACT_PARAM_TAG } from '../../../../shared/compact-param'
import { unsafeFileNameReason } from '../../../../shared/file-name'

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
  checkStructNames(plugin.structs, problems)
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
  // The code passes the name to PluginManager.parameters() as a quoted string, and MZ loads the
  // plugin from `<name>.js`, so the name follows the file-name rule
  const name = plugin.meta.name
  const reason = unsafeFileNameReason(`${name}.js`)
  if (name === '') {
    errors.push('Plugin name is required')
  } else if (reason !== undefined) {
    errors.push(`Plugin name cannot be used as a file name: ${reason}`)
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
Struct names the file reader cannot read back (error: it reads `\w+` only), and names with an
underscore, which the reader keeps but RPG Maker MZ's editor refuses (warning).
*/
function checkStructNames(
  structs: readonly PluginStruct[],
  { errors, warnings }: ValidationProblems
): void {
  for (const { name } of structs) {
    if (!/^\w+$/.test(name)) {
      errors.push(
        `Struct "${name}" has a name the studio cannot read back: use only letters, digits and underscores`
      )
    }
    if (name.includes('_')) {
      warnings.push(
        `Struct "${name}" contains "_": RPG Maker MZ's editor accepts only letters and digits in a struct name`
      )
    }
  }
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
