import type { PluginBaseline, PluginDefinition } from '../types/plugin'
import { generateHeaderOnly, generatePlugin, generateRawMode, hasMainBlock } from './generator'

export type OutputRefusal = 'source-missing' | 'header-without-main-block'

export type PluginOutput =
  | { ok: true; code: string }
  | { ok: false; refusal: OutputRefusal; message: string }

/** Loaded from a file, as opposed to created in the app. */
export function isImported(plugin: Pick<PluginDefinition, 'importedFrom'>): boolean {
  return plugin.importedFrom !== undefined
}

/** Imported, but the file text raw mode saves from is not loaded. */
export function isSourceMissing(plugin: PluginDefinition): boolean {
  return isImported(plugin) && !plugin.rawSource
}

/** Raw mode is on for an imported plugin unless the user turned it off. */
export function isRawMode(
  plugin: Pick<PluginDefinition, 'importedFrom'>,
  choice: boolean | undefined
): boolean {
  return isImported(plugin) && (choice ?? true)
}

const fileOf = (plugin: PluginDefinition): string => plugin.importedFrom ?? `${plugin.meta.name}.js`

/** The code a save writes, or why raw mode cannot save it. */
export function generatePluginOutput(
  plugin: PluginDefinition,
  rawMode: boolean,
  baseline: PluginBaseline | null
): PluginOutput {
  if (!rawMode) return { ok: true, code: generatePlugin(plugin) }
  if (!plugin.rawSource || baseline === null) {
    return {
      ok: false,
      refusal: 'source-missing',
      message: `Not saved: the original file ${fileOf(plugin)} is not loaded. Reload it from the project, or turn raw mode off to save regenerated code.`
    }
  }
  if (
    !hasMainBlock(plugin.rawSource) &&
    generateHeaderOnly(plugin) !== generateHeaderOnly(baseline)
  ) {
    return {
      ok: false,
      refusal: 'header-without-main-block',
      message: `Header changes cannot be saved: ${fileOf(plugin)} has no main annotation block (/*: or /*:en). Undo the header changes, or turn raw mode off to save regenerated code.`
    }
  }
  return { ok: true, code: generateRawMode(plugin, baseline) }
}
