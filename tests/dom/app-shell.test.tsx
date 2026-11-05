// Opening a project from the keyboard (Ctrl+O): a folder that cannot be opened shows a message
// naming the folder and the reason, and leaves the project store's error set; Cancel in the
// confirm before a project opens shows nothing. A project that opens offers to reload the imported tabs whose file text is not loaded in one action.
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi, type Mock } from 'vitest'
import App from '../../src/renderer/src/App'
import { PluginParser } from '../../src/main/services/pluginParser'
import * as generator from '../../src/renderer/src/lib/generator'
import { usePluginStore, useProjectStore, useToastStore } from '../../src/renderer/src/stores'
import { createEmptyPlugin, type PluginDefinition } from '../../src/renderer/src/types/plugin'
import { IPC_CHANNELS, PROJECT_OPEN_CANCELLED, accessDenied } from '../../src/shared/ipc-types'
import { createFakeApi, sampleProject, type FakeApiOverrides } from '../helpers/fake-api'
import { fixturePath } from '../helpers/fixture-project'
import { LOAD_PREVIEW_TIMEOUT_MS, loadPreview } from './support/load-preview'
import { createMainApi, viaIpc } from './support/main-api'
import { resetStores } from './support/reset-stores'

type ProjectApi = Window['api']['project']
type OpenFolder = Window['api']['dialog']['openFolder']

// Each case renders the whole app, which takes seconds on a cold start
const APP_TIMEOUT = { timeout: 30_000 }

const FOLDER = '/fixture/not-a-project'

const setUp = (): void => {
  resetStores()
  // The build defines this; the status bar shows it.
  vi.stubGlobal('__APP_VERSION__', '0.0.0-test')
}

// The app stays mounted until the automatic cleanup after this hook, so the toasts it shows
// are dismissed inside act
const tearDown = (): void => {
  act(() => {
    useToastStore.getState().dismissAll()
  })
  vi.unstubAllGlobals()
}

const validatesAs = (
  result: Awaited<ReturnType<ProjectApi['validate']>>
): Mock<ProjectApi['validate']> => vi.fn<ProjectApi['validate']>().mockResolvedValue(result)

// The project calls as the renderer reaches them when the main-process handler refuses
const loadRefused = (reason: string): Mock<ProjectApi['load']> => {
  const handler = vi.fn<ProjectApi['load']>().mockRejectedValue(accessDenied(reason))
  return vi.fn<ProjectApi['load']>(viaIpc(IPC_CHANNELS.PROJECT_LOAD, handler))
}
const validateRefused = (reason: string): Mock<ProjectApi['validate']> => {
  const handler = vi.fn<ProjectApi['validate']>().mockRejectedValue(accessDenied(reason))
  return vi.fn<ProjectApi['validate']>(viaIpc(IPC_CHANNELS.PROJECT_VALIDATE, handler))
}

// Renders the app with `project` behind the fake api and opens `FOLDER` with Ctrl+O
const openFolder = async (project: NonNullable<FakeApiOverrides['project']>): Promise<void> => {
  const openFolderDialog = vi.fn<OpenFolder>().mockResolvedValue(FOLDER)
  vi.stubGlobal('api', createFakeApi({ dialog: { openFolder: openFolderDialog }, project }))
  render(<App />)
  fireEvent.keyDown(globalThis.window, { key: 'o', code: 'KeyO', ctrlKey: true })
  // Validation starts after the loading flag is set, so the flag falls only when the open ends
  await waitFor(() => {
    expect(globalThis.api.project.validate).toHaveBeenCalledWith(FOLDER)
  })
  await waitFor(() => {
    expect(useProjectStore.getState().isLoading).toBe(false)
  })
}

// The app shows `message` and raises it as its one error toast
const failureShown = async (message: string): Promise<void> => {
  const shown = await screen.findByText(message)

  expect(shown).toBeInTheDocument()
  expect(useToastStore.getState().toasts).toMatchObject([
    { type: 'error', message, duration: 10_000 }
  ])
}

