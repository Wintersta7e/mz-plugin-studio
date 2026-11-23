// A profile whose saved keys were copied verbatim, one of them missing, cut short or garbled on
// the way, beside the key main marks a carried profile with: each key loads whole or falls back,
// never half, and the marker is left alone and never listed as a backup.
import { createElement } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CONTENT_KEY_PREFIX, TAB_KEY_PREFIX } from '../../src/renderer/src/stores/plugin-storage'
import { byCodeUnit } from '../golden/corpus/normalise'
import { createFakeApi } from '../helpers/fake-api'
import { readPayloads } from '../helpers/persisted-payloads'
import { PERSISTED_KEYS } from '../helpers/persist-v160'
import { flushPrune, loadStores, seed, writeAll } from './support/load-persisted'
import { recordOf, typedStores } from './support/persisted-state'

const INDEX_KEY = 'mz-plugin-studio-plugin'
const UI_KEY = 'mz-plugin-studio-ui'
const MARKER_KEY = 'mz-plugin-studio-origin-handover'
const MARKER_TEXT = '{"status":"copied","keys":9}'

type Form = 'absent' | 'intact' | 'truncated' | 'corrupt'
const FORMS: readonly Form[] = ['absent', 'intact', 'truncated', 'corrupt']

// The text a copy leaves of `raw` in `form`; undefined when the key is not there
function copied(raw: string, form: Form): string | undefined {
  if (form === 'absent') return undefined
  if (form === 'truncated') return raw.slice(0, Math.floor(raw.length / 2))
  return form === 'corrupt' ? raw.replaceAll(':', ';') : raw
}

// Every key storage holds, with its text
const storedKeys = (): Record<string, string> =>
  Object.fromEntries(Object.keys(localStorage).map((key) => [key, localStorage.getItem(key) ?? '']))

// The tab id a tab or content key names
function tabIdOf(key: string): string | undefined {
  if (key.startsWith(TAB_KEY_PREFIX)) return key.slice(TAB_KEY_PREFIX.length)
  if (!key.startsWith(CONTENT_KEY_PREFIX)) return undefined
  return key.slice(CONTENT_KEY_PREFIX.length).replace(/\.\d+$/, '')
}

// The store a key belongs to: the plugin store keeps its tabs under keys of their own
const storeOf = (key: string): string => (tabIdOf(key) === undefined ? key : INDEX_KEY)

/**
What the stores hold after a load from storage: each store but the plugin store whole, the open
tabs each with its parts, the backups listed and the stores the load report names.
*/
async function loaded() {
  const stores = await loadStores()
  await flushPrune()
  const { plugin, ui } = await typedStores(stores)
  const state = plugin.getState()
  const persist = await import('../../src/renderer/src/stores/persist')
  const reported = new Set<string>(persist.takeRestoreReport().map(({ name }) => name))
  writeAll(stores)
  return {
    others: Object.fromEntries(
      PERSISTED_KEYS.filter((key) => key !== INDEX_KEY).map((key) => [
        key,
        dataOf(stores[key].getState())
      ])
    ),
    tabs: state.openPlugins.map(({ id, ...definition }) => ({
      id,
      definition: dataOf(definition),
      dirty: state.dirtyByPluginId[id] === true,
      savedPath: state.savedPathsByPluginId[id],
      base: state.baseByPluginId[id],
      baseline: state.baselineByPluginId[id]
    })),
    activePluginId: state.activePluginId,
    rawModeIds: Object.keys(ui.getState().rawModeByPluginId),
    backups: persist.listBackups().map(({ key }) => key),
    reported: [...reported].toSorted(byCodeUnit),
    marker: localStorage.getItem(MARKER_KEY)
  }
}

// A store's state without its actions
const dataOf = (state: Record<string, unknown>): Record<string, unknown> =>
  Object.fromEntries(Object.entries(state).filter(([, value]) => typeof value !== 'function'))

type Loaded = Awaited<ReturnType<typeof loaded>>

// Loads `set` beside the marker
async function loadCopy(set: Record<string, string>): Promise<Loaded> {
  const copy: Record<string, string> = { ...set, [MARKER_KEY]: MARKER_TEXT }
  seed(copy)
  return loaded()
}

/**
The v1.9.0 set as this version splits it (what it writes after loading it), what loading it
whole shows, and what an empty profile shows. Built before the setup stubs main's api for each
test, so it stubs one itself.
*/
async function references() {
  vi.stubGlobal('api', createFakeApi())
  seed(readPayloads('v1.9.0'))
  writeAll(await loadStores())
  const set = storedKeys()
  const shown = await loadCopy(set)
  seed({})
  return { set, shown, empty: await loaded() }
}

const { set: split, shown: whole, empty: defaults } = await references()

const CASES = Object.keys(split)
  .toSorted(byCodeUnit)
  .flatMap((key) => FORMS.map((form) => ({ key, form })))

