import { IpcMain, IpcMainInvokeEvent } from 'electron'
import { readFile, readdir, writeFile, access, mkdir } from 'fs/promises'
import { join, dirname } from 'path'
import { PluginParser } from '../services/pluginParser'
import { IPC_CHANNELS } from '../../shared/ipc-types'
import type { ScannedPluginHeader } from '../../shared/ipc-types'

export function setupPluginHandlers(ipcMain: IpcMain): void {
  ipcMain.handle(
    IPC_CHANNELS.PLUGIN_SAVE,
    async (_event: IpcMainInvokeEvent, projectPath: string, filename: string, content: string) => {
      const pluginPath = join(projectPath, 'js', 'plugins', filename)
      const dir = dirname(pluginPath)

      try {
        await access(dir)
      } catch {
        await mkdir(dir, { recursive: true })
      }

      await writeFile(pluginPath, content, 'utf-8')
      return { success: true, path: pluginPath }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.PLUGIN_LOAD,
    async (_event: IpcMainInvokeEvent, projectPath: string, filename: string) => {
      const pluginPath = join(projectPath, 'js', 'plugins', filename)
      const content = await readFile(pluginPath, 'utf-8')
      const result = PluginParser.parsePlugin(content, filename)
      console.log(`[plugin:load] ${filename} - params: ${result.parameters.length}, commands: ${result.commands.length}`)
      return result
    }
  )

  ipcMain.handle(IPC_CHANNELS.PLUGIN_PARSE, async (_event: IpcMainInvokeEvent, content: string) => {
    return PluginParser.parsePlugin(content)
  })

  ipcMain.handle(
    IPC_CHANNELS.PLUGIN_READ_RAW,
    async (_event: IpcMainInvokeEvent, projectPath: string, filename: string) => {
      const pluginPath = join(projectPath, 'js', 'plugins', filename)
      return readFile(pluginPath, 'utf-8')
    }
  )

  ipcMain.handle(IPC_CHANNELS.PLUGIN_LIST, async (_event: IpcMainInvokeEvent, projectPath: string) => {
    const pluginsDir = join(projectPath, 'js', 'plugins')
    try {
      const files = await readdir(pluginsDir)
      return files.filter((f: string) => f.endsWith('.js') && !f.startsWith('_'))
    } catch {
      return []
    }
  })

  ipcMain.handle(
    IPC_CHANNELS.PLUGIN_READ_BY_PATH,
    async (_event: IpcMainInvokeEvent, filePath: string) => {
      return readFile(filePath, 'utf-8')
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.PLUGIN_SAVE_TO_PATH,
    async (_event: IpcMainInvokeEvent, filePath: string, content: string) => {
      const dir = dirname(filePath)
      try {
        await access(dir)
      } catch {
        await mkdir(dir, { recursive: true })
      }
      await writeFile(filePath, content, 'utf-8')
      return { success: true, path: filePath }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.PLUGIN_SCAN_HEADERS,
    async (_event: IpcMainInvokeEvent, projectPath: string): Promise<ScannedPluginHeader[]> => {
      const pluginsDir = join(projectPath, 'js', 'plugins')
      try {
        const files = await readdir(pluginsDir)
        const jsFiles = files.filter((f: string) => f.endsWith('.js') && !f.startsWith('_'))

        const results: ScannedPluginHeader[] = []

        for (const file of jsFiles) {
          const filePath = join(pluginsDir, file)
          const content = await readFile(filePath, 'utf-8')

          // Only read the MZ annotation block (/*: ... */)
          const headerMatch = content.match(/\/\*:[\s\S]*?\*\//)
          const header = headerMatch ? headerMatch[0] : ''

          const baseEntries: string[] = []
          const orderAfterEntries: string[] = []

          const baseRegex = /@base\s+(\S+)/g
          let match
          while ((match = baseRegex.exec(header)) !== null) {
            baseEntries.push(match[1])
          }

          const orderRegex = /@orderAfter\s+(\S+)/g
          while ((match = orderRegex.exec(header)) !== null) {
            orderAfterEntries.push(match[1])
          }

          results.push({
            filename: file,
            name: file.replace(/\.js$/, ''),
            base: baseEntries,
            orderAfter: orderAfterEntries
          })
        }

        return results
      } catch {
        return []
      }
    }
  )
}
