// The code editor ships inside the app: the editor core, its features, and the JavaScript and
// TypeScript language support, handed to the React wrapper so it never downloads a copy.
import * as monaco from 'monaco-editor/editor'
import 'monaco-editor/features/register.all'
import 'monaco-editor/languages/definitions/javascript/register'
import 'monaco-editor/languages/features/typescript/register'
import editorWorkerUrl from 'monaco-editor/editor/editor.worker?worker&url'
import tsWorkerUrl from 'monaco-editor/languages/features/typescript/ts.worker?worker&url'
import { loader } from '@monaco-editor/react'
import { DARK_EDITOR_THEME, darkEditorTheme } from './editor-theme'

/**
A page loaded from disk starts each worker from a blob that loads the worker's file, so the worker
runs under that page's policy, which admits blob workers only. The policy is chosen by how the page
loads, not by the build's mode, so the worker form follows the same fact: the dev server serves
module workers.
*/
function startWorker(url: string): Worker {
  if (location.protocol !== 'file:') return new Worker(url, { type: 'module' })
  const source = `importScripts(${JSON.stringify(new URL(url, location.href).href)});`
  return new Worker(URL.createObjectURL(new Blob([source], { type: 'text/javascript' })))
}

globalThis.MonacoEnvironment = {
  getWorker(_workerId, label) {
    const isTypescript = label === 'typescript' || label === 'javascript'
    return startWorker(isTypescript ? tsWorkerUrl : editorWorkerUrl)
  }
}

monaco.editor.defineTheme(DARK_EDITOR_THEME, darkEditorTheme)

loader.config({ monaco })
