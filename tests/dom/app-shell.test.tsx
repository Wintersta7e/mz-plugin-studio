// Opening a project from the keyboard (Ctrl+O): a folder that cannot be opened shows a message
// naming the folder and the reason, and leaves the project store's error set; Cancel in the
// confirm before a project opens shows nothing. A project that opens offers to reload the imported tabs whose file text is not loaded in one action.
import { readFileSync } from 'fs'
import { basename } from 'path'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../../src/renderer/src/App'
import { PluginParser } from '../../src/main/services/pluginParser'
import * as generator from '../../src/renderer/src/lib/generator'
import { usePluginStore, useProjectStore, useToastStore } from '../../src/renderer/src/stores'
import { createEmptyPlugin } from '../../src/renderer/src/types/plugin'
import type { PluginDefinition } from '../../src/renderer/src/types/plugin'
import { IPC_CHANNELS, PROJECT_OPEN_CANCELLED, accessDenied } from '../../src/shared/ipc-types'
import { createFakeApi, sampleProject } from '../helpers/fake-api'
import type { FakeApiOverrides } from '../helpers/fake-api'
import { fixturePath } from '../helpers/fixture-project'
import { createMainApi, viaIpc } from './support/main-api'
import { resetStores } from './support/reset-stores'

const FOLDER = '/fixture/not-a-project'

/** Renders the app with `project` behind the fake api and opens `FOLDER` with Ctrl+O. */
async function openFolder(project: FakeApiOverrides['project']): Promise<void> {
  window.api = createFakeApi({ dialog: { openFolder: vi.fn(async () => FOLDER) }, project })
  render(<App />)
  act(() => {
    fireEvent.keyDown(window, { key: 'o', code: 'KeyO', ctrlKey: true })
  })
  // Validation starts after the loading flag is set, so the flag falls only when the open ends
  await waitFor(() => expect(window.api.project.validate).toHaveBeenCalled())
  await waitFor(() => expect(useProjectStore.getState().isLoading).toBe(false))
}

// Each case renders the whole app, which takes seconds on a cold start
describe('opening a project', { timeout: 30_000 }, () => {
  beforeEach(() => {
    resetStores()
    // The build defines this; the status bar shows it.
    vi.stubGlobal('__APP_VERSION__', '0.0.0-test')
  })

  afterEach(() => {
    cleanup()
    useToastStore.getState().dismissAll()
    vi.unstubAllGlobals()
  })

  it('a folder that is not a project shows the folder and the reason', async () => {
    await openFolder({
      validate: vi.fn(async () => ({
        valid: false,
        error: 'Missing required file: data/System.json'
      }))
    })
    const message =
      'Could not open "/fixture/not-a-project": not an RPG Maker MZ project ' +
      '(Missing required file: data/System.json).'

    expect(await screen.findByText(message)).toBeTruthy()
    expect(screen.getByRole('status').textContent).toContain(message)
    expect(useToastStore.getState().toasts).toMatchObject([
      { type: 'error', message, duration: 10_000 }
    ])
    expect(useProjectStore.getState().error).toBe('Missing required file: data/System.json')
    expect(useProjectStore.getState().project).toBeNull()
  })

  it('a project that fails to load shows the folder and the reason', async () => {
    await openFolder({
      validate: vi.fn(async () => ({ valid: true })),
      load: vi.fn(async () => {
        throw new Error('Unexpected end of JSON input')
      })
    })
    const message = 'Could not open "/fixture/not-a-project": Unexpected end of JSON input'

    expect(await screen.findByText(message)).toBeTruthy()
    expect(screen.getByRole('status').textContent).toContain(message)
    expect(useToastStore.getState().toasts).toMatchObject([
      { type: 'error', message, duration: 10_000 }
    ])
    expect(useProjectStore.getState().error).toBe('Error: Unexpected end of JSON input')
    expect(useProjectStore.getState().project).toBeNull()
  })

  it('a load refused by main shows its reason without the prefix Electron adds', async () => {
    await openFolder({
      validate: vi.fn(async () => ({ valid: true })),
      // The shape ipcRenderer.invoke rejects with when the main-process handler throws
      load: vi.fn(async () => {
        throw new Error(
          "Error invoking remote method 'project:load': Error: data folder unreadable"
        )
      })
    })
    const message = 'Could not open "/fixture/not-a-project": data folder unreadable'

    expect(await screen.findByText(message)).toBeTruthy()
    expect(useToastStore.getState().toasts).toMatchObject([
      { type: 'error', message, duration: 10_000 }
    ])
  })

  it('Cancel in the confirm before the project opens shows nothing and sets no error', async () => {
    await openFolder({
      validate: vi.fn(async () => ({ valid: true })),
      load: vi.fn(
        viaIpc(IPC_CHANNELS.PROJECT_LOAD, async () => {
          throw accessDenied(PROJECT_OPEN_CANCELLED)
        })
      )
    })

    expect(window.api.project.load).toHaveBeenCalledWith(FOLDER)
    expect(useToastStore.getState().toasts).toEqual([])
    expect(useProjectStore.getState().error).toBeNull()
    expect(useProjectStore.getState().project).toBeNull()
  })

  it('a network folder main refuses is shown once in plain words', async () => {
    const reason = 'a network folder opens only when chosen with Open Project'
    await openFolder({
      validate: vi.fn(
        viaIpc(IPC_CHANNELS.PROJECT_VALIDATE, async () => {
          throw accessDenied(reason)
        })
      )
    })
    const message = `Could not open "/fixture/not-a-project": ${reason}.`

    expect(await screen.findByText(message)).toBeTruthy()
    expect(useToastStore.getState().toasts).toMatchObject([
      { type: 'error', message, duration: 10_000 }
    ])
    expect(useProjectStore.getState().error).not.toBeNull()
    expect(window.api.project.load).not.toHaveBeenCalled()
  })

  it('a load that rejects with a value that is not an Error shows that value', async () => {
    await openFolder({
      validate: vi.fn(async () => ({ valid: true })),
      load: vi.fn(() => Promise.reject('data folder unreadable'))
    })
    const message = 'Could not open "/fixture/not-a-project": data folder unreadable'

    expect(await screen.findByText(message)).toBeTruthy()
  })
})