describe('opening a project: error messages', APP_TIMEOUT, () => {
  beforeAll(loadPreview, LOAD_PREVIEW_TIMEOUT_MS)

  beforeEach(setUp)

  afterEach(tearDown)

  it('a folder that is not a project shows the folder and the reason', async () => {
    expect.hasAssertions()

    await openFolder({
      validate: validatesAs({ valid: false, error: 'Missing required file: data/System.json' })
    })
    const message =
      'Could not open "/fixture/not-a-project": not an RPG Maker MZ project ' +
      '(Missing required file: data/System.json).'
    await failureShown(message)

    expect(screen.getByRole('status')).toHaveTextContent(message)
    expect(useProjectStore.getState().error).toBe('Missing required file: data/System.json')
    expect(useProjectStore.getState().project).toBeNull()
  })

  it('a project that fails to load shows the folder and the reason', async () => {
    expect.hasAssertions()

    await openFolder({
      validate: validatesAs({ valid: true }),
      load: vi.fn<ProjectApi['load']>().mockRejectedValue(new Error('Unexpected end of JSON input'))
    })
    const message = 'Could not open "/fixture/not-a-project": Unexpected end of JSON input'
    await failureShown(message)

    expect(screen.getByRole('status')).toHaveTextContent(message)
    expect(useProjectStore.getState().error).toBe('Error: Unexpected end of JSON input')
    expect(useProjectStore.getState().project).toBeNull()
  })

  it('a load refused by main shows its reason without the prefix Electron adds', async () => {
    expect.hasAssertions()

    await openFolder({
      validate: validatesAs({ valid: true }),
      // The shape ipcRenderer.invoke rejects with when the main-process handler throws
      load: vi
        .fn<ProjectApi['load']>()
        .mockRejectedValue(
          new Error("Error invoking remote method 'project:load': Error: data folder unreadable")
        )
    })
    await failureShown('Could not open "/fixture/not-a-project": data folder unreadable')
  })
})

describe('opening a project: cancel, refusals and other failures', APP_TIMEOUT, () => {
  beforeAll(loadPreview, LOAD_PREVIEW_TIMEOUT_MS)

  beforeEach(setUp)

  afterEach(tearDown)

  it('cancel in the confirm before the project opens shows nothing and sets no error', async () => {
    expect.hasAssertions()

    await openFolder({
      validate: validatesAs({ valid: true }),
      load: loadRefused(PROJECT_OPEN_CANCELLED)
    })

    expect(globalThis.api.project.load).toHaveBeenCalledWith(FOLDER)
    expect(useToastStore.getState().toasts).toStrictEqual([])
    expect(useProjectStore.getState().error).toBeNull()
    expect(useProjectStore.getState().project).toBeNull()
  })

  it('a network folder main refuses is shown once in plain words', async () => {
    expect.hasAssertions()

    const reason = 'a network folder opens only when chosen with Open Project'
    await openFolder({ validate: validateRefused(reason) })
    await failureShown(`Could not open "/fixture/not-a-project": ${reason}.`)

    expect(useProjectStore.getState().error).not.toBeNull()
    expect(globalThis.api.project.load).not.toHaveBeenCalled()
  })

  it('a load that rejects with a value that is not an Error shows that value', async () => {
    expect.hasAssertions()

    await openFolder({
      validate: validatesAs({ valid: true }),
      load: vi.fn<ProjectApi['load']>().mockRejectedValue('data folder unreadable')
    })
    const message = 'Could not open "/fixture/not-a-project": data folder unreadable'

    const shown = await screen.findByText(message)

    expect(shown).toBeInTheDocument()
  })
})

const PROJECT = fixturePath()
const FILES = ['Fixture_HandWritten.js', 'Fixture_Structs.js'] as const
const textOf = (file: string): string => readFileSync(fixturePath('js', 'plugins', file), 'utf8')
const tab = (id: string): PluginDefinition | undefined =>
  usePluginStore.getState().openPlugins.find((p) => p.id === id)

