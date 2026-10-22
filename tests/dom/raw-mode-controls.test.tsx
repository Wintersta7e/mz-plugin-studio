// Every editing control of an imported plugin in raw mode: each field either changes what is
// saved (the plugin file or one of the export formats), or its control is read-only and says
// why, or no control edits it. A field added to a type fails the typecheck here until listed.
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { CodeEditor } from '../../src/renderer/src/components/plugin/CodeEditor'
import { MetaEditor } from '../../src/renderer/src/components/plugin/MetaEditor'
import { ParameterBuilder } from '../../src/renderer/src/components/plugin/ParameterBuilder'
import { TemplateInserter } from '../../src/renderer/src/components/plugin/TemplateInserter'
import {
  generatePluginsJsonEntry,
  generateReadme,
  generateTypeDeclaration
} from '../../src/renderer/src/lib/exportFormats'
import { generatePluginOutput } from '../../src/renderer/src/lib/plugin-output'
import { usePluginStore, useUIStore } from '../../src/renderer/src/stores'
import { createEmptyParameter, toBaseline } from '../../src/shared/types/plugin'
import type {
  PluginCommand,
  PluginDefinition,
  PluginMeta,
  PluginParameter,
  PluginStruct
} from '../../src/shared/types/plugin'
import { loadFixture } from '../golden/corpus/raw-mode'
import { createFakeApi } from '../helpers/fake-api'
import { resetStores } from './support/reset-stores'

const FILE = 'Fixture_HandWritten.js'
const NOTICE =
  "Raw mode keeps this plugin's own code and language blocks, so this is read-only here. Turn raw mode off in the preview to edit it."

/** A field edit, the read-only control that shows it, or no control at all. */
type Edit<T> =
  | { kind: 'output'; base?: Partial<T>; change: Partial<T> }
  | { kind: 'read-only'; control: ReadOnlyControl }
  | { kind: 'own table' }
  | { kind: 'no control' }

type ReadOnlyControl = 'code tab' | 'localized fields'

function outputOf<T>(): (change: Partial<T>, base?: Partial<T>) => Edit<T> {
  return (change, base) => ({ kind: 'output', change, base })
}
const meta = outputOf<PluginMeta>()
const param = outputOf<PluginParameter>()
const command = outputOf<PluginCommand>()
const struct = outputOf<PluginStruct>()

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

/** What is saved for a definition: the plugin file in raw mode and the three export formats. */
function saved(def: PluginDefinition, baseline: PluginDefinition): string[] {
  const out = generatePluginOutput(def, true, toBaseline(baseline))
  if (!out.ok) throw new Error(out.message)
  return [
    out.code,
    generateReadme(def),
    generateTypeDeclaration(def),
    generatePluginsJsonEntry(def)
  ]
}

/** Each position a table's item sits at in the definition, as an update of that item. */
type Place<T> = (def: PluginDefinition, update: (item: T) => T) => PluginDefinition

const PLACES = {
  meta: ((def, update) => ({ ...def, meta: update(def.meta) })) as Place<PluginMeta>,
  parameter: ((def, update) => ({
    ...def,
    parameters: [update(def.parameters[0]), ...def.parameters.slice(1)]
  })) as Place<PluginParameter>,
  command: ((def, update) => ({
    ...def,
    commands: [update(def.commands[0]), ...def.commands.slice(1)]
  })) as Place<PluginCommand>,
  arg: ((def, update) => ({
    ...def,
    commands: [
      { ...def.commands[0], args: [update(def.commands[0].args[0])] },
      ...def.commands.slice(1)
    ]
  })) as Place<PluginParameter>,
  struct: ((def, update) => ({
    ...def,
    structs: [update(def.structs[0]), ...def.structs.slice(1)]
  })) as Place<PluginStruct>,
  'struct field': ((def, update) => ({
    ...def,
    structs: [
      { ...def.structs[0], parameters: [update(def.structs[0].parameters[0])] },
      ...def.structs.slice(1)
    ]
  })) as Place<PluginParameter>
}

