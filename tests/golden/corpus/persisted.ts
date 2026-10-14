/// <reference types="vite/client" />
// Every store that saves itself to localStorage, and a populated state for each: what a user
// who has worked in the app for a while has saved. Names and paths are synthetic.
import { fileURLToPath } from 'url'
import type { PluginDefinition, PluginParameter } from '../../../src/shared/types/plugin'
import { FROZEN_TIME } from './normalise'

export interface PersistedStore {
  key: string
  /** Absolute path, so a test can import the module afresh after `vi.resetModules()`. */
  modulePath: string
  exportName: string
}

interface PersistApi {
  persist: { getOptions(): { name?: string } }
}

const hasPersist = (value: unknown): value is PersistApi =>
  typeof value === 'function' &&
  typeof (value as Partial<PersistApi>).persist?.getOptions === 'function'

const modules = import.meta.glob<Record<string, unknown>>('../../../src/renderer/src/stores/*.ts', {
  eager: true
})

/** Store hooks with a persist name, from the module that defines each (not the barrel). */
export function persistedStores(): PersistedStore[] {
  const stores: PersistedStore[] = []
  for (const [path, exports] of Object.entries(modules)) {
    if (path.endsWith('/index.ts')) continue
    for (const [exportName, value] of Object.entries(exports)) {
      const key = hasPersist(value) ? value.persist.getOptions().name : undefined
      if (key === undefined) continue
      stores.push({ key, modulePath: fileURLToPath(new URL(path, import.meta.url)), exportName })
    }
  }
  return stores.sort((a, b) => a.key.localeCompare(b.key))
}

const ROOT = '/fixture/mz-project'

// A number field the user cleared: the input stores NaN, which JSON writes as null.
const clearedNumber = (id: string, name: string): PluginParameter => ({
  id,
  name,
  text: name,
  desc: 'Cleared minimum.',
  type: 'number',
  default: 5,
  min: Number.NaN,
  max: 10
})

const created: PluginDefinition = {
  id: 'created-plugin',
  meta: {
    name: 'Fixture_Created',
    version: '1.0.0',
    author: 'Example Author',
    description: 'Created in the app',
    help: '',
    url: 'https://example.invalid/created',
    target: 'MZ',
    dependencies: [],
    orderAfter: [],
    orderBefore: [],
    noteParams: [],
    localizations: {}
  },
  parameters: [clearedNumber('created-speed', 'Speed')],
  commands: [],
  structs: [],
  customCode: "console.log('Fixture_Created loaded');"
}

const imported: PluginDefinition = {
  id: 'imported-plugin',
  meta: {
    name: 'Fixture_Imported',
    version: '1.0.0',
    author: 'Example Author',
    description: 'Opened from the project',
    help: '',
    url: '',
    target: 'MZ',
    dependencies: []
  },
  parameters: [
    {
      id: 'imported-label',
      name: 'Label',
      text: 'Label',
      desc: 'Text to show.',
      type: 'string',
      default: 'Hello'
    }
  ],
  commands: [],
  structs: [],
  codeBody:
    "(() => {\n    const label = PluginManager.parameters('Fixture_Imported')['Label'];\n})();",
  rawSource:
    "/*:\n * @target MZ\n * @param Label\n * @default Hello\n */\n(() => {\n    const label = PluginManager.parameters('Fixture_Imported')['Label'];\n})();\n"
}

const unsaved: PluginDefinition = {
  id: 'new-plugin',
  meta: {
    name: 'NewPlugin',
    version: '1.0.0',
    author: '',
    description: '',
    help: '',
    url: '',
    target: 'MZ',
    dependencies: [],
    orderAfter: [],
    orderBefore: [],
    noteParams: [],
    localizations: {}
  },
  parameters: [],
  commands: [],
  structs: []
}

const RECENT = Date.parse(FROZEN_TIME)

/** Per store key, the state a test sets before reading what the store saved. */
export const POPULATED: Record<string, Record<string, unknown>> = {
  'mz-plugin-studio-plugin': {
    plugin: imported,
    openPlugins: [created, imported, unsaved],
    activePluginId: 'imported-plugin',
    isDirty: true,
    savedPath: `${ROOT}/js/plugins/Fixture_Imported.js`,
    dirtyByPluginId: { 'created-plugin': false, 'imported-plugin': true, 'new-plugin': true },
    savedPathsByPluginId: {
      'created-plugin': `${ROOT}/js/plugins/Fixture_Created.js`,
      'imported-plugin': `${ROOT}/js/plugins/Fixture_Imported.js`
    }
  },
  'mz-plugin-studio-ui': {
    sidebarWidth: 320,
    previewWidth: 640,
    previewCollapsed: true,
    lastTemplateCategory: 'audio-system',
    rawModeByPluginId: { 'imported-plugin': true, 'created-plugin': false }
  },
  'mz-plugin-studio-settings': {
    theme: 'light',
    editorFontSize: 16,
    editorWordWrap: false,
    editorMinimap: true,
    editorLineNumbers: false,
    defaultAuthor: 'Example Author',
    parameterPresets: {
      Timing: [clearedNumber('preset-delay', 'Delay')],
      Labels: [
        {
          id: 'preset-title',
          name: 'Title',
          text: 'Title',
          desc: 'Window title.',
          type: 'string',
          default: 'Status'
        }
      ]
    },
    debugLogging: true
  },
  'mz-plugin-studio-project': {
    recentProjects: [ROOT, '/fixture/other-project']
  },
  'mz-plugin-studio-templates': {
    favorites: ['method-alias-basic', 'save-load-basic'],
    recentlyUsed: [
      { id: 'audio-bgm-control', timestamp: RECENT },
      { id: 'method-alias-basic', timestamp: RECENT - 60_000 }
    ]
  }
}
