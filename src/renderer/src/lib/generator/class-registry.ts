/**
MZ Class Registry

Provides TypeScript-typed access to RPG Maker MZ class data.
Used by the code generator for class/method lookups and UI dropdowns.
*/

import mzClassesData from '../../data/mz-classes.json'

// ============================================================================
// Types
// ============================================================================

export type ClassCategory = 'core' | 'manager' | 'object' | 'scene' | 'sprite' | 'window'

export interface MZMethodInfo {
  name: string
  params: string[]
  description: string
  returnType?: string
  /**
  Popularity weight from plugin dictionary analysis (higher = more commonly overridden)
  */
  popularity?: number
}

export interface MZClassInfo {
  name: string
  file: string
  category: ClassCategory
  parent?: string
  description: string
  methods: MZMethodInfo[]
  /**
  Popularity weight from plugin dictionary analysis (higher = more commonly used)
  */
  popularity?: number
}

// ============================================================================
// Internal Data Access
// ============================================================================

const CATEGORIES: readonly ClassCategory[] = [
  'core',
  'manager',
  'object',
  'scene',
  'sprite',
  'window'
]

// The dictionary by class name; a class whose category is not one of CATEGORIES is left out
const mzClasses = new Map<string, MZClassInfo>(
  Object.entries(mzClassesData).flatMap(([name, info]): [string, MZClassInfo][] => {
    const category = CATEGORIES.find((known) => known === info.category)
    return category === undefined ? [] : [[name, { ...info, category }]]
  })
)

// Code-unit order, as a sort without a compare function orders strings
function byCodeUnit(a: string, b: string): number {
  if (a === b) return 0
  return a < b ? -1 : 1
}

// ============================================================================
// Exported Functions
// ============================================================================

/**
Returns sorted array of all class names
*/
export function getAllClassNames(): string[] {
  return mzClasses.keys().toArray().toSorted(byCodeUnit)
}

/**
Filter classes by category
*/
function getClassesByCategory(category: ClassCategory): MZClassInfo[] {
  return mzClasses
    .values()
    .filter((cls) => cls.category === category)
    .toArray()
}

/**
Get single class info by name
*/
export function getClassInfo(className: string): MZClassInfo | undefined {
  return mzClasses.get(className)
}

/**
Get methods for a class
*/
export function getClassMethods(className: string): MZMethodInfo[] {
  return mzClasses.get(className)?.methods ?? []
}

/**
Get specific method info from a class
*/
export function getMethodInfo(className: string, methodName: string): MZMethodInfo | undefined {
  const methods = getClassMethods(className)
  return methods.find((m) => m.name === methodName)
}

/**
All classes grouped by category
*/
export function getClassesGrouped(): Record<ClassCategory, MZClassInfo[]> {
  return {
    core: getClassesByCategory('core'),
    manager: getClassesByCategory('manager'),
    object: getClassesByCategory('object'),
    scene: getClassesByCategory('scene'),
    sprite: getClassesByCategory('sprite'),
    window: getClassesByCategory('window')
  }
}
