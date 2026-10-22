import { usePluginStore } from '../stores/pluginStore'
import { useProjectStore } from '../stores/projectStore'
import { useToastStore } from '../stores/toastStore'
import { useUIStore } from '../stores/uiStore'
import type { PluginDefinition } from '../types/plugin'
import { generatePluginOutput, isImported, isRawMode } from './plugin-output'

export const RAW_MODE_READ_ONLY_NOTICE =
  "Raw mode keeps this plugin's own code and language blocks, so this is read-only here. Turn raw mode off in the preview to edit it."

export type SavePreparation =
  | { status: 'ready'; code: string; plugin: PluginDefinition }
  | { status: 'refused'; reason: string }
  | { status: 'cancelled' }

/** Whether the active tab is in raw mode. */
export function useActiveRawMode(): boolean {
  const id = usePluginStore((s) => s.plugin.id)
  const importedFrom = usePluginStore((s) => s.plugin.importedFrom)
  const choice = useUIStore((s) => s.rawModeByPluginId[id])
  return isRawMode({ importedFrom }, choice)
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
      : { status: 'refused', reason: out.message }
  }

  if (isImported(plugin) && !ui.structuralSaveConfirmedByPluginId[pluginId]) {
    if (!options.ask) {
      return { status: 'refused', reason: 'needs confirmation: save it with Ctrl+S' }
    }
    // Cancel is the first button, so closing the dialog cancels
    const answer = await window.api.dialog.message({
      type: 'warning',
      title: 'Save without raw mode?',
      message: `Saving ${plugin.importedFrom} with raw mode off regenerates the whole file: code outside the Code tab will be removed from it.`,
      buttons: ['Cancel', 'Show Diff', 'Save']
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
    : { status: 'refused', reason: out.message }
}

/**
 * Reads an imported tab's file from the open project again and makes it the tab's file text
 * and baseline. A tab with no unsaved edits takes the file's values; a tab with edits asks
 * whether to replace them with the file or keep them. False when there is no project, the user
 * cancels or the file cannot be read.
 */
export async function reloadFromProject(pluginId: string): Promise<boolean> {
  const project = useProjectStore.getState().project
  const { openPlugins, dirtyByPluginId } = usePluginStore.getState()
  const plugin = openPlugins.find((p) => p.id === pluginId)
  if (project === null || plugin?.importedFrom === undefined) return false
  const sep = project.path.includes('\\') ? '\\' : '/'
  const path = [project.path, 'js', 'plugins', plugin.importedFrom].join(sep)
  let keepTab = false
  // A tab read by an older parser differs from its file with no edit, so only edits are kept
  if (dirtyByPluginId[pluginId]) {
    // Cancel is the first button, so closing the dialog cancels
    const answer = await window.api.dialog.message({
      type: 'question',
      title: 'Reload from project?',
      message: `${path} may not match this tab: the tab was read by an older version of the app, or the file changed since it was opened. Replace the tab with the file, dropping its unsaved edits, or keep the tab's values and apply them to the reloaded file?`,
      buttons: ['Cancel', 'Replace with file', 'Keep tab values'],
      defaultId: 1
    })
    if (answer !== 1 && answer !== 2) return false
    keepTab = answer === 2
  }
  try {
    const text = await window.api.plugin.readRaw(project.path, plugin.importedFrom)
    const parsed = await window.api.plugin.parse(text)
    usePluginStore.getState().reattachSource(pluginId, text, parsed, { keepTab })
    return true
  } catch (error) {
    useToastStore.getState().addToast({
      type: 'error',
      message: `Could not read ${path}: ${error instanceof Error ? error.message : String(error)}`
    })
    return false
  }
}
