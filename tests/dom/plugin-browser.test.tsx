// The plugin browser lists the open project's plugins; clicking one opens it as a tab. Behind
// `window.api` sit the main-process load functions, reading a copy of the fixture project.
import { createHash } from 'node:crypto'
import { readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PluginBrowser } from '../../src/renderer/src/components/plugin/PluginBrowser'
import { usePluginStore, useProjectStore, useToastStore } from '../../src/renderer/src/stores'
import type { MZProject } from '../../src/renderer/src/types/mz'
import { copyFixtureProject } from '../helpers/fixture-project'
import { createMainApi } from './support/main-api'
import { resetStores } from './support/reset-stores'

const FILE = 'Fixture_HandWritten.js'

// The copy of the fixture project the running test reads
const fixture = { project: '' }

// The project the store holds open
function openedProject(): MZProject {
  const opened = useProjectStore.getState().project
  if (opened === null) throw new Error('no project open')
  return opened
}

async function setUp(): Promise<void> {
  type Api = Window['api']
  resetStores()
  fixture.project = await copyFixtureProject()
  const list = vi.fn<Api['plugin']['list']>().mockResolvedValue([FILE])
  const api = createMainApi({ overrides: { plugin: { list } } })
  vi.stubGlobal('api', api)
  const loaded = { ...(await api.project.load(fixture.project)), path: fixture.project }
  act(() => {
    useProjectStore.getState().setProject(loaded)
  })
}

// The panel stays mounted until the automatic cleanup after this hook, so the toasts it shows
// are dismissed inside act
async function tearDown(): Promise<void> {
  act(() => {
    useToastStore.getState().dismissAll()
  })
  vi.unstubAllGlobals()
  await rm(path.dirname(fixture.project), { recursive: true, force: true })
}

function renderBrowser(): void {
  render(<PluginBrowser onClose={vi.fn<() => void>()} />)
}

// The first of `items`, which must hold one
function first<T>(items: readonly T[], what: string): T {
  const item = items.at(0)
  if (item === undefined) throw new Error(`there is no ${what}`)
  return item
}

/**
Lists Alpha.js and Beta.js, both written to the project's plugin folder.
*/
async function listAlphaAndBeta(): Promise<void> {
  for (const name of ['Alpha', 'Beta']) {
    await writeFile(
      path.join(fixture.project, 'js', 'plugins', `${name}.js`),
      `/*:\n * @target MZ\n * @plugindesc ${name} plugin\n */\n`
    )
  }
  vi.mocked(globalThis.api.plugin.list).mockResolvedValue(['Alpha.js', 'Beta.js'])
}

/**
The open button of the row named `name`; its status glyphs join its accessible name.
*/
const row = (name: string): HTMLElement =>
  screen.getByRole('button', { name: new RegExp(`^${name}`) })

