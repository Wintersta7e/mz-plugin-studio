// The HTML sanitizer inside the bundled code editor: the copy the lockfile pins, at a release no
// older than package.json declares, and still rendering the editor's hover text
import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { expect, field, isRecord, newPlugin, test } from '../fixtures/app'

const ROOT = process.cwd()

/**
The numbers of `major.minor.patch`, or undefined for any other text
*/
function versionParts(text: string): [number, number, number] | undefined {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(text)
  return match === null ? undefined : [Number(match[1]), Number(match[2]), Number(match[3])]
}

/**
`^A.B.C`: the same major, and minor.patch at or above B.C
*/
function isCaretMatch(version: string, range: string): boolean {
  const have = versionParts(version)
  const want = range.startsWith('^') ? versionParts(range.slice(1)) : undefined
  if (!have || !want) return false
  const [major, minor, patch] = have
  const [wantMajor, wantMinor, wantPatch] = want
  return major === wantMajor && (minor > wantMinor || (minor === wantMinor && patch >= wantPatch))
}

/**
`value` when it is a string, else undefined
*/
function text(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined
}

/**
The parsed JSON of a file under the repository root
*/
function readRootJson(file: string): unknown {
  const parsed: unknown = JSON.parse(readFileSync(path.join(ROOT, file), 'utf8'))
  return parsed
}

/**
The sanitizer's top-level lockfile version, the lockfile's nested copies of it, and the range
package.json declares
*/
function sanitizerPins(): {
  locked: string | undefined
  nested: string[]
  declared: string | undefined
} {
  const packages = field(readRootJson('package-lock.json'), 'packages')
  const manifest = readRootJson('package.json')
  return {
    locked: text(field(field(packages, 'node_modules/dompurify'), 'version')),
    nested: (isRecord(packages) ? Object.keys(packages) : []).filter((key) =>
      key.endsWith('/node_modules/dompurify')
    ),
    declared: text(field(field(manifest, 'devDependencies'), 'dompurify'))
  }
}

test('bundles the sanitizer the lockfile pins, at the declared release', () => {
  const rendererDirectory = path.join(ROOT, 'out', 'renderer')
  const scripts = readdirSync(rendererDirectory, { encoding: 'utf8', recursive: true }).filter(
    (file) => file.endsWith('.js')
  )
  // Every copy keeps its licence header in the built script, version included
  const bundled = scripts.flatMap((file) =>
    readFileSync(path.join(rendererDirectory, file), 'utf8')
      .matchAll(/@license DOMPurify (\S+)/g)
      .map((match) => ({ file, version: match[1] }))
      .toArray()
  )
  const { locked, nested, declared } = sanitizerPins()
  const copies = bundled.map(({ file, version }) => `${String(version)} (${file})`).join(', ')
  process.stdout.write(
    `e2e sanitizer: scripts ${String(scripts.length)}; bundled ${copies || 'none'}; ` +
      `lockfile ${locked ?? 'none'}; nested ${String(nested.length)}; package.json ${declared ?? 'none'}\n`
  )
  // Every leg is read, so one failing run shows them all
  expect.soft(bundled.length, 'bundled copies').toBeGreaterThan(0)
  expect.soft([...new Set(bundled.map(({ version }) => version))]).toEqual([locked])
  expect.soft(nested, 'nested lockfile copies').toEqual([])
  expect.soft(declared, 'package.json devDependencies.dompurify').toBeDefined()
  // The last leg: a hard check reads the same and ends the test either way
  expect(
    isCaretMatch(locked ?? '', declared ?? ''),
    `${String(locked)} satisfies ${String(declared)}`
  ).toBe(true)
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
