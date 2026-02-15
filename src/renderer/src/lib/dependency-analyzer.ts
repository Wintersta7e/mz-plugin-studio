// Dependency analyzer for MZ plugin projects
// Builds dependency graphs and validates load order, missing deps, circular deps

export interface ScannedPluginHeader {
  filename: string
  name: string
  base: string[]
  orderAfter: string[]
}

export interface DependencyIssue {
  type: 'missing' | 'circular' | 'load-order' | 'duplicate'
  severity: 'error' | 'warning'
  pluginName: string
  message: string
  details?: string
}

export interface DependencyReport {
  issues: DependencyIssue[]
  health: 'healthy' | 'warnings' | 'errors'
  loadOrder: string[]
  pluginNames: string[]
}

export interface DependencyGraph {
  plugins: Map<string, ScannedPluginHeader>
  edges: Map<string, string[]> // plugin -> its dependencies (base + orderAfter)
}

/** Build a directed dependency graph from scanned headers */
export function buildDependencyGraph(headers: ScannedPluginHeader[]): DependencyGraph {
  const plugins = new Map<string, ScannedPluginHeader>()
  const edges = new Map<string, string[]>()

  for (const header of headers) {
    plugins.set(header.name, header)
    edges.set(header.name, [...header.base, ...header.orderAfter])
  }

  return { plugins, edges }
}

/** Validate the dependency graph and return a full report */
export function validateDependencies(headers: ScannedPluginHeader[]): DependencyReport {
  const graph = buildDependencyGraph(headers)
  const issues: DependencyIssue[] = []

  // Build position index for load order checking
  const positionIndex = new Map<string, number>()
  for (let i = 0; i < headers.length; i++) {
    positionIndex.set(headers[i].name, i)
  }

  // 1. Detect duplicate plugin names
  const nameCounts = new Map<string, string[]>()
  for (const header of headers) {
    const existing = nameCounts.get(header.name) || []
    existing.push(header.filename)
    nameCounts.set(header.name, existing)
  }
  for (const [name, filenames] of nameCounts) {
    if (filenames.length > 1) {
      issues.push({
        type: 'duplicate',
        severity: 'warning',
        pluginName: name,
        message: `Duplicate plugin name "${name}" in: ${filenames.join(', ')}`,
        details: filenames.join(', ')
      })
    }
  }

  // 2. Detect missing dependencies
  for (const header of headers) {
    for (const dep of [...header.base, ...header.orderAfter]) {
      if (!graph.plugins.has(dep)) {
        issues.push({
          type: 'missing',
          severity: 'error',
          pluginName: header.name,
          message: `"${header.name}" requires "${dep}" but it was not found in the project`
        })
      }
    }
  }

  // 3. Detect circular dependencies
  issues.push(...detectCycles(graph))

  // 4. Detect load order violations
  for (const header of headers) {
    const myPos = positionIndex.get(header.name)!
    for (const dep of [...header.base, ...header.orderAfter]) {
      const depPos = positionIndex.get(dep)
      if (depPos !== undefined && depPos > myPos) {
        issues.push({
          type: 'load-order',
          severity: 'warning',
          pluginName: header.name,
          message: `"${header.name}" depends on "${dep}" but loads before it`,
          details: `${header.name} is at position ${myPos + 1}, ${dep} is at position ${depPos + 1}`
        })
      }
    }
  }

  // Determine health
  const hasErrors = issues.some((i) => i.severity === 'error')
  const hasWarnings = issues.some((i) => i.severity === 'warning')
  const health = hasErrors ? 'errors' : hasWarnings ? 'warnings' : 'healthy'

  return {
    issues,
    health,
    loadOrder: headers.map((h) => h.name),
    pluginNames: headers.map((h) => h.name)
  }
}

/** Detect circular dependencies using DFS with three-color marking */
function detectCycles(graph: DependencyGraph): DependencyIssue[] {
  const issues: DependencyIssue[] = []
  const WHITE = 0,
    GRAY = 1,
    BLACK = 2
  const color = new Map<string, number>()
  const parent = new Map<string, string>()

  for (const name of graph.plugins.keys()) {
    color.set(name, WHITE)
  }

  function dfs(node: string): void {
    color.set(node, GRAY)
    for (const dep of graph.edges.get(node) || []) {
      if (!graph.plugins.has(dep)) continue // skip missing (handled elsewhere)
      if (color.get(dep) === GRAY) {
        // Found cycle - reconstruct path
        const cycle = [dep, node]
        let curr = node
        while (parent.has(curr) && parent.get(curr) !== dep) {
          curr = parent.get(curr)!
          cycle.push(curr)
        }
        cycle.reverse()
        issues.push({
          type: 'circular',
          severity: 'error',
          pluginName: node,
          message: 'Circular dependency detected: ' + cycle.join(' -> '),
          details: cycle.join(' -> ')
        })
      } else if (color.get(dep) === WHITE) {
        parent.set(dep, node)
        dfs(dep)
      }
    }
    color.set(node, BLACK)
  }

  for (const name of graph.plugins.keys()) {
    if (color.get(name) === WHITE) dfs(name)
  }
  return issues
}
