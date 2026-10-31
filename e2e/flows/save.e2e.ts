// Saving through the packaged app into a copy of the fixture project: a new plugin lands as one
// compiling file, imported files come back byte for byte (also after a restart), and a save over
// a file the tab does not know asks first and asks again when the file changed meanwhile.
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import type { ElectronApplication, Page } from '@playwright/test'
import { compileCheck } from '../../src/main/services/syntax-check'
import type { API } from '../../src/preload/index'
import { findAnnotationBlocks } from '../../src/shared/annotation-blocks'
import { fixturePath } from '../../tests/helpers/fixture-project'
import {
  assertDialogsDrained,
  dialogCalls,
  expect,
  launchTwin,
  loadFixtureProject,
  openFromBrowser,
  openProject,
  queueDialog,
  stubDialogs,
  tabNames,
  teardown,
  TEARDOWN_BOUND_MS,
  test
} from '../fixtures/app'

// The renderer's window as the preload script exposes it
type AppWindow = { api: API }

const pluginsDir = (project: string): string => join(project, 'js', 'plugins')

const mtimeNs = (path: string): bigint => statSync(path, { bigint: true }).mtimeNs

/**
 * Waits until the renderer has handled every reply main sent before now: replies travel in
 * order, so the answer to a later round trip arrives after them. The app drops a save shortcut
 * pressed while an earlier save is still running.
 */
async function settle(page: Page): Promise<void> {
  await page.evaluate(() => (window as unknown as AppWindow).api.window.isMaximized())
}

async function save(page: Page): Promise<void> {
  await settle(page)
  await page.keyboard.press('Control+s')
}

/** Saves and waits until the file's modification time moves past `before` */
async function saveAndWaitForWrite(page: Page, path: string): Promise<void> {
  const before = mtimeNs(path)
  await save(page)
  await expect.poll(() => mtimeNs(path) > before).toBe(true)
}

/**
 * Closes the window the way a user does, so the app quits, failing when it is not gone within the
 * bound. Unlike `app.close()`, this keeps the app reachable while a prompt holds the close back.
 */
async function closeWithin(app: ElectronApplication): Promise<void> {
  const closed = app.waitForEvent('close', { timeout: TEARDOWN_BOUND_MS }).then(
    () => true,
    () => false
  )
  await app.evaluate(({ BrowserWindow }) => {
    for (const window of BrowserWindow.getAllWindows()) window.close()
  })
  if (!(await closed)) {
    // A prompt nobody expected holds the close back: name it
    await assertDialogsDrained(app)
    throw new Error(`the app did not close within ${TEARDOWN_BOUND_MS} ms`)
  }
}

interface Box {
  buttons?: string[]
  defaultId?: number
  cancelId?: number
}

/** Every message box main showed so far, as it was asked */
async function boxes(app: ElectronApplication): Promise<Box[]> {
  return (await dialogCalls(app))
    .filter(({ method }) => method === 'showMessageBox')
    .map(({ options }) => options as Box)
}

test('saves a new plugin with one parameter into the project', async ({ twin }) => {
  const { app, page } = twin
  const project = await loadFixtureProject(app, page)
  const before = readdirSync(pluginsDir(project))

  await page.getByTestId('new-plugin').click()
  await page.getByTestId('editor-tab-parameters').click()
  await page.getByTestId('param-add').click()
  await save(page)

  await expect
    .poll(() => readdirSync(pluginsDir(project)).sort())
    .toEqual([...before, 'NewPlugin.js'].sort())
  const text = readFileSync(join(pluginsDir(project), 'NewPlugin.js'), 'utf8')
  expect(compileCheck(text, 'NewPlugin.js')).toBeNull()
  const main = findAnnotationBlocks(text).filter(({ kind }) => kind === 'main')
  expect(main).toHaveLength(1)
  const body = text.slice(main[0]?.start, main[0]?.end)
  const params = [...body.matchAll(/@param[ \t]+\S/g)]
  expect(params).toHaveLength(1)
  expect(body.slice(params[0]?.index)).toMatch(/@type[ \t]+\S/)
  await assertDialogsDrained(app)
})

