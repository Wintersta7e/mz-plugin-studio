// The code editor's colours for each app theme. The dark one is the editor's built-in dark theme
// with comments one step lighter: the built-in comment green reads at 4.2:1 on its background,
// under the 4.5:1 that normal text needs.
import type { editor } from 'monaco-editor'

export const DARK_EDITOR_THEME = 'studio-dark'

export const darkEditorTheme: editor.IStandaloneThemeData = {
  base: 'vs-dark',
  inherit: true,
  rules: [{ token: 'comment', foreground: '649151' }],
  colors: {}
}

/**
The editor theme the hosts pass to the editor for the app's theme
*/
export function editorTheme(theme: 'dark' | 'light'): string {
  return theme === 'dark' ? DARK_EDITOR_THEME : 'vs'
}
