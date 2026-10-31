// Closing the packaged app while a plugin is unsaved: main asks once, with Cancel as the default,
// whichever way the window is closed, and the app quits cleanly only when the user discards.
import type { ElectronApplication, Page } from '@playwright/test'
import type { PersistedKey } from '../../src/renderer/src/stores/persist'
import {
  assertDialogsDrained,
  dialogCalls,
  expect,
  loadFixtureProject,
  openFromBrowser,
  queueDialog,
  tabNames,
  test
} from '../fixtures/app'

const PLUGIN_KEY: PersistedKey = 'mz-plugin-studio-plugin'

interface PersistedTabs {
  state: { activePluginId: string | null; dirtyByPluginId: Record<string, boolean> }
}

/** The open tabs as the app saved them for its next start */
async function persistedTabs(page: Page): Promise<PersistedTabs['state']> {
  const raw = await page.evaluate((key) => localStorage.getItem(key), PLUGIN_KEY)
  if (raw === null) throw new Error(`nothing saved under ${PLUGIN_KEY}`)
  return (JSON.parse(raw) as PersistedTabs).state
}

/** Opens a new plugin and leaves it with an unsaved description */
async function newUnsavedPlugin(page: Page): Promise<void> {
  await page.getByTestId('new-plugin').click()
  await page.getByTestId('editor-tab-meta').click()
  await page.getByTestId('meta-description').fill('Not saved yet')
}

interface Box {
  defaultId?: number
  cancelId?: number
}

/** The close prompts main showed so far, as it was asked */
async function closePrompts(app: ElectronApplication): Promise<Box[]> {
  return (await dialogCalls(app))
    .filter(({ method }) => method === 'showMessageBoxSync')
    .map(({ options }) => options as Box)
}

test('asks once from the title-bar close with only a background tab unsaved', async ({ twin }) => {
  const { app, page } = twin
  await loadFixtureProject(app, page)
  await newUnsavedPlugin(page)
  await openFromBrowser(page, 'Fixture_Bom.js')

  await expect
    .poll(async () => {
      const { activePluginId, dirtyByPluginId } = await persistedTabs(page)
      const dirty = Object.keys(dirtyByPluginId).filter((id) => dirtyByPluginId[id])
      return dirty.length === 1 && dirty[0] !== activePluginId
    })
    .toBe(true)
  const tabs = await tabNames(page)

  await queueDialog(app, 'showMessageBoxSync', 'cancel')
  await page.getByTestId('title-bar-close').click()
  await expect.poll(async () => (await closePrompts(app)).length).toBe(1)
  const [prompt] = await closePrompts(app)
  expect(prompt?.defaultId).toBe(prompt?.cancelId)
  expect(await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().length)).toBe(1)
  expect(await tabNames(page)).toEqual(tabs)
  // The project's folder, then the one prompt
  expect((await dialogCalls(app)).map(({ method }) => method)).toEqual([
    'showOpenDialog',
    'showMessageBoxSync'
  ])
  await assertDialogsDrained(app)
})

test('asks once when the window is closed from main and exits on discard', async ({ twin }) => {
  const { app, page } = twin
  await newUnsavedPlugin(page)
  const closeFromMain = (): Promise<void> =>
    app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]?.close())

  await queueDialog(app, 'showMessageBoxSync', 'cancel')
  await closeFromMain()
  await expect.poll(async () => (await closePrompts(app)).length).toBe(1)
  const [prompt] = await closePrompts(app)
  expect(prompt?.defaultId).toBe(prompt?.cancelId)
  expect(await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().length)).toBe(1)
  await assertDialogsDrained(app)

  // Close without saving: the only other button
  await queueDialog(app, 'showMessageBoxSync', 'confirm')
  const child = app.process()
  const closed = app.waitForEvent('close')
  await closeFromMain()
  await closed
  await expect.poll(() => child.exitCode).toBe(0)
})
