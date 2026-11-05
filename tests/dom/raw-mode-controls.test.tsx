// Every editing control of an imported plugin in raw mode: each field either changes what is
// saved (the plugin file or one of the export formats), or its control is read-only and says
// why, or no control edits it. A field added to a type fails the typecheck here until listed.
import type { ReactElement } from 'react'
import { afterAll, afterEach, describe, it, expect, beforeEach, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CodeEditor } from '../../src/renderer/src/components/plugin/CodeEditor'
import { CommandBuilder } from '../../src/renderer/src/components/plugin/CommandBuilder'
import { MetaEditor } from '../../src/renderer/src/components/plugin/MetaEditor'
import { ParameterBuilder } from '../../src/renderer/src/components/plugin/ParameterBuilder'
import { StructBuilder } from '../../src/renderer/src/components/plugin/StructBuilder'
import { TemplateInserter } from '../../src/renderer/src/components/plugin/TemplateInserter'
import {
  generatePluginsJsonEntry,
  generateReadme,
  generateTypeDeclaration
} from '../../src/renderer/src/lib/exportFormats'
import { generatePluginOutput } from '../../src/renderer/src/lib/plugin-output'
import { usePluginStore, useSettingsStore, useUIStore } from '../../src/renderer/src/stores'
import {
  createEmptyCommand,
  createEmptyParameter,
  createEmptyStruct,
  toBaseline,
  type PluginCommand,
  type PluginDefinition,
  type PluginMeta,
  type PluginParameter,
  type PluginStruct
} from '../../src/shared/types/plugin'
import { loadFixture } from '../golden/corpus/raw-mode'
import { afterAllTests } from '../helpers/after-all-tests'
import { createFakeApi } from '../helpers/fake-api'
import { resetStores } from './support/reset-stores'

const FILE = 'Fixture_HandWritten.js'
const NOTICE =
  "Raw mode keeps this plugin's own code and language blocks, so this is read-only here. Turn raw mode off in the preview to edit it."

// A field edit, the read-only control that shows it, or no control at all.
type Edit<T> =
  | { kind: 'output'; base: Partial<T>; change: Partial<T> }
  | { kind: 'read-only'; control: ReadOnlyControl }
  | { kind: 'own table' }
  | { kind: 'no control' }

type ReadOnlyControl = 'code tab' | 'localized fields'

// A field edit whose result is saved: `change` applied over `base`.
type Output<T> = (change: Partial<T>, base?: Partial<T>) => Edit<T>

function output<T>(change: Partial<T>, base: Partial<T> = {}): Edit<T> {
  return { kind: 'output', change, base }
}
const meta: Output<PluginMeta> = output
const param: Output<PluginParameter> = output
const command: Output<PluginCommand> = output
const struct: Output<PluginStruct> = output

const DEFINITION = {
  id: { kind: 'no control' },
  meta: { kind: 'own table' },
  parameters: { kind: 'own table' },
  commands: { kind: 'own table' },
  structs: { kind: 'own table' },
  codeBody: { kind: 'no control' },
  customCode: { kind: 'read-only', control: 'code tab' },
  rawSource: { kind: 'no control' },
  importedFrom: { kind: 'no control' }
} satisfies Record<keyof PluginDefinition, Edit<PluginDefinition>>

const META = {
  name: meta({ name: 'Renamed' }),
  version: meta({ version: '9.9.9' }),
  author: meta({ author: 'Other Author' }),
  description: meta({ description: 'Edited description' }),
  help: meta({ help: 'Edited help' }),
  url: meta({ url: 'https://example.invalid/other' }),
  target: meta({ target: 'MV' }),
  dependencies: meta({ dependencies: ['OtherPlugin'] }),
  orderAfter: meta({ orderAfter: ['OtherPlugin'] }),
  orderBefore: meta({ orderBefore: ['OtherPlugin'] }),
  noteParams: meta({ noteParams: [{ name: 'Portrait', type: 'file', dir: 'img/faces' }] }),
  requiredAssets: meta({ requiredAssets: ['img/pictures/Extra'] }),
  localizations: { kind: 'read-only', control: 'localized fields' }
} satisfies Record<keyof PluginMeta, Edit<PluginMeta>>

