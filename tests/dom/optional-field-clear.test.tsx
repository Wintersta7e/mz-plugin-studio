// Emptying an optional field's control removes its value from the store. Each control passes
// `undefined` for an emptied field because the store merges an update over the stored object, so
// an update that left the key out would keep the old value and the plugin code would still
// write it.
import { render, screen } from '@testing-library/react'
import userEvent, { type UserEvent } from '@testing-library/user-event'
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { CommandBuilder } from '../../src/renderer/src/components/plugin/CommandBuilder'
import { MetaEditor } from '../../src/renderer/src/components/plugin/MetaEditor'
import { ParameterBuilder } from '../../src/renderer/src/components/plugin/ParameterBuilder'
import { StructBuilder } from '../../src/renderer/src/components/plugin/StructBuilder'
import { usePluginStore } from '../../src/renderer/src/stores'
import {
  createEmptyCommand,
  createEmptyParameter,
  createEmptyPlugin,
  createEmptyStruct,
  type ParamType,
  type PluginDefinition,
  type PluginParameter
} from '../../src/renderer/src/types/plugin'
import { createFakeApi } from '../helpers/fake-api'
import { resetStores } from './support/reset-stores'

type Field = 'min' | 'max' | 'decimals' | 'onLabel' | 'offLabel' | 'dir' | 'data'
type Stored = Partial<Record<Field, unknown>>

interface Editor {
  // Renders the editor over a plugin holding one field of `type` and shows that field's controls.
  open: (user: UserEvent, type: ParamType) => Promise<void>
  // The field as the store holds it.
  stored: () => Stored | undefined
}

interface Row {
  // `clear`: the ten fields the store clears through an explicit `undefined`; `sameForm`: the
  // other controls written in the same form.
  kind: 'clear' | 'sameForm'
  label: string
  editor: Editor
  type: ParamType
  field: Field
  set: (user: UserEvent) => Promise<void>
  clear: (user: UserEvent) => Promise<void>
  value: unknown
}

const plugin = (): PluginDefinition => usePluginStore.getState().plugin

const param = (name: string, type: ParamType): PluginParameter => ({
  ...createEmptyParameter(),
  name,
  type
})

const openPlugin = (fields: Partial<PluginDefinition>): void => {
  usePluginStore.getState().openPlugin({ ...createEmptyPlugin(), ...fields })
}

// A row's expand button has no name; it is the control just before the row's name field.
const showRow = async (user: UserEvent, name: string): Promise<void> => {
  await user.click(screen.getByDisplayValue(name))
  await user.tab({ shift: true })
  await user.keyboard('{Enter}')
}

const PARAMETER: Editor = {
  open: async (user, type) => {
    // The card header shows the label, or the name when the label is empty.
    openPlugin({ parameters: [{ ...param('speed', type), text: '' }] })
    render(<ParameterBuilder />)
    await user.click(screen.getByText('speed'))
    await user.click(screen.getByRole('button', { name: 'Show details' }))
  },
  stored: () => plugin().parameters[0]
}

const COMMAND: Editor = {
  open: async (user, type) => {
    const command = { ...createEmptyCommand(), name: 'go', text: '', args: [param('count', type)] }
    openPlugin({ commands: [command] })
    render(<CommandBuilder />)
    await user.click(screen.getByText('go'))
    await showRow(user, 'count')
  },
  stored: () => plugin().commands[0]?.args[0]
}

const STRUCT: Editor = {
  open: async (user, type) => {
    openPlugin({
      structs: [{ ...createEmptyStruct(), name: 'Point', parameters: [param('x', type)] }]
    })
    render(<StructBuilder />)
    await user.click(screen.getByText('Point'))
    await showRow(user, 'x')
  },
  stored: () => plugin().structs[0]?.parameters[0]
}

const NOTE_PARAM: Editor = {
  open: async () => {
    const empty = createEmptyPlugin()
    openPlugin({ meta: { ...empty.meta, noteParams: [{ name: 'Picture', type: 'file' }] } })
    render(<MetaEditor />)
    await Promise.resolve()
  },
  stored: () => plugin().meta.noteParams?.[0]
}

