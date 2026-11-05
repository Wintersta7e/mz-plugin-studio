// Plugin editor controls a keyboard user can reach and operate: a parameter card moves up and
// down with Alt+ArrowUp and Alt+ArrowDown from its move control, as dragging it does; the Save
// Preset dialog takes focus in its name field and gives it back to the Presets menu button.
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent, { type UserEvent } from '@testing-library/user-event'
import { ParameterBuilder } from '../../src/renderer/src/components/plugin/ParameterBuilder'
import { usePluginStore, useSettingsStore } from '../../src/renderer/src/stores'
import {
  createEmptyParameter,
  createEmptyPlugin,
  type PluginDefinition
} from '../../src/renderer/src/types/plugin'
import { resetStores } from './support/reset-stores'

// Opens a plugin with parameters `a` and `b` (plus `fields`) and renders the parameters tab
function openParameterTab(fields: Partial<PluginDefinition> = {}): UserEvent {
  usePluginStore.getState().openPlugin({
    ...createEmptyPlugin(),
    parameters: [
      { ...createEmptyParameter(), name: 'a', text: '' },
      { ...createEmptyParameter(), name: 'b', text: '' }
    ],
    ...fields
  })
  render(<ParameterBuilder />)
  return userEvent.setup()
}

function order(): string[] {
  return usePluginStore.getState().plugin.parameters.map((p) => p.name)
}

describe('parameter move control', () => {
  beforeEach(resetStores)

  it('moves a parameter down and up with Alt and the arrow keys, keeping focus', async () => {
    expect.hasAssertions()

    const user = openParameterTab()
    screen.getByRole('button', { name: 'Move a' }).focus()

    await user.keyboard('{Alt>}{ArrowDown}{/Alt}')

    expect(order()).toStrictEqual(['b', 'a'])
    expect(screen.getByRole('button', { name: 'Move a' })).toHaveFocus()

    await user.keyboard('{Alt>}{ArrowUp}{/Alt}')

    expect(order()).toStrictEqual(['a', 'b'])
    expect(screen.getByRole('button', { name: 'Move a' })).toHaveFocus()
  })

  it('leaves the order alone past either end and on an arrow key without Alt', async () => {
    expect.hasAssertions()

    const user = openParameterTab()
    screen.getByRole('button', { name: 'Move a' }).focus()
    await user.keyboard('{Alt>}{ArrowUp}{/Alt}')
    await user.keyboard('{ArrowDown}')

    expect(order()).toStrictEqual(['a', 'b'])

    screen.getByRole('button', { name: 'Move b' }).focus()
    await user.keyboard('{Alt>}{ArrowDown}{/Alt}')

    expect(order()).toStrictEqual(['a', 'b'])
  })

  it('does not move a parameter of a read-only header', async () => {
    expect.hasAssertions()

    const user = openParameterTab({
      importedFrom: 'NoHeader.js',
      rawSource: '// a file with no annotation block\n'
    })
    screen.getByRole('button', { name: 'Move a' }).focus()
    await user.keyboard('{Alt>}{ArrowDown}{/Alt}')

    expect(order()).toStrictEqual(['a', 'b'])
  })

  it('still opens the card on a mouse click on the move control', async () => {
    expect.hasAssertions()

    const user = openParameterTab()
    await user.click(screen.getByRole('button', { name: 'Move a' }))

    expect(screen.getByRole('button', { name: 'a', expanded: true })).toBeInTheDocument()
  })

  it('lists the parameter cards', () => {
    expect.hasAssertions()

    openParameterTab()

    expect(screen.getAllByRole('listitem')).toHaveLength(2)
  })
})

// Selects every parameter, then opens Save Preset from the Presets menu with the keyboard
async function openSavePreset(user: UserEvent): Promise<void> {
  await user.click(screen.getByRole('button', { name: 'Select All' }))
  screen.getByRole('button', { name: 'Presets' }).focus()
  await user.keyboard('{Enter}')
  await screen.findByRole('menuitem', { name: 'Save Selection as Preset...' })
  await user.keyboard('{Enter}')
}

describe('save preset dialog focus', () => {
  beforeEach(resetStores)

  it('puts focus in the name field when it opens', async () => {
    expect.hasAssertions()

    const user = openParameterTab()
    await openSavePreset(user)

    await waitFor(() => {
      expect(screen.getByLabelText('Preset Name')).toHaveFocus()
    })
  })

  it('gives focus back to the Presets button when Escape closes it', async () => {
    expect.hasAssertions()

    const user = openParameterTab()
    await openSavePreset(user)
    await screen.findByLabelText('Preset Name')
    await user.keyboard('{Escape}')

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    expect(screen.getByRole('button', { name: 'Presets' })).toHaveFocus()
  })

  it('saves the preset on Enter in the name field', async () => {
    expect.hasAssertions()

    const user = openParameterTab()
    await openSavePreset(user)
    await user.type(await screen.findByLabelText('Preset Name'), 'Mine{Enter}')

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    const presets = useSettingsStore.getState().parameterPresets

    expect(Object.keys(presets)).toStrictEqual(['Mine'])
    expect(
      Object.values(presets)
        .flat()
        .map((p) => p.name)
    ).toStrictEqual(['a', 'b'])
  })
})
