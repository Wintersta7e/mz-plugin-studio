// The parameter tab's Import menu (what a .mzparams file does once it is read in) and its Export
// button (where the selected parameters are written).
import { readFileSync } from 'node:fs'
import { access, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { describe, it, expect, beforeEach, afterEach, vi, type Mock } from 'vitest'
import { act, render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import userEvent, { type UserEvent } from '@testing-library/user-event'
import type { SaveDialogOptions, SaveDialogReturnValue } from 'electron'
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
import { ACCESS_DENIED, IPC_CHANNELS, type MessageDialogOptions } from '../../src/shared/ipc-types'
import type { MZProject } from '../../src/shared/types/mz'
import { evaluatePlugin } from '../helpers/evaluate-plugin'
import { createFakeApi, sampleProject } from '../helpers/fake-api'
import { ALL_PAYLOADS } from '../helpers/hostile'
import { viaIpc } from './support/main-api'
import { recordOf, recordsOf } from './support/persisted-state'
import { resetStores } from './support/reset-stores'

type Api = Window['api']
type Message = Api['dialog']['message']

const fixtureText = (name: string): string =>
  readFileSync(path.resolve(process.cwd(), 'tests/fixtures/mzparams', name), 'utf8')

// The fixture file with a parameter of an unknown type, read as records for a test to edit
// before importing it
function unknownTypeFixture(): {
  file: Record<string, unknown>
  parameters: Record<string, unknown>[]
} {
  const name = 'invalid-unknown-type.mzparams'
  const parsed: unknown = JSON.parse(fixtureText(name))
  const file = recordOf(parsed, name)
  const { parameters } = file
  return { file, parameters: recordsOf(parameters, `${name} parameters`) }
}

function parameterAt(
  parameters: Record<string, unknown>[],
  index: number
): Record<string, unknown> {
  const parameter = parameters.at(index)
  if (parameter === undefined) throw new Error(`the file has no parameter ${String(index)}`)
  return parameter
}

const parameterNames = (): string[] =>
  usePluginStore.getState().plugin.parameters.map((p) => p.name)

// The plugin's parameter names at the moment each message was shown
const namesWhenShown: string[][] = []

// The fresh temporary folder of the running test
const temporary = { root: '' }

// Every test starts from a plugin holding the parameter Existing: the Import menu sits in the
// toolbar, which shows once the plugin has a parameter.
function setUp(): void {
  resetStores()
  namesWhenShown.length = 0
  vi.stubGlobal('api', createFakeApi())
  const existing = { ...createEmptyParameter(), name: 'Existing' }
  usePluginStore.getState().openPlugin({ ...createEmptyPlugin(), parameters: [existing] })
}

const tearDown = (): void => {
  vi.unstubAllGlobals()
}

// The arguments of the first call a mock received
function firstCall<A extends unknown[]>(calls: A[]): A {
  const call = calls.at(0)
  if (call === undefined) throw new Error('the mock was not called')
  return call
}

// A message dialog that resolves each prompt with the button index `answer` picks as it is shown
function messageDialog(answer: (options: MessageDialogOptions) => number): Mock<Message> {
  // `answer` runs when the prompt is shown; the inner mock turns its index into the answer
  const reply = vi.fn<Message>()
  return vi.fn<Message>(async (options) => {
    reply.mockResolvedValueOnce(answer(options))
    return reply(options)
  })
}

// Picks "From File (.mzparams)" with `text` as the chosen file; returns the dialog mock
function importFile(text: string): Mock<Message> {
  const message = messageDialog(() => {
    namesWhenShown.push(parameterNames())
    return 0
  })
  vi.stubGlobal(
    'api',
    createFakeApi({
      dialog: {
        openFile: vi.fn<Api['dialog']['openFile']>().mockResolvedValue('/fixtures/in.mzparams'),
        message
      },
      plugin: { readByPath: vi.fn<Api['plugin']['readByPath']>().mockResolvedValue(text) }
    })
  )
  render(<ParameterBuilder />)
  fireEvent.keyDown(screen.getByRole('button', { name: 'Import' }), { key: 'Enter' })
  fireEvent.click(screen.getByText('From File (.mzparams)'))
  return message
}

const payloadText = (name: string): string => {
  const payload = ALL_PAYLOADS.find((p) => p.name === name)
  if (payload === undefined) throw new Error(`no hostile payload named ${name}`)
  return payload.text
}

describe('parameter import from a file: refusals and reports', () => {
  beforeEach(setUp)

  afterEach(tearDown)

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
    expect.hasAssertions()

    const message = importFile(text)
    await waitFor(() => {
      expect(message).toHaveBeenCalledTimes(1)
    })

    expect(message).toHaveBeenCalledWith({
      type: 'error',
      title: 'Import Failed',
      message: expected
    })
    expect(parameterNames()).toStrictEqual(['Existing'])
  })

  it('adds the good parameters, then reports what it skipped and dropped', async () => {
    expect.hasAssertions()

    const { file, parameters } = unknownTypeFixture()
    Object.assign(parameterAt(parameters, 0), { extra: 'not a parameter field' })
    const message = importFile(JSON.stringify({ ...file, parameters: [...parameters, 42] }))
    await waitFor(() => {
      expect(message).toHaveBeenCalledTimes(1)
    })

    expect(message).toHaveBeenCalledWith({
      type: 'warning',
      title: 'Import Report',
      message:
        'Imported 1 parameter. Skipped 2: "Shape" (unknown type), item 3 (not a parameter). ' +
        'Dropped 1 field with the wrong type or an unknown name: "Label" (extra).'
    })
    expect(namesWhenShown).toStrictEqual([['Existing', 'Label']])
  })

  it('names every field it dropped, by parameter and field', async () => {
    expect.hasAssertions()

    const { file, parameters } = unknownTypeFixture()
    Object.assign(parameterAt(parameters, 0), { desc: 5, extra: 'not a parameter field' })
    Object.assign(parameterAt(parameters, 1), {
      type: 'select',
      options: [{ value: 'a', text: 'A', note: 'not an option field' }]
    })
    const message = importFile(JSON.stringify({ ...file, parameters }))
    await waitFor(() => {
      expect(message).toHaveBeenCalledTimes(1)
    })

    expect(message).toHaveBeenCalledWith({
      type: 'warning',
      title: 'Import Report',
      message:
        'Imported 2 parameters. Dropped 3 fields with the wrong type or an unknown name: ' +
        '"Label" (desc), "Label" (extra), "Shape" (options[0].note).'
    })
    expect(namesWhenShown).toStrictEqual([['Existing', 'Label', 'Shape']])
  })
})

