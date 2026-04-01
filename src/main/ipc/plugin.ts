import { type IpcMain, type IpcMainInvokeEvent } from 'electron'
import { readFile, readdir, writeFile, access, mkdir } from 'fs/promises'
import { join, dirname } from 'path'
import log from 'electron-log/main'
import { PluginParser } from '../services/pluginParser'
import { IPC_CHANNELS } from '../../shared/ipc-types'
import type { ScannedPluginHeader } from '../../shared/ipc-types'
import { extractOverrides } from '../../shared/override-extractor'
import {
  assertSafeFilePath,
  assertSafeFilename,
  assertSafeProjectPath
} from '../../shared/path-safety'

export function setupPluginHandlers(ipcMain: IpcMain): void {
  ipcMain.handle(
    IPC_CHANNELS.PLUGIN_SAVE,
    async (_event: IpcMainInvokeEvent, projectPath: string, filename: string, content: string) => {
      assertSafeProjectPath(projectPath)
      assertSafeFilename(filename)
      log.debug(`[plugin:save] ${filename} to ${projectPath}`)
      const pluginPath = join(projectPath, 'js', 'plugins', filename)
      const dir = dirname(pluginPath)

      try {
        await access(dir)
      } catch {
        await mkdir(dir, { recursive: true })
      }

      await writeFile(pluginPath, content, 'utf-8')
      log.info(`[plugin:save] Saved ${filename} to ${pluginPath}`)
      return { success: true, path: pluginPath }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.PLUGIN_LOAD,
    async (_event: IpcMainInvokeEvent, projectPath: string, filename: string) => {
      assertSafeProjectPath(projectPath)
      assertSafeFilename(filename)
      const pluginPath = join(projectPath, 'js', 'plugins', filename)
      try {
        const content = await readFile(pluginPath, 'utf-8')
        const result = PluginParser.parsePlugin(content, filename)
        log.info(
          `[plugin:load] ${filename} — params: ${result.parameters.length}, commands: ${result.commands.length}`
        )
        return result
      } catch (error) {
        log.error(`[plugin:load] Failed to load ${filename}:`, error)
        throw new Error(
          `Failed to load plugin "${filename}": ${error instanceof Error ? error.message : String(error)}`
        )
      }
    }
  )

  ipcMain.handle(IPC_CHANNELS.PLUGIN_PARSE, async (_event: IpcMainInvokeEvent, content: string) => {
    log.debug('[plugin:parse] Parsing plugin content')
    try {
      return PluginParser.parsePlugin(content)
    } catch (error) {
      log.error('[plugin:parse] Failed to parse plugin:', error)
      throw new Error(
        `Failed to parse plugin: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  })

  ipcMain.handle(
    IPC_CHANNELS.PLUGIN_READ_RAW,
    async (_event: IpcMainInvokeEvent, projectPath: string, filename: string) => {
      assertSafeProjectPath(projectPath)
      assertSafeFilename(filename)
      log.debug(`[plugin:read-raw] ${filename}`)
      const pluginPath = join(projectPath, 'js', 'plugins', filename)
      return readFile(pluginPath, 'utf-8')
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.PLUGIN_LIST,
    async (_event: IpcMainInvokeEvent, projectPath: string) => {
      assertSafeProjectPath(projectPath)
      const pluginsDir = join(projectPath, 'js', 'plugins')
      try {
        const files = await readdir(pluginsDir)
        const jsPlugins = files.filter((f: string) => f.endsWith('.js') && !f.startsWith('_'))
        log.debug(`[plugin:list] Found ${jsPlugins.length} plugins in ${projectPath}`)
        return jsPlugins
      } catch {
        log.debug(`[plugin:list] No plugins directory at ${projectPath}`)
        return []
      }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.PLUGIN_READ_BY_PATH,
    async (_event: IpcMainInvokeEvent, filePath: string) => {
      assertSafeFilePath(filePath)
      log.debug(`[plugin:read-by-path] ${filePath}`)
      return readFile(filePath, 'utf-8')
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.PLUGIN_SAVE_TO_PATH,
    async (_event: IpcMainInvokeEvent, filePath: string, content: string) => {
      assertSafeFilePath(filePath)
      log.debug(`[plugin:save-to-path] ${filePath}`)
      const dir = dirname(filePath)
      try {
        await access(dir)
      } catch {
        await mkdir(dir, { recursive: true })
      }
      await writeFile(filePath, content, 'utf-8')
      log.info(`[plugin:save-to-path] Saved to ${filePath}`)
      return { success: true, path: filePath }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.PLUGIN_SCAN_HEADERS,
    async (_event: IpcMainInvokeEvent, projectPath: string): Promise<ScannedPluginHeader[]> => {
      assertSafeProjectPath(projectPath)
      const pluginsDir = join(projectPath, 'js', 'plugins')
      try {
        const files = await readdir(pluginsDir)
        const jsFiles = files.filter((f: string) => f.endsWith('.js') && !f.startsWith('_'))

        // Read all plugin files in parallel for faster scanning (PERF-02)
        const results: ScannedPluginHeader[] = await Promise.all(
          jsFiles.map(async (file) => {
            const filePath = join(pluginsDir, file)
            const content = await readFile(filePath, 'utf-8')

            // Only read the MZ annotation block (/*: ... */)
            const headerMatch = content.match(/\/\*:[\s\S]*?\*\//)
            const header = headerMatch ? headerMatch[0] : ''

            const baseEntries: string[] = []
            const orderAfterEntries: string[] = []
            const orderBeforeEntries: string[] = []

            const baseRegex = /@base\s+(\S+)/g
            let match: RegExpExecArray | null
            while ((match = baseRegex.exec(header)) !== null) {
              baseEntries.push(match[1])
            }

            const orderAfterRegex = /@orderAfter\s+(\S+)/g
            while ((match = orderAfterRegex.exec(header)) !== null) {
              orderAfterEntries.push(match[1])
            }

            const orderBeforeRegex = /@orderBefore\s+(\S+)/g
            while ((match = orderBeforeRegex.exec(header)) !== null) {
              orderBeforeEntries.push(match[1])
            }

            return {
              filename: file,
              name: file.replace(/\.js$/, ''),
              base: baseEntries,
              orderAfter: orderAfterEntries,
              orderBefore: orderBeforeEntries,
              overrides: extractOverrides(content)
            }
          })
        )

        log.info(`[plugin:scan-headers] Scanned ${results.length} plugins in ${projectPath}`)
        return results
      } catch (error) {
        log.error(`[plugin:scan-headers] Failed to scan ${projectPath}:`, error)
        return []
      }
    }
  )
}
