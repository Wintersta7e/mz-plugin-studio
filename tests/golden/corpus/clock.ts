// The fixed clock for headers that print the date. Kept apart from the rest of the corpus, which
// also loads outside Vitest, where importing `vitest` throws.
import { vi } from 'vitest'
import { FROZEN_TIME } from './normalise'

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
