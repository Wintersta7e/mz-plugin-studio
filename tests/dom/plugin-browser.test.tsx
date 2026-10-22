// The plugin browser lists the open project's plugins; clicking one opens it as a tab. Behind
// `window.api` sit the main-process load functions, reading a copy of the fixture project.
import { createHash } from 'crypto'
import { readFile, rm } from 'fs/promises'
import { dirname, join } from 'path'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PluginBrowser } from '../../src/renderer/src/components/plugin/PluginBrowser'
import { usePluginStore, useProjectStore } from '../../src/renderer/src/stores'
import { copyFixtureProject } from '../helpers/fixture-project'
import { createMainApi } from './support/main-api'
import { resetStores } from './support/reset-stores'

const FILE = 'Fixture_HandWritten.js'

let project: string

describe('plugin browser', () => {
  beforeEach(async () => {
    resetStores()
    project = await copyFixtureProject()
    window.api = createMainApi({ overrides: { plugin: { list: vi.fn(async () => [FILE]) } } })
    const loaded = { ...(await window.api.project.load(project)), path: project }
    act(() => useProjectStore.getState().setProject(loaded))
  })

  afterEach(async () => {
    cleanup()
    await rm(dirname(project), { recursive: true, force: true })
  })

  it('opening a plugin records the file it was read from', async () => {
    render(<PluginBrowser onClose={() => {}} />)
    fireEvent.click(await screen.findByTitle(FILE))
    await waitFor(() => expect(usePluginStore.getState().plugin.importedFrom).toBe(FILE))
    const path = join(project, 'js', 'plugins', FILE)
    const sha256 = createHash('sha256')
      .update(await readFile(path))
      .digest('hex')
    const { plugin, baseByPluginId } = usePluginStore.getState()
    expect(baseByPluginId).toEqual({ [plugin.id]: { path, sha256 } })
  })

  it('closing an unsaved tab asks without a default', async () => {
    render(<PluginBrowser onClose={() => {}} />)
    fireEvent.click(await screen.findByTitle(FILE))
    await waitFor(() => expect(usePluginStore.getState().plugin.importedFrom).toBe(FILE))
    const id = usePluginStore.getState().plugin.id
    act(() => usePluginStore.getState().updateMeta({ description: 'Edited' }))
    fireEvent.click(screen.getByRole('button', { name: `Close ${FILE.replace(/\.js$/, '')}` }))
    await waitFor(() => expect(window.api.dialog.message).toHaveBeenCalledTimes(1))
    const options = vi.mocked(window.api.dialog.message).mock.calls[0][0]
    expect(options.buttons).toEqual(['Cancel', 'Close Without Saving'])
    expect(options).not.toHaveProperty('defaultId')
    expect(options).not.toHaveProperty('cancelId')
    expect(usePluginStore.getState().openPlugins.map((p) => p.id)).toEqual([id])
  })
})
