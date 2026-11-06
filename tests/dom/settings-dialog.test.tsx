// The backups of saved state the app could not load can be listed, exported and deleted from
// Settings, so a later problem can be backed up too.
import { createElement, useState } from 'react'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
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

function first<T>(values: readonly T[]): T {
  const value = values.at(0)
  if (value === undefined) throw new Error('expected a preview editor')
  return value
}

function expectBackup(value: string): void {
  expect(localStorage.getItem(BACKUP)).toBe(value)
}

function currentFontSize(): unknown {
  return first(monacoStub.editors).updateOptions.mock.lastCall?.[0].fontSize
}

function expectFontSize(input: HTMLElement, size: number): void {
  expect(input).toHaveValue(size)
  expect(currentFontSize()).toBe(size)
}

function expectPresetState(count: number, present: string[], absent: string[]): void {
  expect(screen.getByText(`${String(count)} preset(s) saved`)).toBeInTheDocument()

  expect([
    ...present.map((name) => screen.queryByText(name) !== null),
    ...absent.map((name) => screen.queryByText(name) !== null)
  ]).toStrictEqual([...present.map(() => true), ...absent.map(() => false)])
}

/**
The settings store imported afresh over localStorage, with the report it made while loading.
*/
async function loadSettings() {
  vi.resetModules()
  await import('../../src/renderer/src/stores/settingsStore')
  const persist = await import('../../src/renderer/src/stores/persist')
  return persist.takeRestoreReport()
}

/**
Settings, open on its Data tab, from the modules the last load imported.
*/
async function openDataTab(): Promise<void> {
  const { SettingsDialog } =
    await import('../../src/renderer/src/components/settings/SettingsDialog')
  render(
    createElement(SettingsDialog, { open: true, onOpenChange: vi.fn<(isOpen: boolean) => void>() })
  )
  fireEvent.mouseDown(screen.getByRole('tab', { name: 'Data' }), { button: 0 })
}

function backupSetUp(): void {
  localStorage.clear()
  vi.stubGlobal('api', createFakeApi())
}

function backupTearDown(): void {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
}

