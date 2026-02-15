// Plugin Definition Types

export type ParamType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'select'
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
  | 'note'
  | 'color'
  | 'text'
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
  options?: SelectOption[] // For select type
  structType?: string // Reference to struct name
  arrayType?: ParamType // For array types
  dir?: string // For file type, directory
  parent?: string // For nested parameters
  rawType?: string // Original @type string for round-trip fidelity (e.g., 'color', 'nuumer', 'combo')
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
}

// Default empty plugin
// Lazy import to avoid circular dependency - settings store may not exist yet
let _getSettings: (() => { defaultAuthor: string }) | null = null

export function setSettingsGetter(getter: () => { defaultAuthor: string }): void {
  _getSettings = getter
}

export function createEmptyPlugin(): PluginDefinition {
  const settings = _getSettings?.()
  return {
    id: crypto.randomUUID(),
    meta: {
      name: 'NewPlugin',
      version: '1.0.0',
      author: settings?.defaultAuthor || '',
      description: '',
      help: '',
      url: '',
      target: 'MZ',
      dependencies: [],
      orderAfter: [],
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

export function createEmptyStruct(): PluginStruct {
  return {
    id: crypto.randomUUID(),
    name: 'NewStruct',
    parameters: []
  }
}
