/**
 * Template Registry
 * Central registry for code generation templates
 */

import log from 'electron-log/renderer'
import type { CodeTemplate, TemplateCategory } from './types'

// Re-export all types
export * from './types'

// Template storage
const templates: Map<string, CodeTemplate> = new Map()

/**
 * Register a template with the registry
 * @param template - The template to register
 */
export function registerTemplate(template: CodeTemplate): void {
  if (templates.has(template.id)) {
    log.warn(`Template with id "${template.id}" is being overwritten`)
  }
  templates.set(template.id, template)
}

/**
 * Get all registered templates
 * @returns Array of all templates
 */
export function getAllTemplates(): CodeTemplate[] {
  return Array.from(templates.values())
}

/**
 * Get templates filtered by category
 * @param category - The category to filter by
 * @returns Array of templates in the specified category
 */
export function getTemplatesByCategory(category: TemplateCategory): CodeTemplate[] {
  return Array.from(templates.values()).filter((t) => t.category === category)
}

/**
 * Get a single template by ID
 * @param id - The template ID
 * @returns The template if found, undefined otherwise
 */
export function getTemplate(id: string): CodeTemplate | undefined {
  return templates.get(id)
}

/**
 * Validate template values without generating code
 * @param templateId - The ID of the template
 * @param values - The field values to validate
 * @returns Validation result with valid flag and any errors
 */
export function validateTemplateValues(
  templateId: string,
  values: Record<string, unknown>
): { valid: boolean; errors: string[] } {
  const template = templates.get(templateId)
  if (!template) {
    return { valid: false, errors: [`Template "${templateId}" not found`] }
  }

  // Check required fields
  const errors: string[] = []
  for (const field of template.fields) {
    if (field.required && (values[field.id] === undefined || values[field.id] === '')) {
      errors.push(`Field "${field.label}" is required`)
    }
  }

  // Run custom validator if present
  if (template.validate) {
    const customValidation = template.validate(values)
    errors.push(...customValidation.errors)
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * Get default values for a template's fields
 * @param templateId - The ID of the template
 * @returns Object with field IDs mapped to their default values
 */
export function getTemplateDefaults(templateId: string): Record<string, unknown> {
  const template = templates.get(templateId)
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
