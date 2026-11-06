// Makes generated output reproducible: a fixed clock for headers that print the date, and
// stable placeholders for the random ids the parser and stores create.
import { vi } from 'vitest'

export const FROZEN_TIME = '2026-01-01T00:00:00.000Z'

/**
Fakes `Date` only, so timers and promises behave as usual.
*/
export function freezeTime(): void {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(FROZEN_TIME))
}

export function restoreTime(): void {
  vi.useRealTimers()
}

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
