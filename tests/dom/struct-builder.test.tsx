// The struct tab writes each struct and its fields into the plugin code's struct blocks.
import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent, { type UserEvent } from '@testing-library/user-event'
import { StructBuilder } from '../../src/renderer/src/components/plugin/StructBuilder'
import { CodePreview } from '../../src/renderer/src/components/preview/CodePreview'
import { usePluginStore } from '../../src/renderer/src/stores'
import {
  createEmptyParameter,
  createEmptyPlugin,
  createEmptyStruct,
  type PluginStruct
} from '../../src/renderer/src/types/plugin'
import { resetStores } from './support/reset-stores'

/**
The generated plugin code the preview shows.
*/
const preview = (): string => screen.getByTestId<HTMLTextAreaElement>('monaco-editor').value

function first<T>(values: readonly T[]): T {
  const value = values.at(0)
  if (value === undefined) throw new Error('expected an item')
  return value
}

/**
The block the plugin code holds for the struct named `name`.
*/
function structBlock(name: string): string {
  const code = preview()
  const start = code.indexOf(`/*~struct~${name}:`)
  return start === -1 ? '' : code.slice(start, code.indexOf(' */', start))
}

// The button immediately before the field name expands its details.
async function expandField(user: UserEvent): Promise<void> {
  const name = screen.getByDisplayValue('NewParameter')
  const button = screen
    .getAllByRole('button')
    .findLast((item) => name.compareDocumentPosition(item) === Node.DOCUMENT_POSITION_PRECEDING)
  if (button === undefined) throw new Error('field expand button is missing')
  await user.click(button)
}

/**
The select showing `text`; a select's label names no target, so it has no accessible name.
*/
function combobox(text: string): HTMLElement {
  const found = screen.getAllByRole('combobox').find((item) => item.textContent === text)
  if (found === undefined) throw new Error(`missing combobox: ${text}`)
  return found
}

function firstStructParameter(): ReturnType<typeof createEmptyParameter> {
  const struct = first(usePluginStore.getState().plugin.structs)
  return first(struct.parameters)
}

function openTab(structs: PluginStruct[] = []): UserEvent {
  usePluginStore.getState().openPlugin({ ...createEmptyPlugin(), structs })
  const user = userEvent.setup()
  render(
    <>
      <StructBuilder />
      <CodePreview />
    </>
  )
  return user
}

async function retype(user: UserEvent, field: HTMLElement, text: string): Promise<void> {
  await user.clear(field)
  await user.type(field, text)
}

async function pick(user: UserEvent, current: string, option: string): Promise<void> {
  await user.click(combobox(current))
  await user.click(await screen.findByRole('option', { name: option }))
}

// Opens struct Point, gives its one field the type `fieldType` and expands the field's details.
async function openPointField(fieldType: string): Promise<UserEvent> {
  const user = openTab([
    { ...createEmptyStruct(), name: 'Point', parameters: [createEmptyParameter()] }
  ])
  await user.click(screen.getByText('Point'))
  await pick(user, 'String', fieldType)
  await expandField(user)
  return user
}

