/**
Override Extractor — Shared between main and renderer processes

Extracts prototype override method names from RPG Maker MZ plugin code.
Used by the IPC scan handler (main) and conflict detector (renderer).
*/

// Order matters: block comments, single-line comments,
// template literals, double-quoted strings, single-quoted strings
const COMMENT = /\/\*[\s\S]*?\*\/|\/\/[^\n]*/
const STRING_LITERAL = /`(?:[^`\\]|\\.)*`|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/
const COMMENTS = new RegExp(COMMENT.source, 'g')
const COMMENTS_AND_STRINGS = new RegExp(`${COMMENT.source}|${STRING_LITERAL.source}`, 'g')

/**
Replace comments and string literals with spaces so that
prototype references inside them are not matched by the
extraction regexes.
*/
export function stripCommentsAndStrings(code: string): string {
  return code.replaceAll(COMMENTS_AND_STRINGS, (match) => ' '.repeat(match.length))
}

/**
Replace only comments (block + line) with spaces, keeping string contents
intact. Used for substring matching where the search target is a string
literal that must remain comparable (e.g. command name dedup).
*/
export function stripCommentsOnly(code: string): string {
  return code.replaceAll(COMMENTS, (match) => ' '.repeat(match.length))
}

/**
Capture group `index`, which takes part in every match. A missing one throws a `TypeError`:
`String.prototype.toString` accepts only a string as `this`, so this check adds no branch.
*/
function group(match: RegExpExecArray, index: number): string {
  return String.prototype.toString.call(match[index])
}

/**
Extract prototype override method names from JavaScript plugin code.

Detects two patterns:
 1. Direct assignment:  `ClassName.prototype.method = ...`
 2. Alias capture:      `const|let|var _alias = ClassName.prototype.method;`

Returns a deduplicated array of `"ClassName.prototype.methodName"` strings.
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
    seen.add(`${group(match, 1)}.prototype.${group(match, 2)}`)
  }

  // Pattern 2: alias capture — const|let|var _x = ClassName.prototype.method;
  const aliasRe = /(?:const|let|var)\s+\w+\s*=\s*(\w+)\.prototype\.(\w+)\s*[;,]/g
  while ((match = aliasRe.exec(cleaned)) !== null) {
    seen.add(`${group(match, 1)}.prototype.${group(match, 2)}`)
  }

  return [...seen]
}