const PARAMETER = {
  id: { kind: 'no control' },
  name: param({ name: 'Renamed' }),
  text: param({ text: 'Renamed label' }),
  desc: param({ desc: 'Edited description' }),
  type: param({ type: 'string' }, { type: 'number' }),
  default: param({ default: 7 }, { type: 'number', default: 1 }),
  min: param({ min: 3 }, { type: 'number' }),
  max: param({ max: 30 }, { type: 'number' }),
  decimals: param({ decimals: 2 }, { type: 'number' }),
  options: param({ options: [{ value: 'b', text: 'B' }] }, { type: 'select', options: [] }),
  structType: param({ structType: 'Other' }, { type: 'struct', structType: 'Point' }),
  arrayType: param({ arrayType: 'string' }, { type: 'array', arrayType: 'number' }),
  dir: param({ dir: 'img/faces' }, { type: 'file', dir: 'img/pictures' }),
  require: { kind: 'no control' },
  parent: { kind: 'no control' },
  rawType: { kind: 'no control' },
  onLabel: param({ onLabel: 'Yes' }, { type: 'boolean' }),
  offLabel: param({ offLabel: 'No' }, { type: 'boolean' })
} satisfies Record<keyof PluginParameter, Edit<PluginParameter>>

const COMMAND = {
  id: { kind: 'no control' },
  name: command({ name: 'Renamed' }),
  text: command({ text: 'Renamed label' }),
  desc: command({ desc: 'Edited description' }),
  args: { kind: 'own table' }
} satisfies Record<keyof PluginCommand, Edit<PluginCommand>>

const STRUCT = {
  id: { kind: 'no control' },
  name: struct({ name: 'Renamed' }),
  parameters: { kind: 'own table' }
} satisfies Record<keyof PluginStruct, Edit<PluginStruct>>

const original = (): PluginDefinition => ({ ...loadFixture(FILE), importedFrom: FILE })

// The first item of a fixture's table; the edits below change that one.
function first<T>(items: readonly T[]): T {
  const item = items.at(0)
  if (item === undefined) throw new Error('the fixture has an empty table')
  return item
}

// What is saved for a definition: the plugin file in raw mode and the three export formats.
function saved(definition: PluginDefinition, baseline: PluginDefinition): string[] {
  const out = generatePluginOutput(definition, true, toBaseline(baseline))
  if (!out.ok) throw new Error(out.message)
  return [
    out.code,
    generateReadme(definition),
    generateTypeDeclaration(definition),
    generatePluginsJsonEntry(definition)
  ]
}

// Each position a table's item sits at in the definition, as an update of that item.
type Place<T> = (definition: PluginDefinition, update: (item: T) => T) => PluginDefinition

const PLACES: {
  meta: Place<PluginMeta>
  parameter: Place<PluginParameter>
  command: Place<PluginCommand>
  arg: Place<PluginParameter>
  struct: Place<PluginStruct>
  'struct field': Place<PluginParameter>
} = {
  meta: (definition, update) => ({ ...definition, meta: update(definition.meta) }),
  parameter: (definition, update) => ({
    ...definition,
    parameters: [update(first(definition.parameters)), ...definition.parameters.slice(1)]
  }),
  command: (definition, update) => ({
    ...definition,
    commands: [update(first(definition.commands)), ...definition.commands.slice(1)]
  }),
  arg: (definition, update) => {
    const firstCommand = first(definition.commands)
    return {
      ...definition,
      commands: [
        { ...firstCommand, args: [update(first(firstCommand.args))] },
        ...definition.commands.slice(1)
      ]
    }
  },
  struct: (definition, update) => ({
    ...definition,
    structs: [update(first(definition.structs)), ...definition.structs.slice(1)]
  }),
  'struct field': (definition, update) => {
    const firstStruct = first(definition.structs)
    return {
      ...definition,
      structs: [
        { ...firstStruct, parameters: [update(first(firstStruct.parameters))] },
        ...definition.structs.slice(1)
      ]
    }
  }
}

// Fields whose output edit changes nothing that is saved.
function unchangedOutputs<T>(table: Record<string, Edit<T>>, place: Place<T>): string[] {
  const definition = original()
  const unchanged: string[] = []
  for (const [field, edit] of Object.entries(table)) {
    if (edit.kind !== 'output') continue
    const before = place(definition, (item) => ({ ...item, ...edit.base }))
    const after = place(definition, (item) => ({ ...item, ...edit.base, ...edit.change }))
    if (JSON.stringify(saved(before, definition)) === JSON.stringify(saved(after, definition))) {
      unchanged.push(field)
    }
  }
  return unchanged
}