// Opens `file` as a tab saved by an older version: imported, without its file text
function openStaleTab(file: string, importedFrom = file): string {
  const stale = { ...PluginParser.parsePlugin(textOf(file), file), importedFrom }
  delete stale.rawSource
  act(() => {
    usePluginStore.getState().openPlugin(stale)
  })
  return stale.id
}

const FOLDER_NAME = path.basename(PROJECT)
const RELOAD = `Reload ${FILES.join(', ')} from ${FOLDER_NAME}`

// Renders the app over the fixture project, whose plugin folder lists `listed`, and opens it
const openFixtureProject = async (
  answers: number[] = [],
  listed: string[] = [...FILES, 'Fixture_JaOnly.js']
): Promise<void> => {
  const project = await createFakeApi().project.load(PROJECT)
  const overrides: FakeApiOverrides = {
    dialog: { openFolder: vi.fn<OpenFolder>().mockResolvedValue(PROJECT) },
    project: {
      validate: validatesAs({ valid: true }),
      load: vi.fn<ProjectApi['load']>().mockResolvedValue({ ...project, path: PROJECT })
    },
    plugin: { list: vi.fn<Window['api']['plugin']['list']>().mockResolvedValue(listed) }
  }
  vi.stubGlobal('api', createMainApi({ answers, overrides }))
  render(<App />)
  fireEvent.keyDown(globalThis.window, { key: 'o', code: 'KeyO', ctrlKey: true })
  await waitFor(() => {
    expect(useProjectStore.getState().project?.path).toBe(PROJECT)
  })
}

describe(
  'opening a project with imported tabs whose file text is not loaded: reload action',
  APP_TIMEOUT,
  () => {
    beforeAll(loadPreview, LOAD_PREVIEW_TIMEOUT_MS)

    beforeEach(setUp)

    afterEach(tearDown)

    it('one action reloads every such tab whose file is in the project', async () => {
      expect.hasAssertions()

      const ids = FILES.map((file) => openStaleTab(file))
      const elsewhere = openStaleTab(FILES[0], 'Fixture_Elsewhere.js')
      await openFixtureProject()
      fireEvent.click(await screen.findByRole('button', { name: RELOAD }))
      await waitFor(() => {
        expect(ids.map((id) => tab(id)?.rawSource)).toStrictEqual(FILES.map((file) => textOf(file)))
      })

      expect(tab(elsewhere)?.rawSource).toBeUndefined()
      expect(globalThis.api.dialog.message).not.toHaveBeenCalled()
      expect(globalThis.api.plugin.readRaw).toHaveBeenCalledTimes(2)

      await waitFor(() => {
        expect(useToastStore.getState().toasts).toMatchObject([
          { type: 'success', message: 'Reloaded 2 of 2 plugins' }
        ])
      })
    })

    it('a tab with unsaved edits asks first, and Cancel keeps it as it is', async () => {
      expect.hasAssertions()

      const clean = openStaleTab(FILES[0])
      const edited = openStaleTab(FILES[1])
      act(() => {
        usePluginStore.getState().updateMeta({ description: 'Edited before reload' })
      })
      await openFixtureProject([0])
      fireEvent.click(await screen.findByRole('button', { name: RELOAD }))
      await waitFor(() => {
        expect(tab(clean)?.rawSource).toBe(textOf(FILES[0]))
      })
      await waitFor(() => {
        expect(globalThis.api.dialog.message).toHaveBeenCalledTimes(1)
      })
      const options = vi.mocked(globalThis.api.dialog.message).mock.lastCall?.[0]

      expect([options?.title, options?.buttons?.[0]]).toStrictEqual([
        'Reload from project?',
        'Cancel'
      ])
      expect([tab(edited)?.rawSource, tab(edited)?.meta.description]).toStrictEqual([
        undefined,
        'Edited before reload'
      ])

      await waitFor(() => {
        expect(useToastStore.getState().toasts).toMatchObject([
          {
            type: 'warning',
            message: `Reloaded 1 of 2 plugins. Not reloaded: ${FILES[1]}.`,
            duration: 10_000
          }
        ])
      })
    })
  }
)

