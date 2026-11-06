// COV-07: scanDependencies, COV-08: setProject/addRecentProject/clearProject
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { MZProject } from '../../src/shared/types/mz'
import { createFakeApi } from '../helpers/fake-api'

type LogLine = (...params: unknown[]) => void

// The renderer logger has no initialize and no file transport; the mock keeps both all the same
interface RendererLoggerView {
  initialize?: () => void
  info: LogLine
  warn: LogLine
  error: LogLine
  debug: LogLine
  transports: { console: object; file?: object }
}

// Mock electron-log before importing the store (it imports log from electron-log/renderer)
vi.mock<{ default: RendererLoggerView }>(import('electron-log/renderer'), () => ({
  default: {
    initialize: vi.fn<() => void>(),
    info: vi.fn<LogLine>(),
    warn: vi.fn<LogLine>(),
    error: vi.fn<LogLine>(),
    debug: vi.fn<LogLine>(),
    transports: { console: {}, file: {} }
  }
}))

import { useProjectStore } from '../../src/renderer/src/stores/projectStore'

type ScanHeaders = Window['api']['plugin']['scanHeaders']

function setUp(): void {
  localStorage.clear()
  useProjectStore.setState(useProjectStore.getInitialState(), true)
  vi.stubGlobal('api', createFakeApi())
}

function tearDown(): void {
  vi.unstubAllGlobals()
}

function makeProject(path = '/games/project'): MZProject {
  return {
    path,
    gameTitle: 'Test Game',
    switches: [],
    variables: [],
    actors: [],
    items: [],
    maps: [],
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

// `window.api` with `scanHeaders` as the plugin header scan
function stubScanHeaders(scanHeaders: ScanHeaders): void {
  vi.stubGlobal('api', createFakeApi({ plugin: { scanHeaders } }))
}

// COV-08: setProject / addRecentProject / clearProject
describe('projectStore: setProject', () => {
  beforeEach(setUp)

  afterEach(tearDown)

  it('sets the project and clears error', () => {
    useProjectStore.setState({ error: 'old error' })
    const project = makeProject()
    useProjectStore.getState().setProject(project)
    const state = useProjectStore.getState()

    expect(state.project).toStrictEqual(project)
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

describe('projectStore: addRecentProject', () => {
  beforeEach(setUp)

  afterEach(tearDown)

  it('adds a path to the front of recentProjects', () => {
    useProjectStore.getState().addRecentProject('/games/project/a')
    useProjectStore.getState().addRecentProject('/games/project/b')
    const state = useProjectStore.getState()

    expect(state.recentProjects[0]).toBe('/games/project/b')
    expect(state.recentProjects[1]).toBe('/games/project/a')
  })

  it('deduplicates: re-adding existing path moves it to front', () => {
    useProjectStore.getState().addRecentProject('/games/a')
    useProjectStore.getState().addRecentProject('/games/b')
    useProjectStore.getState().addRecentProject('/games/a')
    const state = useProjectStore.getState()

    expect(state.recentProjects[0]).toBe('/games/a')
    expect(state.recentProjects.filter((p) => p === '/games/a')).toHaveLength(1)
  })

  it('caps recentProjects at 10 entries', () => {
    for (let index = 0; index < 12; index++) {
      useProjectStore.getState().addRecentProject(`/games/project/${String(index)}`)
    }

    expect(useProjectStore.getState().recentProjects).toHaveLength(10)
  })

  it('keeps the most recent entries when cap is exceeded', () => {
    for (let index = 0; index < 11; index++) {
      useProjectStore.getState().addRecentProject(`/games/project/${String(index)}`)
    }
    const recents = useProjectStore.getState().recentProjects

    expect(recents[0]).toBe('/games/project/10')
    expect(recents).not.toContain('/games/project/0')
  })
})

describe('projectStore: clearProject', () => {
  beforeEach(setUp)

  afterEach(tearDown)

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

    const { project, switches, variables, dependencyReport, conflictReport, error, isScanning } =
      useProjectStore.getState()

    expect({
      project,
      switches,
      variables,
      dependencyReport,
      conflictReport,
      error,
      isScanning
    }).toStrictEqual({
      project: null,
      switches: [],
      variables: [],
      dependencyReport: null,
      conflictReport: null,
      error: null,
      isScanning: false
    })
  })

  it('does not clear recentProjects', () => {
    useProjectStore.getState().addRecentProject('/games/a')
    useProjectStore.getState().addRecentProject('/games/b')
    useProjectStore.getState().clearProject()

    expect(useProjectStore.getState().recentProjects).toHaveLength(2)
  })
})

// COV-07: scanDependencies
describe('projectStore: scanDependencies', () => {
  beforeEach(setUp)

  afterEach(tearDown)

  it('sets isScanning false and populates reports on success', async () => {
    expect.hasAssertions()

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

    const scanHeadersMock = vi.fn<ScanHeaders>().mockResolvedValue(mockHeaders)
    stubScanHeaders(scanHeadersMock)

    useProjectStore.setState({ project: makeProject('/games/project') })

    await useProjectStore.getState().scanDependencies()

    expect(scanHeadersMock).toHaveBeenCalledWith('/games/project')
    expect(useProjectStore.getState().isScanning).toBe(false)
    expect(useProjectStore.getState().dependencyReport).not.toBeNull()
    expect(useProjectStore.getState().conflictReport).not.toBeNull()
  })

  it('does not scan when project is null', async () => {
    expect.hasAssertions()

    const scanHeadersMock = vi.fn<ScanHeaders>()
    stubScanHeaders(scanHeadersMock)

    useProjectStore.setState({ project: null })
    await useProjectStore.getState().scanDependencies()

    expect(scanHeadersMock).not.toHaveBeenCalled()
  })

  it('concurrent scan guard: ignores second call if already scanning', async () => {
    expect.hasAssertions()

    const { promise: firstScan, resolve: resolveFirst } =
      Promise.withResolvers<Awaited<ReturnType<ScanHeaders>>>()
    const scanHeadersMock = vi.fn<ScanHeaders>().mockReturnValueOnce(firstScan)
    stubScanHeaders(scanHeadersMock)

    useProjectStore.setState({ project: makeProject('/games/p') })

    const p1 = useProjectStore.getState().scanDependencies()
    const p2 = useProjectStore.getState().scanDependencies()

    resolveFirst([])
    await Promise.all([p1, p2])

    expect(scanHeadersMock).toHaveBeenCalledTimes(1)
  })

  it('resets isScanning to false on error', async () => {
    expect.hasAssertions()

    const scanHeadersMock = vi.fn<ScanHeaders>().mockRejectedValue(new Error('Scan failed'))
    stubScanHeaders(scanHeadersMock)

    useProjectStore.setState({ project: makeProject('/games/p') })

    await useProjectStore.getState().scanDependencies()

    expect(useProjectStore.getState().isScanning).toBe(false)
  })
})