/**
The stores but the plugin store after a load in which the key `lost` was missing or damaged and the
tabs `ids` opened: that store loads its defaults, the layout keeps only the open tabs' raw-mode
switches, and the rest load as the whole copy did.
*/
function othersShown(
  lost: string | undefined,
  ids: Set<string>
): Record<string, Record<string, unknown>> {
  return Object.fromEntries(
    Object.entries(whole.others).map(([store, state]) => {
      if (store === lost) return [store, defaults.others[store] ?? {}]
      if (store !== UI_KEY) return [store, state]
      const switches = Object.entries(recordOf(state['rawModeByPluginId'], 'raw-mode switches'))
      return [
        store,
        { ...state, rawModeByPluginId: Object.fromEntries(switches.filter(([id]) => ids.has(id))) }
      ]
    })
  )
}

/**
What loading the copy with `key` in `form` shows: a store whose own key is damaged or missing
loads its defaults; a tab whose key is lost is not open, and neither is its raw-mode switch; a
tab whose file text is lost opens without it; with no index to read, every tab opens from its
key and the first is shown; everything else loads as the whole copy did.
*/
function expected(key: string, form: Form): Omit<Loaded, 'rawModeIds' | 'marker'> {
  const isLost = form !== 'intact'
  // the tab whose key is lost, or whose file text is
  const lostFrom = (prefix: string): string | undefined =>
    isLost && key.startsWith(prefix) ? tabIdOf(key) : undefined
  const lostTab = lostFrom(TAB_KEY_PREFIX)
  const lostText = lostFrom(CONTENT_KEY_PREFIX)
  const tabs = whole.tabs
    .filter(({ id }) => id !== lostTab)
    .map((tab) => {
      if (tab.id !== lostText) return tab
      const definition = Object.fromEntries(
        Object.entries(tab.definition).filter(([field]) => field !== 'rawSource')
      )
      return { ...tab, definition, baseline: undefined }
    })
  const ids = new Set(tabs.map(({ id }) => id))
  const isIndexLost = isLost && key === INDEX_KEY
  const active = isIndexLost ? tabs[0]?.id : whole.activePluginId
  // a missing store key is no damage; a missing tab key or file text is
  const isDamaged = form === 'absent' ? storeOf(key) !== key : isLost
  const backups = isDamaged ? [`${storeOf(key)}.backup`] : []
  return {
    others: othersShown(isLost ? key : undefined, ids),
    tabs,
    // no tab is shown when the one shown last is not open
    activePluginId:
      typeof active === 'string' && ids.has(active) ? active : defaults.activePluginId,
    backups,
    reported: isDamaged ? [storeOf(key)] : []
  }
}

describe('saved keys copied from another profile', { timeout: 60_000 }, () => {
  afterEach(() => {
    cleanup()
  })

  it('covers every saved key in every form', () => {
    expect.hasAssertions()

    process.stdout.write(`cases ${String(CASES.length)}\n`)

    // the plugin store's tab keys and the content key are copied too
    expect([
      CASES.length,
      CASES.some(({ key }) => key.startsWith(TAB_KEY_PREFIX)),
      CASES.some(({ key }) => key.startsWith(CONTENT_KEY_PREFIX))
    ]).toStrictEqual([Object.keys(split).length * FORMS.length, true, true])
  })

  it.for(CASES)('$key $form loads whole or falls back, never half', async ({ key, form }) => {
    const text = copied(split[key] ?? '', form)
    const set = Object.fromEntries(
      Object.entries(split).flatMap(([name, raw]): [string, string][] => {
        if (name !== key) return [[name, raw]]
        return text === undefined ? [] : [[name, text]]
      })
    )
    const { rawModeIds, marker, ...shown } = await loadCopy(set)
    const open = new Set(shown.tabs.map(({ id }) => id))

    expect({
      shown,
      orphanSwitches: rawModeIds.filter((id) => !open.has(id)),
      marker
    }).toStrictEqual({ shown: expected(key, form), orphanSwitches: [], marker: MARKER_TEXT })
  })

  it('the Data tab of Settings lists the backup of a damaged copy and not the marker', async () => {
    expect.hasAssertions()

    const copy: Record<string, string> = { ...split, [INDEX_KEY]: '{', [MARKER_KEY]: MARKER_TEXT }
    seed(copy)
    await loadStores()
    const { SettingsDialog } =
      await import('../../src/renderer/src/components/settings/SettingsDialog')
    render(
      createElement(SettingsDialog, {
        open: true,
        onOpenChange: vi.fn<(isOpen: boolean) => void>()
      })
    )
    fireEvent.mouseDown(screen.getByRole('tab', { name: 'Data' }), { button: 0 })
    const listed = screen.getByRole('tabpanel').textContent

    expect([
      listed.includes(`${INDEX_KEY}.backup`),
      listed.includes(MARKER_KEY),
      localStorage.getItem(MARKER_KEY)
    ]).toStrictEqual([true, false, MARKER_TEXT])
  })
})
