import { useState, useRef, useCallback, useEffect } from 'react'
import Editor, { type Monaco } from '@monaco-editor/react'
import type { editor, IDisposable } from 'monaco-editor'
import { Wand2 } from 'lucide-react'
import { usePluginStore, useSettingsStore } from '../../stores'
import { Button } from '../ui/button'
import { TemplateInserter } from './TemplateInserter'
import { registerMZCompletions } from '../../lib/mz-completions'

export function CodeEditor() {
  const plugin = usePluginStore((s) => s.plugin)
  const setCustomCode = usePluginStore((s) => s.setCustomCode)
  const [isTemplateOpen, setIsTemplateOpen] = useState(false)

  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null)
  const completionDisposableRef = useRef<IDisposable | null>(null)

  const editorFontSize = useSettingsStore((s) => s.editorFontSize)
  const editorWordWrap = useSettingsStore((s) => s.editorWordWrap)
  const editorMinimap = useSettingsStore((s) => s.editorMinimap)
  const editorLineNumbers = useSettingsStore((s) => s.editorLineNumbers)

  const handleBeforeMount = useCallback((monaco: Monaco) => {
    if (!completionDisposableRef.current) {
      completionDisposableRef.current = registerMZCompletions(monaco)
    }
  }, [])

  useEffect(() => {
    return () => {
      completionDisposableRef.current?.dispose()
      completionDisposableRef.current = null
    }
  }, [])

  const handleMount = useCallback((ed: editor.IStandaloneCodeEditor) => {
    editorRef.current = ed
  }, [])

  const handleChange = useCallback(
    (value: string | undefined) => {
      setCustomCode(value || '')
    },
    [setCustomCode]
  )

  const handleInsertTemplate = (code: string) => {
    const ed = editorRef.current
    if (!ed) {
      // Fallback: append to store value
      setCustomCode((plugin.customCode?.trim() ? plugin.customCode + '\n\n' : '') + code)
      return
    }

    const selection = ed.getSelection()
    const model = ed.getModel()
    if (!selection || !model) return

    if (!selection.isEmpty()) {
      // Replace selection
      ed.executeEdits('template', [
        { range: selection, text: code, forceMoveMarkers: true }
      ])
    } else if (model.getValue().trim()) {
      // Append with newlines at end
      const lastLine = model.getLineCount()
      const lastCol = model.getLineMaxColumn(lastLine)
      const range = {
        startLineNumber: lastLine,
        startColumn: lastCol,
        endLineNumber: lastLine,
        endColumn: lastCol
      }
      ed.executeEdits('template', [
        {
          range,
          text: '\n\n' + code,
          forceMoveMarkers: true
        }
      ])
    } else {
      // Replace empty content (use executeEdits to preserve undo stack)
      const fullRange = model.getFullModelRange()
      ed.executeEdits('template', [
        { range: fullRange, text: code, forceMoveMarkers: true }
      ])
    }
    ed.focus()
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header with Insert Template button */}
      <div className="flex items-start justify-between p-4 pb-2">
        <div>
          <h2 className="text-lg font-semibold">Custom Code</h2>
          <p className="text-sm text-muted-foreground">
            Write your custom plugin implementation here. This code will be placed inside the
            plugin's IIFE after the auto-generated parameter parsing and command registration.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsTemplateOpen(true)}
          className="shrink-0 gap-2"
        >
          <Wand2 className="h-4 w-4" />
          Insert Template
        </Button>
      </div>

      {/* Monaco Editor fills remaining space */}
      <div className="flex-1 min-h-0">
        <Editor
          height="100%"
          language="javascript"
          value={plugin.customCode || ''}
          theme="vs-dark"
          beforeMount={handleBeforeMount}
          onMount={handleMount}
          onChange={handleChange}
          options={{
            readOnly: false,
            minimap: { enabled: editorMinimap },
            fontSize: editorFontSize,
            lineNumbers: editorLineNumbers ? 'on' : 'off',
            wordWrap: editorWordWrap ? 'on' : 'off',
            automaticLayout: true,
            scrollBeyondLastLine: false,
            padding: { top: 16, bottom: 16 }
          }}
        />
      </div>

      {/* Tip text */}
      <p className="px-4 py-2 text-xs text-muted-foreground">
        Tip: Use the &quot;Insert Template&quot; button to quickly add method aliases, scene hooks,
        custom windows, and more. The auto-generated code handles parameter parsing and command
        registration.
      </p>

      {/* Template Inserter Modal */}
      <TemplateInserter
        open={isTemplateOpen}
        onClose={() => setIsTemplateOpen(false)}
        onInsert={handleInsertTemplate}
      />
    </div>
  )
}
