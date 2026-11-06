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
import { createFakeApi, type FakeApiOverrides } from '../../helpers/fake-api'

export interface MainApiOptions {
  chosen?: () => string | null
  answers?: number[]
  overrides?: FakeApiOverrides
}

/**
`fn` as the renderer reaches it over `channel`: Electron sends a thrown error back as its
string and rejects with "Error invoking remote method '<channel>': <Name>Error: <message>".
*/
export function viaIpc<A extends unknown[], R>(
  channel: string,
  function_: (...args: A) => Promise<R>
): (...args: A) => Promise<R> {
  return async (...args) => {
    try {
      return await function_(...args)
    } catch (error) {
      throw new Error(`Error invoking remote method '${channel}': ${String(error)}`, {
        cause: error
      })
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
      save: vi
        .fn<Window['api']['plugin']['save']>()
        .mockImplementation(viaIpc(IPC_CHANNELS.PLUGIN_SAVE, savePluginFile)),
      saveToPath: vi
        .fn<Window['api']['plugin']['saveToPath']>()
        .mockImplementation(viaIpc(IPC_CHANNELS.PLUGIN_SAVE_TO_PATH, savePluginToPath)),
      load: vi
        .fn<Window['api']['plugin']['load']>()
        .mockImplementation(viaIpc(IPC_CHANNELS.PLUGIN_LOAD, loadPluginFile)),
      readRaw: vi
        .fn<Window['api']['plugin']['readRaw']>()
        .mockImplementation(viaIpc(IPC_CHANNELS.PLUGIN_READ_RAW, readRawPlugin)),
      parse: vi.fn<Window['api']['plugin']['parse']>().mockImplementation(async (content) => {
        const parsed = PluginParser.parsePlugin(content)
        await Promise.resolve()
        return parsed
      }),
      ...overrides.plugin
    },
    dialog: {
      saveFile: vi.fn<Window['api']['dialog']['saveFile']>().mockImplementation(async () => {
        const path = chosen()
        if (path !== null) recordWriteGrant(path)
        await Promise.resolve()
        return path
      }),
      message: vi.fn<Window['api']['dialog']['message']>().mockImplementation(async () => {
        const answer = answers.shift() ?? 0
        await Promise.resolve()
        return answer
      }),
      ...overrides.dialog
    }
  })
}
