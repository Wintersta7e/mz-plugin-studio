import { useMemo } from 'react'
import { DiffEditor } from '@monaco-editor/react'
import { useSettingsStore } from '../../stores'

interface DiffViewProps {
  original: string
  modified: string
}

export function DiffView({ original, modified }: DiffViewProps) {
  const theme = useSettingsStore((s) => s.theme)
  const editorFontSize = useSettingsStore((s) => s.editorFontSize)

  const diffOptions = useMemo(
    () => ({
      readOnly: true,
      fontSize: editorFontSize,
      minimap: { enabled: false },
      renderSideBySide: true,
      scrollBeyondLastLine: false,
      automaticLayout: true
    }),
    [editorFontSize]
  )

  return (
    <DiffEditor
      height="100%"
      original={original}
      modified={modified}
      language="javascript"
      theme={theme === 'dark' ? 'vs-dark' : 'vs'}
      options={diffOptions}
    />
  )
}