// How many controls a describe's tests checked: its `afterAll` prints the count once all of them
// have run, and fails when it is none.
function controlCount(): { add: (controls: number) => void; afterAll: () => void } {
  let checked = 0
  return {
    add(controls) {
      checked += controls
    },
    afterAll: afterAllTests(() => {
      process.stdout.write(`controls checked ${String(checked)}\n`)
      return checked > 0 ? [] : ['no control was checked']
    })
  }
}

function openOriginal(): void {
  resetStores()
  vi.stubGlobal('api', createFakeApi())
  usePluginStore.getState().openPlugin(original())
}

function tearDown(): void {
  vi.unstubAllGlobals()
}

// A read-only button says why: the notice describes it, and the element around it that is
// enabled shows the notice on hover, since a disabled button ignores the pointer.
function expectHoverNotice(name: RegExp): void {
  const button = screen.getByRole('button', { name })
  const hints = screen
    .getAllByTitle(NOTICE)
    .filter((element) => within(element).queryAllByRole('button', { name }).length > 0)

  expect(button).toBeDisabled()
  expect(button).toHaveAccessibleDescription(NOTICE)
  expect(hints).toHaveLength(1)
  expect(hints.at(0)).toBeEnabled()
  expect(hints.at(0)).toHaveAttribute('title', NOTICE)
}

describe('raw mode controls of an imported plugin: what is saved', () => {
  const count = controlCount()

  beforeEach(openOriginal)

  afterEach(tearDown)

  afterAll(count.afterAll)

  it('every field edit with a control changes what is saved', () => {
    const results = {
      meta: unchangedOutputs(META, PLACES.meta),
      parameter: unchangedOutputs(PARAMETER, PLACES.parameter),
      command: unchangedOutputs(COMMAND, PLACES.command),
      arg: unchangedOutputs(PARAMETER, PLACES.arg),
      struct: unchangedOutputs(STRUCT, PLACES.struct),
      'struct field': unchangedOutputs(PARAMETER, PLACES['struct field'])
    }

    expect(results).toStrictEqual({
      meta: [],
      parameter: [],
      command: [],
      arg: [],
      struct: [],
      'struct field': []
    })

    const tables: [Record<string, Edit<unknown>>, number][] = [
      [DEFINITION, 1],
      [META, 1],
      [PARAMETER, 3],
      [COMMAND, 1],
      [STRUCT, 1]
    ]
    for (const [table, places] of tables) {
      count.add(Object.values(table).filter((edit) => edit.kind === 'output').length * places)
    }
  })
})

describe('raw mode controls of an imported plugin: the Code tab', () => {
  const count = controlCount()

  beforeEach(openOriginal)

  afterEach(tearDown)

  afterAll(count.afterAll)

  it('the Code tab is read-only in raw mode and says why', () => {
    render(<CodeEditor />)

    expect(screen.getByTestId('monaco-editor')).toHaveAttribute('readonly')

    const insert = screen.getByRole('button', { name: /Insert Template/ })

    expect(insert).toBeDisabled()
    expect(insert).toHaveAttribute('title', NOTICE)
    expect(screen.getByText(NOTICE)).toBeInTheDocument()

    count.add(1)
  })

  it('the Code tab is editable with raw mode off', () => {
    useUIStore.getState().setRawModeForPlugin(usePluginStore.getState().plugin.id, false)
    render(<CodeEditor />)

    expect(screen.getByTestId('monaco-editor')).not.toHaveAttribute('readonly')
    expect(screen.getByRole('button', { name: /Insert Template/ })).toBeEnabled()
    expect(screen.queryByText(NOTICE)).not.toBeInTheDocument()
  })

  it('the template dialog inserts nothing while read-only', () => {
    const onInsert = vi.fn<(code: string) => void>()
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn<Clipboard['writeText']>() },
      configurable: true
    })
    render(<TemplateInserter open readOnly onClose={vi.fn<() => void>()} onInsert={onInsert} />)
    fireEvent.change(screen.getByPlaceholderText(/search/i), {
      target: { value: 'Custom Actor Property' }
    })
    fireEvent.click(screen.getByText('Custom Actor Property'))
    fireEvent.change(screen.getByLabelText(/Property Name/), { target: { value: 'loyalty' } })
    const insert = screen.getByRole('button', { name: /Insert Code/ })

    expect(insert).toBeDisabled()
    expect(insert).toHaveAttribute('title', NOTICE)

    fireEvent.click(insert)
    fireEvent.keyDown(document, { key: 'Enter', ctrlKey: true })

    expect(onInsert).not.toHaveBeenCalled()

    count.add(1)
  })

  it('the read-only notice of a disabled Insert button shows on hover and describes it', async () => {
    expect.hasAssertions()

    const user = userEvent.setup()
    const { unmount } = render(<CodeEditor />)
    expectHoverNotice(/Insert Template/)
    unmount()

    render(
      <TemplateInserter
        open
        readOnly
        onClose={vi.fn<() => void>()}
        onInsert={vi.fn<(code: string) => void>()}
      />
    )
    await user.type(screen.getByPlaceholderText(/search/i), 'Custom Actor Property')
    await user.click(screen.getByRole('button', { name: /^Custom Actor Property/ }))

    // A field error is listed too, but turning raw mode off is what enables the button
    expect(screen.getByRole('status')).toHaveTextContent('Field "Property Name" is required')

    expectHoverNotice(/Insert Code/)
  })
})