describe(
  'opening a project with imported tabs whose file text is not loaded',
  { timeout: 30_000 },
  () => {
    const PROJECT = fixturePath()
    const FILES = ['Fixture_HandWritten.js', 'Fixture_Structs.js']
    const textOf = (file: string): string =>
      readFileSync(fixturePath('js', 'plugins', file), 'utf-8')
    const tab = (id: string): PluginDefinition | undefined =>
      usePluginStore.getState().openPlugins.find((p) => p.id === id)

    /** Opens `file` as a tab saved by an older version: imported, without its file text. */
    function openStaleTab(file: string, importedFrom = file): string {
      const { rawSource: _rawSource, ...stale } = PluginParser.parsePlugin(textOf(file), file)
      act(() => usePluginStore.getState().openPlugin({ ...stale, importedFrom }))
      return stale.id
    }

    const FOLDER_NAME = basename(PROJECT)
    const RELOAD = `Reload ${FILES.join(', ')} from ${FOLDER_NAME}`

    /** Renders the app over the fixture project, whose plugin folder lists `listed`, and opens it. */
    async function openFixtureProject(
      answers: number[] = [],
      listed = [...FILES, 'Fixture_JaOnly.js']
    ): Promise<void> {
      const project = await createFakeApi().project.load(PROJECT)
      window.api = createMainApi({
        answers,
        overrides: {
          dialog: { openFolder: vi.fn(async () => PROJECT) },
          project: {
            validate: vi.fn(async () => ({ valid: true })),
            load: vi.fn(async () => ({ ...project, path: PROJECT }))
          },
          plugin: { list: vi.fn(async () => listed) }
        }
      })
      render(<App />)
      act(() => {
        fireEvent.keyDown(window, { key: 'o', code: 'KeyO', ctrlKey: true })
      })
      await waitFor(() => expect(useProjectStore.getState().project?.path).toBe(PROJECT))
    }

    beforeEach(() => {
      resetStores()
      vi.stubGlobal('__APP_VERSION__', '0.0.0-test')
    })

    afterEach(() => {
      cleanup()
      useToastStore.getState().dismissAll()
      vi.unstubAllGlobals()
    })

    it('one action reloads every such tab whose file is in the project', async () => {
      const ids = FILES.map((file) => openStaleTab(file))
      const elsewhere = openStaleTab(FILES[0], 'Fixture_Elsewhere.js')
      await openFixtureProject()
      fireEvent.click(await screen.findByRole('button', { name: RELOAD }))
      await waitFor(() => {
        for (const [i, id] of ids.entries()) expect(tab(id)?.rawSource).toBe(textOf(FILES[i]))
      })

      expect(tab(elsewhere)?.rawSource).toBeUndefined()
      expect(window.api.dialog.message).not.toHaveBeenCalled()
      expect(window.api.plugin.readRaw).toHaveBeenCalledTimes(2)

      await waitFor(() =>
        expect(useToastStore.getState().toasts).toMatchObject([
          { type: 'success', message: 'Reloaded 2 of 2 plugins' }
        ])
      )
    })

    it('a tab with unsaved edits asks first, and Cancel keeps it as it is', async () => {
      const [clean, edited] = FILES.map((file) => openStaleTab(file))
      act(() => usePluginStore.getState().updateMeta({ description: 'Edited before reload' }))
      await openFixtureProject([0])
      fireEvent.click(await screen.findByRole('button', { name: RELOAD }))
      await waitFor(() => expect(tab(clean)?.rawSource).toBe(textOf(FILES[0])))
      await waitFor(() => expect(window.api.dialog.message).toHaveBeenCalledTimes(1))
      const options = vi.mocked(window.api.dialog.message).mock.calls[0][0]

      expect(options).toMatchObject({ title: 'Reload from project?' })
      expect(options.buttons?.[0]).toBe('Cancel')
      expect(tab(edited)?.rawSource).toBeUndefined()
      expect(tab(edited)?.meta.description).toBe('Edited before reload')

      await waitFor(() =>
        expect(useToastStore.getState().toasts).toMatchObject([
          {
            type: 'warning',
            message: `Reloaded 1 of 2 plugins. Not reloaded: ${FILES[1]}.`,
            duration: 10_000
          }
        ])
      )
    })

    it('offers nothing when no such tab has its file in the project', async () => {
      openStaleTab(FILES[0], 'Fixture_Elsewhere.js')
      await openFixtureProject()
      await waitFor(() => expect(window.api.plugin.list).toHaveBeenCalledWith(PROJECT))
      await act(async () => {})

      expect(useToastStore.getState().toasts).toEqual([])
    })

    it('the notice names the project folder and each tab it would reload', async () => {
      for (const file of FILES) openStaleTab(file)
      await openFixtureProject()
      await screen.findByRole('button', { name: RELOAD })

      expect(useToastStore.getState().toasts.map((t) => t.message)).toEqual([
        `Raw mode cannot save ${FILES.join(', ')} until reloaded: the file text is not loaded. ` +
          `The project folder ${FOLDER_NAME} has these files.`
      ])
    })

    it('the notice names three tabs and counts the rest', async () => {
      const files = [...FILES, 'Fixture_JaOnly.js', 'Fixture_NoIife.js', 'Fixture_Require.js']
      for (const file of files) openStaleTab(file)
      await openFixtureProject([], files)
      const named = `${files.slice(0, 3).join(', ')} and 2 more`
      await screen.findByRole('button', { name: `Reload ${named} from ${FOLDER_NAME}` })

      expect(useToastStore.getState().toasts[0].message).toMatch(
        new RegExp(`^Raw mode cannot save ${named} until`)
      )
    })

    it('finding those tabs builds no code for a tab whose file text is loaded', async () => {
      const loaded = PluginParser.parsePlugin(textOf(FILES[1]), FILES[1])
      act(() => usePluginStore.getState().openPlugin({ ...loaded, importedFrom: FILES[1] }))
      act(() => usePluginStore.getState().updateMeta({ description: 'Edited' }))
      // The active tab has no file text, so the code preview builds nothing either
      openStaleTab(FILES[0])
      const build = vi.spyOn(generator, 'generateRawMode')
      try {
        await openFixtureProject()
        await screen.findByRole('button', { name: `Reload ${FILES[0]} from ${FOLDER_NAME}` })

        expect(build).not.toHaveBeenCalled()
      } finally {
        build.mockRestore()
      }
    })
  }
)

