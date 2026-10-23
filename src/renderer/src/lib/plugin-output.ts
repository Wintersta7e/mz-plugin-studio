import type { PluginBaseline, PluginDefinition } from '../types/plugin'
import {
  RawModeParseError,
  generateHeaderOnly,
  generatePlugin,
  generateRawMode,
  hasMainBlock,
  scriptParseError
} from './generator'

export type OutputRefusal =
  | 'source-missing'
  | 'header-without-main-block'
  | 'unparsable-source'
  | 'invalid-output'

export type PluginOutput =
  | { ok: true; code: string }
  | { ok: false; refusal: OutputRefusal; message: string }

/** Loaded from a file, as opposed to created in the app. */
export function isImported(plugin: Pick<PluginDefinition, 'importedFrom'>): boolean {
  return plugin.importedFrom !== undefined
}

/** Raw mode is on for an imported plugin unless the user turned it off. */
export function isRawMode(
  plugin: Pick<PluginDefinition, 'importedFrom'>,
  choice: boolean | undefined
): boolean {
  return isImported(plugin) && (choice ?? true)
}

/** The `.js` file a save writes: the file an imported plugin came from, else one named after it. */
export const saveFileName = (plugin: Pick<PluginDefinition, 'importedFrom' | 'meta'>): string =>
  plugin.importedFrom ?? `${plugin.meta.name}.js`

/**
 * The file text raw mode builds on and the values it was read with; null when either is not
 * loaded, which is when raw mode refuses with `source-missing`.
 */
export function loadedSource(
  plugin: Pick<PluginDefinition, 'rawSource'>,
  baseline: PluginBaseline | null
): { rawSource: string; baseline: PluginBaseline } | null {
  return plugin.rawSource && baseline !== null ? { rawSource: plugin.rawSource, baseline } : null
}

/** The code a save writes, or why raw mode cannot save it. */
export function generatePluginOutput(
  plugin: PluginDefinition,
  rawMode: boolean,
  baseline: PluginBaseline | null
): PluginOutput {
  if (!rawMode) return { ok: true, code: generatePlugin(plugin) }
  const source = loadedSource(plugin, baseline)
  if (source === null) {
    return {
      ok: false,
      refusal: 'source-missing',
      message: `Not saved: the original file ${saveFileName(plugin)} is not loaded. Reload it from the project, or turn raw mode off to save regenerated code.`
    }
  }
  const { rawSource } = source
  if (
    !hasMainBlock(rawSource) &&
    generateHeaderOnly(plugin) !== generateHeaderOnly(source.baseline)
  ) {
    return {
      ok: false,
      refusal: 'header-without-main-block',
      message: `Header changes cannot be saved: ${saveFileName(plugin)} has no main annotation block (/*: or /*:en). Undo the header changes, or turn raw mode off to save regenerated code.`
    }
  }
  let code: string
  try {
    code = generateRawMode(plugin, source.baseline)
  } catch (error) {
    if (!(error instanceof RawModeParseError)) throw error
    return {
      ok: false,
      refusal: 'unparsable-source',
      message: `Not saved: ${saveFileName(plugin)} is not valid JavaScript (${error.parseError}), so raw mode cannot place added parameters, commands or structs in it. Undo those additions, or turn raw mode off to save regenerated code.`
    }
  }
  // A plugin that does not parse stops the game loading it; a file that did not parse before is
  // still written as edited
  if (code !== rawSource) {
    const problem = scriptParseError(code)
    if (problem !== null && scriptParseError(rawSource) === null) {
      return {
        ok: false,
        refusal: 'invalid-output',
        message: `Not saved: the code raw mode built for ${saveFileName(plugin)} is not valid JavaScript (${problem}), so the game could not load it. Undo the last edits, or turn raw mode off to save regenerated code.`
      }
    }
  }
  return { ok: true, code }
}
