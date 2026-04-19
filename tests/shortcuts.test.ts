// @vitest-environment jsdom
// COV-10: shortcuts.ts tests
import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  matchShortcut,
  shouldHandleShortcut,
  shouldOverrideMonaco
} from '../src/renderer/src/lib/shortcuts'

function makeKeyboardEvent(opts: {
  code: string
  ctrlKey?: boolean
  shiftKey?: boolean
  altKey?: boolean
  metaKey?: boolean
}): KeyboardEvent {
  return {
    code: opts.code,
    ctrlKey: opts.ctrlKey ?? false,
    shiftKey: opts.shiftKey ?? false,
    altKey: opts.altKey ?? false,
    metaKey: opts.metaKey ?? false
  } as KeyboardEvent
}

describe('matchShortcut', () => {
  it('matches ctrl+s', () => {
    const evt = makeKeyboardEvent({ code: 'KeyS', ctrlKey: true })
    const result = matchShortcut(evt)
    expect(result).not.toBeNull()
    expect(result!.key).toBe('ctrl+s')
  })

  it('matches ctrl+shift+z (redo)', () => {
    const evt = makeKeyboardEvent({ code: 'KeyZ', ctrlKey: true, shiftKey: true })
    const result = matchShortcut(evt)
    expect(result).not.toBeNull()
    expect(result!.key).toBe('ctrl+shift+z')
  })

  it('matches f5', () => {
    const evt = makeKeyboardEvent({ code: 'F5' })
    const result = matchShortcut(evt)
    expect(result).not.toBeNull()
    expect(result!.key).toBe('f5')
  })

  it('matches ctrl+1 (switch to Meta tab)', () => {
    const evt = makeKeyboardEvent({ code: 'Digit1', ctrlKey: true })
    const result = matchShortcut(evt)
    expect(result).not.toBeNull()
    expect(result!.key).toBe('ctrl+1')
  })

  it('matches ctrl+, (open settings)', () => {
    const evt = makeKeyboardEvent({ code: 'Comma', ctrlKey: true })
    const result = matchShortcut(evt)
    expect(result).not.toBeNull()
    expect(result!.key).toBe('ctrl+,')
  })

  it('matches ctrl+b (toggle code preview)', () => {
    const evt = makeKeyboardEvent({ code: 'KeyB', ctrlKey: true })
    const result = matchShortcut(evt)
    expect(result).not.toBeNull()
    expect(result!.key).toBe('ctrl+b')
  })

  it('matches ctrl+shift+s (save all)', () => {
    const evt = makeKeyboardEvent({ code: 'KeyS', ctrlKey: true, shiftKey: true })
    const result = matchShortcut(evt)
    expect(result).not.toBeNull()
    expect(result!.key).toBe('ctrl+shift+s')
  })

  it('matches ctrl+shift+e (toggle plugin browser)', () => {
    const evt = makeKeyboardEvent({ code: 'KeyE', ctrlKey: true, shiftKey: true })
    const result = matchShortcut(evt)
    expect(result).not.toBeNull()
    expect(result!.key).toBe('ctrl+shift+e')
  })

  it('returns null for alt+key combinations', () => {
    const evt = makeKeyboardEvent({ code: 'KeyS', altKey: true })
    const result = matchShortcut(evt)
    expect(result).toBeNull()
  })

  it('returns null for unbound key', () => {
    const evt = makeKeyboardEvent({ code: 'KeyQ', ctrlKey: true })
    const result = matchShortcut(evt)
    expect(result).toBeNull()
  })

  it('returns null for plain key press without modifiers (non-F key)', () => {
    const evt = makeKeyboardEvent({ code: 'KeyS' })
    const result = matchShortcut(evt)
    expect(result).toBeNull()
  })

  it('matches cmd+s on macOS (metaKey)', () => {
    const event = new KeyboardEvent('keydown', { key: 's', code: 'KeyS', metaKey: true })
    const result = matchShortcut(event)
    expect(result).not.toBeNull()
    expect(result!.key).toBe('ctrl+s')
  })

  it('matches f1 (show shortcuts help)', () => {
    const evt = makeKeyboardEvent({ code: 'F1' })
    const result = matchShortcut(evt)
    expect(result).not.toBeNull()
    expect(result!.key).toBe('f1')
  })
})

