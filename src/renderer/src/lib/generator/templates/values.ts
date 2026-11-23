import { getDefaultLiteral } from '../escape'

/**
A template value read as text, for a caller that calls a string method on it. Any other value
throws `TypeError`, where that string method call would throw it.
*/
export function expectText(value: unknown): string {
  if (typeof value !== 'string') throw new TypeError(`Expected text, got ${typeof value}`)
  return value
}

/**
A template value, or the fallback when the value is falsy (empty text, 0, false, null, unset).
*/
export function valueOr(value: unknown, fallback: unknown): unknown {
  const hasValue = Boolean(value)
  return hasValue ? value : fallback
}

/**
A template value, or the fallback when the value is unset (`undefined` or `null`).
*/
export function definedOr(value: unknown, fallback: unknown): unknown {
  return value ?? fallback
}

/**
The number `parseInt(text, 10)` reads: the decimal integer at the start of the text, after white
space and an optional sign, or `NaN` when no digit is there.
*/
export function decimalIntegerOf(text: string): number {
  const digits = /^\s*[+-]?\d+/.exec(text)
  return digits === null ? NaN : Number(digits[0])
}

/**
The literal `getDefaultLiteral` writes for a default value that is neither text nor unset, read the
way it reads one: by `Number()` for a number, by the conversion to text that `JSON.parse` makes for
an object or an array, and by a string method, which throws `TypeError`, for text and a boolean.
*/
function otherDefaultLiteral(dataType: string, value: unknown): string {
  if (dataType === 'number') return String(Number(value))
  const isText = dataType === 'string' || dataType === 'boolean'
  return getDefaultLiteral(dataType, isText ? expectText(value) : String(value))
}

/**
The literal `getDefaultLiteral` writes for a default value of any type. A data type that is not
text gives `null`, as it does there.
*/
export function defaultLiteralOf(dataType: unknown, value: unknown): string {
  if (typeof dataType !== 'string') return 'null'
  return value === undefined || typeof value === 'string'
    ? getDefaultLiteral(dataType, value)
    : otherDefaultLiteral(dataType, value)
}

/**
A template value, or the fallback when no value is given (undefined). `null` and the other falsy
values are kept.
*/
export function providedOr(value: unknown, fallback: unknown): unknown {
  return value === undefined ? fallback : value
}

/**
A name with its first letter in upper case (`questProgress` → `QuestProgress`), or empty text for
an unset or empty value. Any other value but text throws `TypeError`, as the string methods would.
*/
export function toPascalCase(value: unknown): string {
  const hasValue = Boolean(value)
  if (!hasValue) return ''
  const text = expectText(value)
  return text.charAt(0).toUpperCase() + text.slice(1)
}

/**
The error for a class name that is set but is not a letter followed by letters and digits, once
its white space is removed. `label` names the field in the message.
*/
export function classNameErrors(value: unknown, label: string): string[] {
  const hasName = Boolean(value)
  if (!hasName) return []
  const name = expectText(value)
  const isValid = /^[a-z][a-z0-9]*$/i.test(name.trim().replaceAll(/\s+/g, ''))
  return isValid ? [] : [`${label} must start with a letter and contain only letters and numbers`]
}

/**
The heading lines, then a function of that name with the body lines indented inside it (an empty
line stays empty). `nullAtLoad` names a game object the body calls that is null while the plugins
load: two comment lines before the function then say to call it from a running game.
*/
export function functionLines(
  heading: readonly string[],
  functionName: string,
  body: readonly string[],
  nullAtLoad?: string
): string[] {
  const note =
    nullAtLoad === undefined
      ? []
      : [
          `// ${nullAtLoad} is null while plugins load: call this function from a`,
          `// plugin command or a scene hook, e.g. ${functionName}();`
        ]
  return [
    ...heading,
    ...note,
    `function ${functionName}() {`,
    ...body.map((line) => (line ? `    ${line}` : '')),
    '}'
  ]
}
