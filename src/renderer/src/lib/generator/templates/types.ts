/**
 * Template System Type Definitions
 * Core types for the MZ Plugin Studio code template system
 */

// Template category enum
export type TemplateCategory =
  | 'method-alias'
  | 'custom-window'
  | 'scene-hooks'
  | 'database-ext'
  | 'plugin-command'
  | 'save-load'
  | 'input-handler'
  | 'battle-system'
  | 'sprite-system'
  | 'map-events'
  | 'menu-system'
  | 'audio-system'
  | 'message-system'
  | 'actor-party'

// Option for select-type fields
export interface SelectOption {
  value: string
  label: string
  group?: string // For grouped dropdowns
  description?: string
}

// Template field types for the form
export interface TemplateField {
  id: string
  label: string
  type: 'text' | 'select' | 'number' | 'boolean' | 'class-select' | 'method-select' | 'key-select'
  options?: SelectOption[]
  default?: string | number | boolean
  dependsOn?: { field: string; value: unknown } // Conditional display
  required?: boolean
  placeholder?: string
  help?: string
  group?: string // For grouping fields visually
}

// Validation result from template validate function
export interface ValidationResult {
  valid: boolean
  errors: string[]
}

// Main template definition
export interface CodeTemplate {
  id: string
  category: TemplateCategory
  name: string
  description: string
  docUrl?: string // Link to relevant RPG Maker MZ documentation
  icon: string // Lucide icon name
  fields: TemplateField[]
  generate: (values: Record<string, unknown>) => string
  validate?: (values: Record<string, unknown>) => ValidationResult
}

// Category metadata for UI
export interface CategoryInfo {
  id: TemplateCategory
  name: string
  description: string
  icon: string
  order: number
}

// Category definitions with metadata
export const CATEGORIES: CategoryInfo[] = [
  {
    id: 'method-alias',
    name: 'Method Aliasing',
    description: 'Extend existing game functions',
    icon: 'GitBranch',
    order: 1
  },
  {
    id: 'custom-window',
    name: 'Custom Windows',
    description: 'Create UI elements',
    icon: 'PanelTop',
    order: 2
  },
  {
    id: 'scene-hooks',
    name: 'Scene Hooks',
    description: 'React to game screens',
    icon: 'Play',
    order: 3
  },
  {
    id: 'database-ext',
    name: 'Notetags',
    description: 'Parse database metadata',
    icon: 'Tag',
    order: 4
  },
  {
    id: 'plugin-command',
    name: 'Plugin Commands',
    description: 'Event-callable functions',
    icon: 'Terminal',
    order: 5
  },
  {
    id: 'save-load',
    name: 'Save/Load',
    description: 'Persist custom data',
    icon: 'Save',
    order: 6
  },
  {
    id: 'input-handler',
    name: 'Input Handler',
    description: 'Key and button reactions',
    icon: 'Keyboard',
    order: 7
  },
  {
    id: 'battle-system',
    name: 'Battle System',
    description: 'Combat modifications',
    icon: 'Swords',
    order: 8
  },
  {
    id: 'sprite-system',
    name: 'Sprites',
    description: 'Custom sprites and animations',
    icon: 'Image',
    order: 9
  },
  {
    id: 'map-events',
    name: 'Map & Events',
    description: 'Map and event manipulation',
    icon: 'Map',
    order: 10
  },
  {
    id: 'menu-system',
    name: 'Menu System',
    description: 'Menu and scene customization',
    icon: 'Menu',
    order: 11
  },
  {
    id: 'audio-system',
    name: 'Audio',
    description: 'Sound and music control',
    icon: 'Volume2',
    order: 12
  },
  {
    id: 'message-system',
    name: 'Messages',
    description: 'Text and dialogue systems',
    icon: 'MessageSquare',
    order: 13
  },
  {
    id: 'actor-party',
    name: 'Actor & Party',
    description: 'Character and party systems',
    icon: 'Users',
    order: 14
  }
]
