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

beforeEach(resetStores)

/** The generated plugin code the preview shows. */
const preview = (): string => (screen.getByTestId('monaco-editor') as HTMLTextAreaElement).value

/** The block the plugin code holds for the struct named `name`. */
function structBlock(name: string): string {
  const code = preview()
  const start = code.indexOf(`/*~struct~${name}:`)
  return start === -1 ? '' : code.slice(start, code.indexOf(' */', start))
}

/** The row of the field whose name field holds `name`; its buttons have no names. */
const fieldRow = (name: string): HTMLElement =>
  screen.getByDisplayValue(name).closest<HTMLElement>('.rounded')!

/** The select showing `text`; a select's label names no target, so it has no accessible name. */
const combobox = (text: string): HTMLElement =>
  screen.getAllByRole('combobox').find((c) => c.textContent === text)!

function renderTab(structs: PluginStruct[] = []): UserEvent {
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

describe('struct blocks', () => {
  it('writes a new struct and its field into a block of its own', async () => {
    const user = renderTab()

    expect(screen.getByText('No structs defined')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Add Struct' }))

    expect(screen.queryByText('No structs defined')).not.toBeInTheDocument()

    await retype(user, screen.getByPlaceholderText('StructName'), 'Point')
    await waitFor(() => expect(preview()).toContain('/*~struct~Point:'))

    await user.click(screen.getByRole('button', { name: 'Add Field' }))
    await retype(user, screen.getByPlaceholderText('fieldName'), 'x')
    await waitFor(() => expect(structBlock('Point')).toContain(' * @param x\n'))
  })

  it('names each added struct apart from the structs already there', async () => {
    expect.hasAssertions()

    const view = renderTab([{ ...createEmptyStruct(), name: 'NewStruct' }])

    await view.click(screen.getByRole('button', { name: 'Add Struct' }))
    await view.click(screen.getByRole('button', { name: 'Add Struct' }))

    expect(usePluginStore.getState().plugin.structs.map((s) => s.name)).toStrictEqual([
      'NewStruct',
      'NewStruct2',
      'NewStruct3'
    ])
  })

  it('writes the options of a select field', async () => {
    const user = renderTab([
      { ...createEmptyStruct(), name: 'Point', parameters: [createEmptyParameter()] }
    ])
    await user.click(screen.getByText('Point'))
    await pick(user, 'String', 'Select')
    // The first button of a field row shows its details
    await user.click(fieldRow('NewParameter').querySelector('button')!)
    await user.click(screen.getByPlaceholderText(/^option1\|Option 1/))
    await user.paste('a|Alpha\nb')
    await waitFor(() => {
      const block = structBlock('Point')

      expect(block).toContain(' * @type select\n')
      expect(block).toContain(' * @option Alpha\n * @value a\n')
      expect(block).toContain(' * @option b\n')
    })
  })

  it('keeps a "|" and an Enter typed at the end of the options of a select field', async () => {
    const user = renderTab([
      { ...createEmptyStruct(), name: 'Point', parameters: [createEmptyParameter()] }
    ])
    await user.click(screen.getByText('Point'))
    await pick(user, 'String', 'Select')
    // The first button of a field row shows its details
    await user.click(fieldRow('NewParameter').querySelector('button')!)
    const options = screen.getByPlaceholderText(/^option1\|Option 1/)
    await user.type(options, 'a|Alpha{Enter}b')

    expect(options).toHaveValue('a|Alpha\nb')

    await waitFor(() => {
      const block = structBlock('Point')

      expect(block).toContain(' * @option Alpha\n * @value a\n')
      expect(block).toContain(' * @option b\n')
    })
  })

  it('keeps every "|" after the first in the label of a select option', async () => {
    const user = renderTab([
      { ...createEmptyStruct(), name: 'Point', parameters: [createEmptyParameter()] }
    ])
    await user.click(screen.getByText('Point'))
    await pick(user, 'String', 'Select')
    // The first button of a field row shows its details
    await user.click(fieldRow('NewParameter').querySelector('button')!)
    const options = screen.getByPlaceholderText(/^option1\|Option 1/)
    await user.type(options, 'a|b|c')

    expect(options).toHaveValue('a|b|c')
    expect(usePluginStore.getState().plugin.structs[0].parameters[0].options).toEqual([
      { value: 'a', text: 'b|c' }
    ])

    await waitFor(() => expect(structBlock('Point')).toContain(' * @option b|c\n * @value a\n'))
  })

  it('keeps a loaded select option whose value holds a "|" when the options are typed in', async () => {
    const user = renderTab([
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
    await user.click(fieldRow('NewParameter').querySelector('button')!)
    await user.type(screen.getByPlaceholderText(/^option1\|Option 1/), 'x')

    expect(usePluginStore.getState().plugin.structs[0].parameters[0].options).toEqual([
      { value: 'a|b', text: 'Label' },
      { value: 'cx', text: 'cx' }
    ])
  })

  it('writes a field holding another struct as that struct type', async () => {
    const user = renderTab([
      { ...createEmptyStruct(), name: 'Point' },
      { ...createEmptyStruct(), name: 'Area', parameters: [createEmptyParameter()] }
    ])
    await user.click(screen.getByText('Area'))
    await pick(user, 'String', 'Struct')
    await user.click(fieldRow('NewParameter').querySelector('button')!)
    await pick(user, 'Select struct...', 'Point')
    await waitFor(() => expect(structBlock('Area')).toContain(' * @type struct<Point>\n'))
  })

  it('writes the options of a combo field', async () => {
    const user = renderTab([
      { ...createEmptyStruct(), name: 'Point', parameters: [createEmptyParameter()] }
    ])
    await user.click(screen.getByText('Point'))
    await pick(user, 'String', 'Combo')
    // The first button of a field row shows its details
    await user.click(fieldRow('NewParameter').querySelector('button')!)
    await user.type(screen.getByPlaceholderText(/^option1\|Option 1/), 'a|Alpha')
    await waitFor(() => {
      const block = structBlock('Point')

      expect(block).toContain(' * @type combo\n')
      expect(block).toContain(' * @option Alpha\n * @value a\n')
    })
  })

  it('writes an array field as an array of the element type it picks', async () => {
    const user = renderTab([
      { ...createEmptyStruct(), name: 'Point', parameters: [createEmptyParameter()] }
    ])
    await user.click(screen.getByText('Point'))
    await pick(user, 'String', 'Array')
    await user.click(fieldRow('NewParameter').querySelector('button')!)
    await pick(user, 'String', 'Number')
    await waitFor(() => expect(structBlock('Point')).toContain(' * @type number[]\n'))
  })
})
