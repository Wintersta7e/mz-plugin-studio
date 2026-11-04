/**
Escape a string for safe interpolation inside a single-quoted JS string literal.
Handles backslash, single-quote, newline, carriage return and the two line separators,
which would otherwise end a line comment the same text is also written into.
*/
export function escapeJSString(string_: string): string {
  return escapeLineSeparators(
    string_
      .replaceAll('\\', '\\\\')
      .replaceAll("'", "\\'")
      .replaceAll('\n', '\\n')
      .replaceAll('\r', '\\r')
  )
}

/**
Escape a string for safe interpolation inside a double-quoted JS string literal.
*/
export function escapeJSDoubleQuote(string_: string): string {
  return escapeLineSeparators(
    string_
      .replaceAll('\\', '\\\\')
      .replaceAll('"', '\\"')
      .replaceAll('\n', '\\n')
      .replaceAll('\r', '\\r')
  )
}

function escapeLineSeparators(string_: string): string {
  return string_.replaceAll('\u{2028}', '\\u2028').replaceAll('\u{2029}', '\\u2029')
}

/**
Escape a string for interpolation inside a block comment: a backslash goes between each `*`
and the `/` after it, so the text cannot end the comment.
*/
export function escapeBlockComment(string_: string): string {
  return string_.replaceAll('*/', '*\\/')
}

/**
The text MZ reads from an annotation line holding `str`: each line break becomes one space,
as each annotation is one line, and `*` `/` is escaped. Code that reads a header value back
(a parameter key, a command name, a default) uses the same text, so both agree.
*/
export function annotationText(string_: string): string {
  return escapeBlockComment(string_.replaceAll(/\r\n|\r|\n/g, ' '))
}

/**
Escape a string for interpolation inside a line comment: each line break or line separator
becomes one space, so the text cannot end the comment.
*/
export function escapeLineComment(string_: string): string {
  return string_.replaceAll(/\r\n|[\r\n\u{2028}\u{2029}]/gu, ' ')
}

// Its type holds undefined, as an indexed read of `text` does where indexed access is checked
const QUOTES: ReadonlySet<string | undefined> = new Set(["'", '"', '`'])

/**
Whether text a template writes as a JavaScript expression stays one expression on one line:
no line break, every string literal closed, and outside the literals no `;`, no comment
marker and no literal written against a name or value (as in `x' + y + 'z`). A check, not a
parser: a few valid expressions fail it, such as `'a' in obj`.
*/
export function isOneLineExpression(text: string): boolean {
  if (/[\r\n\u{2028}\u{2029}]/u.test(text)) return false
  let outside = ''
  let index = 0
  while (index < text.length) {
    const quote = text[index]
    if (!QUOTES.has(quote)) {
      outside += quote
      index++
      continue
    }
    let end = index + 1
    while (end < text.length && text[end] !== quote) {
      end += text[end] === '\\' ? 2 : 1
    }
    if (end >= text.length) return false
    // The whole literal reads as one quote from here on.
    outside += "'"
    index = end + 1
  }
  return !/;|\/\/|\/\*|\*\/|[\w$)\]']\s*'|'\s*[\w$(]/.test(outside)
}

// The literal of each type when the default is empty; any other type gets `null`
const EMPTY_LITERALS = new Map([
  ['number', '0'],
  ['string', '""'],
  ['boolean', 'false'],
  ['object', '{}'],
  ['array', '[]']
])

/**
Sanitize a user-provided default into a JS literal of the requested type.
Strings are single-quoted via escapeJSString. Numbers go through Number().
Booleans match 'true'/'false' (default false). Object/array round-trip through
JSON.parse → JSON.stringify so injected code can't escape the literal.
Unknown / empty defaults fall through to the empty literal for their type.
*/
export function getDefaultLiteral(dataType: string, customDefault?: string): string {
  if (customDefault === undefined || customDefault === '') {
    return EMPTY_LITERALS.get(dataType) ?? 'null'
  }
  switch (dataType) {
    case 'number': {
      return String(Number(customDefault))
    }
    case 'string': {
      return `'${escapeJSString(customDefault)}'`
    }
    case 'boolean': {
      return customDefault.toLowerCase() === 'true' ? 'true' : 'false'
    }
    case 'object':
    case 'array': {
      try {
        return JSON.stringify(JSON.parse(customDefault))
      } catch {
        return dataType === 'object' ? '{}' : '[]'
      }
    }
    default: {
      return 'null'
    }
  }
}