describe('parameter import from a file: descriptions', () => {
  beforeEach(setUp)

  afterEach(tearDown)

  it('keeps an imported description inside the plugin comment when the plugin runs', async () => {
    expect.hasAssertions()

    const desc = payloadText('comment-space')
    const text = JSON.stringify({
      version: 1,
      source: 'Test',
      exportedAt: '2026-01-01T00:00:00.000Z',
      parameters: [{ id: 'p', name: 'Label', text: 'Label', desc, type: 'string', default: '' }]
    })
    const message = importFile(text)
    await waitFor(() => {
      expect(parameterNames()).toStrictEqual(['Existing', 'Label'])
    })

    expect(message).not.toHaveBeenCalled()

    const { plugin } = usePluginStore.getState()

    expect(plugin.parameters.at(1)?.desc).toBe(desc)

    const { compileProblem, threw, sentinel } = evaluatePlugin(generatePlugin(plugin), {
      mode: 'generator'
    })

    expect({ compileProblem, threw, sentinel }).toStrictEqual({
      compileProblem: null,
      threw: null,
      sentinel: false
    })
  })
})

describe('parameter import from a file that is not UTF-8', () => {
  beforeEach(async () => {
    setUp()
    temporary.root = await mkdtemp(path.join(tmpdir(), 'param-import-'))
  })

  afterEach(async () => {
    tearDown()
    await rm(temporary.root, { recursive: true, force: true })
  })

  it.each([
    ['From File (.mzparams)', 'Shift.mzparams', 'Could not read the file. '],
    ['From Plugin (.js)', 'Shift.js', 'Could not read or parse the plugin file. ']
  ])('%s says why the file is refused and how to use it', async (item, name, lead) => {
    expect.hasAssertions()

    const file = path.join(temporary.root, name)
    // Shift_JIS text, which is not valid UTF-8
    await writeFile(file, Buffer.from([0x7b, 0x83, 0x65, 0x83, 0x58, 0x7d]))
    const message = vi.fn<Message>().mockResolvedValue(0)
    const readByPath = vi.fn<Api['plugin']['readByPath']>(
      viaIpc(IPC_CHANNELS.PLUGIN_READ_BY_PATH, readFileByPath)
    )
    vi.stubGlobal(
      'api',
      createFakeApi({
        dialog: { openFile: vi.fn<Api['dialog']['openFile']>().mockResolvedValue(file), message },
        plugin: { readByPath }
      })
    )
    render(<ParameterBuilder />)
    fireEvent.keyDown(screen.getByRole('button', { name: 'Import' }), { key: 'Enter' })
    fireEvent.click(screen.getByText(item))
    await waitFor(() => {
      expect(message).toHaveBeenCalledTimes(1)
    })

    expect(message).toHaveBeenCalledWith({
      type: 'error',
      title: 'Import Failed',
      message: `${lead}${name} is not UTF-8. The app reads only UTF-8 files, so it can save a plugin's text back unchanged; convert it to UTF-8 and try again`
    })
    expect(parameterNames()).toStrictEqual(['Existing'])
  })
})

