import type { Dialog } from 'electron'
import log from 'electron-log/main'
import { ProjectParser } from '../services/projectParser'
import {
  PROJECT_OPEN_CANCELLED,
  accessDenied,
  type ProjectValidation
} from '../../shared/ipc-types'
import type { MZProject } from '../../shared/types/mz'
import { assertSafeProjectPath, isUncText } from '../../shared/path-safety'
import { isProjectRootGranted, recordProjectRoot, setCurrentProjectRoot } from '../file-access'
import { strings } from './arguments'
import type { InvokeHandlers } from './registration'

/** Refuses a project request, logged once without the project's content */
function refuse(channel: string, projectPath: string, reason: string): never {
  log.warn(`[${channel}] Refused ${projectPath}: ${reason}`)
  throw accessDenied(reason)
}

/**
 * Whether the folder was chosen in the folder dialog or confirmed opening. A network folder that
 * was not is refused here, before anything looks it up: on Windows looking up a network path
 * sends the user's credentials to its host, so only the folder dialog may lead there.
 */
async function checkGrant(channel: string, projectPath: string): Promise<boolean> {
  const granted = await isProjectRootGranted(projectPath)
  if (!granted && isUncText(projectPath)) {
    refuse(channel, projectPath, 'a network folder opens only when chosen with Open Project')
  }
  return granted
}

export async function runProjectValidate(path: string): Promise<ProjectValidation> {
  assertSafeProjectPath(path)
  await checkGrant('project:validate', path)
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
 * Asks in a native message box whether to open a folder with no record of being chosen in the
 * folder dialog or confirmed; Cancel is both the Enter and the Esc button. Returns whether the
 * user chose Open.
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
    detail: `${projectPath}\n\nThe app has no record of this folder being chosen with Open Project or confirmed here. Open it only if you expected to. The app reads and saves plugin files in it.`,
    buttons,
    defaultId: cancel,
    cancelId: cancel
  })
  return result.response !== cancel
}

/**
 * Loads an RPG Maker MZ project folder the user chose in the folder dialog or confirms now, and
 * makes it the project the project channels act on. A refused or failed load keeps the open one.
 */
export async function loadGrantedProject(
  dialog: Pick<Dialog, 'showMessageBox'>,
  projectPath: string
): Promise<MZProject> {
  const granted = await checkGrant('project:load', projectPath)
  const validation = await ProjectParser.validateProject(projectPath)
  if (!validation.valid) refuse('project:load', projectPath, 'not an RPG Maker MZ project folder')
  if (!granted && !(await confirmProjectOpen(dialog, projectPath))) {
    refuse('project:load', projectPath, PROJECT_OPEN_CANCELLED)
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
      run: async (path) => loadGrantedProject(dialog, path)
    }
  }
}
