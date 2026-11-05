// Parameter, command and struct cards open and close from the keyboard: Tab reaches the card's
// expand control, Enter opens the card, Space closes it, and the control reports whether the
// card is open. A mouse click anywhere on the header row still toggles the card.
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent, { type UserEvent } from '@testing-library/user-event'
import type { ReactElement } from 'react'
import { CommandBuilder } from '../../src/renderer/src/components/plugin/CommandBuilder'
import { ParameterBuilder } from '../../src/renderer/src/components/plugin/ParameterBuilder'
import { StructBuilder } from '../../src/renderer/src/components/plugin/StructBuilder'
import { usePluginStore } from '../../src/renderer/src/stores'
import {
  createEmptyCommand,
  createEmptyParameter,
  createEmptyPlugin,
  createEmptyStruct
} from '../../src/renderer/src/types/plugin'
import { resetStores } from './support/reset-stores'

interface CardCase {
  kind: string
  // Opens a plugin holding one item of the kind and renders its tab
  setup: () => ReactElement
  // The card's name, which names its expand control
  name: string
  // The value of a field that only the open card shows
  field: string
  // Text on the header row outside the card's name
  rowText: string
}

const cases: CardCase[] = [
  {
    kind: 'parameter',
    setup: () => {
      const parameter = { ...createEmptyParameter(), name: 'moveSpeed', text: 'Move Speed' }
      usePluginStore.getState().openPlugin({ ...createEmptyPlugin(), parameters: [parameter] })
      return <ParameterBuilder />
    },
    name: 'Move Speed',
    field: 'moveSpeed',
    rowText: '(string)'
  },
  {
    kind: 'command',
    setup: () => {
      const command = { ...createEmptyCommand(), name: 'showBanner', text: 'Show Banner' }
      usePluginStore.getState().openPlugin({ ...createEmptyPlugin(), commands: [command] })
      return <CommandBuilder />
    },
    name: 'Show Banner',
    field: 'showBanner',
    rowText: '(0 args)'
  },
  {
    kind: 'struct',
    setup: () => {
      const struct = { ...createEmptyStruct(), name: 'Point' }
      usePluginStore.getState().openPlugin({ ...createEmptyPlugin(), structs: [struct] })
      return <StructBuilder />
    },
    name: 'Point',
    field: 'Point',
    rowText: '(0 fields)'
  }
]

// Presses Tab until `target` holds focus; fails if focus never reaches it
async function tabTo(user: UserEvent, target: HTMLElement): Promise<void> {
  for (let presses = 0; presses < 40 && document.activeElement !== target; presses++) {
    await user.tab()
  }

  expect(target).toHaveFocus()
}

describe('card expand control', () => {
  beforeEach(resetStores)

  describe.each(cases)('$kind card', ({ setup, name, field, rowText }) => {
    it('opens with Enter and closes with Space from its expand control', async () => {
      expect.hasAssertions()

      render(setup())
      const user = userEvent.setup()

      await tabTo(user, screen.getByRole('button', { name, expanded: false }))

      expect(screen.queryByDisplayValue(field)).not.toBeInTheDocument()

      await user.keyboard('{Enter}')

      expect(screen.getByDisplayValue(field)).toBeInTheDocument()
      expect(screen.getByRole('button', { name, expanded: true })).toHaveFocus()

      await user.keyboard(' ')

      expect(screen.getByRole('button', { name, expanded: false })).toHaveFocus()

      await waitFor(() => {
        expect(screen.queryByDisplayValue(field)).not.toBeInTheDocument()
      })
    })

    it('toggles on a mouse click on the header row outside the name', async () => {
      expect.hasAssertions()

      render(setup())
      const user = userEvent.setup()

      await user.click(screen.getByText(rowText))

      expect(screen.getByDisplayValue(field)).toBeInTheDocument()

      await user.click(screen.getByText(rowText))

      await waitFor(() => {
        expect(screen.queryByDisplayValue(field)).not.toBeInTheDocument()
      })
    })
  })
})
