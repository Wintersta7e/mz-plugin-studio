import { screen } from '@testing-library/react'

/**
 * Waits until the app shows the code preview. The app loads it lazily, and React reveals a lazy
 * view only after its suspense throttle, so the preview appears about half a second after the
 * app renders, and later on a loaded machine: too close to a find query's one-second default.
 */
export async function previewShown(): Promise<void> {
  await screen.findByTestId('code-preview', {}, { timeout: 10_000 })
}
