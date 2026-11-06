import '@testing-library/jest-dom/vitest'
import { beforeEach, vi } from 'vitest'
import { resetMonacoStub } from './monaco-stub'

// The stub's components take the props the editor hosts pass, not the library's prop types, so
// the mock is checked for the names it replaces
vi.mock<Record<'default' | 'Editor' | 'DiffEditor', unknown>>(
  import('@monaco-editor/react'),
  async () => import('./monaco-stub')
)
// The editor hosts import the bundled editor's setup; the stub above stands in for the editor
vi.mock(import('../../src/renderer/src/lib/monaco-setup'), () => ({}))

// jsdom has no ResizeObserver and lays nothing out, so these never fire; Radix ScrollArea
// observes its viewport on mount.
class InertResizeObserver {
  observe = vi.fn<() => void>()
  unobserve = vi.fn<() => void>()
  disconnect = vi.fn<() => void>()
}

// Stubbed again before each test, since a test may restore every stubbed global after itself
beforeEach(() => {
  resetMonacoStub()
  vi.stubGlobal('ResizeObserver', InertResizeObserver)
})

// jsdom has no pointer capture and no scrolling; Radix Select checks and releases the capture
// when it opens and scrolls the chosen item into view.
Element.prototype.hasPointerCapture = () => false
Element.prototype.releasePointerCapture = () => {
  // no capture to release: jsdom never sets one
}
Element.prototype.scrollIntoView = () => {
  // nothing to scroll: jsdom lays nothing out
}
