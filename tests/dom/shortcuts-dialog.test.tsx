// The keyboard shortcuts dialog lists every shortcut the app handles.
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ShortcutsDialog } from '../../src/renderer/src/components/settings/ShortcutsDialog'
import { SHORTCUTS } from '../../src/renderer/src/lib/shortcuts'

describe('keyboard shortcuts dialog', () => {
  afterEach(cleanup)

  it('shows one row per shortcut', () => {
    render(<ShortcutsDialog open onOpenChange={() => {}} />)
    const dialog = screen.getByRole('dialog', { name: 'Keyboard Shortcuts' })
    const keys = Array.from(dialog.querySelectorAll('kbd'), (kbd) => kbd.textContent)
    console.log(`shortcuts ${SHORTCUTS.length}, rows ${keys.length}`)
    expect(SHORTCUTS.length).toBeGreaterThan(0)
    expect(keys.sort()).toEqual(SHORTCUTS.map((s) => s.label).sort())
    for (const shortcut of SHORTCUTS) {
      expect(within(dialog).getByText(shortcut.description)).toBeInTheDocument()
    }
  })

  it('closing it reports the dialog closed', async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()
    render(<ShortcutsDialog open onOpenChange={onOpenChange} />)
    await user.click(screen.getByRole('button', { name: 'Close' }))
    expect(onOpenChange).toHaveBeenCalledTimes(1)
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
})