describe(
  'opening a project with imported tabs whose file text is not loaded: reload notice',
  APP_TIMEOUT,
  () => {
    beforeAll(loadPreview, LOAD_PREVIEW_TIMEOUT_MS)

    beforeEach(setUp)

    afterEach(tearDown)

    it('offers nothing when no such tab has its file in the project', async () => {
      expect.hasAssertions()

      openStaleTab(FILES[0], 'Fixture_Elsewhere.js')
      await openFixtureProject()
      await waitFor(() => {
        expect(globalThis.api.plugin.list).toHaveBeenCalledWith(PROJECT)
      })
      await act(async () => {
        await Promise.resolve()
      })

      expect(useToastStore.getState().toasts).toStrictEqual([])
    })

    it('the notice names the project folder and each tab it would reload', async () => {
      expect.hasAssertions()

      for (const file of FILES) openStaleTab(file)
      await openFixtureProject()
      await screen.findByRole('button', { name: RELOAD })

      expect(useToastStore.getState().toasts.map((t) => t.message)).toStrictEqual([
        `Raw mode cannot save ${FILES.join(', ')} until reloaded: the file text is not loaded. ` +
          `The project folder ${FOLDER_NAME} has these files.`
      ])
    })

    it('the notice names three tabs and counts the rest', async () => {
      expect.hasAssertions()

      const files = [...FILES, 'Fixture_JaOnly.js', 'Fixture_NoIife.js', 'Fixture_Require.js']
      for (const file of files) openStaleTab(file)
      await openFixtureProject([], files)
      const named = `${files.slice(0, 3).join(', ')} and 2 more`
      await screen.findByRole('button', { name: `Reload ${named} from ${FOLDER_NAME}` })

      expect(useToastStore.getState().toasts.at(0)?.message).toMatch(
        new RegExp(`^Raw mode cannot save ${named} until`)
      )
    })

    it('finding those tabs builds no code for a tab whose file text is loaded', async () => {
      expect.hasAssertions()

      const loaded = PluginParser.parsePlugin(textOf(FILES[1]), FILES[1])
      act(() => {
        usePluginStore.getState().openPlugin({ ...loaded, importedFrom: FILES[1] })
      })
      act(() => {
        usePluginStore.getState().updateMeta({ description: 'Edited' })
      })
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

const shellSetUp = (): void => {
  setUp()
  vi.stubGlobal('api', createFakeApi())
}

// Renders the app and opens a new plugin from the welcome screen
async function newPlugin(): Promise<ReturnType<typeof userEvent.setup>> {
  const user = userEvent.setup()
  render(<App />)
  await user.click(screen.getByRole('button', { name: /Start with a blank plugin/ }))
  await screen.findByRole('tab', { name: 'Metadata' })
  return user
}

const tabNames = (list: HTMLElement): (string | null)[] =>
  within(list)
    .getAllByRole('tab')
    .map((editorTab) => editorTab.textContent)

describe('app shell: welcome screen and views', APP_TIMEOUT, () => {
  beforeAll(loadPreview, LOAD_PREVIEW_TIMEOUT_MS)

  beforeEach(shellSetUp)

  afterEach(tearDown)

  it('the welcome screen offers Open Project, New Plugin and the five latest projects', () => {
    act(() => {
      for (let index = 1; index <= 6; index++) {
        useProjectStore.getState().addRecentProject(`/projects/Game${String(index)}`)
      }
    })
    render(<App />)

    expect(screen.getByRole('button', { name: /Load an existing MZ project/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Start with a blank plugin/ })).toBeInTheDocument()

    const recent = screen.getAllByText(/^\/projects\/Game\d$/).map((element) => element.textContent)

    expect(recent).toStrictEqual([6, 5, 4, 3, 2].map((index) => `/projects/Game${String(index)}`))
  })

  it('new Plugin opens the editor on its five tabs', async () => {
    expect.hasAssertions()

    await newPlugin()
    // The editor's tab list is the one holding the Metadata tab; the metadata tab holds its own
    const tabs = screen
      .getAllByRole('tablist')
      .filter((list) => within(list).queryByRole('tab', { name: 'Metadata' }) !== null)
      .map((list) => tabNames(list))

    expect(tabs).toStrictEqual([['Metadata', 'Parameters', 'Commands', 'Structs', 'Code']])
    expect(screen.getByRole('tab', { name: 'Metadata' })).toHaveAttribute('aria-selected', 'true')
  })

  it('opening a project names its game in the title bar and asks for a plugin', async () => {
    expect.hasAssertions()

    const user = userEvent.setup()
    const overrides: FakeApiOverrides = {
      dialog: { openFolder: vi.fn<OpenFolder>().mockResolvedValue('/project') },
      project: {
        validate: validatesAs({ valid: true }),
        load: vi.fn<ProjectApi['load']>().mockResolvedValue(sampleProject())
      }
    }
    vi.stubGlobal('api', createFakeApi(overrides))
    render(<App />)
    await user.click(screen.getByRole('button', { name: /Load an existing MZ project/ }))

    const title = await screen.findByText('- Sample Game')

    expect(title).toBeInTheDocument()
    expect(screen.getByText('No plugin open')).toBeInTheDocument()
    expect(globalThis.api.project.validate).toHaveBeenCalledWith('/project')
    expect(globalThis.api.project.load).toHaveBeenCalledWith('/project')
  })

  it('with a project open, Analysis shows the plugin analysis and Editor goes back', async () => {
    expect.hasAssertions()

    const user = userEvent.setup()
    act(() => {
      useProjectStore.getState().setProject(sampleProject())
      usePluginStore.getState().openPlugin(createEmptyPlugin())
    })
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Analysis' }))

    const analysis = await screen.findByRole('heading', { name: 'Plugin Analysis' })

    expect(analysis).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Editor' }))
    const editorTab = await screen.findByRole('tab', { name: 'Metadata' })

    expect(editorTab).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: 'Plugin Analysis' })).not.toBeInTheDocument()
    })
  })
})