describe('app shell', { timeout: 30_000 }, () => {
  beforeEach(() => {
    resetStores()
    window.api = createFakeApi()
    vi.stubGlobal('__APP_VERSION__', '0.0.0-test')
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  /** Renders the app and opens a new plugin from the welcome screen. */
  async function newPlugin(): Promise<ReturnType<typeof userEvent.setup>> {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: /Start with a blank plugin/ }))
    await screen.findByRole('tab', { name: 'Metadata' })
    return user
  }

  it('the welcome screen offers Open Project, New Plugin and the five latest projects', () => {
    act(() => {
      for (let i = 1; i <= 6; i++) useProjectStore.getState().addRecentProject(`/projects/Game${i}`)
    })
    render(<App />)

    expect(screen.getByRole('button', { name: /Load an existing MZ project/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Start with a blank plugin/ })).toBeInTheDocument()

    const recent = screen.getAllByText(/^\/projects\/Game\d$/).map((el) => el.textContent)

    expect(recent).toEqual([6, 5, 4, 3, 2].map((i) => `/projects/Game${i}`))
  })

  it('New Plugin opens the editor on its five tabs', async () => {
    await newPlugin()
    const tabList = screen.getByRole('tab', { name: 'Metadata' }).closest('[role="tablist"]')
    const tabs = within(tabList as HTMLElement)
      .getAllByRole('tab')
      .map((tab) => tab.textContent)

    expect(tabs).toEqual(['Metadata', 'Parameters', 'Commands', 'Structs', 'Code'])
    expect(screen.getByRole('tab', { name: 'Metadata' })).toHaveAttribute('aria-selected', 'true')
  })

  it('Ctrl+1 to Ctrl+5 select each editor tab', async () => {
    const user = await newPlugin()
    const order: [string, string][] = [
      ['2', 'Parameters'],
      ['3', 'Commands'],
      ['4', 'Structs'],
      ['5', 'Code'],
      ['1', 'Metadata']
    ]
    for (const [key, name] of order) {
      await user.keyboard(`{Control>}${key}{/Control}`)

      expect(screen.getByRole('tab', { name })).toHaveAttribute('aria-selected', 'true')
    }
  })

  it('Ctrl+N opens another plugin', async () => {
    const user = await newPlugin()

    expect(screen.getAllByRole('button', { name: 'NewPlugin' })).toHaveLength(1)

    await user.keyboard('{Control>}n{/Control}')

    expect(screen.getAllByRole('button', { name: 'NewPlugin' })).toHaveLength(2)
  })

  it('Ctrl+B hides the code preview and shows it again', async () => {
    const user = await newPlugin()

    expect(screen.getByRole('heading', { name: 'Generated Code' })).toBeInTheDocument()

    await user.keyboard('{Control>}b{/Control}')

    expect(screen.queryByRole('heading', { name: 'Generated Code' })).not.toBeInTheDocument()

    await user.keyboard('{Control>}b{/Control}')

    expect(screen.getByRole('heading', { name: 'Generated Code' })).toBeInTheDocument()
  })

  it('F1 opens the keyboard shortcuts and Ctrl+, opens the settings', async () => {
    const user = userEvent.setup()
    render(<App />)
    // The default key map has no F1 or comma; App matches the key's code
    await user.keyboard('[F1]')

    expect(await screen.findByRole('dialog', { name: 'Keyboard Shortcuts' })).toBeInTheDocument()

    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await user.keyboard('{Control>}[Comma]{/Control}')

    expect(await screen.findByRole('dialog', { name: 'Settings' })).toBeInTheDocument()
  })

  it('opening a project names its game in the title bar and asks for a plugin', async () => {
    const user = userEvent.setup()
    window.api = createFakeApi({
      dialog: { openFolder: vi.fn(async () => '/project') },
      project: {
        validate: vi.fn(async () => ({ valid: true })),
        load: vi.fn(async () => sampleProject())
      }
    })
    render(<App />)
    await user.click(screen.getByRole('button', { name: /Load an existing MZ project/ }))

    expect(await screen.findByText('- Sample Game')).toBeInTheDocument()
    expect(screen.getByText('No plugin open')).toBeInTheDocument()
    expect(window.api.project.validate).toHaveBeenCalledWith('/project')
    expect(window.api.project.load).toHaveBeenCalledWith('/project')
  })

  it('with a project open, Analysis shows the plugin analysis and Editor goes back', async () => {
    const user = userEvent.setup()
    act(() => {
      useProjectStore.getState().setProject(sampleProject())
      usePluginStore.getState().openPlugin(createEmptyPlugin())
    })
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Analysis' }))

    expect(await screen.findByRole('heading', { name: 'Plugin Analysis' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Editor' }))

    expect(await screen.findByRole('tab', { name: 'Metadata' })).toBeInTheDocument()

    await waitFor(() =>
      expect(screen.queryByRole('heading', { name: 'Plugin Analysis' })).not.toBeInTheDocument()
    )
  })
})
