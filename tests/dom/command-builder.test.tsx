// The command tab keeps each command's skeleton in the plugin code in step with the command's
// name, and writes each command and argument into the plugin code's annotations.
import { describe, it, expect, beforeEach } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent, { type UserEvent } from '@testing-library/user-event'
import { CommandBuilder } from '../../src/renderer/src/components/plugin/CommandBuilder'
import { CodePreview } from '../../src/renderer/src/components/preview/CodePreview'
import { generateCommandSkeleton } from '../../src/renderer/src/lib/generator'
import { usePluginStore } from '../../src/renderer/src/stores'
import { createEmptyCommand, createEmptyPlugin } from '../../src/renderer/src/types/plugin'
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

  function renderTab(): UserEvent {
    usePluginStore.getState().openPlugin(createEmptyPlugin())
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

    // The command header holds one button, which deletes the command
    const header = screen.getByText('(0 args)').closest<HTMLElement>('.cursor-pointer')!
    await user.click(header.querySelector('button')!)
    await waitFor(() => expect(preview()).not.toContain('@command showBanner'))
    expect(screen.getByText('No commands defined')).toBeInTheDocument()
  })
})
