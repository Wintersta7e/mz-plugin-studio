// `window.api` over the main-process plugin functions, so every save meets the real file check
// and reads and writes real files. A function that throws rejects as `ipcRenderer.invoke` does.
// The save dialog returns what `chosen` answers and records it as chosen in a dialog, as main
// does; message dialogs answer from `answers`, then Cancel (0).
import { vi } from 'vitest'
import { recordWriteGrant } from '../../../src/main/file-access'
import {
  loadPluginFile,
  readRawPlugin,
  savePluginFile,
  savePluginToPath
} from '../../../src/main/ipc/plugin'
import { PluginParser } from '../../../src/main/services/pluginParser'
import { IPC_CHANNELS } from '../../../src/shared/ipc-types'
import { createFakeApi } from '../../helpers/fake-api'
import type { FakeApiOverrides } from '../../helpers/fake-api'

export interface MainApiOptions {
  chosen?: () => string | null
  answers?: number[]
  overrides?: FakeApiOverrides
}

/**
 * `fn` as the renderer reaches it over `channel`: Electron sends a thrown error back as its
 * string and rejects with "Error invoking remote method '<channel>': <Name>Error: <message>".
 */
export function viaIpc<A extends unknown[], R>(
  channel: string,
  fn: (...args: A) => Promise<R>
): (...args: A) => Promise<R> {
  return async (...args) => {
    try {
      return await fn(...args)
    } catch (error) {
      throw new Error(`Error invoking remote method '${channel}': ${String(error)}`)
    }
  }
}

export function createMainApi({
  chosen = () => null,
  answers = [],
  overrides = {}
}: MainApiOptions = {}): Window['api'] {
  return createFakeApi({
    ...overrides,
    plugin: {
      save: vi.fn(viaIpc(IPC_CHANNELS.PLUGIN_SAVE, savePluginFile)),
      saveToPath: vi.fn(viaIpc(IPC_CHANNELS.PLUGIN_SAVE_TO_PATH, savePluginToPath)),
      load: vi.fn(viaIpc(IPC_CHANNELS.PLUGIN_LOAD, loadPluginFile)),
      readRaw: vi.fn(viaIpc(IPC_CHANNELS.PLUGIN_READ_RAW, readRawPlugin)),
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
