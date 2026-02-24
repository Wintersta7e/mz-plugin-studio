import type { PluginStruct } from '../types/plugin'

/**
 * Build a JSON default string from struct field values.
 * All values are stored as strings per MZ convention (e.g., {"x":"100","visible":"true"}).
 * Fields with empty string values are omitted.
 * Returns empty string if no fields have values.
 */
export function buildStructDefault(struct: PluginStruct, values: Record<string, string>): string {
  const obj: Record<string, string> = {}
  for (const field of struct.parameters) {
    const val = values[field.name]
    if (val !== undefined && val !== '') {
      obj[field.name] = val
    }
  }
  if (Object.keys(obj).length === 0) return ''
  return JSON.stringify(obj)
}

/**
 * Parse a JSON default string into a Record of field name to string value.
 * Returns empty object for empty/invalid/malformed input.
 * Non-string values are coerced to strings.
 */
export function parseStructDefault(jsonStr: string): Record<string, string> {
  if (!jsonStr || jsonStr.trim() === '' || jsonStr.trim() === '{}') return {}
  try {
    const parsed = JSON.parse(jsonStr)
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return {}
    const result: Record<string, string> = {}
    for (const [key, value] of Object.entries(parsed)) {
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
 * Validate a JSON default string against a struct definition.
 * Returns status: 'valid' if OK, 'warning' for unknown keys, 'error' for bad JSON.
 */
export function validateStructDefault(
  jsonStr: string,
  struct: PluginStruct
): StructDefaultValidation {
  if (!jsonStr || jsonStr.trim() === '' || jsonStr.trim() === '{}') {
    return { status: 'valid', errors: [] }
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(jsonStr)
  } catch {
    return { status: 'error', errors: ['Invalid JSON: check syntax'] }
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return { status: 'error', errors: ['Invalid JSON: expected an object'] }
  }

  const fieldNames = new Set(struct.parameters.map((p) => p.name))
  const unknownKeys = Object.keys(parsed as Record<string, unknown>).filter(
    (k) => !fieldNames.has(k)
  )

  if (unknownKeys.length > 0) {
    return {
      status: 'warning',
      errors: [`Unknown fields: ${unknownKeys.join(', ')}`]
    }
  }

  return { status: 'valid', errors: [] }
}

/**
 * Build a values Record from a struct's field defaults.
 * Skips fields with empty string defaults.
 * All values are coerced to strings.
 */
export function fillFromStructDefaults(struct: PluginStruct): Record<string, string> {
  const values: Record<string, string> = {}
  for (const field of struct.parameters) {
    const def = field.default
    if (def === undefined || def === '') continue
    values[field.name] = String(def)
  }
  return values
}
