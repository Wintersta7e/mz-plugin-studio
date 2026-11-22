// One rule for what names an identifier in generated code and declarations: ECMAScript's
// IdentifierName, so a letter of any script is kept, as engines and TypeScript read it

/**
An IdentifierName: a start character (a Unicode ID_Start letter, `$` or `_`), then any number of
ID_Continue characters, `$`, ZWNJ or ZWJ. Reserved words match; callers that declare a name
handle them.
@internal exported for tests
*/
export const IDENTIFIER_NAME = /^[\p{ID_Start}$_][\p{ID_Continue}$\u{200C}\u{200D}]*$/u

/**
Whether `name` is an IdentifierName.
*/
export const isIdentifierName = (name: string): boolean => IDENTIFIER_NAME.test(name)

// Reserved words that would cause a SyntaxError if used as `const <name>`.
// Includes ES2024 reserved + strict-mode reserved + contextual keywords that
// collide inside `'use strict'` IIFEs, plus `eval`/`arguments` (not bindable in
// strict mode) and `params`/`args` (declared by the generated code itself).
// Suffixing with `_` is safer than prefixing because it preserves the visible
// name in generated code.
export const JS_RESERVED: ReadonlySet<string> = new Set([
  'break',
  'case',
  'catch',
  'class',
  'const',
  'continue',
  'debugger',
  'default',
  'delete',
  'do',
  'else',
  'enum',
  'export',
  'extends',
  'false',
  'finally',
  'for',
  'function',
  'if',
  'implements',
  'import',
  'in',
  'instanceof',
  'interface',
  'let',
  'new',
  'null',
  'package',
  'private',
  'protected',
  'public',
  'return',
  'static',
  'super',
  'switch',
  'this',
  'throw',
  'true',
  'try',
  'typeof',
  'var',
  'void',
  'while',
  'with',
  'yield',
  'async',
  'await',
  'of',
  'eval',
  'arguments',
  'params',
  'args'
])

/**
Convert parameter name to a valid JS camelCase identifier.
Guarantees: output is always a syntactically legal strict-mode identifier
(never a reserved word, never starts with a character an identifier cannot start with, never
empty). Letters of any script are kept.
*/
export function camelCase(string_: string): string {
  if (!string_) return 'unnamed'
  // Fast path: already a valid identifier with no separators (e.g. myCombo → myCombo)
  if (isIdentifierName(string_) && !string_.includes('_')) {
    const normalized = string_.charAt(0).toLowerCase() + string_.slice(1)
    return sanitizeIdentifier(normalized)
  }
  // Strip leading/trailing underscores, split on what an identifier cannot hold, `_` and `$`
  const stripped = string_.replaceAll(/^_+|_+$/g, '')
  const words = stripped
    .replaceAll(/[^\p{ID_Continue}\u{200C}\u{200D}]|_/gu, ' ')
    .split(' ')
    .filter(Boolean)
  const result = words
    // The first word's first char goes lower case (keeping internal camelCase), each later
    // word's upper case; the rest is preserved
    .map(
      (word, index) =>
        (index === 0 ? word.charAt(0).toLowerCase() : word.charAt(0).toUpperCase()) + word.slice(1)
    )
    .join('')
  return sanitizeIdentifier(result)
}

function sanitizeIdentifier(name: string): string {
  if (!name) return 'unnamed'
  // A start an identifier cannot have, such as a digit of any script: prefix with underscore so
  // `const 123abc` becomes `const _123abc`
  if (/^[^\p{ID_Start}$_]/u.test(name)) {
    return '_' + name
  }
  // Reserved word: suffix with underscore so `const class` becomes `const class_`
  if (JS_RESERVED.has(name)) {
    return name + '_'
  }
  return name
}
