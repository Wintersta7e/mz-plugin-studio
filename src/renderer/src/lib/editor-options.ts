import { useMemo } from 'react'
import type { editor } from 'monaco-editor'
import { useSettingsStore } from '../stores/settings-store'

/**
The options a code editor takes from the editor settings; whether it is read-only is the caller's
*/
export function useEditorOptions(isReadOnly: boolean): editor.IStandaloneEditorConstructionOptions {
  const editorFontSize = useSettingsStore((s) => s.editorFontSize)
  const isEditorWordWrap = useSettingsStore((s) => s.editorWordWrap)
  const isEditorMinimap = useSettingsStore((s) => s.editorMinimap)
  const isEditorLineNumbers = useSettingsStore((s) => s.editorLineNumbers)
  return useMemo(
    () => ({
      readOnly: isReadOnly,
      minimap: { enabled: isEditorMinimap },
      fontSize: editorFontSize,
      lineNumbers: isEditorLineNumbers ? 'on' : 'off',
      wordWrap: isEditorWordWrap ? 'on' : 'off',
      automaticLayout: true,
      scrollBeyondLastLine: false,
      padding: { top: 16, bottom: 16 }
    }),
    [isReadOnly, isEditorMinimap, editorFontSize, isEditorLineNumbers, isEditorWordWrap]
  )
}