// A text or number control found by its placeholder: typed into, then emptied.
const typed = (placeholder: string, text: string): Pick<Row, 'set' | 'clear'> => ({
  set: async (user) => {
    await user.type(screen.getByPlaceholderText(placeholder), text)
  },
  clear: async (user) => {
    await user.clear(screen.getByPlaceholderText(placeholder))
  }
})

// Opens the select showing `current` and picks `next`.
const pick = async (user: UserEvent, current: string, next: string): Promise<void> => {
  const select = screen.getAllByRole('combobox').find((c) => c.textContent === current)
  if (select === undefined) throw new Error(`no select showing ${current}`)
  await user.click(select)
  await user.click(await screen.findByRole('option', { name: next }))
}

// A select found by the option it shows: picked, then put back to None.
const picked = (option: string): Pick<Row, 'set' | 'clear'> => ({
  set: async (user) => {
    await pick(user, 'None', option)
  },
  clear: async (user) => {
    await pick(user, option, 'None')
  }
})

const NUMERIC: [string, Editor][] = [
  ['parameter', PARAMETER],
  ['command argument', COMMAND],
  ['struct field', STRUCT]
]

// The parameter's `require` has had no control since its checkbox was removed, so nine of the
// ten fields are rows here.
const CLEAR_ROWS: Row[] = NUMERIC.flatMap(([name, editor]): Row[] => [
  {
    kind: 'clear',
    label: `${name} min`,
    editor,
    type: 'number',
    field: 'min',
    ...typed('No min', '5'),
    value: 5
  },
  {
    kind: 'clear',
    label: `${name} max`,
    editor,
    type: 'number',
    field: 'max',
    ...typed('No max', '9'),
    value: 9
  },
  {
    kind: 'clear',
    label: `${name} decimals`,
    editor,
    type: 'number',
    field: 'decimals',
    ...typed('0', '2'),
    value: 2
  }
])

const SAME_FORM_ROWS: Row[] = [
  ...NUMERIC.slice(0, 2).flatMap(([name, editor]): Row[] => [
    {
      kind: 'sameForm',
      label: `${name} on label`,
      editor,
      type: 'boolean',
      field: 'onLabel',
      ...typed('ON', 'Yes'),
      value: 'Yes'
    },
    {
      kind: 'sameForm',
      label: `${name} off label`,
      editor,
      type: 'boolean',
      field: 'offLabel',
      ...typed('OFF', 'No'),
      value: 'No'
    }
  ]),
  {
    kind: 'sameForm',
    label: 'command argument directory',
    editor: COMMAND,
    type: 'file',
    field: 'dir',
    ...typed('img/pictures', 'img/faces'),
    value: 'img/faces'
  },
  {
    kind: 'sameForm',
    label: 'note parameter directory',
    editor: NOTE_PARAM,
    type: 'file',
    field: 'dir',
    ...typed('audio/bgm/', 'img/faces'),
    value: 'img/faces'
  },
  {
    kind: 'sameForm',
    label: 'note parameter database',
    editor: NOTE_PARAM,
    type: 'file',
    field: 'data',
    ...picked('actors'),
    value: 'actors'
  }
]

describe('clearing an optional field', () => {
  const passed = { clear: 0, sameForm: 0 }

  beforeEach(() => {
    resetStores()
    vi.stubGlobal('api', createFakeApi())
  })

  afterAll(() => {
    process.stdout.write(`optional-field clear rows: ${String(passed.clear)}\n`)
    process.stdout.write(`same-form clear rows: ${String(passed.sameForm)}\n`)
  })

  it.each([...CLEAR_ROWS, ...SAME_FORM_ROWS])(
    'removes the $label from the store',
    async ({ kind, editor, type, field, set, clear, value }) => {
      expect.assertions(3)

      const user = userEvent.setup()
      await editor.open(user, type)
      await set(user)

      expect(editor.stored()?.[field]).toStrictEqual(value)

      await clear(user)

      expect(editor.stored()).toBeDefined()
      expect(editor.stored()?.[field]).toBeUndefined()

      passed[kind] += 1
    }
  )
})
