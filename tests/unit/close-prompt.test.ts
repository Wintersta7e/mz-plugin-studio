// Closing the window while the page holds back its unload: main asks, and only the discard
// button lets the window close.
import type { MessageBoxSyncOptions } from 'electron'
import { describe, expect, it, vi } from 'vitest'
import { closePromptOptions, handleWillPreventUnload } from '../../src/main/close-prompt'

/** The options the prompt was shown with and whether the unload went ahead, for `answer`. */
function closeAnswering(answer: (options: MessageBoxSyncOptions) => number) {
  const shown: MessageBoxSyncOptions[] = []
  const event = { preventDefault: vi.fn() }
  handleWillPreventUnload(event, (options) => {
    shown.push(options)
    return answer(options)
  })
  return { shown, closed: event.preventDefault.mock.calls.length }
}

describe('close prompt', () => {
  it('asks with Cancel as the Enter and Esc button', () => {
    const options = closePromptOptions()
    expect(options.defaultId).toBe(0)
    expect(options.cancelId).toBe(options.defaultId)
    expect(options.buttons?.[options.defaultId as number]).toBe('Cancel')
    expect(options).toEqual({
      type: 'warning',
      title: 'Unsaved changes',
      message: 'Some open plugins have unsaved changes. Close without saving them?',
      buttons: ['Cancel', 'Close without saving'],
      defaultId: 0,
      cancelId: 0
    })
    console.log('unload prompt checked 1')
  })

  it('keeps the window open when the prompt is cancelled', () => {
    const { shown, closed } = closeAnswering((options) => options.cancelId as number)
    expect(shown).toEqual([closePromptOptions()])
    expect(closed).toBe(0)
  })

  it('lets the window close when the user chooses to discard', () => {
    const { shown, closed } = closeAnswering(
      (options) => options.buttons?.indexOf('Close without saving') ?? -1
    )
    expect(shown).toHaveLength(1)
    expect(closed).toBe(1)
  })
})
