// The default value editor of a struct parameter: each field edits the JSON default it reports.
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StructDefaultEditor } from '../../src/renderer/src/components/plugin/StructDefaultEditor'
import {
  createEmptyParameter,
  createEmptyStruct,
  type PluginStruct
} from '../../src/renderer/src/types/plugin'

const POINT: PluginStruct = {
  ...createEmptyStruct(),
  name: 'Point',
  parameters: [
    { ...createEmptyParameter(), name: 'x', text: 'Horizontal', type: 'number', default: 1 },
    { ...createEmptyParameter(), name: 'label', text: 'Label', default: 'Home' }
  ]
}

// The editor over an empty value, with the spy on its change handler and a user to drive it.
function showEditor() {
  const onChange = vi.fn<(value: string) => void>()
  const user = userEvent.setup()
  const { rerender } = render(<StructDefaultEditor struct={POINT} value="" onChange={onChange} />)
  return { onChange, user, rerender }
}

describe('struct default editor', () => {
  it('reports the JSON holding an edited field', async () => {
    expect.hasAssertions()

    const { onChange, user } = showEditor()
    await user.type(screen.getByRole('spinbutton'), '5')

    expect(onChange).toHaveBeenLastCalledWith('{"x":"5"}')
  })

  it('says Valid JSON for valid text only', () => {
    const { rerender } = render(
      <StructDefaultEditor
        struct={POINT}
        value='{"x":"5"}'
        onChange={vi.fn<(value: string) => void>()}
      />
    )

    expect(screen.getByText('Valid JSON')).toBeInTheDocument()

    rerender(
      <StructDefaultEditor
        struct={POINT}
        value='{"x":'
        onChange={vi.fn<(value: string) => void>()}
      />
    )

    expect(screen.queryByText('Valid JSON')).not.toBeInTheDocument()
    expect(screen.getByText('Invalid JSON: check syntax')).toBeInTheDocument()
  })

  it('fills every field from its default', async () => {
    expect.hasAssertions()

    const { onChange, user } = showEditor()
    await user.click(screen.getByRole('button', { name: 'Fill from struct defaults' }))

    expect(onChange).toHaveBeenCalledExactlyOnceWith('{"x":"1","label":"Home"}')
    expect(screen.getByRole('spinbutton')).toHaveValue(1)
    expect(screen.getByRole('textbox')).toHaveValue('Home')
  })

  it('clears a value to empty, and has nothing to clear without one', async () => {
    expect.hasAssertions()

    const { onChange, user, rerender } = showEditor()

    expect(screen.getByRole('button', { name: 'Clear' })).toBeDisabled()

    rerender(<StructDefaultEditor struct={POINT} value='{"x":"5"}' onChange={onChange} />)

    expect(screen.getByRole('spinbutton')).toHaveValue(5)

    await user.click(screen.getByRole('button', { name: 'Clear' }))

    expect(onChange).toHaveBeenCalledExactlyOnceWith('')
    expect(screen.getByRole('spinbutton')).toHaveValue(null)
  })
})
