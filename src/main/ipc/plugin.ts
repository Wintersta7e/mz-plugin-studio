import { IpcMain, IpcMainInvokeEvent } from 'electron'
import { readFile, readdir, writeFile, access, mkdir } from 'fs/promises'
import { join, dirname, resolve, normalize, basename, extname } from 'path'
import { PluginParser } from '../services/pluginParser'
import { IPC_CHANNELS } from '../../shared/ipc-types'
import type { ScannedPluginHeader } from '../../shared/ipc-types'

/** Allowed file extensions for read/write-by-path operations */
const ALLOWED_EXTENSIONS = new Set(['.js', '.mzparams', '.json'])

/**
 * Validate that a file path is safe for read/write operations.
 * - Normalizes the path to resolve traversal sequences
 * - Rejects paths with remaining '..' components
 * - Restricts to allowed file extensions
 */
function assertSafeFilePath(filePath: string): void {
  const normalized = normalize(resolve(filePath))
  if (normalized.includes('..')) {
    throw new Error('Path traversal is not allowed')
  }
  const ext = extname(normalized).toLowerCase()
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    throw new Error(`File extension "${ext}" is not allowed. Allowed: ${[...ALLOWED_EXTENSIONS].join(', ')}`)
  }
}

/**
 * Validate that a filename is a simple name (no path separators or traversal).
 */
function assertSafeFilename(filename: string): void {
  if (filename !== basename(filename) || filename.includes('..')) {
    throw new Error('Invalid filename: must not contain path separators or traversal')
  }
}

export function setupPluginHandlers(ipcMain: IpcMain): void {
  ipcMain.handle(
    IPC_CHANNELS.PLUGIN_SAVE,
    async (_event: IpcMainInvokeEvent, projectPath: string, filename: string, content: string) => {
      assertSafeFilename(filename)
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
      assertSafeFilename(filename)
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
      assertSafeFilename(filename)
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
      assertSafeFilePath(filePath)
      return readFile(filePath, 'utf-8')
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.PLUGIN_SAVE_TO_PATH,
    async (_event: IpcMainInvokeEvent, filePath: string, content: string) => {
      assertSafeFilePath(filePath)
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

          // Extract prototype overrides from code (outside comments/strings)
          const overrideSet = new Set<string>()
          const cleaned = content.replace(
            /\/\*[\s\S]*?\*\/|\/\/[^\n]*|`(?:[^`\\]|\\.)*`|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/g,
            (m) => ' '.repeat(m.length)
          )
          const overrideRegex = /(\w+)\.prototype\.(\w+)(?:\.\w+)*\s*=/g
          let oMatch: RegExpExecArray | null
          while ((oMatch = overrideRegex.exec(cleaned)) !== null) {
            overrideSet.add(`${oMatch[1]}.prototype.${oMatch[2]}`)
          }
          const aliasRegex = /(?:const|let|var)\s+\w+\s*=\s*(\w+)\.prototype\.(\w+)\s*[;,]/g
          while ((oMatch = aliasRegex.exec(cleaned)) !== null) {
            overrideSet.add(`${oMatch[1]}.prototype.${oMatch[2]}`)
          }

          results.push({
            filename: file,
            name: file.replace(/\.js$/, ''),
            base: baseEntries,
            orderAfter: orderAfterEntries,
            orderBefore: orderBeforeEntries,
            overrides: [...overrideSet]
          })
        }

        return results
      } catch {
        return []
      }
    }
  )
}
