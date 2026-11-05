// The plugin browser lists the open project's plugins; clicking one opens it as a tab. Behind
// `window.api` sit the main-process load functions, reading a copy of the fixture project.
import { createHash } from 'crypto'
import { readFile, rm, writeFile } from 'fs/promises'
import { dirname, join } from 'path'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PluginBrowser } from '../../src/renderer/src/components/plugin/PluginBrowser'
import { usePluginStore, useProjectStore, useToastStore } from '../../src/renderer/src/stores'
import type { MZProject } from '../../src/renderer/src/types/mz'
import { copyFixtureProject } from '../helpers/fixture-project'
import { createMainApi } from './support/main-api'
import { resetStores } from './support/reset-stores'

const FILE = 'Fixture_HandWritten.js'

let project: string

// The project the store holds open
function openedProject(): MZProject {
  const opened = useProjectStore.getState().project
  if (opened === null) throw new Error('no project open')
  return opened
}

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

  it('opening a plugin records the file it was read from in one storage write', async () => {
    render(<PluginBrowser onClose={() => {}} />)
    const row = await screen.findByTitle(FILE)
    const setItem = vi.spyOn(Storage.prototype, 'setItem')
    fireEvent.click(row)
    await waitFor(() => expect(usePluginStore.getState().plugin.importedFrom).toBe(FILE))
    const writes = setItem.mock.calls.filter(([key]) => key === 'mz-plugin-studio-plugin')
    setItem.mockRestore()

    expect(writes).toHaveLength(1)

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

  it('an open plugin row keeps its close button outside the open button', async () => {
    const { container } = render(<PluginBrowser onClose={() => {}} />)
    fireEvent.click(await screen.findByTitle(FILE))
    await screen.findByRole('button', { name: `Close ${FILE.replace(/\.js$/, '')}` })
    const nested = container.querySelectorAll('button button')
    console.log(`nested buttons ${nested.length}`)

    expect(nested).toHaveLength(0)
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
    expect(options).not.toHaveProperty('defaultId')
    expect(options).not.toHaveProperty('cancelId')
    expect(usePluginStore.getState().openPlugins.map((p) => p.id)).toEqual([id])
  })

  /** Lists Alpha.js and Beta.js, both written to the project's plugin folder. */
  async function listAlphaAndBeta(): Promise<void> {
    for (const name of ['Alpha', 'Beta']) {
      await writeFile(
        join(project, 'js', 'plugins', `${name}.js`),
        `/*:\n * @target MZ\n * @plugindesc ${name} plugin\n */\n`
      )
    }
    vi.mocked(window.api.plugin.list).mockResolvedValue(['Alpha.js', 'Beta.js'])
  }

  /** The open button of the row named `name`; its status glyphs join its accessible name. */
  const row = (name: string): HTMLElement =>
    screen.getByRole('button', { name: new RegExp(`^${name}`) })

  it('lists every plugin file, and the search keeps only the names that match', async () => {
    await listAlphaAndBeta()
    const user = userEvent.setup()
    render(<PluginBrowser onClose={() => {}} />)

    expect(await screen.findByRole('button', { name: 'Alpha' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Beta' })).toBeInTheDocument()

    await user.type(screen.getByPlaceholderText('Search plugins…'), 'be')

    expect(screen.queryByRole('button', { name: 'Alpha' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Beta' })).toBeInTheDocument()
  })

  it('opens a clicked plugin from the project as the active tab', async () => {
    await listAlphaAndBeta()
    const user = userEvent.setup()
    render(<PluginBrowser onClose={() => {}} />)
    await user.click(await screen.findByRole('button', { name: 'Alpha' }))

    expect(await screen.findByRole('button', { name: 'Close Alpha' })).toBeInTheDocument()
    expect(window.api.plugin.load).toHaveBeenCalledExactlyOnceWith(project, 'Alpha.js')
    expect(screen.getByRole('button', { name: 'Alpha' })).toHaveAttribute('aria-current', 'page')
    expect(screen.queryByRole('button', { name: 'Close Beta' })).not.toBeInTheDocument()
  })

  it('marks an open plugin with unsaved changes', async () => {
    await listAlphaAndBeta()
    const user = userEvent.setup()
    render(<PluginBrowser onClose={() => {}} />)
    await user.click(await screen.findByRole('button', { name: 'Alpha' }))
    await screen.findByRole('button', { name: 'Close Alpha' })

    expect(screen.queryByLabelText('unsaved changes')).not.toBeInTheDocument()

    act(() => usePluginStore.getState().updateMeta({ description: 'Edited' }))

    expect(within(row('Alpha')).getByLabelText('unsaved changes')).toBeInTheDocument()
    expect(screen.getAllByLabelText('unsaved changes')).toHaveLength(1)
  })

  it('Refresh reads the plugin list and the plugin headers again', async () => {
    await listAlphaAndBeta()
    const user = userEvent.setup()
    render(<PluginBrowser onClose={() => {}} />)
    await screen.findByRole('button', { name: 'Alpha' })

    expect(window.api.plugin.list).toHaveBeenCalledTimes(1)

    await user.click(screen.getByRole('button', { name: 'Refresh plugin list' }))
    await waitFor(() => expect(window.api.plugin.scanHeaders).toHaveBeenCalledWith(project))

    expect(window.api.plugin.list).toHaveBeenCalledTimes(2)
    expect(window.api.plugin.list).toHaveBeenLastCalledWith(project)
  })

  it('marks the plugin whose dependency is missing as having errors', async () => {
    await listAlphaAndBeta()
    const header = {
      filename: '',
      name: '',
      base: [],
      orderAfter: [],
      orderBefore: [],
      overrides: []
    }
    vi.mocked(window.api.plugin.scanHeaders).mockResolvedValue([
      { ...header, filename: 'Alpha.js', name: 'Alpha' },
      { ...header, filename: 'Beta.js', name: 'Beta', base: ['Gamma'] }
    ])
    await act(() => useProjectStore.getState().scanDependencies())
    render(<PluginBrowser onClose={() => {}} />)
    await screen.findByTitle(/^"Beta" requires "Gamma"/)

    expect(within(row('Beta')).getByLabelText('has errors')).toBeInTheDocument()
    expect(screen.getAllByLabelText('has errors')).toHaveLength(1)
  })

  it("lists none of the previous project's plugins while the next project's list loads", async () => {
    expect.hasAssertions()

    render(<PluginBrowser onClose={vi.fn<() => void>()} />)
    await screen.findByTitle(FILE)
    // A list that never arrives
    vi.mocked(globalThis.api.plugin.list).mockReturnValue(
      new Promise<string[]>(vi.fn<() => void>())
    )
    act(() => {
      useProjectStore.getState().setProject({ ...openedProject(), path: `${project}-next` })
    })

    expect(screen.queryByTitle(FILE)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Refresh plugin list' })).toBeDisabled()
    expect(globalThis.api.plugin.list).toHaveBeenLastCalledWith(`${project}-next`)
  })

  it('Close plugin browser asks the panel to close', async () => {
    const onClose = vi.fn()
    const user = userEvent.setup()
    render(<PluginBrowser onClose={onClose} />)
    await screen.findByTitle(FILE)
    await user.click(screen.getByRole('button', { name: 'Close plugin browser' }))

    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
