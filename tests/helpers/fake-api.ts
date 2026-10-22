// A stand-in for the preload `window.api`: every member is a recorded `vi.fn` that resolves to
// an empty or smallest valid value, so a test sets only the members it drives.
import { vi } from 'vitest'
import { createEmptyPlugin } from '../../src/shared/types/plugin'
import type { SaveResult } from '../../src/shared/ipc-types'

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
      })),
      getSwitches: vi.fn(async () => []),
      getVariables: vi.fn(async () => []),
      getActors: vi.fn(async () => []),
      getItems: vi.fn(async () => []),
      getMaps: vi.fn(async () => []),
      getPlugins: vi.fn(async () => []),
      getSkills: vi.fn(async () => []),
      getWeapons: vi.fn(async () => []),
      getArmors: vi.fn(async () => []),
      getEnemies: vi.fn(async () => []),
      getStates: vi.fn(async () => []),
      getAnimations: vi.fn(async () => []),
      getTilesets: vi.fn(async () => []),
      getCommonEvents: vi.fn(async () => []),
      getClasses: vi.fn(async () => []),
      getTroops: vi.fn(async () => [])
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
      forceClose: vi.fn(),
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
