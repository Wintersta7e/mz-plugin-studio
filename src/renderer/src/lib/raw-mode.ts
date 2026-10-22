import log from 'electron-log/renderer'
import { useMemo } from 'react'
import { usePluginStore } from '../stores/pluginStore'
import { useProjectStore } from '../stores/projectStore'
import { useToastStore } from '../stores/toastStore'
import { useUIStore } from '../stores/uiStore'
import type { PluginDefinition } from '../types/plugin'
import { hasMainBlock } from './generator'
import { generatePluginOutput, isImported, isRawMode } from './plugin-output'
import type { OutputRefusal } from './plugin-output'

export const RAW_MODE_READ_ONLY_NOTICE =
  "Raw mode keeps this plugin's own code and language blocks, so this is read-only here. Turn raw mode off in the preview to edit it."

export const RAW_MODE_HEADER_READ_ONLY_NOTICE =
  'This file has no main annotation block (/*: or /*:en), so raw mode cannot save changes to its header and it is read-only here. Turn raw mode off in the preview to edit it.'

/** Why a save is refused: raw mode cannot build the file, or a regenerating save is unconfirmed */
export type SaveRefusal = OutputRefusal | 'needs-confirmation'

export type SavePreparation =
  | { status: 'ready'; code: string; plugin: PluginDefinition }
  | { status: 'refused'; refusal: SaveRefusal; reason: string }
  | { status: 'cancelled' }

/** Whether the active tab is in raw mode. */
export function useActiveRawMode(): boolean {
  const id = usePluginStore((s) => s.plugin.id)
  const importedFrom = usePluginStore((s) => s.plugin.importedFrom)
  const choice = useUIStore((s) => s.rawModeByPluginId[id])
  return isRawMode({ importedFrom }, choice)
}

/** Whether the active tab's header is read-only: raw mode cannot save header changes to its file. */
export function useHeaderReadOnly(): boolean {
  const rawMode = useActiveRawMode()
  const rawSource = usePluginStore((s) => s.plugin.rawSource)
  return useMemo(
    () => rawMode && rawSource !== undefined && !hasMainBlock(rawSource),
    [rawMode, rawSource]
  )
}

/**
 * The code a save of an open tab writes. Raw mode saves the file's own text or refuses; the
 * first save of an imported plugin with raw mode off regenerates the whole file, so it asks
 * first when `ask` is set and is refused otherwise.
 */
export async function prepareSave(
  pluginId: string,
  options: { ask: boolean }
): Promise<SavePreparation> {
  const { plugin: active, openPlugins, baselineByPluginId } = usePluginStore.getState()
  const plugin = active.id === pluginId ? active : openPlugins.find((p) => p.id === pluginId)
  if (plugin === undefined) throw new Error(`No open plugin ${pluginId}`)
  const ui = useUIStore.getState()

  if (isRawMode(plugin, ui.rawModeByPluginId[pluginId])) {
    const out = generatePluginOutput(plugin, true, baselineByPluginId[pluginId] ?? null)
    return out.ok
      ? { status: 'ready', code: out.code, plugin }
      : { status: 'refused', refusal: out.refusal, reason: out.message }
  }

  if (isImported(plugin) && !ui.structuralSaveConfirmedByPluginId[pluginId]) {
    if (!options.ask) {
      return {
        status: 'refused',
        refusal: 'needs-confirmation',
        reason: 'needs confirmation: save it with Ctrl+S'
      }
    }
    const answer = await window.api.dialog.message({
      type: 'warning',
      title: 'Save without raw mode?',
      message: `Saving ${plugin.importedFrom} with raw mode off regenerates the whole file: code outside the Code tab will be removed from it.`,
      buttons: ['Cancel', 'Show Diff', 'Save'],
      defaultId: 0,
      cancelId: 0
    })
    if (answer === 1) useUIStore.getState().requestDiff(pluginId)
    if (answer !== 2) return { status: 'cancelled' }
    useUIStore.getState().confirmStructuralSave(pluginId)
    // The tab or its raw mode may have changed while the dialog was open
    return prepareSave(pluginId, options)
  }

  const out = generatePluginOutput(plugin, false, null)
  return out.ok
    ? { status: 'ready', code: out.code, plugin }
    : { status: 'refused', refusal: out.refusal, reason: out.message }
}

/** Whether `file` lies directly in `dir`; Windows paths compare case-insensitively, as main does */
function isFileIn(dir: string, file: string): boolean {
  const windows = /^[a-z]:|\\/i.test(dir)
  const normal = (p: string): string => {
    const slashed = p.replace(/[\\/]+/g, '/').replace(/\/$/, '')
    return windows ? slashed.toLowerCase() : slashed
  }
  const target = normal(file)
  return target.slice(0, target.lastIndexOf('/')) === normal(dir)
}

