// The code editor ships inside the app: the editor core, its features, and the JavaScript and
// TypeScript language support, handed to the React wrapper so it never downloads a copy.
import * as monaco from 'monaco-editor/editor'
import 'monaco-editor/features/register.all'
import 'monaco-editor/languages/definitions/javascript/register'
import 'monaco-editor/languages/features/typescript/register'
import editorWorkerUrl from 'monaco-editor/editor/editor.worker?worker&url'
import tsWorkerUrl from 'monaco-editor/languages/features/typescript/ts.worker?worker&url'
import { loader, type Monaco } from '@monaco-editor/react'

/**
The built app starts each worker from a blob that loads the worker's file, so the worker runs
under the page's policy, which admits blob workers only. The dev server serves module workers.
*/
function startWorker(url: string): Worker {
  if (import.meta.env.DEV) return new Worker(url, { type: 'module' })
  const source = `importScripts(${JSON.stringify(new URL(url, location.href).href)});`
  return new Worker(URL.createObjectURL(new Blob([source], { type: 'text/javascript' })))
}

self.MonacoEnvironment = {
  getWorker(_workerId, label) {
    const isTypescript = label === 'typescript' || label === 'javascript'
    return startWorker(isTypescript ? tsWorkerUrl : editorWorkerUrl)
  }
}

// The wrapper's type names the full package; the editor core carries every member it uses
loader.config({ monaco: monaco as Monaco })