/**
Exports every parameter through the main-process save functions, rejecting as
`ipcRenderer.invoke` does; `saveFile` answers `target`, through the save dialog or not.
Returns the message dialog mock.
*/
function exportTo(target: string, { throughDialog = true } = {}): Mock<Message> {
  const dialog = {
    showSaveDialog: vi
      .fn<(options: SaveDialogOptions) => Promise<SaveDialogReturnValue>>()
      .mockResolvedValue({ canceled: false, filePath: target })
  }
  const message = vi.fn<Message>().mockResolvedValue(0)
  vi.stubGlobal(
    'api',
    createFakeApi({
      dialog: {
        saveFile: throughDialog
          ? async (options) => showSaveFileDialog(dialog, options ?? {})
          : vi.fn<Api['dialog']['saveFile']>().mockResolvedValue(target),
        message
      },
      plugin: { saveToPath: viaIpc(IPC_CHANNELS.PLUGIN_SAVE_TO_PATH, savePluginToPath) }
    })
  )
  render(<ParameterBuilder />)
  fireEvent.click(screen.getByRole('button', { name: 'Select All' }))
  fireEvent.click(screen.getByRole('button', { name: 'Export' }))
  return message
}

describe('parameter export to a file', () => {
  beforeEach(async () => {
    setUp()
    temporary.root = await mkdtemp(path.join(tmpdir(), 'param-export-'))
  })

  afterEach(async () => {
    tearDown()
    await rm(temporary.root, { recursive: true, force: true })
  })

  it('writes the selected parameters to the path chosen in the save dialog', async () => {
    expect.hasAssertions()

    const target = path.join(temporary.root, 'Alpha-params.mzparams')
    const message = exportTo(target)
    const written = await waitFor(async () => readFile(target, 'utf8'))
    const result = deserializeParams(written)

    expect(result.success && result.parameters.map((p) => p.name)).toStrictEqual(['Existing'])
    expect(message).not.toHaveBeenCalled()
  })

  it('says why and writes nothing for a path no save dialog returned', async () => {
    expect.hasAssertions()

    const target = path.join(temporary.root, 'Alpha-params.mzparams')
    const message = exportTo(target, { throughDialog: false })
    await waitFor(() => {
      expect(message).toHaveBeenCalledTimes(1)
    })

    expect(message).toHaveBeenCalledWith({
      type: 'error',
      title: 'Export Failed',
      message: `${ACCESS_DENIED}${target} was not chosen in a save dialog`
    })
    await expect(access(target)).rejects.toMatchObject({ code: 'ENOENT' })
  })
})

// The plugin's first parameter, the Existing one every test starts from
function existingParameter(): PluginParameter {
  const existing = usePluginStore.getState().plugin.parameters.at(0)
  if (existing === undefined) throw new Error('the plugin has no parameter')
  return existing
}

describe('parameter usage comment', () => {
  beforeEach(setUp)

  afterEach(tearDown)

  it('renaming a parameter rewrites the comment that names it in the plugin code', () => {
    const existing = existingParameter()
    usePluginStore.getState().setCustomCode(generateParameterComment(existing) + '\n')
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
      const existing = existingParameter()
      const rest = '\nfunction tick() { return speed * 2; }\n'
      usePluginStore.getState().setCustomCode(generateParameterComment(existing) + rest)
      render(<ParameterBuilder />)
      fireEvent.click(screen.getByText(existing.text))
      fireEvent.change(screen.getByDisplayValue('Existing'), { target: { value: name } })

      expect(usePluginStore.getState().plugin.customCode).toBe(
        generateParameterComment({ ...existing, name }) + rest
      )
    }
  )
})

// Renders the tab with every parameter selected; the message dialog answers Cancel
function selectEveryRow(): Mock<Message> {
  const message = vi.fn<Message>().mockResolvedValue(0)
  vi.stubGlobal('api', createFakeApi({ dialog: { message } }))
  render(<ParameterBuilder />)
  fireEvent.click(screen.getByRole('button', { name: 'Select All' }))
  return message
}

