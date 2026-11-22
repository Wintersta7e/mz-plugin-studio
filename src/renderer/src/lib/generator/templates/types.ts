/**
Template System Type Definitions
Core types for the MZ Plugin Studio code template system
*/

// Template category enum
export type TemplateCategory =
  | 'method-alias'
  | 'custom-window'
  | 'scene-hooks'
  | 'database-ext'
  | 'plugin-command'
  | 'save-load'
  | 'input-handler'
  | 'battle-system'
  | 'sprite-system'
  | 'map-events'
  | 'menu-system'
  | 'audio-system'
  | 'message-system'
  | 'actor-party'

// One choice of a select field
interface TemplateFieldOption {
  value: string
  label: string
  group?: string // For grouped dropdowns
  description?: string
}

// Template field types for the form
export interface TemplateField {
  id: string
  label: string
  type: 'text' | 'select' | 'number' | 'boolean' | 'class-select' | 'method-select' | 'key-select'
  options?: readonly TemplateFieldOption[]
  default?: string | number | boolean
  dependsOn?: { field: string; value: unknown } // Conditional display
  required?: boolean
  placeholder?: string
  help?: string
  group?: string // For grouping fields visually
}

// Validation result from template validate function
export interface ValidationResult {
  valid: boolean
  errors: string[]
}

// Main template definition: its values are checked against its fields before it reads them
export interface CodeTemplate {
  id: string
  category: TemplateCategory
  name: string
  description: string
  icon: string // Lucide icon name
  fields: readonly TemplateField[]
  generate: (values: Record<string, unknown>) => string
  validate?: (values: Record<string, unknown>) => ValidationResult
}

// The value each field type holds
interface FieldTypeValues {
  text: string
  select: string
  'class-select': string
  'method-select': string
  'key-select': string
  number: number
  boolean: boolean
}

// The value one field holds: always set when the field is required, else maybe unset or null
type FieldValue<T extends TemplateField> = T extends { required: true }
  ? FieldTypeValues[T['type']]
  : FieldTypeValues[T['type']] | null | undefined

/**
The values of a template's fields, each by its field's id, of the type its field holds
*/
export type TemplateValues<F extends readonly TemplateField[]> = {
  readonly [T in F[number] as T['id']]: FieldValue<T>
}

/**
A template whose code reads its values by the types of its own fields
*/
export interface TypedTemplate<F extends readonly TemplateField[]> extends Omit<
  CodeTemplate,
  'fields' | 'generate' | 'validate'
> {
  fields: F
  generate: (values: TemplateValues<F>) => string
  validate?: (values: TemplateValues<F>) => ValidationResult
}

// The JavaScript type a value of each field type holds, and how an error names it.
export const FIELD_KINDS: Record<TemplateField['type'], { type: string; name: string }> = {
  text: { type: 'string', name: 'text' },
  select: { type: 'string', name: 'text' },
  'class-select': { type: 'string', name: 'text' },
  'method-select': { type: 'string', name: 'text' },
  'key-select': { type: 'string', name: 'text' },
  number: { type: 'number', name: 'a number' },
  boolean: { type: 'boolean', name: 'true or false' }
}

/**
What makes values ones the fields cannot hold: a required field left unset or null, and a value
of another type than its field. Empty when every value is one its field holds.
*/
function fieldKindErrors(
  fields: readonly TemplateField[],
  values: Record<string, unknown>
): string[] {
  const errors: string[] = []
  for (const field of fields) {
    const value = values[field.id]
    if (value === undefined || value === null) {
      if (field.required === true) errors.push(`Field "${field.label}" is required`)
    } else if (typeof value !== FIELD_KINDS[field.type].type) {
      errors.push(`Field "${field.label}" must be ${FIELD_KINDS[field.type].name}`)
    }
  }
  return errors
}

/**
Whether every value is one its field holds by type, and every required field is set
*/
export function isValuesOf<F extends readonly TemplateField[]>(
  fields: F,
  values: Record<string, unknown>
): values is TemplateValues<F> {
  return fieldKindErrors(fields, values).length === 0
}

/**
A template's fields as written, for helpers of its code that read its values by type
(`TemplateValues<typeof fields>`) before the template is defined
*/
export function templateFields<const F extends readonly TemplateField[]>(fields: F): F {
  return fields
}

/**
A template whose code and check run only on values its fields hold: given any other values, its
code throws `TypeError` naming each such field, and its check returns what is wrong with them.
*/
export function defineTemplate<const F extends readonly TemplateField[]>(
  template: TypedTemplate<F>
): CodeTemplate {
  const { generate, validate, ...shown } = template
  const { fields } = shown
  const typed: CodeTemplate = {
    ...shown,
    generate: (values) => {
      if (isValuesOf(fields, values)) return generate(values)
      throw new TypeError(`Template "${shown.id}": ${fieldKindErrors(fields, values).join(' | ')}`)
    }
  }
  if (validate !== undefined) {
    typed.validate = (values) =>
      isValuesOf(fields, values)
        ? validate(values)
        : { valid: false, errors: fieldKindErrors(fields, values) }
  }
  return typed
}

// Category metadata for UI
export interface CategoryInfo {
  id: TemplateCategory
  name: string
  description: string
  icon: string
  order: number
}

// Category definitions with metadata
export const CATEGORIES: CategoryInfo[] = [
  {
    id: 'method-alias',
    name: 'Method Aliasing',
    description: 'Extend existing game functions',
    icon: 'GitBranch',
    order: 1
  },
  {
    id: 'custom-window',
    name: 'Custom Windows',
    description: 'Create UI elements',
    icon: 'PanelTop',
    order: 2
  },
  {
    id: 'scene-hooks',
    name: 'Scene Hooks',
    description: 'React to game screens',
    icon: 'Play',
    order: 3
  },
  {
    id: 'database-ext',
    name: 'Notetags',
    description: 'Parse database metadata',
    icon: 'Tag',
    order: 4
  },
  {
    id: 'plugin-command',
    name: 'Plugin Commands',
    description: 'Event-callable functions',
    icon: 'Terminal',
    order: 5
  },
  {
    id: 'save-load',
    name: 'Save/Load',
    description: 'Persist custom data',
    icon: 'Save',
    order: 6
  },
  {
    id: 'input-handler',
    name: 'Input Handler',
    description: 'Key and button reactions',
    icon: 'Keyboard',
    order: 7
  },
  {
    id: 'battle-system',
    name: 'Battle System',
    description: 'Combat modifications',
    icon: 'Swords',
    order: 8
  },
  {
    id: 'sprite-system',
    name: 'Sprites',
    description: 'Custom sprites and animations',
    icon: 'Image',
    order: 9
  },
  {
    id: 'map-events',
    name: 'Map & Events',
    description: 'Map and event manipulation',
    icon: 'Map',
    order: 10
  },
  {
    id: 'menu-system',
    name: 'Menu System',
    description: 'Menu and scene customization',
    icon: 'Menu',
    order: 11
  },
  {
    id: 'audio-system',
    name: 'Audio',
    description: 'Sound and music control',
    icon: 'Volume2',
    order: 12
  },
  {
    id: 'message-system',
    name: 'Messages',
    description: 'Text and dialogue systems',
    icon: 'MessageSquare',
    order: 13
  },
  {
    id: 'actor-party',
    name: 'Actor & Party',
    description: 'Character and party systems',
    icon: 'Users',
    order: 14
  }
]
