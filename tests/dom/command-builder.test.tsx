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

// The generated plugin code the preview shows
const preview = (): string => {
  const editor = screen.getByTestId('monaco-editor')
  if (!(editor instanceof HTMLTextAreaElement)) throw new TypeError('the preview is no text area')
  return editor.value
}

// Waits until the preview holds every line given
const previewHolds = async (...lines: string[]): Promise<void> => {
  await waitFor(() => {
    expect(lines.filter((line) => !preview().includes(line))).toStrictEqual([])
  })
}

// Waits until the preview no longer holds the text
const previewDrops = async (text: string): Promise<void> => {
  await waitFor(() => {
    expect(preview()).not.toContain(text)
  })
}

// The buttons of a command card's header and of an argument row have no names. With one command
// open, the buttons without a name are, in screen order, the command's delete button, then each
// argument row's details and delete buttons.
const COMMAND_DELETE = 0
const ARGUMENT_DETAILS = 1
const ARGUMENT_DELETE = 2
const namelessButton = (position: number): HTMLElement => {
  const button = screen.getAllByRole('button', { name: '' }).at(position)
  if (button === undefined) throw new Error(`no button without a name at ${String(position)}`)
  return button
}

// The select showing `text`; a select's label names no target, so it has no accessible name
const combobox = (text: string): HTMLElement => {
  const select = screen.getAllByRole('combobox').find((c) => c.textContent === text)
  if (select === undefined) throw new Error(`no select shows ${text}`)
  return select
}

function openCommandTab(structs: PluginStruct[] = []): UserEvent {
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

// Adds a command with an argument named `mode` of the type `type`, and shows its details
async function addArgument(user: UserEvent, type: string): Promise<void> {
  await user.click(screen.getByRole('button', { name: 'Add Command' }))
  await user.click(screen.getByRole('button', { name: 'Add Argument' }))
  await retype(user, screen.getByPlaceholderText('argName'), 'mode')
  await pick(user, 'String', type)
  await user.click(namelessButton(ARGUMENT_DETAILS))
}

describe('command skeleton', () => {
  beforeEach(resetStores)

  it.each(["Show$'", 'Show$`', 'Show$&', "It's", 'A\\B'])(
    'renaming a command to %s changes only its skeleton in the plugin code',
    (name) => {
      const command = { ...createEmptyCommand(), name: 'Show' }
      const rest = '\n\nfunction tick() { return 1; }\n'
      usePluginStore.getState().openPlugin({
        ...createEmptyPlugin(),
        commands: [command],
        customCode: generateCommandSkeleton(command) + rest
      })
      render(<CommandBuilder />)
      fireEvent.click(screen.getByText(command.text))
      fireEvent.change(screen.getByDisplayValue('Show'), { target: { value: name } })

      expect(usePluginStore.getState().plugin.customCode).toBe(
        generateCommandSkeleton({ ...command, name }) + rest
      )
    }
  )
})

describe('command annotations', () => {
  beforeEach(resetStores)

  it('writes a new command and its number argument, and drops them when deleted', async () => {
    expect.hasAssertions()

    const user = openCommandTab()

    expect(screen.getByText('No commands defined')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Add Command' }))

    expect(screen.queryByText('No commands defined')).not.toBeInTheDocument()

    await retype(user, screen.getByPlaceholderText('myCommand'), 'showBanner')
    await previewHolds(' * @command showBanner\n')

    await user.click(screen.getByRole('button', { name: 'Add Argument' }))
    await retype(user, screen.getByPlaceholderText('argName'), 'count')
    await previewHolds(' * @arg count\n')

    await user.click(screen.getByRole('combobox'))
    await user.click(await screen.findByRole('option', { name: 'Number' }))
    await user.click(namelessButton(ARGUMENT_DETAILS))
    await user.type(screen.getByPlaceholderText('No min'), '1')
    await previewHolds(' * @type number\n', ' * @min 1\n')

    await user.click(namelessButton(ARGUMENT_DELETE))
    await previewDrops('@arg count')

    expect(preview()).toContain(' * @command showBanner\n')

    await user.click(namelessButton(COMMAND_DELETE))
    await previewDrops('@command showBanner')

    expect(screen.getByText('No commands defined')).toBeInTheDocument()
  })

  it('writes the typed options of a select argument with their values', async () => {
    expect.hasAssertions()

    const user = openCommandTab()
    await addArgument(user, 'Select')
    await user.type(screen.getByPlaceholderText(/^option1\|Option 1/), 'a|A')
    await previewHolds(' * @type select\n', ' * @option A\n * @value a\n')
  })

  it('writes the typed options of a combo argument with their values', async () => {
    expect.hasAssertions()

    const user = openCommandTab()
    await addArgument(user, 'Combo')
    await user.type(screen.getByPlaceholderText(/^option1\|Option 1/), 'a|A')
    await previewHolds(' * @type combo\n', ' * @option A\n * @value a\n')
  })

  it.each([
    ['Hidden', 'hidden'],
    ['Map', 'map'],
    ['Location', 'location'],
    ['Icon', 'icon']
  ])('writes an argument of type %s as @type %s', async (label, type) => {
    expect.hasAssertions()

    const user = openCommandTab()
    await addArgument(user, label)
    await previewHolds(` * @arg mode\n * @text New Parameter\n * @type ${type}\n`)
  })

  it('writes a struct argument as the struct type it picks', async () => {
    expect.hasAssertions()

    const user = openCommandTab([{ ...createEmptyStruct(), name: 'Point' }])
    await addArgument(user, 'Struct')
    await pick(user, 'Select struct...', 'Point')
    await previewHolds(' * @type struct<Point>\n')
  })

  it('writes an array argument as an array of the element type it picks', async () => {
    expect.hasAssertions()

    const user = openCommandTab()
    await addArgument(user, 'Array')
    await pick(user, 'String', 'Number')
    await previewHolds(' * @type number[]\n')
  })

  it('writes an array argument of structs as an array of the struct type it picks', async () => {
    expect.hasAssertions()

    const user = openCommandTab([{ ...createEmptyStruct(), name: 'Point' }])
    await addArgument(user, 'Array')
    await pick(user, 'String', 'Struct')
    await pick(user, 'Select struct...', 'Point')
    await previewHolds(' * @type struct<Point>[]\n')
  })
})
