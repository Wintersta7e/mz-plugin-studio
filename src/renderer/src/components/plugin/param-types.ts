import type { ParamType } from '../../types/plugin'

export interface ParamTypeOption {
  value: ParamType
  label: string
  desc: string
}

interface ParamTypeGroup {
  group: string
  types: ParamTypeOption[]
}

/**
The types a parameter can have, grouped as its type picker lists them
*/
export const PARAM_TYPE_GROUPS: ParamTypeGroup[] = [
  {
    group: 'Basic',
    types: [
      { value: 'string', label: 'String', desc: 'Single-line text input' },
      { value: 'number', label: 'Number', desc: 'Numeric value with optional min/max' },
      { value: 'boolean', label: 'Boolean', desc: 'ON/OFF toggle switch' },
      { value: 'color', label: 'Color', desc: 'Hex color picker' },
      { value: 'hidden', label: 'Hidden', desc: 'Internal value, hidden in MZ' }
    ]
  },
  {
    group: 'Text',
    types: [
      {
        value: 'text',
        label: 'Text',
        desc: 'MV-legacy multi-line text — prefer Note for new plugins'
      },
      { value: 'note', label: 'Note', desc: 'Large multi-line JSON-safe text' }
    ]
  },
  {
    group: 'Lists',
    types: [
      { value: 'select', label: 'Select', desc: 'Fixed dropdown list' },
      { value: 'combo', label: 'Combo', desc: 'Editable dropdown with suggestions' }
    ]
  },
  {
    group: 'Game Data',
    types: [
      { value: 'variable', label: 'Variable', desc: 'Game variable picker' },
      { value: 'switch', label: 'Switch', desc: 'Game switch picker' },
      { value: 'actor', label: 'Actor', desc: 'Actor from database' },
      { value: 'class', label: 'Class', desc: 'Class from database' },
      { value: 'skill', label: 'Skill', desc: 'Skill from database' },
      { value: 'item', label: 'Item', desc: 'Item from database' },
      { value: 'weapon', label: 'Weapon', desc: 'Weapon from database' },
      { value: 'armor', label: 'Armor', desc: 'Armor from database' },
      { value: 'enemy', label: 'Enemy', desc: 'Enemy from database' },
      { value: 'troop', label: 'Troop', desc: 'Troop from database' },
      { value: 'state', label: 'State', desc: 'State from database' },
      { value: 'animation', label: 'Animation', desc: 'Animation from database' },
      { value: 'tileset', label: 'Tileset', desc: 'Tileset from database' },
      { value: 'common_event', label: 'Common Event', desc: 'Common event picker' },
      { value: 'map', label: 'Map', desc: 'Map ID picker' },
      { value: 'location', label: 'Location', desc: 'Map + (x, y) coordinate picker' },
      { value: 'icon', label: 'Icon', desc: 'Icon index picker' }
    ]
  },
  {
    group: 'Files',
    types: [{ value: 'file', label: 'File', desc: 'File path relative to project' }]
  },
  {
    group: 'Structure',
    types: [
      { value: 'struct', label: 'Struct', desc: 'Nested object with typed fields' },
      { value: 'array', label: 'Array', desc: 'List of elements of a single type' }
    ]
  }
]

/**
The types a command argument can have: RPG Maker MZ gives `@arg` the same types as `@param`,
so these are the parameter types, without their groups.
*/
export const ARG_TYPES: ParamTypeOption[] = PARAM_TYPE_GROUPS.flatMap((g) => g.types)
