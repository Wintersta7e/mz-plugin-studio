// Plugin Definition Types

export type ParamType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'select'
  | 'combo'
  | 'variable'
  | 'switch'
  | 'actor'
  | 'class'
  | 'skill'
  | 'item'
  | 'weapon'
  | 'armor'
  | 'enemy'
  | 'troop'
  | 'state'
  | 'animation'
  | 'tileset'
  | 'common_event'
  | 'file'
  | 'icon'
  | 'map'
  | 'location'
  | 'note'
  | 'color'
  | 'text'
  | 'hidden'
  | 'struct'
  | 'array'

export interface SelectOption {
  value: string
  text: string
}

export interface PluginParameter {
  id: string
  name: string // Internal identifier
  text: string // Display label
  desc: string // Description/help text
  type: ParamType
  default: string | number | boolean
  // Type-specific options
  min?: number
  max?: number
  decimals?: number
  options?: SelectOption[] // For select/combo type
  structType?: string // Reference to struct name
  arrayType?: ParamType // For array types
  dir?: string // For file type, directory
  require?: boolean // For file/animation type, @require 1
  parent?: string // For nested parameters
  rawType?: string // Original @type string for round-trip fidelity (e.g., 'color', 'nuumer')
  // Boolean-specific labels
  onLabel?: string // @on label for booleans
  offLabel?: string // @off label for booleans
}

export interface PluginCommand {
  id: string
  name: string // Internal identifier
  text: string // Display label
  desc: string // Description/help text
  args: PluginParameter[]
}

export interface PluginStruct {
  id: string
  name: string
  parameters: PluginParameter[]
}

export interface LocalizedContent {
  description?: string
  help?: string
}

export interface NoteParam {
  name: string // @noteParam value
  type: string // @noteType (usually 'file')
  dir?: string // @noteDir
  data?: string // @noteData (e.g. 'actors', 'enemies')
  require?: boolean // @noteRequire 1
}

export interface PluginMeta {
  name: string
  version: string
  author: string
  description: string
  help: string
  url: string
  target: string
  dependencies: string[]
  orderAfter?: string[] // @orderAfter entries (multiple allowed)
  orderBefore?: string[] // @orderBefore entries (multiple allowed)
  noteParams?: NoteParam[] // @noteParam groups for deployment
  requiredAssets?: string[] // @requiredAssets — assets preserved during "Exclude unused files" deploy
  localizations?: Record<string, LocalizedContent> // { 'ja': {...}, 'zh': {...} }
}

export interface PluginDefinition {
  id: string
  meta: PluginMeta
  parameters: PluginParameter[]
  commands: PluginCommand[]
  structs: PluginStruct[]
  codeBody?: string // Original full body (for reference/fallback)
  customCode?: string // User's custom implementation (extracted from body, always preserved)
  rawSource?: string // Original full file content (for raw mode)
  importedFrom?: string // File name the plugin was loaded from; unset for plugins created here
}

/**
The definition an imported plugin was loaded with, without the file text it came from.
*/
export type PluginBaseline = Omit<PluginDefinition, 'rawSource' | 'codeBody' | 'customCode'>

export function toBaseline(definition: PluginDefinition): PluginBaseline {
  const baseline = { ...definition }
  delete baseline.rawSource
  delete baseline.codeBody
  delete baseline.customCode
  return baseline
}

// Default empty plugin
// Lazy import to avoid circular dependency - settings store may not exist yet
const settingsSource: { getter: (() => { defaultAuthor: string }) | null } = { getter: null }

export function setSettingsGetter(getter: () => { defaultAuthor: string }): void {
  settingsSource.getter = getter
}

/**
Parameter types that represent numeric database IDs in RPG Maker MZ.
Used by the generator (accessor parser, formatJSDefault) and export formats (paramTypeToTS).
*/
export const ID_BASED_PARAM_TYPES: ReadonlySet<ParamType> = new Set<ParamType>([
  'variable',
  'switch',
  'actor',
  'class',
  'skill',
  'item',
  'weapon',
  'armor',
  'enemy',
  'troop',
  'state',
  'animation',
  'tileset',
  'common_event',
  'icon',
  'map'
])

/**
All valid ParamType values, for runtime validation of imported data.
*/
export const ALL_PARAM_TYPES: ReadonlySet<string> = new Set<string>([
  'string',
  'number',
  'boolean',
  'select',
  'combo',
  'variable',
  'switch',
  'actor',
  'class',
  'skill',
  'item',
  'weapon',
  'armor',
  'enemy',
  'troop',
  'state',
  'animation',
  'tileset',
  'common_event',
  'file',
  'icon',
  'map',
  'location',
  'note',
  'color',
  'text',
  'hidden',
  'struct',
  'array'
])

export function createEmptyPlugin(): PluginDefinition {
  const settings = settingsSource.getter?.()
  return {
    id: crypto.randomUUID(),
    meta: {
      name: 'NewPlugin',
      version: '1.0.0',
      author: settings?.defaultAuthor ?? '',
      description: '',
      help: '',
      url: '',
      target: 'MZ',
      dependencies: [],
      orderAfter: [],
      orderBefore: [],
      noteParams: [],
      localizations: {}
    },
    parameters: [],
    commands: [],
    structs: []
  }
}

export function createEmptyParameter(): PluginParameter {
  return {
    id: crypto.randomUUID(),
    name: 'NewParameter',
    text: 'New Parameter',
    desc: '',
    type: 'string',
    default: ''
  }
}

export function createEmptyCommand(): PluginCommand {
  return {
    id: crypto.randomUUID(),
    name: 'NewCommand',
    text: 'New Command',
    desc: '',
    args: []
  }
}

/**
`base`, or else `base2`, `base3`…: the first of them `taken` does not hold.
*/
export function firstFreeName(base: string, taken: ReadonlySet<string>): string {
  if (!taken.has(base)) return base
  let suffix = 2
  while (taken.has(base + String(suffix))) suffix += 1
  return base + String(suffix)
}

/**
A struct with no fields, named apart from the structs `taken` names.
*/
export function createEmptyStruct(taken: readonly string[] = []): PluginStruct {
  return {
    id: crypto.randomUUID(),
    name: firstFreeName('NewStruct', new Set(taken)),
    parameters: []
  }
}
