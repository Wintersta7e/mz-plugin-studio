import { readFile, access } from 'node:fs/promises'
import { join } from 'node:path'
import log from 'electron-log/main'
import type {
  MZProject,
  MZActor,
  MZItem,
  MZMapInfo,
  MZSwitch,
  MZVariable,
  MZSkill,
  MZWeapon,
  MZArmor,
  MZEnemy,
  MZState,
  MZAnimation,
  MZTileset,
  MZCommonEvent,
  MZClass,
  MZTroop
} from '../../shared/types/mz'

/**
A name read from a data file: text as written, anything else (a number, a list, null) as empty.
*/
function nameText(name: unknown): string {
  return typeof name === 'string' ? name : ''
}

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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let system: any
    try {
      system = JSON.parse(systemContent)
    } catch {
      throw new Error(`Failed to parse data/System.json — file may be corrupted or incomplete`)
    }

    // Extract switches/variables directly from already-loaded system (avoids re-reading System.json)
    const switches: MZSwitch[] = (system.switches || [])
      .map((name: unknown, index: number) => ({ id: index, name: nameText(name) }))
      .filter((s: MZSwitch) => s.id > 0 && s.name)
    const variables: MZVariable[] = (system.variables || [])
      .map((name: unknown, index: number) => ({ id: index, name: nameText(name) }))
      .filter((v: MZVariable) => v.id > 0 && v.name)

    const [
      actors,
      items,
      maps,
      skills,
      weapons,
      armors,
      enemies,
      states,
      animations,
      tilesets,
      commonEvents,
      classes,
      troops
    ] = await Promise.all([
      this.getActors(path),
      this.getItems(path),
      this.getMaps(path),
      this.getSkills(path),
      this.getWeapons(path),
      this.getArmors(path),
      this.getEnemies(path),
      this.getStates(path),
      this.getAnimations(path),
      this.getTilesets(path),
      this.getCommonEvents(path),
      this.getClasses(path),
      this.getTroops(path)
    ])

    return {
      path,
      gameTitle: system.gameTitle || 'Untitled',
      switches,
      variables,
      actors,
      items,
      maps,
      skills,
      weapons,
      armors,
      enemies,
      states,
      animations,
      tilesets,
      commonEvents,
      classes,
      troops
    }
  }

  private static async loadDataArray(
    projectPath: string,
    filename: string
  ): Promise<{ id: number; name: string }[]> {
    try {
      const content = await readFile(join(projectPath, 'data', filename), 'utf-8')
      const data: ({ id: number; name: string } | null)[] = JSON.parse(content)
      return data
        .filter((d): d is { id: number; name: string } => d !== null)
        .map((d) => ({ id: d.id, name: nameText(d.name) }))
    } catch (error) {
      // Projects may leave out data files they do not use
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        log.debug(`[ProjectParser] No ${filename} in ${projectPath}`)
      } else {
        log.error(`[ProjectParser] Failed to load ${filename} from ${projectPath}`, error)
      }
      return []
    }
  }

  static async getActors(path: string): Promise<MZActor[]> {
    try {
      const content = await readFile(join(path, 'data/Actors.json'), 'utf-8')
      const actors = JSON.parse(content)

      return actors
        .filter((a: MZActor | null) => a !== null)
        .map((a: MZActor) => ({
          id: a.id,
          name: nameText(a.name),
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
        .filter((index: MZItem | null) => index !== null)
        .map((index: MZItem) => ({
          id: index.id,
          name: nameText(index.name),
          note: index.note || '',
          noteTags: this.parseNoteTags(index.note || '')
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
          name: nameText(m.name),
          parentId: m.parentId || 0
        }))
    } catch {
      return []
    }
  }

  static getSkills = async (p: string): Promise<MZSkill[]> =>
    ProjectParser.loadDataArray(p, 'Skills.json')
  static getWeapons = async (p: string): Promise<MZWeapon[]> =>
    ProjectParser.loadDataArray(p, 'Weapons.json')
  static getArmors = async (p: string): Promise<MZArmor[]> =>
    ProjectParser.loadDataArray(p, 'Armors.json')
  static getEnemies = async (p: string): Promise<MZEnemy[]> =>
    ProjectParser.loadDataArray(p, 'Enemies.json')
  static getStates = async (p: string): Promise<MZState[]> =>
    ProjectParser.loadDataArray(p, 'States.json')
  static getAnimations = async (p: string): Promise<MZAnimation[]> =>
    ProjectParser.loadDataArray(p, 'Animations.json')
  static getTilesets = async (p: string): Promise<MZTileset[]> =>
    ProjectParser.loadDataArray(p, 'Tilesets.json')
  static getCommonEvents = async (p: string): Promise<MZCommonEvent[]> =>
    ProjectParser.loadDataArray(p, 'CommonEvents.json')
  static getClasses = async (p: string): Promise<MZClass[]> =>
    ProjectParser.loadDataArray(p, 'Classes.json')
  static getTroops = async (p: string): Promise<MZTroop[]> =>
    ProjectParser.loadDataArray(p, 'Troops.json')

  /**
  Note tags `<name>` and `<name:value>`, read as /<([^:>]+):?([^>]*)>/g read them (a tag with no
  value reads 'true'), in linear time: a tag starting at a `<` can only end at the first `>`
  after it, so that `>` is found once and kept for every `<` before it.
  */
  static parseNoteTags(note: string): Record<string, string> {
    const tags: Record<string, string> = {}
    let end = -1
    let start = note.indexOf('<')

    while (start !== -1) {
      if (end <= start) end = note.indexOf('>', start + 1)
      if (end === -1) break
      // A name needs one character before any `:` or `>`
      if (end === start + 1 || note.startsWith(':', start + 1)) {
        start = note.indexOf('<', start + 1)
      } else {
        const tag = note.slice(start + 1, end)
        const colon = tag.indexOf(':')
        const value = colon === -1 ? '' : tag.slice(colon + 1)
        tags[colon === -1 ? tag : tag.slice(0, colon)] = value || 'true'
        start = note.indexOf('<', end + 1)
      }
    }

    return tags
  }
}
