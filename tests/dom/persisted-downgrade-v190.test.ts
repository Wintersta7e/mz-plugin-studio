// Opening this version's saved state in v1.9.0 again, and coming back. Both sets were captured
// from the builds' own stores: `input.json` is what this version writes over v1.9.0's saved
// state, `after.json` what v1.9.0's stores wrote after loading `input.json`, each store once.
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { CONTENT_KEY_PREFIX, TAB_KEY_PREFIX } from '../../src/renderer/src/stores/plugin-storage'
import { byCodeUnit } from '../golden/corpus/normalise'
import { readPayloads } from '../helpers/persisted-payloads'
import { flushPrune, loadStores, seed, writeAll } from './support/load-persisted'
import { savedStateOf, typedStores } from './support/persisted-state'

const INDEX_KEY = 'mz-plugin-studio-plugin'
const UI_KEY = 'mz-plugin-studio-ui'
const BACKUP_KEY = `${INDEX_KEY}.backup`

// A captured set: every key storage held, with its text
function readSet(name: 'input' | 'after'): Record<string, string> {
  const file = path.join(process.cwd(), 'tests/fixtures/persisted/v1.9.0-downgrade', `${name}.json`)
  const parsed: unknown = JSON.parse(readFileSync(file, 'utf8'))
  if (typeof parsed !== 'object' || parsed === null) throw new TypeError(`${name} is no object`)
  return Object.fromEntries(
    Object.entries(parsed).map(([key, value]: [string, unknown]) => {
      if (typeof value !== 'string') throw new TypeError(`${name}: ${key} holds no text`)
      return [key, value]
    })
  )
}

const input = readSet('input')
const after = readSet('after')

// Every key storage holds, with its text
const storedKeys = (): Record<string, string> =>
  Object.fromEntries(Object.keys(localStorage).map((key) => [key, localStorage.getItem(key) ?? '']))

// The keys a single tab is stored under, with their text
const tabKeysOf = (set: Record<string, string>): Record<string, string> =>
  Object.fromEntries(
    Object.entries(set).filter(
      ([key]) => key.startsWith(TAB_KEY_PREFIX) || key.startsWith(CONTENT_KEY_PREFIX)
    )
  )

// The keys either set holds whose text differs between them, in code-unit order
const differingKeys = (a: Record<string, string>, b: Record<string, string>): string[] =>
  [...new Set([...Object.keys(a), ...Object.keys(b)])]
    .filter((key) => a[key] !== b[key])
    .toSorted(byCodeUnit)

const printCount = (keys: number): void => {
  process.stdout.write(`keys compared ${String(keys)}\n`)
}

describe('downgrade to v1.9.0', () => {
  it('this version, loading what v1.9.0 saved, writes the captured split state', async () => {
    expect.hasAssertions()

    seed(readPayloads('v1.9.0'))
    const stores = await loadStores()
    await flushPrune()
    writeAll(stores)
    const written = storedKeys()

    // a key named here was captured from an earlier version of this build: capture it again
    expect(differingKeys(written, input)).toStrictEqual([])

    printCount(Object.keys(input).length)

    expect(Object.keys(tabKeysOf(input)).length).toBeGreaterThan(0)
  })

  it('v1.9.0 backs up the index, shows no tab and changes no tab key', () => {
    expect.hasAssertions()

    const { openPlugins } = savedStateOf(after[INDEX_KEY], 'v1.9.0 plugin')
    const layoutBefore = savedStateOf(input[UI_KEY], 'layout written')
    const layoutAfter = savedStateOf(after[UI_KEY], 'v1.9.0 layout')

    // v1.9.0 reads the index as a newer version's and keeps it as the backup; the tab keys are
    // not its keys, and with no tab open it drops the raw-mode switches
    expect({
      backup: after[BACKUP_KEY],
      openPlugins,
      tabKeys: tabKeysOf(after),
      changed: differingKeys(input, after),
      rawMode: [layoutBefore['rawModeByPluginId'], layoutAfter['rawModeByPluginId']]
    }).toStrictEqual({
      backup: input[INDEX_KEY],
      openPlugins: [],
      tabKeys: tabKeysOf(input),
      changed: [INDEX_KEY, BACKUP_KEY, UI_KEY],
      rawMode: [{ '00000000-0000-4000-8000-000000000102': true }, {}]
    })

    printCount(new Set([...Object.keys(input), ...Object.keys(after)]).size)

    expect(Object.keys(tabKeysOf(after)).length).toBeGreaterThan(0)
  })

  it('this version, loading what v1.9.0 wrote back, deletes and adopts no tab key', async () => {
    expect.hasAssertions()

    seed(after)
    const stores = await loadStores()
    await flushPrune()
    const { plugin } = await typedStores(stores)
    writeAll(stores)

    expect([plugin.getState().openPlugins, tabKeysOf(storedKeys())]).toStrictEqual([
      [],
      tabKeysOf(after)
    ])

    printCount(Object.keys(after).length)
  })
})
