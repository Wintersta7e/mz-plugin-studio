// Saved data the app cannot use is backed up and reported, and a full storage quota is reported
// once instead of thrown out of every change.
import { createElement } from 'react'
import { cleanup, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest'
import { generatePlugin } from '../../src/renderer/src/lib/generator'
import type { FieldPath } from '../../src/renderer/src/stores/persist'
import { createFakeApi } from '../helpers/fake-api'
import { savedStateOf } from './support/persisted-state'

const KEY = 'mz-plugin-studio-settings'
const BACKUP = `${KEY}.backup`
const PLUGIN_KEY = 'mz-plugin-studio-plugin'
const SEE_BACKUPS = 'Backups can be exported or deleted in Settings > Data > Saved-state backups.'
// Every saved tab here has this id
const TAB_ID = 'a'

// A saved tab every editor can read.
const tab = (name: string) => ({
  id: TAB_ID,
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

// The plugin store's saved state with this one tab open and active.
function savedTab(openPlugin: Record<string, unknown>): string {
  return JSON.stringify({
    state: {
      plugin: openPlugin,
      openPlugins: [openPlugin],
      activePluginId: TAB_ID,
      schemaVersion: 2
    },
    version: 0
  })
}

// The only element of a list; an empty list fails by name
function onlyOf<T>(items: T[]): T {
  const [first] = items
  if (first === undefined || items.length !== 1)
    throw new Error(`expected one item, got ${String(items.length)}`)
  return first
}

// The plugin store imported afresh over localStorage.
async function loadPlugins() {
  vi.resetModules()
  const { usePluginStore } = await import('../../src/renderer/src/stores/pluginStore')
  const persist = await import('../../src/renderer/src/stores/persist')
  return { usePluginStore, persist }
}

// Writes to any backup entry throw as on a full storage quota; other writes go through.
function failBackupWrites(): void {
  // The stores write to localStorage only
  const setItem = Storage.prototype.setItem.bind(localStorage)
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation((key: string, value: string) => {
    if (key.endsWith('.backup')) throw new DOMException('full', 'QuotaExceededError')
    setItem(key, value)
  })
}

// The settings store imported afresh over localStorage, with the modules it reports through.
async function loadSettings() {
  vi.resetModules()
  const { useSettingsStore } = await import('../../src/renderer/src/stores/settingsStore')
  const persist = await import('../../src/renderer/src/stores/persist')
  const { useToastStore } = await import('../../src/renderer/src/stores/toastStore')
  const { default: log } = await import('electron-log/renderer')
  return { useSettingsStore, persist, useToastStore, log }
}

// The path of a field inside the saved tab named Good
const inGood = (...steps: FieldPath): FieldPath => [
  { key: 'openPlugins' },
  { index: 0, name: 'Good' },
  ...steps
]

const at = (index: number): { index: number } => ({ index })

// Whether a reported path lies in the open tabs
const isInTabs = (path: FieldPath): boolean => {
  const first = path.at(0)
  return first !== undefined && 'key' in first && first.key === 'openPlugins'
}

// Every write throws as on a full storage quota; returns the spy
const fullStorage = (): MockInstance<Storage['setItem']> =>
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new DOMException('full', 'QuotaExceededError')
  })

function setUp(): void {
  localStorage.clear()
}

function tearDown(): void {
  vi.restoreAllMocks()
}

describe('damaged saved state: unreadable data', () => {
  beforeEach(setUp)

  afterEach(tearDown)

  it('unreadable saved data is backed up, defaults load and the report names it', async () => {
    expect.hasAssertions()

    localStorage.setItem(KEY, '{"state":')
    const { useSettingsStore, persist } = await loadSettings()

    expect(useSettingsStore.getState()).toStrictEqual(useSettingsStore.getInitialState())
    expect(localStorage.getItem(BACKUP)).toBe('{"state":')
    expect(persist.takeRestoreReport()).toStrictEqual([
      { name: KEY, area: 'Settings', kind: 'unparseable', fields: [], backup: 'kept' }
    ])

    useSettingsStore.getState().setTheme('light')
    const { theme } = savedStateOf(localStorage.getItem(KEY), KEY)

    expect([theme, localStorage.getItem(BACKUP)]).toStrictEqual(['light', '{"state":'])
  })

  it('a second identical unreadable load leaves the backup unchanged', async () => {
    expect.hasAssertions()

    localStorage.setItem(KEY, '{"state":')
    await loadSettings()
    const setItem = vi.spyOn(Storage.prototype, 'setItem')
    const { persist } = await loadSettings()

    expect(setItem).not.toHaveBeenCalledWith(BACKUP, expect.anything())
    expect(localStorage.getItem(BACKUP)).toBe('{"state":')
    expect(persist.takeRestoreReport().map((entry) => entry.kind)).toStrictEqual(['unparseable'])
  })

  it('an earlier backup is kept and the newer damage is reported as not backed up', async () => {
    expect.hasAssertions()

    localStorage.setItem(BACKUP, '{"state":1}')
    localStorage.setItem(KEY, '{"state":2}')
    const { persist } = await loadSettings()

    expect(localStorage.getItem(BACKUP)).toBe('{"state":1}')

    const entries = persist.takeRestoreReport()

    expect(entries).toStrictEqual([
      { name: KEY, area: 'Settings', kind: 'unparseable', fields: [], backup: 'earlier-copy-kept' }
    ])
    expect(persist.formatRestoreReport(entries)).toBe(
      `Settings: the saved data could not be read, so defaults were loaded; it was not copied because ${BACKUP} already holds an earlier copy, and it will be replaced at the next save. ${SEE_BACKUPS}`
    )
  })

  it('a backup that cannot be written still reports what was loaded, and that storage is full', async () => {
    expect.hasAssertions()

    localStorage.setItem(KEY, '{"state":')
    failBackupWrites()
    const { useSettingsStore, persist } = await loadSettings()

    expect(useSettingsStore.getState()).toStrictEqual(useSettingsStore.getInitialState())
    expect(localStorage.getItem(BACKUP)).toBeNull()

    const entries = persist.takeRestoreReport()

    expect(entries).toStrictEqual([
      { name: KEY, area: 'Settings', kind: 'unparseable', fields: [], backup: 'failed' }
    ])

    const text = persist.formatRestoreReport(entries)

    expect(text).toBe(
      `Settings: the saved data could not be read, so defaults were loaded; it could not be copied to ${BACKUP} because storage is full, and it will be replaced at the next save. ${SEE_BACKUPS}`
    )
    expect(text).not.toContain('already holds an earlier copy')
  })
})

describe('damaged saved state: newer schema and wrong types', () => {
  beforeEach(setUp)

  afterEach(tearDown)

  it('data from a newer schema is reported as such when its backup cannot be written', async () => {
    expect.hasAssertions()

    localStorage.setItem(KEY, JSON.stringify({ state: { schemaVersion: 99 }, version: 0 }))
    failBackupWrites()
    const { persist } = await loadSettings()

    expect(persist.takeRestoreReport()).toStrictEqual([
      { name: KEY, area: 'Settings', kind: 'newer-schema', fields: [], backup: 'failed' }
    ])
  })

  it('data from a newer schema is backed up and its known fields are kept', async () => {
    expect.hasAssertions()

    const raw = JSON.stringify({
      state: { theme: 'light', editorFontSize: 15, laterField: 'x', schemaVersion: 99 },
      version: 0
    })
    localStorage.setItem(KEY, raw)
    const { useSettingsStore, persist } = await loadSettings()
    const state = useSettingsStore.getState()

    expect({
      theme: state.theme,
      editorFontSize: state.editorFontSize,
      hasLaterField: Object.hasOwn(state, 'laterField'),
      hasSchemaVersion: Object.hasOwn(state, 'schemaVersion')
    }).toStrictEqual({
      theme: 'light',
      editorFontSize: 15,
      hasLaterField: false,
      hasSchemaVersion: false
    })
    expect(localStorage.getItem(BACKUP)).toBe(raw)
    expect(persist.takeRestoreReport().map((entry) => entry.kind)).toStrictEqual(['newer-schema'])
  })

  it('a field of the wrong type takes its default and is named in the report', async () => {
    expect.hasAssertions()

    const raw = JSON.stringify({
      state: { theme: 'purple', editorFontSize: 'big', defaultAuthor: 'Example Author' },
      version: 0
    })
    localStorage.setItem(KEY, raw)
    const { useSettingsStore, persist, log } = await loadSettings()
    const { theme, editorFontSize, defaultAuthor } = useSettingsStore.getState()

    expect([theme, editorFontSize, defaultAuthor]).toStrictEqual(['dark', 13, 'Example Author'])

    const entries = persist.takeRestoreReport()

    expect(entries).toStrictEqual([
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
    expect(log.warn).toHaveBeenCalledWith(
      `Saved ${KEY}: theme had an unexpected value and was reset`
    )
  })
})

describe('damaged saved state: open tabs', () => {
  beforeEach(setUp)

  afterEach(tearDown)

  it('an open tab that cannot be read is named in the report and the saved data is backed up', async () => {
    expect.hasAssertions()

    const raw = JSON.stringify({
      state: {
        openPlugins: [
          { ...tab('Good'), rawSource: 5 },
          { id: 'b', meta: { name: 'Broken' } }
        ],
        schemaVersion: 2
      },
      version: 0
    })
    localStorage.setItem(PLUGIN_KEY, raw)
    const { usePluginStore, persist } = await loadPlugins()

    expect(usePluginStore.getState().openPlugins.map((p) => p.id)).toStrictEqual([TAB_ID])
    expect(localStorage.getItem(`${PLUGIN_KEY}.backup`)).toBe(raw)

    const entries = persist.takeRestoreReport()

    expect(entries).toStrictEqual([
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
    expect.hasAssertions()

    const meta = Object.fromEntries(
      Object.entries(tab('NoDeps').meta).filter(([key]) => key !== 'dependencies')
    )
    localStorage.setItem(PLUGIN_KEY, savedTab({ ...tab('NoDeps'), meta }))
    vi.stubGlobal('api', createFakeApi())
    vi.stubGlobal('__APP_VERSION__', '0.0.0-test')
    try {
      vi.resetModules()
      const { default: App } = await import('../../src/renderer/src/App')
      const { useToastStore } = await import('../../src/renderer/src/stores/toastStore')
      const { usePluginStore } = await import('../../src/renderer/src/stores/pluginStore')

      expect(() => render(createElement(App))).not.toThrow()
      expect(usePluginStore.getState().plugin.meta.dependencies).toStrictEqual([])

      const messages = useToastStore.getState().toasts.map((toast) => toast.message)

      expect(messages).toStrictEqual([expect.stringContaining('dependencies of the active plugin')])
      expect(messages[0]).toContain('dependencies of open plugin NoDeps')
      expect(localStorage.getItem(`${PLUGIN_KEY}.backup`)).not.toBeNull()
    } finally {
      cleanup()
      vi.unstubAllGlobals()
    }
  }, 30_000)
})

describe('damaged saved state: tab contents', () => {
  beforeEach(setUp)

  afterEach(tearDown)

  it('parameters, command arguments and struct fields that cannot be read are left out and named', async () => {
    expect.hasAssertions()

    const raw = savedTab({
      ...tab('Good'),
      parameters: [null, { id: 'p', name: 'x' }, param('q', 'Kept')],
      commands: [
        { id: 'c', name: 'Run', text: 'Run', desc: '', args: [{ id: 'r', name: 'Arg' }] },
        { id: 'd', text: 'No name', desc: '', args: [] }
      ],
      structs: [
        { id: 's', name: 'Point', parameters: [{ ...param('t', 'X', 'number'), desc: 3 }] },
        null
      ]
    })
    localStorage.setItem(PLUGIN_KEY, raw)
    const { usePluginStore, persist } = await loadPlugins()
    const { parameters, commands, structs } = onlyOf(usePluginStore.getState().openPlugins)

    expect(parameters.map((p) => p.name)).toStrictEqual(['Kept'])
    expect(commands).toStrictEqual([{ id: 'c', name: 'Run', text: 'Run', desc: '', args: [] }])
    expect(structs.map((struct) => struct.parameters.map((p) => [p.name, p.desc]))).toStrictEqual([
      [['X', '']]
    ])
    expect(localStorage.getItem(`${PLUGIN_KEY}.backup`)).toBe(raw)

    const dropped = persist.takeRestoreReport().find((entry) => entry.kind === 'entries-dropped')

    expect(dropped?.fields.filter((path) => isInTabs(path))).toStrictEqual([
      inGood({ key: 'parameters' }, at(0)),
      inGood({ key: 'parameters' }, at(1)),
      inGood({ key: 'commands' }, at(0), { key: 'args' }, at(0)),
      inGood({ key: 'commands' }, at(1)),
      inGood({ key: 'structs' }, at(0), { key: 'parameters' }, at(0), { key: 'desc' }),
      inGood({ key: 'structs' }, at(1))
    ])
  })

  it('note group fields of the wrong type are left out and named, and the plugin code is written', async () => {
    expect.assertions(3)

    const meta = {
      ...tab('Notes').meta,
      noteParams: [
        { name: 'Face', type: 'file', dir: 7, data: true, require: 'yes' },
        { name: 'Portrait', type: 'file', dir: 'img/faces', data: 'actors', require: true }
      ]
    }
    localStorage.setItem(PLUGIN_KEY, savedTab({ ...tab('Notes'), meta }))
    const { usePluginStore, persist } = await loadPlugins()
    const { openPlugins } = usePluginStore.getState()

    expect(openPlugins.map((plugin) => plugin.meta.noteParams)).toStrictEqual([
      [
        { name: 'Face', type: 'file' },
        { name: 'Portrait', type: 'file', dir: 'img/faces', data: 'actors', require: true }
      ]
    ])

    const face = [{ key: 'meta' }, { key: 'noteParams' }, { index: 0 }]
    const inTab = [{ key: 'openPlugins' }, { index: 0, name: 'Notes' }, ...face]
    const dropped = persist.takeRestoreReport().find((entry) => entry.kind === 'entries-dropped')

    expect(dropped?.fields).toStrictEqual(
      [[{ key: 'plugin' }, ...face], inTab].flatMap((path) =>
        ['dir', 'data', 'require'].map((key) => [...path, { key }])
      )
    )
    expect(() => openPlugins.map((plugin) => generatePlugin(plugin))).not.toThrow()
  })
})

describe('damaged saved state: unknown keys', () => {
  beforeEach(setUp)

  afterEach(tearDown)

  it('an unknown key of any spelling is named as written and the report still names its tab', async () => {
    expect.hasAssertions()

    const keys = ['old (v1)', 'x.y', 'a["\\q"]', 'toString']
    localStorage.setItem(
      PLUGIN_KEY,
      savedTab({
        ...tab('Good'),
        parameters: keys.map((key) => ({ ...param('p', 'X'), [key]: 1 }))
      })
    )
    const { usePluginStore, persist } = await loadPlugins()

    expect(onlyOf(usePluginStore.getState().openPlugins).parameters).toHaveLength(keys.length)

    const entries = persist.takeRestoreReport()
    let text = ''

    expect(() => (text = persist.formatRestoreReport(entries))).not.toThrow()

    const named = keys.map(
      (key, index) => `${key} of parameter ${String(index + 1)} of open plugin Good`
    )
    named[3] = 'to string of parameter 4 of open plugin Good'
    for (const words of named) expect(text).toContain(words)

    expect(text).not.toContain('v1) (Good')
  })
})

describe('damaged saved state: presets and full storage', () => {
  beforeEach(setUp)

  afterEach(tearDown)

  it('a preset parameter that cannot be read is left out on every load', async () => {
    expect.hasAssertions()

    const raw = JSON.stringify({
      state: {
        parameterPresets: { Mixed: [{}, param('k', 'Kept')] },
        schemaVersion: 1
      },
      version: 0
    })
    localStorage.setItem(KEY, raw)
    const { useSettingsStore, persist } = await loadSettings()
    const presets = Object.entries(useSettingsStore.getState().parameterPresets)

    expect(presets.map(([name, params]) => [name, params.map((p) => p.id)])).toStrictEqual([
      ['Mixed', ['k']]
    ])
    expect(localStorage.getItem(BACKUP)).toBe(raw)
    expect(persist.takeRestoreReport()).toStrictEqual([
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
    expect.hasAssertions()

    const { useSettingsStore, useToastStore, log } = await loadSettings()
    const { usePluginStore } = await import('../../src/renderer/src/stores/pluginStore')
    const errors = vi.spyOn(log, 'error')
    errors.mockClear()
    const full = fullStorage()
    for (let size = 0; size < 50; size++) useSettingsStore.getState().setEditorFontSize(10 + size)

    expect(errors).toHaveBeenCalledTimes(1)

    usePluginStore.getState().setDirty(true)

    expect(errors).toHaveBeenCalledTimes(2)
    expect(useToastStore.getState().toasts.map((toast) => toast.message)).toStrictEqual([
      expect.stringContaining('recent changes to settings were not saved'),
      expect.stringContaining('recent changes to open plugins were not saved')
    ])

    full.mockRestore()
    useSettingsStore.getState().setTheme('light')

    expect(log.warn).toHaveBeenCalledWith(
      'mz-plugin-studio-settings could not be saved 49 more times while storage was full'
    )

    fullStorage()
    useSettingsStore.getState().setTheme('dark')

    expect([errors.mock.calls.length, useToastStore.getState().toasts.length]).toStrictEqual([3, 3])
  })

  it('a full storage quota is logged and reported once, and set does not throw', async () => {
    expect.hasAssertions()

    localStorage.setItem('mz-plugin-studio-ui.backup', '{"state":')
    const { useSettingsStore, useToastStore, log } = await loadSettings()
    const keysBefore = Object.keys(localStorage).length
    fullStorage()

    expect(() => {
      useSettingsStore.getState().setTheme('light')
      useSettingsStore.getState().setEditorFontSize(16)
    }).not.toThrow()
    expect(log.error).toHaveBeenCalledWith(
      `Storage is full; ${KEY} was not saved:`,
      expect.any(DOMException)
    )
    expect(useToastStore.getState().toasts.map((toast) => toast.message)).toStrictEqual([
      'Storage is full: recent changes to settings were not saved. Backup entries present: mz-plugin-studio-ui.backup; export or delete them in Settings > Data > Saved-state backups. Nothing was deleted.'
    ])
    expect(Object.keys(localStorage)).toHaveLength(keysBefore)
  })
})
