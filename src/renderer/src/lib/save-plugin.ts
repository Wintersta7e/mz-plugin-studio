import log from 'electron-log/renderer'
import { usePluginStore, type SaveRecord } from '../stores/pluginStore'
import { useProjectStore } from '../stores/projectStore'
import { NOTICE_MS, useToastStore } from '../stores/toastStore'
import type { PluginDefinition } from '../types/plugin'
import type { SaveConflict, SaveGuard, SaveResult } from '../../../shared/ipc-types'
import { fileNameMismatch, fileNameOf, isImported, saveFileName } from './plugin-output'
import { didReloadFromProject, isSameFile, prepareSave, type SaveRefusal } from './raw-mode'
import { userMessage } from './utilities'

/**
`save` is Ctrl+S (into the open project when there is one); `export` is the preview's Export button.
*/
export type SaveMode = 'save' | 'export'

type Written = Extract<SaveResult, { success: true }>
type Refused = Extract<SaveResult, { success: false }>

// A refused save of a tab that cannot tell whether the file changed since it was read or saved
type NotSavedKind = SaveRefusal | SaveConflict | 'unconfirmed'

// Save All's reason for each kind of tab it did not save, shared by every tab of that kind
const NOT_SAVED: Record<NotSavedKind, string> = {
  'source-missing': 'file text not loaded (reload it from the project)',
  'header-without-main-block': 'header changes in a file with no main annotation block',
  'unparsable-source': 'raw mode cannot add to a file that is not valid JavaScript',
  'invalid-output': 'raw mode built code that is not valid JavaScript',
  'duplicate-struct': 'two structs share a name (rename one)',
  'needs-confirmation': 'saving regenerates the whole file (save it with Ctrl+S to confirm)',
  'exists-unrelated': 'the file there is not the one this tab last opened or saved',
  'changed-on-disk': 'changed on disk',
  'would-break': 'would stop the file compiling',
  unconfirmed: 'cannot confirm the file is unchanged (save it with Ctrl+S to confirm)'
}

// Paths the save dialog returned this session: main lets the app write them again until it quits
const chosenPaths = new Set<string>()

// Paths the user chose to save to under another name than the plugin's, this session
const confirmedPaths = new Set<string>()

const nameOf = (plugin: PluginDefinition): string => plugin.importedFrom ?? plugin.meta.name

function findOpenPlugin(pluginId: string): PluginDefinition {
  const { plugin: active, openPlugins } = usePluginStore.getState()
  const plugin = active.id === pluginId ? active : openPlugins.find((p) => p.id === pluginId)
  if (plugin === undefined) throw new Error(`No open plugin ${pluginId}`)
  return plugin
}

const guardFor = (pluginId: string): SaveGuard => ({
  base: usePluginStore.getState().baseByPluginId[pluginId] ?? null
})

const recordOf = (plugin: PluginDefinition, result: Written, written: string): SaveRecord => ({
  id: plugin.id,
  saved: plugin,
  path: result.path,
  sha256: result.sha256,
  written
})

/**
Whether `result`, the answer to a save with `guard`, refused the file only because the tab
cannot tell what it held: a tab restored from an older version knows its file but not its bytes.
*/
function isUnconfirmed(plugin: PluginDefinition, guard: SaveGuard, result: Refused): boolean {
  if (result.conflict === 'would-break') return false
  return result.conflict === 'changed-on-disk'
    ? guard.base?.sha256 === null
    : guard.base === null && plugin.importedFrom === fileNameOf(result.path)
}

