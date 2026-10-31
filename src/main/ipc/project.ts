import log from 'electron-log/main'
import { ProjectParser } from '../services/projectParser'
import type { ProjectValidation } from '../../shared/ipc-types'
import type { MZProject } from '../../shared/types/mz'
import { assertSafeProjectPath } from '../../shared/path-safety'
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

export const projectHandlers: Pick<InvokeHandlers, 'project:validate' | 'project:load'> = {
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
    run: runProjectLoad
  }
}
