import type {
  NoteParam,
  PluginCommand,
  PluginDefinition,
  PluginMeta,
  PluginParameter,
  PluginStruct
} from '../../types/plugin'
import { annotationText } from './escape'

/**
Receives each field's text as it is written into an annotation comment, with its label.
*/
export type BlockSink = (field: string, value: string) => void

/**
A language code MZ reads after `/*:`; any other key is left out of the output.
*/
export const LOCALIZATION_KEY = /^[A-Z_]+$/i

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
export const HELP_TAG_LINE = /^(\s*)@/

/**
A help line as written: a zero-width space goes before a leading `@`, so MZ shows the line
as help instead of reading it as a tag. A guarded line starts with that space, which is not
whitespace, so writing it again adds no second one.
*/
function helpText(line: string): string {
  return line.replace(HELP_TAG_LINE, '$1\u{200B}@')
}

/**
Generate the plugin header comment block with all metadata, parameters, and commands.
`shouldKeepRequire` writes the `@noteRequire` and `@require` lines an imported file had, which
raw mode keeps when it rewrites the file's blocks. `isVersionShown` false leaves `@version` out.
*/
export function generateHeader(
  plugin: PluginDefinition,
  sink?: BlockSink,
  shouldKeepRequire = false,
  isVersionShown = true
): string {
  const lines: string[] = [
    '/*:',
    ...headerMetaLines(plugin.meta, sink, shouldKeepRequire, isVersionShown),
    ' *'
  ]

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
The header's plugin-level tags, from `@target` to `@requiredAssets`; `@version` only when
`isVersionShown` and the version is set.
*/
function headerMetaLines(
  meta: PluginMeta,
  sink: BlockSink | undefined,
  shouldKeepRequire: boolean,
  isVersionShown: boolean
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

  // Version
  if (isVersionShown && meta.version) {
    lines.push(` * @version ${blockValue(sink, 'Plugin @version', meta.version)}`)
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
export function formatDefaultValue(value: string | number | boolean): string {
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
export function generateLocalizedHeaders(
  plugin: PluginDefinition,
  sink?: BlockSink
): string | undefined {
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
export function generateStructDefinition(
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
Generate only the header portion (for quick preview)
*/
export function generateHeaderOnly(plugin: PluginDefinition): string {
  return generateHeader(plugin)
}
