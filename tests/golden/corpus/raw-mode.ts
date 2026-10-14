// The fixture plugins as the app loads them, and the kinds of edit a user makes before raw mode
// writes the file back. Edits are total: one with no target returns the copy unchanged.
import { readdirSync, readFileSync } from 'fs'
import { PluginParser } from '../../../src/main/services/pluginParser'
import type { PluginDefinition } from '../../../src/shared/types/plugin'
import { fixturePath } from '../../helpers/fixture-project'

export type EditName =
  | 'none'
  | 'meta-description'
  | 'param-added'
  | 'param-removed'
  | 'param-default'
  | 'command-added'
  | 'command-arg-added'
  | 'struct-field-added'

export interface Edit {
  name: EditName
  apply(def: PluginDefinition): PluginDefinition
}

function edit(name: EditName, change: (def: PluginDefinition) => void): Edit {
  return {
    name,
    apply(def) {
      const copy = structuredClone(def)
      change(copy)
      return copy
    }
  }
}

export const EDITS: readonly Edit[] = [
  edit('none', () => {}),
  edit('meta-description', (def) => {
    def.meta.description = 'Edited description'
  }),
  edit('param-added', (def) => {
    def.parameters.push({
      id: 'added-param',
      name: 'AddedParam',
      text: 'Added Param',
      desc: 'Added parameter',
      type: 'string',
      default: 'added'
    })
  }),
  edit('param-removed', (def) => {
    def.parameters.pop()
  }),
  edit('param-default', (def) => {
    const first = def.parameters[0]
    if (first === undefined) return
    if (first.type === 'number') first.default = 42
    else if (first.type === 'boolean') first.default = first.default !== true
    else first.default = 'edited'
  }),
  edit('command-added', (def) => {
    def.commands.push({
      id: 'added-command',
      name: 'AddedCommand',
      text: 'Added Command',
      desc: 'Added command',
      args: []
    })
  }),
  edit('command-arg-added', (def) => {
    def.commands[0]?.args.push({
      id: 'added-arg',
      name: 'addedArg',
      text: 'Added Arg',
      desc: '',
      type: 'number',
      default: 0
    })
  }),
  edit('struct-field-added', (def) => {
    def.structs[0]?.parameters.push({
      id: 'added-field',
      name: 'addedField',
      text: 'Added Field',
      desc: '',
      type: 'string',
      default: ''
    })
  })
]

/** File names in the fixture project's plugin folder, sorted. */
export function fixturePlugins(): string[] {
  return readdirSync(fixturePath('js', 'plugins')).sort()
}

/** Parses a fixture plugin from the same text the load handler reads (a BOM is kept). */
export function loadFixture(file: string): PluginDefinition {
  return PluginParser.parsePlugin(readFileSync(fixturePath('js', 'plugins', file), 'utf-8'), file)
}
