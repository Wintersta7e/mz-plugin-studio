// The state the app saves for its next start is written once edits pause, so an edit made just
// before the page goes away is written on the way out: a reload, a close without saving and a
// hidden window that is then killed each keep it for the next start.
import type { Page } from '@playwright/test'
import type { PersistedKey } from '../../src/renderer/src/stores/persist'
import {
  dialogCalls,
  expect,
  field,
  flushSavedState,
  isRecord,
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

const LAYOUT_KEY: PersistedKey = 'mz-plugin-studio-ui'
const PLUGIN_KEY: PersistedKey = 'mz-plugin-studio-plugin'

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

/**
Takes the layout's saved copy out of the page's storage and fills the storage under test-only keys
until it takes not one more character, so the layout's next write needs room the storage does not
have
*/
async function fillStorageWithoutLayout(page: Page): Promise<void> {
  await page.evaluate((layoutKey) => {
    localStorage.removeItem(layoutKey)
    let size = 1 << 20
    let count = 0
    while (size >= 1) {
      try {
        localStorage.setItem(`e2e-fill-${String(count)}`, 'x'.repeat(size))
        count += 1
      } catch (error) {
        if (!(error instanceof DOMException && error.name === 'QuotaExceededError')) throw error
        size = Math.floor(size / 2)
      }
    }
  }, LAYOUT_KEY)
}

// Whether any open tab was saved as unsaved, as the app stored it for its next start
async function hasUnsavedTab(page: Page): Promise<boolean> {
  const raw = await page.evaluate((key) => localStorage.getItem(key), PLUGIN_KEY)
  if (raw === null) throw new Error(`nothing saved under ${PLUGIN_KEY}`)
  const dirty = field(field(JSON.parse(raw), 'state'), 'dirtyByPluginId')
  if (!isRecord(dirty)) throw new Error(`no unsaved-tab record under ${PLUGIN_KEY}`)
  return Object.values(dirty).includes(true)
}

test('holds the first close after the layout could not be saved, and closes on the next', async ({
  twin
}) => {
  const { app, page } = twin
  const prompts = async (): Promise<number> => {
    const calls = await dialogCalls(app)
    return calls.filter(({ method }) => method === 'showMessageBoxSync').length
  }
  await newPlugin(page)
  // Nothing is left to write when the storage fills up
  await flushSavedState(page)
  // The close is held by the failed write alone: no tab holds unsaved changes
  expect(await hasUnsavedTab(page)).toBe(false)
  await fillStorageWithoutLayout(page)
  await page.getByRole('slider').press('ArrowLeft')

  await queueDialog(app, 'showMessageBoxSync', 'cancel')
  await page.getByTestId('title-bar-close').click()
  await expect.poll(prompts).toBe(1)
  expect(await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().length)).toBe(1)
  await expect(page.getByTestId('toast-viewport')).toContainText(
    'Storage is full: recent changes to layout were not saved'
  )

  // A second prompt would be answered Cancel and keep the window, so the window closing shows
  // that main did not ask again
  await queueDialog(app, 'showMessageBoxSync', 'cancel')
  const closed = app.waitForEvent('close')
  await page.getByTestId('title-bar-close').click()
  await closed
})
