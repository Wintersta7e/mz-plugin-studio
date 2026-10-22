// Monaco cannot load in jsdom. This module replaces `@monaco-editor/react` for the DOM projects:
// an editor is a textarea, and `beforeMount`/`onMount` receive a fake Monaco namespace and a fake
// editor whose members are recorded `vi.fn`s.
import { useEffect, useRef, useState } from 'react'
import { vi } from 'vitest'

export function createFakeMonaco() {
  return {
    languages: {
      registerCompletionItemProvider: vi.fn(() => ({ dispose: vi.fn() }))
    }
  }
}

export type FakeMonaco = ReturnType<typeof createFakeMonaco>

export function createFakeEditor(read: () => string, write: (value: string) => void) {
  return {
    getValue: vi.fn(read),
    setValue: vi.fn(write),
    executeEdits: vi.fn(() => true),
    getModel: vi.fn(() => ({ getValue: read })),
    getSelection: vi.fn(() => null),
    focus: vi.fn(),
    updateOptions: vi.fn(),
    onDidChangeModelContent: vi.fn(() => ({ dispose: vi.fn() }))
  }
}

export type FakeEditor = ReturnType<typeof createFakeEditor>

interface EditorProps {
  value?: string
  defaultValue?: string
  options?: { readOnly?: boolean }
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

  useEffect(() => {
    const { beforeMount, onMount, onChange } = mountRef.current
    const monaco = createFakeMonaco()
    beforeMount?.(monaco)
    const editor = createFakeEditor(
      () => textareaRef.current!.value,
      (next) => {
        setText(next)
        onChange?.(next)
      }
    )
    onMount?.(editor, monaco)
  }, [])

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
