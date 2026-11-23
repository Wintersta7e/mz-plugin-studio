// What the app shows after loading the values each earlier release saved: tabs, the active tab,
// dirty marks, saved paths and file bases, each derived here from the release's own payload.
import { afterAll, describe, expect, it } from 'vitest'
import { PERSISTED_KEYS, readPayloads } from '../helpers/persisted-payloads'
import { loadStores, seed } from './support/load-persisted'
import { recordOf, recordsOf, savedStateOf } from './support/persisted-state'

const RELEASES = ['v1.6.0', 'v1.9.0'] as const

interface Shown {
  tabs: unknown[]
  active: unknown
  dirty: string[]
  savedPaths: Record<string, unknown>
  bases: Record<string, unknown>
}

const only = (map: Record<string, unknown>, ids: unknown[]): Record<string, unknown> =>
  Object.fromEntries(Object.entries(map).filter(([id]) => ids.includes(id)))

// A base as JSON text of its hash, so a hash of unknown content reads `null`.
const basesShown = (map: Record<string, unknown>): Record<string, unknown> =>
  Object.fromEntries(
    Object.entries(map).map(([id, base]) => {
      const { path, sha256 } = recordOf(base, 'base')
      return [id, { path, sha256: JSON.stringify(sha256) }]
    })
  )

const dirtyIds = (map: Record<string, unknown>, ids: unknown[]): string[] =>
  Object.keys(only(map, ids)).filter((id) => map[id] === true)

// The payload's own fields, as the release that wrote them showed them. A release without file
// bases had a base of unknown content for every saved path.
function expectedFrom(state: Record<string, unknown>): Shown {
  const tabs = recordsOf(state['openPlugins'], 'open plugins').map((tab) => tab['id'])
  const savedPaths = only(recordOf(state['savedPathsByPluginId'], 'saved paths'), tabs)
  const bases =
    state['baseByPluginId'] === undefined
      ? Object.fromEntries(
          Object.entries(savedPaths).map(([id, path]) => [id, { path, sha256: 'null' }])
        )
      : basesShown(only(recordOf(state['baseByPluginId'], 'bases'), tabs))
  return {
    tabs,
    active: state['activePluginId'],
    dirty: dirtyIds(recordOf(state['dirtyByPluginId'], 'dirty'), tabs),
    savedPaths,
    bases
  }
}

function shownBy(state: Record<string, unknown>): Shown {
  const tabs = recordsOf(state['openPlugins'], 'open plugins').map((tab) => tab['id'])
  return {
    tabs,
    active: state['activePluginId'],
    dirty: dirtyIds(recordOf(state['dirtyByPluginId'], 'dirty'), tabs),
    savedPaths: recordOf(state['savedPathsByPluginId'], 'saved paths'),
    bases: basesShown(recordOf(state['baseByPluginId'], 'bases'))
  }
}

describe('loading earlier saved state through the migration chain', () => {
  const loaded: string[] = []

  afterAll(() => {
    process.stdout.write(`${loaded.join('\n')}\n`)
  })

  it.each(RELEASES)('shows the tabs %s saved', async (release) => {
    expect.hasAssertions()

    const payloads = readPayloads(release)
    const present = PERSISTED_KEYS.filter((key) => payloads[key] !== undefined)
    const count = `keys loaded ${String(present.length)}/${String(PERSISTED_KEYS.length)}`
    loaded.push(`${release}: ${count}`)

    expect(present, `${release} ${count}`).toStrictEqual(PERSISTED_KEYS)

    seed(payloads)
    const stores = await loadStores()
    for (const key of PERSISTED_KEYS) {
      expect(stores[key].persist.hasHydrated(), `${release} ${key} hydrated`).toBe(true)
    }
    const expected = expectedFrom(
      savedStateOf(payloads['mz-plugin-studio-plugin'], `${release} plugin payload`)
    )

    expect(expected.tabs.length, `${release} tabs`).toBeGreaterThan(0)
    expect(shownBy(stores['mz-plugin-studio-plugin'].getState())).toStrictEqual(expected)
  })
})
