// The state the app saves for its next start is written once edits pause, so an edit made just
// before the page goes away is written on the way out: a reload, a close without saving and a
// hidden window that is then killed each keep it for the next start.
import type { Page } from '@playwright/test'
import {
  expect,
  flushSavedState,
  launchTwin,
  newPlugin,
  queueDialog,
  stubDialogs,
  teardown,
  test,
  type LaunchedApp
} from '../fixtures/app'
import { killTree } from '../fixtures/teardown'

const DESCRIPTION = 'Typed just before the window went away'

// The close prompt's buttons: [Cancel, Close without saving]
const CLOSE_WITHOUT_SAVING = 1

/**
Opens a new plugin and types its description; the step that follows comes before the edits
pause long enough for the app to write them
*/
async function editDescription(page: Page): Promise<void> {
  await newPlugin(page)
  await page.getByTestId('editor-tab-meta').click()
  await page.getByTestId('meta-description').fill(DESCRIPTION)
}

// The active plugin's description as its Metadata tab shows it
async function shownDescription(page: Page): Promise<string> {
  await page.getByTestId('editor-tab-meta').click()
  return page.getByTestId('meta-description').inputValue()
}

/**
The description the app shows when started again on the profile `twin` ran on
*/
async function descriptionAtNextStart(twin: LaunchedApp): Promise<string> {
  const { app, page } = await launchTwin({ userDataDir: twin.userDataDir })
  try {
    await stubDialogs(app)
    return await shownDescription(page)
  } finally {
    // Before the first launch's teardown deletes the profile this one runs on
    await teardown(app)
  }
}

test('keeps an edit made just before a reload', async ({ twin }) => {
  const { app, page } = twin
  // The edit leaves the tab unsaved, so main asks before the page unloads
  await queueDialog(app, 'showMessageBoxSync', CLOSE_WITHOUT_SAVING)
  await editDescription(page)
  await page.reload()
  await page.waitForLoadState('domcontentloaded')

  expect(await shownDescription(page)).toBe(DESCRIPTION)
})

test('keeps an edit made just before the window is closed without saving', async ({ twin }) => {
  const { app, page } = twin
  await queueDialog(app, 'showMessageBoxSync', CLOSE_WITHOUT_SAVING)
  const closed = app.waitForEvent('close')
  await editDescription(page)
  await page.getByTestId('title-bar-close').click()
  await closed

  expect(await descriptionAtNextStart(twin)).toBe(DESCRIPTION)
})

test('keeps an edit made just before the window is hidden and the app killed', async ({ twin }) => {
  const { app, page } = twin
  await editDescription(page)
  await app.evaluate(({ BrowserWindow }) => {
    for (const window of BrowserWindow.getAllWindows()) window.hide()
  })
  // The page under test can keep reporting itself visible after the hide, so the test sends the
  // hidden signal the app answers
  await flushSavedState(page)
  await killTree(app.process())

  expect(await descriptionAtNextStart(twin)).toBe(DESCRIPTION)
})