/**
What the conflict prompt says about `result`, the answer to a save with `guard`.
*/
function conflictMessage(plugin: PluginDefinition, guard: SaveGuard, result: Refused): string {
  const path = result.path
  if (result.conflict === 'would-break') {
    const problem = result.syntaxError
    const at = typeof problem?.line === 'number' ? `line ${String(problem.line)}: ` : ''
    return `Saving would stop "${path}" from compiling (${at}${problem?.message ?? 'syntax error'}). Overwrite it anyway?`
  }
  if (isUnconfirmed(plugin, guard, result)) {
    return `This tab cannot confirm that "${path}" is unchanged since it was last read or saved. Overwrite it?`
  }
  return result.conflict === 'exists-unrelated'
    ? `"${path}" is not the file this tab last opened or saved. Overwrite it?`
    : `"${path}" has changed on disk since this tab last read or saved it. Overwrite it?`
}

const LOST = {
  both: 'its commands and parameters',
  commands: 'its commands',
  parameters: 'its parameters'
}

/**
What a game would miss from a plugin saved under another name
*/
function lostPart(mismatch: NonNullable<ReturnType<typeof fileNameMismatch>>): keyof typeof LOST {
  if (!mismatch.commands) return 'parameters'
  return mismatch.parameters ? 'both' : 'commands'
}

/**
Whether to write `code`, the code of `plugin`, to `filePath`, asking first when the file is not
named after it; `choose` when the user wants to pick another file.
*/
async function confirmFileName(
  plugin: PluginDefinition,
  filePath: string,
  code: string
): Promise<'save' | 'cancel' | 'choose'> {
  if (confirmedPaths.has(filePath)) return 'save'
  const mismatch = fileNameMismatch(plugin, filePath, code)
  if (mismatch === null) return 'save'
  const what = LOST[lostPart(mismatch)]
  const answer = await globalThis.api.dialog.message({
    type: 'warning',
    title: 'File name differs from plugin name',
    message: `"${fileNameOf(filePath)}" is not named after the plugin "${plugin.meta.name}". RPG Maker MZ finds a plugin's commands by its exact file name and its parameters by its file name in any letter case, so ${what} would not work in a game. Save anyway?`,
    buttons: ['Cancel', 'Choose another file', 'Save anyway']
  })
  if (answer === 1) return 'choose'
  if (answer === 2) {
    confirmedPaths.add(filePath)
    return 'save'
  }
  log.warn('[save] refused', nameOf(plugin), 'file name differs')
  return 'cancel'
}

/**
Writes through `write`, asking before replacing a file the check refuses. Overwrite retries
against the bytes the prompt was about, so a file changed again meanwhile is asked about
again. Null when nothing was written.
*/
async function writeAsking(
  plugin: PluginDefinition,
  write: (guard: SaveGuard) => Promise<SaveResult>
): Promise<Written | null> {
  let guard = guardFor(plugin.id)
  for (;;) {
    const result = await write(guard)
    if (result.success) return result
    const isOfferReload =
      result.conflict === 'changed-on-disk' &&
      isImported(plugin) &&
      useProjectStore.getState().project !== null
    const answer = await globalThis.api.dialog.message({
      type: 'warning',
      title: 'Overwrite file?',
      message: conflictMessage(plugin, guard, result),
      buttons: ['Cancel', 'Overwrite', ...(isOfferReload ? ['Reload from project'] : [])]
    })
    if (isOfferReload && answer === 2) {
      await didReloadFromProject(plugin.id)
      return null
    }
    if (answer !== 1) {
      log.warn('[save] refused', nameOf(plugin), result.conflict)
      return null
    }
    guard =
      result.conflict === 'would-break'
        ? { ...guard, overwriteBroken: true }
        : { base: { path: result.path, sha256: result.diskSha256 } }
  }
}

/**
The file a save of the tab goes to without asking: the one it was read from or last saved to
*/
function knownPathOf(pluginId: string): string | undefined {
  const { baseByPluginId, savedPathsByPluginId } = usePluginStore.getState()
  const base = Object.hasOwn(baseByPluginId, pluginId) ? baseByPluginId[pluginId] : undefined
  return base?.path ?? savedPathsByPluginId[pluginId]
}

const askPath = async (defaultPath: string): Promise<string | null> =>
  globalThis.api.dialog.saveFile({
    defaultPath,
    filters: [{ name: 'JavaScript Files', extensions: ['js'] }]
  })

