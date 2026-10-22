import log from 'electron-log/renderer'
import { usePluginStore } from '../stores/pluginStore'
import { useProjectStore } from '../stores/projectStore'
import { useToastStore } from '../stores/toastStore'
import type { PluginDefinition } from '../types/plugin'
import type { SaveResult } from '../../../shared/ipc-types'
import { prepareSave } from './raw-mode'

/** `save` is Ctrl+S (into the open project only); `export` is the preview's Export button. */
export type SaveMode = 'save' | 'export'

export type SaveOutcome =
  | { status: 'saved'; path: string }
  | { status: 'cancelled' }
  | { status: 'skipped'; reason: string }
  | { status: 'failed'; error: string }

const errorText = (error: unknown): string =>
  error instanceof Error ? error.message : String(error)

function findOpenPlugin(pluginId: string): PluginDefinition {
  const { plugin: active, openPlugins } = usePluginStore.getState()
  const plugin = active.id === pluginId ? active : openPlugins.find((p) => p.id === pluginId)
  if (plugin === undefined) throw new Error(`No open plugin ${pluginId}`)
  return plugin
}

/** Records a written plugin as saved and tells the user with `message`. */
function markSaved(path: string, saved: PluginDefinition, written: string, message: string): void {
  const store = usePluginStore.getState()
  store.setSavedPath(path)
  store.setDirty(false)
  store.recordSaved(saved.id, saved, written)
  useToastStore.getState().addToast({ type: 'success', message })
}

/** Writes one open plugin's `.js`, reporting the result in a toast. */
export async function savePlugin(pluginId: string, mode: SaveMode): Promise<SaveOutcome> {
  return mode === 'save' ? saveToProject(pluginId) : exportPlugin(pluginId)
}

async function saveToProject(pluginId: string): Promise<SaveOutcome> {
  const plugin = findOpenPlugin(pluginId)
  const proj = useProjectStore.getState().project
  if (!proj || !plugin.meta.name) return { status: 'cancelled' }
  const filename = `${plugin.meta.name}.js`
  try {
    const prepared = await prepareSave(plugin.id, { ask: true })
    if (prepared.status === 'refused') {
      useToastStore.getState().addToast({ type: 'error', message: prepared.reason })
      return { status: 'skipped', reason: prepared.reason }
    }
    if (prepared.status !== 'ready') return { status: 'cancelled' }
    const result = await window.api.plugin.save(proj.path, filename, prepared.code)
    if (!result.success) return { status: 'failed', error: 'save returned success=false' }
    markSaved(result.path, prepared.plugin, prepared.code, 'Plugin saved')
    return { status: 'saved', path: result.path }
  } catch (error: unknown) {
    useToastStore
      .getState()
      .addToast({ type: 'error', message: `Save failed: ${errorText(error)}` })
    return { status: 'failed', error: errorText(error) }
  }
}

async function exportPlugin(pluginId: string): Promise<SaveOutcome> {
  const addToast = useToastStore.getState().addToast
  const currentPlugin = findOpenPlugin(pluginId)
  const project = useProjectStore.getState().project
  const prepared = await prepareSave(currentPlugin.id, { ask: true })
  if (prepared.status === 'refused') {
    addToast({ type: 'error', message: prepared.reason })
    return { status: 'skipped', reason: prepared.reason }
  }
  if (prepared.status === 'cancelled') return { status: 'cancelled' }
  const freshCode = prepared.code
  const defaultName = `${currentPlugin.meta.name || 'NewPlugin'}.js`

  let write: () => Promise<SaveResult>
  if (project) {
    write = () => window.api.plugin.save(project.path, defaultName, freshCode)
  } else {
    const filePath = await window.api.dialog.saveFile({
      defaultPath: defaultName,
      filters: [{ name: 'JavaScript Files', extensions: ['js'] }]
    })
    if (!filePath) return { status: 'cancelled' }
    write = () => window.api.plugin.saveToPath(filePath, freshCode)
  }

  try {
    const result = await write()
    if (!result.success) return { status: 'failed', error: 'save returned success=false' }
    markSaved(result.path, prepared.plugin, freshCode, 'Plugin exported successfully')
    log.info('[save] Plugin saved successfully')
    return { status: 'saved', path: result.path }
  } catch (error) {
    log.error('Failed to save plugin:', error)
    addToast({ type: 'error', message: `Export failed: ${errorText(error)}` })
    return { status: 'failed', error: errorText(error) }
  }
}

/** Saves every unsaved tab into the open project at once and reports the counts in one toast. */
export async function saveAllPlugins(): Promise<void> {
  const ps = usePluginStore.getState()
  const proj = useProjectStore.getState().project
  if (!proj) return
  const dirtyPlugins = ps.openPlugins.filter((p) => ps.dirtyByPluginId[p.id] && p.meta.name)
  const savePromises = dirtyPlugins.map(async (p) => {
    const filename = `${p.meta.name}.js`
    const prepared = await prepareSave(p.id, { ask: false })
    if (prepared.status === 'refused') {
      // The toast says "Not saved:" once, before every refused plugin
      const reason = prepared.reason.replace(/^Not saved: /, '')
      return { id: p.id, refused: `${p.meta.name} (${reason})` }
    }
    if (prepared.status === 'cancelled') return { id: p.id }
    try {
      const result = await window.api.plugin.save(proj.path, filename, prepared.code)
      if (result.success) {
        return { id: p.id, path: result.path, saved: prepared.plugin, code: prepared.code }
      }
      return { id: p.id, error: new Error('save returned success=false') }
    } catch (error: unknown) {
      log.error('[save-all]', p.meta.name, error)
      return { id: p.id, error }
    }
  })
  const results = await Promise.all(savePromises)
  const succeeded = results.filter(
    (r): r is { id: string; path: string; saved: PluginDefinition; code: string } => 'path' in r
  )
  for (const r of succeeded) usePluginStore.getState().recordSaved(r.id, r.saved, r.code)
  const failed = results.filter((r) => 'error' in r)
  const refused = results.flatMap((r) => ('refused' in r ? [r.refused] : []))
  if (succeeded.length > 0) {
    usePluginStore.setState((state) => {
      const nextDirty = { ...state.dirtyByPluginId }
      const nextPaths = { ...state.savedPathsByPluginId }
      let activeUpdate: { isDirty: false; savedPath: string } | null = null
      for (const r of succeeded) {
        delete nextDirty[r.id]
        nextPaths[r.id] = r.path
        if (state.activePluginId === r.id) {
          activeUpdate = { isDirty: false, savedPath: r.path }
        }
      }
      return {
        dirtyByPluginId: nextDirty,
        savedPathsByPluginId: nextPaths,
        ...(activeUpdate ?? {})
      }
    })
  }
  if (refused.length > 0) {
    const failures = failed.length > 0 ? `, failed ${failed.length}` : ''
    useToastStore.getState().addToast({
      type: 'warning',
      message: `Saved ${succeeded.length}${failures}. Not saved: ${refused.join(', ')}`
    })
  } else if (succeeded.length > 0 || failed.length > 0) {
    useToastStore.getState().addToast({
      type: failed.length > 0 ? 'warning' : 'success',
      message:
        failed.length > 0
          ? `Saved ${succeeded.length}, failed ${failed.length}`
          : `${succeeded.length} plugin${succeeded.length > 1 ? 's' : ''} saved`
    })
  }
}
