// Names the generator derives, read back from the code `generatePlugin` writes, so tests reach
// them through the generator's public functions alone.
import { generatePlugin } from '../../src/renderer/src/lib/generator/index'
import type { PluginDefinition } from '../../src/shared/types/plugin'

const PARAMS_LINE = '    const params = PluginManager.parameters(PLUGIN_NAME);'
const CONSTANT_PREFIX = '    const '

/**
The constant the generated code reads a parameter named `name` into.
*/
export function parameterConstant(name: string): string {
  const definition: PluginDefinition = {
    id: 'names',
    meta: {
      name: 'Names',
      version: '1.0.0',
      author: '',
      description: '',
      help: '',
      url: '',
      target: 'MZ',
      dependencies: []
    },
    parameters: [{ id: 'p', name, text: 'P', desc: '', type: 'string', default: '' }],
    commands: [],
    structs: []
  }
  const lines = generatePlugin(definition).split('\n')
  // A blank line follows the parameters line, then the parameter's own line
  const line = lines.at(lines.indexOf(PARAMS_LINE) + 2) ?? ''
  if (!line.startsWith(CONSTANT_PREFIX)) throw new Error(`no constant for ${JSON.stringify(name)}`)
  return line.slice(CONSTANT_PREFIX.length, line.indexOf(' = '))
}