describe('parameter prompts that discard work', () => {
  beforeEach(setUp)

  afterEach(tearDown)

  it('deleting the selected parameters asks with Cancel as the default', async () => {
    expect.hasAssertions()

    const message = selectEveryRow()
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
    await waitFor(() => {
      expect(message).toHaveBeenCalledTimes(1)
    })
    const [options] = firstCall(message.mock.calls)

    expect(options.buttons).toStrictEqual(['Cancel', 'Delete'])
    expect(parameterNames()).toStrictEqual(['Existing'])
    // The main process makes Cancel the default from its button word
    expect(options).not.toHaveProperty('defaultId')
    expect(options).not.toHaveProperty('cancelId')
  })

  it('overwriting a preset asks with Cancel as the default', async () => {
    expect.hasAssertions()

    const kept = { ...createEmptyParameter(), name: 'Kept' }
    useSettingsStore.setState({ parameterPresets: { Mine: [kept] } })
    const message = selectEveryRow()
    fireEvent.keyDown(screen.getByRole('button', { name: 'Presets' }), { key: 'Enter' })
    fireEvent.click(screen.getByText('Save Selection as Preset...'))
    fireEvent.change(screen.getByLabelText('Preset Name'), { target: { value: 'Mine' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => {
      expect(message).toHaveBeenCalledTimes(1)
    })
    const [options] = firstCall(message.mock.calls)

    expect(options.buttons).toStrictEqual(['Cancel', 'Overwrite'])
    expect(useSettingsStore.getState().parameterPresets).toStrictEqual({ Mine: [kept] })
    expect(options).not.toHaveProperty('defaultId')
    expect(options).not.toHaveProperty('cancelId')
  })
})

// The generated plugin code the preview shows
function preview(): string {
  const editor = screen.getByTestId('monaco-editor')
  if (editor instanceof HTMLTextAreaElement) return editor.value
  throw new TypeError('the code preview is not a text area')
}

// Waits until the preview holds each of `texts`
async function previewShows(...texts: string[]): Promise<void> {
  await waitFor(() => {
    expect(texts.filter((text) => !preview().includes(text))).toStrictEqual([])
  })
}

// The parameter row whose header reads `label`: the draggable card holding that text
const row = (label: string): HTMLElement =>
  screen.getByText(
    (_content, element) =>
      element instanceof HTMLElement &&
      element.draggable &&
      within(element).queryByText(label) !== null
  )

// Checks that a row reads each of `labels`
function expectRows(...labels: string[]): void {
  for (const label of labels) expect(row(label)).toBeInTheDocument()
}

// The first button inside `element`
function firstButtonIn(element: HTMLElement): HTMLElement {
  const button = within(element).getAllByRole('button').at(0)
  if (button === undefined) throw new Error('no button found')
  return button
}

const param = (name: string, text: string): PluginParameter => ({
  ...createEmptyParameter(),
  name,
  text
})

const selectParam = (name: string, text: string, value: string): PluginParameter => ({
  ...param(name, text),
  type: 'select',
  options: [{ value, text: value }]
})

/**
Opens a plugin named Alpha holding `parameters` and `structs`; renders the tab, beside the
code preview unless `withPreview` is false (the preview has an Export button of its own).
*/
function openTab(
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

// The select whose text starts with `text`; a select's label names no target, so it has no
// accessible name
function combobox(text: string): HTMLElement {
  const shown = screen.getAllByRole('combobox').find((c) => c.textContent.startsWith(text))
  if (shown === undefined) throw new Error(`no select starts with ${text}`)
  return shown
}

// Picks `type` in the expanded row's Type select, which shows String
async function pickType(user: UserEvent, type: string): Promise<void> {
  await user.click(combobox('String'))
  await user.click(await screen.findByRole('option', { name: new RegExp(`^${type}`) }))
}

// Opens `project` the way the app does after loading it
function openProject(project: MZProject): void {
  const { path: projectPath, gameTitle, maps, ...gameData } = project
  const store = useProjectStore.getState()
  store.setProject({ ...gameData, path: projectPath, gameTitle, maps })
  store.setAllGameData(gameData)
}

async function addParameter(user: UserEvent): Promise<void> {
  await user.click(screen.getByRole('button', { name: 'Add Parameter' }))
}

describe('parameter rows: name and label', () => {
  beforeEach(setUp)

  afterEach(tearDown)

  it('shows an empty list, then a new row with its name field and the selection toolbar', async () => {
    expect.hasAssertions()

    const user = openTab()

    expect(screen.getByText('No parameters defined')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Select All' })).not.toBeInTheDocument()

    await addParameter(user)

    expect(screen.queryByText('No parameters defined')).not.toBeInTheDocument()
    expect(screen.getByPlaceholderText('paramName')).toHaveValue('NewParameter')
    expect(screen.getByRole('button', { name: 'Select All' })).toBeInTheDocument()
  })

  it('writes the typed name and label into the row header and the plugin code', async () => {
    expect.hasAssertions()

    const user = openTab()
    await addParameter(user)
    await user.clear(screen.getByPlaceholderText('paramName'))
    await user.type(screen.getByPlaceholderText('paramName'), 'speed')
    await user.clear(screen.getByPlaceholderText('Parameter Label'))
    await user.type(screen.getByPlaceholderText('Parameter Label'), 'Speed')

    expect(row('Speed')).toBeInTheDocument()

    await previewShows('@param speed', '@text Speed')
  })

  it('says why a name is not an identifier, is empty or is taken', async () => {
    expect.hasAssertions()

    const user = openTab([param('speed', 'Speed')])
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
})

describe('parameter rows: types', () => {
  beforeEach(setUp)

  afterEach(tearDown)

  it('turns a row into a number with a minimum', async () => {
    expect.hasAssertions()

    const user = openTab()
    await addParameter(user)
    await pickType(user, 'Number')

    expect(screen.getByText('(number)')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Show details' }))
    await user.type(screen.getByPlaceholderText('No min'), '5')
    await previewShows('@type number', '@min 5')
  })

  it('asks for a project before a switch default, then offers the project switches', async () => {
    expect.hasAssertions()

    const user = openTab()
    await addParameter(user)
    await pickType(user, 'Switch')

    expect(screen.getByPlaceholderText('Load project first')).toBeDisabled()

    act(() => {
      openProject({ ...sampleProject(), switches: [{ id: 1, name: 'Door Open' }] })
    })
    await user.click(combobox('Select switch...'))

    const option = await screen.findByRole('option', { name: '1: Door Open' })

    expect(option).toBeInTheDocument()
  })

  it('shows the default editor of the struct a struct row picks', async () => {
    expect.hasAssertions()

    const point: PluginStruct = {
      ...createEmptyStruct(),
      name: 'Point',
      parameters: [{ ...param('x', 'Horizontal'), type: 'number' }]
    }
    const user = openTab([], [point])
    await addParameter(user)
    await pickType(user, 'Struct')
    await user.click(combobox('Select struct...'))
    await user.click(await screen.findByRole('option', { name: 'Point' }))

    expect(screen.getByText('Horizontal')).toBeInTheDocument()

    await previewShows('struct<Point>')
  })
})

describe('parameter rows: select options', () => {
  beforeEach(setUp)

  afterEach(tearDown)

  it('writes each typed option of a select row with its value', async () => {
    expect.hasAssertions()

    const user = openTab()
    await addParameter(user)
    await pickType(user, 'Select')
    await user.type(screen.getByPlaceholderText(/^option1\|Option 1/), 'a|Alpha{Enter}b')
    await previewShows('@option Alpha', '@value a', '@option b')
  })

  it('keeps a "|" and an Enter typed at the end of a select row\'s options', async () => {
    expect.hasAssertions()

    const user = openTab()
    await addParameter(user)
    await pickType(user, 'Select')
    const options = screen.getByPlaceholderText(/^option1\|Option 1/)
    await user.type(options, 'x|Y{Backspace}Z{Enter}b')

    expect(options).toHaveValue('x|Z\nb')

    await previewShows(' * @option Z\n * @value x\n * @option b\n *\n')
  })

  it('keeps loaded select options holding a "|" when the options are typed in', async () => {
    expect.hasAssertions()

    const user = openTab([
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

    expect(usePluginStore.getState().plugin.parameters.at(0)?.options).toStrictEqual([
      { value: 'a|b', text: 'Label' },
      { value: 'A|B', text: 'A|B' },
      { value: 'cx', text: 'cx' }
    ])
  })

  it('shows the options of the select row opened after a "|" was typed in another', async () => {
    expect.hasAssertions()

    const user = openTab([selectParam('first', 'First', 'a'), selectParam('second', 'Second', 'b')])
    await user.click(screen.getByText('First'))
    await user.type(screen.getByPlaceholderText(/^option1\|Option 1/), '|')

    expect(screen.getByPlaceholderText(/^option1\|Option 1/)).toHaveValue('a|')

    await user.click(screen.getByText('Second'))

    expect(within(row('Second')).getByPlaceholderText(/^option1\|Option 1/)).toHaveValue('b')
  })
})

describe('parameter rows: order and removal', () => {
  beforeEach(setUp)

  afterEach(tearDown)

  it('moves a row dropped onto another, in the list and in the plugin code', async () => {
    expect.hasAssertions()

    openTab([param('speed', 'Speed'), param('power', 'Power')])
    const dataTransfer = {
      setData: vi.fn<DataTransfer['setData']>(),
      setDragImage: vi.fn<DataTransfer['setDragImage']>(),
      effectAllowed: '',
      dropEffect: ''
    }
    fireEvent.dragStart(row('Speed'), { dataTransfer })
    fireEvent.dragOver(row('Power'), { dataTransfer })
    fireEvent.drop(row('Power'), { dataTransfer })

    expect(screen.getAllByText(/^(Speed|Power)$/).map((label) => label.textContent)).toStrictEqual([
      'Power',
      'Speed'
    ])

    await waitFor(() => {
      expect(preview().match(/@param (?:power|speed)/g)).toStrictEqual([
        '@param power',
        '@param speed'
      ])
    })
  })

  it('marks a hidden row, and a deleted row leaves the plugin code', async () => {
    expect.hasAssertions()

    const user = openTab()
    await addParameter(user)
    await pickType(user, 'Hidden')

    expect(within(row('New Parameter')).getByText('hidden in MZ')).toBeInTheDocument()

    await previewShows('@param NewParameter')
    // The delete button has no name; it is the first button in the row, inside its header
    await user.click(firstButtonIn(row('New Parameter')))

    expect(screen.queryByText('New Parameter')).not.toBeInTheDocument()

    await waitFor(() => {
      expect(preview()).not.toContain('@param NewParameter')
    })
  })
})

// A message dialog that answers each prompt with the button named by the next of `words`
const answering = (...words: string[]): Mock<Message> =>
  messageDialog((options) => options.buttons?.indexOf(words.shift() ?? '') ?? -1)

// Lets a handler that awaited a recorded call run to its end
async function settle(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0))
}

async function tick(user: UserEvent, label: string): Promise<void> {
  await user.click(within(row(label)).getByRole('checkbox'))
}

async function chooseMenuItem(user: UserEvent, menu: string, item: string): Promise<void> {
  await user.click(screen.getByRole('button', { name: menu }))
  await user.click(await screen.findByRole('menuitem', { name: item }))
}

async function dialogClosed(): Promise<void> {
  await waitFor(() => {
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
}

const openToolbar = (parameters: PluginParameter[]): UserEvent =>
  openTab(parameters, [], { withPreview: false })

describe('parameter toolbar: selection', () => {
  beforeEach(setUp)

  afterEach(tearDown)

  it('enables the selection buttons only with a selection, and Select All toggles every row', async () => {
    expect.hasAssertions()

    const user = openToolbar([param('speed', 'Speed'), param('power', 'Power')])
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
    expect.hasAssertions()

    const user = openToolbar([param('speed', ''), param('power', '')])
    await tick(user, 'speed')
    await user.click(screen.getByRole('button', { name: 'Duplicate' }))

    expect(row('speed_copy')).toBeInTheDocument()
    expect(screen.getAllByRole('checkbox')).toHaveLength(3)

    for (const box of screen.getAllByRole('checkbox')) expect(box).not.toBeChecked()
  })

  it('deletes the selected rows only when the prompt is answered Delete', async () => {
    expect.hasAssertions()

    const message = answering('Cancel', 'Delete')
    vi.stubGlobal('api', createFakeApi({ dialog: { message } }))
    const user = openToolbar([
      param('speed', 'Speed'),
      param('power', 'Power'),
      param('range', 'Range')
    ])
    await tick(user, 'Speed')
    await tick(user, 'Power')
    await user.click(screen.getByRole('button', { name: 'Delete' }))
    await waitFor(() => {
      expect(message).toHaveBeenCalledTimes(1)
    })

    expect(firstCall(message.mock.calls)[0].buttons).toContain('Cancel')

    await settle()
    expectRows('Speed', 'Power')

    await user.click(screen.getByRole('button', { name: 'Delete' }))
    await waitFor(() => {
      expect(screen.queryByText('Speed')).not.toBeInTheDocument()
    })

    expect(screen.queryByText('Power')).not.toBeInTheDocument()
    expect(row('Range')).toBeInTheDocument()
  })
})

describe('parameter toolbar: export', () => {
  beforeEach(setUp)

  afterEach(tearDown)

  it('exports the selected rows to the path the save dialog returns', async () => {
    expect.hasAssertions()

    const api = createFakeApi({
      dialog: {
        saveFile: vi
          .fn<Api['dialog']['saveFile']>()
          .mockResolvedValue('/exports/Alpha-params.mzparams')
      }
    })
    vi.stubGlobal('api', api)
    const user = openToolbar([param('speed', 'Speed'), param('power', 'Power')])
    await tick(user, 'Power')
    await user.click(screen.getByRole('button', { name: 'Export' }))
    await waitFor(() => {
      expect(api.plugin.saveToPath).toHaveBeenCalledTimes(1)
    })

    expect(api.dialog.saveFile).toHaveBeenCalledWith({
      defaultPath: 'Alpha-params.mzparams',
      filters: [{ name: 'MZ Parameters', extensions: ['mzparams'] }]
    })

    const [file, content] = firstCall(vi.mocked(api.plugin.saveToPath).mock.calls)

    expect(file).toBe('/exports/Alpha-params.mzparams')

    const written: unknown = JSON.parse(content)
    const { parameters } = recordOf(written, 'the written file')

    expect(recordsOf(parameters, 'its parameters').map(({ name }) => name)).toStrictEqual(['power'])
  })

  it('writes nothing when the save dialog is cancelled', async () => {
    expect.hasAssertions()

    const api = createFakeApi({
      dialog: { saveFile: vi.fn<Api['dialog']['saveFile']>().mockResolvedValue(null) }
    })
    vi.stubGlobal('api', api)
    const user = openToolbar([param('speed', 'Speed')])
    await tick(user, 'Speed')
    await user.click(screen.getByRole('button', { name: 'Export' }))
    await waitFor(() => {
      expect(api.dialog.saveFile).toHaveBeenCalledTimes(1)
    })
    await settle()

    expect(api.plugin.saveToPath).not.toHaveBeenCalled()
  })
})

describe('parameter toolbar: import from a file', () => {
  beforeEach(setUp)

  afterEach(tearDown)

  it('adds the rows of the parameter file the open dialog returns', async () => {
    expect.hasAssertions()

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
      dialog: {
        openFile: vi
          .fn<Api['dialog']['openFile']>()
          .mockResolvedValue('/exports/Beta-params.mzparams')
      },
      plugin: { readByPath: vi.fn<Api['plugin']['readByPath']>().mockResolvedValue(text) }
    })
    vi.stubGlobal('api', api)
    const user = openToolbar([param('speed', 'Speed')])
    await chooseMenuItem(user, 'Import', 'From File (.mzparams)')

    const alpha = await screen.findByText('Alpha')

    expect(alpha).toBeInTheDocument()
    expect(row('Beta')).toBeInTheDocument()
    expect(api.dialog.openFile).toHaveBeenCalledWith({
      filters: [{ name: 'MZ Parameters', extensions: ['mzparams'] }]
    })
    expect(api.plugin.readByPath).toHaveBeenCalledWith('/exports/Beta-params.mzparams')
  })

  it('adds nothing when the open dialog is cancelled', async () => {
    expect.hasAssertions()

    const api = createFakeApi({
      dialog: { openFile: vi.fn<Api['dialog']['openFile']>().mockResolvedValue(null) }
    })
    vi.stubGlobal('api', api)
    const user = openToolbar([param('speed', 'Speed')])
    await chooseMenuItem(user, 'Import', 'From File (.mzparams)')
    await waitFor(() => {
      expect(api.dialog.openFile).toHaveBeenCalledTimes(1)
    })
    await settle()

    expect(api.plugin.readByPath).not.toHaveBeenCalled()
    expect(screen.getAllByRole('checkbox')).toHaveLength(1)
  })
})

describe('parameter toolbar: import from a plugin', () => {
  type Parse = Api['plugin']['parse']

  beforeEach(setUp)

  afterEach(tearDown)

  it('adds only the parameters left ticked in the plugin import picker', async () => {
    expect.hasAssertions()

    const api = createFakeApi({
      dialog: {
        openFile: vi
          .fn<Api['dialog']['openFile']>()
          .mockResolvedValue('/project/js/plugins/Beta.js')
      },
      plugin: {
        readByPath: vi.fn<Api['plugin']['readByPath']>().mockResolvedValue('/* Beta */'),
        parse: vi.fn<Parse>().mockResolvedValue({
          ...createEmptyPlugin(),
          parameters: [param('alpha', 'Alpha'), param('beta', 'Beta')]
        })
      }
    })
    vi.stubGlobal('api', api)
    const user = openToolbar([param('speed', 'Speed')])
    await chooseMenuItem(user, 'Import', 'From Plugin (.js)')
    const picker = await screen.findByRole('dialog', { name: 'Import Parameters from Plugin' })

    expect(within(picker).getByText(/\(2 found\)/)).toBeInTheDocument()
    expect(api.dialog.openFile).toHaveBeenCalledWith({
      filters: [{ name: 'JavaScript Plugin', extensions: ['js'] }]
    })
    expect(api.plugin.parse).toHaveBeenCalledWith('/* Beta */')

    await user.click(within(picker).getByRole('checkbox', { name: /^Beta/ }))
    await user.click(within(picker).getByRole('button', { name: 'Import 1 Parameter' }))
    await dialogClosed()

    expect(row('Alpha')).toBeInTheDocument()
    expect(screen.queryByText('Beta')).not.toBeInTheDocument()
  })

  it.each([
    [
      'has no parameters',
      (): Mock<Parse> => vi.fn<Parse>().mockResolvedValue(createEmptyPlugin()),
      'No Parameters'
    ],
    [
      'cannot be parsed',
      (): Mock<Parse> => vi.fn<Parse>().mockRejectedValue(new Error('Unexpected token')),
      'Import Failed'
    ]
  ])('says so when the chosen plugin %s', async (_label, parser, title) => {
    expect.hasAssertions()

    const message = vi.fn<Message>().mockResolvedValue(0)
    vi.stubGlobal(
      'api',
      createFakeApi({
        dialog: {
          openFile: vi
            .fn<Api['dialog']['openFile']>()
            .mockResolvedValue('/project/js/plugins/Beta.js'),
          message
        },
        plugin: {
          readByPath: vi.fn<Api['plugin']['readByPath']>().mockResolvedValue('/* Beta */'),
          parse: parser()
        }
      })
    )
    const user = openToolbar([param('speed', 'Speed')])
    await chooseMenuItem(user, 'Import', 'From Plugin (.js)')
    await waitFor(() => {
      expect(message).toHaveBeenCalledTimes(1)
    })

    expect(message).toHaveBeenCalledWith(expect.objectContaining({ title }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getAllByRole('checkbox')).toHaveLength(1)
  })
})

// Opens the preset name dialog for the current selection and types Set A; returns its Save button
async function openSave(user: UserEvent): Promise<HTMLElement> {
  await chooseMenuItem(user, 'Presets', 'Save Selection as Preset...')
  const dialog = await screen.findByRole('dialog', { name: 'Save Preset' })
  const save = within(dialog).getByRole('button', { name: 'Save' })

  expect(save).toBeDisabled()

  await user.type(within(dialog).getByLabelText('Preset Name'), 'Set A')
  return save
}

// Checks that the Presets menu lists Set A with `count` parameters; closes the menu again
async function presetListed(user: UserEvent, count: number): Promise<void> {
  await user.click(screen.getByRole('button', { name: 'Presets' }))

  const item = await screen.findByRole('menuitem', { name: `Set A (${String(count)} params)` })

  expect(item).toBeInTheDocument()

  await user.keyboard('{Escape}')
  await waitFor(() => {
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })
}

describe('parameter toolbar: presets', () => {
  beforeEach(setUp)

  afterEach(tearDown)

  it('saves the selection as a preset that adds its rows back', async () => {
    expect.hasAssertions()

    const user = openToolbar([param('speed', 'Speed'), param('power', 'Power')])
    await user.click(screen.getByRole('button', { name: 'Select All' }))
    await chooseMenuItem(user, 'Presets', 'Save Selection as Preset...')
    await user.type(await screen.findByLabelText('Preset Name'), 'Set A{Enter}')
    await dialogClosed()
    await chooseMenuItem(user, 'Presets', 'Set A (2 params)')

    expect(screen.getAllByText('Speed')).toHaveLength(2)
    expect(screen.getAllByText('Power')).toHaveLength(2)
  })

  it('overwrites a preset only when the prompt is answered Overwrite', async () => {
    expect.hasAssertions()

    const message = answering('Cancel', 'Overwrite')
    vi.stubGlobal('api', createFakeApi({ dialog: { message } }))
    const user = openToolbar([param('speed', 'Speed'), param('power', 'Power')])

    await user.click(screen.getByRole('button', { name: 'Select All' }))
    await user.click(await openSave(user))
    await dialogClosed()
    await user.click(screen.getByRole('button', { name: 'Deselect' }))
    await tick(user, 'Speed')

    await user.click(await openSave(user))
    await waitFor(() => {
      expect(message).toHaveBeenCalledTimes(1)
    })

    expect(firstCall(message.mock.calls)[0].buttons).toContain('Cancel')

    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    await dialogClosed()
    await presetListed(user, 2)

    await user.click(await openSave(user))
    await dialogClosed()

    expect(message).toHaveBeenCalledTimes(2)

    await presetListed(user, 1)
  })
})
