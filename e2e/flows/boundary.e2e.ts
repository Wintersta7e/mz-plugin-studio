// What a user or a file can put into the packaged app must stay data: odd project paths load or
// fail with a notice, text entered in Metadata or imported from a parameter file never runs as
// plugin code, `plugin:save-to-path` writes only where a save dialog granted it, and
// `plugin:read-by-path` reads only the open project's plugins or a file chosen in a dialog.
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import type { Page } from '@playwright/test'
import type { PersistedKey } from '../../src/renderer/src/stores/persist'
import { evaluatePlugin } from '../../tests/helpers/evaluate-plugin'
import { COMMENT_PAYLOADS, SENTINEL, type Payload } from '../../tests/helpers/hostile'
import {
  assertDialogsDrained,
  expect,
  field,
  isList,
  isRecord,
  loadFixtureProject,
  newPlugin,
  openProject,
  pluginsDirectory,
  queueDialog,
  runRoot,
  save,
  settle,
  test
} from '../fixtures/app'

// The parameter file the previous release exported; one description holds `*/` and a line break
const MZPARAMS = path.join(process.cwd(), 'tests', 'fixtures', 'mzparams', 'v1.6.0.mzparams')

interface Param {
  name: string
  desc: string
}

// Refused on the text alone, so no network lookup happens
const UNC_PATH =
  process.platform === 'win32'
    ? '\\\\fixture-host\\share\\js\\plugins\\Synthetic_Unc.js'
    : '//fixture-host/share/js/plugins/Synthetic_Unc.js'

const PLUGIN_KEY: PersistedKey = 'mz-plugin-studio-plugin'

/**
How many parameters the active plugin has, as the app saved it for its next start
*/
async function paramCount(page: Page): Promise<number> {
  const raw = await page.evaluate((key) => localStorage.getItem(key), PLUGIN_KEY)
  if (raw === null) throw new Error(`nothing saved under ${PLUGIN_KEY}`)
  const plugin = field(field(JSON.parse(raw), 'state'), 'plugin')
  const parameters = field(plugin, 'parameters')
  if (!isList(parameters)) throw new TypeError(`no parameter list saved under ${PLUGIN_KEY}`)
  return parameters.length
}

const isParam = (value: unknown): value is Param =>
  typeof field(value, 'name') === 'string' && typeof field(value, 'desc') === 'string'

/**
The parameter file as written, its parameters, and the one whose description ends a comment
*/
function readParamFile(file: string): {
  whole: Record<string, unknown>
  parameters: Param[]
  hostile: Param
} {
  const whole: unknown = JSON.parse(readFileSync(file, 'utf8'))
  const parameters = field(whole, 'parameters')
  if (!isRecord(whole) || !isList(parameters) || !parameters.every(isParam)) {
    throw new TypeError(`${file} is not a parameter file`)
  }
  const hostile = parameters.find(({ desc }) => desc.includes('*/'))
  if (hostile === undefined) throw new Error(`no description holding */ in ${file}`)
  return { whole, parameters, hostile }
}

/**
The plugin name a payload's save uses, so no two saves share a file
*/
const pluginName = (payload: Payload): string => `Hostile_${payload.name.replaceAll('-', '_')}`

async function newPluginNamed(page: Page, name: string): Promise<void> {
  await newPlugin(page)
  await page.getByTestId('editor-tab-meta').click()
  await page.getByTestId('meta-name').fill(name)
}

/**
Saves the active new plugin into the project and returns the text written
*/
async function saveNew(page: Page, project: string, name: string): Promise<string> {
  const target = path.join(pluginsDirectory(project), `${name}.js`)
  await save(page)
  await expect.poll(() => existsSync(target)).toBe(true)
  await settle(page)
  return readFileSync(target, 'utf8')
}

// What a payload that stayed data leaves: its text in the file, and a file that runs clean
const INERT = {
  written: true,
  compileProblem: 'none',
  threw: 'nothing',
  sentinel: false,
  holdsPayload: false
}

/**
Whether the payload reached the file as text, and what running the file does
*/
function inertness(
  text: string,
  payload: Payload,
  filename: string
): Record<keyof typeof INERT, unknown> {
  const { compileProblem, threw, sentinel } = evaluatePlugin(text, { mode: 'generator', filename })
  return {
    written: text.includes(`${SENTINEL} = 1`),
    compileProblem: compileProblem ?? 'none',
    threw: threw ?? 'nothing',
    sentinel,
    holdsPayload: text.includes(payload.text)
  }
}

test('loads a two-dot folder name and reports a non-project folder', async ({ twin }) => {
  const { app, page, userDataDir } = twin
  await loadFixtureProject(app, page, 'My..Game')

  const empty = mkdtempSync(path.join(runRoot(), 'not-a-project-'))
  await openProject(app, page, empty, { expectLoaded: false })
  await expect(page.getByTestId('toast-viewport')).toContainText(empty)
  await settle(page)

  const log = path.join(userDataDir, 'logs', 'main.log')
  const lines = readFileSync(log, 'utf8').split('\n').filter(Boolean)
  expect(lines.length).toBeGreaterThan(0)
  expect(lines.filter((line) => line.includes('[error]') && line.includes(empty))).toEqual([])
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
    expect(inertness(text, payload, `${name}.js`), payload.name).toStrictEqual(INERT)
  }
  await assertDialogsDrained(app)
})

