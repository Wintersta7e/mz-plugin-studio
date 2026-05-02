/**
 * Escape a string for safe interpolation inside a single-quoted JS string literal.
 * Handles backslash, single-quote, newline, and carriage return.
 */
export function escapeJSString(str: string): string {
  return str.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n').replace(/\r/g, '\\r')
}

/**
 * Escape a string for safe interpolation inside a double-quoted JS string literal.
 */
export function escapeJSDoubleQuote(str: string): string {
  return str.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '\\r')
}

/**
 * Sanitize a user-provided default into a JS literal of the requested type.
 * Strings are single-quoted via escapeJSString. Numbers go through Number().
 * Booleans match 'true'/'false' (default false). Object/array round-trip through
 * JSON.parse → JSON.stringify so injected code can't escape the literal.
 * Unknown / empty defaults fall through to the empty literal for their type.
 */
export function getDefaultLiteral(dataType: string, customDefault?: string): string {
  if (customDefault !== undefined && customDefault !== '') {
    switch (dataType) {
      case 'number':
        return String(Number(customDefault))
      case 'string':
        return `'${escapeJSString(customDefault)}'`
      case 'boolean':
        return customDefault.toLowerCase() === 'true' ? 'true' : 'false'
      case 'object':
      case 'array':
        try {
          return JSON.stringify(JSON.parse(customDefault))
        } catch {
          return dataType === 'object' ? '{}' : '[]'
        }
      default:
        return 'null'
    }
  }

  switch (dataType) {
    case 'number':
      return '0'
    case 'string':
      return '""'
    case 'boolean':
      return 'false'
    case 'object':
      return '{}'
    case 'array':
      return '[]'
    default:
      return 'null'
  }
}
