// Synthetic open-plugin states whose saved form is pinned: one large tab, a very large one, many
// tabs, and imported tabs carrying their file text. Built from fixed ids so each run saves the
// same bytes; no store is imported here, so the golden inventory can read the names under node.
import {
  ALL_PARAM_TYPES,
  toBaseline,
  type ParamType,
  type PluginCommand,
  type PluginDefinition,
  type PluginParameter
} from '../../../src/shared/types/plugin'

export interface PersistedSeed {
  name: string
  state: Record<string, unknown>
}

const isParamType = (value: string): value is ParamType => ALL_PARAM_TYPES.has(value)
const TYPES: ParamType[] = [...ALL_PARAM_TYPES].filter((type) => isParamType(type))
const SHA256 = '0123456789abcdef'.repeat(4)
const PLUGINS_DIR = '/fixture/mz-project/js/plugins'

const pad = (n: number): string => String(n).padStart(4, '0')

function parameters(prefix: string, count: number): PluginParameter[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `${prefix}-param-${pad(index)}`,
    name: `param${pad(index)}`,
    text: `Parameter ${pad(index)}`,
    desc: `Synthetic parameter ${pad(index)}.`,
    // The cycle reaches every parameter type the app knows
    type: TYPES[index % TYPES.length] ?? 'string',
    default: ''
  }))
}

function commands(prefix: string, count: number): PluginCommand[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `${prefix}-command-${pad(index)}`,
    name: `command${pad(index)}`,
    text: `Command ${pad(index)}`,
    desc: '',
    args: []
  }))
}

function definition(
  id: string,
  name: string,
  counts: { parameters: number; commands: number }
): PluginDefinition {
  return {
    id,
    meta: {
      name,
      version: '1.0.0',
      author: 'Example Author',
      description: `Synthetic plugin ${name}.`,
      help: '',
      url: '',
      target: 'MZ',
      dependencies: [],
      orderAfter: [],
      orderBefore: [],
      noteParams: [],
      localizations: {}
    },
    parameters: parameters(id, counts.parameters),
    commands: commands(id, counts.commands),
    structs: []
  }
}

// About 20,000 characters of plugin file text holding one character outside Latin-1.
function rawSource(name: string): string {
  const header = `/*:\n * @target MZ\n * @plugindesc Synthetic imported plugin ${name} テ\n */\n`
  const lines = Array.from(
    { length: 640 },
    (_, index) => `const value${pad(index)} = ${String(index)};\n`
  )
  return header + lines.join('')
}

// The store state of `tabs` open, the last one active.
function openState(
  tabs: PluginDefinition[],
  extra: Record<string, unknown> = {}
): Record<string, unknown> {
  const active = tabs.at(-1)
  return {
    plugin: active,
    openPlugins: tabs,
    activePluginId: active?.id,
    isDirty: false,
    savedPath: undefined,
    dirtyByPluginId: {},
    savedPathsByPluginId: {},
    baselineByPluginId: {},
    baseByPluginId: {},
    ...extra
  }
}

function importedShape(): Record<string, unknown> {
  const tabs = Array.from({ length: 4 }, (_, index): PluginDefinition => {
    const name = `Synthetic_Imported${String(index + 1)}`
    return {
      ...definition(`imported-${String(index + 1)}`, name, { parameters: 20, commands: 2 }),
      rawSource: rawSource(name),
      importedFrom: `${name}.js`
    }
  })
  const byId = <T>(value: (tab: PluginDefinition) => T): Record<string, T> =>
    Object.fromEntries(tabs.map((tab) => [tab.id, value(tab)]))
  const dirtyId = tabs[1]?.id ?? ''
  return openState(tabs, {
    dirtyByPluginId: { [dirtyId]: true },
    savedPathsByPluginId: byId((tab) => `${PLUGINS_DIR}/${tab.importedFrom ?? ''}`),
    baselineByPluginId: byId((tab) => toBaseline(tab)),
    baseByPluginId: byId((tab) => ({
      path: `${PLUGINS_DIR}/${tab.importedFrom ?? ''}`,
      sha256: SHA256
    }))
  })
}

export const PERSISTED_SEEDS: readonly PersistedSeed[] = [
  {
    name: 'p200',
    state: openState([definition('p200-1', 'Synthetic_P200', { parameters: 200, commands: 10 })])
  },
  {
    name: 'p1000',
    state: openState([definition('p1000-1', 'Synthetic_P1000', { parameters: 1000, commands: 0 })])
  },
  {
    name: 'tabs20',
    state: openState(
      Array.from({ length: 20 }, (_, index) =>
        definition(`tabs20-${String(index + 1)}`, `Synthetic_Tab${String(index + 1)}`, {
          parameters: 50,
          commands: 5
        })
      )
    )
  },
  { name: 'imported-shape', state: importedShape() }
]
