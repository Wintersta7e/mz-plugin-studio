// The backups of saved state the app could not load can be listed, exported and deleted from
// Settings, so a later problem can be backed up too.
import { createElement, useState } from 'react'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Sidebar } from '../../src/renderer/src/components/layout/Sidebar'
import { MetaEditor } from '../../src/renderer/src/components/plugin/MetaEditor'
import { CodePreview } from '../../src/renderer/src/components/preview/CodePreview'
import { SettingsDialog } from '../../src/renderer/src/components/settings/SettingsDialog'
import { useProjectStore, useSettingsStore, useTemplateStore } from '../../src/renderer/src/stores'
import { createEmptyParameter } from '../../src/renderer/src/types/plugin'
import { createFakeApi } from '../helpers/fake-api'
import { monacoStub } from '../setup/monaco-stub'
import { resetStores } from './support/reset-stores'

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
      expect.objectContaining({ buttons: ['Cancel', 'Delete'] })
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

  it('an export main refuses shows its reason, without the prefix Electron adds', async () => {
    localStorage.setItem(KEY, '{"state":')
    await loadSettings()
    const { useToastStore } = await import('../../src/renderer/src/stores/toastStore')
    window.api = createFakeApi({
      dialog: { saveFile: vi.fn(async () => 'out/settings-backup.json') },
      plugin: {
        saveToPath: vi.fn(async () => {
          throw new Error("Error invoking remote method 'plugin:save-to-path': Error: disk full")
        })
      }
    })
    await openDataTab()
    fireEvent.click(screen.getByRole('button', { name: 'Export the Settings backup' }))
    await waitFor(() =>
      expect(useToastStore.getState().toasts).toMatchObject([
        { type: 'error', message: 'Export failed: disk full', duration: 10_000 }
      ])
    )
  })

  it('with no backups the section says so', async () => {
    await loadSettings()
    await openDataTab()
    expect(screen.getByText('No backups.')).toBeInTheDocument()
  })
})

/** The settings row whose title is `title`. */
const rowOf = (title: string): HTMLElement =>
  screen.getByText(title).closest('.justify-between') as HTMLElement

/** Types 18 over the default font size 13 by replacing its last digit, as a user would. */
async function setFontSize18(user: ReturnType<typeof userEvent.setup>): Promise<void> {
  const input = screen.getByLabelText('Font Size')
  expect(input).toHaveValue(13)
  await user.type(input, '8', { initialSelectionStart: 1, initialSelectionEnd: 2 })
  expect(input).toHaveValue(18)
}

describe('settings', () => {
  beforeEach(() => {
    resetStores()
    window.api = createFakeApi()
  })

  afterEach(cleanup)

  it('a new font size reaches the code preview editor', async () => {
    const user = userEvent.setup()
    render(
      <>
        <SettingsDialog open onOpenChange={() => {}} />
        <CodePreview />
      </>
    )
    expect(monacoStub.editors).toHaveLength(1)
    const [preview] = monacoStub.editors
    await setFontSize18(user)
    expect(preview.updateOptions.mock.lastCall?.[0]).toMatchObject({ fontSize: 18 })
  })

  it('Debug Logging on asks main for debug logs', async () => {
    const user = userEvent.setup()
    render(<SettingsDialog open onOpenChange={() => {}} />)
    await user.click(screen.getByRole('switch', { name: 'Debug Logging' }))
    expect(window.api.log.setLevel).toHaveBeenCalledTimes(1)
    expect(window.api.log.setLevel).toHaveBeenCalledWith(true)
  })

  it('Open Folder opens the log folder once', async () => {
    const user = userEvent.setup()
    render(<SettingsDialog open onOpenChange={() => {}} />)
    await user.click(within(rowOf('Log Files')).getByRole('button', { name: 'Open Folder' }))
    expect(window.api.log.openFolder).toHaveBeenCalledTimes(1)
  })

  it('Reset to Defaults puts the font size back', async () => {
    const user = userEvent.setup()
    render(<SettingsDialog open onOpenChange={() => {}} />)
    await setFontSize18(user)
    await user.click(screen.getByRole('button', { name: 'Reset to Defaults' }))
    expect(screen.getByLabelText('Font Size')).toHaveValue(13)
    expect(screen.getByRole('button', { name: 'Reset!' })).toBeDisabled()
  })

  it('a default author fills the Author field of the next new plugin', async () => {
    const user = userEvent.setup()
    function Harness(): React.ReactElement {
      const [open, setOpen] = useState(true)
      return (
        <>
          <Sidebar onOpenProject={() => {}} onOpenSettings={() => {}} onOpenShortcuts={() => {}} />
          <MetaEditor />
          <SettingsDialog open={open} onOpenChange={setOpen} />
        </>
      )
    }
    render(<Harness />)
    await user.click(screen.getByRole('tab', { name: 'Defaults' }))
    await user.type(screen.getByLabelText('Default Author'), 'Sample Author')
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: 'New Plugin' }))
    expect(screen.getByLabelText('Author')).toHaveValue('Sample Author')
  })

  it('the Data tab clears recent projects, favorites and recent templates, and deletes a preset', async () => {
    const user = userEvent.setup()
    act(() => {
      useProjectStore.getState().addRecentProject('/project')
      useTemplateStore.getState().toggleFavorite('alpha-template')
      useTemplateStore.getState().addToRecent('beta-template')
      useSettingsStore.getState().savePreset('Alpha', [createEmptyParameter()])
      useSettingsStore.getState().savePreset('Beta', [createEmptyParameter()])
    })
    render(<SettingsDialog open onOpenChange={() => {}} />)
    await user.click(screen.getByRole('tab', { name: 'Data' }))
    const lists: [string, string, string][] = [
      ['Recent Projects', '1 project(s) stored', '0 project(s) stored'],
      ['Template Favorites', '1 favorite(s) saved', '0 favorite(s) saved'],
      ['Recently Used Templates', '1 template(s) tracked', '0 template(s) tracked']
    ]
    for (const [title, before, after] of lists) {
      expect(within(rowOf(title)).getByText(before)).toBeInTheDocument()
      await user.click(within(rowOf(title)).getByRole('button', { name: 'Clear' }))
      expect(within(rowOf(title)).getByText(after)).toBeInTheDocument()
      expect(within(rowOf(title)).getByRole('button', { name: 'Cleared!' })).toBeDisabled()
    }
    expect(screen.getByText('2 preset(s) saved')).toBeInTheDocument()
    // A preset row's only button is its delete button
    const alpha = screen.getByText('Alpha (1 params)').parentElement as HTMLElement
    await user.click(within(alpha).getByRole('button'))
    expect(screen.queryByText('Alpha (1 params)')).not.toBeInTheDocument()
    expect(screen.getByText('Beta (1 params)')).toBeInTheDocument()
    expect(screen.getByText('1 preset(s) saved')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Clear All' }))
    expect(screen.getByText('0 preset(s) saved')).toBeInTheDocument()
    expect(screen.queryByText('Beta (1 params)')).not.toBeInTheDocument()
  })
})
