import type { PluginStruct } from '../types/plugin'

/**
Build a JSON default string from struct field values.
All values are stored as strings per MZ convention (e.g., {"x":"100","visible":"true"}).
Fields with empty string values are omitted.
Returns empty string if no fields have values.
*/
export function buildStructDefault(
  struct: PluginStruct,
  values: Partial<Record<string, string>>
): string {
  const object: Record<string, string> = {}
  for (const field of struct.parameters) {
    const value = values[field.name]
    if (value !== undefined && value !== '') {
      object[field.name] = value
    }
  }
  return Object.keys(object).length === 0 ? '' : JSON.stringify(object)
}

/**
Parse a JSON default string into a Record of field name to string value.
Returns empty object for empty/invalid/malformed input.
Non-string values are coerced to strings.
*/
export function parseStructDefault(jsonString: string): Record<string, string> {
  if (!jsonString || jsonString.trim() === '' || jsonString.trim() === '{}') return {}
  try {
    const parsed: unknown = JSON.parse(jsonString)
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return {}
    const result: Record<string, string> = {}
    // A copy of the parsed object's own keys, which are all that Object.entries reads
    const fields: Record<string, unknown> = { ...parsed }
    for (const [key, value] of Object.entries(fields)) {
      result[key] = String(value)
    }
    return result
  } catch {
    return {}
  }
}

export interface StructDefaultValidation {
  status: 'valid' | 'warning' | 'error'
  errors: string[]
}

/**
Validate a JSON default string against a struct definition.
Returns status: 'valid' if OK, 'warning' for unknown keys, 'error' for bad JSON.
*/
export function validateStructDefault(
  jsonString: string,
  struct: PluginStruct
): StructDefaultValidation {
  if (!jsonString || jsonString.trim() === '' || jsonString.trim() === '{}') {
    return { status: 'valid', errors: [] }
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(jsonString)
  } catch {
    return { status: 'error', errors: ['Invalid JSON: check syntax'] }
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return { status: 'error', errors: ['Invalid JSON: expected an object'] }
  }

  const fieldNames = new Set(struct.parameters.map((p) => p.name))
  const unknownKeys = Object.keys(parsed).filter((k) => !fieldNames.has(k))

  if (unknownKeys.length > 0) {
    return {
      status: 'warning',
      errors: [`Unknown fields: ${unknownKeys.join(', ')}`]
    }
  }

  return { status: 'valid', errors: [] }
}

/**
Build a values Record from a struct's field defaults.
Skips fields with empty string defaults.
All values are coerced to strings.
*/
export function fillFromStructDefaults(struct: PluginStruct): Record<string, string> {
  const values: Record<string, string> = {}
  for (const field of struct.parameters) {
    if (!isSetDefault(field.default)) continue
    values[field.name] = String(field.default)
  }
  return values
}

/**
Whether a field has a default to fill in: a field read from a saved plugin may carry none at all
*/
function isSetDefault(value: string | number | boolean | undefined): boolean {
  return value !== undefined && value !== ''
}
