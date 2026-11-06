// Dependency analyzer for MZ plugin projects
// Builds dependency graphs and validates load order, missing deps, circular deps

import type { ScannedPluginHeader } from '../../../shared/ipc-types'

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
  edges: Map<string, string[]> // plugin -> its dependencies (base + orderAfter + reverse orderBefore)
}

/**
Build a directed dependency graph from scanned headers
*/
export function buildDependencyGraph(headers: ScannedPluginHeader[]): DependencyGraph {
  const plugins = new Map<string, ScannedPluginHeader>()
  const edges = new Map<string, string[]>()

  for (const header of headers) {
    plugins.set(header.name, header)
    edges.set(header.name, [...header.base, ...header.orderAfter])
  }

  // @orderBefore creates reverse edges: if A has orderBefore: ['B'],
  // then B must load after A, so B depends on A
  for (const header of headers) {
    for (const target of header.orderBefore) {
      if (!plugins.has(target)) {
        continue
      }

      const targetEdges = edges.get(target) || []
      if (targetEdges.includes(header.name)) {
        continue
      }

      targetEdges.push(header.name)
      edges.set(target, targetEdges)
    }
  }

  return { plugins, edges }
}

/**
Validate the dependency graph and return a full report
*/
export function validateDependencies(headers: ScannedPluginHeader[]): DependencyReport {
  const graph = buildDependencyGraph(headers)
  const issues: DependencyIssue[] = []

  // Build position index for load order checking
  const positionIndex = new Map<string, number>()
  for (const [index, header] of headers.entries()) {
    positionIndex.set(header.name, index)
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
    // @base = hard dependency (error if missing)
    for (const dependency of header.base) {
      if (!graph.plugins.has(dependency)) {
        issues.push({
          type: 'missing',
          severity: 'error',
          pluginName: header.name,
          message: `"${header.name}" requires "${dependency}" but it was not found in the project`
        })
      }
    }
    // @orderAfter = soft load order hint (warning if missing)
    for (const dependency of header.orderAfter) {
      if (!graph.plugins.has(dependency) && !header.base.includes(dependency)) {
        issues.push({
          type: 'missing',
          severity: 'warning',
          pluginName: header.name,
          message: `"${header.name}" should load after "${dependency}" but it was not found in the project`
        })
      }
    }
    // @orderBefore = soft load order hint (warning if target missing)
    for (const dependency of header.orderBefore) {
      if (!graph.plugins.has(dependency)) {
        issues.push({
          type: 'missing',
          severity: 'warning',
          pluginName: header.name,
          message: `"${header.name}" should load before "${dependency}" but it was not found in the project`
        })
      }
    }
  }

  // 3. Detect circular dependencies
  issues.push(...detectCycles(graph))

  // 4. Detect load order violations (uses graph edges which include reverse @orderBefore)
  for (const header of headers) {
    const myPos = positionIndex.get(header.name)
    if (myPos === undefined) continue
    const allDependencies = [...new Set(graph.edges.get(header.name) || [])]
    for (const dependency of allDependencies) {
      const dependencyPos = positionIndex.get(dependency)
      if (dependencyPos !== undefined && dependencyPos > myPos) {
        issues.push({
          type: 'load-order',
          severity: 'warning',
          pluginName: header.name,
          message: `"${header.name}" depends on "${dependency}" but loads before it`,
          details: `${header.name} is at position ${myPos + 1}, ${dependency} is at position ${dependencyPos + 1}`
        })
      }
    }
  }

  // Determine health
  const hasErrors = issues.some((index) => index.severity === 'error')
  const hasWarnings = issues.some((index) => index.severity === 'warning')
  const health = hasErrors ? 'errors' : hasWarnings ? 'warnings' : 'healthy'

  return {
    issues,
    health,
    loadOrder: headers.map((h) => h.name),
    pluginNames: headers.map((h) => h.name) // Same as loadOrder; kept for backward compat
  }
}

/**
Detect circular dependencies using DFS with three-color marking
*/
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
    for (const dependency of graph.edges.get(node) || []) {
      if (!graph.plugins.has(dependency)) continue // skip missing (handled elsewhere)
      if (color.get(dependency) === GRAY) {
        // Found cycle - reconstruct path
        const cycle = [dependency, node]
        let next = parent.get(node)
        while (next !== undefined && next !== dependency) {
          cycle.push(next)
          next = parent.get(next)
        }
        cycle.reverse()
        issues.push({
          type: 'circular',
          severity: 'error',
          pluginName: node,
          message: 'Circular dependency detected: ' + cycle.join(' -> '),
          details: cycle.join(' -> ')
        })
      } else if (color.get(dependency) === WHITE) {
        parent.set(dependency, node)
        dfs(dependency)
      }
    }
    color.set(node, BLACK)
  }

  for (const name of graph.plugins.keys()) {
    if (color.get(name) === WHITE) dfs(name)
  }
  return issues
}

export { type ScannedPluginHeader } from '../../../shared/ipc-types'
