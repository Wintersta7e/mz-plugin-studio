// Saved data the app cannot use is backed up and reported, and a full storage quota is reported
// once instead of thrown out of every change.
import { createElement } from 'react'
import { cleanup, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createFakeApi } from '../helpers/fake-api'

const KEY = 'mz-plugin-studio-settings'
const BACKUP = `${KEY}.backup`
const PLUGIN_KEY = 'mz-plugin-studio-plugin'
const SEE_BACKUPS = 'Backups can be exported or deleted in Settings > Data > Saved-state backups.'

/** A saved tab every editor can read. */
const tab = (id: string, name: string) => ({
  id,
  meta: {
    name,
    version: '1.0.0',
    author: '',
    description: '',
    help: '',
    url: '',
    target: 'MZ',
    dependencies: []
  },
  parameters: [],
  commands: [],
  structs: []
})

const param = (id: string, name: string, type = 'string') => ({
  id,
  name,
  text: name,
  desc: '',
  type,
  default: ''
})

/** The plugin store's saved state with these open tabs, the first one active. */
function savedTabs(openPlugins: Record<string, unknown>[]): string {
  return JSON.stringify({
    state: {
      plugin: openPlugins[0],
      openPlugins,
      activePluginId: openPlugins[0].id,
      schemaVersion: 2
    },
    version: 0
  })
}