describe('raw mode controls of an imported plugin: localized fields and parameters', () => {
  const count = controlCount()

  beforeEach(openOriginal)

  afterEach(tearDown)

  afterAll(count.afterAll)

  it.each(['Japanese', 'Chinese'])(
    'the %s description and help are read-only in raw mode',
    (language) => {
      render(<MetaEditor />)
      fireEvent.mouseDown(screen.getByRole('tab', { name: language }), { button: 0 })
      for (const label of [`Description (${language})`, `Help Text (${language})`]) {
        const field = screen.getByLabelText(label)

        expect(field).toHaveAttribute('readonly')
        expect(field).toHaveAttribute('title', NOTICE)
      }

      expect(screen.getByText(NOTICE)).toBeInTheDocument()

      count.add(1)
    }
  )

  it('no parameter shows a "Required for deployment" checkbox, in raw mode or not', () => {
    const plugin = usePluginStore.getState().plugin
    const params: PluginParameter[] = (['file', 'animation'] as const).map((type) => ({
      ...createEmptyParameter(),
      name: `${type}Param`,
      text: `${type} label`,
      type,
      dir: 'img/pictures',
      require: true
    }))
    usePluginStore.getState().setPlugin({ ...plugin, parameters: params })
    for (const isRaw of [true, false]) {
      useUIStore.getState().setRawModeForPlugin(plugin.id, isRaw)
      const { unmount } = render(<ParameterBuilder />)
      for (const p of params) {
        fireEvent.click(screen.getByText(p.text))

        expect(screen.getAllByText('Directory (relative to project)').length).toBeGreaterThan(0)
        expect(screen.queryByText(/Required for deployment/)).not.toBeInTheDocument()
      }
      unmount()
    }
    count.add(1)
  })
})

const JA_ONLY = 'Fixture_JaOnly.js'
const HEADER_NOTICE =
  'This file has no main annotation block (/*: or /*:en), so raw mode cannot save changes to its header and it is read-only here. Turn raw mode off in the preview to edit it.'

const HEADER_EDITORS = {
  Meta: MetaEditor,
  Parameters: ParameterBuilder,
  Commands: CommandBuilder,
  Structs: StructBuilder
}

function openJaOnly(): void {
  resetStores()
  vi.stubGlobal('api', createFakeApi())
  usePluginStore.getState().openPlugin({ ...loadFixture(JA_ONLY), importedFrom: JA_ONLY })
  usePluginStore.getState().addStruct(createEmptyStruct())
}

// Whether each header editor shows the header notice.
function headerNoticeShown(): Record<string, boolean> {
  return Object.fromEntries(
    Object.entries(HEADER_EDITORS).map(([name, Editor]) => {
      const { unmount } = render(<Editor />)
      const isShown = screen.queryByText(HEADER_NOTICE) !== null
      unmount()
      return [name, isShown]
    })
  )
}

// The title of the fieldset nearest around a control on the page: the read-only hint it shows.
function lockOf(control: HTMLElement): string | undefined {
  const around = screen
    .getAllByRole('group', { hidden: true })
    .filter((group) => group.tagName === 'FIELDSET' && group.contains(control))
  return around.at(-1)?.getAttribute('title') ?? undefined
}

// A control of a header editor and the read-only hint around it.
interface HeaderControl {
  control: HTMLElement
  lock: string | undefined
}

// The controls `collect` finds in `editor`, each with its hint read while it is on the page.
function controlsIn(editor: ReactElement, collect: () => HTMLElement[]): HeaderControl[] {
  const { unmount } = render(editor)
  const controls = collect().map((control) => ({ control, lock: lockOf(control) }))
  unmount()
  return controls
}

