// The bundled code editor's setup: the editor instance handed to the React wrapper, and the
// workers it starts, from a blob in the built app and as modules under the dev server
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

const h = vi.hoisted(() => ({
  config: vi.fn<(options: unknown) => void>(),
  editorWorkerUrl: './assets/editor.worker-a1.js',
  tsWorkerUrl: './assets/ts.worker-b2.js'
}))

vi.mock<Record<'editor' | 'languages', unknown>>(import('monaco-editor/editor'), () => ({
  editor: { name: 'editor namespace' },
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

function getWorker(label: string): FakeWorker {
  const worker = globalThis.MonacoEnvironment?.getWorker?.('', label)
  if (!(worker instanceof FakeWorker)) throw new TypeError('the setup set no editor environment')
  return worker
}

describe('code editor setup', () => {
  beforeAll(async () => {
    vi.stubGlobal('MonacoEnvironment', undefined)
    vi.stubGlobal('Worker', FakeWorker)
    vi.stubGlobal('location', { href: PAGE })
    vi.spyOn(URL, 'createObjectURL').mockImplementation((blob) => {
      if (!(blob instanceof Blob)) throw new TypeError('the setup made an object URL of a non-blob')
      const url = `blob:test/${String(blobs.size)}`
      blobs.set(url, blob)
      return url
    })
    await import('../../src/renderer/src/lib/monaco-setup')
    // Vitest clears call records before each test
    configCalls.push(...h.config.mock.calls)
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

  it('starts each built worker as a classic worker from a blob', async () => {
    expect.hasAssertions()

    vi.stubEnv('DEV', false)
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

  it('starts module workers from their URL under the dev server', () => {
    vi.stubEnv('DEV', true)
    const ts = getWorker('typescript')

    expect([ts.url, ts.options]).toStrictEqual([h.tsWorkerUrl, { type: 'module' }])

    const editor = getWorker('css')

    expect([editor.url, editor.options]).toStrictEqual([h.editorWorkerUrl, { type: 'module' }])
  })
})
