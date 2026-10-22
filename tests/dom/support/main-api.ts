// `window.api` over the main-process plugin functions, so every save meets the real file check
// and reads and writes real files. The save dialog returns what `chosen` answers and records it
// as chosen in a dialog, as main does; message dialogs answer from `answers`, then Cancel (0).
import { vi } from 'vitest'
import { recordWriteGrant } from '../../../src/main/file-access'
import {
  loadPluginFile,
  readRawPlugin,
  savePluginFile,
  savePluginToPath
} from '../../../src/main/ipc/plugin'
import { PluginParser } from '../../../src/main/services/pluginParser'
import { createFakeApi } from '../../helpers/fake-api'
import type { FakeApiOverrides } from '../../helpers/fake-api'

export interface MainApiOptions {
  chosen?: () => string | null
  answers?: number[]
  overrides?: FakeApiOverrides
}

export function createMainApi({
  chosen = () => null,
  answers = [],
  overrides = {}
}: MainApiOptions = {}): Window['api'] {
  return createFakeApi({
    ...overrides,
    plugin: {
      save: vi.fn(savePluginFile),
      saveToPath: vi.fn(savePluginToPath),
      load: vi.fn(loadPluginFile),
      readRaw: vi.fn(readRawPlugin),
      parse: vi.fn(async (content: string) => PluginParser.parsePlugin(content)),
      ...overrides.plugin
    },
    dialog: {
      saveFile: vi.fn(async () => {
        const path = chosen()
        if (path !== null) recordWriteGrant(path)
        return path
      }),
      message: vi.fn(async () => answers.shift() ?? 0),
      ...overrides.dialog
    }
  })
}
