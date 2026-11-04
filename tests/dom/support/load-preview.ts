// Loads the app's lazy code preview once for a test file, before its tests, and leaves a fresh
// app. The first render that shows the preview suspends until its import resolves; when a short
// test has ended by then, React reports the load outside act(...) in whatever test runs next.
// Tests run in a shuffled order, so none can count on running after the one that loaded it.
import { cleanup, render } from '@testing-library/react'
import { createElement } from 'react'
import { vi } from 'vitest'
import App from '../../../src/renderer/src/App'
import { usePluginStore } from '../../../src/renderer/src/stores'
import { createEmptyPlugin } from '../../../src/renderer/src/types/plugin'
import { createFakeApi } from '../../helpers/fake-api'
import { previewShown } from './preview'
import { resetStores } from './reset-stores'

// A test file's hooks wait this long for it; a cold import takes seconds on a loaded machine.
export const LOAD_PREVIEW_TIMEOUT_MS = 30_000

export async function loadPreview(): Promise<void> {
  vi.stubGlobal('__APP_VERSION__', '0.0.0-test')
  vi.stubGlobal('api', createFakeApi())
  usePluginStore.getState().openPlugin(createEmptyPlugin())
  render(createElement(App))
  await previewShown()
  cleanup()
  resetStores()
  vi.unstubAllGlobals()
}
