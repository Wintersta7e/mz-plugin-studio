// Saved data the app cannot use is backed up and reported, and a full storage quota is reported
// once instead of thrown out of every change.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const KEY = 'mz-plugin-studio-settings'
const BACKUP = `${KEY}.backup`

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
      { name: KEY, area: 'Settings', kind: 'unparseable', fields: [] }
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
    expect(entries).toEqual([{ name: KEY, area: 'Settings', kind: 'not-backed-up', fields: [] }])
    expect(persist.formatRestoreReport(entries)).toBe(
      `Settings: the saved data could not be copied because ${BACKUP} already holds an earlier copy; it will be replaced at the next save.`
    )
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
    localStorage.setItem(
      KEY,
      JSON.stringify({
        state: { theme: 'purple', editorFontSize: 'big', defaultAuthor: 'Example Author' },
        version: 0
      })
    )
    const { useSettingsStore, persist, log } = await loadSettings()
    const state = useSettingsStore.getState()
    expect(state.theme).toBe('dark')
    expect(state.editorFontSize).toBe(13)
    expect(state.defaultAuthor).toBe('Example Author')
    const entries = persist.takeRestoreReport()
    expect(entries).toEqual([
      { name: KEY, area: 'Settings', kind: 'fields-reset', fields: ['theme', 'editorFontSize'] }
    ])
    expect(persist.formatRestoreReport(entries)).toBe(
      'Settings: theme, editorFontSize had unexpected values and were reset.'
    )
    expect(log.warn).toHaveBeenCalled()
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
