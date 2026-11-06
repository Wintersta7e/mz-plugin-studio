import log from 'electron-log/renderer'
import { useMemo } from 'react'
import { usePluginStore } from '../stores/pluginStore'
import { useProjectStore } from '../stores/projectStore'
import { NOTICE_MS, useToastStore } from '../stores/toastStore'
import { useUIStore } from '../stores/uiStore'
import type { PluginDefinition } from '../types/plugin'
import { hasMainBlock } from './generator'
import { generatePluginOutput, isRawMode, loadedSource, type OutputRefusal } from './plugin-output'
import { userMessage } from './utilities'

export const RAW_MODE_READ_ONLY_NOTICE =
  "Raw mode keeps this plugin's own code and language blocks, so this is read-only here. Turn raw mode off in the preview to edit it."

export const RAW_MODE_HEADER_READ_ONLY_NOTICE =
  'This file has no main annotation block (/*: or /*:en), so raw mode cannot save changes to its header and it is read-only here. Turn raw mode off in the preview to edit it.'

/**
Why a save is refused: raw mode cannot build the file, or a regenerating save is unconfirmed
*/
export type SaveRefusal = OutputRefusal | 'needs-confirmation'

export type SavePreparation =
  | { status: 'ready'; code: string; plugin: PluginDefinition }
  | { status: 'refused'; refusal: SaveRefusal; reason: string }
  | { status: 'cancelled' }

/**
Whether the active tab is in raw mode.
*/
export function useIsRawModeActive(): boolean {
  const id = usePluginStore((s) => s.plugin.id)
  const importedFrom = usePluginStore((s) => s.plugin.importedFrom)
  const isChoice = useUIStore((s) => s.rawModeByPluginId[id])
  return isRawMode(importedFrom === undefined ? {} : { importedFrom }, isChoice)
}

/**
Whether the active tab's header is read-only: raw mode cannot save header changes to its file.
*/
export function useIsHeaderReadOnly(): boolean {
  const isRawModeActive = useIsRawModeActive()
  const rawSource = usePluginStore((s) => s.plugin.rawSource)
  return useMemo(
    () => isRawModeActive && rawSource !== undefined && !hasMainBlock(rawSource),
    [isRawModeActive, rawSource]
  )
}

/**
The code a save of an open tab writes. Raw mode saves the file's own text or refuses; the
first save of an imported plugin with raw mode off regenerates the whole file, so it asks
first when `ask` is set and is refused otherwise.
*/
export async function prepareSave(
  pluginId: string,
  options: { ask: boolean }
): Promise<SavePreparation> {
  let preparation = await prepareOnce(pluginId, options)
  // The tab or its raw mode may have changed while the dialog was open
  while (preparation === 'confirmed') preparation = await prepareOnce(pluginId, options)
  return preparation
}

/**
One pass of `prepareSave`; 'confirmed' when the user just confirmed a regenerating save
*/
async function prepareOnce(
  pluginId: string,
  options: { ask: boolean }
): Promise<SavePreparation | 'confirmed'> {
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

  const file = plugin.importedFrom
  if (file !== undefined && !Object.hasOwn(ui.structuralSaveConfirmedByPluginId, pluginId)) {
    if (!options.ask) {
      return {
        status: 'refused',
        refusal: 'needs-confirmation',
        reason: 'needs confirmation: save it with Ctrl+S'
      }
    }
    const answer = await globalThis.api.dialog.message({
      type: 'warning',
      title: 'Save without raw mode?',
      message: `Saving ${file} with raw mode off regenerates the whole file: code outside the Code tab will be removed from it.`,
      buttons: ['Cancel', 'Show Diff', 'Save']
    })
    if (answer === 1) useUIStore.getState().requestDiff(pluginId)
    if (answer !== 2) return { status: 'cancelled' }
    useUIStore.getState().confirmStructuralSave(pluginId)
    return 'confirmed'
  }

  const out = generatePluginOutput(plugin, false, null)
  return out.ok
    ? { status: 'ready', code: out.code, plugin }
    : { status: 'refused', refusal: out.refusal, reason: out.message }
}

/**
A form of the paths `like` belongs with that compares as main does: Windows paths ignore case
*/
function comparable(like: string): (p: string) => string {
  const isWindows = /^[a-z]:/i.test(like) || like.includes('\\')
  return (p) => {
    const slashed = p.replaceAll(/[\\/]+/g, '/').replace(/\/$/, '')
    return isWindows ? slashed.toLowerCase() : slashed
  }
}

/**
Whether `file` lies directly in `directory`
*/
function isFileIn(directory: string, file: string): boolean {
  const normal = comparable(directory)
  const target = normal(file)
  return target.slice(0, target.lastIndexOf('/')) === normal(directory)
}

/**
Whether two paths name one file
*/
export function isSameFile(a: string, b: string): boolean {
  const normal = comparable(a)
  return normal(a) === normal(b)
}

