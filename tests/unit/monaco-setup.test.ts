// The bundled code editor's setup: the editor instance handed to the React wrapper, its dark theme,
// and the workers it starts, from a blob on a page loaded from disk and as modules under the dev
// server
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  DARK_EDITOR_THEME,
  darkEditorTheme,
  editorTheme
} from '../../src/renderer/src/lib/editor-theme'

const h = vi.hoisted(() => ({
  config: vi.fn<(options: unknown) => void>(),
  defineTheme: vi.fn<(name: string, data: unknown) => void>(),
  editorWorkerUrl: './assets/editor.worker-a1.js',
  tsWorkerUrl: './assets/ts.worker-b2.js'
}))

vi.mock<Record<'editor' | 'languages', unknown>>(import('monaco-editor/editor'), () => ({
  editor: { name: 'editor namespace', defineTheme: h.defineTheme },
  languages: {}
}))
vi.mock(import('monaco-editor/features/register.all'), () => ({}))
vi.mock(import('monaco-editor/languages/definitions/javascript/register'), () => ({}))
vi.mock(import('monaco-editor/languages/features/typescript/register'), () => ({}))
vi.mock(import('monaco-editor/editor/editor.worker?worker&url'), () => ({
  default: h.editorWorkerUrl
}))
vi.mock(import('monaco-editor/languages/features/typescript/ts.worker?worker&url'), () => ({
  default: h.tsWorkerUrl
}))
vi.mock<Record<'loader', unknown>>(import('@monaco-editor/react'), () => ({
  loader: { config: h.config }
}))

const PAGE = 'file:///app/out/renderer/index.html'
const DEV_PAGE = 'http://localhost:5173/'

class FakeWorker {
  readonly url: string
  readonly options: { type?: string } | undefined
  constructor(url: string, options?: { type?: string }) {
    this.url = url
    this.options = options
  }
}

const blobs = new Map<string, Blob>()
const configCalls: unknown[][] = []
const themeCalls: unknown[][] = []

function getWorker(label: string): FakeWorker {
  const worker = globalThis.MonacoEnvironment?.getWorker?.('', label)
  if (!(worker instanceof FakeWorker)) throw new TypeError('the setup set no editor environment')
  return worker
}

describe('code editor setup', () => {
  beforeAll(async () => {
    vi.stubGlobal('MonacoEnvironment', undefined)
    vi.stubGlobal('Worker', FakeWorker)
    vi.stubGlobal('location', { href: PAGE, protocol: 'file:' })
    vi.spyOn(URL, 'createObjectURL').mockImplementation((blob) => {
      if (!(blob instanceof Blob)) throw new TypeError('the setup made an object URL of a non-blob')
      const url = `blob:test/${String(blobs.size)}`
      blobs.set(url, blob)
      return url
    })
    await import('../../src/renderer/src/lib/monaco-setup')
    // Vitest clears call records before each test
    configCalls.push(...h.config.mock.calls)
    themeCalls.push(...h.defineTheme.mock.calls)
  })

  beforeEach(() => {
    vi.unstubAllEnvs()
  })

  afterAll(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('hands the bundled editor to the React wrapper', async () => {
    expect.hasAssertions()

    const monaco = await import('monaco-editor/editor')
    const options = configCalls.at(0)?.at(0)

    expect(configCalls).toHaveLength(1)
    expect(options).toStrictEqual({ monaco })
    expect(typeof options === 'object' && options !== null && Reflect.get(options, 'monaco')).toBe(
      monaco
    )
  })

  it('defines the dark theme the editor hosts pass for the dark app theme', () => {
    expect(themeCalls).toStrictEqual([[DARK_EDITOR_THEME, darkEditorTheme]])
    expect([editorTheme('dark'), editorTheme('light')]).toStrictEqual([DARK_EDITOR_THEME, 'vs'])
  })

  it('starts each built worker as a classic worker from a blob', async () => {
    expect.hasAssertions()

    vi.stubEnv('DEV', false)
    vi.stubGlobal('location', { href: PAGE, protocol: 'file:' })
    const cases: [string, string][] = [
      ['typescript', h.tsWorkerUrl],
      ['javascript', h.tsWorkerUrl],
      ['css', h.editorWorkerUrl],
      ['editorWorkerService', h.editorWorkerUrl]
    ]
    // Per label: the worker's options and the source of the blob it starts from
    const started = await Promise.all(
      cases.map(async ([label]) => {
        const worker = getWorker(label)
        return [label, worker.options, await blobs.get(worker.url)?.text()]
      })
    )
    process.stdout.write(`monaco setup: built worker labels ${String(cases.length)}\n`)

    expect(started).toStrictEqual(
      cases.map(([label, url]) => [
        label,
        undefined,
        `importScripts(${JSON.stringify(new URL(url, PAGE).href)});`
      ])
    )
  })

  it('starts blob workers on a page loaded from disk even in a dev-flagged build', async () => {
    expect.hasAssertions()

    vi.stubEnv('DEV', true)
    vi.stubGlobal('location', { href: PAGE, protocol: 'file:' })
    const ts = getWorker('typescript')

    expect([ts.options, await blobs.get(ts.url)?.text()]).toStrictEqual([
      undefined,
      `importScripts(${JSON.stringify(new URL(h.tsWorkerUrl, PAGE).href)});`
    ])
  })

  it('starts module workers from their URL under the dev server', () => {
    vi.stubEnv('DEV', true)
    vi.stubGlobal('location', { href: DEV_PAGE, protocol: 'http:' })
    const ts = getWorker('typescript')

    expect([ts.url, ts.options]).toStrictEqual([h.tsWorkerUrl, { type: 'module' }])

    const editor = getWorker('css')

    expect([editor.url, editor.options]).toStrictEqual([h.editorWorkerUrl, { type: 'module' }])
  })
})
