// What a user or a file can put into the packaged app must stay data: odd project paths load or
// fail with a notice, text entered in Metadata or imported from a parameter file never runs as
// plugin code, and `plugin:save-to-path` writes only where a save dialog granted it.
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve, sep } from 'node:path'
import type { Page } from '@playwright/test'
import type { PersistedKey } from '../../src/renderer/src/stores/persist'
import { evaluatePlugin } from '../../tests/helpers/evaluate-plugin'
import { COMMENT_PAYLOADS, SENTINEL, type Payload } from '../../tests/helpers/hostile'
import {
  assertDialogsDrained,
  type AppWindow,
  expect,
  loadFixtureProject,
  openProject,
  pluginsDir,
  queueDialog,
  runRoot,
  save,
  settle,
  test
} from '../fixtures/app'

// The parameter file the previous release exported; one description holds `*/` and a line break
const MZPARAMS = join(process.cwd(), 'tests', 'fixtures', 'mzparams', 'v1.6.0.mzparams')

interface ParamFile {
  parameters: { name: string; desc: string }[]
}

const PLUGIN_KEY: PersistedKey = 'mz-plugin-studio-plugin'

/** How many parameters the active plugin has, as the app saved it for its next start */
async function paramCount(page: Page): Promise<number> {
  const raw = await page.evaluate((key) => localStorage.getItem(key), PLUGIN_KEY)
  if (raw === null) throw new Error(`nothing saved under ${PLUGIN_KEY}`)
  return (JSON.parse(raw) as { state: { plugin: { parameters: unknown[] } } }).state.plugin
    .parameters.length
}

/** The plugin name a payload's save uses, so no two saves share a file */
const pluginName = (payload: Payload): string => `Hostile_${payload.name.replace(/-/g, '_')}`

async function newPluginNamed(page: Page, name: string): Promise<void> {
  await page.getByTestId('new-plugin').click()
  await page.getByTestId('editor-tab-meta').click()
  await page.getByTestId('meta-name').fill(name)
}

/** Saves the active new plugin into the project and returns the text written */
async function saveNew(page: Page, project: string, name: string): Promise<string> {
  const target = join(pluginsDir(project), `${name}.js`)
  await save(page)
  await expect.poll(() => existsSync(target)).toBe(true)
  await settle(page)
  return readFileSync(target, 'utf8')
}

/** The payload reached the file as text, and running the file does not run it */
function expectInert(text: string, payload: Payload, filename: string): void {
  expect(text).toContain(`${SENTINEL} = 1`)
  const result = evaluatePlugin(text, { mode: 'generator', filename })
  expect(result.compileProblem).toBeNull()
  expect(result.threw).toBeNull()
  expect(result.sentinel).toBe(false)
  expect(text, payload.name).not.toContain(payload.text)
}

test('loads a two-dot folder name and reports a non-project folder', async ({ twin }) => {
  const { app, page, userDataDir } = twin
  await loadFixtureProject(app, page, 'My..Game')

  const empty = mkdtempSync(join(runRoot(), 'not-a-project-'))
  await openProject(app, page, empty, { expectLoaded: false })
  await expect(page.getByTestId('toast-viewport')).toContainText(empty)
  await settle(page)

  const log = join(userDataDir, 'logs', 'main.log')
  const lines = readFileSync(log, 'utf8').split('\n').filter(Boolean)
  expect(lines.length).toBeGreaterThan(0)
  expect(lines.filter((line) => /\[error\]/.test(line) && line.includes(empty))).toEqual([])
  await assertDialogsDrained(app)
})

test('keeps injected Metadata text out of the plugin code', async ({ twin }) => {
  const { app, page } = twin
  const project = await loadFixtureProject(app, page)

  for (const payload of COMMENT_PAYLOADS) {
    const name = pluginName(payload)
    await newPluginNamed(page, name)
    await page.getByTestId('meta-description').fill(payload.text)
    const text = await saveNew(page, project, name)
    expectInert(text, payload, `${name}.js`)
  }
  await assertDialogsDrained(app)
})

test('keeps injected parameter-file text out of the plugin code', async ({ twin }) => {
  const { app, page } = twin
  const project = await loadFixtureProject(app, page)
  const source = JSON.parse(readFileSync(MZPARAMS, 'utf8')) as ParamFile
  const hostile = source.parameters.find(({ desc }) => desc.includes('*/'))
  if (hostile === undefined) throw new Error(`no description holding */ in ${MZPARAMS}`)
  const dir = mkdtempSync(join(runRoot(), 'mzparams-'))

  for (const payload of COMMENT_PAYLOADS) {
    const file = join(dir, `${payload.name}.mzparams`)
    const built = {
      ...source,
      parameters: source.parameters.map((param) =>
        param === hostile ? { ...param, desc: payload.text } : param
      )
    }
    writeFileSync(file, JSON.stringify(built, null, 2))

    const name = pluginName(payload)
    await newPluginNamed(page, name)
    await page.getByTestId('editor-tab-parameters').click()
    // The import menu shows once the plugin has a parameter
    await page.getByTestId('param-add').click()
    await queueDialog(app, 'showOpenDialog', { canceled: false, filePaths: [file] })
    await page.getByTestId('param-menu').click()
    await page.getByTestId('param-import-file').click()
    // The import reads the file after the dialog answered: save once it has landed
    await expect.poll(() => paramCount(page)).toBe(1 + source.parameters.length)
    const text = await saveNew(page, project, name)
    // Every parameter of the file arrived after the added one, the hostile one among them
    const params = [...text.matchAll(/@param[ \t]+(\S+)/g)].map((match) => match[1])
    expect(params.slice(1)).toEqual(source.parameters.map((param) => param.name))
    // The file's cleared limits stay unset instead of reaching the header as null
    expect(text).not.toMatch(/@(?:min|max|decimals)[ \t]+null\b/)
    expectInert(text, payload, `${name}.js`)
  }
  await assertDialogsDrained(app)
})

test('writes by path only where the save dialog granted', async ({ twin }) => {
  const { app, page } = twin
  const project = await loadFixtureProject(app, page)
  const dir = mkdtempSync(join(runRoot(), 'by-path-'))
  const ungranted = join(dir, 'ungranted.js')
  // Kept unresolved: the guard sees the segments as the renderer sent them
  const outside = [project, 'js', 'plugins', '..', '..', '..', 'outside.json'].join(sep)
  const granted = join(dir, 'granted.js')
  const content = '// written by path\n'

  const attempt = (path: string): Promise<string> =>
    page.evaluate(
      ([path, content]) =>
        (window as unknown as AppWindow).api.plugin.saveToPath(path, content).then(
          (result) => (result.success ? 'written' : `refused: ${result.conflict}`),
          (error: unknown) => `rejected: ${String(error)}`
        ),
      [path, content] as const
    )

  expect(await attempt(ungranted)).toMatch(/^rejected: /)
  expect(existsSync(ungranted)).toBe(false)
  expect(await attempt(outside)).toMatch(/^rejected: /)
  expect(existsSync(resolve(outside))).toBe(false)

  await queueDialog(app, 'showSaveDialog', { canceled: false, filePath: granted })
  const chosen = await page.evaluate(() =>
    (window as unknown as AppWindow).api.dialog.saveFile({ defaultPath: 'granted.js' })
  )
  expect(chosen).toBe(granted)
  expect(await attempt(granted)).toBe('written')
  expect(readFileSync(granted, 'utf8')).toBe(content)
  process.stdout.write(`e2e by-path shapes: ${ungranted} | ${outside} | ${granted}\n`)
  await assertDialogsDrained(app)
})
