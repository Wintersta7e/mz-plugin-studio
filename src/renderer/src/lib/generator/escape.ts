/**
 * Escape a string for safe interpolation inside a single-quoted JS string literal.
 * Handles backslash, single-quote, newline, and carriage return.
 */
export function escapeJSString(str: string): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
}

/**
 * Escape a string for safe interpolation inside a double-quoted JS string literal.
 */
export function escapeJSDoubleQuote(str: string): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
}
