// @vitest-environment jsdom
// COV-07: scanDependencies, COV-08: setProject/addRecentProject/clearProject
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { MZProject } from '../src/shared/types/mz'

// Mock electron-log before importing the store (it imports log from electron-log/renderer)
vi.mock('electron-log/renderer', () => ({
  default: {
    initialize: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    transports: { console: {}, file: {} }
  }
}))

import { useProjectStore } from '../src/renderer/src/stores/projectStore'

function resetProjectStore() {
  localStorage.clear()
  useProjectStore.setState(useProjectStore.getInitialState(), true)
}

function makeProject(path = '/tmp/project'): MZProject {
  return {
    path,
    gameTitle: 'Test Game',
    system: { switches: [], variables: [] },
    switches: [],
    variables: [],
    actors: [],
    items: [],
    maps: [],
    plugins: [],
    skills: [],
    weapons: [],
    armors: [],
    enemies: [],
    states: [],
    animations: [],
    tilesets: [],
    commonEvents: [],
    classes: [],
    troops: []
  }
}

describe('projectStore', () => {
  beforeEach(() => {
    resetProjectStore()
    // Ensure window.api.plugin exists for tests that need it
    if (!window.api) {
      Object.defineProperty(window, 'api', {
        value: { plugin: {}, project: {}, dialog: {}, log: {}, shell: {}, params: {} },
        writable: true,
        configurable: true
      })
    }
    if (!window.api.plugin) {
      ;(window.api as Record<string, unknown>).plugin = {}
    }
  })

  // COV-08: setProject / addRecentProject / clearProject
  describe('setProject', () => {
    it('sets the project and clears error', () => {
      useProjectStore.setState({ error: 'old error' })
      const project = makeProject()
      useProjectStore.getState().setProject(project)
      const state = useProjectStore.getState()
      expect(state.project).toEqual(project)
      expect(state.error).toBeNull()
    })

    it('setProject(null) clears dependencyReport and conflictReport', () => {
      useProjectStore.setState({
        project: makeProject(),
        dependencyReport: {
          issues: [],
          health: 'healthy' as const,
          loadOrder: [],
          pluginNames: []
        },
        conflictReport: { conflicts: [], totalOverrides: 0, health: 'clean' as const }
      })

      useProjectStore.getState().setProject(null)

      const state = useProjectStore.getState()
      expect(state.project).toBeNull()
      expect(state.dependencyReport).toBeNull()
      expect(state.conflictReport).toBeNull()
    })
  })

  describe('addRecentProject', () => {
    it('adds a path to the front of recentProjects', () => {
      useProjectStore.getState().addRecentProject('/tmp/project/a')
      useProjectStore.getState().addRecentProject('/tmp/project/b')
      const state = useProjectStore.getState()
      expect(state.recentProjects[0]).toBe('/tmp/project/b')
      expect(state.recentProjects[1]).toBe('/tmp/project/a')
    })

    it('deduplicates: re-adding existing path moves it to front', () => {
      useProjectStore.getState().addRecentProject('/tmp/a')
      useProjectStore.getState().addRecentProject('/tmp/b')
      useProjectStore.getState().addRecentProject('/tmp/a')
      const state = useProjectStore.getState()
      expect(state.recentProjects[0]).toBe('/tmp/a')
      expect(state.recentProjects.filter((p) => p === '/tmp/a')).toHaveLength(1)
    })

    it('caps recentProjects at 10 entries', () => {
      for (let i = 0; i < 12; i++) {
        useProjectStore.getState().addRecentProject(`/tmp/project/${i}`)
      }
      expect(useProjectStore.getState().recentProjects).toHaveLength(10)
    })

    it('keeps the most recent entries when cap is exceeded', () => {
      for (let i = 0; i < 11; i++) {
        useProjectStore.getState().addRecentProject(`/tmp/project/${i}`)
      }
      const recents = useProjectStore.getState().recentProjects
      expect(recents[0]).toBe('/tmp/project/10')
      expect(recents.includes('/tmp/project/0')).toBe(false)
    })
  })

  describe('clearProject', () => {
    it('resets all project state to empty', () => {
      useProjectStore.setState({
        project: makeProject(),
        switches: [{ id: 1, name: 'SW1' }],
        variables: [{ id: 1, name: 'VAR1' }],
        dependencyReport: {
          issues: [],
          health: 'healthy' as const,
          loadOrder: [],
          pluginNames: []
        },
        conflictReport: { conflicts: [], totalOverrides: 0, health: 'clean' as const },
        error: 'some error',
        isScanning: true
      })

      useProjectStore.getState().clearProject()

      const state = useProjectStore.getState()
      expect(state.project).toBeNull()
      expect(state.switches).toHaveLength(0)
      expect(state.variables).toHaveLength(0)
      expect(state.dependencyReport).toBeNull()
      expect(state.conflictReport).toBeNull()
      expect(state.error).toBeNull()
      expect(state.isScanning).toBe(false)
    })

    it('does not clear recentProjects', () => {
      useProjectStore.getState().addRecentProject('/tmp/a')
      useProjectStore.getState().addRecentProject('/tmp/b')
      useProjectStore.getState().clearProject()

      expect(useProjectStore.getState().recentProjects).toHaveLength(2)
    })
  })

  // COV-07: scanDependencies
  describe('scanDependencies', () => {
    it('sets isScanning false and populates reports on success', async () => {
      const mockHeaders = [
        {
          filename: 'PluginA.js',
          name: 'PluginA',
          base: [],
          orderAfter: [],
          orderBefore: [],
          overrides: []
        }
      ]

      const scanHeadersMock = vi.fn().mockResolvedValue(mockHeaders)
      ;(window.api.plugin as any).scanHeaders = scanHeadersMock

      useProjectStore.setState({ project: makeProject('/tmp/project') })

      await useProjectStore.getState().scanDependencies()

      expect(scanHeadersMock).toHaveBeenCalledWith('/tmp/project')
      expect(useProjectStore.getState().isScanning).toBe(false)
      expect(useProjectStore.getState().dependencyReport).not.toBeNull()
      expect(useProjectStore.getState().conflictReport).not.toBeNull()
    })

    it('does not scan when project is null', async () => {
      const scanHeadersMock = vi.fn()
      ;(window.api.plugin as any).scanHeaders = scanHeadersMock

      useProjectStore.setState({ project: null })
      await useProjectStore.getState().scanDependencies()

      expect(scanHeadersMock).not.toHaveBeenCalled()
    })

    it('concurrent scan guard: ignores second call if already scanning', async () => {
      let resolveFirst!: (v: unknown[]) => void
      const firstScan = new Promise<unknown[]>((res) => {
        resolveFirst = res
      })
      const scanHeadersMock = vi.fn().mockReturnValueOnce(firstScan)
      ;(window.api.plugin as any).scanHeaders = scanHeadersMock

      useProjectStore.setState({ project: makeProject('/tmp/p') })

      const p1 = useProjectStore.getState().scanDependencies()
      const p2 = useProjectStore.getState().scanDependencies()

      resolveFirst([])
      await Promise.all([p1, p2])

      expect(scanHeadersMock).toHaveBeenCalledTimes(1)
    })

    it('resets isScanning to false on error', async () => {
      const scanHeadersMock = vi.fn().mockRejectedValue(new Error('Scan failed'))
      ;(window.api.plugin as any).scanHeaders = scanHeadersMock

      useProjectStore.setState({ project: makeProject('/tmp/p') })

      await useProjectStore.getState().scanDependencies()

      expect(useProjectStore.getState().isScanning).toBe(false)
    })
  })
})
