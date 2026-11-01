// The HTML sanitizer inside the bundled code editor: the copy the lockfile pins, at a release no
// older than package.json declares, and still rendering the editor's hover text
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { expect, newPlugin, test } from '../fixtures/app'

const ROOT = process.cwd()

interface Lockfile {
  packages: Record<string, { version?: string }>
}

/** `^A.B.C`: the same major, and minor.patch at or above B.C */
function satisfiesCaret(version: string, range: string): boolean {
  const parts = (text: string): number[] | undefined =>
    /^(\d+)\.(\d+)\.(\d+)$/.exec(text)?.slice(1, 4).map(Number)
  const have = parts(version)
  const want = range.startsWith('^') ? parts(range.slice(1)) : undefined
  if (!have || !want) return false
  const [major, minor, patch] = have as [number, number, number]
  const [wantMajor, wantMinor, wantPatch] = want as [number, number, number]
  return major === wantMajor && (minor > wantMinor || (minor === wantMinor && patch >= wantPatch))
}

test('bundles the sanitizer the lockfile pins, at the declared release', () => {
  const rendererDir = join(ROOT, 'out', 'renderer')
  const scripts = (readdirSync(rendererDir, { recursive: true }) as string[]).filter((file) =>
    file.endsWith('.js')
  )
  // Every copy keeps its licence header in the built script, version included
  const bundled = scripts.flatMap((file) =>
    [...readFileSync(join(rendererDir, file), 'utf8').matchAll(/@license DOMPurify (\S+)/g)].map(
      (match) => ({ file, version: match[1] })
    )
  )
  const lock = JSON.parse(readFileSync(join(ROOT, 'package-lock.json'), 'utf8')) as Lockfile
  const locked = lock.packages['node_modules/dompurify']?.version
  const nested = Object.keys(lock.packages).filter((path) =>
    path.endsWith('/node_modules/dompurify')
  )
  const manifest = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')) as {
    devDependencies?: Record<string, string>
  }
  const declared = manifest.devDependencies?.['dompurify']
  process.stdout.write(
    `e2e sanitizer: scripts ${scripts.length}; bundled ` +
      `${bundled.map(({ file, version }) => `${version} (${file})`).join(', ') || 'none'}; ` +
      `lockfile ${locked ?? 'none'}; nested ${nested.length}; package.json ${declared ?? 'none'}\n`
  )
  // Every leg is read, so one failing run shows them all
  expect.soft(bundled.length, 'bundled copies').toBeGreaterThan(0)
  expect.soft([...new Set(bundled.map(({ version }) => version))]).toEqual([locked])
  expect.soft(nested, 'nested lockfile copies').toEqual([])
  expect.soft(declared, 'package.json devDependencies.dompurify').toBeDefined()
  expect
    .soft(satisfiesCaret(locked ?? '', declared ?? ''), `${locked} satisfies ${declared}`)
    .toBe(true)
})

test('renders the hover text of a documented function', async ({ twin }) => {
  const { page, pageErrors } = twin
  await newPlugin(page)
  await page.getByTestId('editor-tab-code').click()
  const editor = page.getByRole('tabpanel').locator('.monaco-editor')
  await editor.click()
  await page.keyboard.press('ControlOrMeta+A')
  await page.keyboard.insertText(
    '/** Adds **two** numbers. */\nfunction addTwo(a, b) {\nreturn a + b\n}\naddTwo(1, 2)'
  )
  // The call on the last line; the hover's markdown passes through the sanitizer to the page
  await editor
    .locator('.view-line > span > span', { hasText: /^addTwo$/ })
    .last()
    .hover()
  // The editor keeps a second, hidden hover for the glyph margin
  const hover = page.locator('.monaco-hover:not(.hidden)')
  await expect(hover.locator('strong', { hasText: /^two$/ })).toBeVisible({ timeout: 15_000 })
  await expect(hover).toContainText('function addTwo(a: any, b: any): any')
  expect(pageErrors).toEqual([])
})
