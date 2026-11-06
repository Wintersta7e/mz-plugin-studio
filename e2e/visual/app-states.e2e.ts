// One screenshot per app state and theme, compared pixel for pixel with the Linux baselines. Every
// test starts a fresh app; parts that differ between runs are masked, and a temp path anywhere
// outside a mask fails the test instead of the comparison.
import path from 'node:path'
import type { Page } from '@playwright/test'
import {
  allowUnload,
  expect,
  field,
  isRecord,
  type LaunchedApp,
  loadFixtureProject,
  newPlugin,
  runRoot,
  settle,
  test
} from '../fixtures/app'
import { snapshotName, STATES, type State, THEMES, type Theme } from './states'

const SETTINGS_KEY = 'mz-plugin-studio-settings'
// Set on every element whose own text or value holds a temp path
const TEMP_MARK = 'data-e2e-temp-path'
const MASKS = [
  '.cursors-layer',
  '.decorationsOverviewRuler',
  '.scrollbar',
  '[data-testid="app-version"]',
  `[${TEMP_MARK}]`
]
// The read-only code preview highlights its active indent guide only once a cursor event reaches
// the guide layer, which happens or not depending on timing: either frame is final
const PREVIEW_GUIDES = '[data-testid="code-preview"] .core-guide'

/**
Writes the light theme into the persisted settings and reloads the window
*/
async function useLightTheme({ app, page }: LaunchedApp): Promise<void> {
  const stored = await page.evaluate((key) => localStorage.getItem(key), SETTINGS_KEY)
  // A fresh profile has stored no settings yet: the app reads absent fields as their defaults
  const parsed: unknown = stored === null ? { state: {}, version: 0 } : JSON.parse(stored)
  const settings = isRecord(parsed) ? parsed : {}
  const state = field(settings, 'state')
  const light = { ...settings, state: { ...(isRecord(state) && state), theme: 'light' } }
  await page.evaluate(
    ({ key, value }) => {
      localStorage.setItem(key, value)
    },
    { key: SETTINGS_KEY, value: JSON.stringify(light) }
  )
  await allowUnload(app)
  await page.reload()
  await page.waitForLoadState('domcontentloaded')
}

/**
Switches a fresh app, which starts dark, to `theme`
*/
async function applyTheme(twin: LaunchedApp, theme: Theme): Promise<void> {
  if (theme === 'light') await useLightTheme(twin)
}

// States showing a new plugin's generated code
const PREVIEW_STATES = new Set<State>(['metadata', 'parameters', 'commands', 'code'])

/**
Drives the app into `state`; returns the temp directories it shows paths of
*/
async function enter(twin: LaunchedApp, state: State): Promise<string[]> {
  const { app, page } = twin
  if (state === 'welcome') return []
  const project = await loadFixtureProject(app, page, 'Fixture Game')
  const shown = [path.dirname(project)]
  switch (state) {
    case 'metadata': {
      await newPlugin(page)
      await page.getByTestId('editor-tab-meta').click()
      await expect(page.getByTestId('code-preview')).toBeVisible()
      break
    }
    case 'parameters': {
      await newPlugin(page)
      await page.getByTestId('editor-tab-parameters').click()
      // A new parameter's card opens expanded
      await page.getByTestId('param-add').click()
      break
    }
    case 'commands': {
      await newPlugin(page)
      await page.getByTestId('editor-tab-commands').click()
      await page.getByTestId('command-add').click()
      await page.getByTestId('command-arg-add').click()
      break
    }
    case 'code': {
      await newPlugin(page)
      await page.getByTestId('editor-tab-code').click()
      await expect(
        page.getByRole('tabpanel').locator('.monaco-editor .view-line').first()
      ).toBeVisible()
      break
    }
    case 'project-data': {
      await page.getByTestId('project-data-toggle').click()
      await expect(page.getByTestId('project-data-panel')).toBeVisible()
      break
    }
    case 'plugin-browser': {
      await page.getByTestId('plugin-browser-toggle').click()
      await expect(page.getByTestId('plugin-browser-row').first()).toBeVisible()
      break
    }
    case 'analysis': {
      // The view switch shows only while a plugin is open
      await newPlugin(page)
      await page.getByTestId('main-view-analysis').click()
      await expect(page.getByTestId('analysis-view')).toBeVisible()
      break
    }
  }
  if (PREVIEW_STATES.has(state)) {
    // The generated code declares a name it never reads, and the editor's language worker fades
    // that name about a second after the first paint: the frame before it is stable for a while
    // but not final
    await expect(
      page.getByTestId('code-preview').locator('.squiggly-inline-unnecessary').first()
    ).toBeVisible()
  }
  return shown
}

