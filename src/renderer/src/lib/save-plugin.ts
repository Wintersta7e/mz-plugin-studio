import log from 'electron-log/renderer'
import { usePluginStore } from '../stores/pluginStore'
import type { SaveRecord } from '../stores/pluginStore'
import { useProjectStore } from '../stores/projectStore'
import { useToastStore } from '../stores/toastStore'
import type { PluginDefinition } from '../types/plugin'
import type { SaveConflict, SaveGuard, SaveResult } from '../../../shared/ipc-types'
import { isImported } from './plugin-output'
import { prepareSave, reloadFromProject } from './raw-mode'
import type { SaveRefusal } from './raw-mode'

/** `save` is Ctrl+S (into the open project when there is one); `export` is the preview's Export button. */
export type SaveMode = 'save' | 'export'

export type SaveOutcome =
  | { status: 'saved'; path: string }
  | { status: 'cancelled' }
  | { status: 'skipped'; reason: string }
  | { status: 'failed'; error: string }

type Written = Extract<SaveResult, { success: true }>
type Refused = Extract<SaveResult, { success: false }>

// Long enough to read a refusal or a Save All report
const NOTICE_MS = 10_000

// Save All's reason for each kind of tab it did not save, shared by every tab of that kind
const NOT_SAVED: Record<SaveRefusal | SaveConflict, string> = {
  'source-missing': 'file text not loaded (reload it from the project)',
  'header-without-main-block': 'header changes in a file with no main annotation block',
  'unparsable-source': 'raw mode cannot add to a file that is not valid JavaScript',
  'invalid-output': 'raw mode built code that is not valid JavaScript',
  'needs-confirmation': 'saving regenerates the whole file (save it with Ctrl+S to confirm)',
  'exists-unrelated': 'a different file with this name exists',
  'changed-on-disk': 'changed on disk',
  'would-break': 'would stop the file compiling'
}

const errorText = (error: unknown): string =>
  error instanceof Error ? error.message : String(error)

const nameOf = (plugin: PluginDefinition): string => plugin.importedFrom ?? plugin.meta.name

const fileNameOf = (path: string): string => path.split(/[\\/]/).pop() ?? path

function findOpenPlugin(pluginId: string): PluginDefinition {
  const { plugin: active, openPlugins } = usePluginStore.getState()
  const plugin = active.id === pluginId ? active : openPlugins.find((p) => p.id === pluginId)
  if (plugin === undefined) throw new Error(`No open plugin ${pluginId}`)
  return plugin
}

const guardFor = (pluginId: string): SaveGuard => ({
  base: usePluginStore.getState().baseByPluginId[pluginId] ?? null,
  checkSyntax: true
})

const recordOf = (plugin: PluginDefinition, result: Written, written: string): SaveRecord => ({
  id: plugin.id,
  saved: plugin,
  path: result.path,
  sha256: result.sha256,
  written
})

/** What the conflict prompt says about `result`, the answer to a save with `guard`. */
function conflictMessage(plugin: PluginDefinition, guard: SaveGuard, result: Refused): string {
  const path = result.path
  if (result.conflict === 'would-break') {
    const problem = result.syntaxError
    const at = problem?.line != null ? `line ${problem.line}: ` : ''
    return `Saving would stop "${path}" from compiling (${at}${problem?.message ?? 'syntax error'}). Overwrite it anyway?`
  }
  // A tab restored from an older version knows its file but not what the file held
  const unconfirmed =
    result.conflict === 'changed-on-disk'
      ? guard.base?.sha256 === null
      : guard.base === null && plugin.importedFrom === fileNameOf(path)
  if (unconfirmed) {
    return `This tab cannot confirm that "${path}" is unchanged since it was last read or saved. Overwrite it?`
  }
  return result.conflict === 'exists-unrelated'
    ? `"${path}" already exists and was not opened or saved by this tab. Overwrite it?`
    : `"${path}" has changed on disk since this tab last read or saved it. Overwrite it?`
}

/**
 * Writes through `write`, asking before replacing a file the check refuses. Overwrite retries
 * against the bytes the prompt was about, so a file changed again meanwhile is asked about
 * again. Null when nothing was written.
 */
async function writeAsking(
  plugin: PluginDefinition,
  write: (guard: SaveGuard) => Promise<SaveResult>
): Promise<Written | null> {
  let guard = guardFor(plugin.id)
  for (;;) {
    const result = await write(guard)
    if (result.success) return result
    const offerReload =
      result.conflict === 'changed-on-disk' &&
      isImported(plugin) &&
      useProjectStore.getState().project !== null
    const answer = await window.api.dialog.message({
      type: 'warning',
      title: 'Overwrite file?',
      message: conflictMessage(plugin, guard, result),
      buttons: ['Cancel', 'Overwrite', ...(offerReload ? ['Reload from project'] : [])],
      defaultId: 0,
      cancelId: 0
    })
    if (offerReload && answer === 2) {
      await reloadFromProject(plugin.id)
      return null
    }
    if (answer !== 1) {
      log.warn('[save] refused', nameOf(plugin), result.conflict)
      return null
    }
    guard =
      result.conflict === 'would-break'
        ? { ...guard, force: ['would-break'] }
        : { base: { path: result.path, sha256: result.diskSha256 }, checkSyntax: true }
  }
}

