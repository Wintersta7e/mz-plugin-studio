// A stand-in for the preload `window.api`: every member is a recorded `vi.fn` that resolves to
// an empty or smallest valid value, so a test sets only the members it drives.
import { vi } from 'vitest'
import { createEmptyPlugin } from '../../src/shared/types/plugin'
import type { SaveResult } from '../../src/shared/ipc-types'
import type { MZProject } from '../../src/shared/types/mz'

/** A loaded project with no game data, for tests that only need one to be open */
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

/** A save that wrote nothing */
const notWritten: SaveResult = {
  success: false,
  path: '',
  conflict: 'exists-unrelated',
  diskSha256: ''
}

export type FakeApiOverrides = { [K in keyof Window['api']]?: Partial<Window['api'][K]> }

export function createFakeApi(overrides: FakeApiOverrides = {}): Window['api'] {
  const api: Window['api'] = {
    project: {
      validate: vi.fn(async () => ({ valid: false })),
      load: vi.fn(async () => ({
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
      }))
    },
    plugin: {
      save: vi.fn(async () => notWritten),
      saveToPath: vi.fn(async () => notWritten),
      load: vi.fn(async () => ({ plugin: createEmptyPlugin(), path: '', sha256: '' })),
      parse: vi.fn(async () => createEmptyPlugin()),
      readRaw: vi.fn(async () => ({ content: '', path: '', sha256: '' })),
      list: vi.fn(async () => []),
      readByPath: vi.fn(async () => ''),
      scanHeaders: vi.fn(async () => [])
    },
    dialog: {
      openFolder: vi.fn(async () => null),
      saveFile: vi.fn(async () => null),
      openFile: vi.fn(async () => null),
      message: vi.fn(async () => 0)
    },
    window: {
      minimize: vi.fn(),
      maximize: vi.fn(),
      close: vi.fn(),
      isMaximized: vi.fn(async () => false),
      onMaximizeChange: vi.fn(() => () => {})
    },
    log: {
      openFolder: vi.fn(async () => {}),
      setLevel: vi.fn()
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
