import type { PluginBaseline, PluginDefinition } from '../types/plugin'
import {
  RawModeParseError,
  generateHeaderOnly,
  generatePlugin,
  generateRawMode,
  hasMainBlock,
  scriptParseError
} from './generator'
import { escapeJSDoubleQuote, escapeJSString } from './generator/escape'

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

/** The last segment of `path`, with either separator. */
export const fileNameOf = (path: string): string => path.split(/[\\/]/).pop() ?? path

/**
 * What a plugin would lose in a game when `code`, the code a save writes, is saved to `filePath`:
 * MZ finds its commands by the exact file name and its parameters by the file name in any letter
 * case. Null when nothing, and when `code` never quotes the plugin's name: such code, as a loaded
 * plugin's own may, reads its name from its file.
 */
export function fileNameMismatch(
  plugin: Pick<PluginDefinition, 'meta' | 'parameters' | 'commands'>,
  filePath: string,
  code: string
): { commands: boolean; parameters: boolean } | null {
  const name = plugin.meta.name
  if (!name) return null
  const quoted = [`'${escapeJSString(name)}'`, `"${escapeJSDoubleQuote(name)}"`, `\`${name}\``]
  if (!quoted.some((literal) => code.includes(literal))) return null
  const stem = fileNameOf(filePath).replace(/\.js$/i, '')
  const commands = plugin.commands.length > 0 && stem !== name
  const parameters = plugin.parameters.length > 0 && stem.toLowerCase() !== name.toLowerCase()
  return commands || parameters ? { commands, parameters } : null
}

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
    if (problem !== undefined && scriptParseError(rawSource) === undefined) {
      return {
        ok: false,
        refusal: 'invalid-output',
        message: `Not saved: the code raw mode built for ${saveFileName(plugin)} is not valid JavaScript (${problem}), so the game could not load it. Undo the last edits, or turn raw mode off to save regenerated code.`
      }
    }
  }
  return { ok: true, code }
}
