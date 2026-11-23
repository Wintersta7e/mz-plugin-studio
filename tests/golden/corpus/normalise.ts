// Makes generated output reproducible: the date the fixed clock (`clock.ts`) shows, and stable
// placeholders for the random ids the parser and stores create.

export const FROZEN_TIME = '2026-01-01T00:00:00.000Z'

/**
Keeps a case header on one line: JSON escapes LF but not the two Unicode separators.
*/
export const oneLine = (text: string): string =>
  text.replaceAll('\n', '\\n').replaceAll('\u{2028}', '\\u2028').replaceAll('\u{2029}', '\\u2029')

const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi

/**
Replaces each UUID with `<id:n>`, numbered by first appearance. For JSON goldens only.
*/
export function normaliseIds(json: string): string {
  const seen = new Map<string, number>()
  return json.replaceAll(UUID, (id) => {
    const key = id.toLowerCase()
    const number = seen.get(key) ?? seen.size + 1
    seen.set(key, number)
    return `<id:${String(number)}>`
  })
}

// Orders strings by UTF-16 code unit, as `Array#sort` does with no compare function.
export function byCodeUnit(left: string, right: string): number {
  if (left === right) return 0
  return left < right ? -1 : 1
}
