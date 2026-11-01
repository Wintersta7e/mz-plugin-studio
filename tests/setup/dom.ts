import '@testing-library/jest-dom/vitest'
import { afterEach, vi } from 'vitest'
import { resetMonacoStub } from './monaco-stub'

vi.mock('@monaco-editor/react', () => import('./monaco-stub'))
// The editor hosts import the bundled editor's setup; the stub above stands in for the editor
vi.mock('../../src/renderer/src/lib/monaco-setup', () => ({}))

afterEach(resetMonacoStub)

// jsdom lays nothing out, so these never fire; Radix ScrollArea observes its viewport on mount.
globalThis.ResizeObserver ??= class {
  observe = (): void => {}
  unobserve = (): void => {}
  disconnect = (): void => {}
}

// jsdom has no pointer capture and no scrolling; Radix Select checks and releases the capture
// when it opens and scrolls the chosen item into view.
Element.prototype.hasPointerCapture ??= () => false
Element.prototype.releasePointerCapture ??= () => {}
Element.prototype.scrollIntoView ??= () => {}
