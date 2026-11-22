// Which folders a pick in the folder dialog grants: only an RPG Maker MZ project, so a folder
// that is not one is never kept as a project folder `project:load` opens without asking. Each
// pick goes through the registered handler with a queued native answer, in a fresh user data
// folder, as a new app session does.
import { cp, mkdir, mkdtemp, readFile, rm } from 'node:fs/promises'
import { readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import type { OpenDialogReturnValue } from 'electron'
import * as ts from 'typescript'
import { afterAll, afterEach, describe, expect, it, vi, type MockInstance } from 'vitest'
import type * as FileAccess from '../../src/main/file-access'
import { afterAllTests } from '../helpers/after-all-tests'
import { copyFixtureProject } from '../helpers/fixture-project'
import { sourceFiles } from '../helpers/source-files'

vi.mock<{ ipcMain: object }>(import('electron'), () => ({ ipcMain: {} }))

const counted = { rows: 0, granted: 0 }

/**
Folders the running test made, removed after it
*/
const made: string[] = []

async function removeMade(): Promise<void> {
  for (const folder of made.splice(0)) await rm(folder, { recursive: true, force: true })
}

async function temporaryFolder(prefix: string): Promise<string> {
  const folder = await mkdtemp(path.join(tmpdir(), prefix))
  made.push(folder)
  return folder
}

/**
The folders kept in `project-roots.json`; none when the file was never written
*/
/**
Fails until the file of dialog folders keeps `folder` as the folder dialog's last choice
*/
async function lastFolderKept(userData: string, folder: string): Promise<void> {
  const text = await readFile(path.join(userData, 'dialog-folders.json'), 'utf8')
  const kept: unknown = JSON.parse(text)
  const folders: unknown =
    typeof kept === 'object' && kept !== null ? Reflect.get(kept, 'folders') : undefined
  const last: unknown =
    typeof folders === 'object' && folders !== null
      ? Reflect.get(folders, 'open-folder')
      : undefined
  if (last !== folder) throw new Error(`the folder dialog last kept ${String(last)}`)
}

async function keptRoots(userData: string, file: string): Promise<unknown> {
  try {
    const kept: unknown = JSON.parse(await readFile(path.join(userData, file), 'utf8'))
    return kept
  } catch {
    return { roots: [] }
  }
}

function rootsOf(kept: unknown): unknown[] {
  const roots: unknown =
    typeof kept === 'object' && kept !== null ? Reflect.get(kept, 'roots') : undefined
  return Array.isArray(roots) ? roots : []
}

/**
Fresh main modules on a stand-in for `ipcMain`, keeping project folders in `userData`
*/
async function session(userData: string) {
  vi.resetModules()
  const access: typeof FileAccess = await import('../../src/main/file-access')
  access.setProjectRootsDirectory(userData)
  const { registerMainHandlers } = await import('../helpers/fake-ipc')
  const { default: log } = await import('electron-log/main')
  const info: MockInstance<(...params: unknown[]) => void> = vi.mocked(log.info)
  const dialog = {
    showOpenDialog: vi
      .fn<(...args: unknown[]) => Promise<OpenDialogReturnValue>>()
      .mockRejectedValue(new Error('no answer queued for showOpenDialog'))
  }
  const ipc = registerMainHandlers(dialog)
  /**
  Picks `folder` in the folder dialog; what the channel returned and what main now keeps
  */
  const pick = async (folder: string) => {
    counted.rows += 1
    dialog.showOpenDialog.mockResolvedValueOnce({ canceled: false, filePaths: [folder] })
    const infoBefore = info.mock.calls.length
    const returned = await ipc.invoke('dialog:open-folder')
    const kept = rootsOf(await keptRoots(userData, access.PROJECT_ROOTS_FILE))
    const isKept = kept.includes(path.resolve(folder))
    if (isKept) counted.granted += 1
    const refusals = info.mock.calls
      .slice(infoBefore)
      .map((call) => String(call[0]))
      .filter((line) => line.includes('Not a project folder') && line.includes(folder))
    return {
      returned,
      kept: isKept,
      session: await access.isProjectRootGranted(folder),
      refusalLines: refusals.length
    }
  }
  return { pick }
}

const RECORD_PROJECT_ROOT = 'recordProjectRoot'

/**
The files under `src/` that call `recordProjectRoot(`, one entry per call, as paths from the
repository root
*/
function recordProjectRootCallers(): string[] {
  const root = process.cwd()
  return sourceFiles(path.join(root, 'src'), /\.tsx?$/).flatMap((file) => {
    const sf = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true)
    const found: string[] = []
    const visit = (node: ts.Node): void => {
      if (
        ts.isCallExpression(node) &&
        ts.isIdentifier(node.expression) &&
        node.expression.text === RECORD_PROJECT_ROOT
      ) {
        found.push(path.relative(root, file).split(path.sep).join('/'))
      }
      ts.forEachChild(node, visit)
    }
    visit(sf)
    return found
  })
}

function rowProblems(): string[] {
  process.stdout.write(
    `grant rows: ${String(counted.rows)}, roots granted: ${String(counted.granted)}\n`
  )
  return counted.rows > 0 ? [] : ['no folder pick ran']
}

describe('the folder dialog grants only a project', () => {
  afterEach(removeMade)

  afterAll(afterAllTests(rowProblems))

  it('grants the project folder and none of the other picks', async () => {
    expect.assertions(1)

    const project = await copyFixtureProject()
    made.push(path.dirname(project))
    const empty = await temporaryFolder('open-folder-empty-')
    const dataOnly = await temporaryFolder('open-folder-data-only-')
    await mkdir(path.join(dataOnly, 'data'))
    await cp(path.join(project, 'data'), path.join(dataOnly, 'data'), { recursive: true })
    const userData = await temporaryFolder('open-folder-user-data-')
    const { pick } = await session(userData)

    const rows = {
      empty: await pick(empty),
      plugins: await pick(path.join(project, 'js', 'plugins')),
      dataOnly: await pick(dataOnly),
      project: await pick(project)
    }
    // The dialog answers before it keeps its folder: let that write end before the folder goes
    await vi.waitFor(async () => {
      await lastFolderKept(userData, path.dirname(project))
    })

    const refused = { kept: false, session: false, refusalLines: 1 }

    expect(rows).toStrictEqual({
      empty: { returned: empty, ...refused },
      plugins: { returned: path.join(project, 'js', 'plugins'), ...refused },
      dataOnly: { returned: dataOnly, ...refused },
      project: { returned: project, kept: true, session: true, refusalLines: 0 }
    })
  })

  it('records a project folder at two places only: the folder dialog and a confirmed load', () => {
    expect.assertions(1)

    const callers = recordProjectRootCallers()

    expect(callers, `recordProjectRoot call sites: ${String(callers.length)}`).toStrictEqual([
      'src/main/ipc/dialog.ts',
      'src/main/ipc/project.ts'
    ])
  })
})