test('keeps injected parameter-file text out of the plugin code', async ({ twin }) => {
  const { app, page } = twin
  const project = await loadFixtureProject(app, page)
  const { whole, parameters, hostile } = readParamFile(MZPARAMS)
  const directory = mkdtempSync(path.join(runRoot(), 'mzparams-'))

  for (const payload of COMMENT_PAYLOADS) {
    const file = path.join(directory, `${payload.name}.mzparams`)
    const built = {
      ...whole,
      parameters: parameters.map((param) =>
        param === hostile ? { ...param, desc: payload.text } : param
      )
    }
    writeFileSync(file, JSON.stringify(built, undefined, 2))

    const name = pluginName(payload)
    await newPluginNamed(page, name)
    await page.getByTestId('editor-tab-parameters').click()
    // The import menu shows once the plugin has a parameter
    await page.getByTestId('param-add').click()
    await queueDialog(app, 'showOpenDialog', { canceled: false, filePaths: [file] })
    await page.getByTestId('param-menu').click()
    await page.getByTestId('param-import-file').click()
    // The import reads the file after the dialog answered: save once it has landed
    await expect.poll(async () => paramCount(page)).toBe(1 + parameters.length)
    const text = await saveNew(page, project, name)
    // Every parameter of the file arrived after the added one, the hostile one among them
    const params = text
      .matchAll(/@param[ \t]+(\S+)/g)
      .map((match) => match[1])
      .toArray()
    expect(params.slice(1)).toEqual(parameters.map((param) => param.name))
    // The file's cleared limits stay unset instead of reaching the header as null
    expect(text).not.toMatch(/@(?:min|max|decimals)[ \t]+null\b/)
    expect(inertness(text, payload, `${name}.js`), payload.name).toStrictEqual(INERT)
  }
  await assertDialogsDrained(app)
})

test('writes by path only where the save dialog granted', async ({ twin }) => {
  const { app, page } = twin
  const project = await loadFixtureProject(app, page)
  const directory = mkdtempSync(path.join(runRoot(), 'by-path-'))
  const ungranted = path.join(directory, 'ungranted.js')
  // Kept unresolved: the guard sees the segments as the renderer sent them
  const outside = [project, 'js', 'plugins', '..', '..', '..', 'outside.json'].join(path.sep)
  const granted = path.join(directory, 'granted.js')
  const content = '// written by path\n'

  const attempt = async (target: string): Promise<string> =>
    page.evaluate(
      async ([target, content]) => {
        try {
          const result = await globalThis.api.plugin.saveToPath(target, content)
          return result.success ? 'written' : `refused: ${result.conflict}`
        } catch (error) {
          return `rejected: ${String(error)}`
        }
      },
      [target, content] as const
    )

  expect(await attempt(ungranted)).toMatch(/^rejected: /)
  expect(existsSync(ungranted)).toBe(false)
  expect(await attempt(outside)).toMatch(/^rejected: /)
  expect(existsSync(path.resolve(outside))).toBe(false)

  await queueDialog(app, 'showSaveDialog', { canceled: false, filePath: granted })
  const chosen = await page.evaluate(async () =>
    globalThis.api.dialog.saveFile({ defaultPath: 'granted.js' })
  )
  expect(chosen).toBe(granted)
  expect(await attempt(granted)).toBe('written')
  expect(readFileSync(granted, 'utf8')).toBe(content)
  process.stdout.write(`e2e by-path shapes: ${ungranted} | ${outside} | ${granted}\n`)
  await assertDialogsDrained(app)
})

test("reads by path only inside the project's plugins folder or from a chosen file", async ({
  twin
}) => {
  const { app, page } = twin
  const project = await loadFixtureProject(app, page)

  // The open project's own channels answer the window: the scan reads every plugin header
  const headers = await page.evaluate(
    async (project) => globalThis.api.plugin.scanHeaders(project),
    project
  )
  expect(headers.find((header) => header.filename === 'Fixture_Dependent.js')).toMatchObject({
    name: 'Fixture_Dependent',
    base: ['Fixture_HandWritten'],
    orderAfter: ['Fixture_HandWritten']
  })

  const inside = path.join(pluginsDirectory(project), 'Synthetic_Read.js')
  writeFileSync(inside, '// inside the plugins folder\n')
  const outsideDirectory = mkdtempSync(path.join(runRoot(), 'outside-'))
  const outside = path.join(outsideDirectory, 'Synthetic_Outside.js')
  writeFileSync(outside, '// outside the project\n')
  // Kept unresolved: the guard sees the segments as the renderer sent them
  const climbing = [project, 'js', 'plugins', '..', '..', '..', 'outside.json'].join(path.sep)
  writeFileSync(path.resolve(climbing), '{}\n')
  const unc = UNC_PATH

  const read = async (target: string): Promise<string> =>
    page.evaluate(async (target) => {
      try {
        return `read: ${await globalThis.api.plugin.readByPath(target)}`
      } catch (error) {
        return `rejected: ${String(error)}`
      }
    }, target)

  expect(await read(inside)).toBe('read: // inside the plugins folder\n')
  expect(await read(outside)).toMatch(/^rejected: .*Access denied/)
  expect(await read(climbing)).toMatch(/^rejected: /)
  expect(await read(unc)).toMatch(/^rejected: .*Access denied/)

  await queueDialog(app, 'showOpenDialog', { canceled: false, filePaths: [outside] })
  const chosen = await page.evaluate(async () =>
    globalThis.api.dialog.openFile({
      filters: [{ name: 'JavaScript', extensions: ['js'] }]
    })
  )
  expect(chosen).toBe(outside)
  expect(await read(outside)).toBe('read: // outside the project\n')
  process.stdout.write(`e2e by-path read shapes: ${inside} | ${outside} | ${climbing} | ${unc}\n`)
  await assertDialogsDrained(app)
})
