import type { Dialog } from 'electron'
import log from 'electron-log/main'
import { ProjectParser } from '../services/projectParser'
import type { ProjectValidation } from '../../shared/ipc-types'
import type { MZProject } from '../../shared/types/mz'
import { assertSafeProjectPath } from '../../shared/path-safety'
import { isProjectRootGranted, recordProjectRoot, setCurrentProjectRoot } from '../file-access'
import { strings } from './arguments'
import type { InvokeHandlers } from './registration'

export async function runProjectValidate(path: string): Promise<ProjectValidation> {
  assertSafeProjectPath(path)
  log.debug(`[project:validate] ${path}`)
  return ProjectParser.validateProject(path)
}

export async function runProjectLoad(path: string): Promise<MZProject> {
  assertSafeProjectPath(path)
  try {
    const result = await ProjectParser.parseProject(path)
    log.info(
      `[project:load] "${result.gameTitle}" — ${result.actors.length} actors, ${result.items.length} items, ${result.maps.length} maps`
    )
    return result
  } catch (error) {
    log.error(`[project:load] Failed to load project at ${path}:`, error)
    throw new Error(
      `Failed to load project: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}

/**
 * Asks in a native message box whether to open a folder that was never chosen in the folder
 * dialog; Cancel is both the Enter and the Esc button. Returns whether the user chose Open.
 */
export async function confirmProjectOpen(
  dialog: Pick<Dialog, 'showMessageBox'>,
  projectPath: string
): Promise<boolean> {
  const buttons = ['Open', 'Cancel']
  const cancel = buttons.indexOf('Cancel')
  const result = await dialog.showMessageBox({
    type: 'question',
    title: 'MZ Plugin Studio',
    message: 'Open this project folder?',
    detail: `${projectPath}\n\nThis folder was not chosen in the Open Project dialog on this computer. Open it only if you expected to. The app reads and saves plugin files in it.`,
    buttons,
    defaultId: cancel,
    cancelId: cancel
  })
  return result.response !== cancel
}

/** Refuses a project load, logged once without the project's content */
function refuseLoad(projectPath: string, reason: string): never {
  log.warn(`[project:load] Refused ${projectPath}: ${reason}`)
  throw new Error(`Access denied: ${reason}`)
}

/**
 * Loads an RPG Maker MZ project folder the user chose in the folder dialog or confirms now, and
 * makes it the project the project channels act on. A refused or failed load keeps the open one.
 */
export async function loadGrantedProject(
  dialog: Pick<Dialog, 'showMessageBox'>,
  projectPath: string
): Promise<MZProject> {
  const validation = await ProjectParser.validateProject(projectPath)
  if (!validation.valid) refuseLoad(projectPath, 'not an RPG Maker MZ project folder')
  if (
    !(await isProjectRootGranted(projectPath)) &&
    !(await confirmProjectOpen(dialog, projectPath))
  ) {
    refuseLoad(projectPath, 'opening the project was cancelled')
  }
  await recordProjectRoot(projectPath)
  const project = await runProjectLoad(projectPath)
  setCurrentProjectRoot(projectPath)
  return project
}

export function createProjectHandlers(
  dialog: Pick<Dialog, 'showMessageBox'>
): Pick<InvokeHandlers, 'project:validate' | 'project:load'> {
  return {
    'project:validate': {
      access: 'project-load',
      check: (raw) => {
        const [path] = strings('project:validate', raw, 1)
        return [path]
      },
      run: runProjectValidate
    },
    'project:load': {
      access: 'project-load',
      check: (raw) => {
        const [path] = strings('project:load', raw, 1)
        return [path]
      },
      run: (path) => loadGrantedProject(dialog, path)
    }
  }
}
