// The plugin browser lists the open project's plugins; clicking one opens it as a tab. Behind
// `window.api` sit the main-process load functions, reading a copy of the fixture project.
import { createHash } from 'crypto'
import { readFile, rm, writeFile } from 'fs/promises'
import { dirname, join } from 'path'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PluginBrowser } from '../../src/renderer/src/components/plugin/PluginBrowser'
import { usePluginStore, useProjectStore, useToastStore } from '../../src/renderer/src/stores'
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
    useToastStore.getState().dismissAll()
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

  it('a plugin file that is not UTF-8 shows why it did not open and opens no tab', async () => {
    const name = 'NotUtf8.js'
    // Shift_JIS text, which is not valid UTF-8
    const shiftJis = Buffer.from([0x83, 0x65, 0x83, 0x58, 0x83, 0x67])
    await writeFile(
      join(project, 'js', 'plugins', name),
      Buffer.concat([Buffer.from('/*:\n * @plugindesc '), shiftJis, Buffer.from('\n */\n')])
    )
    vi.mocked(window.api.plugin.list).mockResolvedValue([FILE, name])
    const tabs = usePluginStore.getState().openPlugins
    render(<PluginBrowser onClose={() => {}} />)
    fireEvent.click(await screen.findByTitle(name))
    await waitFor(() => expect(useToastStore.getState().toasts).toHaveLength(1))
    const [toast] = useToastStore.getState().toasts
    expect(toast).toMatchObject({ type: 'error', duration: 10_000 })
    expect(toast.message).toMatch(/^Failed to load plugin "NotUtf8\.js": NotUtf8\.js is not UTF-8/)
    expect(toast.message).toContain('convert it to UTF-8')
    expect(usePluginStore.getState().openPlugins).toEqual(tabs)
  })

  it('closing an unsaved tab asks with Cancel as the default', async () => {
    render(<PluginBrowser onClose={() => {}} />)
    fireEvent.click(await screen.findByTitle(FILE))
    await waitFor(() => expect(usePluginStore.getState().plugin.importedFrom).toBe(FILE))
    const id = usePluginStore.getState().plugin.id
    act(() => usePluginStore.getState().updateMeta({ description: 'Edited' }))
    fireEvent.click(screen.getByRole('button', { name: `Close ${FILE.replace(/\.js$/, '')}` }))
    await waitFor(() => expect(window.api.dialog.message).toHaveBeenCalledTimes(1))
    const options = vi.mocked(window.api.dialog.message).mock.calls[0][0]
    expect(options.buttons).toEqual(['Cancel', 'Close Without Saving'])
    expect(options.cancelId).toBe(options.defaultId)
    expect(options.buttons?.[options.defaultId as number]).toBe('Cancel')
    expect(usePluginStore.getState().openPlugins.map((p) => p.id)).toEqual([id])
  })
})