describe('shouldOverrideMonaco', () => {
  it('returns true for ctrl+s (global override)', () => {
    const shortcut = {
      key: 'ctrl+s',
      label: 'Ctrl+S',
      description: 'Save',
      category: 'File' as const
    }
    expect(shouldOverrideMonaco(shortcut)).toBe(true)
  })

  it('returns true for ctrl+shift+s (save all)', () => {
    const shortcut = {
      key: 'ctrl+shift+s',
      label: 'Ctrl+Shift+S',
      description: 'Save All',
      category: 'File' as const
    }
    expect(shouldOverrideMonaco(shortcut)).toBe(true)
  })

  it('returns true for ctrl+b (toggle preview)', () => {
    const shortcut = {
      key: 'ctrl+b',
      label: 'Ctrl+B',
      description: 'Toggle preview',
      category: 'View' as const
    }
    expect(shouldOverrideMonaco(shortcut)).toBe(true)
  })

  it('returns true for ctrl+shift+e (toggle plugin browser)', () => {
    const shortcut = {
      key: 'ctrl+shift+e',
      label: 'Ctrl+Shift+E',
      description: 'Toggle plugin browser',
      category: 'View' as const
    }
    expect(shouldOverrideMonaco(shortcut)).toBe(true)
  })

  it('returns false for ctrl+z (undo — Monaco should handle)', () => {
    const shortcut = {
      key: 'ctrl+z',
      label: 'Ctrl+Z',
      description: 'Undo',
      category: 'Edit' as const
    }
    expect(shouldOverrideMonaco(shortcut)).toBe(false)
  })

  it('returns false for f5', () => {
    const shortcut = {
      key: 'f5',
      label: 'F5',
      description: 'Regenerate',
      category: 'View' as const
    }
    expect(shouldOverrideMonaco(shortcut)).toBe(false)
  })
})

describe('shouldHandleShortcut', () => {
  beforeEach(() => {
    // Reset document.activeElement by default (no Monaco editor focused)
    vi.spyOn(document, 'activeElement', 'get').mockReturnValue(document.body)
  })

  it('returns the shortcut when no Monaco editor is focused', () => {
    const evt = makeKeyboardEvent({ code: 'KeyS', ctrlKey: true })
    const result = shouldHandleShortcut(evt)
    expect(result).not.toBeNull()
    expect(result!.key).toBe('ctrl+s')
  })

  it('returns null for unrecognized shortcut', () => {
    const evt = makeKeyboardEvent({ code: 'KeyQ', ctrlKey: true })
    const result = shouldHandleShortcut(evt)
    expect(result).toBeNull()
  })

  it('returns the shortcut for global override shortcuts even with Monaco focused', () => {
    // Create a mock Monaco editor element
    const editorDiv = document.createElement('div')
    editorDiv.className = 'monaco-editor'
    const inputEl = document.createElement('textarea')
    editorDiv.appendChild(inputEl)
    document.body.appendChild(editorDiv)

    vi.spyOn(document, 'activeElement', 'get').mockReturnValue(inputEl)

    const evt = makeKeyboardEvent({ code: 'KeyS', ctrlKey: true })
    const result = shouldHandleShortcut(evt)
    // ctrl+s is in GLOBAL_OVERRIDE_SHORTCUTS so should still return
    expect(result).not.toBeNull()
    expect(result!.key).toBe('ctrl+s')

    document.body.removeChild(editorDiv)
  })

  it('returns null for non-global shortcuts when Monaco is focused', () => {
    // Create a mock Monaco editor element
    const editorDiv = document.createElement('div')
    editorDiv.className = 'monaco-editor'
    const inputEl = document.createElement('textarea')
    editorDiv.appendChild(inputEl)
    document.body.appendChild(editorDiv)

    vi.spyOn(document, 'activeElement', 'get').mockReturnValue(inputEl)

    // ctrl+z is NOT in GLOBAL_OVERRIDE_SHORTCUTS
    const evt = makeKeyboardEvent({ code: 'KeyZ', ctrlKey: true })
    const result = shouldHandleShortcut(evt)
    expect(result).toBeNull()

    document.body.removeChild(editorDiv)
  })
})
