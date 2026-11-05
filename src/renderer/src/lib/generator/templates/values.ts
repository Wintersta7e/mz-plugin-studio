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