describe('app shell: keyboard shortcuts', APP_TIMEOUT, () => {
  beforeAll(loadPreview, LOAD_PREVIEW_TIMEOUT_MS)

  beforeEach(shellSetUp)

  afterEach(tearDown)

  it('ctrl+1 to Ctrl+5 select each editor tab', async () => {
    expect.hasAssertions()

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

  it('ctrl+N opens another plugin', async () => {
    expect.hasAssertions()

    const user = await newPlugin()

    expect(screen.getAllByRole('button', { name: 'NewPlugin' })).toHaveLength(1)

    await user.keyboard('{Control>}n{/Control}')

    expect(screen.getAllByRole('button', { name: 'NewPlugin' })).toHaveLength(2)
  })

  it('ctrl+B hides the code preview and shows it again', async () => {
    expect.hasAssertions()

    const user = await newPlugin()

    expect(screen.getByRole('heading', { name: 'Generated Code' })).toBeInTheDocument()

    await user.keyboard('{Control>}b{/Control}')

    expect(screen.queryByRole('heading', { name: 'Generated Code' })).not.toBeInTheDocument()

    await user.keyboard('{Control>}b{/Control}')

    expect(screen.getByRole('heading', { name: 'Generated Code' })).toBeInTheDocument()
  })

  it('f1 opens the keyboard shortcuts and Ctrl+, opens the settings', async () => {
    expect.hasAssertions()

    const user = userEvent.setup()
    render(<App />)
    // The default key map has no F1 or comma; App matches the key's code
    await user.keyboard('[F1]')
    const shortcuts = await screen.findByRole('dialog', { name: 'Keyboard Shortcuts' })

    expect(shortcuts).toBeInTheDocument()

    await user.keyboard('{Escape}')
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
    await user.keyboard('{Control>}[Comma]{/Control}')
    const settings = await screen.findByRole('dialog', { name: 'Settings' })

    expect(settings).toBeInTheDocument()
  })
})
