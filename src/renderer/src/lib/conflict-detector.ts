/**
 * Conflict Detector — Override Extraction & Conflict Detection
 *
 * Pure functions to extract prototype override method names from
 * RPG Maker MZ JavaScript plugin code and detect conflicts between
 * plugins that override the same methods.
 */

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
 * Replace comments and string literals with spaces so that
 * prototype references inside them are not matched by the
 * extraction regexes.
 */
function stripCommentsAndStrings(code: string): string {
  // Order matters: block comments, single-line comments,
  // template literals, double-quoted strings, single-quoted strings
  return code.replace(
    /\/\*[\s\S]*?\*\/|\/\/[^\n]*|`(?:[^`\\]|\\.)*`|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/g,
    (match) => ' '.repeat(match.length)
  )
}

/**
 * Extract prototype override method names from JavaScript plugin code.
 *
 * Detects two patterns:
 *  1. Direct assignment:  `ClassName.prototype.method = ...`
 *  2. Alias capture:      `const|let|var _alias = ClassName.prototype.method;`
 *
 * Returns a deduplicated array of `"ClassName.prototype.methodName"` strings.
 */
export function extractOverrides(code: string): string[] {
  if (!code) return []

  const cleaned = stripCommentsAndStrings(code)
  const seen = new Set<string>()

  // Pattern 1: direct assignment — ClassName.prototype.method(…chain…) =
  // The optional (?:\.\w+)* allows nested chains like .tileset.name
  // while still capturing only the first property after prototype.
  const directRe = /(\w+)\.prototype\.(\w+)(?:\.\w+)*\s*=/g
  let match: RegExpExecArray | null
  while ((match = directRe.exec(cleaned)) !== null) {
    seen.add(`${match[1]}.prototype.${match[2]}`)
  }

  // Pattern 2: alias capture — const|let|var _x = ClassName.prototype.method;
  const aliasRe = /(?:const|let|var)\s+\w+\s*=\s*(\w+)\.prototype\.(\w+)\s*[;,]/g
  while ((match = aliasRe.exec(cleaned)) !== null) {
    seen.add(`${match[1]}.prototype.${match[2]}`)
  }

  return [...seen]
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
    health: conflicts.length > 0 ? 'conflicts' : 'clean',
  }
}
