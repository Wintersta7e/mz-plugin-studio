/**
 * Override Extractor — Shared between main and renderer processes
 *
 * Extracts prototype override method names from RPG Maker MZ plugin code.
 * Used by the IPC scan handler (main) and conflict detector (renderer).
 */

/**
 * Replace comments and string literals with spaces so that
 * prototype references inside them are not matched by the
 * extraction regexes.
 */
function stripCommentsAndStrings(code: string): string {
  // Order matters: block comments, single-line comments,
  // template literals, double-quoted strings, single-quoted strings
  return code.replace(
    /\/\*[\s\S]*?\*\/|\/\/[^\n]*|`(?:[^`\\]|\\.)*`|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/g,
    (match) => ' '.repeat(match.length)
  )
}

/**
 * Extract prototype override method names from JavaScript plugin code.
 *
 * Detects two patterns:
 *  1. Direct assignment:  `ClassName.prototype.method = ...`
 *  2. Alias capture:      `const|let|var _alias = ClassName.prototype.method;`
 *
 * Returns a deduplicated array of `"ClassName.prototype.methodName"` strings.
 */
export function extractOverrides(code: string): string[] {
  if (!code) return []

  const cleaned = stripCommentsAndStrings(code)
  const seen = new Set<string>()

  // Pattern 1: direct assignment — ClassName.prototype.method(…chain…) =
  // The optional (?:\.\w+)* allows nested chains like .tileset.name
  // while still capturing only the first property after prototype.
  // Negative lookahead (?![=>]) prevents matching ==, ===, =>, !=
  const directRe = /(\w+)\.prototype\.(\w+)(?:\.\w+)*\s*=(?![=>])/g
  let match: RegExpExecArray | null
  while ((match = directRe.exec(cleaned)) !== null) {
    seen.add(`${match[1]}.prototype.${match[2]}`)
  }

  // Pattern 2: alias capture — const|let|var _x = ClassName.prototype.method;
  const aliasRe = /(?:const|let|var)\s+\w+\s*=\s*(\w+)\.prototype\.(\w+)\s*[;,]/g
  while ((match = aliasRe.exec(cleaned)) !== null) {
    seen.add(`${match[1]}.prototype.${match[2]}`)
  }

  return [...seen]
}