const defaultFileName = (plugin: PluginDefinition): string =>
  plugin.meta.name ? saveFileName(plugin) : 'NewPlugin.js'

/**
The file Export, and Ctrl+S with no project, write to: the tab's known file when the save dialog
returned it this session, else one the user picks. Null when the user cancels.
*/
async function chooseFilePath(
  plugin: PluginDefinition,
  mode: SaveMode,
  code: string
): Promise<string | null> {
  const known = mode === 'save' ? knownPathOf(plugin.id) : undefined
  let filePath =
    known !== undefined && chosenPaths.has(known)
      ? known
      : await askPath(known ?? defaultFileName(plugin))
  for (;;) {
    if (filePath === null || filePath === '') return null
    const answer = await confirmFileName(plugin, filePath, code)
    if (answer === 'cancel') return null
    if (answer === 'save') {
      chosenPaths.add(filePath)
      return filePath
    }
    // The folder of the file just chosen, at a file named after the plugin
    const folder = filePath.slice(0, filePath.length - fileNameOf(filePath).length)
    filePath = await askPath(`${folder}${plugin.meta.name}.js`)
  }
}

/**
Records a written save and reports it in a toast, with a warning when the file does not compile.
*/
function reportSave(
  plugin: PluginDefinition,
  mode: SaveMode,
  project: { path: string } | null,
  saved: { result: Written; code: string }
): void {
  const { result, code } = saved
  const addToast = useToastStore.getState().addToast
  // An export to the file Ctrl+S writes is a save; else, with a project open, Export writes a
  // copy and the tab's file is still the project's
  const isSaved =
    mode === 'save' ||
    (project !== null &&
      plugin.meta.name !== '' &&
      isSameFile(result.path, `${project.path}/js/plugins/${saveFileName(plugin)}`))
  if (isSaved || project === null) {
    usePluginStore.getState().recordSaves([recordOf(plugin, result, code)])
  }
  addToast({
    type: 'success',
    message: isSaved ? 'Plugin saved' : `Exported to ${result.path}`
  })
  if (result.syntaxWarning !== undefined) {
    const { line, message } = result.syntaxWarning
    const at = line === null ? '' : ` (line ${String(line)})`
    addToast({
      type: 'warning',
      message: `Saved, but the file does not compile${at}: ${message}`,
      duration: NOTICE_MS
    })
  }
  log.info(`[save] Saved ${result.path}`)
}

/**
Writes one open plugin's `.js`, reporting the result in a toast. Ctrl+S writes into the open
project's `js/plugins`; Export, and Ctrl+S with no project, ask where to save.
*/
export async function savePlugin(pluginId: string, mode: SaveMode): Promise<void> {
  const addToast = useToastStore.getState().addToast
  try {
    const prepared = await prepareSave(pluginId, { ask: true })
    if (prepared.status === 'refused') {
      log.warn('[save] refused', nameOf(findOpenPlugin(pluginId)), prepared.refusal)
      addToast({ type: 'error', message: prepared.reason, duration: NOTICE_MS })
      return
    }
    if (prepared.status === 'cancelled') return
    const { plugin, code } = prepared
    const project = useProjectStore.getState().project
    let write: (guard: SaveGuard) => Promise<SaveResult>
    if (mode === 'save' && project !== null && plugin.meta.name) {
      const filename = saveFileName(plugin)
      write = async (guard) => globalThis.api.plugin.save(project.path, filename, code, guard)
    } else {
      const chosen = await chooseFilePath(plugin, mode, code)
      if (chosen === null) return
      write = async (guard) => globalThis.api.plugin.saveToPath(chosen, code, guard)
    }
    const result = await writeAsking(plugin, write)
    if (result === null) return
    reportSave(plugin, mode, project, { result, code })
  } catch (error: unknown) {
    log.error('[save]', error)
    addToast({
      type: 'error',
      message: `${mode === 'save' ? 'Save' : 'Export'} failed: ${userMessage(error)}`,
      duration: NOTICE_MS
    })
  }
}

