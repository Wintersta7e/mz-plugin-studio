// The keyboard shortcuts dialog lists every shortcut the app handles.
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ShortcutsDialog } from '../../src/renderer/src/components/settings/ShortcutsDialog'
import { SHORTCUTS } from '../../src/renderer/src/lib/shortcuts'

describe('keyboard shortcuts dialog', () => {
  it('shows one row per shortcut', () => {
    render(<ShortcutsDialog open onOpenChange={vi.fn<(isOpen: boolean) => void>()} />)
    const dialog = screen.getByRole('dialog', { name: 'Keyboard Shortcuts' })
    const keys = within(dialog)
      .getAllByText((_content, element) => element?.tagName === 'KBD')
      .map((key) => key.textContent)
    process.stdout.write(`shortcuts ${String(SHORTCUTS.length)}, rows ${String(keys.length)}\n`)

    expect(SHORTCUTS.length).toBeGreaterThan(0)
    expect(keys.toSorted((a, b) => a.localeCompare(b))).toStrictEqual(
      SHORTCUTS.map((shortcut) => shortcut.label).toSorted((a, b) => a.localeCompare(b))
    )

    for (const shortcut of SHORTCUTS) {
      expect(within(dialog).getByText(shortcut.description)).toBeInTheDocument()
    }
  })

  it('closing it reports the dialog closed', async () => {
    expect.hasAssertions()

    const user = userEvent.setup()
    const onOpenChange = vi.fn<(isOpen: boolean) => void>()
    render(<ShortcutsDialog open onOpenChange={onOpenChange} />)
    await user.click(screen.getByRole('button', { name: 'Close' }))

    expect(onOpenChange).toHaveBeenCalledTimes(1)
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
})
