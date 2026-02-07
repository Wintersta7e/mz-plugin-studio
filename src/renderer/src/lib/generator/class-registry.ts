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
}

export interface MZClassInfo {
  name: string
  file: string
  category: ClassCategory
  parent?: string
  description: string
  methods: MZMethodInfo[]
}

export interface SearchResult {
  type: 'class' | 'method'
  className: string
  methodName?: string
  info: string
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
export function getClassesByCategory(category: ClassCategory): MZClassInfo[] {
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

/**
 * Get class options for select dropdowns
 */
export function getClassOptions(): { value: string; label: string; category: string }[] {
  return getAllClassNames().map((name) => {
    const classInfo = mzClasses[name]
    return {
      value: name,
      label: name,
      category: classInfo.category
    }
  })
}

/**
 * Get method options for a class (for select dropdowns)
 */
export function getMethodOptions(className: string): { value: string; label: string }[] {
  const methods = getClassMethods(className)
  return methods.map((method) => ({
    value: method.name,
    label: `${method.name}(${method.params.join(', ')})`
  }))
}

/**
 * Search classes and methods (case-insensitive)
 * Returns max 50 results
 */
export function searchClassesAndMethods(query: string): SearchResult[] {
  const results: SearchResult[] = []
  const lowerQuery = query.toLowerCase()
  const maxResults = 50

  // Search through all classes
  for (const className of Object.keys(mzClasses)) {
    if (results.length >= maxResults) break

    const classInfo = mzClasses[className]
    const lowerClassName = className.toLowerCase()
    const lowerDescription = classInfo.description.toLowerCase()

    // Check if class name or description matches
    if (lowerClassName.includes(lowerQuery) || lowerDescription.includes(lowerQuery)) {
      results.push({
        type: 'class',
        className,
        info: classInfo.description
      })
    }

    // Search methods within this class
    for (const method of classInfo.methods) {
      if (results.length >= maxResults) break

      const lowerMethodName = method.name.toLowerCase()
      const lowerMethodDesc = method.description.toLowerCase()

      if (lowerMethodName.includes(lowerQuery) || lowerMethodDesc.includes(lowerQuery)) {
        results.push({
          type: 'method',
          className,
          methodName: method.name,
          info: `${className}.${method.name}() - ${method.description}`
        })
      }
    }
  }

  return results.slice(0, maxResults)
}
