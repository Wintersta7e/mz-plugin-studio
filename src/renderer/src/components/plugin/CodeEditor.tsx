// The editor setup runs before the wrapper below can mount an editor
import '../../lib/monaco-setup'
import { useState, useRef, useCallback, useEffect } from 'react'
import { Editor, type Monaco } from '@monaco-editor/react'
import type { editor, IDisposable } from 'monaco-editor'
import { Wand2 } from 'lucide-react'
import { usePluginStore, useSettingsStore } from '../../stores'
import { Button } from '../ui/button'
import { HintWrapper } from '../ui/hint-wrapper'
import { TemplateInserter } from './TemplateInserter'
import { registerMZCompletions } from '../../lib/mz-completions'
import { editorTheme } from '../../lib/editor-theme'
import { useEditorOptions } from '../../lib/editor-options'
import { RAW_MODE_READ_ONLY_NOTICE, useIsRawModeActive } from '../../lib/raw-mode'
import { appendTemplateCode } from '../../lib/generator/templates'

/**
Inserts `code` where the editor says: over the selection, after a blank line at the end of code
already there, or as the whole text of an empty editor. Edits keep the undo stack.
*/
function insertIntoEditor(ed: editor.IStandaloneCodeEditor, code: string): void {
  const selection = ed.getSelection()
  const model = ed.getModel()
  if (selection === null || model === null) return

  if (!selection.isEmpty()) {
    ed.executeEdits('template', [{ range: selection, text: code, forceMoveMarkers: true }])
  } else if (model.getValue().trim() === '') {
    const fullRange = model.getFullModelRange()
    ed.executeEdits('template', [{ range: fullRange, text: code, forceMoveMarkers: true }])
  } else {
    const lastLine = model.getLineCount()
    const lastCol = model.getLineMaxColumn(lastLine)
    const range = {
      startLineNumber: lastLine,
      startColumn: lastCol,
      endLineNumber: lastLine,
      endColumn: lastCol
    }
    ed.executeEdits('template', [{ range, text: '\n\n' + code, forceMoveMarkers: true }])
  }
  ed.focus()
}

// Registers the completion provider once and disposes it when the tab goes away
function useCompletions(): (monaco: Monaco) => void {
  const completionDisposableRef = useRef<IDisposable | null>(null)

  useEffect(() => {
    return () => {
      completionDisposableRef.current?.dispose()
      completionDisposableRef.current = null
    }
  }, [])

  return useCallback((monaco: Monaco) => {
    completionDisposableRef.current ??= registerMZCompletions(monaco)
  }, [])
}

function CodeEditorHeader({
  isRawMode,
  onOpenTemplates
}: Readonly<{ isRawMode: boolean; onOpenTemplates: () => void }>) {
  const notice = isRawMode ? RAW_MODE_READ_ONLY_NOTICE : undefined
  return (
    <div className="flex items-start justify-between p-4 pb-2">
      <div>
        <h2 className="text-lg font-semibold">Custom Code</h2>
        <p className="text-sm text-muted-foreground">
          Write your custom plugin implementation here. This code will be placed inside the
          plugin&apos;s IIFE after the auto-generated parameter parsing and command registration.
        </p>
      </div>
      <HintWrapper hint={notice} className="shrink-0">
        <Button
          variant="outline"
          size="sm"
          onClick={onOpenTemplates}
          data-testid="template-inserter-open"
          disabled={isRawMode}
          title={notice}
          className="shrink-0 gap-2"
        >
          <Wand2 className="h-4 w-4" />
          Insert Template
        </Button>
      </HintWrapper>
    </div>
  )
}

export function CodeEditor() {
  const customCode = usePluginStore((s) => s.plugin.customCode) ?? ''
  const setCustomCode = usePluginStore((s) => s.setCustomCode)
  const [isTemplateOpen, setIsTemplateOpen] = useState(false)
  const isRawMode = useIsRawModeActive()
  const theme = useSettingsStore((s) => s.theme)
  const editorOptions = useEditorOptions(isRawMode)
  const handleBeforeMount = useCompletions()

  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null)

  const handleMount = useCallback((ed: editor.IStandaloneCodeEditor) => {
    editorRef.current = ed
  }, [])

  const handleChange = useCallback(
    (value = '') => {
      setCustomCode(value)
    },
    [setCustomCode]
  )

  const handleInsertTemplate = (code: string) => {
    const ed = editorRef.current
    if (ed === null) {
      // No editor has mounted yet: append to the store value
      setCustomCode(appendTemplateCode(customCode, code))
      return
    }
    insertIntoEditor(ed, code)
  }

  return (
    <div className="flex h-full flex-col">
      <CodeEditorHeader
        isRawMode={isRawMode}
        onOpenTemplates={() => {
          setIsTemplateOpen(true)
        }}
      />

      {isRawMode && (
        <p className="px-4 pb-2 text-sm text-muted-foreground">{RAW_MODE_READ_ONLY_NOTICE}</p>
      )}

      {/* Monaco Editor fills remaining space */}
      <div className="flex-1 min-h-0">
        <Editor
          height="100%"
          language="javascript"
          value={customCode}
          theme={editorTheme(theme)}
          beforeMount={handleBeforeMount}
          onMount={handleMount}
          onChange={handleChange}
          options={editorOptions}
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
        onClose={() => {
          setIsTemplateOpen(false)
        }}
        onInsert={handleInsertTemplate}
        readOnly={isRawMode}
      />
    </div>
  )
}
