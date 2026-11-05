// The template dialog: what it does with field text the template's own checks would refuse.
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent, { type UserEvent } from '@testing-library/user-event'
import { TemplateInserter } from '../../src/renderer/src/components/plugin/TemplateInserter'
import {
  getAllTemplates,
  getTemplate,
  getTemplateDefaults,
  validateTemplateValues,
  type CodeTemplate
} from '../../src/renderer/src/lib/generator/templates'
import { getClassMethods } from '../../src/renderer/src/lib/generator/class-registry'
import { resetStores } from './support/reset-stores'

const HOSTILE_NAME = 'x = 0; globalThis.__pwn = 1; this.y'

let writeText: ReturnType<typeof vi.fn>

beforeEach(() => {
  resetStores()
  writeText = vi.fn()
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
})

function openPropertyTemplate(onInsert: (code: string) => void, propertyName: string): void {
  render(<TemplateInserter open onClose={vi.fn()} onInsert={onInsert} />)
  fireEvent.change(screen.getByPlaceholderText(/search/i), {
    target: { value: 'Custom Actor Property' }
  })
  fireEvent.click(screen.getByText('Custom Actor Property'))
  fireEvent.change(screen.getByLabelText(/Property Name/), { target: { value: propertyName } })
}

const preview = (): string => document.querySelector('code')?.textContent ?? ''
const copyButton = (): HTMLElement => screen.getByRole('button', { name: /Copy/ })
const insertButton = (): HTMLElement => screen.getByRole('button', { name: /Insert Code/ })

// Timeouts at three times the test's slowest CI time under coverage, rounded up to the next 5 s.
// Two property names typed key by key, each keystroke re-rendering the dialog and its preview.
const TYPED_NAMES_TIMEOUT_MS = 15_000
// Two class pickers and a method picker opened, each listing its options in the full dialog.
const CLASS_PICKERS_TIMEOUT_MS = 20_000

describe('template dialog', () => {
  it('refuses to insert or copy a property name that is not an identifier', async () => {
    const onInsert = vi.fn()
    openPropertyTemplate(onInsert, HOSTILE_NAME)

    expect(screen.getByText(/must be a valid JavaScript identifier/)).toBeInTheDocument()
    expect(preview()).not.toContain(HOSTILE_NAME)
    expect(copyButton()).toBeDisabled()
    expect(insertButton()).toBeDisabled()

    fireEvent.click(copyButton())
    fireEvent.click(insertButton())
    fireEvent.keyDown(document, { key: 'Enter', ctrlKey: true })
    await Promise.resolve()

    expect(writeText).not.toHaveBeenCalled()
    expect(onInsert).not.toHaveBeenCalled()
  })

  it('a template card keeps its favourite button outside the select button', () => {
    const { baseElement } = render(<TemplateInserter open onClose={vi.fn()} onInsert={vi.fn()} />)
    fireEvent.change(screen.getByPlaceholderText(/search/i), {
      target: { value: 'Custom Actor Property' }
    })

    expect(screen.getByText('Custom Actor Property')).toBeInTheDocument()

    const nested = baseElement.querySelectorAll('button button')
    console.log(`nested buttons ${nested.length}`)

    expect(nested).toHaveLength(0)
  })

  it('the favourite button names its template and does not select the card', () => {
    render(<TemplateInserter open onClose={vi.fn()} onInsert={vi.fn()} />)
    fireEvent.change(screen.getByPlaceholderText(/search/i), {
      target: { value: 'Custom Actor Property' }
    })
    fireEvent.click(screen.getByRole('button', { name: 'Add Custom Actor Property to favorites' }))

    expect(
      screen.getByRole('button', { name: 'Remove Custom Actor Property from favorites' })
    ).toBeInTheDocument()
    expect(screen.queryByLabelText(/Property Name/)).not.toBeInTheDocument()
  })

  it('inserts and copies a property name that passes the checks', async () => {
    const onInsert = vi.fn()
    openPropertyTemplate(onInsert, 'loyalty')

    expect(preview()).toContain('loyalty')

    fireEvent.click(copyButton())
    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1))

    expect(writeText.mock.calls[0][0]).toContain('loyalty')

    fireEvent.click(insertButton())

    expect(onInsert).toHaveBeenCalledTimes(1)
    expect(onInsert.mock.calls[0][0]).toContain('loyalty')
  })
})

