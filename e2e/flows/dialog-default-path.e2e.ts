// Where the packaged app's dialogs open: the folder dialog beside the most recent project after a
// restart, with the folder it chose kept in the profile, and the export of a plugin in the open
// project's plugins folder.
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import type { ElectronApplication } from '@playwright/test'
import {
  assertDialogsDrained,
  dialogCalls,
  expect,
  launchTwin,
  loadFixtureProject,
  newPlugin,
  pluginsDir,
  queueDialog,
  settle,
  stubDialogs,
  teardown,
  TEARDOWN_BOUND_MS,
  test
} from '../fixtures/app'

/** The options of every dialog `method` main showed so far */
async function shown(app: ElectronApplication, method: string): Promise<Record<string, unknown>[]> {
  return (await dialogCalls(app))
    .filter((call) => call.method === method)
    .map(({ options }) => options as Record<string, unknown>)
}

/** Closes every window and waits until the app exits */
async function closeApp(app: ElectronApplication): Promise<void> {
  const closed = app.waitForEvent('close', { timeout: TEARDOWN_BOUND_MS })
  await app.evaluate(({ BrowserWindow }) => {
    for (const window of BrowserWindow.getAllWindows()) window.close()
  })
  await closed
}

test('opens the folder dialog beside the most recent project after a restart', async ({ twin }) => {
  const project = await loadFixtureProject(twin.app, twin.page)
  const [first] = await shown(twin.app, 'showOpenDialog')
  expect(first).not.toHaveProperty('defaultPath')
  await assertDialogsDrained(twin.app)
  // The dialog answers before main writes the folder it chose
  const file = join(twin.userDataDir, 'dialog-folders.json')
  await expect
    .poll(() => (existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : null))
    .toEqual({ folders: { 'open-folder': dirname(project) } })
  await closeApp(twin.app)

  const { app, page } = await launchTwin({ userDataDir: twin.userDataDir })
  try {
    await stubDialogs(app)
    await queueDialog(app, 'showOpenDialog', { canceled: true, filePaths: [] })
    await page.getByTestId('open-project').click()
    await expect.poll(async () => (await shown(app, 'showOpenDialog')).length).toBe(1)
    const [seeded] = await shown(app, 'showOpenDialog')
    process.stdout.write(`e2e open-folder default: ${String(seeded.defaultPath)}\n`)
    expect(seeded.defaultPath).toBe(dirname(project))
    await assertDialogsDrained(app)
  } finally {
    // Before the first launch's teardown deletes the profile this one runs on
    await teardown(app)
  }
})

test('exports a plugin from the plugins folder of the open project', async ({ twin }) => {
  const { app, page } = twin
  const project = await loadFixtureProject(app, page)
  await newPlugin(page)
  await page.getByTestId('editor-tab-meta').click()
  await page.getByTestId('meta-name').fill('Synthetic_Export')
  await settle(page)

  await queueDialog(app, 'showSaveDialog', { canceled: true })
  await page.getByTestId('export-plugin').click()
  await expect.poll(async () => (await shown(app, 'showSaveDialog')).length).toBe(1)
  const [save] = await shown(app, 'showSaveDialog')
  process.stdout.write(`e2e save-file default: ${String(save.defaultPath)}\n`)
  expect(save.defaultPath).toBe(join(pluginsDir(project), 'Synthetic_Export.js'))
  await assertDialogsDrained(app)
})
