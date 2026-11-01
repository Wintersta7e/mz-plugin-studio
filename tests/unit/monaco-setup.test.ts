// The bundled code editor's setup: the editor instance handed to the React wrapper, and the
// workers it starts, from a blob in the built app and as modules under the dev server
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

const h = vi.hoisted(() => ({
  config: vi.fn(),
  editorWorkerUrl: './assets/editor.worker-a1.js',
  tsWorkerUrl: './assets/ts.worker-b2.js'
}))

vi.mock('monaco-editor/editor', () => ({ editor: { name: 'editor namespace' }, languages: {} }))
vi.mock('monaco-editor/features/register.all', () => ({}))
vi.mock('monaco-editor/languages/definitions/javascript/register', () => ({}))
vi.mock('monaco-editor/languages/features/typescript/register', () => ({}))
vi.mock('monaco-editor/editor/editor.worker?worker&url', () => ({ default: h.editorWorkerUrl }))
vi.mock('monaco-editor/languages/features/typescript/ts.worker?worker&url', () => ({
  default: h.tsWorkerUrl
}))
vi.mock('@monaco-editor/react', () => ({ loader: { config: h.config } }))

const PAGE = 'file:///app/out/renderer/index.html'

class FakeWorker {
  constructor(
    readonly url: string,
    readonly options?: { type?: string }
  ) {}
}

type GetWorker = (workerId: string, label: string) => FakeWorker
const blobs = new Map<string, Blob>()
const configCalls: unknown[][] = []
const scope: { MonacoEnvironment?: { getWorker: GetWorker } } = {}

function getWorker(label: string): FakeWorker {
  const environment = scope.MonacoEnvironment
  if (environment === undefined) throw new Error('the setup set no editor environment')
  return environment.getWorker('', label)
}

beforeAll(async () => {
  vi.stubGlobal('self', scope)
  vi.stubGlobal('Worker', FakeWorker)
  vi.stubGlobal('location', { href: PAGE })
  vi.spyOn(URL, 'createObjectURL').mockImplementation((blob) => {
    const url = `blob:test/${blobs.size}`
    blobs.set(url, blob as Blob)
    return url
  })
  await import('../../src/renderer/src/lib/monaco-setup')
  // Vitest clears call records before each test
  configCalls.push(...h.config.mock.calls)
})

afterAll(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

beforeEach(() => {
  vi.unstubAllEnvs()
})

describe('code editor setup', () => {
  it('hands the bundled editor to the React wrapper', async () => {
    const monaco = await import('monaco-editor/editor')
    expect(configCalls).toHaveLength(1)
    expect(configCalls[0]?.[0]).toEqual({ monaco })
    expect((configCalls[0]?.[0] as { monaco: unknown }).monaco).toBe(monaco)
  })

  it('starts each built worker as a classic worker from a blob', async () => {
    vi.stubEnv('DEV', false)
    const cases: [string, string][] = [
      ['typescript', h.tsWorkerUrl],
      ['javascript', h.tsWorkerUrl],
      ['css', h.editorWorkerUrl],
      ['editorWorkerService', h.editorWorkerUrl]
    ]
    for (const [label, url] of cases) {
      const worker = getWorker(label)
      expect(worker.options, label).toBeUndefined()
      const blob = blobs.get(worker.url)
      expect(blob, `${label}: a blob URL`).toBeDefined()
      const absolute = new URL(url, PAGE).href
      expect(await blob?.text(), label).toBe(`importScripts(${JSON.stringify(absolute)});`)
    }
    console.log(`monaco setup: built worker labels ${cases.length}`)
  })

  it('starts module workers from their URL under the dev server', () => {
    vi.stubEnv('DEV', true)
    const ts = getWorker('typescript')
    expect([ts.url, ts.options]).toEqual([h.tsWorkerUrl, { type: 'module' }])
    const editor = getWorker('css')
    expect([editor.url, editor.options]).toEqual([h.editorWorkerUrl, { type: 'module' }])
  })
})
