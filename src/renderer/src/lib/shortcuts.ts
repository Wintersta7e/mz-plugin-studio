export interface ShortcutDef {
  key: string
  label: string
  description: string
  category: 'File' | 'Edit' | 'View' | 'Navigation'
}

export const SHORTCUTS: ShortcutDef[] = [
  // File
  { key: 'ctrl+s', label: 'Ctrl+S', description: 'Save / Export plugin', category: 'File' },
  { key: 'ctrl+n', label: 'Ctrl+N', description: 'New plugin', category: 'File' },
  { key: 'ctrl+o', label: 'Ctrl+O', description: 'Open project', category: 'File' },

  // Edit
  { key: 'ctrl+z', label: 'Ctrl+Z', description: 'Undo', category: 'Edit' },
  { key: 'ctrl+shift+z', label: 'Ctrl+Shift+Z', description: 'Redo', category: 'Edit' },

  // View
  { key: 'f5', label: 'F5', description: 'Regenerate preview', category: 'View' },
  { key: 'ctrl+,', label: 'Ctrl+,', description: 'Open settings', category: 'View' },

  // Navigation
  { key: 'ctrl+1', label: 'Ctrl+1', description: 'Switch to Meta tab', category: 'Navigation' },
  { key: 'ctrl+2', label: 'Ctrl+2', description: 'Switch to Parameters tab', category: 'Navigation' },
  { key: 'ctrl+3', label: 'Ctrl+3', description: 'Switch to Commands tab', category: 'Navigation' },
  { key: 'ctrl+4', label: 'Ctrl+4', description: 'Switch to Structs tab', category: 'Navigation' },
  { key: 'ctrl+5', label: 'Ctrl+5', description: 'Switch to Code tab', category: 'Navigation' },

  // Help
  { key: 'f1', label: 'F1', description: 'Show keyboard shortcuts', category: 'View' }
]

// Shortcuts that override even when Monaco editor is focused
const GLOBAL_OVERRIDE_SHORTCUTS = ['ctrl+s', 'ctrl+n', 'ctrl+o', 'f1']

export function matchShortcut(e: KeyboardEvent): ShortcutDef | null {
  if (e.altKey) return null

  const ctrl = e.ctrlKey || e.metaKey
  const shift = e.shiftKey
  const code = e.code

  for (const shortcut of SHORTCUTS) {
    const parts = shortcut.key.split('+')
    const needsCtrl = parts.includes('ctrl')
    const needsShift = parts.includes('shift')
    const mainKey = parts[parts.length - 1]
    const expectedCode = keyToCode(mainKey)

    if (needsCtrl === ctrl && needsShift === shift && code === expectedCode) {
      return shortcut
    }
  }
  return null
}

export function shouldOverrideMonaco(shortcut: ShortcutDef): boolean {
  return GLOBAL_OVERRIDE_SHORTCUTS.includes(shortcut.key)
}

function isMonacoFocused(): boolean {
  const active = document.activeElement
  if (!active) return false
  return !!active.closest('.monaco-editor')
}

export function shouldHandleShortcut(e: KeyboardEvent): ShortcutDef | null {
  const shortcut = matchShortcut(e)
  if (!shortcut) return null

  if (isMonacoFocused() && !shouldOverrideMonaco(shortcut)) {
    return null
  }

  return shortcut
}

function keyToCode(key: string): string {
  if (/^[a-z]$/.test(key)) return `Key${key.toUpperCase()}`
  if (/^[0-9]$/.test(key)) return `Digit${key}`
  if (/^f\d+$/i.test(key)) return key.toUpperCase()
  if (key === ',') return 'Comma'
  if (key === '.') return 'Period'
  return key
}
