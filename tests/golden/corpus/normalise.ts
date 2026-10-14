// Makes generated output reproducible: a fixed clock for headers that print the date, and
// stable placeholders for the random ids the parser and stores create.
import { vi } from 'vitest'

export const FROZEN_TIME = '2026-01-01T00:00:00.000Z'

/** Fakes `Date` only, so timers and promises behave as usual. */
export function freezeTime(): void {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(FROZEN_TIME))
}

export function restoreTime(): void {
  vi.useRealTimers()
}

/** Keeps a case header on one line: JSON escapes LF but not the two Unicode separators. */
export const oneLine = (text: string): string =>
  text
    .replace(/\n/g, '\\n')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029')

const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi

/** Replaces each UUID with `<id:n>`, numbered by first appearance. For JSON goldens only. */
export function normaliseIds(json: string): string {
  const seen = new Map<string, number>()
  return json.replace(UUID, (id) => {
    const key = id.toLowerCase()
    if (!seen.has(key)) seen.set(key, seen.size + 1)
    return `<id:${seen.get(key)}>`
  })
}
