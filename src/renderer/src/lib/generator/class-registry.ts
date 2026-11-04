/**
 * MZ Class Registry
 *
 * Provides TypeScript-typed access to RPG Maker MZ class data.
 * Used by the code generator for class/method lookups and UI dropdowns.
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
  /** Popularity weight from plugin dictionary analysis (higher = more commonly overridden) */
  popularity?: number
}

export interface MZClassInfo {
  name: string
  file: string
  category: ClassCategory
  parent?: string
  description: string
  methods: MZMethodInfo[]
  /** Popularity weight from plugin dictionary analysis (higher = more commonly used) */
  popularity?: number
}

// ============================================================================
// Internal Data Access
// ============================================================================

// Type assertion for the imported JSON data
const mzClasses = mzClassesData as Record<string, MZClassInfo>

// ============================================================================
// Exported Functions
// ============================================================================

/**
 * Returns sorted array of all class names
 */
export function getAllClassNames(): string[] {
  return Object.keys(mzClasses).sort()
}

/**
 * Filter classes by category
 */
function getClassesByCategory(category: ClassCategory): MZClassInfo[] {
  return Object.values(mzClasses).filter((cls) => cls.category === category)
}

/**
 * Get single class info by name
 */
export function getClassInfo(className: string): MZClassInfo | undefined {
  return mzClasses[className]
}

/**
 * Get methods for a class
 */
export function getClassMethods(className: string): MZMethodInfo[] {
  const classInfo = mzClasses[className]
  return classInfo?.methods ?? []
}

/**
 * Get specific method info from a class
 */
export function getMethodInfo(className: string, methodName: string): MZMethodInfo | undefined {
  const methods = getClassMethods(className)
  return methods.find((m) => m.name === methodName)
}

/**
 * All classes grouped by category
 */
export function getClassesGrouped(): Record<ClassCategory, MZClassInfo[]> {
  const categories: ClassCategory[] = ['core', 'manager', 'object', 'scene', 'sprite', 'window']

  const result = {} as Record<ClassCategory, MZClassInfo[]>

  for (const category of categories) {
    result[category] = getClassesByCategory(category)
  }

  return result
}
