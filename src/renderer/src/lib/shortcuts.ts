export interface ShortcutDefinition {
  key: string
  label: string
  description: string
  category: 'File' | 'Edit' | 'View' | 'Navigation'
}

export const SHORTCUTS: ShortcutDefinition[] = [
  // File
  { key: 'ctrl+s', label: 'Ctrl+S', description: 'Save / Export plugin', category: 'File' },
  { key: 'ctrl+n', label: 'Ctrl+N', description: 'New plugin', category: 'File' },
  { key: 'ctrl+o', label: 'Ctrl+O', description: 'Open project', category: 'File' },
  {
    key: 'ctrl+shift+s',
    label: 'Ctrl+Shift+S',
    description: 'Save all open plugins',
    category: 'File'
  },

  // Edit
  { key: 'ctrl+z', label: 'Ctrl+Z', description: 'Undo', category: 'Edit' },
  { key: 'ctrl+shift+z', label: 'Ctrl+Shift+Z', description: 'Redo', category: 'Edit' },

  // View
  { key: 'f5', label: 'F5', description: 'Regenerate preview', category: 'View' },
  { key: 'ctrl+,', label: 'Ctrl+,', description: 'Open settings', category: 'View' },
  { key: 'ctrl+b', label: 'Ctrl+B', description: 'Toggle code preview', category: 'View' },
  {
    key: 'ctrl+shift+e',
    label: 'Ctrl+Shift+E',
    description: 'Toggle plugin browser',
    category: 'View'
  },

  // Navigation
  { key: 'ctrl+1', label: 'Ctrl+1', description: 'Switch to Meta tab', category: 'Navigation' },
  {
    key: 'ctrl+2',
    label: 'Ctrl+2',
    description: 'Switch to Parameters tab',
    category: 'Navigation'
  },
  { key: 'ctrl+3', label: 'Ctrl+3', description: 'Switch to Commands tab', category: 'Navigation' },
  { key: 'ctrl+4', label: 'Ctrl+4', description: 'Switch to Structs tab', category: 'Navigation' },
  { key: 'ctrl+5', label: 'Ctrl+5', description: 'Switch to Code tab', category: 'Navigation' },

  // Help
  { key: 'f1', label: 'F1', description: 'Show keyboard shortcuts', category: 'View' }
]

// Shortcuts that override even when Monaco editor is focused
const GLOBAL_OVERRIDE_SHORTCUTS = new Set([
  'ctrl+s',
  'ctrl+shift+s',
  'ctrl+n',
  'ctrl+o',
  'ctrl+b',
  'ctrl+shift+e',
  'f1'
])

export function matchShortcut(event: KeyboardEvent): ShortcutDefinition | null {
  if (event.altKey) return null

  const isCtrl = event.ctrlKey || event.metaKey
  const isShift = event.shiftKey
  const code = event.code

  for (const shortcut of SHORTCUTS) {
    const parts = new Set(shortcut.key.split('+'))
    const isNeedsCtrl = parts.has('ctrl')
    const isNeedsShift = parts.has('shift')
    const mainKey = shortcut.key.slice(shortcut.key.lastIndexOf('+') + 1)
    const expectedCode = keyToCode(mainKey)

    if (isNeedsCtrl === isCtrl && isNeedsShift === isShift && code === expectedCode) {
      return shortcut
    }
  }
  return null
}

export function shouldOverrideMonaco(shortcut: ShortcutDefinition): boolean {
  return GLOBAL_OVERRIDE_SHORTCUTS.has(shortcut.key)
}

function isMonacoFocused(): boolean {
  return !!document.activeElement?.closest('.monaco-editor')
}

export function shortcutToHandle(event: KeyboardEvent): ShortcutDefinition | null {
  const shortcut = matchShortcut(event)
  if (!shortcut) return null

  if (isMonacoFocused() && !shouldOverrideMonaco(shortcut)) {
    return null
  }

  return shortcut
}

function keyToCode(key: string): string {
  if (/^[a-z]$/.test(key)) return `Key${key.toUpperCase()}`
  if (/^\d$/.test(key)) return `Digit${key}`
  if (/^f\d+$/i.test(key)) return key.toUpperCase()
  if (key === ',') return 'Comma'
  if (key === '.') return 'Period'
  return key
}