/**
The masks of a state's screenshot
*/
function masksFor(state: State): string[] {
  return PREVIEW_STATES.has(state) ? [...MASKS, PREVIEW_GUIDES] : MASKS
}

/**
Marks every element whose own text or value contains one of `paths`, then lists the elements
holding one that no mask covers.
*/
async function markTemporaryPaths(
  page: Page,
  paths: string[]
): Promise<{ scanned: number; marked: number; unmasked: string[] }> {
  return page.evaluate(
    ({ temporary, masks, mark }) => {
      const { document, HTMLInputElement, HTMLTextAreaElement, Node } = globalThis
      const hasPath = (text: string | null | undefined): boolean =>
        temporary.some((known) => text?.includes(known) === true)
      const own = (element: Element): string =>
        [...element.childNodes]
          .filter((node) => node.nodeType === Node.TEXT_NODE)
          .map((node) => node.textContent ?? '')
          .join('')
      const value = (element: Element): string | undefined =>
        element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement
          ? element.value
          : undefined
      const elements = [...document.querySelectorAll('*')]
      const found = elements.filter((element) => hasPath(own(element)) || hasPath(value(element)))
      for (const element of found) element.setAttribute(mark, '')
      const unmasked = found
        .filter((element) => element.closest(masks.join(',')) === null)
        .map(
          (element) =>
            `<${element.tagName.toLowerCase()}> ${(own(element) || value(element)) ?? ''}`
        )
      return { scanned: elements.length, marked: found.length, unmasked }
    },
    { temporary: paths, masks: MASKS, mark: TEMP_MARK }
  )
}

for (const theme of THEMES) {
  for (const state of STATES) {
    test(`${state} in ${theme} theme`, async ({ twin }) => {
      const { app, page } = twin
      const sizes = await app.evaluate(({ BrowserWindow }) =>
        BrowserWindow.getAllWindows().map((window) => window.getContentSize())
      )
      expect(sizes).toEqual([[1400, 900]])
      await applyTheme(twin, theme)
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme)

      const paths = [runRoot(), ...(await enter(twin, state))]
      await settle(page)
      // Onto the title bar, off every control, so no hover state or tooltip is captured
      await page.mouse.move(700, 12)
      await expect(page.getByTestId('toast-viewport').locator(':scope > *')).toHaveCount(0)
      await page.evaluate(async () => {
        await globalThis.document.fonts.ready
      })

      const { scanned, marked, unmasked } = await markTemporaryPaths(page, paths)
      process.stdout.write(
        `visual: ${state}-${theme} elements scanned ${String(scanned)}, temp paths masked ${String(marked)}\n`
      )
      expect(scanned).toBeGreaterThan(0)
      expect(unmasked, 'elements showing a temp path outside every mask').toEqual([])
      await expect(page).toHaveScreenshot(snapshotName(state, theme), {
        mask: masksFor(state).map((selector) => page.locator(selector))
      })
      const after = await markTemporaryPaths(page, paths)
      expect(after.unmasked).toEqual([])
      expect(twin.pageErrors).toEqual([])
    })
  }
}