describe('struct blocks: creation', () => {
  beforeEach(resetStores)

  it('writes a new struct and its field into a block of its own', async () => {
    expect.hasAssertions()

    const user = openTab()

    expect(screen.getByText('No structs defined')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Add Struct' }))

    expect(screen.queryByText('No structs defined')).not.toBeInTheDocument()

    await retype(user, screen.getByPlaceholderText('StructName'), 'Point')
    await waitFor(() => {
      expect(preview()).toContain('/*~struct~Point:')
    })

    await user.click(screen.getByRole('button', { name: 'Add Field' }))
    await retype(user, screen.getByPlaceholderText('fieldName'), 'x')
    await waitFor(() => {
      expect(structBlock('Point')).toContain(' * @param x\n')
    })
  })

  it('names each added struct apart from the structs already there', async () => {
    expect.hasAssertions()

    const view = openTab([{ ...createEmptyStruct(), name: 'NewStruct' }])

    await view.click(screen.getByRole('button', { name: 'Add Struct' }))
    await view.click(screen.getByRole('button', { name: 'Add Struct' }))

    expect(usePluginStore.getState().plugin.structs.map((s) => s.name)).toStrictEqual([
      'NewStruct',
      'NewStruct2',
      'NewStruct3'
    ])
  })
})

describe('struct blocks: select options', () => {
  beforeEach(resetStores)

  it('writes the options of a select field', async () => {
    expect.hasAssertions()

    const user = await openPointField('Select')
    await user.click(screen.getByPlaceholderText(/^option1\|Option 1/))
    await user.paste('a|Alpha\nb')
    await waitFor(() => {
      const block = structBlock('Point')

      expect([
        block.includes(' * @type select\n'),
        block.includes(' * @option Alpha\n * @value a\n'),
        block.includes(' * @option b\n')
      ]).toStrictEqual([true, true, true])
    })
  })

  it('keeps a "|" and an Enter typed at the end of the options of a select field', async () => {
    expect.hasAssertions()

    const user = await openPointField('Select')
    const options = screen.getByPlaceholderText(/^option1\|Option 1/)
    await user.type(options, 'a|Alpha{Enter}b')

    expect(options).toHaveValue('a|Alpha\nb')

    await waitFor(() => {
      const block = structBlock('Point')

      expect([
        block.includes(' * @option Alpha\n * @value a\n'),
        block.includes(' * @option b\n')
      ]).toStrictEqual([true, true])
    })
  })
})

describe('struct blocks: select option values', () => {
  beforeEach(resetStores)

  it('keeps every "|" after the first in the label of a select option', async () => {
    expect.hasAssertions()

    const user = await openPointField('Select')
    const options = screen.getByPlaceholderText(/^option1\|Option 1/)
    await user.type(options, 'a|b|c')

    expect(options).toHaveValue('a|b|c')
    expect(firstStructParameter().options).toStrictEqual([{ value: 'a', text: 'b|c' }])

    await waitFor(() => {
      expect(structBlock('Point')).toContain(' * @option b|c\n * @value a\n')
    })
  })

  it('keeps a loaded select option whose value holds a "|" when the options are typed in', async () => {
    expect.hasAssertions()

    const user = openTab([
      {
        ...createEmptyStruct(),
        name: 'Point',
        parameters: [
          {
            ...createEmptyParameter(),
            type: 'select',
            options: [
              { value: 'a|b', text: 'Label' },
              { value: 'c', text: 'c' }
            ]
          }
        ]
      }
    ])
    await user.click(screen.getByText('Point'))
    // The first button of a field row shows its details
    await expandField(user)
    await user.type(screen.getByPlaceholderText(/^option1\|Option 1/), 'x')

    expect(firstStructParameter().options).toStrictEqual([
      { value: 'a|b', text: 'Label' },
      { value: 'cx', text: 'cx' }
    ])
  })
})

describe('struct blocks: field types', () => {
  beforeEach(resetStores)

  it('writes a field holding another struct as that struct type', async () => {
    expect.hasAssertions()

    const user = openTab([
      { ...createEmptyStruct(), name: 'Point' },
      { ...createEmptyStruct(), name: 'Area', parameters: [createEmptyParameter()] }
    ])
    await user.click(screen.getByText('Area'))
    await pick(user, 'String', 'Struct')
    await expandField(user)
    await pick(user, 'Select struct...', 'Point')
    await waitFor(() => {
      expect(structBlock('Area')).toContain(' * @type struct<Point>\n')
    })
  })

  it('writes the options of a combo field', async () => {
    expect.hasAssertions()

    const user = await openPointField('Combo')
    await user.type(screen.getByPlaceholderText(/^option1\|Option 1/), 'a|Alpha')
    await waitFor(() => {
      const block = structBlock('Point')

      expect([
        block.includes(' * @type combo\n'),
        block.includes(' * @option Alpha\n * @value a\n')
      ]).toStrictEqual([true, true])
    })
  })

  it('writes an array field as an array of the element type it picks', async () => {
    expect.hasAssertions()

    const user = await openPointField('Array')
    await pick(user, 'String', 'Number')
    await waitFor(() => {
      expect(structBlock('Point')).toContain(' * @type number[]\n')
    })
  })
})
