// Monaco cannot load in jsdom. This module replaces `@monaco-editor/react` for the DOM projects:
// an editor is a textarea, and `beforeMount`/`onMount` receive a fake Monaco namespace and a fake
// editor whose members are recorded `vi.fn`s.
import { useEffect, useRef, useState } from 'react'
import { vi } from 'vitest'

/**
Every completion provider registered since the last reset, and whether it was disposed; every
editor mounted since the last reset, in mount order.
*/
export const monacoStub: {
  providers: { language: string; disposed: boolean }[]
  editors: FakeEditor[]
} = {
  providers: [],
  editors: []
}

export function resetMonacoStub(): void {
  monacoStub.providers = []
  monacoStub.editors = []
}

export function createFakeMonaco() {
  return {
    languages: {
      registerCompletionItemProvider: vi.fn((language: string) => {
        const provider = { language, disposed: false }
        monacoStub.providers.push(provider)
        return {
          dispose: vi.fn(() => {
            provider.disposed = true
          })
        }
      })
    }
  }
}

export type FakeMonaco = ReturnType<typeof createFakeMonaco>

interface Range {
  startLineNumber: number
  startColumn: number
  endLineNumber: number
  endColumn: number
}

/** The 1-based line and column of `offset` in `text`, as Monaco counts them. */
function position(text: string, offset: number): { line: number; column: number } {
  const before = text.slice(0, offset).split('\n')
  return { line: before.length, column: before[before.length - 1].length + 1 }
}

/** The offset in `text` of a 1-based line and column. */
function offsetOf(text: string, line: number, column: number): number {
  const lines = text.split('\n')
  let offset = 0
  for (let i = 0; i < line - 1; i++) offset += lines[i].length + 1
  return offset + column - 1
}

export function createFakeEditor(
  read: () => string,
  write: (value: string) => void,
  selection: () => { start: number; end: number }
) {
  const lines = (): string[] => read().split('\n')
  const lineMaxColumn = (line: number): number => lines()[line - 1].length + 1
  const model = {
    getValue: read,
    getLineCount: () => lines().length,
    getLineMaxColumn: lineMaxColumn,
    getFullModelRange: (): Range => {
      const count = lines().length
      return {
        startLineNumber: 1,
        startColumn: 1,
        endLineNumber: count,
        endColumn: lineMaxColumn(count)
      }
    }
  }
  return {
    getValue: vi.fn(read),
    setValue: vi.fn(write),
    // Applies each edit's line/column range to the text, as Monaco does
    executeEdits: vi.fn((_source: string, edits: { range: Range; text: string }[]) => {
      let text = read()
      for (const { range, text: insert } of edits) {
        const start = offsetOf(text, range.startLineNumber, range.startColumn)
        const end = offsetOf(text, range.endLineNumber, range.endColumn)
        text = text.slice(0, start) + insert + text.slice(end)
      }
      write(text)
      return true
    }),
    getModel: vi.fn(() => model),
    // The textarea's selection, as a Monaco range
    getSelection: vi.fn(() => {
      const text = read()
      const { start, end } = selection()
      const from = position(text, start)
      const to = position(text, end)
      return {
        startLineNumber: from.line,
        startColumn: from.column,
        endLineNumber: to.line,
        endColumn: to.column,
        isEmpty: () => start === end
      }
    }),
    focus: vi.fn(),
    updateOptions: vi.fn(),
    onDidChangeModelContent: vi.fn(() => ({ dispose: vi.fn() }))
  }
}

export type FakeEditor = ReturnType<typeof createFakeEditor>

interface EditorProps {
  value?: string
  defaultValue?: string
  options?: { readOnly?: boolean; fontSize?: number }
  beforeMount?: (monaco: FakeMonaco) => void
  onMount?: (editor: FakeEditor, monaco: FakeMonaco) => void
  onChange?: (value: string | undefined) => void
}

export function Editor({
  value,
  defaultValue,
  options,
  beforeMount,
  onMount,
  onChange
}: EditorProps) {
  const [text, setText] = useState(defaultValue ?? '')
  const shown = value ?? text
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  // Monaco calls the mount callbacks once, with the props of the first render.
  const mountRef = useRef({ beforeMount, onMount, onChange })
  const editorRef = useRef<FakeEditor | null>(null)

  useEffect(() => {
    const { beforeMount, onMount, onChange } = mountRef.current
    const monaco = createFakeMonaco()
    beforeMount?.(monaco)
    const editor = createFakeEditor(
      () => textareaRef.current!.value,
      (next) => {
        setText(next)
        onChange?.(next)
      },
      () => ({
        start: textareaRef.current!.selectionStart,
        end: textareaRef.current!.selectionEnd
      })
    )
    editorRef.current = editor
    monacoStub.editors.push(editor)
    onMount?.(editor, monaco)
  }, [])

  // Monaco applies changed options to the mounted editor
  const optionsRef = useRef(options)
  useEffect(() => {
    if (optionsRef.current === options) return
    optionsRef.current = options
    if (options) editorRef.current?.updateOptions(options)
  }, [options])

  return (
    <textarea
      ref={textareaRef}
      data-testid="monaco-editor"
      readOnly={options?.readOnly}
      value={shown}
      onChange={(e) => {
        setText(e.target.value)
        onChange?.(e.target.value)
      }}
    />
  )
}

export default Editor

export function DiffEditor({ original, modified }: { original?: string; modified?: string }) {
  return (
    <>
      <textarea data-testid="monaco-diff-original" value={original ?? ''} readOnly />
      <textarea data-testid="monaco-diff-modified" value={modified ?? ''} readOnly />
    </>
  )
}
