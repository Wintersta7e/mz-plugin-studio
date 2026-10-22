// Reload from project: an imported tab whose file text did not come back after a restart gets it
// again from the project, keeping the edits made since.
import { readFileSync } from 'fs'
import { createElement } from 'react'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PluginParser } from '../../src/main/services/pluginParser'
import type * as StoresModule from '../../src/renderer/src/stores'
import { toBaseline } from '../../src/shared/types/plugin'
import type { PluginDefinition } from '../../src/shared/types/plugin'
import { createFakeApi } from '../helpers/fake-api'
import { fixturePath } from '../helpers/fixture-project'
import { readV160Payloads } from '../helpers/persist-v160'
import { seed } from './support/load-persisted'

const payloads = readV160Payloads()
const TAB = '00000000-0000-4000-8000-000000000013'
const FILE = 'Fixture_HandWritten.js'
const PROJECT = '/fixture/mz-project'
const TEXT = readFileSync(fixturePath('js', 'plugins', FILE), 'utf-8')
const RELOAD = 'Reload from project'

type Stores = typeof StoresModule

/** Imports the app afresh over what localStorage holds and shows the imported tab. */
async function startApp(api: Window['api'], withProject: boolean): Promise<Stores> {
  window.api = api
  vi.resetModules()
  const { default: App } = await import('../../src/renderer/src/App')
  const stores = await import('../../src/renderer/src/stores')
  render(createElement(App))
  const project = { ...(await api.project.load(PROJECT)), path: PROJECT }
  act(() => {
    if (withProject) stores.useProjectStore.setState({ project })
    stores.usePluginStore.getState().setActivePlugin(TAB)
    stores.useUIStore.getState().setPreviewCollapsed(false)
    stores.usePluginStore.getState().updateMeta({ description: 'Edited before reload' })
  })
  return stores
}

describe('reloading an imported plugin from the project', () => {
  beforeEach(() => {
    seed(payloads)
    vi.stubGlobal('__APP_VERSION__', '0.0.0-test')
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('brings back the file text and its baseline and keeps the edits', async () => {
    let parsed: PluginDefinition | null = null
    const api = createFakeApi({
      plugin: {
        readRaw: vi.fn(async () => TEXT),
        parse: vi.fn(async (content: string) => (parsed = PluginParser.parsePlugin(content)))
      },
      dialog: { message: vi.fn(async () => 1) }
    })
    const stores = await startApp(api, true)
    const tab = (): PluginDefinition => stores.usePluginStore.getState().plugin
    expect(tab().rawSource).toBeUndefined()

    fireEvent.click(await screen.findByRole('button', { name: RELOAD }))
    await waitFor(() => expect(tab().rawSource).toBe(TEXT))
    expect(api.dialog.message).toHaveBeenCalledWith({
      type: 'question',
      title: 'Reload from project?',
      message: `Reload ${PROJECT}/js/plugins/${FILE}? The plugin's current edits are kept and applied to the reloaded file.`,
      buttons: ['Cancel', 'Reload']
    })
    expect(api.plugin.readRaw).toHaveBeenCalledWith(PROJECT, FILE)
    expect(parsed).not.toBeNull()
    const loaded = parsed as unknown as PluginDefinition
    expect(stores.usePluginStore.getState().baselineByPluginId[TAB]).toEqual(
      toBaseline({
        ...loaded,
        id: TAB,
        importedFrom: FILE,
        meta: { ...loaded.meta, name: 'Fixture_HandWritten' }
      })
    )
    expect(tab().meta.description).toBe('Edited before reload')
    expect(stores.usePluginStore.getState().openPlugins.find((p) => p.id === TAB)?.rawSource).toBe(
      TEXT
    )
    await waitFor(() => expect(screen.queryByRole('button', { name: RELOAD })).toBeNull())
  }, 60_000)

  it('cancelling the confirmation reads nothing', async () => {
    const api = createFakeApi({ dialog: { message: vi.fn(async () => 0) } })
    const stores = await startApp(api, true)
    fireEvent.click(await screen.findByRole('button', { name: RELOAD }))
    await waitFor(() => expect(api.dialog.message).toHaveBeenCalledTimes(1))
    await act(async () => {})
    expect(api.plugin.readRaw).not.toHaveBeenCalled()
    expect(stores.usePluginStore.getState().plugin.rawSource).toBeUndefined()
  }, 60_000)

  it('a file that cannot be read is reported and changes nothing', async () => {
    const api = createFakeApi({
      plugin: {
        readRaw: vi.fn(async () => {
          throw new Error('missing')
        })
      },
      dialog: { message: vi.fn(async () => 1) }
    })
    const stores = await startApp(api, true)
    fireEvent.click(await screen.findByRole('button', { name: RELOAD }))
    await waitFor(() =>
      expect(
        stores.useToastStore.getState().toasts.map((t) => `${t.type}: ${t.message}`)
      ).toContain(`error: Could not read ${PROJECT}/js/plugins/${FILE}: missing`)
    )
    expect(stores.usePluginStore.getState().plugin.rawSource).toBeUndefined()
  }, 60_000)

  it('without a project the button is disabled and says why', async () => {
    const api = createFakeApi()
    await startApp(api, false)
    const button = await screen.findByRole('button', { name: RELOAD })
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('title', 'Open the project first.')
  }, 60_000)
})
