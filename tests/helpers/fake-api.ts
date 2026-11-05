// A stand-in for the preload `window.api`: every member is a recorded `vi.fn` that resolves to
// an empty or smallest valid value, so a test sets only the members it drives.
import { vi } from 'vitest'
import { createEmptyPlugin } from '../../src/shared/types/plugin'
import type { SaveResult } from '../../src/shared/ipc-types'
import type { MZProject } from '../../src/shared/types/mz'

/**
A loaded project with no game data, for tests that only need one to be open
*/
export function sampleProject(path = '/project'): MZProject {
  return {
    path,
    gameTitle: 'Sample Game',
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

/**
A save that wrote nothing
*/
const notWritten: SaveResult = {
  success: false,
  path: '',
  conflict: 'exists-unrelated',
  diskSha256: ''
}

export type FakeApiOverrides = { [K in keyof Window['api']]?: Partial<Window['api'][K]> }

export function createFakeApi(overrides: FakeApiOverrides = {}): Window['api'] {
  type Api = Window['api']
  const api: Window['api'] = {
    project: {
      validate: vi.fn<Api['project']['validate']>().mockResolvedValue({ valid: false }),
      load: vi.fn<Api['project']['load']>().mockResolvedValue({
        path: '',
        gameTitle: '',
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
      })
    },
    plugin: {
      save: vi.fn<Api['plugin']['save']>().mockResolvedValue(notWritten),
      saveToPath: vi.fn<Api['plugin']['saveToPath']>().mockResolvedValue(notWritten),
      load: vi
        .fn<Api['plugin']['load']>()
        .mockResolvedValue({ plugin: createEmptyPlugin(), path: '', sha256: '' }),
      parse: vi.fn<Api['plugin']['parse']>().mockResolvedValue(createEmptyPlugin()),
      readRaw: vi
        .fn<Api['plugin']['readRaw']>()
        .mockResolvedValue({ content: '', path: '', sha256: '' }),
      list: vi.fn<Api['plugin']['list']>().mockResolvedValue([]),
      readByPath: vi.fn<Api['plugin']['readByPath']>().mockResolvedValue(''),
      scanHeaders: vi.fn<Api['plugin']['scanHeaders']>().mockResolvedValue([])
    },
    dialog: {
      openFolder: vi.fn<Api['dialog']['openFolder']>().mockResolvedValue(null),
      saveFile: vi.fn<Api['dialog']['saveFile']>().mockResolvedValue(null),
      openFile: vi.fn<Api['dialog']['openFile']>().mockResolvedValue(null),
      message: vi.fn<Api['dialog']['message']>().mockResolvedValue(0)
    },
    window: {
      minimize: vi.fn<Api['window']['minimize']>(),
      maximize: vi.fn<Api['window']['maximize']>(),
      close: vi.fn<Api['window']['close']>(),
      isMaximized: vi.fn<Api['window']['isMaximized']>().mockResolvedValue(false),
      onMaximizeChange: vi.fn<Api['window']['onMaximizeChange']>(() => vi.fn<() => void>())
    },
    log: {
      openFolder: vi.fn<Api['log']['openFolder']>().mockResolvedValue(),
      setLevel: vi.fn<Api['log']['setLevel']>()
    }
  }
  return {
    project: { ...api.project, ...overrides.project },
    plugin: { ...api.plugin, ...overrides.plugin },
    dialog: { ...api.dialog, ...overrides.dialog },
    window: { ...api.window, ...overrides.window },
    log: { ...api.log, ...overrides.log }
  }
}
