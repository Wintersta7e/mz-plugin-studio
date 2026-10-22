import { usePluginStore } from '../stores/pluginStore'
import { useUIStore } from '../stores/uiStore'
import { generatePluginOutput, isImported, isRawMode } from './plugin-output'

export const RAW_MODE_READ_ONLY_NOTICE =
  "Raw mode keeps this plugin's own code and language blocks, so this is read-only here. Turn raw mode off in the preview to edit it."

export type SavePreparation =
  | { status: 'ready'; code: string }
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
    return out.ok ? { status: 'ready', code: out.code } : { status: 'refused', reason: out.message }
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
  return out.ok ? { status: 'ready', code: out.code } : { status: 'refused', reason: out.message }
}
