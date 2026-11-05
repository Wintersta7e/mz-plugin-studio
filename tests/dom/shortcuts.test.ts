// COV-10: shortcuts.ts tests
import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  matchShortcut,
  shouldHandleShortcut,
  shouldOverrideMonaco
} from '../../src/renderer/src/lib/shortcuts'

function makeKeyboardEvent(options: {
  code: string
  ctrlKey?: boolean
  shiftKey?: boolean
  altKey?: boolean
  metaKey?: boolean
}): KeyboardEvent {
  return new KeyboardEvent('keydown', {
    code: options.code,
    ctrlKey: options.ctrlKey ?? false,
    shiftKey: options.shiftKey ?? false,
    altKey: options.altKey ?? false,
    metaKey: options.metaKey ?? false
  })
}

function expectShortcut(event: KeyboardEvent, key: string): void {
  expect(matchShortcut(event)).toMatchObject({ key })
}

describe(matchShortcut, () => {
  it.each<readonly [string, Parameters<typeof makeKeyboardEvent>[0], string]>([
    ['matches ctrl+s', { code: 'KeyS', ctrlKey: true }, 'ctrl+s'],
    [
      'matches ctrl+shift+z (redo)',
      { code: 'KeyZ', ctrlKey: true, shiftKey: true },
      'ctrl+shift+z'
    ],
    ['matches f5', { code: 'F5' }, 'f5'],
    ['matches ctrl+1 (switch to Meta tab)', { code: 'Digit1', ctrlKey: true }, 'ctrl+1'],
    ['matches ctrl+, (open settings)', { code: 'Comma', ctrlKey: true }, 'ctrl+,'],
    ['matches ctrl+b (toggle code preview)', { code: 'KeyB', ctrlKey: true }, 'ctrl+b'],
    [
      'matches ctrl+shift+s (save all)',
      { code: 'KeyS', ctrlKey: true, shiftKey: true },
      'ctrl+shift+s'
    ],
    [
      'matches ctrl+shift+e (toggle plugin browser)',
      { code: 'KeyE', ctrlKey: true, shiftKey: true },
      'ctrl+shift+e'
    ]
  ])('%s', (_title, options, key) => {
    expect.hasAssertions()

    expectShortcut(makeKeyboardEvent(options), key)
  })

  it('returns null for alt+key combinations', () => {
    const event = makeKeyboardEvent({ code: 'KeyS', altKey: true })
    const result = matchShortcut(event)

    expect(result).toBeNull()
  })

  it('returns null for unbound key', () => {
    const event = makeKeyboardEvent({ code: 'KeyQ', ctrlKey: true })
    const result = matchShortcut(event)

    expect(result).toBeNull()
  })

  it('returns null for plain key press without modifiers (non-F key)', () => {
    const event = makeKeyboardEvent({ code: 'KeyS' })
    const result = matchShortcut(event)

    expect(result).toBeNull()
  })

  it('matches cmd+s on macOS (metaKey)', () => {
    expect.hasAssertions()

    const event = new KeyboardEvent('keydown', { key: 's', code: 'KeyS', metaKey: true })
    expectShortcut(event, 'ctrl+s')
  })

  it('matches f1 (show shortcuts help)', () => {
    expect.hasAssertions()

    const event = makeKeyboardEvent({ code: 'F1' })
    expectShortcut(event, 'f1')
  })
})

describe(shouldOverrideMonaco, () => {
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

describe(shouldHandleShortcut, () => {
  beforeEach(() => {
    // Reset document.activeElement by default (no Monaco editor focused)
    vi.spyOn(document, 'activeElement', 'get').mockReturnValue(document.body)
  })

  it('returns the shortcut when no Monaco editor is focused', () => {
    const event = makeKeyboardEvent({ code: 'KeyS', ctrlKey: true })
    const result = shouldHandleShortcut(event)

    expect(result).toMatchObject({ key: 'ctrl+s' })
  })

  it('returns null for unrecognized shortcut', () => {
    const event = makeKeyboardEvent({ code: 'KeyQ', ctrlKey: true })
    const result = shouldHandleShortcut(event)

    expect(result).toBeNull()
  })

  it('returns the shortcut for global override shortcuts even with Monaco focused', () => {
    // Create a mock Monaco editor element
    const editorDiv = document.createElement('div')
    editorDiv.className = 'monaco-editor'
    const inputElement = document.createElement('textarea')
    editorDiv.append(inputElement)
    document.body.append(editorDiv)

    vi.spyOn(document, 'activeElement', 'get').mockReturnValue(inputElement)

    const event = makeKeyboardEvent({ code: 'KeyS', ctrlKey: true })
    const result = shouldHandleShortcut(event)

    // ctrl+s is in GLOBAL_OVERRIDE_SHORTCUTS so should still return
    expect(result).toMatchObject({ key: 'ctrl+s' })

    editorDiv.remove()
  })

  it('returns null for non-global shortcuts when Monaco is focused', () => {
    // Create a mock Monaco editor element
    const editorDiv = document.createElement('div')
    editorDiv.className = 'monaco-editor'
    const inputElement = document.createElement('textarea')
    editorDiv.append(inputElement)
    document.body.append(editorDiv)

    vi.spyOn(document, 'activeElement', 'get').mockReturnValue(inputElement)

    // ctrl+z is NOT in GLOBAL_OVERRIDE_SHORTCUTS
    const event = makeKeyboardEvent({ code: 'KeyZ', ctrlKey: true })
    const result = shouldHandleShortcut(event)

    expect(result).toBeNull()

    editorDiv.remove()
  })
})
