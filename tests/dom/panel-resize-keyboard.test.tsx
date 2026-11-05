// The divider between the editor and the code preview moves from the keyboard: it takes focus,
// announces where it sits and how wide the preview is, and ArrowLeft/ArrowRight move it by a
// fixed step within the same limits a mouse drag has. Dragging still works.
import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../../src/renderer/src/App'
import { usePluginStore, useUIStore } from '../../src/renderer/src/stores'
import { createEmptyPlugin } from '../../src/renderer/src/types/plugin'
import { createFakeApi } from '../helpers/fake-api'
import { LOAD_PREVIEW_TIMEOUT_MS, loadPreview } from './support/load-preview'
import { resetStores } from './support/reset-stores'

const STEP = 20
const NAME = 'Divider between editor and code preview'

// Renders the app with one plugin open and the preview shown at `width`; returns the divider
function showPreviewAt(width: number): HTMLElement {
  act(() => {
    usePluginStore.getState().openPlugin(createEmptyPlugin())
    useUIStore.getState().setPreviewWidth(width)
  })
  render(<App />)
  return screen.getByRole('slider', { name: NAME })
}

// The preview width the app saved for the next start
function savedPreviewWidth(): unknown {
  const saved: unknown = JSON.parse(localStorage.getItem('mz-plugin-studio-ui') ?? 'null')
  if (typeof saved !== 'object' || saved === null || !('state' in saved)) return undefined
  const { state } = saved
  return typeof state === 'object' && state !== null && 'previewWidth' in state
    ? state.previewWidth
    : undefined
}

// Each case renders the whole app, which takes seconds on a cold start
describe('resizing the code preview from the keyboard', { timeout: 30_000 }, () => {
  beforeAll(loadPreview, LOAD_PREVIEW_TIMEOUT_MS)

  beforeEach(() => {
    resetStores()
    vi.stubGlobal('api', createFakeApi())
    // The build defines this; the status bar shows it.
    vi.stubGlobal('__APP_VERSION__', '0.0.0-test')
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('the divider takes focus and announces its position and the preview width', () => {
    expect.assertions(5)

    const divider = showPreviewAt(500)
    divider.focus()

    expect(divider).toHaveFocus()
    expect(divider).toHaveValue(700)
    expect(divider).toHaveAttribute('aria-valuemin', '0')
    expect(divider).toHaveAttribute('aria-valuemax', '900')
    expect(divider).toHaveAttribute('aria-valuetext', 'Code preview 500 pixels wide')
  })

  it('arrowLeft moves the divider left and widens the preview by one step', async () => {
    expect.assertions(3)

    const divider = showPreviewAt(500)
    divider.focus()
    await userEvent.setup().keyboard('{ArrowLeft}')

    expect(useUIStore.getState().previewWidth).toBe(500 + STEP)
    expect(divider).toHaveValue(700 - STEP)
    expect(savedPreviewWidth()).toBe(500 + STEP)
  })

  it('arrowRight moves the divider right and narrows the preview by one step', async () => {
    expect.assertions(3)

    const divider = showPreviewAt(500)
    divider.focus()
    await userEvent.setup().keyboard('{ArrowRight}')

    expect(useUIStore.getState().previewWidth).toBe(500 - STEP)
    expect(divider).toHaveValue(700 + STEP)
    expect(savedPreviewWidth()).toBe(500 - STEP)
  })

  it.each([
    { width: 1200, key: '{ArrowLeft}', limit: 1200 },
    { width: 1190, key: '{ArrowLeft}', limit: 1200 },
    { width: 300, key: '{ArrowRight}', limit: 300 },
    { width: 310, key: '{ArrowRight}', limit: 300 }
  ])('at $width the preview stops at $limit on $key', async ({ width, key, limit }) => {
    expect.assertions(2)

    const divider = showPreviewAt(width)
    divider.focus()
    await userEvent.setup().keyboard(key)

    expect(useUIStore.getState().previewWidth).toBe(limit)
    expect(divider).toHaveAttribute('aria-valuetext', `Code preview ${String(limit)} pixels wide`)
  })

  it('dragging the divider still resizes the preview', () => {
    expect.assertions(2)

    const divider = showPreviewAt(500)
    fireEvent.mouseDown(divider, { clientX: 1000 })
    fireEvent.mouseMove(document, { clientX: 900 })
    fireEvent.mouseUp(document)

    expect(useUIStore.getState().previewWidth).toBe(600)

    fireEvent.mouseMove(document, { clientX: 800 })

    expect(useUIStore.getState().previewWidth).toBe(600)
  })
})