const SE_ID = 'audio-se-player'

function renderInserter(): {
  onClose: ReturnType<typeof vi.fn>
  onInsert: ReturnType<typeof vi.fn>
} {
  const onClose = vi.fn()
  const onInsert = vi.fn()
  render(<TemplateInserter open onClose={onClose} onInsert={onInsert} />)
  return { onClose, onInsert }
}

// The dialog moves focus to its search box shortly after it opens; typing before that would
// lose keys to the move.
async function searchBox(): Promise<HTMLElement> {
  const search = screen.getByPlaceholderText(/search/i)
  await waitFor(() => expect(search).toHaveFocus())
  return search
}

async function pickSoundEffect(user: UserEvent): Promise<void> {
  await user.type(await searchBox(), 'Sound Effect')
  await user.click(screen.getByRole('button', { name: /^Sound Effect Player/ }))
}

async function setFilename(user: UserEvent, filename: string): Promise<void> {
  const field = screen.getByLabelText(/SE Filename/)
  await user.clear(field)
  await user.type(field, filename)
}

const listedTemplate = (name: string): HTMLElement | null =>
  screen.queryByRole('button', { name: new RegExp(`^${name}`) })

describe('template dialog actions', () => {
  it('opens with the registry count, nothing to insert and a prompt in the preview', async () => {
    renderInserter()

    expect(screen.getByText(`${getAllTemplates().length} templates available`)).toBeInTheDocument()
    expect(insertButton()).toBeDisabled()
    expect(
      screen.getByText('// Select a template to preview the generated code')
    ).toBeInTheDocument()

    await searchBox()
  })

  it('search lists matching templates and nothing for a query no template matches', async () => {
    const user = userEvent.setup()
    renderInserter()
    const search = await searchBox()
    await user.type(search, 'Sound Effect')

    expect(listedTemplate('Sound Effect Player')).toBeInTheDocument()

    await user.clear(search)
    await user.type(search, 'qqzzxx')

    expect(listedTemplate('Sound Effect Player')).not.toBeInTheDocument()
    expect(screen.getByText('No templates found')).toBeInTheDocument()
  })

  it('inserts the code the template generates from the edited fields, then closes', async () => {
    const user = userEvent.setup()
    const { onClose, onInsert } = renderInserter()
    await pickSoundEffect(user)
    await setFilename(user, 'Cursor9')
    await user.click(insertButton())

    expect(onInsert).toHaveBeenCalledTimes(1)

    const code = onInsert.mock.calls[0][0] as string

    expect(code).toContain('Cursor9')
    expect(code).toBe(
      getTemplate(SE_ID)!.generate({ ...getTemplateDefaults(SE_ID), filename: 'Cursor9' })
    )
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('Cancel and a click on the backdrop close it; a click inside the panel does not', async () => {
    const user = userEvent.setup()
    const { onClose, onInsert } = renderInserter()
    await searchBox()
    await user.click(screen.getByText('Code Templates'))

    expect(onClose).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(onClose).toHaveBeenCalledTimes(1)

    // The backdrop has no role or name: it is the element the dialog renders outermost.
    await user.click(document.body.firstElementChild!.firstElementChild!)

    expect(onClose).toHaveBeenCalledTimes(2)
    expect(onInsert).not.toHaveBeenCalled()
  })

  it('Escape closes it; Ctrl+Enter inserts the picked template and closes', async () => {
    const user = userEvent.setup()
    const { onClose, onInsert } = renderInserter()
    await searchBox()
    await user.keyboard('{Escape}')

    expect(onClose).toHaveBeenCalledTimes(1)
    expect(onInsert).not.toHaveBeenCalled()

    await pickSoundEffect(user)
    await setFilename(user, 'Cursor9')
    await user.keyboard('{Control>}{Enter}{/Control}')

    expect(onInsert).toHaveBeenCalledTimes(1)
    expect(onInsert.mock.calls[0][0]).toContain('Cursor9')
    expect(onClose).toHaveBeenCalledTimes(2)
  })

  it('a starred template is listed under Favorites, also after the dialog is opened again', async () => {
    const user = userEvent.setup()
    const { unmount } = render(<TemplateInserter open onClose={vi.fn()} onInsert={vi.fn()} />)
    await user.type(await searchBox(), 'Sound Effect')
    await user.click(screen.getByRole('button', { name: 'Add Sound Effect Player to favorites' }))
    await user.click(screen.getByRole('button', { name: /^Favorites/ }))

    expect(listedTemplate('Sound Effect Player')).toBeInTheDocument()
    expect(localStorage.getItem('mz-plugin-studio-templates')).toContain(SE_ID)

    unmount()
    renderInserter()
    await searchBox()
    await user.click(screen.getByRole('button', { name: /^Favorites/ }))

    expect(listedTemplate('Sound Effect Player')).toBeInTheDocument()
  })

  it('an inserted template is listed under Recent', async () => {
    const user = userEvent.setup()
    renderInserter()
    await pickSoundEffect(user)
    await setFilename(user, 'Cursor9')
    await user.click(insertButton())
    await user.click(screen.getByRole('button', { name: /^Recent/ }))

    expect(listedTemplate('Sound Effect Player')).toBeInTheDocument()
  })

  it('Copy puts on the clipboard the code Insert would insert', async () => {
    const user = userEvent.setup()
    const { onInsert } = renderInserter()
    await pickSoundEffect(user)
    await setFilename(user, 'Cursor9')
    await user.click(copyButton())

    expect(await screen.findByRole('button', { name: 'Copied' })).toBeInTheDocument()

    const copied = await navigator.clipboard.readText()

    await user.click(insertButton())

    expect(copied).toContain('Cursor9')
    expect(copied).toBe(onInsert.mock.calls[0][0])
  })

  it('opens again on the category chosen last', async () => {
    const user = userEvent.setup()
    const { unmount } = render(<TemplateInserter open onClose={vi.fn()} onInsert={vi.fn()} />)
    await searchBox()
    await user.click(screen.getByRole('button', { name: /^Scene Hooks/ }))

    expect(screen.getByPlaceholderText('Search scene hooks templates...')).toBeInTheDocument()

    unmount()
    renderInserter()

    expect(screen.getByPlaceholderText('Search scene hooks templates...')).toBeInTheDocument()

    await searchBox()
  })

  it(
    'a property name fixed in place clears the error and inserts the fixed code',
    async () => {
      const user = userEvent.setup()
      const { onInsert } = renderInserter()
      await user.type(await searchBox(), 'Custom Actor Property')
      await user.click(screen.getByRole('button', { name: /^Custom Actor Property/ }))
      const field = screen.getByLabelText(/Property Name/)
      await user.clear(field)
      await user.type(field, HOSTILE_NAME)

      expect(
        screen.getByText(
          'Property Name must be a valid JavaScript identifier (letters, numbers, _, $)'
        )
      ).toBeInTheDocument()
      expect(document.body.textContent).not.toContain('__pwn')
      expect(insertButton()).toBeDisabled()
      expect(copyButton()).toBeDisabled()

      await user.clear(field)
      await user.type(field, 'loyalty')

      expect(screen.queryByText('Fix these fields to see the code:')).not.toBeInTheDocument()

      await user.click(insertButton())

      expect(onInsert).toHaveBeenCalledTimes(1)
      expect(onInsert.mock.calls[0][0]).toContain('loyalty')
      expect(onInsert.mock.calls[0][0]).not.toContain('__pwn')
      expect((globalThis as Record<string, unknown>).__pwn).toBeUndefined()
    },
    TYPED_NAMES_TIMEOUT_MS
  )

  it('announces the field errors and gives them as the disabled Insert button’s description', async () => {
    const user = userEvent.setup()
    renderInserter()
    // The region is on the page before an error appears, so a screen reader announces the change.
    const errors = screen.getByRole('status')

    expect(errors).toBeEmptyDOMElement()

    await user.type(await searchBox(), 'Custom Actor Property')
    await user.click(screen.getByRole('button', { name: /^Custom Actor Property/ }))

    expect(errors).toHaveTextContent('Fix these fields to see the code:')
    expect(errors).toHaveTextContent('Field "Property Name" is required')
    expect(insertButton()).toHaveAccessibleDescription(
      /^Fix these fields to see the code:\s*Field "Property Name" is required$/
    )

    const field = screen.getByLabelText(/Property Name/)
    await user.type(field, '1st')
    const message = 'Property Name must be a valid JavaScript identifier (letters, numbers, _, $)'

    expect(errors).toHaveTextContent(message)
    expect(errors).not.toHaveTextContent('is required')
    expect(insertButton()).toBeDisabled()
    expect(insertButton()).toHaveAccessibleDescription(expect.stringContaining(message))

    await user.clear(field)
    await user.type(field, 'loyalty')

    expect(errors).toBeEmptyDOMElement()
    expect(insertButton()).toBeEnabled()
    expect(insertButton()).not.toHaveAccessibleDescription()
  })
})

// A line holding code and then a comment
const hasTrailingComment = (line: string): boolean => {
  const start = line.indexOf('//')
  return start > 0 && line.slice(0, start).trim() !== ''
}

const defaultCode = (id: string): string => getTemplate(id)?.generate(getTemplateDefaults(id)) ?? ''

// The first template whose code from its defaults has a comment after the code on one line
function trailingCommentTemplate(): CodeTemplate {
  const found = getAllTemplates().find(
    (template) =>
      validateTemplateValues(template.id, getTemplateDefaults(template.id)).valid &&
      defaultCode(template.id)
        .split('\n')
        .some((line) => hasTrailingComment(line))
  )
  if (found === undefined) throw new Error('no template writes a comment after code')
  return found
}

// The preview shows each line of code in a row of its own, an empty line as a space
const shownCode = (code: string): string =>
  code
    .split('\n')
    .map((line) => (line === '' ? ' ' : line))
    .join('')

describe('template dialog preview', () => {
  it('shows each line of the code in the order it is written', () => {
    const template = trailingCommentTemplate()
    renderInserter()
    fireEvent.change(screen.getByPlaceholderText(/search/i), { target: { value: template.name } })
    fireEvent.click(screen.getByText(template.name))

    expect(preview()).toBe(shownCode(defaultCode(template.id)))
  })
})

const byText = (a: string, b: string): number => a.localeCompare(b)

const methodLabels = (className: string): string[] =>
  getClassMethods(className).map((method) => `${method.name}(${method.params.join(', ')})`)

const combobox = (text: string): HTMLElement => {
  const found = screen.getAllByRole('combobox').find((box) => box.textContent === text)
  if (found === undefined) throw new Error(`no combobox reads ${text}`)
  return found
}

// Opens the select that shows `shown` and picks the option named `name`.
async function choose(user: UserEvent, shown: string, name: string): Promise<void> {
  await user.click(combobox(shown))
  await user.click(await screen.findByRole('option', { name }))
}

describe('template dialog class and method fields', () => {
  it(
    'lists the picked class’s methods and clears the method when the class changes',
    async () => {
      expect.hasAssertions()

      const user = userEvent.setup()
      renderInserter()
      await user.type(await searchBox(), 'Alias Method')
      await user.click(screen.getByRole('button', { name: /^Alias Method/ }))
      await choose(user, 'Select a class...', 'Game_Actor')
      await user.click(combobox('Select a method...'))
      const options = await screen.findAllByRole('option')
      const listed = options.map((option) => option.textContent)

      expect(listed.toSorted(byText)).toStrictEqual(methodLabels('Game_Actor').toSorted(byText))

      await user.click(screen.getByRole('option', { name: /^levelUp\(/ }))

      expect(preview()).toContain('Game_Actor.prototype.levelUp = function')

      await choose(user, 'Game_Actor', 'Game_Party')

      expect(combobox('Select a method...')).toBeEnabled()
      expect(screen.getByRole('status')).toHaveTextContent('Field "Method" is required')
    },
    CLASS_PICKERS_TIMEOUT_MS
  )
})
