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