describe('plugin browser: opening a plugin', () => {
  beforeEach(setUp)

  afterEach(tearDown)

  it('opening a plugin records the file it was read from in one storage write', async () => {
    expect.hasAssertions()

    renderBrowser()
    const fileRow = await screen.findByTitle(FILE)
    const setItem = vi.spyOn(Storage.prototype, 'setItem')
    fireEvent.click(fileRow)
    await waitFor(() => {
      expect(usePluginStore.getState().plugin.importedFrom).toBe(FILE)
    })
    const writes = setItem.mock.calls.filter(([key]) => key === 'mz-plugin-studio-plugin')
    setItem.mockRestore()

    expect(writes).toHaveLength(1)

    const pluginPath = path.join(fixture.project, 'js', 'plugins', FILE)
    const sha256 = createHash('sha256')
      .update(await readFile(pluginPath))
      .digest('hex')
    const { plugin, baseByPluginId } = usePluginStore.getState()

    expect(baseByPluginId).toStrictEqual({ [plugin.id]: { path: pluginPath, sha256 } })
  })

  it('a plugin file that is not UTF-8 shows why it did not open and opens no tab', async () => {
    expect.hasAssertions()

    const name = 'NotUtf8.js'
    // Shift_JIS text, which is not valid UTF-8
    const shiftJis = Buffer.from([0x83, 0x65, 0x83, 0x58, 0x83, 0x67])
    await writeFile(
      path.join(fixture.project, 'js', 'plugins', name),
      Buffer.concat([Buffer.from('/*:\n * @plugindesc '), shiftJis, Buffer.from('\n */\n')])
    )
    vi.mocked(globalThis.api.plugin.list).mockResolvedValue([FILE, name])
    const tabs = usePluginStore.getState().openPlugins
    renderBrowser()
    fireEvent.click(await screen.findByTitle(name))
    await waitFor(() => {
      expect(useToastStore.getState().toasts).toHaveLength(1)
    })
    const toast = first(useToastStore.getState().toasts, 'toast')

    expect(toast).toMatchObject({ type: 'error', duration: 10_000 })
    expect(toast.message).toMatch(/^Failed to load plugin "NotUtf8\.js": NotUtf8\.js is not UTF-8/)
    expect(toast.message).toContain('convert it to UTF-8')
    expect(usePluginStore.getState().openPlugins).toStrictEqual(tabs)
  })

  it('opens a clicked plugin from the project as the active tab', async () => {
    expect.hasAssertions()

    await listAlphaAndBeta()
    const user = userEvent.setup()
    renderBrowser()
    await user.click(await screen.findByRole('button', { name: 'Alpha' }))
    const closeAlpha = await screen.findByRole('button', { name: 'Close Alpha' })

    expect(closeAlpha).toBeInTheDocument()
    expect(globalThis.api.plugin.load).toHaveBeenCalledExactlyOnceWith(fixture.project, 'Alpha.js')
    expect(screen.getByRole('button', { name: 'Alpha' })).toHaveAttribute('aria-current', 'page')
    expect(screen.queryByRole('button', { name: 'Close Beta' })).not.toBeInTheDocument()
  })
})

describe('plugin browser: open tabs', () => {
  beforeEach(setUp)

  afterEach(tearDown)

  it('an open plugin row keeps its close button outside the open button', async () => {
    expect.hasAssertions()

    renderBrowser()
    fireEvent.click(await screen.findByTitle(FILE))
    await screen.findByRole('button', { name: `Close ${FILE.replace(/\.js$/, '')}` })
    const nested = screen
      .getAllByRole('button', { hidden: true })
      .filter((button) => within(button).queryAllByRole('button', { hidden: true }).length > 0)
    process.stdout.write(`nested buttons ${String(nested.length)}\n`)

    expect(nested).toHaveLength(0)
  })

  it('closing an unsaved tab asks with Cancel as the default', async () => {
    expect.hasAssertions()

    renderBrowser()
    fireEvent.click(await screen.findByTitle(FILE))
    await waitFor(() => {
      expect(usePluginStore.getState().plugin.importedFrom).toBe(FILE)
    })
    const { id } = usePluginStore.getState().plugin
    act(() => {
      usePluginStore.getState().updateMeta({ description: 'Edited' })
    })
    fireEvent.click(screen.getByRole('button', { name: `Close ${FILE.replace(/\.js$/, '')}` }))
    const message = vi.mocked(globalThis.api.dialog.message)
    await waitFor(() => {
      expect(message).toHaveBeenCalledTimes(1)
    })
    const [options] = first(message.mock.calls, 'message dialog')

    expect({
      buttons: options.buttons,
      hasDefaultId: 'defaultId' in options,
      hasCancelId: 'cancelId' in options
    }).toStrictEqual({
      buttons: ['Cancel', 'Close Without Saving'],
      hasDefaultId: false,
      hasCancelId: false
    })
    expect(usePluginStore.getState().openPlugins.map((p) => p.id)).toStrictEqual([id])
  })

  it('marks an open plugin with unsaved changes', async () => {
    expect.hasAssertions()

    await listAlphaAndBeta()
    const user = userEvent.setup()
    renderBrowser()
    await user.click(await screen.findByRole('button', { name: 'Alpha' }))
    await screen.findByRole('button', { name: 'Close Alpha' })

    expect(screen.queryByLabelText('unsaved changes')).not.toBeInTheDocument()

    act(() => {
      usePluginStore.getState().updateMeta({ description: 'Edited' })
    })

    expect(within(row('Alpha')).getByLabelText('unsaved changes')).toBeInTheDocument()
    expect(screen.getAllByLabelText('unsaved changes')).toHaveLength(1)
  })
})

