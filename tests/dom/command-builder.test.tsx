// The command tab keeps each command's skeleton in the plugin code in step with the command's
// name, and writes each command and argument into the plugin code's annotations.
import { describe, it, expect, beforeEach } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent, { type UserEvent } from '@testing-library/user-event'
import { CommandBuilder } from '../../src/renderer/src/components/plugin/CommandBuilder'
import { CodePreview } from '../../src/renderer/src/components/preview/CodePreview'
import { generateCommandSkeleton } from '../../src/renderer/src/lib/generator'
import { usePluginStore } from '../../src/renderer/src/stores'
import {
  createEmptyCommand,
  createEmptyPlugin,
  createEmptyStruct,
  type PluginStruct
} from '../../src/renderer/src/types/plugin'
import { resetStores } from './support/reset-stores'

beforeEach(resetStores)

describe('command skeleton', () => {
  it.each(["Show$'", 'Show$`', 'Show$&', "It's", 'A\\B'])(
    'renaming a command to %s changes only its skeleton in the plugin code',
    (name) => {
      const cmd = { ...createEmptyCommand(), name: 'Show' }
      const rest = '\n\nfunction tick() { return 1; }\n'
      usePluginStore.getState().openPlugin({
        ...createEmptyPlugin(),
        commands: [cmd],
        customCode: generateCommandSkeleton(cmd) + rest
      })
      render(<CommandBuilder />)
      fireEvent.click(screen.getByText(cmd.text))
      fireEvent.change(screen.getByDisplayValue('Show'), { target: { value: name } })

      expect(usePluginStore.getState().plugin.customCode).toBe(
        generateCommandSkeleton({ ...cmd, name }) + rest
      )
    }
  )
})

describe('command annotations', () => {
  /** The generated plugin code the preview shows. */
  const preview = (): string => (screen.getByTestId('monaco-editor') as HTMLTextAreaElement).value

  /** The row of the argument whose name field holds `name`; its buttons have no names. */
  const argRow = (name: string): HTMLElement =>
    screen.getByDisplayValue(name).closest<HTMLElement>('.rounded')!

  /** The select showing `text`; a select's label names no target, so it has no accessible name. */
  const combobox = (text: string): HTMLElement =>
    screen.getAllByRole('combobox').find((c) => c.textContent === text)!

  function renderTab(structs: PluginStruct[] = []): UserEvent {
    usePluginStore.getState().openPlugin({ ...createEmptyPlugin(), structs })
    const user = userEvent.setup()
    render(
      <>
        <CommandBuilder />
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

  /** Adds a command with an argument named `mode` of the type `type`, and shows its details. */
  async function addArgument(user: UserEvent, type: string): Promise<void> {
    await user.click(screen.getByRole('button', { name: 'Add Command' }))
    await user.click(screen.getByRole('button', { name: 'Add Argument' }))
    await retype(user, screen.getByPlaceholderText('argName'), 'mode')
    await pick(user, 'String', type)
    // The first button of an argument row shows its details
    await user.click(argRow('mode').querySelector('button')!)
  }

  it('writes a new command and its number argument, and drops them when deleted', async () => {
    const user = renderTab()

    expect(screen.getByText('No commands defined')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Add Command' }))

    expect(screen.queryByText('No commands defined')).not.toBeInTheDocument()

    await retype(user, screen.getByPlaceholderText('myCommand'), 'showBanner')
    await waitFor(() => expect(preview()).toContain(' * @command showBanner\n'))

    await user.click(screen.getByRole('button', { name: 'Add Argument' }))
    await retype(user, screen.getByPlaceholderText('argName'), 'count')
    await waitFor(() => expect(preview()).toContain(' * @arg count\n'))

    await user.click(screen.getByRole('combobox'))
    await user.click(await screen.findByRole('option', { name: 'Number' }))
    // The first button of an argument row shows its details
    await user.click(argRow('count').querySelector('button')!)
    await user.type(screen.getByPlaceholderText('No min'), '1')
    await waitFor(() => {
      expect(preview()).toContain(' * @type number\n')
      expect(preview()).toContain(' * @min 1\n')
    })

    // The last button of an argument row deletes it
    const argButtons = argRow('count').querySelectorAll('button')
    await user.click(argButtons[argButtons.length - 1])
    await waitFor(() => expect(preview()).not.toContain('@arg count'))

    expect(preview()).toContain(' * @command showBanner\n')

    // In the command header, the delete button follows the button that opens the card
    const expand = screen.getByText('(0 args)').closest('button')!
    await user.click(expand.nextElementSibling!)
    await waitFor(() => expect(preview()).not.toContain('@command showBanner'))

    expect(screen.getByText('No commands defined')).toBeInTheDocument()
  })

  it('writes the typed options of a select argument with their values', async () => {
    const user = renderTab()
    await addArgument(user, 'Select')
    await user.type(screen.getByPlaceholderText(/^option1\|Option 1/), 'a|A')
    await waitFor(() => {
      expect(preview()).toContain(' * @type select\n')
      expect(preview()).toContain(' * @option A\n * @value a\n')
    })
  })

  it('writes the typed options of a combo argument with their values', async () => {
    const user = renderTab()
    await addArgument(user, 'Combo')
    await user.type(screen.getByPlaceholderText(/^option1\|Option 1/), 'a|A')
    await waitFor(() => {
      expect(preview()).toContain(' * @type combo\n')
      expect(preview()).toContain(' * @option A\n * @value a\n')
    })
  })

  it.each([
    ['Hidden', 'hidden'],
    ['Map', 'map'],
    ['Location', 'location'],
    ['Icon', 'icon']
  ])('writes an argument of type %s as @type %s', async (label, type) => {
    const user = renderTab()
    await addArgument(user, label)
    await waitFor(() =>
      expect(preview()).toContain(` * @arg mode\n * @text New Parameter\n * @type ${type}\n`)
    )
  })

  it('writes a struct argument as the struct type it picks', async () => {
    const user = renderTab([{ ...createEmptyStruct(), name: 'Point' }])
    await addArgument(user, 'Struct')
    await pick(user, 'Select struct...', 'Point')
    await waitFor(() => expect(preview()).toContain(' * @type struct<Point>\n'))
  })

  it('writes an array argument as an array of the element type it picks', async () => {
    const user = renderTab()
    await addArgument(user, 'Array')
    await pick(user, 'String', 'Number')
    await waitFor(() => expect(preview()).toContain(' * @type number[]\n'))
  })

  it('writes an array argument of structs as an array of the struct type it picks', async () => {
    const user = renderTab([{ ...createEmptyStruct(), name: 'Point' }])
    await addArgument(user, 'Array')
    await pick(user, 'String', 'Struct')
    await pick(user, 'Select struct...', 'Point')
    await waitFor(() => expect(preview()).toContain(' * @type struct<Point>[]\n'))
  })
})
