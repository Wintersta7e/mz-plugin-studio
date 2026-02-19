/**
 * Conflict Detector — Conflict Detection for RPG Maker MZ Plugins
 *
 * Pure functions to detect conflicts between plugins that override
 * the same prototype methods.
 *
 * Override extraction logic lives in `src/shared/override-extractor.ts`
 * (shared between main and renderer processes).
 */

export { extractOverrides } from '../../../shared/override-extractor'

// --- Types ---

export interface PluginConflict {
  method: string // "Game_Actor.prototype.setup"
  plugins: string[] // ["PluginA", "PluginB"] in load order
  severity: 'warning' | 'info'
  className: string // "Game_Actor"
  methodName: string // "setup"
}

export interface ConflictReport {
  conflicts: PluginConflict[]
  totalOverrides: number
  health: 'clean' | 'conflicts'
}

/**
 * Detect conflicts between plugins that override the same methods.
 *
 * @param headers - Plugin headers with name and overrides list (in load order)
 * @param mzClasses - Class popularity data from mz-classes.json
 * @returns A ConflictReport with sorted conflicts and health status
 */
export function detectConflicts(
  headers: { filename: string; name: string; overrides: string[] }[],
  mzClasses: Record<string, { popularity?: number }>
): ConflictReport {
  // Step 1: Build map of method → plugin names (preserving load order)
  const methodMap = new Map<string, string[]>()
  let totalOverrides = 0

  for (const header of headers) {
    totalOverrides += header.overrides.length
    for (const method of header.overrides) {
      const plugins = methodMap.get(method)
      if (plugins) {
        plugins.push(header.name)
      } else {
        methodMap.set(method, [header.name])
      }
    }
  }

  // Step 2: Filter to entries where 2+ plugins override the same method
  const conflicts: PluginConflict[] = []

  for (const [method, plugins] of methodMap) {
    if (plugins.length < 2) continue

    // Split on .prototype. to get className and methodName
    const parts = method.split('.prototype.')
    const className = parts[0]
    const methodName = parts[1] ?? method

    // Severity based on class popularity
    const popularity = mzClasses[className]?.popularity ?? 0
    const severity: 'warning' | 'info' = popularity >= 10 ? 'warning' : 'info'

    conflicts.push({ method, plugins, severity, className, methodName })
  }

  // Step 3: Sort — warnings first, then alphabetical by method within same severity
  conflicts.sort((a, b) => {
    if (a.severity !== b.severity) {
      return a.severity === 'warning' ? -1 : 1
    }
    return a.method.localeCompare(b.method)
  })

  return {
    conflicts,
    totalOverrides,
    health: conflicts.length > 0 ? 'conflicts' : 'clean'
  }
}