/**
 * Writes one open plugin's `.js`, reporting the result in a toast. Ctrl+S writes into the open
 * project's `js/plugins`; Export, and Ctrl+S with no project, ask where to save.
 */
export async function savePlugin(pluginId: string, mode: SaveMode): Promise<SaveOutcome> {
  const addToast = useToastStore.getState().addToast
  try {
    const prepared = await prepareSave(pluginId, { ask: true })
    if (prepared.status === 'refused') {
      log.warn('[save] refused', nameOf(findOpenPlugin(pluginId)), prepared.refusal)
      addToast({ type: 'error', message: prepared.reason, duration: NOTICE_MS })
      return { status: 'skipped', reason: prepared.reason }
    }
    if (prepared.status === 'cancelled') return { status: 'cancelled' }
    const { plugin, code } = prepared
    const project = useProjectStore.getState().project
    let write: (guard: SaveGuard) => Promise<SaveResult>
    if (mode === 'save' && project !== null && plugin.meta.name) {
      const filename = `${plugin.meta.name}.js`
      write = (guard) => window.api.plugin.save(project.path, filename, code, guard)
    } else {
      const filePath = await window.api.dialog.saveFile({
        defaultPath: `${plugin.meta.name || 'NewPlugin'}.js`,
        filters: [{ name: 'JavaScript Files', extensions: ['js'] }]
      })
      if (!filePath) return { status: 'cancelled' }
      write = (guard) => window.api.plugin.saveToPath(filePath, code, guard)
    }
    const result = await writeAsking(plugin, write)
    if (result === null) return { status: 'cancelled' }
    usePluginStore.getState().recordSaves([recordOf(plugin, result, code)])
    addToast({
      type: 'success',
      message: mode === 'save' ? 'Plugin saved' : 'Plugin exported successfully'
    })
    if (result.syntaxWarning !== undefined) {
      const { line, message } = result.syntaxWarning
      addToast({
        type: 'warning',
        message: `Saved, but the file does not compile${line !== null ? ` (line ${line})` : ''}: ${message}`,
        duration: NOTICE_MS
      })
    }
    log.info(`[save] Saved ${result.path}`)
    return { status: 'saved', path: result.path }
  } catch (error: unknown) {
    log.error('[save]', error)
    addToast({
      type: 'error',
      message: `${mode === 'save' ? 'Save' : 'Export'} failed: ${errorText(error)}`
    })
    return { status: 'failed', error: errorText(error) }
  }
}

/**
 * Saves every unsaved tab into the open project and reports them in one toast. Tabs are saved one
 * at a time, so two tabs saving to one file meet the file check in turn; a tab whose save would
 * need a prompt is not saved and is named in the report with the others of its kind.
 */
export async function saveAllPlugins(): Promise<void> {
  const ps = usePluginStore.getState()
  const project = useProjectStore.getState().project
  if (!project) return
  const dirtyPlugins = ps.openPlugins.filter((p) => ps.dirtyByPluginId[p.id] && p.meta.name)
  const records: SaveRecord[] = []
  const notSaved = new Map<SaveRefusal | SaveConflict, string[]>()
  let failed = 0
  const skip = (
    plugin: PluginDefinition,
    kind: SaveRefusal | SaveConflict,
    label: string
  ): void => {
    log.warn('[save] refused', nameOf(plugin), kind)
    notSaved.set(kind, [...(notSaved.get(kind) ?? []), label])
  }
  for (const p of dirtyPlugins) {
    try {
      const prepared = await prepareSave(p.id, { ask: false })
      if (prepared.status === 'refused') {
        skip(p, prepared.refusal, p.meta.name)
        continue
      }
      if (prepared.status === 'cancelled') continue
      const { plugin, code } = prepared
      const result = await window.api.plugin.save(
        project.path,
        `${plugin.meta.name}.js`,
        code,
        guardFor(plugin.id)
      )
      if (result.success) {
        records.push(recordOf(plugin, result, code))
      } else {
        const line = result.syntaxError?.line
        skip(
          plugin,
          result.conflict,
          line != null ? `${plugin.meta.name} (line ${line})` : plugin.meta.name
        )
      }
    } catch (error: unknown) {
      log.error('[save-all]', p.meta.name, error)
      failed++
    }
  }
  if (records.length > 0) usePluginStore.getState().recordSaves(records)

  const addToast = useToastStore.getState().addToast
  const saved = records.length
  if (notSaved.size > 0 || failed > 0) {
    const reasons = [...notSaved].map(
      ([kind, names]) => ` Not saved, ${NOT_SAVED[kind]}: ${names.join(', ')}.`
    )
    addToast({
      type: 'warning',
      message:
        notSaved.size > 0
          ? `Saved ${saved}${failed > 0 ? `, failed ${failed}` : ''}.${reasons.join('')}`
          : `Saved ${saved}, failed ${failed}`,
      duration: NOTICE_MS
    })
  } else if (saved > 0) {
    addToast({ type: 'success', message: `${saved} plugin${saved > 1 ? 's' : ''} saved` })
  }
}