// One editing control of each kind the header editors render.
function headerControls(): HeaderControl[] {
  const { parameters, commands, structs } = usePluginStore.getState().plugin
  const parameter = first(parameters)
  const firstCommand = first(commands)
  return [
    ...controlsIn(<MetaEditor />, () => [
      ...['Plugin Name', 'Version', 'Author', 'URL', 'Description', 'Help Text', 'Target'].map(
        (label) => screen.getByLabelText(label)
      ),
      screen.getByRole('button', { name: /Auto-generate/ })
    ]),
    ...controlsIn(<ParameterBuilder />, () => {
      const add = screen.getByRole('button', { name: /Add Parameter/ })
      fireEvent.click(screen.getByText(parameter.text || parameter.name))
      return [add, screen.getByDisplayValue(parameter.name)]
    }),
    ...controlsIn(<CommandBuilder />, () => {
      const add = screen.getByRole('button', { name: /Add Command/ })
      fireEvent.click(screen.getByText(firstCommand.text || firstCommand.name))
      return [
        add,
        screen.getByDisplayValue(firstCommand.name),
        screen.getByRole('button', { name: /Add Argument/ })
      ]
    }),
    ...controlsIn(<StructBuilder />, () => {
      const add = screen.getByRole('button', { name: /Add Struct/ })
      fireEvent.click(screen.getByText(first(structs).name))
      return [add, screen.getByDisplayValue(first(structs).name)]
    })
  ]
}

// A parameter, argument or struct field of `type` named `name`.
function typed(type: PluginParameter['type'], name: string): PluginParameter {
  const field = { ...createEmptyParameter(), name, type }
  return type === 'array' ? { ...field, arrayType: 'struct' } : field
}

// The nearest element of `role` before (`DOCUMENT_POSITION_PRECEDING`) or after
// (`DOCUMENT_POSITION_FOLLOWING`) an element on the page, outside of it.
function nearest(anchor: HTMLElement, role: string, position: number): HTMLElement {
  const found = screen
    .getAllByRole(role)
    .filter((element) => anchor.compareDocumentPosition(element) === position)
  const element = found.at(position === Node.DOCUMENT_POSITION_PRECEDING ? -1 : 0)
  if (element === undefined) throw new Error(`no ${role} next to the element`)
  return element
}

// The draggable card of the parameter shown as `label`.
function cardOf(label: string): HTMLElement {
  return screen.getByText(
    (_content, element) =>
      element instanceof HTMLElement &&
      element.getAttribute('draggable') === 'true' &&
      within(element).queryByText(label) !== null
  )
}

describe('header editors of an imported file with no main annotation block: read-only controls', () => {
  beforeEach(openJaOnly)

  afterEach(tearDown)

  it('meta, Parameters, Commands and Structs are read-only in raw mode and say why', () => {
    expect(headerNoticeShown()).toStrictEqual({
      Meta: true,
      Parameters: true,
      Commands: true,
      Structs: true
    })

    const controls = headerControls()
    for (const { control } of controls) {
      expect(control).toBeDisabled()
    }

    expect(controls.map(({ lock }) => lock)).toStrictEqual(controls.map(() => HEADER_NOTICE))

    process.stdout.write(`header controls checked ${String(controls.length)}\n`)
  })

  it('the type fields of an argument and a struct field are read-only in raw mode and say why', async () => {
    expect.hasAssertions()

    const pluginId = usePluginStore.getState().plugin.id
    const fields = [typed('combo', 'pick'), typed('struct', 'shape'), typed('array', 'list')]
    usePluginStore.getState().addCommand({ ...createEmptyCommand(), name: 'Typed', args: fields })
    usePluginStore
      .getState()
      .addStruct({ ...createEmptyStruct(), name: 'Shape', parameters: fields })
    useUIStore.getState().setRawModeForPlugin(pluginId, false)
    const user = userEvent.setup()
    const locks: [string, (string | undefined)[]][] = []
    for (const [label, Editor, opener] of [
      ['Commands', CommandBuilder, 'New Command'],
      ['Structs', StructBuilder, 'Shape']
    ] as const) {
      const { unmount } = render(<Editor />)
      await user.click(screen.getByText(opener))
      for (const field of fields) {
        // The first button of a row, right before its name, shows its details
        const name = screen.getByDisplayValue(field.name)
        await user.click(nearest(name, 'button', Node.DOCUMENT_POSITION_PRECEDING))
      }
      act(() => {
        useUIStore.getState().setRawModeForPlugin(pluginId, true)
      })
      const elementType = screen.getByText('Array Element Type')
      const controls = [
        screen.getByPlaceholderText(/^option1\|Option 1/),
        nearest(elementType, 'combobox', Node.DOCUMENT_POSITION_FOLLOWING),
        ...screen.getAllByRole('combobox').filter((c) => c.textContent === 'Select struct...')
      ]
      for (const control of controls) {
        expect(control).toBeDisabled()
      }
      locks.push([label, controls.map((control) => lockOf(control))])
      act(() => {
        useUIStore.getState().setRawModeForPlugin(pluginId, false)
      })
      unmount()
    }
    const four = Array.from({ length: 4 }, () => HEADER_NOTICE)

    expect(locks).toStrictEqual([
      ['Commands', four],
      ['Structs', four]
    ])
  })

  it('the header editors are editable with raw mode off', () => {
    useUIStore.getState().setRawModeForPlugin(usePluginStore.getState().plugin.id, false)
    for (const { control } of headerControls()) {
      expect(control).toBeEnabled()
    }

    expect(headerNoticeShown()).toStrictEqual({
      Meta: false,
      Parameters: false,
      Commands: false,
      Structs: false
    })
  })
})

