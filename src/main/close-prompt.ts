// The question main asks when the window is closing while the page holds back its unload, which
// the renderer does while any open plugin has unsaved changes.
import type { MessageBoxSyncOptions } from 'electron'

export function closePromptOptions(): MessageBoxSyncOptions {
  return {
    type: 'warning',
    title: 'Unsaved changes',
    message: 'Some open plugins have unsaved changes. Close without saving them?',
    buttons: ['Cancel', 'Close without saving'],
    defaultId: 0,
    cancelId: 0
  }
}

/**
 * Lets the unload go ahead, and so the window close, only when the user chooses to discard.
 * Electron decides synchronously, hence a synchronous message box.
 */
export function handleWillPreventUnload(
  event: { preventDefault(): void },
  showBox: (options: MessageBoxSyncOptions) => number
): void {
  if (showBox(closePromptOptions()) === 1) event.preventDefault()
}