/** The plugin store imported afresh over localStorage. */
async function loadPlugins() {
  vi.resetModules()
  const { usePluginStore } = await import('../../src/renderer/src/stores/pluginStore')
  const persist = await import('../../src/renderer/src/stores/persist')
  return { usePluginStore, persist }
}

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
      `Settings: the saved data could not be read, so defaults were loaded; it was not copied because ${BACKUP} already holds an earlier copy, and it will be replaced at the next save. ${SEE_BACKUPS}`
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
      `Settings: the saved data could not be read, so defaults were loaded; it could not be copied to ${BACKUP} because storage is full, and it will be replaced at the next save. ${SEE_BACKUPS}`
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
        fields: [[{ key: 'theme' }], [{ key: 'editorFontSize' }]],
        backup: 'kept'
      }
    ])
    expect(persist.formatRestoreReport(entries)).toBe(
      `Settings: theme, editor font size had unexpected values and were reset; a copy was kept as ${BACKUP}. ${SEE_BACKUPS}`
    )
    expect(localStorage.getItem(BACKUP)).toBe(raw)
    expect(log.warn).toHaveBeenCalled()
  })

  it('an open tab that cannot be read is named in the report and the saved data is backed up', async () => {
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
        fields: [
          [{ key: 'openPlugins' }, { index: 0, name: 'Good' }, { key: 'rawSource' }],
          [{ key: 'openPlugins' }, { index: 1, name: 'Broken' }]
        ],
        backup: 'kept'
      }
    ])
    expect(persist.formatRestoreReport(entries)).toBe(
      `Open plugins: file text of open plugin Good, open plugin Broken could not be read and were left out; a copy was kept as ${PLUGIN_KEY}.backup. ${SEE_BACKUPS}`
    )
  })

  it('a tab whose details cannot be read opens in the editor and is named in the report', async () => {
    const { dependencies: _dependencies, ...meta } = tab('a', 'NoDeps').meta
    localStorage.setItem(PLUGIN_KEY, savedTabs([{ ...tab('a', 'NoDeps'), meta }]))
    window.api = createFakeApi()
    vi.stubGlobal('__APP_VERSION__', '0.0.0-test')
    try {
      vi.resetModules()
      const { default: App } = await import('../../src/renderer/src/App')
      const { useToastStore } = await import('../../src/renderer/src/stores/toastStore')
      const { usePluginStore } = await import('../../src/renderer/src/stores/pluginStore')
      expect(() => render(createElement(App))).not.toThrow()
      expect(usePluginStore.getState().plugin.meta.dependencies).toEqual([])
      const messages = useToastStore.getState().toasts.map((t) => t.message)
      expect(messages).toEqual([expect.stringContaining('dependencies of the active plugin')])
      expect(messages[0]).toContain('dependencies of open plugin NoDeps')
      expect(localStorage.getItem(`${PLUGIN_KEY}.backup`)).not.toBeNull()
    } finally {
      cleanup()
      vi.unstubAllGlobals()
    }
  }, 30_000)

  it('parameters, command arguments and struct fields that cannot be read are left out and named', async () => {
    const raw = savedTabs([
      {
        ...tab('a', 'Good'),
        parameters: [null, { id: 'p', name: 'x' }, param('q', 'Kept')],
        commands: [
          { id: 'c', name: 'Run', text: 'Run', desc: '', args: [{ id: 'r', name: 'Arg' }] },
          { id: 'd', text: 'No name', desc: '', args: [] }
        ],
        structs: [
          { id: 's', name: 'Point', parameters: [{ ...param('t', 'X', 'number'), desc: 3 }] },
          null
        ]
      }
    ])
    localStorage.setItem(PLUGIN_KEY, raw)
    const { usePluginStore, persist } = await loadPlugins()
    const { parameters, commands, structs } = usePluginStore.getState().openPlugins[0]
    expect(parameters.map((p) => p.name)).toEqual(['Kept'])
    expect(commands).toEqual([{ id: 'c', name: 'Run', text: 'Run', desc: '', args: [] }])
    expect(structs.map((s) => s.parameters.map((p) => [p.name, p.desc]))).toEqual([[['X', '']]])
    expect(localStorage.getItem(`${PLUGIN_KEY}.backup`)).toBe(raw)
    const dropped = persist.takeRestoreReport().find((e) => e.kind === 'entries-dropped')
    const inGood = (...steps: Record<string, unknown>[]) => [
      { key: 'openPlugins' },
      { index: 0, name: 'Good' },
      ...steps
    ]
    const at = (index: number) => ({ index })
    expect(dropped?.fields.filter((f) => 'key' in f[0] && f[0].key === 'openPlugins')).toEqual([
      inGood({ key: 'parameters' }, at(0)),
      inGood({ key: 'parameters' }, at(1)),
      inGood({ key: 'commands' }, at(0), { key: 'args' }, at(0)),
      inGood({ key: 'commands' }, at(1)),
      inGood({ key: 'structs' }, at(0), { key: 'parameters' }, at(0), { key: 'desc' }),
      inGood({ key: 'structs' }, at(1))
    ])
  })

  it('an unknown key of any spelling is named as written and the report still names its tab', async () => {
    const keys = ['old (v1)', 'x.y', 'a["\\q"]', 'toString']
    localStorage.setItem(
      PLUGIN_KEY,
      savedTabs([
        { ...tab('a', 'Good'), parameters: keys.map((key) => ({ ...param('p', 'X'), [key]: 1 })) }
      ])
    )
    const { usePluginStore, persist } = await loadPlugins()
    expect(usePluginStore.getState().openPlugins[0].parameters).toHaveLength(keys.length)
    const entries = persist.takeRestoreReport()
    let text = ''
    expect(() => (text = persist.formatRestoreReport(entries))).not.toThrow()
    const named = keys.map((key, i) => `${key} of parameter ${i + 1} of open plugin Good`)
    named[3] = 'to string of parameter 4 of open plugin Good'
    for (const words of named) expect(text).toContain(words)
    expect(text).not.toContain('v1) (Good')
  })

  it('a preset parameter that cannot be read is left out on every load', async () => {
    const raw = JSON.stringify({
      state: {
        parameterPresets: { Mixed: [{}, param('k', 'Kept')] },
        schemaVersion: 1
      },
      version: 0
    })
    localStorage.setItem(KEY, raw)
    const { useSettingsStore, persist } = await loadSettings()
    expect(useSettingsStore.getState().parameterPresets.Mixed.map((p) => p.id)).toEqual(['k'])
    expect(localStorage.getItem(BACKUP)).toBe(raw)
    expect(persist.takeRestoreReport()).toEqual([
      {
        name: KEY,
        area: 'Settings',
        kind: 'entries-dropped',
        fields: [[{ key: 'parameterPresets' }, { entry: 'Mixed' }, { index: 0 }]],
        backup: 'kept'
      }
    ])
  })

  it('a full storage quota is logged once per store, counted after that, and each store reports it', async () => {
    const { useSettingsStore, useToastStore, log } = await loadSettings()
    const { usePluginStore } = await import('../../src/renderer/src/stores/pluginStore')
    const full = () =>
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new DOMException('full', 'QuotaExceededError')
      })
    vi.mocked(log.error).mockClear()
    full()
    for (let size = 0; size < 50; size++) useSettingsStore.getState().setEditorFontSize(10 + size)
    expect(log.error).toHaveBeenCalledTimes(1)
    usePluginStore.getState().setDirty(true)
    expect(log.error).toHaveBeenCalledTimes(2)
    expect(useToastStore.getState().toasts.map((t) => t.message)).toEqual([
      expect.stringContaining('recent changes to settings were not saved'),
      expect.stringContaining('recent changes to open plugins were not saved')
    ])

    vi.mocked(Storage.prototype.setItem).mockRestore()
    useSettingsStore.getState().setTheme('light')
    expect(log.warn).toHaveBeenCalledWith(
      'mz-plugin-studio-settings could not be saved 49 more times while storage was full'
    )
    full()
    useSettingsStore.getState().setTheme('dark')
    expect(log.error).toHaveBeenCalledTimes(3)
    expect(useToastStore.getState().toasts).toHaveLength(3)
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
      'Storage is full: recent changes to settings were not saved. Backup entries present: mz-plugin-studio-ui.backup; export or delete them in Settings > Data > Saved-state backups. Nothing was deleted.'
    )
    expect(Object.keys(localStorage)).toHaveLength(keysBefore)
  })
})
