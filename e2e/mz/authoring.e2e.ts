// Authoring through the packaged app: the twin opens the MZ project's copy and, for each template
// category, creates a plugin, inserts one template of that category from the inserter and saves
// it into the copy. Each saved file is moved out of the copy, where every later boot of the run
// can install it as a case; the run judges those cases with every other one.
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs'
import path from 'node:path'
import {
  CATEGORIES,
  getAllTemplates,
  getTemplateDefaults,
  getTemplatesByCategory,
  validateTemplateValues,
  type CodeTemplate,
  type TemplateCategory
} from '../../src/renderer/src/lib/generator/templates/index'
import { newPlugin, openProject, pluginsDirectory, projectTitle, save } from '../fixtures/app'
import { authoredCases, authoredDirectory } from './cases'
import { expect, test } from './fixtures'

/**
The template the test inserts for `category`: its first whose defaults the inserter accepts and
whose name, searched for, matches no other template's name or description.
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
    return isUnique && validateTemplateValues(template.id, getTemplateDefaults(template.id)).valid
  })
  if (found === undefined) {
    throw new Error(`no template of ${category} has valid defaults and a name only it matches`)
  }
  return found
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
      await dialog.getByTestId('template-insert').click()
      await expect(page.getByTestId('template-insert')).toHaveCount(0)
      await save(page)

      const saved = path.join(pluginsDirectory(mz.copy), fileName)
      await expect.poll(() => existsSync(saved), { message: fileName }).toBe(true)
      const [firstLine = ''] = template.generate(getTemplateDefaults(template.id)).split('\n', 1)
      expect(readFileSync(saved, 'utf8'), template.id).toContain(firstLine.trim())
      copyFileSync(saved, path.join(kept, fileName))
      rmSync(saved)
    }

    const authored = authoredCases().length
    mz.print(`authoring: categories ${String(authored)}/${String(CATEGORIES.length)}`)

    expect(authored).toBe(CATEGORIES.length)
  })
})
