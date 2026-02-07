import { readFile, access } from 'fs/promises'
import { join } from 'path'
import type {
  MZProject,
  MZActor,
  MZItem,
  MZMapInfo,
  MZPluginEntry,
  MZSwitch,
  MZVariable
} from '../../renderer/src/types/mz'

export class ProjectParser {
  static async validateProject(path: string): Promise<{ valid: boolean; error?: string }> {
    try {
      // Check for essential MZ project files
      const requiredFiles = ['data/System.json', 'data/Actors.json', 'js/plugins.js']

      for (const file of requiredFiles) {
        try {
          await access(join(path, file))
        } catch {
          return { valid: false, error: `Missing required file: ${file}` }
        }
      }

      // Verify System.json is valid JSON
      const systemContent = await readFile(join(path, 'data/System.json'), 'utf-8')
      JSON.parse(systemContent)

      return { valid: true }
    } catch (error) {
      return { valid: false, error: `Failed to validate project: ${error}` }
    }
  }

  static async parseProject(path: string): Promise<MZProject> {
    const systemContent = await readFile(join(path, 'data/System.json'), 'utf-8')
    const system = JSON.parse(systemContent)

    const actors = await this.getActors(path)
    const items = await this.getItems(path)
    const maps = await this.getMaps(path)
    const plugins = await this.getPlugins(path)
    const switches = await this.getSwitches(path)
    const variables = await this.getVariables(path)

    return {
      path,
      gameTitle: system.gameTitle || 'Untitled',
      system: {
        switches: switches.map((s) => s.name),
        variables: variables.map((v) => v.name)
      },
      actors,
      items,
      maps,
      plugins
    }
  }

  static async getSwitches(path: string): Promise<MZSwitch[]> {
    const systemContent = await readFile(join(path, 'data/System.json'), 'utf-8')
    const system = JSON.parse(systemContent)

    return (system.switches || [])
      .map((name: string | null, index: number) => ({
        id: index,
        name: name || ''
      }))
      .filter((s: MZSwitch) => s.id > 0 && s.name)
  }

  static async getVariables(path: string): Promise<MZVariable[]> {
    const systemContent = await readFile(join(path, 'data/System.json'), 'utf-8')
    const system = JSON.parse(systemContent)

    return (system.variables || [])
      .map((name: string | null, index: number) => ({
        id: index,
        name: name || ''
      }))
      .filter((v: MZVariable) => v.id > 0 && v.name)
  }

  static async getActors(path: string): Promise<MZActor[]> {
    try {
      const content = await readFile(join(path, 'data/Actors.json'), 'utf-8')
      const actors = JSON.parse(content)

      return actors
        .filter((a: MZActor | null) => a !== null)
        .map((a: MZActor) => ({
          id: a.id,
          name: a.name,
          note: a.note || '',
          noteTags: this.parseNoteTags(a.note || '')
        }))
    } catch {
      return []
    }
  }

  static async getItems(path: string): Promise<MZItem[]> {
    try {
      const content = await readFile(join(path, 'data/Items.json'), 'utf-8')
      const items = JSON.parse(content)

      return items
        .filter((i: MZItem | null) => i !== null)
        .map((i: MZItem) => ({
          id: i.id,
          name: i.name,
          note: i.note || '',
          noteTags: this.parseNoteTags(i.note || '')
        }))
    } catch {
      return []
    }
  }

  static async getMaps(path: string): Promise<MZMapInfo[]> {
    try {
      const content = await readFile(join(path, 'data/MapInfos.json'), 'utf-8')
      const maps = JSON.parse(content)

      return maps
        .filter((m: MZMapInfo | null) => m !== null)
        .map((m: MZMapInfo) => ({
          id: m.id,
          name: m.name,
          parentId: m.parentId || 0
        }))
    } catch {
      return []
    }
  }

  static async getPlugins(path: string): Promise<MZPluginEntry[]> {
    try {
      const content = await readFile(join(path, 'js/plugins.js'), 'utf-8')
      // plugins.js format: var $plugins = [...];
      const match = content.match(/\$plugins\s*=\s*(\[[\s\S]*?\]);/)
      if (!match) return []

      const plugins = JSON.parse(match[1])
      return plugins.map((p: MZPluginEntry) => ({
        name: p.name,
        status: p.status,
        description: p.description || '',
        parameters: p.parameters || {}
      }))
    } catch {
      return []
    }
  }

  static parseNoteTags(note: string): Record<string, string> {
    const tags: Record<string, string> = {}
    const regex = /<([^:>]+):?([^>]*)>/g
    let match

    while ((match = regex.exec(note)) !== null) {
      tags[match[1]] = match[2] || 'true'
    }

    return tags
  }
}