// What Save All did with the tabs it tried, in the order it tried them
interface SaveAllOutcome {
  records: SaveRecord[]
  notSaved: Map<NotSavedKind, string[]>
  failed: string[]
}

function skip(
  outcome: SaveAllOutcome,
  plugin: PluginDefinition,
  kind: NotSavedKind,
  label: string
): void {
  log.warn('[save] refused', nameOf(plugin), kind)
  outcome.notSaved.set(kind, [...(outcome.notSaved.get(kind) ?? []), label])
}

/**
Save All's save of one tab into the project at `projectPath`, noted in `outcome`.
*/
async function saveTab(
  tab: PluginDefinition,
  projectPath: string,
  outcome: SaveAllOutcome
): Promise<void> {
  try {
    const prepared = await prepareSave(tab.id, { ask: false })
    if (prepared.status === 'refused') {
      skip(outcome, tab, prepared.refusal, tab.meta.name)
      return
    }
    if (prepared.status === 'cancelled') return
    const { plugin, code } = prepared
    const guard = guardFor(plugin.id)
    const result = await globalThis.api.plugin.save(projectPath, saveFileName(plugin), code, guard)
    if (result.success) {
      outcome.records.push(recordOf(plugin, result, code))
    } else {
      const line = result.syntaxError?.line
      skip(
        outcome,
        plugin,
        isUnconfirmed(plugin, guard, result) ? 'unconfirmed' : result.conflict,
        typeof line === 'number' ? `${plugin.meta.name} (line ${String(line)})` : plugin.meta.name
      )
    }
  } catch (error: unknown) {
    log.error('[save-all]', tab.meta.name, error)
    outcome.failed.push(`${tab.meta.name} (${userMessage(error)})`)
  }
}

/**
Save All's one toast: how many tabs it saved, and each kind of tab it did not save.
*/
function reportSaveAll({ records, notSaved, failed }: SaveAllOutcome, unnamed: number): void {
  const addToast = useToastStore.getState().addToast
  const saved = records.length
  if (notSaved.size > 0 || unnamed > 0 || failed.length > 0) {
    const reasons = [...notSaved].map(
      ([kind, names]) => ` Not saved, ${NOT_SAVED[kind]}: ${names.join(', ')}.`
    )
    if (unnamed > 0)
      reasons.push(` Not saved, no plugin name: ${String(unnamed)} tab${unnamed > 1 ? 's' : ''}.`)
    if (failed.length > 0) reasons.push(` Failed: ${failed.join(', ')}.`)
    const failures = failed.length > 0 ? `, failed ${String(failed.length)}` : ''
    addToast({
      type: 'warning',
      message: `Saved ${String(saved)}${failures}.${reasons.join('')}`,
      duration: NOTICE_MS
    })
  } else if (saved > 0) {
    addToast({ type: 'success', message: `${String(saved)} plugin${saved > 1 ? 's' : ''} saved` })
  }
}

/**
Saves every unsaved tab into the open project and reports them in one toast. Tabs are saved one
at a time, so two tabs saving to one file meet the file check in turn; a tab whose save would
need a prompt is not saved and is named in the report with the others of its kind.
*/
export async function saveAllPlugins(): Promise<void> {
  const ps = usePluginStore.getState()
  const project = useProjectStore.getState().project
  if (!project) return
  const dirty = ps.openPlugins.filter((p) => ps.dirtyByPluginId[p.id] === true)
  const dirtyPlugins = dirty.filter((p) => p.meta.name)
  const outcome: SaveAllOutcome = { records: [], notSaved: new Map(), failed: [] }
  for (const tab of dirtyPlugins) await saveTab(tab, project.path, outcome)
  if (outcome.records.length > 0) usePluginStore.getState().recordSaves(outcome.records)
  reportSaveAll(outcome, dirty.length - dirtyPlugins.length)
}
