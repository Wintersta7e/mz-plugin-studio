// A profile the previous release saved: the packaged app restores its tabs without a page error,
// refuses to save a raw-mode tab whose file text the old profile did not keep, and writes each
// file back once its tab is reloaded from the project.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { Page } from '@playwright/test'
import { compileCheck } from '../../src/main/services/syntax-check'
import { fixturePath } from '../../tests/helpers/fixture-project'
import { PERSISTED_KEYS, readV160Payloads } from '../../tests/helpers/persist-v160'
import {
  assertDialogsDrained,
  dialogCalls,
  expect,
  fixtureProjectFor,
  mtimeNs,
  openProject,
  pluginsDir,
  queueDialog,
  save,
  saveAndWaitForWrite,
  settle,
  tabNames,
  test
} from '../fixtures/app'
import type { LaunchedApp } from '../fixtures/app'

// The project path the captured profile names
const CAPTURED_PROJECT = '/fixture/mz-project'

// The reload prompt of a tab with unsaved edits: [Cancel, Replace with file, Keep tab values]
const REPLACE_WITH_FILE = 1
const KEEP_TAB_VALUES = 2

interface CapturedPlugin {
  id: string
  meta: { name: string; description: string }
  codeBody?: string
}

interface CapturedTabs {
  state: { openPlugins: CapturedPlugin[]; dirtyByPluginId: Record<string, boolean> }
}

interface CapturedUi {
  state: { rawModeByPluginId: Record<string, boolean> }
}

interface Restored {
  project: string
  // The raw-mode tab with no unsaved edits
  clean: CapturedPlugin
  // The imported tab holding the captured code body and an unsaved edit
  edited: CapturedPlugin
}

/** Writes the captured profile, pointed at a fresh fixture copy, and reloads into it */
async function restoreCapturedProfile({ app, page, pageErrors }: LaunchedApp): Promise<Restored> {
  const project = await fixtureProjectFor(app)
  const payloads = readV160Payloads()
  const escaped = JSON.stringify(project).slice(1, -1)
  const entries = PERSISTED_KEYS.map((key) => {
    const value = payloads[key]
    if (value === undefined) throw new Error(`no captured value for ${key}`)
    return [key, value.replaceAll(CAPTURED_PROJECT, escaped)] as const
  })
  expect(entries.filter(([, value]) => value.includes(escaped)).length).toBeGreaterThan(0)

  await page.evaluate((pairs) => {
    for (const [key, value] of pairs) localStorage.setItem(key, value)
  }, entries)
  await app.evaluate(({ BrowserWindow }) => {
    for (const window of BrowserWindow.getAllWindows()) {
      window.webContents.on('will-prevent-unload', (event) => event.preventDefault())
    }
  })
  await page.reload()

  const tabs = JSON.parse(payloads['mz-plugin-studio-plugin'] ?? '') as CapturedTabs
  const ui = JSON.parse(payloads['mz-plugin-studio-ui'] ?? '') as CapturedUi
  await expect(page.getByTestId('plugin-tab')).toHaveCount(tabs.state.openPlugins.length)
  expect(pageErrors).toEqual([])
  await openProject(app, page, project)

  const { openPlugins, dirtyByPluginId } = tabs.state
  const clean = openPlugins.filter(
    (plugin) => ui.state.rawModeByPluginId[plugin.id] === true && !dirtyByPluginId[plugin.id]
  )
  const edited = openPlugins.filter(
    (plugin) => Boolean(plugin.codeBody) && dirtyByPluginId[plugin.id] === true
  )
  expect(clean).toHaveLength(1)
  expect(edited).toHaveLength(1)
  return { project, clean: clean[0] as CapturedPlugin, edited: edited[0] as CapturedPlugin }
}

async function selectTab(page: Page, name: string): Promise<void> {
  // Fixture names are plain word characters; a tab's label may carry an unsaved mark after it
  const index = (await tabNames(page)).findIndex((label) =>
    new RegExp(`^${name}(?!\\w)`).test(label ?? '')
  )
  expect(index).toBeGreaterThanOrEqual(0)
  await page.getByTestId('plugin-tab').nth(index).click()
}

/** Reloads the active tab from the project and waits until its source is attached */
async function reload(page: Page): Promise<void> {
  await page.getByTestId('source-missing-reload').click()
  await expect(page.getByTestId('source-missing-reload')).toHaveCount(0)
}

const target = (project: string, plugin: CapturedPlugin): string =>
  join(pluginsDir(project), `${plugin.meta.name}.js`)

const tracked = (plugin: CapturedPlugin): Buffer =>
  readFileSync(fixturePath('js', 'plugins', `${plugin.meta.name}.js`))

test('restores a profile written by the previous release', async ({ twin }) => {
  const { app, page, pageErrors } = twin
  const { project, edited } = await restoreCapturedProfile(twin)

  await selectTab(page, edited.meta.name)
  const editedFile = target(project, edited)
  const bytes = readFileSync(editedFile)
  const mtime = mtimeNs(editedFile)
  const notices = page.getByTestId('toast-viewport').locator(':scope > *')
  await settle(page)
  const shown = await notices.count()
  await save(page)
  await expect(notices).toHaveCount(shown + 1)
  await settle(page)
  expect(readFileSync(editedFile).equals(bytes)).toBe(true)
  expect(mtimeNs(editedFile)).toBe(mtime)
  // Opening the project was the only dialog
  await assertDialogsDrained(app)
  expect((await dialogCalls(app)).map(({ method }) => method)).toEqual(['showOpenDialog'])

  // The captured profile keeps the preview collapsed: Ctrl+B shows it
  await page.keyboard.press('Control+b')
  await queueDialog(app, 'showMessageBox', REPLACE_WITH_FILE)
  await reload(page)
  await saveAndWaitForWrite(page, editedFile)
  expect(readFileSync(editedFile).equals(tracked(edited))).toBe(true)
  expect(pageErrors).toEqual([])
  await assertDialogsDrained(app)
})

test('reloads a restored raw-mode tab with no edits without asking', async ({ twin }) => {
  const { app, page, pageErrors } = twin
  const { project, clean } = await restoreCapturedProfile(twin)

  await selectTab(page, clean.meta.name)
  await page.keyboard.press('Control+b')
  await reload(page)
  await saveAndWaitForWrite(page, target(project, clean))
  expect(readFileSync(target(project, clean)).equals(tracked(clean))).toBe(true)
  expect(pageErrors).toEqual([])
  // No prompt was answered: any reload or save prompt fails here by name
  await assertDialogsDrained(app)
  expect((await dialogCalls(app)).map(({ method }) => method)).toEqual(['showOpenDialog'])
})

test('keeps the edit of an imported tab reloaded with its values', async ({ twin }) => {
  const { app, page, pageErrors } = twin
  const { project, edited } = await restoreCapturedProfile(twin)

  await selectTab(page, edited.meta.name)
  await page.keyboard.press('Control+b')
  await queueDialog(app, 'showMessageBox', KEEP_TAB_VALUES)
  await reload(page)
  const file = target(project, edited)
  await saveAndWaitForWrite(page, file)
  const text = readFileSync(file, 'utf8')
  expect(/^ \* @plugindesc (.*)$/m.exec(text)?.[1]).toBe(edited.meta.description)
  expect(compileCheck(text, `${edited.meta.name}.js`)).toBeNull()
  expect(pageErrors).toEqual([])
  await assertDialogsDrained(app)
})
