// The exact saved form of each store, empty and populated, pinned before schema versioning
// changes it.
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterAll, beforeEach, describe, it, expect, vi } from 'vitest'
import { byCodeUnit, normaliseIds } from './corpus/normalise'
import { POPULATED, persistedStores } from './corpus/persisted'
import { PERSISTED_SEEDS } from './corpus/persisted-seeds'

interface StoreHook {
  setState(partial: Record<string, unknown>): void
  getState(): Record<string, unknown>
}

const stores = persistedStores()

// Every string `id` property in `value`, depth first (an array's entries are its items).
function ids(value: unknown): string[] {
  if (typeof value !== 'object' || value === null) return []
  const found: string[] = []
  const entries: [string, unknown][] = Object.entries(value)
  for (const [k, v] of entries) {
    if (k === 'id' && typeof v === 'string') found.push(v)
    else found.push(...ids(v))
  }
  return found
}

const isStoreHook = (value: unknown): value is StoreHook =>
  typeof value === 'function' &&
  'getState' in value &&
  typeof value.getState === 'function' &&
  'setState' in value &&
  typeof value.setState === 'function'

// The writer every store module saves through; it holds a change until the edits pause.
const WRITER_PATH = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../src/renderer/src/stores/persist.ts'
)

interface Writer {
  flushPersistedState(): void
  stopUnloadListeners(): void
}

const isWriter = (value: unknown): value is Writer =>
  typeof value === 'object' &&
  value !== null &&
  'flushPersistedState' in value &&
  typeof value.flushPersistedState === 'function' &&
  'stopUnloadListeners' in value &&
  typeof value.stopUnloadListeners === 'function'

// The writer the store `freshStore` returned last saves through
const loaded: { writer?: Writer } = {}

// Writes what the store `freshStore` returned last still holds.
function flushStored(): void {
  loaded.writer?.flushPersistedState()
}

// The store `exportName` of a fresh copy of `modulePath`, which loads what localStorage holds.
async function freshStore(modulePath: string, exportName: string): Promise<StoreHook> {
  // the copy about to be replaced writes what it holds and leaves no page listener behind
  flushStored()
  loaded.writer?.stopUnloadListeners()
  vi.resetModules()
  const module: unknown = await import(modulePath)
  const store: unknown =
    typeof module === 'object' && module !== null ? Reflect.get(module, exportName) : undefined
  if (!isStoreHook(store)) throw new Error(`${modulePath} exports no store ${exportName}`)
  const writer: unknown = await import(WRITER_PATH)
  if (!isWriter(writer)) throw new Error(`${WRITER_PATH} exports no writer`)
  loaded.writer = writer
  return store
}

const PLUGIN_KEY = 'mz-plugin-studio-plugin'

// Every value the plugin store keeps in localStorage, by key in code-unit order, parsed.
function pluginStorage(): Record<string, unknown> {
  const keys: string[] = []
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index)
    if (key !== null && (key === PLUGIN_KEY || key.startsWith(`${PLUGIN_KEY}.`))) keys.push(key)
  }
  const values: [string, unknown][] = keys
    .toSorted(byCodeUnit)
    .map((key) => [key, JSON.parse(localStorage.getItem(key) ?? '')])
  return Object.fromEntries(values)
}

