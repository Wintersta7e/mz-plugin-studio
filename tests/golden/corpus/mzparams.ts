// A parameter export as the released version wrote it, and the plugin it is imported into.
// Between them the parameters set every parameter field, one number field the user cleared
// (NaN, written as null) and a description that closes a comment and spans two lines.
import { resolve } from 'path'
import type { PluginDefinition, PluginParameter } from '../../../src/shared/types/plugin'

/** The export fixture, resolved from the repository root like the other fixture helpers. */
export const V160_FIXTURE = resolve(process.cwd(), 'tests/fixtures/mzparams/v1.6.0.mzparams')

export const V160_SOURCE = 'Fixture_Params'

export const V160_PARAMS: PluginParameter[] = [
  {
    id: 'speed',
    name: 'Speed',
    text: 'Speed',
    desc: 'All limits cleared.',
    type: 'number',
    default: 5,
    min: Number.NaN,
    max: Number.NaN,
    decimals: Number.NaN
  },
  {
    id: 'count',
    name: 'Count',
    text: 'Count',
    desc: 'How many to show.',
    type: 'number',
    default: 3,
    min: 0,
    max: 99,
    decimals: 0
  },
  {
    id: 'mode',
    name: 'Mode',
    text: 'Mode',
    desc: 'How fast it moves.',
    type: 'select',
    default: 'fast',
    options: [
      { value: 'fast', text: 'Fast' },
      { value: 'slow', text: 'Slow' }
    ]
  },
  {
    id: 'enabled',
    name: 'Enabled',
    text: 'Enabled',
    desc: 'Turns it on.',
    type: 'boolean',
    default: true,
    onLabel: 'On',
    offLabel: 'Off',
    parent: 'Mode'
  },
  {
    id: 'picture',
    name: 'Picture',
    text: 'Picture',
    desc: 'Image to show.',
    type: 'file',
    default: '',
    dir: 'img/pictures/',
    require: true
  },
  {
    id: 'points',
    name: 'Points',
    text: 'Points',
    desc: 'Positions to visit.',
    type: 'array',
    default: '[]',
    arrayType: 'struct',
    structType: 'Point'
  },
  {
    id: 'tint',
    name: 'Tint',
    text: 'Tint',
    desc: 'Ends a comment */ here\nand goes on.',
    type: 'color',
    default: '0',
    rawType: 'color'
  }
]

/** The plugin the exported parameters are imported into. */
export const MZPARAMS_HOST: PluginDefinition = {
  id: 'mzparams-host',
  meta: {
    name: 'Fixture_ParamsHost',
    version: '1.0.0',
    author: 'Example Author',
    description: 'Holds imported parameters',
    help: '',
    url: 'https://example.invalid/params-host',
    target: 'MZ',
    dependencies: []
  },
  parameters: [],
  commands: [],
  structs: [
    {
      id: 'point',
      name: 'Point',
      parameters: [
        { id: 'x', name: 'x', text: 'X', desc: '', type: 'number', default: 0 },
        { id: 'y', name: 'y', text: 'Y', desc: '', type: 'number', default: 0 }
      ]
    }
  ]
}