/**
 * Reads an imported tab's file from the open project again and makes it the tab's file text,
 * baseline and the file it was read from. A tab last read or saved outside the open project asks
 * first. A tab with no unsaved edits takes the file's values; a tab with edits asks whether to
 * replace them with the file or keep them. False when there is no project, the user cancels or
 * the file cannot be read.
 */
export async function reloadFromProject(pluginId: string): Promise<boolean> {
  const project = useProjectStore.getState().project
  const { openPlugins, dirtyByPluginId, baseByPluginId } = usePluginStore.getState()
  const plugin = openPlugins.find((p) => p.id === pluginId)
  if (project === null || plugin?.importedFrom === undefined) return false
  const sep = project.path.includes('\\') ? '\\' : '/'
  const pluginsDir = [project.path, 'js', 'plugins'].join(sep)
  const path = [pluginsDir, plugin.importedFrom].join(sep)
  const base = baseByPluginId[pluginId]
  if (base !== undefined && !isFileIn(pluginsDir, base.path)) {
    const answer = await window.api.dialog.message({
      type: 'question',
      title: 'Reload from another project?',
      message: `This tab was last read from or saved to ${base.path}, which is not in the open project's plugins folder. Reload it from ${path} instead?`,
      buttons: ['Cancel', 'Reload'],
      defaultId: 0,
      cancelId: 0
    })
    if (answer !== 1) return false
  }
  let keepTab = false
  // A tab read by an older parser differs from its file with no edit, so only edits are kept
  if (dirtyByPluginId[pluginId]) {
    const answer = await window.api.dialog.message({
      type: 'question',
      title: 'Reload from project?',
      message: `${path} may not match this tab: the tab was read by an older version of the app, or the file changed since it was opened. Replace the tab with the file, dropping its unsaved edits, or keep the tab's values and apply them to the reloaded file?`,
      buttons: ['Cancel', 'Replace with file', 'Keep tab values'],
      defaultId: 0,
      cancelId: 0
    })
    if (answer !== 1 && answer !== 2) return false
    keepTab = answer === 2
  }
  try {
    const file = await window.api.plugin.readRaw(project.path, plugin.importedFrom)
    const parsed = await window.api.plugin.parse(file.content)
    const store = usePluginStore.getState()
    store.reattachSource(pluginId, file.content, parsed, { keepTab })
    store.setBase(pluginId, { path: file.path, sha256: file.sha256 })
    return true
  } catch (error) {
    log.error('[reload]', path, error)
    useToastStore.getState().addToast({
      type: 'error',
      message: `Could not read ${path}: ${error instanceof Error ? error.message : String(error)}`
    })
    return false
  }
}

/** The open tabs raw mode refuses to save because their file text is not loaded. */
function sourceMissingTabs(): PluginDefinition[] {
  const { openPlugins, baselineByPluginId } = usePluginStore.getState()
  const { rawModeByPluginId } = useUIStore.getState()
  return openPlugins.filter((p) => {
    if (!isRawMode(p, rawModeByPluginId[p.id])) return false
    const out = generatePluginOutput(p, true, baselineByPluginId[p.id] ?? null)
    return !out.ok && out.refusal === 'source-missing'
  })
}

/**
 * Once a project is open, offers one action that reloads every tab whose file text is not loaded
 * and whose file is in the project's plugins folder, each as `reloadFromProject` does.
 */
export async function offerReloadFromProject(projectPath: string): Promise<void> {
  let files: Set<string>
  try {
    files = new Set(await window.api.plugin.list(projectPath))
  } catch (error) {
    log.warn('[reload] could not list the plugins of', projectPath, error)
    return
  }
  const ids = sourceMissingTabs()
    .filter((p) => p.importedFrom !== undefined && files.has(p.importedFrom))
    .map((p) => p.id)
  if (ids.length === 0) return
  const plugins = ids.length === 1 ? '1 plugin' : `${ids.length} plugins`
  useToastStore.getState().addToast({
    type: 'info',
    message: `Raw mode cannot save ${plugins} open in tabs until reloaded: the file text is not loaded.`,
    duration: 0,
    action: {
      label: `Reload ${plugins} from this project`,
      run: () => void reloadAllFromProject(ids)
    }
  })
}

/** Reloads the tabs one after another, so each question comes on its own; skips reloaded tabs. */
async function reloadAllFromProject(pluginIds: readonly string[]): Promise<void> {
  const missing = new Set(sourceMissingTabs().map((p) => p.id))
  for (const id of pluginIds) {
    if (missing.has(id)) await reloadFromProject(id)
  }
}