/** Fields whose output edit changes nothing that is saved. */
function unchangedOutputs<T>(table: Record<string, Edit<T>>, place: Place<T>): string[] {
  const def = original()
  const unchanged: string[] = []
  for (const [field, edit] of Object.entries(table)) {
    if (edit.kind !== 'output') continue
    const before = place(def, (item) => ({ ...item, ...edit.base }))
    const after = place(def, (item) => ({ ...item, ...edit.base, ...edit.change }))
    if (JSON.stringify(saved(before, def)) === JSON.stringify(saved(after, def))) {
      unchanged.push(field)
    }
  }
  return unchanged
}

let checked = 0

beforeEach(() => {
  resetStores()
  window.api = createFakeApi()
  usePluginStore.getState().openPlugin(original())
})

describe('raw mode controls of an imported plugin', () => {
  it('every field edit with a control changes what is saved', () => {
    const results = {
      meta: unchangedOutputs(META, PLACES.meta),
      parameter: unchangedOutputs(PARAMETER, PLACES.parameter),
      command: unchangedOutputs(COMMAND, PLACES.command),
      arg: unchangedOutputs(PARAMETER, PLACES.arg),
      struct: unchangedOutputs(STRUCT, PLACES.struct),
      'struct field': unchangedOutputs(PARAMETER, PLACES['struct field'])
    }
    expect(results).toEqual({
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
      checked += Object.values(table).filter((e) => e.kind === 'output').length * places
    }
  })

  it('the Code tab is read-only in raw mode and says why', () => {
    render(<CodeEditor />)
    expect(screen.getByTestId('monaco-editor')).toHaveAttribute('readonly')
    const insert = screen.getByRole('button', { name: /Insert Template/ })
    expect(insert).toBeDisabled()
    expect(insert).toHaveAttribute('title', NOTICE)
    expect(screen.getByText(NOTICE)).toBeInTheDocument()
    checked++
  })

  it('the Code tab is editable with raw mode off', () => {
    useUIStore.getState().setRawModeForPlugin(usePluginStore.getState().plugin.id, false)
    render(<CodeEditor />)
    expect(screen.getByTestId('monaco-editor')).not.toHaveAttribute('readonly')
    expect(screen.getByRole('button', { name: /Insert Template/ })).toBeEnabled()
    expect(screen.queryByText(NOTICE)).toBeNull()
  })

  it('the template dialog inserts nothing while read-only', () => {
    const onInsert = vi.fn()
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn() },
      configurable: true
    })
    render(<TemplateInserter open readOnly onClose={vi.fn()} onInsert={onInsert} />)
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
    checked++
  })

  for (const [lang, trigger] of [
    ['ja', 'Japanese'],
    ['zh', 'Chinese']
  ] as const) {
    it(`the ${trigger} description and help are read-only in raw mode`, () => {
      render(<MetaEditor />)
      fireEvent.mouseDown(screen.getByRole('tab', { name: trigger }), { button: 0 })
      for (const id of [`description-${lang}`, `help-${lang}`]) {
        const field = document.getElementById(id)
        expect(field, id).toHaveAttribute('readonly')
        expect(field, id).toHaveAttribute('title', NOTICE)
      }
      expect(screen.getByText(NOTICE)).toBeInTheDocument()
      checked++
    })
  }

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
    for (const raw of [true, false]) {
      useUIStore.getState().setRawModeForPlugin(plugin.id, raw)
      const { unmount } = render(<ParameterBuilder />)
      for (const p of params) {
        fireEvent.click(screen.getByText(p.text))
        expect(screen.getAllByText('Directory (relative to project)').length).toBeGreaterThan(0)
        expect(screen.queryByText(/Required for deployment/)).toBeNull()
      }
      unmount()
    }
    checked++
  })

  it('counts the controls it checked', () => {
    console.log(`controls checked ${checked}`)
    expect(checked).toBeGreaterThan(0)
  })
})
