// The status bar: the open project and plugin, a brief "Saved" when the plugin's changes are
// saved, and the project's dependency check with a dialog listing its issues.
import { act, cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { StatusBar } from '../../src/renderer/src/components/layout/StatusBar'
import { usePluginStore, useProjectStore } from '../../src/renderer/src/stores'
import { createEmptyPlugin } from '../../src/renderer/src/types/plugin'
import type { ScannedPluginHeader } from '../../src/shared/ipc-types'
import { createFakeApi, sampleProject } from '../helpers/fake-api'
import { resetStores } from './support/reset-stores'

const header = (name: string, base: string[] = []): ScannedPluginHeader => ({
  filename: `${name}.js`,
  name,
  base,
  orderAfter: [],
  orderBefore: [],
  overrides: []
})

/** Opens the sample project and runs the dependency check over `headers`. */
async function openProject(headers: ScannedPluginHeader[]): Promise<void> {
  window.api = createFakeApi({ plugin: { scanHeaders: vi.fn(async () => headers) } })
  act(() => useProjectStore.getState().setProject(sampleProject()))
  await act(() => useProjectStore.getState().scanDependencies())
  expect(window.api.plugin.scanHeaders).toHaveBeenCalledWith('/project')
}

/** Opens a saved tab named `name`. */
function openTab(name: string): ReturnType<typeof createEmptyPlugin> {
  const plugin = createEmptyPlugin()
  const named = { ...plugin, meta: { ...plugin.meta, name } }
  act(() => usePluginStore.getState().openPlugin(named))
  return named
}

describe('status bar', () => {
  beforeEach(() => {
    resetStores()
    window.api = createFakeApi()
    vi.stubGlobal('__APP_VERSION__', '0.0.0-test')
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('names the open project once one is open', async () => {
    render(<StatusBar />)
    expect(screen.getByText('No project loaded')).toBeInTheDocument()
    await openProject([])
    expect(screen.getByText('Project: Sample Game')).toBeInTheDocument()
    expect(screen.queryByText('No project loaded')).not.toBeInTheDocument()
  })

  it('names the plugin and marks it modified while it has unsaved changes', () => {
    openTab('Alpha')
    render(<StatusBar />)
    expect(screen.getByText('Plugin: Alpha')).toBeInTheDocument()
    expect(screen.queryByText('(modified)')).not.toBeInTheDocument()
    act(() => usePluginStore.getState().updateMeta({ description: 'Edited' }))
    expect(screen.getByText('(modified)')).toBeInTheDocument()
  })

  it('shows Saved and the file once the changes are saved', async () => {
    const plugin = openTab('Alpha')
    act(() => usePluginStore.getState().updateMeta({ description: 'Edited' }))
    render(<StatusBar />)
    expect(screen.queryByText('Saved')).not.toBeInTheDocument()
    const path = '/project/js/plugins/Alpha.js'
    act(() =>
      usePluginStore
        .getState()
        .recordSaves([
          { id: plugin.id, saved: usePluginStore.getState().plugin, path, sha256: '0', written: '' }
        ])
    )
    expect(screen.queryByText('(modified)')).not.toBeInTheDocument()
    expect(screen.getByText('Saved')).toBeInTheDocument()
    expect(screen.getByText(path)).toBeInTheDocument()
  })

  it('a project whose plugins all find what they need reports it', async () => {
    render(<StatusBar />)
    await openProject([header('Alpha'), header('Beta', ['Alpha'])])
    expect(screen.getByRole('button', { name: 'All dependencies satisfied' })).toBeInTheDocument()
  })

  it('a project with two dependency issues counts them and lists both on click', async () => {
    const user = userEvent.setup()
    render(<StatusBar />)
    await openProject([header('Alpha', ['Gamma']), header('Beta', ['Delta'])])
    await user.click(screen.getByRole('button', { name: '2 dependency issues' }))
    const dialog = await screen.findByRole('dialog', { name: 'Dependency Issues' })
    expect(within(dialog).getByText('2 issues found in project plugins')).toBeInTheDocument()
    expect(
      within(dialog).getByText('"Alpha" requires "Gamma" but it was not found in the project')
    ).toBeInTheDocument()
    expect(
      within(dialog).getByText('"Beta" requires "Delta" but it was not found in the project')
    ).toBeInTheDocument()
  })
})