describe('header editors of an imported file with no main annotation block: parameters', () => {
  beforeEach(openJaOnly)

  afterEach(tearDown)

  it('parameters can still be selected, exported and saved as a preset in raw mode', () => {
    const kept = { ...createEmptyParameter(), name: 'Kept' }
    useSettingsStore.setState({ parameterPresets: { Mine: [kept] } })
    render(<ParameterBuilder />)

    expect(screen.getByRole('button', { name: /Add Parameter/ })).toBeDisabled()

    const selectAll = screen.getByRole('button', { name: /Select All/ })

    expect(selectAll).toBeEnabled()

    fireEvent.click(selectAll)

    // Each toolbar button is the only one of its name on the page
    expect(screen.getByRole('button', { name: 'Export' })).toBeEnabled()

    for (const name of ['Duplicate', 'Delete', /Import/]) {
      expect(screen.getByRole('button', { name })).toBeDisabled()
    }

    fireEvent.keyDown(screen.getByRole('button', { name: /Presets/ }), { key: 'Enter' })
    const save = screen.getByRole('menuitem', { name: /Save Selection as Preset/ })
    const mine = screen.getByRole('menuitem', { name: /Mine/ })

    expect({
      save: save.hasAttribute('aria-disabled'),
      mine: mine.getAttribute('aria-disabled')
    }).toStrictEqual({ save: false, mine: 'true' })
  })

  it('a single parameter can be ticked and exported in raw mode while its row stays locked', async () => {
    expect.hasAssertions()

    const api = createFakeApi({
      dialog: {
        saveFile: vi
          .fn<Window['api']['dialog']['saveFile']>()
          .mockResolvedValue('/exports/Alpha-params.mzparams')
      }
    })
    vi.stubGlobal('api', api)
    const user = userEvent.setup()
    render(<ParameterBuilder />)
    const message = cardOf('メッセージ')

    // The delete button has no name; it is the only button in the row header
    expect(within(message).getByRole('button')).toBeDisabled()

    await user.click(within(message).getByRole('checkbox'))

    expect(within(message).getByRole('checkbox')).toBeChecked()

    await user.click(screen.getByRole('button', { name: 'Export' }))
    // One file is written, holding only the ticked parameter
    await waitFor(() => {
      expect(
        vi
          .mocked(api.plugin.saveToPath)
          .mock.calls.map(([, content]): unknown => JSON.parse(content))
      ).toMatchObject([{ parameters: [{ name: 'Message' }] }])
    })
  })

  it('a parameter cannot be dragged to a new place in raw mode', () => {
    render(<ParameterBuilder />)
    const parameter = first(usePluginStore.getState().plugin.parameters)
    const card = cardOf(parameter.text || parameter.name)
    const dataTransfer = {
      setData: vi.fn<DataTransfer['setData']>(),
      setDragImage: vi.fn<DataTransfer['setDragImage']>()
    }

    expect(fireEvent.dragStart(card, { dataTransfer })).toBe(false)
    expect(dataTransfer.setData).not.toHaveBeenCalled()
  })
})