describe('plugin browser: the plugin list', () => {
  beforeEach(setUp)

  afterEach(tearDown)

  it('lists every plugin file, and the search keeps only the names that match', async () => {
    expect.hasAssertions()

    await listAlphaAndBeta()
    const user = userEvent.setup()
    renderBrowser()
    const alpha = await screen.findByRole('button', { name: 'Alpha' })

    expect(alpha).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Beta' })).toBeInTheDocument()

    await user.type(screen.getByPlaceholderText('Search plugins…'), 'be')

    expect(screen.queryByRole('button', { name: 'Alpha' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Beta' })).toBeInTheDocument()
  })

  it('refresh reads the plugin list and the plugin headers again', async () => {
    expect.hasAssertions()

    await listAlphaAndBeta()
    const user = userEvent.setup()
    renderBrowser()
    await screen.findByRole('button', { name: 'Alpha' })
    const list = vi.mocked(globalThis.api.plugin.list)

    expect(list).toHaveBeenCalledTimes(1)

    await user.click(screen.getByRole('button', { name: 'Refresh plugin list' }))
    await waitFor(() => {
      expect(globalThis.api.plugin.scanHeaders).toHaveBeenCalledWith(fixture.project)
    })

    expect(list.mock.calls).toStrictEqual([[fixture.project], [fixture.project]])
  })

  it('marks the plugin whose dependency is missing as having errors', async () => {
    expect.hasAssertions()

    await listAlphaAndBeta()
    const header = {
      filename: '',
      name: '',
      base: [],
      orderAfter: [],
      orderBefore: [],
      overrides: []
    }
    vi.mocked(globalThis.api.plugin.scanHeaders).mockResolvedValue([
      { ...header, filename: 'Alpha.js', name: 'Alpha' },
      { ...header, filename: 'Beta.js', name: 'Beta', base: ['Gamma'] }
    ])
    await act(async () => {
      await useProjectStore.getState().scanDependencies()
    })
    renderBrowser()
    await screen.findByTitle(/^"Beta" requires "Gamma"/)

    expect(within(row('Beta')).getByLabelText('has errors')).toBeInTheDocument()
    expect(screen.getAllByLabelText('has errors')).toHaveLength(1)
  })

  it("lists none of the previous project's plugins while the next project's list loads", async () => {
    expect.hasAssertions()

    renderBrowser()
    await screen.findByTitle(FILE)
    // A list that never arrives
    vi.mocked(globalThis.api.plugin.list).mockReturnValue(
      new Promise<string[]>(vi.fn<() => void>())
    )
    act(() => {
      useProjectStore.getState().setProject({ ...openedProject(), path: `${fixture.project}-next` })
    })

    expect(screen.queryByTitle(FILE)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Refresh plugin list' })).toBeDisabled()
    expect(globalThis.api.plugin.list).toHaveBeenLastCalledWith(`${fixture.project}-next`)
  })

  it('close plugin browser asks the panel to close', async () => {
    expect.hasAssertions()

    const onClose = vi.fn<() => void>()
    const user = userEvent.setup()
    render(<PluginBrowser onClose={onClose} />)
    await screen.findByTitle(FILE)
    await user.click(screen.getByRole('button', { name: 'Close plugin browser' }))

    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