test('saves imported LF, CRLF and BOM plugins byte-identical', async ({ twin }) => {
  const { app, page } = twin
  const project = await loadFixtureProject(app, page)

  for (const file of ['Fixture_HandWritten.js', 'Fixture_HandWritten_CRLF.js', 'Fixture_Bom.js']) {
    await openFromBrowser(page, file)
    const target = join(pluginsDir(project), file)
    await saveAndWaitForWrite(page, target)
    expect(readFileSync(target).equals(readFileSync(fixturePath('js', 'plugins', file)))).toBe(true)
  }
  await assertDialogsDrained(app)
})

test('saves an imported plugin byte-identical after a relaunch', async ({ twin }) => {
  const file = 'Fixture_HandWritten.js'
  const project = await loadFixtureProject(twin.app, twin.page)
  await openFromBrowser(twin.page, file)
  const tabs = await tabNames(twin.page)
  expect(tabs).toContain(file.replace(/\.js$/, ''))
  await assertDialogsDrained(twin.app)
  // The queue is empty: a prompt on the way out fails the close
  await closeWithin(twin.app)

  const { app, page } = await launchTwin({ userDataDir: twin.userDataDir })
  try {
    await stubDialogs(app)
    await expect.poll(() => tabNames(page)).toEqual(tabs)
    await openProject(app, page, project)

    const target = join(pluginsDir(project), file)
    await saveAndWaitForWrite(page, target)
    expect(readFileSync(target).equals(readFileSync(fixturePath('js', 'plugins', file)))).toBe(true)
    await assertDialogsDrained(app)
  } finally {
    // Before the first launch's teardown deletes the profile this one runs on
    await teardown(app)
  }
})

test('asks before overwriting a different file and re-checks after the prompt', async ({
  twin
}) => {
  const { app, page } = twin
  const project = await loadFixtureProject(app, page)
  const target = join(pluginsDir(project), 'Fixture_Bom.js')
  const original = readFileSync(target)

  await page.getByTestId('new-plugin').click()
  await page.getByTestId('editor-tab-meta').click()
  await page.getByTestId('meta-name').fill('Fixture_Bom')

  // Buttons are [Cancel, Overwrite]: the tab is new, so no reload is offered
  await queueDialog(app, 'showMessageBox', 'cancel')
  await save(page)
  await expect.poll(async () => (await boxes(app)).length).toBe(1)
  const [first] = await boxes(app)
  expect(first?.buttons).toHaveLength(2)
  expect(first?.defaultId).toBe(first?.cancelId)
  await settle(page)
  expect(readFileSync(target).equals(original)).toBe(true)

  // The file changes while the prompt is open: Overwrite meets the change and asks again
  const changed = '// changed while the prompt was open\n'
  await queueDialog(app, 'showMessageBox', 1, { path: target, content: changed })
  await queueDialog(app, 'showMessageBox', 'cancel')
  await save(page)
  await expect.poll(async () => (await boxes(app)).length).toBe(3)
  for (const box of (await boxes(app)).slice(1)) {
    expect(box.buttons).toHaveLength(2)
    expect(box.defaultId).toBe(box.cancelId)
  }
  await settle(page)
  expect(readFileSync(target, 'utf8')).toBe(changed)

  await queueDialog(app, 'showMessageBox', 1)
  const before = mtimeNs(target)
  await save(page)
  await expect.poll(() => mtimeNs(target) > before).toBe(true)
  expect(await boxes(app)).toHaveLength(4)
  const replaced = readFileSync(target)
  expect(replaced.equals(original)).toBe(false)
  expect(replaced.toString('utf8')).not.toBe(changed)
  expect(compileCheck(replaced.toString('utf8'), 'Fixture_Bom.js')).toBeNull()
  await assertDialogsDrained(app)
})