/**
Reads an imported tab's file from the open project again and makes it the tab's file text,
baseline and the file it was read from. A tab last read or saved outside the open project asks
first. A tab with no unsaved edits takes the file's values; a tab with edits asks whether to
replace them with the file or keep them. False when there is no project, the user cancels or
the file cannot be read.
*/
export async function didReloadFromProject(pluginId: string): Promise<boolean> {
  const project = useProjectStore.getState().project
  const { openPlugins, dirtyByPluginId, baseByPluginId } = usePluginStore.getState()
  const plugin = openPlugins.find((p) => p.id === pluginId)
  if (project === null || plugin?.importedFrom === undefined) return false
  const separator = project.path.includes('\\') ? '\\' : '/'
  const pluginsDirectory = [project.path, 'js', 'plugins'].join(separator)
  const path = [pluginsDirectory, plugin.importedFrom].join(separator)
  const base = Object.hasOwn(baseByPluginId, pluginId) ? baseByPluginId[pluginId] : undefined
  if (base !== undefined && !isFileIn(pluginsDirectory, base.path)) {
    const answer = await globalThis.api.dialog.message({
      type: 'question',
      title: 'Reload from another project?',
      message: `This tab was last read from or saved to ${base.path}, which is not in the open project's plugins folder. Reload it from ${path} instead?`,
      buttons: ['Cancel', 'Reload']
    })
    if (answer !== 1) return false
  }
  let isKeepTab = false
  // A tab read by an older parser differs from its file with no edit, so only edits are kept
  if (dirtyByPluginId[pluginId] === true) {
    const answer = await globalThis.api.dialog.message({
      type: 'question',
      title: 'Reload from project?',
      message: `${path} may not match this tab: the tab was read by an older version of the app, or the file changed since it was opened. Replace the tab with the file, dropping its unsaved edits, or keep the tab's values and apply them to the reloaded file?`,
      buttons: ['Cancel', 'Replace with file', 'Keep tab values']
    })
    if (answer !== 1 && answer !== 2) return false
    isKeepTab = answer === 2
  }
  try {
    const file = await globalThis.api.plugin.readRaw(project.path, plugin.importedFrom)
    const parsed = await globalThis.api.plugin.parse(file.content)
    usePluginStore.getState().reattachSource(pluginId, file.content, parsed, {
      keepTab: isKeepTab,
      base: { path: file.path, sha256: file.sha256 }
    })
    return true
  } catch (error) {
    log.error('[reload]', path, error)
    useToastStore.getState().addToast({
      type: 'error',
      message: `Could not read ${path}: ${userMessage(error)}`,
      duration: NOTICE_MS
    })
    return false
  }
}

/**
The open tabs raw mode refuses to save because their file text is not loaded.
*/
function sourceMissingTabs(): PluginDefinition[] {
  const { openPlugins, baselineByPluginId } = usePluginStore.getState()
  const { rawModeByPluginId } = useUIStore.getState()
  return openPlugins.filter(
    (p) =>
      isRawMode(p, rawModeByPluginId[p.id]) &&
      loadedSource(p, baselineByPluginId[p.id] ?? null) === null
  )
}

/**
Once a project is open, offers one action that reloads every tab whose file text is not loaded
and whose file is in the project's plugins folder, each as `didReloadFromProject` does.
*/
export async function offerReloadFromProject(projectPath: string): Promise<void> {
  let files: Set<string>
  try {
    files = new Set(await globalThis.api.plugin.list(projectPath))
  } catch (error) {
    log.warn('[reload] could not list the plugins of', projectPath, error)
    return
  }
  const tabs = sourceMissingTabs().filter(
    (p) => p.importedFrom !== undefined && files.has(p.importedFrom)
  )
  if (tabs.length === 0) return
  // Naming the tabs and the folder makes clicking the button the consent to reload them from it
  const names = tabs.map((p) => p.importedFrom)
  const named =
    names.length > 3
      ? `${names.slice(0, 3).join(', ')} and ${String(names.length - 3)} more`
      : names.join(', ')
  const folder = projectPath.split(/[\\/]/).findLast(Boolean) ?? projectPath
  const ids = tabs.map((p) => p.id)
  useToastStore.getState().addToast({
    type: 'info',
    message: `Raw mode cannot save ${named} until reloaded: the file text is not loaded. The project folder ${folder} has ${tabs.length === 1 ? 'this file' : 'these files'}.`,
    duration: 0,
    action: {
      label: `Reload ${named} from ${folder}`,
      run: () => void reloadAllFromProject(ids)
    }
  })
}

/**
Reloads the tabs one after another, so each question comes on its own; skips reloaded tabs.
Reports how many it reloaded, naming those it did not.
*/
async function reloadAllFromProject(pluginIds: readonly string[]): Promise<void> {
  const missing = sourceMissingTabs().filter((p) => pluginIds.includes(p.id))
  if (missing.length === 0) return
  const notReloaded: string[] = []
  for (const plugin of missing) {
    if (!(await didReloadFromProject(plugin.id)))
      notReloaded.push(plugin.importedFrom ?? plugin.meta.name)
  }
  const total = missing.length === 1 ? '1 plugin' : `${String(missing.length)} plugins`
  const message = `Reloaded ${String(missing.length - notReloaded.length)} of ${total}`
  useToastStore.getState().addToast(
    notReloaded.length === 0
      ? { type: 'success', message }
      : {
          type: 'warning',
          message: `${message}. Not reloaded: ${notReloaded.join(', ')}.`,
          duration: NOTICE_MS
        }
  )
}
