import { IpcMain, IpcMainInvokeEvent } from 'electron'
import { readFile, writeFile, access, mkdir } from 'fs/promises'
import { join, dirname } from 'path'
import { PluginParser } from '../services/pluginParser'

export function setupPluginHandlers(ipcMain: IpcMain): void {
  ipcMain.handle(
    'plugin:save',
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
    'plugin:load',
    async (_event: IpcMainInvokeEvent, projectPath: string, filename: string) => {
      const pluginPath = join(projectPath, 'js', 'plugins', filename)
      const content = await readFile(pluginPath, 'utf-8')
      const result = PluginParser.parsePlugin(content, filename)
      console.log(`[plugin:load] ${filename} - params: ${result.parameters.length}, commands: ${result.commands.length}`)
      return result
    }
  )

  ipcMain.handle('plugin:parse', async (_event: IpcMainInvokeEvent, content: string) => {
    return PluginParser.parsePlugin(content)
  })

  ipcMain.handle(
    'plugin:read-raw',
    async (_event: IpcMainInvokeEvent, projectPath: string, filename: string) => {
      const pluginPath = join(projectPath, 'js', 'plugins', filename)
      return readFile(pluginPath, 'utf-8')
    }
  )

  ipcMain.handle('plugin:list', async (_event: IpcMainInvokeEvent, projectPath: string) => {
    const { readdir } = await import('fs/promises')
    const pluginsDir = join(projectPath, 'js', 'plugins')
    try {
      const files = await readdir(pluginsDir)
      return files.filter((f: string) => f.endsWith('.js') && !f.startsWith('_'))
    } catch {
      return []
    }
  })

  ipcMain.handle(
    'plugin:save-to-path',
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
}