describe('persisted store goldens', () => {
  // The ui store's load defers a prune of raw-mode entries to the next tick, and the prune saves.
  // Let one queued by an earlier case run now, not after this case has cleared storage.
  beforeEach(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0))
  })

  it('finds every persisted store and a populated state for each', () => {
    const keys = stores.map((s) => s.key)
    const populated = keys.filter((k) => Object.hasOwn(POPULATED, k)).length
    process.stdout.write(`persisted keys ${String(populated)}/${String(keys.length)}\n`)

    expect(keys.length).toBeGreaterThan(0)
    expect(new Set(keys).size).toBe(keys.length)
    expect(keys.toSorted(byCodeUnit)).toStrictEqual(Object.keys(POPULATED).toSorted(byCodeUnit))
  })

  const savedForms = stores.flatMap((store) =>
    (['default', 'populated'] as const).map((state) => ({ ...store, state }))
  )

  it.each(savedForms)('$key: $state', async ({ key, modulePath, exportName, state }) => {
    expect.assertions(2)

    localStorage.clear()
    const store = await freshStore(modulePath, exportName)
    store.setState(state === 'default' ? {} : (POPULATED[key] ?? {}))
    flushStored()
    const raw = localStorage.getItem(key)
    // The plugin store keeps each open tab in a key of its own beside this one
    const saved = key === PLUGIN_KEY ? JSON.stringify(pluginStorage()) : (raw ?? '')

    expect(raw, `${key} wrote nothing`).not.toBeNull()
    await expect(normaliseIds(saved) + '\n').toMatchFileSnapshot(
      `__golden__/persisted/${key}.${state}.json`
    )
  })

  // A restart loads the saved form back through each store's shape checks, which keep the id of
  // every plugin, parameter and entry they restore; a new id would orphan what refers to the old.
  const withIds = stores.filter(({ key }) => ids(Object.values(POPULATED[key] ?? {})).length > 0)

  it('finds stores that save ids', () => {
    expect(withIds.length).toBeGreaterThan(0)
  })

  it.each(withIds)(
    '$key: keeps every saved id across a restart',
    async ({ key, modulePath, exportName }) => {
      expect.assertions(1)

      localStorage.clear()
      const populated = POPULATED[key] ?? {}
      const saving = await freshStore(modulePath, exportName)
      saving.setState(populated)
      const loading = await freshStore(modulePath, exportName)
      const restored = loading.getState()
      const fields = Object.keys(populated)

      expect(ids(fields.map((f) => restored[f]))).toStrictEqual(
        ids(fields.map((f) => populated[f]))
      )
    }
  )
})

// Plugin definitions (a record with `meta` and `parameters`) anywhere in `value`.
function definitions(value: unknown): number {
  if (typeof value !== 'object' || value === null) return 0
  const own = 'meta' in value && 'parameters' in value ? 1 : 0
  const children: unknown[] = Object.values(value)
  return own + children.reduce<number>((sum, child) => sum + definitions(child), 0)
}

describe('persisted plugin seeds', () => {
  const lines: string[] = []

  afterAll(() => {
    process.stdout.write(`${lines.join('\n')}\nseeds ${String(lines.length)}\n`)
  })

  const plugin = stores.find((store) => store.key === PLUGIN_KEY)

  it('finds the plugin store and every seed', () => {
    expect(plugin, `no store saves ${PLUGIN_KEY}`).toBeDefined()
    expect(PERSISTED_SEEDS.length).toBeGreaterThan(0)
  })

  it.each(PERSISTED_SEEDS)('seed $name', async ({ name, state }) => {
    expect.assertions(4)

    localStorage.clear()
    const store = await freshStore(plugin?.modulePath ?? '', plugin?.exportName ?? '')
    store.setState(state)
    flushStored()
    const saved = pluginStorage()
    const text = JSON.stringify(saved, undefined, 2)
    lines.push(
      `seed ${name}: chars ${String(text.length)}, definitions ${String(definitions(saved))}`
    )

    expect(Object.keys(saved).length, `${name} wrote nothing`).toBeGreaterThan(0)

    // The active tab is stored once, in its tab key: the index holds no plugin, unsaved mark or
    // saved path of its own, and each definition is a tab key's or a baseline
    const index = saved[PLUGIN_KEY]
    const indexState: unknown =
      typeof index === 'object' && index !== null && 'state' in index ? index.state : undefined
    const indexFields =
      typeof indexState === 'object' && indexState !== null ? Object.keys(indexState) : []
    const tabKeys = Object.keys(saved).filter((key) => key.startsWith(`${PLUGIN_KEY}.tab.`))
    const { baselineByPluginId } = state

    expect(indexFields).toStrictEqual(['schemaVersion', 'tabIds', 'activePluginId'])
    expect(definitions(saved)).toBe(tabKeys.length + definitions(baselineByPluginId))
    await expect(normaliseIds(text) + '\n').toMatchFileSnapshot(
      `__golden__/persisted/seed-${name}.json`
    )
  })
})
