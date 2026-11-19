import { readFile, access } from 'node:fs/promises'
import path from 'node:path'
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
import { isFileNotFound } from '../file-access'
import { isRecord } from '../ipc/arguments'

/**
Text read from a data file: text as written, anything else (a number, a list, null) as empty.
*/
function text(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function numberOr(value: unknown, fallback: number): number {
  return typeof value === 'number' ? value : fallback
}

/**
The switches or variables named in System.json, by their place in its list; an unnamed one, or
a list that is not a list, gives none.
*/
function namedIds(list: unknown): { id: number; name: string }[] {
  if (!Array.isArray(list)) return []
  const names: readonly unknown[] = list
  return names
    .map((name, index) => ({ id: index, name: text(name) }))
    .filter((named) => named.id > 0 && named.name !== '')
}

/**
The entries of a data file's list, its empty (`null`) slots left out. An entry that is not an
object holds no fields; its id is the number it holds, or else its place in the list, the id
RPG Maker MZ reads it by.
*/
function dataEntries(list: unknown): { id: number; entry: Record<string, unknown> }[] {
  if (!Array.isArray(list)) throw new TypeError('The data file holds no list of entries')
  const values: readonly unknown[] = list
  const entries: { id: number; entry: Record<string, unknown> }[] = []
  for (const [index, value] of values.entries()) {
    if (value === null) continue
    const entry = isRecord(value) ? value : {}
    entries.push({ id: numberOr(entry['id'], index), entry })
  }
  return entries
}

async function validateProject(projectPath: string): Promise<{ valid: boolean; error?: string }> {
  try {
    // Check for essential MZ project files
    const requiredFiles = ['data/System.json', 'data/Actors.json', 'js/plugins.js']

    for (const file of requiredFiles) {
      try {
        await access(path.join(projectPath, file))
      } catch {
        return { valid: false, error: `Missing required file: ${file}` }
      }
    }

    // Verify System.json is valid JSON
    const systemContent = await readFile(path.join(projectPath, 'data/System.json'), 'utf8')
    JSON.parse(systemContent)

    return { valid: true }
  } catch (error) {
    return { valid: false, error: `Failed to validate project: ${String(error)}` }
  }
}

async function loadDataArray(
  projectPath: string,
  filename: string
): Promise<{ id: number; name: string }[]> {
  try {
    const content = await readFile(path.join(projectPath, 'data', filename), 'utf8')
    return dataEntries(JSON.parse(content)).map(({ id, entry }) => ({
      id,
      name: text(entry['name'])
    }))
  } catch (error) {
    // Projects may leave out data files they do not use
    if (isFileNotFound(error)) {
      log.debug(`[ProjectParser] No ${filename} in ${projectPath}`)
    } else {
      log.error(`[ProjectParser] Failed to load ${filename} from ${projectPath}`, error)
    }
    return []
  }
}

/**
Note tags `<name>` and `<name:value>`, read as /<([^:>]+):?([^>]*)>/g read them (a tag with no
value reads 'true'), in linear time: a tag starting at a `<` can only end at the first `>`
after it, so that `>` is found once and kept for every `<` before it.
*/
function parseNoteTags(note: string): Record<string, string> {
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

// Actors and items share one shape: a name and a note with its tags
async function loadNotedEntries(projectPath: string, filename: string): Promise<MZActor[]> {
  try {
    const content = await readFile(path.join(projectPath, 'data', filename), 'utf8')
    return dataEntries(JSON.parse(content)).map(({ id, entry }) => {
      const note = text(entry['note'])
      return { id, name: text(entry['name']), note, noteTags: parseNoteTags(note) }
    })
  } catch {
    return []
  }
}

async function getActors(projectPath: string): Promise<MZActor[]> {
  return loadNotedEntries(projectPath, 'Actors.json')
}

async function getItems(projectPath: string): Promise<MZItem[]> {
  return loadNotedEntries(projectPath, 'Items.json')
}

async function getMaps(projectPath: string): Promise<MZMapInfo[]> {
  try {
    const content = await readFile(path.join(projectPath, 'data/MapInfos.json'), 'utf8')
    return dataEntries(JSON.parse(content)).map(({ id, entry }) => ({
      id,
      name: text(entry['name']),
      parentId: numberOr(entry['parentId'], 0)
    }))
  } catch {
    return []
  }
}

const getSkills = async (p: string): Promise<MZSkill[]> => loadDataArray(p, 'Skills.json')
const getWeapons = async (p: string): Promise<MZWeapon[]> => loadDataArray(p, 'Weapons.json')
const getArmors = async (p: string): Promise<MZArmor[]> => loadDataArray(p, 'Armors.json')
const getEnemies = async (p: string): Promise<MZEnemy[]> => loadDataArray(p, 'Enemies.json')
const getStates = async (p: string): Promise<MZState[]> => loadDataArray(p, 'States.json')
const getAnimations = async (p: string): Promise<MZAnimation[]> =>
  loadDataArray(p, 'Animations.json')
const getTilesets = async (p: string): Promise<MZTileset[]> => loadDataArray(p, 'Tilesets.json')
const getCommonEvents = async (p: string): Promise<MZCommonEvent[]> =>
  loadDataArray(p, 'CommonEvents.json')
const getClasses = async (p: string): Promise<MZClass[]> => loadDataArray(p, 'Classes.json')
const getTroops = async (p: string): Promise<MZTroop[]> => loadDataArray(p, 'Troops.json')

async function parseProject(projectPath: string): Promise<MZProject> {
  const systemContent = await readFile(path.join(projectPath, 'data/System.json'), 'utf8')
  let parsed: unknown
  try {
    parsed = JSON.parse(systemContent)
  } catch {
    throw new Error(`Failed to parse data/System.json — file may be corrupted or incomplete`)
  }
  const system = isRecord(parsed) ? parsed : {}

  // Extract switches/variables directly from already-loaded system (avoids re-reading System.json)
  const switches: MZSwitch[] = namedIds(system['switches'])
  const variables: MZVariable[] = namedIds(system['variables'])

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
    getActors(projectPath),
    getItems(projectPath),
    getMaps(projectPath),
    getSkills(projectPath),
    getWeapons(projectPath),
    getArmors(projectPath),
    getEnemies(projectPath),
    getStates(projectPath),
    getAnimations(projectPath),
    getTilesets(projectPath),
    getCommonEvents(projectPath),
    getClasses(projectPath),
    getTroops(projectPath)
  ])

  return {
    path: projectPath,
    gameTitle: text(system['gameTitle']) || 'Untitled',
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

export const ProjectParser = {
  validateProject,
  parseProject,
  getActors,
  getItems,
  getMaps,
  getSkills,
  getWeapons,
  getArmors,
  getEnemies,
  getStates,
  getAnimations,
  getTilesets,
  getCommonEvents,
  getClasses,
  getTroops,
  parseNoteTags
}
