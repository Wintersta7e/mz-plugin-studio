// The parameter tab's Import menu (what a .mzparams file does once it is read in) and its Export
// button (where the selected parameters are written).
import { readFileSync } from 'fs'
import { access, mkdtemp, readFile, rm, writeFile } from 'fs/promises'
import { tmpdir } from 'os'
import { join, resolve } from 'path'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { act, render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import userEvent, { type UserEvent } from '@testing-library/user-event'
import type { SaveDialogOptions } from 'electron'
import { showSaveFileDialog } from '../../src/main/ipc/dialog'
import { readFileByPath, savePluginToPath } from '../../src/main/ipc/plugin'
import { ParameterBuilder } from '../../src/renderer/src/components/plugin/ParameterBuilder'
import { CodePreview } from '../../src/renderer/src/components/preview/CodePreview'
import { generateParameterComment, generatePlugin } from '../../src/renderer/src/lib/generator'
import { deserializeParams } from '../../src/renderer/src/lib/param-io'
import { usePluginStore, useProjectStore, useSettingsStore } from '../../src/renderer/src/stores'
import {
  createEmptyParameter,
  createEmptyPlugin,
  createEmptyStruct,
  type PluginParameter,
  type PluginStruct
} from '../../src/renderer/src/types/plugin'
import { IPC_CHANNELS } from '../../src/shared/ipc-types'
import type { MZProject } from '../../src/shared/types/mz'
import { evaluatePlugin } from '../helpers/evaluate-plugin'
import { createFakeApi, sampleProject } from '../helpers/fake-api'
import { ALL_PAYLOADS } from '../helpers/hostile'
import { viaIpc } from './support/main-api'
import { resetStores } from './support/reset-stores'

const fixtureText = (name: string): string =>
  readFileSync(resolve(process.cwd(), 'tests/fixtures/mzparams', name), 'utf8')

const parameterNames = (): string[] =>
  usePluginStore.getState().plugin.parameters.map((p) => p.name)

/** The plugin's parameter names at the moment each message was shown. */
const namesWhenShown: string[][] = []

// The Import menu sits in the toolbar, which shows once the plugin has a parameter.
beforeEach(() => {
  resetStores()
  namesWhenShown.length = 0
  const existing = { ...createEmptyParameter(), name: 'Existing' }
  usePluginStore.getState().openPlugin({ ...createEmptyPlugin(), parameters: [existing] })
})

/** Picks "From File (.mzparams)" with `text` as the chosen file; returns the dialog mock. */
function importFile(text: string): ReturnType<typeof vi.fn> {
  const message = vi.fn(async () => {
    namesWhenShown.push(parameterNames())
    return 0
  })
  window.api = createFakeApi({
    dialog: { openFile: vi.fn(async () => '/fixtures/in.mzparams'), message },
    plugin: { readByPath: vi.fn(async () => text) }
  })
  render(<ParameterBuilder />)
  fireEvent.keyDown(screen.getByRole('button', { name: 'Import' }), { key: 'Enter' })
  fireEvent.click(screen.getByText('From File (.mzparams)'))
  return message
}

describe('parameter import from a file', () => {
  it.each([
    ['not JSON', 'not json at all', 'This file could not be read: it is not valid JSON.'],
    [
      'without a version',
      fixtureText('invalid-missing-version.mzparams'),
      'This file is not an MZ Plugin Studio parameter file.'
    ],
    [
      'from a newer version',
      fixtureText('invalid-newer-version.mzparams'),
      'This file was made by a newer version of MZ Plugin Studio. Update the app to import it.'
    ]
  ])('says why it refuses a file %s', async (_label, text, expected) => {
    const message = importFile(text)
    await waitFor(() => expect(message).toHaveBeenCalledTimes(1))
    expect(message).toHaveBeenCalledWith({
      type: 'error',
      title: 'Import Failed',
      message: expected
    })
    expect(parameterNames()).toEqual(['Existing'])
  })

  it('adds the good parameters, then reports what it skipped and dropped', async () => {
    const file = JSON.parse(fixtureText('invalid-unknown-type.mzparams'))
    file.parameters[0].extra = 'not a parameter field'
    file.parameters.push(42)
    const message = importFile(JSON.stringify(file))
    await waitFor(() => expect(message).toHaveBeenCalledTimes(1))
    expect(message).toHaveBeenCalledWith({
      type: 'warning',
      title: 'Import Report',
      message:
        'Imported 1 parameter. Skipped 2: "Shape" (unknown type), item 3 (not a parameter). ' +
        'Dropped 1 field with the wrong type or an unknown name: "Label" (extra).'
    })
    expect(namesWhenShown).toEqual([['Existing', 'Label']])
  })

  it('names every field it dropped, by parameter and field', async () => {
    const file = JSON.parse(fixtureText('invalid-unknown-type.mzparams'))
    file.parameters[0].desc = 5
    file.parameters[0].extra = 'not a parameter field'
    file.parameters[1].type = 'select'
    file.parameters[1].options = [{ value: 'a', text: 'A', note: 'not an option field' }]
    const message = importFile(JSON.stringify(file))
    await waitFor(() => expect(message).toHaveBeenCalledTimes(1))
    expect(message).toHaveBeenCalledWith({
      type: 'warning',
      title: 'Import Report',
      message:
        'Imported 2 parameters. Dropped 3 fields with the wrong type or an unknown name: ' +
        '"Label" (desc), "Label" (extra), "Shape" (options[0].note).'
    })
    expect(namesWhenShown).toEqual([['Existing', 'Label', 'Shape']])
  })

  it('keeps an imported description inside the plugin comment when the plugin runs', async () => {
    const payload = ALL_PAYLOADS.find((p) => p.name === 'comment-space')!
    const text = JSON.stringify({
      version: 1,
      source: 'Test',
      exportedAt: '2026-01-01T00:00:00.000Z',
      parameters: [
        { id: 'p', name: 'Label', text: 'Label', desc: payload.text, type: 'string', default: '' }
      ]
    })
    const message = importFile(text)
    await waitFor(() => expect(parameterNames()).toEqual(['Existing', 'Label']))
    expect(message).not.toHaveBeenCalled()
    const plugin = usePluginStore.getState().plugin
    expect(plugin.parameters[1].desc).toBe(payload.text)

    const result = evaluatePlugin(generatePlugin(plugin), { mode: 'generator' })
    expect(result.compileProblem).toBeNull()
    expect(result.threw).toBeNull()
    expect(result.sentinel).toBe(false)
  })
})

describe('parameter import from a file that is not UTF-8', () => {
  let tmp: string

  beforeEach(async () => {
    tmp = await mkdtemp(join(tmpdir(), 'param-import-'))
  })

  afterEach(async () => {
    await rm(tmp, { recursive: true, force: true })
  })

  it.each([
    ['From File (.mzparams)', 'Shift.mzparams', 'Could not read the file. '],
    ['From Plugin (.js)', 'Shift.js', 'Could not read or parse the plugin file. ']
  ])('%s says why the file is refused and how to use it', async (item, name, lead) => {
    const file = join(tmp, name)
    // Shift_JIS text, which is not valid UTF-8
    await writeFile(file, Buffer.from([0x7b, 0x83, 0x65, 0x83, 0x58, 0x7d]))
    const message = vi.fn(async () => 0)
    window.api = createFakeApi({
      dialog: { openFile: vi.fn(async () => file), message },
      plugin: { readByPath: vi.fn(viaIpc(IPC_CHANNELS.PLUGIN_READ_BY_PATH, readFileByPath)) }
    })
    render(<ParameterBuilder />)
    fireEvent.keyDown(screen.getByRole('button', { name: 'Import' }), { key: 'Enter' })
    fireEvent.click(screen.getByText(item))
    await waitFor(() => expect(message).toHaveBeenCalledTimes(1))
    expect(message).toHaveBeenCalledWith({
      type: 'error',
      title: 'Import Failed',
      message: `${lead}${name} is not UTF-8. The app reads only UTF-8 files, so it can save a plugin's text back unchanged; convert it to UTF-8 and try again`
    })
    expect(parameterNames()).toEqual(['Existing'])
  })
})

describe('parameter export to a file', () => {
  let tmp: string

  beforeEach(async () => {
    tmp = await mkdtemp(join(tmpdir(), 'param-export-'))
  })

  afterEach(async () => {
    await rm(tmp, { recursive: true, force: true })
  })

  /**
   * Exports every parameter through the main-process save functions, rejecting as
   * `ipcRenderer.invoke` does; `saveFile` answers `target`, through the save dialog or not.
   * Returns the message dialog mock.
   */
  function exportTo(target: string, { throughDialog = true } = {}): ReturnType<typeof vi.fn> {
    const dialog = {
      showSaveDialog: vi.fn(async (_options: SaveDialogOptions) => ({
        canceled: false,
        filePath: target
      }))
    }
    const message = vi.fn(async () => 0)
    window.api = createFakeApi({
      dialog: {
        saveFile: throughDialog
          ? (options) => showSaveFileDialog(dialog, options ?? {})
          : vi.fn(async () => target),
        message
      },
      plugin: { saveToPath: viaIpc(IPC_CHANNELS.PLUGIN_SAVE_TO_PATH, savePluginToPath) }
    })
    render(<ParameterBuilder />)
    fireEvent.click(screen.getByRole('button', { name: 'Select All' }))
    fireEvent.click(screen.getByRole('button', { name: 'Export' }))
    return message
  }

  it('writes the selected parameters to the path chosen in the save dialog', async () => {
    const target = join(tmp, 'Alpha-params.mzparams')
    const message = exportTo(target)
    const written = await waitFor(() => readFile(target, 'utf8'))
    const result = deserializeParams(written)
    expect(result.success && result.parameters.map((p) => p.name)).toEqual(['Existing'])
    expect(message).not.toHaveBeenCalled()
  })

  it('says why and writes nothing for a path no save dialog returned', async () => {
    const target = join(tmp, 'Alpha-params.mzparams')
    const message = exportTo(target, { throughDialog: false })
    await waitFor(() => expect(message).toHaveBeenCalledTimes(1))
    expect(message).toHaveBeenCalledWith({
      type: 'error',
      title: 'Export Failed',
      message: `Access denied: ${target} was not chosen in a save dialog`
    })
    await expect(access(target)).rejects.toMatchObject({ code: 'ENOENT' })
  })
})

describe('parameter usage comment', () => {
  it('renaming a parameter rewrites the comment that names it in the plugin code', () => {
    const store = usePluginStore.getState()
    const existing = store.plugin.parameters[0]
    store.setCustomCode(generateParameterComment(existing) + '\n')
    render(<ParameterBuilder />)
    fireEvent.click(screen.getByText(existing.text))
    fireEvent.change(screen.getByDisplayValue('Existing'), { target: { value: 'Renamed' } })
    const code = usePluginStore.getState().plugin.customCode
    expect(code).toContain(generateParameterComment({ ...existing, name: 'Renamed' }))
    expect(code).not.toContain(generateParameterComment(existing))
  })

  it.each(["speed$'", 'speed$`', 'speed$&'])(
    'renaming a parameter to %s changes only the comment in the plugin code',
    (name) => {
      const store = usePluginStore.getState()
      const existing = store.plugin.parameters[0]
      const rest = '\nfunction tick() { return speed * 2; }\n'
      store.setCustomCode(generateParameterComment(existing) + rest)
      render(<ParameterBuilder />)
      fireEvent.click(screen.getByText(existing.text))
      fireEvent.change(screen.getByDisplayValue('Existing'), { target: { value: name } })
      expect(usePluginStore.getState().plugin.customCode).toBe(
        generateParameterComment({ ...existing, name }) + rest
      )
    }
  )
})

describe('parameter prompts that discard work', () => {
  /** Renders the tab with every parameter selected; the message dialog answers Cancel. */
  function renderSelected(): ReturnType<typeof vi.fn> {
    const message = vi.fn(async () => 0)
    window.api = createFakeApi({ dialog: { message } })
    render(<ParameterBuilder />)
    fireEvent.click(screen.getByRole('button', { name: 'Select All' }))
    return message
  }

  it('deleting the selected parameters asks with Cancel as the default', async () => {
    const message = renderSelected()
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
    await waitFor(() => expect(message).toHaveBeenCalledTimes(1))
    const options = message.mock.calls[0][0]
    expect(options.buttons).toEqual(['Cancel', 'Delete'])
    expect(parameterNames()).toEqual(['Existing'])
    // The main process makes Cancel the default from its button word
    expect(options).not.toHaveProperty('defaultId')
    expect(options).not.toHaveProperty('cancelId')
  })

  it('overwriting a preset asks with Cancel as the default', async () => {
    const kept = { ...createEmptyParameter(), name: 'Kept' }
    useSettingsStore.setState({ parameterPresets: { Mine: [kept] } })
    const message = renderSelected()
    fireEvent.keyDown(screen.getByRole('button', { name: 'Presets' }), { key: 'Enter' })
    fireEvent.click(screen.getByText('Save Selection as Preset...'))
    fireEvent.change(screen.getByLabelText('Preset Name'), { target: { value: 'Mine' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(message).toHaveBeenCalledTimes(1))
    const options = message.mock.calls[0][0]
    expect(options.buttons).toEqual(['Cancel', 'Overwrite'])
    expect(useSettingsStore.getState().parameterPresets).toEqual({ Mine: [kept] })
    expect(options).not.toHaveProperty('defaultId')
    expect(options).not.toHaveProperty('cancelId')
  })
})

/** The generated plugin code the preview shows. */
const preview = (): string => (screen.getByTestId('monaco-editor') as HTMLTextAreaElement).value

/** The parameter row whose header reads `label`. */
const row = (label: string): HTMLElement =>
  screen.getByText(label).closest<HTMLElement>('[draggable="true"]')!

const param = (name: string, text: string): PluginParameter => ({
  ...createEmptyParameter(),
  name,
  text
})

/**
 * Opens a plugin named Alpha holding `parameters` and `structs`; renders the tab, beside the
 * code preview unless `withPreview` is false (the preview has an Export button of its own).
 */
function renderTab(
  parameters: PluginParameter[] = [],
  structs: PluginStruct[] = [],
  { withPreview = true } = {}
): UserEvent {
  const plugin = createEmptyPlugin()
  usePluginStore
    .getState()
    .openPlugin({ ...plugin, meta: { ...plugin.meta, name: 'Alpha' }, parameters, structs })
  const user = userEvent.setup()
  render(
    <>
      <ParameterBuilder />
      {withPreview && <CodePreview />}
    </>
  )
  return user
}

/** The select showing `text`; a select's label names no target, so it has no accessible name. */
const combobox = (text: string): HTMLElement =>
  screen.getAllByRole('combobox').find((c) => c.textContent?.startsWith(text))!

/** Picks `type` in the expanded row's Type select, which shows `current`. */
async function pickType(user: UserEvent, current: string, type: string): Promise<void> {
  await user.click(combobox(current))
  await user.click(await screen.findByRole('option', { name: new RegExp(`^${type}`) }))
}

/** Opens `project` the way the app does after loading it. */
function openProject(project: MZProject): void {
  const { path: _path, gameTitle: _title, maps: _maps, ...gameData } = project
  const store = useProjectStore.getState()
  store.setProject(project)
  store.setAllGameData(gameData)
}

describe('parameter rows', () => {
  beforeEach(() => {
    window.api = createFakeApi()
  })

  const addParameter = (user: UserEvent): Promise<void> =>
    user.click(screen.getByRole('button', { name: 'Add Parameter' }))

  it('shows an empty list, then a new row with its name field and the selection toolbar', async () => {
    const user = renderTab()
    expect(screen.getByText('No parameters defined')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Select All' })).not.toBeInTheDocument()
    await addParameter(user)
    expect(screen.queryByText('No parameters defined')).not.toBeInTheDocument()
    expect(screen.getByPlaceholderText('paramName')).toHaveValue('NewParameter')
    expect(screen.getByRole('button', { name: 'Select All' })).toBeInTheDocument()
  })

  it('writes the typed name and label into the row header and the plugin code', async () => {
    const user = renderTab()
    await addParameter(user)
    await user.clear(screen.getByPlaceholderText('paramName'))
    await user.type(screen.getByPlaceholderText('paramName'), 'speed')
    await user.clear(screen.getByPlaceholderText('Parameter Label'))
    await user.type(screen.getByPlaceholderText('Parameter Label'), 'Speed')
    expect(row('Speed')).toBeInTheDocument()
    await waitFor(() => {
      expect(preview()).toContain('@param speed')
      expect(preview()).toContain('@text Speed')
    })
  })

  it('says why a name is not an identifier, is empty or is taken', async () => {
    const user = renderTab([param('speed', 'Speed')])
    await addParameter(user)
    const name = screen.getByPlaceholderText('paramName')
    await user.clear(name)
    await user.type(name, '1abc')
    expect(screen.getByText(/^Must be a valid identifier/)).toBeInTheDocument()
    await user.clear(name)
    expect(screen.getByText('Name is required')).toBeInTheDocument()
    await user.type(name, 'speed')
    expect(screen.getByText('Duplicate parameter name')).toBeInTheDocument()
    expect(screen.queryByText(/^Must be a valid identifier/)).not.toBeInTheDocument()
  })

  it('turns a row into a number with a minimum', async () => {
    const user = renderTab()
    await addParameter(user)
    await pickType(user, 'String', 'Number')
    expect(screen.getByText('(number)')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Show details' }))
    await user.type(screen.getByPlaceholderText('No min'), '5')
    await waitFor(() => {
      expect(preview()).toContain('@type number')
      expect(preview()).toContain('@min 5')
    })
  })

  it('writes each typed option of a select row with its value', async () => {
    const user = renderTab()
    await addParameter(user)
    await pickType(user, 'String', 'Select')
    await user.type(screen.getByPlaceholderText(/^option1\|Option 1/), 'a|Alpha{Enter}b')
    await waitFor(() => {
      expect(preview()).toContain('@option Alpha')
      expect(preview()).toContain('@value a')
      expect(preview()).toContain('@option b')
    })
  })

  it('keeps a "|" and an Enter typed at the end of a select row\'s options', async () => {
    const user = renderTab()
    await addParameter(user)
    await pickType(user, 'String', 'Select')
    const options = screen.getByPlaceholderText(/^option1\|Option 1/)
    await user.type(options, 'x|Y{Backspace}Z{Enter}b')
    expect(options).toHaveValue('x|Z\nb')
    await waitFor(() => {
      expect(preview()).toContain(' * @option Z\n * @value x\n * @option b\n *\n')
    })
  })

  it('keeps loaded select options holding a "|" when the options are typed in', async () => {
    const user = renderTab([
      {
        ...param('mode', 'Mode'),
        type: 'select',
        options: [
          { value: 'a|b', text: 'Label' },
          { value: 'A|B', text: 'A|B' },
          { value: 'c', text: 'c' }
        ]
      }
    ])
    await user.click(screen.getByText('Mode'))
    const options = screen.getByPlaceholderText(/^option1\|Option 1/)
    expect(options).toHaveValue('a\\|b|Label\nA\\|B\nc')
    await user.type(options, 'x')
    expect(usePluginStore.getState().plugin.parameters[0].options).toEqual([
      { value: 'a|b', text: 'Label' },
      { value: 'A|B', text: 'A|B' },
      { value: 'cx', text: 'cx' }
    ])
  })

  it('shows the options of the select row opened after a "|" was typed in another', async () => {
    const select = (name: string, text: string, value: string): PluginParameter => ({
      ...param(name, text),
      type: 'select',
      options: [{ value, text: value }]
    })
    const user = renderTab([select('first', 'First', 'a'), select('second', 'Second', 'b')])
    await user.click(screen.getByText('First'))
    await user.type(screen.getByPlaceholderText(/^option1\|Option 1/), '|')
    expect(screen.getByPlaceholderText(/^option1\|Option 1/)).toHaveValue('a|')
    await user.click(screen.getByText('Second'))
    expect(within(row('Second')).getByPlaceholderText(/^option1\|Option 1/)).toHaveValue('b')
  })

  it('asks for a project before a switch default, then offers the project switches', async () => {
    const user = renderTab()
    await addParameter(user)
    await pickType(user, 'String', 'Switch')
    expect(screen.getByPlaceholderText('Load project first')).toBeDisabled()
    act(() => openProject({ ...sampleProject(), switches: [{ id: 1, name: 'Door Open' }] }))
    await user.click(combobox('Select switch...'))
    expect(await screen.findByRole('option', { name: '1: Door Open' })).toBeInTheDocument()
  })

  it('shows the default editor of the struct a struct row picks', async () => {
    const point: PluginStruct = {
      ...createEmptyStruct(),
      name: 'Point',
      parameters: [{ ...param('x', 'Horizontal'), type: 'number' }]
    }
    const user = renderTab([], [point])
    await addParameter(user)
    await pickType(user, 'String', 'Struct')
    await user.click(combobox('Select struct...'))
    await user.click(await screen.findByRole('option', { name: 'Point' }))
    expect(screen.getByText('Horizontal')).toBeInTheDocument()
    await waitFor(() => expect(preview()).toContain('struct<Point>'))
  })

  it('moves a row dropped onto another, in the list and in the plugin code', async () => {
    renderTab([param('speed', 'Speed'), param('power', 'Power')])
    const dataTransfer = {
      setData: vi.fn(),
      setDragImage: vi.fn(),
      effectAllowed: '',
      dropEffect: ''
    }
    fireEvent.dragStart(row('Speed'), { dataTransfer })
    fireEvent.dragOver(row('Power'), { dataTransfer })
    fireEvent.drop(row('Power'), { dataTransfer })
    expect(screen.getAllByText(/^(Speed|Power)$/).map((e) => e.textContent)).toEqual([
      'Power',
      'Speed'
    ])
    await waitFor(() => {
      const power = preview().indexOf('@param power')
      expect(power).toBeGreaterThan(-1)
      expect(power).toBeLessThan(preview().indexOf('@param speed'))
    })
  })

  it('marks a hidden row, and a deleted row leaves the plugin code', async () => {
    const user = renderTab()
    await addParameter(user)
    await pickType(user, 'String', 'Hidden')
    expect(within(row('New Parameter')).getByText('hidden in MZ')).toBeInTheDocument()
    await waitFor(() => expect(preview()).toContain('@param NewParameter'))
    // The delete button has no name; it is the first button in the row, inside its header
    await user.click(within(row('New Parameter')).getAllByRole('button')[0])
    expect(screen.queryByText('New Parameter')).not.toBeInTheDocument()
    await waitFor(() => expect(preview()).not.toContain('@param NewParameter'))
  })
})

/** A message dialog that answers each prompt with the button named by the next of `words`. */
const answering = (...words: string[]) =>
  vi.fn(async (options: { buttons?: string[] }) => options.buttons?.indexOf(words.shift()!) ?? -1)

/** Lets a handler that awaited a recorded call run to its end. */
const settle = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0))

const tick = (user: UserEvent, label: string): Promise<void> =>
  user.click(within(row(label)).getByRole('checkbox'))

async function chooseMenuItem(user: UserEvent, menu: string, item: string): Promise<void> {
  await user.click(screen.getByRole('button', { name: menu }))
  await user.click(await screen.findByRole('menuitem', { name: item }))
}

describe('parameter toolbar', () => {
  beforeEach(() => {
    window.api = createFakeApi()
  })

  const renderToolbar = (parameters: PluginParameter[]): UserEvent =>
    renderTab(parameters, [], { withPreview: false })

  it('enables the selection buttons only with a selection, and Select All toggles every row', async () => {
    const user = renderToolbar([param('speed', 'Speed'), param('power', 'Power')])
    const selectionButtons = ['Duplicate', 'Delete', 'Export']
    for (const name of selectionButtons) {
      expect(screen.getByRole('button', { name })).toBeDisabled()
    }
    await user.click(screen.getByRole('button', { name: 'Select All' }))
    for (const box of screen.getAllByRole('checkbox')) expect(box).toBeChecked()
    for (const name of selectionButtons) expect(screen.getByRole('button', { name })).toBeEnabled()
    await user.click(screen.getByRole('button', { name: 'Deselect' }))
    for (const box of screen.getAllByRole('checkbox')) expect(box).not.toBeChecked()
    expect(screen.getByRole('button', { name: 'Select All' })).toBeInTheDocument()
  })

  it('duplicates a selected row under a _copy name and clears the selection', async () => {
    const user = renderToolbar([param('speed', ''), param('power', '')])
    await tick(user, 'speed')
    await user.click(screen.getByRole('button', { name: 'Duplicate' }))
    expect(row('speed_copy')).toBeInTheDocument()
    expect(screen.getAllByRole('checkbox')).toHaveLength(3)
    for (const box of screen.getAllByRole('checkbox')) expect(box).not.toBeChecked()
  })

  it('deletes the selected rows only when the prompt is answered Delete', async () => {
    const message = answering('Cancel', 'Delete')
    window.api = createFakeApi({ dialog: { message } })
    const user = renderToolbar([
      param('speed', 'Speed'),
      param('power', 'Power'),
      param('range', 'Range')
    ])
    await tick(user, 'Speed')
    await tick(user, 'Power')
    await user.click(screen.getByRole('button', { name: 'Delete' }))
    await waitFor(() => expect(message).toHaveBeenCalledTimes(1))
    expect(message.mock.calls[0][0].buttons).toContain('Cancel')
    await settle()
    expect(row('Speed')).toBeInTheDocument()
    expect(row('Power')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Delete' }))
    await waitFor(() => expect(screen.queryByText('Speed')).not.toBeInTheDocument())
    expect(screen.queryByText('Power')).not.toBeInTheDocument()
    expect(row('Range')).toBeInTheDocument()
  })

  it('exports the selected rows to the path the save dialog returns', async () => {
    const api = createFakeApi({
      dialog: { saveFile: vi.fn(async () => '/exports/Alpha-params.mzparams') }
    })
    window.api = api
    const user = renderToolbar([param('speed', 'Speed'), param('power', 'Power')])
    await tick(user, 'Power')
    await user.click(screen.getByRole('button', { name: 'Export' }))
    await waitFor(() => expect(api.plugin.saveToPath).toHaveBeenCalledTimes(1))
    expect(api.dialog.saveFile).toHaveBeenCalledWith({
      defaultPath: 'Alpha-params.mzparams',
      filters: [{ name: 'MZ Parameters', extensions: ['mzparams'] }]
    })
    const [path, content] = vi.mocked(api.plugin.saveToPath).mock.calls[0]
    expect(path).toBe('/exports/Alpha-params.mzparams')
    const written: { parameters: PluginParameter[] } = JSON.parse(content)
    expect(written.parameters.map((p) => p.name)).toEqual(['power'])
  })

  it('writes nothing when the save dialog is cancelled', async () => {
    const api = createFakeApi({ dialog: { saveFile: vi.fn(async () => null) } })
    window.api = api
    const user = renderToolbar([param('speed', 'Speed')])
    await tick(user, 'Speed')
    await user.click(screen.getByRole('button', { name: 'Export' }))
    await waitFor(() => expect(api.dialog.saveFile).toHaveBeenCalledTimes(1))
    await settle()
    expect(api.plugin.saveToPath).not.toHaveBeenCalled()
  })

  it('adds the rows of the parameter file the open dialog returns', async () => {
    const text = JSON.stringify({
      version: 1,
      source: 'Beta',
      exportedAt: '2026-01-01T00:00:00.000Z',
      parameters: [
        { id: 'a', name: 'alpha', text: 'Alpha', desc: '', type: 'string', default: '' },
        { id: 'b', name: 'beta', text: 'Beta', desc: '', type: 'number', default: 0 }
      ]
    })
    const api = createFakeApi({
      dialog: { openFile: vi.fn(async () => '/exports/Beta-params.mzparams') },
      plugin: { readByPath: vi.fn(async () => text) }
    })
    window.api = api
    const user = renderToolbar([param('speed', 'Speed')])
    await chooseMenuItem(user, 'Import', 'From File (.mzparams)')
    expect(await screen.findByText('Alpha')).toBeInTheDocument()
    expect(row('Beta')).toBeInTheDocument()
    expect(api.dialog.openFile).toHaveBeenCalledWith({
      filters: [{ name: 'MZ Parameters', extensions: ['mzparams'] }]
    })
    expect(api.plugin.readByPath).toHaveBeenCalledWith('/exports/Beta-params.mzparams')
  })

  it('adds nothing when the open dialog is cancelled', async () => {
    const api = createFakeApi({ dialog: { openFile: vi.fn(async () => null) } })
    window.api = api
    const user = renderToolbar([param('speed', 'Speed')])
    await chooseMenuItem(user, 'Import', 'From File (.mzparams)')
    await waitFor(() => expect(api.dialog.openFile).toHaveBeenCalledTimes(1))
    await settle()
    expect(api.plugin.readByPath).not.toHaveBeenCalled()
    expect(screen.getAllByRole('checkbox')).toHaveLength(1)
  })

  it('adds only the parameters left ticked in the plugin import picker', async () => {
    const api = createFakeApi({
      dialog: { openFile: vi.fn(async () => '/project/js/plugins/Beta.js') },
      plugin: {
        readByPath: vi.fn(async () => '/* Beta */'),
        parse: vi.fn(async () => ({
          ...createEmptyPlugin(),
          parameters: [param('alpha', 'Alpha'), param('beta', 'Beta')]
        }))
      }
    })
    window.api = api
    const user = renderToolbar([param('speed', 'Speed')])
    await chooseMenuItem(user, 'Import', 'From Plugin (.js)')
    const picker = await screen.findByRole('dialog', { name: 'Import Parameters from Plugin' })
    expect(within(picker).getByText(/\(2 found\)/)).toBeInTheDocument()
    expect(api.dialog.openFile).toHaveBeenCalledWith({
      filters: [{ name: 'JavaScript Plugin', extensions: ['js'] }]
    })
    expect(api.plugin.parse).toHaveBeenCalledWith('/* Beta */')
    await user.click(within(picker).getByRole('checkbox', { name: /^Beta/ }))
    await user.click(within(picker).getByRole('button', { name: 'Import 1 Parameter' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(row('Alpha')).toBeInTheDocument()
    expect(screen.queryByText('Beta')).not.toBeInTheDocument()
  })

  it.each([
    ['has no parameters', async () => createEmptyPlugin(), 'No Parameters'],
    [
      'cannot be parsed',
      async () => {
        throw new Error('Unexpected token')
      },
      'Import Failed'
    ]
  ])('says so when the chosen plugin %s', async (_label, parse, title) => {
    const message = vi.fn(async () => 0)
    window.api = createFakeApi({
      dialog: { openFile: vi.fn(async () => '/project/js/plugins/Beta.js'), message },
      plugin: { readByPath: vi.fn(async () => '/* Beta */'), parse: vi.fn(parse) }
    })
    const user = renderToolbar([param('speed', 'Speed')])
    await chooseMenuItem(user, 'Import', 'From Plugin (.js)')
    await waitFor(() => expect(message).toHaveBeenCalledTimes(1))
    expect(message).toHaveBeenCalledWith(expect.objectContaining({ title }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getAllByRole('checkbox')).toHaveLength(1)
  })

  it('saves the selection as a preset that adds its rows back', async () => {
    const user = renderToolbar([param('speed', 'Speed'), param('power', 'Power')])
    await user.click(screen.getByRole('button', { name: 'Select All' }))
    await chooseMenuItem(user, 'Presets', 'Save Selection as Preset...')
    await user.type(await screen.findByLabelText('Preset Name'), 'Set A{Enter}')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await chooseMenuItem(user, 'Presets', 'Set A (2 params)')
    expect(screen.getAllByText('Speed')).toHaveLength(2)
    expect(screen.getAllByText('Power')).toHaveLength(2)
  })

  it('overwrites a preset only when the prompt is answered Overwrite', async () => {
    const message = answering('Cancel', 'Overwrite')
    window.api = createFakeApi({ dialog: { message } })
    const user = renderToolbar([param('speed', 'Speed'), param('power', 'Power')])

    /** Opens the preset name dialog for the current selection; returns its Save button. */
    const openSave = async (): Promise<HTMLElement> => {
      await chooseMenuItem(user, 'Presets', 'Save Selection as Preset...')
      const dialog = await screen.findByRole('dialog', { name: 'Save Preset' })
      const save = within(dialog).getByRole('button', { name: 'Save' })
      expect(save).toBeDisabled()
      await user.type(within(dialog).getByLabelText('Preset Name'), 'Set A')
      return save
    }
    /** Whether the Presets menu lists Set A with `count` parameters; closes the menu again. */
    const presetListed = async (count: number): Promise<void> => {
      await user.click(screen.getByRole('button', { name: 'Presets' }))
      expect(
        await screen.findByRole('menuitem', { name: `Set A (${count} params)` })
      ).toBeInTheDocument()
      await user.keyboard('{Escape}')
      await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument())
    }

    await user.click(screen.getByRole('button', { name: 'Select All' }))
    await user.click(await openSave())
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: 'Deselect' }))
    await tick(user, 'Speed')

    await user.click(await openSave())
    await waitFor(() => expect(message).toHaveBeenCalledTimes(1))
    expect(message.mock.calls[0][0].buttons).toContain('Cancel')
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await presetListed(2)

    await user.click(await openSave())
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(message).toHaveBeenCalledTimes(2)
    await presetListed(1)
  })
})
