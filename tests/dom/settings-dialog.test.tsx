// The backups of saved state the app could not load can be listed, exported and deleted from
// Settings, so a later problem can be backed up too.
import { createElement } from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createFakeApi } from '../helpers/fake-api'

const KEY = 'mz-plugin-studio-settings'
const BACKUP = `${KEY}.backup`

/** The settings store imported afresh over localStorage, with the report it made while loading. */
async function loadSettings() {
  vi.resetModules()
  await import('../../src/renderer/src/stores/settingsStore')
  const persist = await import('../../src/renderer/src/stores/persist')
  return persist.takeRestoreReport()
}

/** Settings, open on its Data tab, from the modules the last load imported. */
async function openDataTab(): Promise<void> {
  const { SettingsDialog } =
    await import('../../src/renderer/src/components/settings/SettingsDialog')
  render(createElement(SettingsDialog, { open: true, onOpenChange: () => {} }))
  fireEvent.mouseDown(screen.getByRole('tab', { name: 'Data' }), { button: 0 })
}

// Each case imports the app's stores and the dialog afresh, which takes seconds on a cold start
describe('saved-state backups in settings', { timeout: 30_000 }, () => {
  beforeEach(() => {
    localStorage.clear()
    window.api = createFakeApi()
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('a deleted backup makes room for the backup of the next unreadable load', async () => {
    localStorage.setItem(KEY, '{"state":')
    expect((await loadSettings()).map((e) => e.backup)).toEqual(['kept'])
    window.api = createFakeApi({ dialog: { message: vi.fn(async () => 1) } })
    await openDataTab()
    expect(screen.getByText(BACKUP)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Delete the Settings backup' }))
    await waitFor(() => expect(localStorage.getItem(BACKUP)).toBeNull())
    expect(screen.queryByText(BACKUP)).not.toBeInTheDocument()

    localStorage.setItem(KEY, '{"state":2')
    expect(await loadSettings()).toEqual([
      { name: KEY, area: 'Settings', kind: 'unparseable', fields: [], backup: 'kept' }
    ])
    expect(localStorage.getItem(BACKUP)).toBe('{"state":2')
  })

  it('delete asks first, with Cancel the default, and Cancel keeps the backup', async () => {
    localStorage.setItem(KEY, '{"state":')
    await loadSettings()
    await openDataTab()
    fireEvent.click(screen.getByRole('button', { name: 'Delete the Settings backup' }))
    await waitFor(() => expect(window.api.dialog.message).toHaveBeenCalledTimes(1))
    expect(window.api.dialog.message).toHaveBeenCalledWith(
      expect.objectContaining({ buttons: ['Cancel', 'Delete'], defaultId: 0, cancelId: 0 })
    )
    expect(localStorage.getItem(BACKUP)).toBe('{"state":')
    expect(screen.getByText(BACKUP)).toBeInTheDocument()
  })

  it('export writes the backup text to the file the save dialog names', async () => {
    localStorage.setItem(KEY, '{"state":')
    await loadSettings()
    const saveToPath = vi.fn(async (path: string) => ({ success: true as const, path, sha256: '' }))
    window.api = createFakeApi({
      dialog: { saveFile: vi.fn(async () => 'out/settings-backup.json') },
      plugin: { saveToPath }
    })
    await openDataTab()
    fireEvent.click(screen.getByRole('button', { name: 'Export the Settings backup' }))
    await waitFor(() =>
      expect(saveToPath).toHaveBeenCalledWith('out/settings-backup.json', '{"state":')
    )
    expect(window.api.dialog.saveFile).toHaveBeenCalledWith(
      expect.objectContaining({ filters: [{ name: 'JSON', extensions: ['json'] }] })
    )
    expect(localStorage.getItem(BACKUP)).toBe('{"state":')
  })

  it('with no backups the section says so', async () => {
    await loadSettings()
    await openDataTab()
    expect(screen.getByText('No backups.')).toBeInTheDocument()
  })
})
