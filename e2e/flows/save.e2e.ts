// Saving through the packaged app into a copy of the fixture project: a new plugin lands as one
// compiling file, imported files come back byte for byte (also after a restart), and a save over
// a file the tab does not know asks first and asks again when the file changed meanwhile.
import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import type { ElectronApplication } from '@playwright/test'
import { compileCheck } from '../../src/main/services/syntax-check'
import { findAnnotationBlocks } from '../../src/shared/annotation-blocks'
import { fixturePath } from '../../tests/helpers/fixture-project'
import {
  assertDialogsDrained,
  dialogCalls,
  expect,
  field,
  launchTwin,
  loadFixtureProject,
  newPlugin,
  mtimeNs,
  only,
  openFromBrowser,
  openProject,
  pluginsDirectory,
  queueDialog,
  save,
  saveAndWaitForWrite,
  settle,
  stubDialogs,
  tabNames,
  teardown,
  TEARDOWN_BOUND_MS,
  test
} from '../fixtures/app'

function byCodeUnit(left: string, right: string): number {
  if (left === right) return 0
  return left < right ? -1 : 1
}

/**
True once the app closed, false when it is still open after the bound
*/
async function didCloseWithin(app: ElectronApplication): Promise<boolean> {
  try {
    await app.waitForEvent('close', { timeout: TEARDOWN_BOUND_MS })
    return true
  } catch {
    return false
  }
}

/**
Closes the window the way a user does, so the app quits, failing when it is not gone within the
bound. Unlike `app.close()`, this keeps the app reachable while a prompt holds the close back.
*/
async function closeWithin(app: ElectronApplication): Promise<void> {
  const closed = didCloseWithin(app)
  await app.evaluate(({ BrowserWindow }) => {
    for (const window of BrowserWindow.getAllWindows()) window.close()
  })
  if (await closed) {
    return
  }

  // A prompt nobody expected holds the close back: name it
  await assertDialogsDrained(app)
  throw new Error(`the app did not close within ${String(TEARDOWN_BOUND_MS)} ms`)
}

/**
The options of every message box main showed so far, as it was asked
*/
async function boxes(app: ElectronApplication): Promise<unknown[]> {
  const calls = await dialogCalls(app)
  return calls.filter(({ method }) => method === 'showMessageBox').map(({ options }) => options)
}

/**
How many message boxes main showed so far
*/
async function boxCount(app: ElectronApplication): Promise<number> {
  const shown = await boxes(app)
  return shown.length
}

test('saves a new plugin with one parameter into the project', async ({ twin }) => {
  const { app, page } = twin
  const project = await loadFixtureProject(app, page)
  const before = readdirSync(pluginsDirectory(project))

  await newPlugin(page)
  await page.getByTestId('editor-tab-parameters').click()
  await page.getByTestId('param-add').click()
  await save(page)

  await expect
    .poll(() => readdirSync(pluginsDirectory(project)).toSorted(byCodeUnit))
    .toEqual([...before, 'NewPlugin.js'].toSorted(byCodeUnit))
  const text = readFileSync(path.join(pluginsDirectory(project), 'NewPlugin.js'), 'utf8')
  expect(compileCheck(text, 'NewPlugin.js')).toBeNull()
  const main = findAnnotationBlocks(text).filter(({ kind }) => kind === 'main')
  expect(main).toHaveLength(1)
  const { start, end } = only(main)
  const body = text.slice(start, end)
  const params = body.matchAll(/@param[ \t]+\S/g).toArray()
  expect(params).toHaveLength(1)
  expect(body.slice(only(params).index)).toMatch(/@type[ \t]+\S/)
  // The page's own log line about the save reaches main's log through the checked channel, as a
  // dated info line like main's own
  const log = path.join(twin.userDataDir, 'logs', 'main.log')
  await expect
    .poll(() => readFileSync(log, 'utf8'))
    .toMatch(/^\[\d{4}-\d\d-\d\d [\d:.]+\] \[info\] +\[save\] Saved .*NewPlugin\.js$/m)
  expect(readFileSync(log, 'utf8')).not.toContain('[ipc] refused')
  await assertDialogsDrained(app)
})

test('saves imported LF, CRLF and BOM plugins byte-identical', async ({ twin }) => {
  const { app, page } = twin
  const project = await loadFixtureProject(app, page)

  for (const file of ['Fixture_HandWritten.js', 'Fixture_HandWritten_CRLF.js', 'Fixture_Bom.js']) {
    await openFromBrowser(page, file)
    const target = path.join(pluginsDirectory(project), file)
    await saveAndWaitForWrite(page, target)
    const tracked = readFileSync(fixturePath('js', 'plugins', file))
    expect(readFileSync(target).equals(tracked)).toBe(true)
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
    await expect.poll(async () => tabNames(page)).toEqual(tabs)
    await openProject(app, page, project)

    const target = path.join(pluginsDirectory(project), file)
    await saveAndWaitForWrite(page, target)
    const tracked = readFileSync(fixturePath('js', 'plugins', file))
    expect(readFileSync(target).equals(tracked)).toBe(true)
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
  const target = path.join(pluginsDirectory(project), 'Fixture_Bom.js')
  const original = readFileSync(target)

  await newPlugin(page)
  await page.getByTestId('editor-tab-meta').click()
  await page.getByTestId('meta-name').fill('Fixture_Bom')

  // Buttons are [Cancel, Overwrite]: the tab is new, so no reload is offered
  await queueDialog(app, 'showMessageBox', 'cancel')
  await save(page)
  await expect.poll(async () => boxCount(app)).toBe(1)
  const [first] = await boxes(app)
  expect(field(first, 'buttons')).toHaveLength(2)
  expect(field(first, 'defaultId')).toBe(field(first, 'cancelId'))
  await settle(page)
  expect(readFileSync(target).equals(original)).toBe(true)

  // The file changes while the prompt is open: Overwrite meets the change and asks again
  const changed = '// changed while the prompt was open\n'
  await queueDialog(app, 'showMessageBox', 1, { path: target, content: changed })
  await queueDialog(app, 'showMessageBox', 'cancel')
  await save(page)
  await expect.poll(async () => boxCount(app)).toBe(3)
  const [, ...again] = await boxes(app)
  for (const box of again) {
    expect(field(box, 'buttons')).toHaveLength(2)
    expect(field(box, 'defaultId')).toBe(field(box, 'cancelId'))
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
