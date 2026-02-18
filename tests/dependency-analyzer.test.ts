// Tests for dependency analyzer
import { describe, it, expect } from 'vitest'
import {
  buildDependencyGraph,
  validateDependencies
} from '../src/renderer/src/lib/dependency-analyzer'
import type { ScannedPluginHeader } from '../src/renderer/src/lib/dependency-analyzer'

function header(
  name: string,
  base: string[] = [],
  orderAfter: string[] = [],
  orderBefore: string[] = []
): ScannedPluginHeader {
  return { filename: name + '.js', name, base, orderAfter, orderBefore }
}

describe('buildDependencyGraph', () => {
  it('builds graph from scanned headers', () => {
    const headers = [header('A', ['B']), header('B')]
    const graph = buildDependencyGraph(headers)
    expect(graph.plugins.size).toBe(2)
    expect(graph.edges.get('A')).toContain('B')
  })

  it('handles plugins with no dependencies', () => {
    const headers = [header('A'), header('B')]
    const graph = buildDependencyGraph(headers)
    expect(graph.edges.get('A')).toEqual([])
  })

  it('handles empty plugin list', () => {
    const graph = buildDependencyGraph([])
    expect(graph.plugins.size).toBe(0)
  })
})

describe('validateDependencies', () => {
  it('detects missing @base dependency', () => {
    const headers = [header('A', ['NonExistent'])]
    const report = validateDependencies(headers)
    expect(report.issues).toContainEqual(
      expect.objectContaining({
        type: 'missing',
        pluginName: 'A'
      })
    )
    expect(report.health).toBe('errors')
  })

  it('does not flag present dependencies as missing', () => {
    const headers = [header('A', ['B']), header('B')]
    const report = validateDependencies(headers)
    const missing = report.issues.filter((i) => i.type === 'missing')
    expect(missing).toHaveLength(0)
  })

  it('detects simple circular dependency (A->B->A)', () => {
    const headers = [header('A', ['B']), header('B', ['A'])]
    const report = validateDependencies(headers)
    const circular = report.issues.filter((i) => i.type === 'circular')
    expect(circular.length).toBeGreaterThan(0)
    expect(report.health).toBe('errors')
  })

  it('detects indirect circular dependency (A->B->C->A)', () => {
    const headers = [header('A', ['B']), header('B', ['C']), header('C', ['A'])]
    const report = validateDependencies(headers)
    const circular = report.issues.filter((i) => i.type === 'circular')
    expect(circular.length).toBeGreaterThan(0)
  })

  it('handles no cycles gracefully', () => {
    const headers = [header('A', ['B']), header('B', ['C']), header('C')]
    const report = validateDependencies(headers)
    const circular = report.issues.filter((i) => i.type === 'circular')
    expect(circular).toHaveLength(0)
  })

  it('detects load order violation (dep loaded after dependent)', () => {
    // A depends on B, but A comes first in file list
    const headers = [header('A', ['B']), header('B')]
    const report = validateDependencies(headers)
    const orderIssues = report.issues.filter((i) => i.type === 'load-order')
    expect(orderIssues.length).toBeGreaterThan(0)
    expect(orderIssues[0].severity).toBe('warning')
  })

  it('accepts correct load order', () => {
    // B first, then A depends on B
    const headers = [header('B'), header('A', ['B'])]
    const report = validateDependencies(headers)
    const orderIssues = report.issues.filter((i) => i.type === 'load-order')
    expect(orderIssues).toHaveLength(0)
  })

  it('detects duplicate plugin names', () => {
    const headers = [
      { filename: 'A.js', name: 'A', base: [], orderAfter: [], orderBefore: [] },
      { filename: 'A_copy.js', name: 'A', base: [], orderAfter: [], orderBefore: [] }
    ]
    const report = validateDependencies(headers)
    const dupes = report.issues.filter((i) => i.type === 'duplicate')
    expect(dupes.length).toBeGreaterThan(0)
  })

  it('reports healthy when no issues', () => {
    const headers = [header('B'), header('A', ['B'])]
    const report = validateDependencies(headers)
    expect(report.health).toBe('healthy')
  })

  it('reports warnings when only warnings exist', () => {
    // Load order issue is a warning, no missing deps
    const headers = [header('A', ['B']), header('B')]
    const report = validateDependencies(headers)
    const errors = report.issues.filter((i) => i.severity === 'error')
    const warnings = report.issues.filter((i) => i.severity === 'warning')
    expect(errors).toHaveLength(0)
    expect(warnings.length).toBeGreaterThan(0)
    expect(report.health).toBe('warnings')
  })

  it('returns all plugin names for autocomplete', () => {
    const headers = [header('Alpha'), header('Beta'), header('Gamma')]
    const report = validateDependencies(headers)
    expect(report.pluginNames).toEqual(['Alpha', 'Beta', 'Gamma'])
  })

  it('includes orderAfter in dependency edges', () => {
    // A orderAfter B (not @base, just load order)
    const headers = [header('A', [], ['B']), header('B')]
    const report = validateDependencies(headers)
    // A before B with orderAfter should trigger load-order warning
    const orderIssues = report.issues.filter((i) => i.type === 'load-order')
    expect(orderIssues.length).toBeGreaterThan(0)
  })

  it('treats missing orderAfter as warning not error', () => {
    const headers = [header('A', [], ['NonExistent'])]
    const report = validateDependencies(headers)
    const missing = report.issues.filter((i) => i.type === 'missing')
    expect(missing.length).toBeGreaterThan(0)
    expect(missing[0].severity).toBe('warning')
    expect(missing[0].message).toContain('should load after')
  })

  it('treats missing @base as error', () => {
    const headers = [header('A', ['NonExistent'])]
    const report = validateDependencies(headers)
    const missing = report.issues.filter((i) => i.type === 'missing')
    expect(missing[0].severity).toBe('error')
    expect(missing[0].message).toContain('requires')
  })

  it('deduplicates load-order warnings when dep in both base and orderAfter', () => {
    // A has both @base B and @orderAfter B, but A loads before B
    const headers = [header('A', ['B'], ['B']), header('B')]
    const report = validateDependencies(headers)
    const orderIssues = report.issues.filter(
      (i) => i.type === 'load-order' && i.pluginName === 'A'
    )
    expect(orderIssues).toHaveLength(1)
  })

  it('creates reverse edges from @orderBefore', () => {
    // A says orderBefore B → B depends on A (reverse edge)
    const headers = [header('A', [], [], ['B']), header('B')]
    const graph = buildDependencyGraph(headers)
    expect(graph.edges.get('B')).toContain('A')
  })

  it('detects load-order violation from @orderBefore', () => {
    // B loads first, A loads second with orderBefore: ['B']
    // A must load before B, so B at position 0 is wrong
    const headers = [header('B'), header('A', [], [], ['B'])]
    const report = validateDependencies(headers)
    const orderIssues = report.issues.filter(
      (i) => i.type === 'load-order' && i.pluginName === 'B'
    )
    expect(orderIssues.length).toBeGreaterThan(0)
    expect(orderIssues[0].message).toContain('B')
  })

  it('treats missing @orderBefore target as warning', () => {
    const headers = [header('A', [], [], ['NonExistent'])]
    const report = validateDependencies(headers)
    const missing = report.issues.filter((i) => i.type === 'missing')
    expect(missing.length).toBeGreaterThan(0)
    expect(missing[0].severity).toBe('warning')
    expect(missing[0].message).toContain('should load before')
  })

  it('accepts correct @orderBefore load order', () => {
    // A loads first with orderBefore: ['B'], B loads second — correct
    const headers = [header('A', [], [], ['B']), header('B')]
    const report = validateDependencies(headers)
    const orderIssues = report.issues.filter((i) => i.type === 'load-order')
    expect(orderIssues).toHaveLength(0)
  })
})
