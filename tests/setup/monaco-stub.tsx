// Monaco cannot load in jsdom. This module replaces `@monaco-editor/react` for the DOM projects:
// an editor is a textarea, and `beforeMount`/`onMount` receive a fake Monaco namespace and a fake
// editor whose members are recorded `vi.fn`s.
import { useEffect, useRef, useState } from 'react'
import { vi, type Mock } from 'vitest'

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

interface Disposable {
  dispose: Mock<() => void>
}

export function createFakeMonaco() {
  return {
    languages: {
      registerCompletionItemProvider: vi.fn<(language: string) => Disposable>((language) => {
        const provider = { language, disposed: false }
        monacoStub.providers.push(provider)
        return {
          dispose: vi.fn<() => void>(() => {
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

interface Edit {
  range: Range
  text: string
}

interface Selection extends Range {
  isEmpty: () => boolean
}

interface EditorOptions {
  readOnly?: boolean
  fontSize?: number
}

/**
The 1-based line and column of `offset` in `text`, as Monaco counts them.
*/
function position(text: string, offset: number): { line: number; column: number } {
  const before = text.slice(0, offset)
  const lineStart = before.lastIndexOf('\n') + 1
  return { line: before.split('\n').length, column: before.length - lineStart + 1 }
}

/**
The offset in `text` of a 1-based line and column.
*/
function offsetOf(text: string, line: number, column: number): number {
  let offset = 0
  const linesBefore = text.split('\n').slice(0, line - 1)
  for (const before of linesBefore) offset += before.length + 1
  return offset + column - 1
}

export function createFakeEditor(
  read: () => string,
  write: (value: string) => void,
  selection: () => { start: number; end: number }
) {
  const lines = (): string[] => read().split('\n')
  const lineMaxColumn = (line: number): number => (lines().at(line - 1) ?? '').length + 1
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
    getValue: vi.fn<() => string>(read),
    setValue: vi.fn<(value: string) => void>(write),
    // Applies each edit's line/column range to the text, as Monaco does
    executeEdits: vi.fn<(source: string, edits: Edit[]) => boolean>((_source, edits) => {
      let text = read()
      for (const { range, text: insert } of edits) {
        const start = offsetOf(text, range.startLineNumber, range.startColumn)
        const end = offsetOf(text, range.endLineNumber, range.endColumn)
        text = text.slice(0, start) + insert + text.slice(end)
      }
      write(text)
      return true
    }),
    getModel: vi.fn<() => typeof model>(() => model),
    // The textarea's selection, as a Monaco range
    getSelection: vi.fn<() => Selection>(() => {
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
    focus: vi.fn<() => void>(),
    updateOptions: vi.fn<(options: EditorOptions) => void>(),
    onDidChangeModelContent: vi.fn<() => Disposable>(() => ({ dispose: vi.fn<() => void>() }))
  }
}

export type FakeEditor = ReturnType<typeof createFakeEditor>

interface EditorProps {
  value?: string
  defaultValue?: string
  options?: EditorOptions
  beforeMount?: (monaco: FakeMonaco) => void
  onMount?: (editor: FakeEditor, monaco: FakeMonaco) => void
  onChange?: (value: string | undefined) => void
}

export function Editor({
  value,
  defaultValue = '',
  options,
  beforeMount,
  onMount,
  onChange
}: Readonly<EditorProps>) {
  const [text, setText] = useState(defaultValue)
  const shown = value ?? text
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  // Monaco calls the mount callbacks once, with the props of the first render.
  const mountRef = useRef({ beforeMount, onMount, onChange })
  const editorRef = useRef<FakeEditor | null>(null)

  useEffect(() => {
    const { beforeMount, onMount, onChange } = mountRef.current
    const textarea = textareaRef.current
    if (textarea === null) return
    const monaco = createFakeMonaco()
    beforeMount?.(monaco)
    const editor = createFakeEditor(
      () => textarea.value,
      (next) => {
        setText(next)
        onChange?.(next)
      },
      () => ({ start: textarea.selectionStart, end: textarea.selectionEnd })
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
      onChange={(event) => {
        setText(event.target.value)
        onChange?.(event.target.value)
      }}
    />
  )
}

export function DiffEditor({
  original = '',
  modified = ''
}: Readonly<{ original?: string; modified?: string }>) {
  return (
    <>
      <textarea data-testid="monaco-diff-original" value={original} readOnly />
      <textarea data-testid="monaco-diff-modified" value={modified} readOnly />
    </>
  )
}
