/**
Template Registry
Every code template, built once from each category's list
*/

import {
  FIELD_KINDS,
  isValuesOf,
  type CodeTemplate,
  type TemplateCategory,
  type TemplateField
} from './types'
import { methodAliasTemplates } from './method-alias'
import { sceneHooksTemplates } from './scene-hooks'
import { customWindowTemplates } from './custom-window'
import { saveLoadTemplates } from './save-load'
import { inputHandlerTemplates } from './input-handler'
import { databaseExtensionTemplates } from './database-extension'
import { battleSystemTemplates } from './battle-system'
import { pluginCommandsTemplates } from './plugin-commands'
import { spriteSystemTemplates } from './sprite-system'
import { mapEventsTemplates } from './map-events'
import { menuSystemTemplates } from './menu-system'
import { audioSystemTemplates } from './audio-system'
import { messageSystemTemplates } from './message-system'
import { actorPartyTemplates } from './actor-party'

// Re-export all types
export * from './types'
export { appendTemplateCode } from '../custom-code'

/**
The templates of one list, read by id or category, and the checks and defaults of their fields
*/
export interface TemplateRegistry {
  readonly getAllTemplates: () => CodeTemplate[]
  readonly getTemplatesByCategory: (category: TemplateCategory) => CodeTemplate[]
  readonly getTemplate: (id: string) => CodeTemplate | undefined
  readonly validateTemplateValues: (
    templateId: string,
    values: Record<string, unknown>
  ) => { valid: boolean; errors: string[] }
  readonly getTemplateDefaults: (templateId: string) => Record<string, unknown>
}

// Whether a value is one a field can hold by its choices: always, unless the field is a select
// given text that none of its options offers. An unset value is the required check's.
function isOfferedChoice(field: TemplateField, value: unknown): boolean {
  return (
    typeof value !== 'string' ||
    value === '' ||
    field.type !== 'select' ||
    field.options?.some((option) => option.value === value) === true
  )
}

/**
Validate template values without generating code
@param template - The template, undefined when its id names none
@param templateId - The ID of the template
@param values - The field values to validate
@returns Validation result with valid flag and any errors
*/
function validateValues(
  template: CodeTemplate | undefined,
  templateId: string,
  values: Record<string, unknown>
): { valid: boolean; errors: string[] } {
  if (!template) {
    return { valid: false, errors: [`Template "${templateId}" not found`] }
  }

  // Check required fields; null is how JSON saves a number that is not a number
  const errors: string[] = []
  for (const field of template.fields) {
    if (field.required === true && (values[field.id] ?? '') === '') {
      errors.push(`Field "${field.label}" is required`)
    }
  }

  // A value of another type than its field is rejected here, before the template's own check
  // reads it as the declared type
  for (const field of template.fields) {
    const value = values[field.id]
    const kind = FIELD_KINDS[field.type]
    if (value === undefined || value === null || typeof value === kind.type) continue
    errors.push(`Field "${field.label}" must be ${kind.name}`)
  }

  // A saved choice the select no longer offers would be read as one of its choices
  for (const field of template.fields) {
    if (!isOfferedChoice(field, values[field.id])) {
      errors.push(`Field "${field.label}" must be one of its choices`)
    }
  }

  // Run custom validator if present, on values its fields hold
  if (template.validate && isValuesOf(template.fields, values)) {
    const customValidation = template.validate(values)
    errors.push(...customValidation.errors)
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

/**
Get default values for a template's fields
@param template - The template, undefined when its id names none
@returns Object with field IDs mapped to their default values
*/
function defaultsOf(template: CodeTemplate | undefined): Record<string, unknown> {
  if (!template) {
    return {}
  }

  const defaults: Record<string, unknown> = {}
  for (const field of template.fields) {
    if (field.default !== undefined) {
      defaults[field.id] = field.default
    }
  }

  return defaults
}

/**
A registry over the given templates, in their order
@param list - The templates, each id once
@throws Error when two templates share an id
@internal exported for tests
*/
export function createTemplateRegistry(list: readonly CodeTemplate[]): TemplateRegistry {
  const templates = new Map<string, CodeTemplate>()
  for (const template of list) {
    if (templates.has(template.id)) {
      throw new Error(`Template id "${template.id}" is defined twice`)
    }
    templates.set(template.id, template)
  }
  return {
    getAllTemplates: () => templates.values().toArray(),
    getTemplatesByCategory: (category) =>
      templates
        .values()
        .filter((t) => t.category === category)
        .toArray(),
    getTemplate: (id) => templates.get(id),
    validateTemplateValues: (templateId, values) =>
      validateValues(templates.get(templateId), templateId, values),
    getTemplateDefaults: (templateId) => defaultsOf(templates.get(templateId))
  }
}

// Every category's templates, in the order the dialog lists them
export const {
  getAllTemplates,
  getTemplatesByCategory,
  getTemplate,
  validateTemplateValues,
  getTemplateDefaults
} = createTemplateRegistry([
  ...methodAliasTemplates,
  ...sceneHooksTemplates,
  ...customWindowTemplates,
  ...saveLoadTemplates,
  ...inputHandlerTemplates,
  ...databaseExtensionTemplates,
  ...battleSystemTemplates,
  ...pluginCommandsTemplates,
  ...spriteSystemTemplates,
  ...mapEventsTemplates,
  ...menuSystemTemplates,
  ...audioSystemTemplates,
  ...messageSystemTemplates,
  ...actorPartyTemplates
])
