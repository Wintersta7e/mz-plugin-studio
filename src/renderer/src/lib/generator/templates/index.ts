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
 * Unregister a template from the registry
 * @param templateId - The ID of the template to remove
 * @returns true if the template was removed, false if it didn't exist
 */
export function unregisterTemplate(templateId: string): boolean {
  return templates.delete(templateId)
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
 * Check if a template exists
 * @param id - The template ID to check
 * @returns true if the template exists
 */
export function hasTemplate(id: string): boolean {
  return templates.has(id)
}

/**
 * Get the count of registered templates
 * @returns Number of registered templates
 */
export function getTemplateCount(): number {
  return templates.size
}

/**
 * Generate code from a template with the given values
 * @param templateId - The ID of the template to use
 * @param values - The field values to pass to the generator
 * @returns Generated code string, or null if generation failed
 */
export function generateFromTemplate(
  templateId: string,
  values: Record<string, unknown>
): string | null {
  const template = templates.get(templateId)
  if (!template) {
    log.error(`Template "${templateId}" not found`)
    return null
  }

  // Validate if validator exists
  if (template.validate) {
    const validation = template.validate(values)
    if (!validation.valid) {
      log.error('Template validation failed:', validation.errors)
      return null
    }
  }

  try {
    return template.generate(values)
  } catch (error) {
    log.error(`Error generating code from template "${templateId}":`, error)
    return null
  }
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

/**
 * Clear all registered templates (useful for testing)
 */
export function clearTemplates(): void {
  templates.clear()
}
