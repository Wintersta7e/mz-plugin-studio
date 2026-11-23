// Authoring through the packaged app: the twin opens the MZ project's copy and, for each template
// category, creates a plugin, inserts one template of that category from the inserter and saves
// it into the copy. Each saved file is moved out of the copy, where every later boot of the run
// can install it as a case; the run judges those cases with every other one.
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs'
import path from 'node:path'
import type { Locator, Page } from '@playwright/test'
import {
  CATEGORIES,
  getAllTemplates,
  getTemplateDefaults,
  getTemplatesByCategory,
  validateTemplateValues,
  type CodeTemplate,
  type TemplateCategory,
  type TemplateField
} from '../../src/renderer/src/lib/generator/templates/index'
import { templateValues } from '../../tests/helpers/mz-conformance'
import { newPlugin, openProject, pluginsDirectory, projectTitle, save } from '../fixtures/app'
import { authoredCases, authoredDirectory } from './cases'
import { expect, test } from './fixtures'

/**
The template the test inserts for `category`: its first whose name, searched for, matches no
other template's name or description, and whose base values the template accepts.
*/
function searchedTemplate(category: TemplateCategory): CodeTemplate {
  const all = getAllTemplates()
  const found = getTemplatesByCategory(category).find((template) => {
    const name = template.name.toLowerCase()
    const isUnique = all.every(
      (other) =>
        other.id === template.id ||
        !(other.name.toLowerCase().includes(name) || other.description.toLowerCase().includes(name))
    )
    return isUnique && validateTemplateValues(template.id, templateValues(template.id)).valid
  })
  if (found === undefined) {
    throw new Error(`no template of ${category} has valid base values and a name only it matches`)
  }
  return found
}

/**
The fields the inserter refuses as the defaults leave them: each whose base value is not its
default, a switch aside.
*/
function fieldsToFill(template: CodeTemplate): TemplateField[] {
  const defaults = getTemplateDefaults(template.id)
  const base = templateValues(template.id)
  return template.fields.filter(
    (field) => field.type !== 'boolean' && base[field.id] !== defaults[field.id]
  )
}

const isTyped = (field: TemplateField): boolean => field.type === 'text' || field.type === 'number'

/**
The values the test types: the base values, with a command registered under the plugin's own
name, as the event calls it by that name.
*/
function typedValues(template: CodeTemplate, pluginName: string): Record<string, unknown> {
  const base = templateValues(template.id)
  return 'pluginName' in base ? { ...base, pluginName } : base
}

/**
Fills each field of `fieldsToFill`: a text or number field with its typed value, a picker with
the option the app lists first.
*/
async function fillFields(
  page: Page,
  dialog: Locator,
  template: CodeTemplate,
  pluginName: string
): Promise<void> {
  const base = typedValues(template, pluginName)
  for (const field of fieldsToFill(template)) {
    if (isTyped(field)) {
      await dialog.locator(`#${field.id}`).fill(String(base[field.id]))
      continue
    }
    await dialog.locator(`div:has(> label[for="${field.id}"])`).getByRole('combobox').click()
    await page.getByRole('option').first().click()
    await expect(page.getByRole('listbox')).toHaveCount(0)
  }
}

/**
The start of the first line the template inserts that no picker's choice changes: the whole
line under the base values, cut before the first base value of a picker it names.
*/
function insertedStart(template: CodeTemplate): string {
  const base = templateValues(template.id)
  const [line = ''] = template.generate(base).split('\n', 1)
  const lower = line.toLowerCase()
  const cuts = fieldsToFill(template)
    .filter((field) => !isTyped(field))
    .map((field) => lower.indexOf(String(base[field.id]).toLowerCase()))
    .filter((at) => at >= 0)
  return line.slice(0, Math.min(line.length, ...cuts)).trim()
}

/**
Declares in the Commands tab the command a template registers, so the header names what the
code registers.
*/
async function declareCommands(page: Page, template: CodeTemplate): Promise<void> {
  const base = templateValues(template.id)
  const commands = template.fields.filter(({ id }) => id === 'commandName')
  for (const field of commands) {
    await page.getByTestId('editor-tab-commands').click()
    await page.getByTestId('command-add').click()
    const name = page.getByRole('tabpanel').locator('input[id$="-name"]')
    await expect(name, 'command name inputs').toHaveCount(1)
    await name.fill(String(base[field.id]))
  }
}

const pluginNameOf = (category: TemplateCategory): string =>
  `Authored_${category.replaceAll('-', '_')}`

test.describe('authoring through the app', () => {
  test('saves one plugin per template category into the copy', async ({ mz, twin }) => {
    test.setTimeout(300_000)
    const { app, page } = twin
    const kept = authoredDirectory()
    rmSync(kept, { recursive: true, force: true })
    mkdirSync(kept, { recursive: true })

    await openProject(app, page, mz.copy, { expectLoaded: false })
    const title = projectTitle(mz.copy)
    const status = page.getByTestId('status-project')
    await expect
      .poll(
        async () => {
          const text = await status.textContent()
          return text?.includes(title) === true
        },
        { message: 'the copy opens in the app' }
      )
      .toBe(true)

    for (const { id: category } of CATEGORIES) {
      const template = searchedTemplate(category)
      const pluginName = pluginNameOf(category)
      const fileName = `${pluginName}.js`
      await newPlugin(page)
      await page.getByTestId('editor-tab-meta').click()
      await page.getByTestId('meta-name').fill(pluginName)
      await page.getByTestId('editor-tab-code').click()
      await page.getByTestId('template-inserter-open').click()
      const dialog = page.getByRole('dialog')
      await dialog.getByTestId(`template-category-${category}`).click()
      const search = dialog.getByRole('textbox')
      await expect(search, 'text boxes before a template is picked').toHaveCount(1)
      await search.fill(template.name)
      await expect(dialog.getByTestId('template-card'), template.id).toHaveCount(1)
      await dialog.getByTestId('template-card').click()
      await fillFields(page, dialog, template, pluginName)
      await dialog.getByTestId('template-insert').click()
      // Only an insert closes the dialog this way: the button stays disabled while a field is wrong
      await expect(page.getByTestId('template-insert')).toHaveCount(0)
      await declareCommands(page, template)
      await save(page)

      const saved = path.join(pluginsDirectory(mz.copy), fileName)
      await expect.poll(() => existsSync(saved), { message: fileName }).toBe(true)
      const start = insertedStart(template)
      expect(start, template.id).not.toBe('')
      expect(readFileSync(saved, 'utf8'), template.id).toContain(start)
      copyFileSync(saved, path.join(kept, fileName))
      rmSync(saved)
    }

    const authored = authoredCases().length
    mz.print(`authoring: categories ${String(authored)}/${String(CATEGORIES.length)}`)

    expect(authored).toBe(CATEGORIES.length)
  })
})
