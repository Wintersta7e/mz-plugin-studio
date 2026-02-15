// RPG Maker MZ Project Types

export interface MZProject {
  path: string
  gameTitle: string
  system: {
    switches: string[]
    variables: string[]
  }
  actors: MZActor[]
  items: MZItem[]
  maps: MZMapInfo[]
  plugins: MZPluginEntry[]
  skills: MZSkill[]
  weapons: MZWeapon[]
  armors: MZArmor[]
  enemies: MZEnemy[]
  states: MZState[]
  animations: MZAnimation[]
  tilesets: MZTileset[]
  commonEvents: MZCommonEvent[]
  classes: MZClass[]
  troops: MZTroop[]
}

export interface MZSwitch {
  id: number
  name: string
}

export interface MZVariable {
  id: number
  name: string
}

export interface MZActor {
  id: number
  name: string
  note: string
  noteTags?: Record<string, string>
}

export interface MZItem {
  id: number
  name: string
  note: string
  noteTags?: Record<string, string>
}

export interface MZMapInfo {
  id: number
  name: string
  parentId: number
}

export interface MZPluginEntry {
  name: string
  status: boolean
  description: string
  parameters: Record<string, string>
}

// Common MZ data types for parameter dropdowns
export interface MZClass {
  id: number
  name: string
}

export interface MZSkill {
  id: number
  name: string
}

export interface MZWeapon {
  id: number
  name: string
}

export interface MZArmor {
  id: number
  name: string
}

export interface MZEnemy {
  id: number
  name: string
}

export interface MZTroop {
  id: number
  name: string
}

export interface MZState {
  id: number
  name: string
}

export interface MZAnimation {
  id: number
  name: string
}

export interface MZTileset {
  id: number
  name: string
}

export interface MZCommonEvent {
  id: number
  name: string
}