// Each case imports the app's stores and the dialog afresh.
describe('saved-state backups in settings: deletion', { timeout: 30_000 }, () => {
  beforeEach(backupSetUp)

  afterEach(backupTearDown)

  it('a deleted backup makes room for the backup of the next unreadable load', async () => {
    expect.hasAssertions()

    localStorage.setItem(KEY, '{"state":')

    const loaded = await loadSettings()

    expect(loaded.map((entry) => entry.backup)).toStrictEqual(['kept'])

    vi.stubGlobal(
      'api',
      createFakeApi({
        dialog: { message: vi.fn<Window['api']['dialog']['message']>().mockResolvedValue(1) }
      })
    )
    await openDataTab()

    expect(screen.getByText(BACKUP)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Delete the Settings backup' }))
    await waitFor(() => {
      expect(localStorage.getItem(BACKUP)).toBeNull()
    })

    expect(screen.queryByText(BACKUP)).not.toBeInTheDocument()

    localStorage.setItem(KEY, '{"state":2')

    await expect(loadSettings()).resolves.toStrictEqual([
      { name: KEY, area: 'Settings', kind: 'unparseable', fields: [], backup: 'kept' }
    ])

    expectBackup('{"state":2')
  })

  it('delete asks first, with Cancel the default, and Cancel keeps the backup', async () => {
    expect.hasAssertions()

    localStorage.setItem(KEY, '{"state":')
    await loadSettings()
    await openDataTab()
    fireEvent.click(screen.getByRole('button', { name: 'Delete the Settings backup' }))
    await waitFor(() => {
      expect(globalThis.api.dialog.message).toHaveBeenCalledTimes(1)
    })

    expect(globalThis.api.dialog.message).toHaveBeenCalledWith(
      expect.objectContaining({ buttons: ['Cancel', 'Delete'] })
    )
    expect(localStorage.getItem(BACKUP)).toBe('{"state":')
    expect(screen.getByText(BACKUP)).toBeInTheDocument()
  })
})

describe('saved-state backups in settings: export', { timeout: 30_000 }, () => {
  beforeEach(backupSetUp)

  afterEach(backupTearDown)

  it('export writes the backup text to the file the save dialog names', async () => {
    expect.hasAssertions()

    localStorage.setItem(KEY, '{"state":')
    await loadSettings()
    const saveToPath = vi
      .fn<Window['api']['plugin']['saveToPath']>()
      .mockImplementation(async (path) => {
        await Promise.resolve()
        return { success: true, path, sha256: '' }
      })
    vi.stubGlobal(
      'api',
      createFakeApi({
        dialog: {
          saveFile: vi
            .fn<Window['api']['dialog']['saveFile']>()
            .mockResolvedValue('out/settings-backup.json')
        },
        plugin: { saveToPath }
      })
    )
    await openDataTab()
    fireEvent.click(screen.getByRole('button', { name: 'Export the Settings backup' }))
    await waitFor(() => {
      expect(saveToPath).toHaveBeenCalledWith('out/settings-backup.json', '{"state":')
    })

    expect(globalThis.api.dialog.saveFile).toHaveBeenCalledWith(
      expect.objectContaining({ filters: [{ name: 'JSON', extensions: ['json'] }] })
    )
    expect(localStorage.getItem(BACKUP)).toBe('{"state":')
  })

  it('an export main refuses shows its reason, without the prefix Electron adds', async () => {
    expect.hasAssertions()

    localStorage.setItem(KEY, '{"state":')
    await loadSettings()
    const { useToastStore } = await import('../../src/renderer/src/stores/toastStore')
    const denied = new Error("Error invoking remote method 'plugin:save-to-path': Error: disk full")
    vi.stubGlobal(
      'api',
      createFakeApi({
        dialog: {
          saveFile: vi
            .fn<Window['api']['dialog']['saveFile']>()
            .mockResolvedValue('out/settings-backup.json')
        },
        plugin: {
          saveToPath: vi.fn<Window['api']['plugin']['saveToPath']>().mockRejectedValue(denied)
        }
      })
    )
    await openDataTab()
    fireEvent.click(screen.getByRole('button', { name: 'Export the Settings backup' }))
    await waitFor(() => {
      expect(useToastStore.getState().toasts).toMatchObject([
        { type: 'error', message: 'Export failed: disk full', duration: 10_000 }
      ])
    })
  })
})

describe('saved-state backups in settings: empty state', { timeout: 30_000 }, () => {
  beforeEach(backupSetUp)

  afterEach(backupTearDown)

  it('with no backups the section says so', async () => {
    expect.hasAssertions()

    await loadSettings()
    await openDataTab()

    expect(screen.getByText('No backups.')).toBeInTheDocument()
  })
})

/**
The settings row whose title is `title`.
*/
const rowOf = (title: string): HTMLElement =>
  screen.getByText(
    (_content, element) =>
      element instanceof HTMLElement &&
      element.classList.contains('justify-between') &&
      within(element).queryByText(title) !== null
  )

/**
Types 18 over the default font size 13 by replacing its last digit, as a user would.
*/
async function setFontSize18(user: ReturnType<typeof userEvent.setup>): Promise<void> {
  const input = screen.getByLabelText('Font Size')

  expect(input).toHaveValue(13)

  await user.type(input, '8', { initialSelectionStart: 1, initialSelectionEnd: 2 })

  expect(input).toHaveValue(18)
}

// Settings, open, with a user to drive it; `hasPreview` renders the code preview beside it.
function showSettings(hasPreview = false): ReturnType<typeof userEvent.setup> {
  const user = userEvent.setup()
  render(
    <>
      <SettingsDialog open onOpenChange={vi.fn<(isOpen: boolean) => void>()} />
      {hasPreview && <CodePreview />}
    </>
  )
  return user
}

function setUp(): void {
  resetStores()
  vi.stubGlobal('api', createFakeApi())
}

function tearDown(): void {
  vi.unstubAllGlobals()
}

function Harness(): React.ReactElement {
  const [isOpen, setIsOpen] = useState(true)
  return (
    <>
      <Sidebar
        onOpenProject={vi.fn<() => void>()}
        onOpenSettings={vi.fn<() => void>()}
        onOpenShortcuts={vi.fn<() => void>()}
      />
      <MetaEditor />
      <SettingsDialog open={isOpen} onOpenChange={setIsOpen} />
    </>
  )
}

describe('settings: basic controls', () => {
  beforeEach(setUp)

  afterEach(tearDown)

  it('a new font size reaches the code preview editor', async () => {
    expect.hasAssertions()

    const user = showSettings(true)

    expect(monacoStub.editors).toHaveLength(1)

    const preview = first(monacoStub.editors)
    await setFontSize18(user)

    expect(preview.updateOptions.mock.lastCall?.[0]).toMatchObject({ fontSize: 18 })
  })

  it('debug Logging on asks main for debug logs', async () => {
    expect.hasAssertions()

    const user = showSettings()
    await user.click(screen.getByRole('switch', { name: 'Debug Logging' }))

    expect(globalThis.api.log.setLevel).toHaveBeenCalledTimes(1)
    expect(globalThis.api.log.setLevel).toHaveBeenCalledWith(true)
  })

  it('open Folder opens the log folder once', async () => {
    expect.hasAssertions()

    const user = showSettings()
    await user.click(within(rowOf('Log Files')).getByRole('button', { name: 'Open Folder' }))

    expect(globalThis.api.log.openFolder).toHaveBeenCalledTimes(1)
  })

  it('reset to Defaults puts the font size back', async () => {
    expect.hasAssertions()

    const user = showSettings()
    await setFontSize18(user)
    await user.click(screen.getByRole('button', { name: 'Reset to Defaults' }))

    expect(screen.getByLabelText('Font Size')).toHaveValue(13)
    expect(screen.getByRole('button', { name: 'Reset!' })).toBeDisabled()
  })
})

describe('settings: font size', () => {
  beforeEach(setUp)

  afterEach(tearDown)

  it('a font size can be typed anew, and leaving the field keeps it from 10 to 24', async () => {
    expect.hasAssertions()

    const user = showSettings(true)
    const input = screen.getByLabelText('Font Size')

    await user.type(input, '18', { initialSelectionStart: 0, initialSelectionEnd: 2 })

    expectFontSize(input, 18)

    await user.clear(input)
    await user.type(input, '20')
    await user.tab()

    expectFontSize(input, 20)

    await user.clear(input)
    await user.type(input, '30')
    await user.tab()

    expectFontSize(input, 24)

    await user.clear(input)
    await user.type(input, '9{Enter}')

    expectFontSize(input, 10)

    // Leaving the field empty keeps the size it had
    await user.clear(input)
    await user.tab()

    expect(input).toHaveValue(10)
  })
})

describe('settings: defaults and data', () => {
  beforeEach(setUp)

  afterEach(tearDown)

  it('a default author fills the Author field of the next new plugin', async () => {
    expect.hasAssertions()

    const user = userEvent.setup()
    render(<Harness />)
    await user.click(screen.getByRole('tab', { name: 'Defaults' }))
    await user.type(screen.getByLabelText('Default Author'), 'Sample Author')
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: 'New Plugin' }))

    expect(screen.getByLabelText('Author')).toHaveValue('Sample Author')
  })

  it('the Data tab clears recent projects, favorites and recent templates, and deletes a preset', async () => {
    expect.hasAssertions()

    const user = userEvent.setup()
    act(() => {
      useProjectStore.getState().addRecentProject('/project')
      useTemplateStore.getState().toggleFavorite('alpha-template')
      useTemplateStore.getState().addToRecent('beta-template')
      useSettingsStore.getState().savePreset('Alpha', [createEmptyParameter()])
      useSettingsStore.getState().savePreset('Beta', [createEmptyParameter()])
    })
    render(<SettingsDialog open onOpenChange={vi.fn<(isOpen: boolean) => void>()} />)
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
    const alpha = rowOf('Alpha (1 params)')
    await user.click(within(alpha).getByRole('button'))

    expectPresetState(1, ['Beta (1 params)'], ['Alpha (1 params)'])

    await user.click(screen.getByRole('button', { name: 'Clear All' }))

    expectPresetState(0, [], ['Beta (1 params)'])
  })
})
