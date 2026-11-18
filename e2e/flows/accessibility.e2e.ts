// The app's main views scanned for WCAG 2.1 A and AA violations: the start view, a plugin's
// parameters, the command builder and the settings dialog. Every violation is printed with the
// elements it names, so one run lists them all.
import { AxeBuilder } from '@axe-core/playwright'
import type { Page } from '@playwright/test'
import { expect, loadFixtureProject, newPlugin, test } from '../fixtures/app'

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']

interface ViewResult {
  view: string
  violations: string[]
}

interface CheckResult {
  data: unknown
}

/**
The measured colours of a failed contrast check, e.g. ` [#6a9955 on #1e1e1e, 4.2:1]`; empty for
any other check
*/
function contrastOf(checks: CheckResult[]): string {
  for (const { data } of checks) {
    if (
      typeof data === 'object' &&
      data !== null &&
      'fgColor' in data &&
      'bgColor' in data &&
      'contrastRatio' in data
    ) {
      return ` [${String(data.fgColor)} on ${String(data.bgColor)}, ${String(data.contrastRatio)}:1]`
    }
  }
  return ''
}

/**
Resolves once every animation that ends has ended: a fading element scanned mid-fade shows a
contrast it never has at rest
*/
async function animationsSettled(page: Page): Promise<void> {
  await page.waitForFunction(() =>
    document
      .getAnimations()
      .every(
        (animation) =>
          animation.playState !== 'running' ||
          animation.effect?.getComputedTiming().iterations === Infinity
      )
  )
}

/**
The view's violations, one line per rule: its id, impact and the elements it names
*/
async function scan(page: Page, view: string): Promise<ViewResult> {
  await animationsSettled(page)
  // Electron pages cannot open the blank page the default mode finishes the run in
  const { violations } = await new AxeBuilder({ page })
    .withTags(WCAG_TAGS)
    .setLegacyMode(true)
    .analyze()
  const lines = violations.map(
    ({ id, impact, nodes }) =>
      `${id} (${impact ?? 'no impact'}): ${nodes.map(({ target, any }) => target.join(' ') + contrastOf(any)).join(', ')}`
  )
  for (const line of lines) process.stdout.write(`axe: ${view} ${line}\n`)
  return { view, violations: lines }
}

test('the main views have no accessibility violations', async ({ twin }) => {
  const { app, page } = twin
  const results: ViewResult[] = []

  await expect(page.getByTestId('new-plugin')).toBeVisible()
  results.push(await scan(page, 'start'))

  await loadFixtureProject(app, page, 'Fixture Game')
  await newPlugin(page)
  await page.getByTestId('editor-tab-parameters').click()
  // A new parameter's card opens expanded
  await page.getByTestId('param-add').click()
  await expect(page.getByTestId('param-add')).toBeVisible()
  results.push(await scan(page, 'parameters'))

  await page.getByTestId('editor-tab-commands').click()
  await page.getByTestId('command-add').click()
  await page.getByTestId('command-arg-add').click()
  results.push(await scan(page, 'commands'))

  await page.getByTestId('settings-open').click()
  await expect(page.getByRole('dialog')).toBeVisible()
  results.push(await scan(page, 'settings'))

  const violations = results.flatMap(({ violations }) => violations)
  process.stdout.write(
    `axe: views ${String(results.length)}, violations ${String(violations.length)}\n`
  )

  expect(results).toHaveLength(4)
  expect(violations).toEqual([])
})
