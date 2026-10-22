// Saved data the app cannot use is backed up and reported, and a full storage quota is reported
// once instead of thrown out of every change.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const KEY = 'mz-plugin-studio-settings'
const BACKUP = `${KEY}.backup`
const PLUGIN_KEY = 'mz-plugin-studio-plugin'

/** Writes to any backup entry throw as on a full storage quota; other writes go through. */
function failBackupWrites(): void {
  const setItem = Storage.prototype.setItem
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (
    this: Storage,
    key: string,
    value: string
  ) {
    if (key.endsWith('.backup')) throw new DOMException('full', 'QuotaExceededError')
    setItem.call(this, key, value)
  })
}

/** The settings store imported afresh over localStorage, with the modules it reports through. */
async function loadSettings() {
  vi.resetModules()
  const { useSettingsStore } = await import('../../src/renderer/src/stores/settingsStore')
  const persist = await import('../../src/renderer/src/stores/persist')
  const { useToastStore } = await import('../../src/renderer/src/stores/toastStore')
  const log = (await import('electron-log/renderer')).default
  return { useSettingsStore, persist, useToastStore, log }
}

describe('damaged saved state', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('unreadable saved data is backed up, defaults load and the report names it', async () => {
    localStorage.setItem(KEY, '{"state":')
    const { useSettingsStore, persist } = await loadSettings()
    expect(useSettingsStore.getState()).toEqual(useSettingsStore.getInitialState())
    expect(localStorage.getItem(BACKUP)).toBe('{"state":')
    expect(persist.takeRestoreReport()).toEqual([
      { name: KEY, area: 'Settings', kind: 'unparseable', fields: [], backup: 'kept' }
    ])

    useSettingsStore.getState().setTheme('light')
    const stored = JSON.parse(localStorage.getItem(KEY) as string) as {
      state: { theme: string }
    }
    expect(stored.state.theme).toBe('light')
    expect(localStorage.getItem(BACKUP)).toBe('{"state":')
  })

  it('a second identical unreadable load leaves the backup unchanged', async () => {
    localStorage.setItem(KEY, '{"state":')
    await loadSettings()
    const setItem = vi.spyOn(Storage.prototype, 'setItem')
    const { persist } = await loadSettings()
    expect(setItem).not.toHaveBeenCalledWith(BACKUP, expect.anything())
    expect(localStorage.getItem(BACKUP)).toBe('{"state":')
    expect(persist.takeRestoreReport().map((e) => e.kind)).toEqual(['unparseable'])
  })

  it('an earlier backup is kept and the newer damage is reported as not backed up', async () => {
    localStorage.setItem(BACKUP, '{"state":1}')
    localStorage.setItem(KEY, '{"state":2}')
    const { persist } = await loadSettings()
    expect(localStorage.getItem(BACKUP)).toBe('{"state":1}')
    const entries = persist.takeRestoreReport()
    expect(entries).toEqual([
      { name: KEY, area: 'Settings', kind: 'unparseable', fields: [], backup: 'earlier-copy-kept' }
    ])
    expect(persist.formatRestoreReport(entries)).toBe(
      `Settings: the saved data could not be read, so defaults were loaded; it was not copied because ${BACKUP} already holds an earlier copy, and it will be replaced at the next save.`
    )
  })

  it('a backup that cannot be written still reports what was loaded, and that storage is full', async () => {
    localStorage.setItem(KEY, '{"state":')
    failBackupWrites()
    const { useSettingsStore, persist } = await loadSettings()
    expect(useSettingsStore.getState()).toEqual(useSettingsStore.getInitialState())
    expect(localStorage.getItem(BACKUP)).toBeNull()
    const entries = persist.takeRestoreReport()
    expect(entries).toEqual([
      { name: KEY, area: 'Settings', kind: 'unparseable', fields: [], backup: 'failed' }
    ])
    const text = persist.formatRestoreReport(entries)
    expect(text).toBe(
      `Settings: the saved data could not be read, so defaults were loaded; it could not be copied to ${BACKUP} because storage is full, and it will be replaced at the next save.`
    )
    expect(text).not.toContain('already holds an earlier copy')
  })

  it('data from a newer schema is reported as such when its backup cannot be written', async () => {
    localStorage.setItem(KEY, JSON.stringify({ state: { schemaVersion: 99 }, version: 0 }))
    failBackupWrites()
    const { persist } = await loadSettings()
    expect(persist.takeRestoreReport()).toEqual([
      { name: KEY, area: 'Settings', kind: 'newer-schema', fields: [], backup: 'failed' }
    ])
  })

  it('data from a newer schema is backed up and its known fields are kept', async () => {
    const raw = JSON.stringify({
      state: { theme: 'light', editorFontSize: 15, laterField: 'x', schemaVersion: 99 },
      version: 0
    })
    localStorage.setItem(KEY, raw)
    const { useSettingsStore, persist } = await loadSettings()
    const state = useSettingsStore.getState() as unknown as Record<string, unknown>
    expect(state.theme).toBe('light')
    expect(state.editorFontSize).toBe(15)
    expect(state).not.toHaveProperty('laterField')
    expect(state).not.toHaveProperty('schemaVersion')
    expect(localStorage.getItem(BACKUP)).toBe(raw)
    expect(persist.takeRestoreReport().map((e) => e.kind)).toEqual(['newer-schema'])
  })

  it('a field of the wrong type takes its default and is named in the report', async () => {
    const raw = JSON.stringify({
      state: { theme: 'purple', editorFontSize: 'big', defaultAuthor: 'Example Author' },
      version: 0
    })
    localStorage.setItem(KEY, raw)
    const { useSettingsStore, persist, log } = await loadSettings()
    const state = useSettingsStore.getState()
    expect(state.theme).toBe('dark')
    expect(state.editorFontSize).toBe(13)
    expect(state.defaultAuthor).toBe('Example Author')
    const entries = persist.takeRestoreReport()
    expect(entries).toEqual([
      {
        name: KEY,
        area: 'Settings',
        kind: 'fields-reset',
        fields: ['theme', 'editorFontSize'],
        backup: 'kept'
      }
    ])
    expect(persist.formatRestoreReport(entries)).toBe(
      `Settings: theme, editorFontSize had unexpected values and were reset; a copy was kept as ${BACKUP}.`
    )
    expect(localStorage.getItem(BACKUP)).toBe(raw)
    expect(log.warn).toHaveBeenCalled()
  })

  it('an open tab that cannot be read is named in the report and the saved data is backed up', async () => {
    const tab = (id: string, name: string) => ({
      id,
      meta: { name },
      parameters: [],
      commands: [],
      structs: []
    })
    const raw = JSON.stringify({
      state: {
        openPlugins: [
          { ...tab('a', 'Good'), rawSource: 5 },
          { id: 'b', meta: { name: 'Broken' } }
        ],
        schemaVersion: 2
      },
      version: 0
    })
    localStorage.setItem(PLUGIN_KEY, raw)
    vi.resetModules()
    const { usePluginStore } = await import('../../src/renderer/src/stores/pluginStore')
    const persist = await import('../../src/renderer/src/stores/persist')
    expect(usePluginStore.getState().openPlugins.map((p) => p.id)).toEqual(['a'])
    expect(localStorage.getItem(`${PLUGIN_KEY}.backup`)).toBe(raw)
    const entries = persist.takeRestoreReport()
    expect(entries).toEqual([
      {
        name: PLUGIN_KEY,
        area: 'Open plugins',
        kind: 'entries-dropped',
        fields: ['openPlugins[0].rawSource (Good)', 'openPlugins[1] (Broken)'],
        backup: 'kept'
      }
    ])
    expect(persist.formatRestoreReport(entries)).toBe(
      `Open plugins: openPlugins[0].rawSource (Good), openPlugins[1] (Broken) could not be read and were left out; a copy was kept as ${PLUGIN_KEY}.backup.`
    )
  })

  it('a full storage quota is logged and reported once, and set does not throw', async () => {
    localStorage.setItem('mz-plugin-studio-ui.backup', '{"state":')
    const { useSettingsStore, useToastStore, log } = await loadSettings()
    const keysBefore = Object.keys(localStorage).length
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('full', 'QuotaExceededError')
    })
    expect(() => useSettingsStore.getState().setTheme('light')).not.toThrow()
    expect(() => useSettingsStore.getState().setEditorFontSize(16)).not.toThrow()
    expect(log.error).toHaveBeenCalled()
    const toasts = useToastStore.getState().toasts
    expect(toasts).toHaveLength(1)
    expect(toasts[0].message).toBe(
      'Storage is full: recent changes to settings were not saved. Backup entries present: mz-plugin-studio-ui.backup. Nothing was deleted.'
    )
    expect(Object.keys(localStorage)).toHaveLength(keysBefore)
  })
})
