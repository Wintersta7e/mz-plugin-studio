// Plugin editor controls a keyboard user can reach and operate: a parameter card moves up and
// down with Alt+ArrowUp and Alt+ArrowDown from its move control, as dragging it does.
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent, { type UserEvent } from '@testing-library/user-event'
import { ParameterBuilder } from '../../src/renderer/src/components/plugin/ParameterBuilder'
import { usePluginStore } from '../../src/renderer/src/stores'
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
