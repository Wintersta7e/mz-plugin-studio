// The template dialog: what it does with field text the template's own checks would refuse.
import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent, { type UserEvent } from '@testing-library/user-event'
import { TemplateInserter } from '../../src/renderer/src/components/plugin/TemplateInserter'
import {
  getAllTemplates,
  getTemplate,
  getTemplateDefaults
} from '../../src/renderer/src/lib/generator/templates'
import { getClassMethods } from '../../src/renderer/src/lib/generator/class-registry'
import { resetStores } from './support/reset-stores'

const HOSTILE_NAME = 'x = 0; globalThis.__pwn = 1; this.y'

const writeText = vi.fn<Clipboard['writeText']>()

function setUp(): void {
  resetStores()
  writeText.mockReset()
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
}

function first<T>(values: readonly T[]): T {
  const value = values.at(0)
  if (value === undefined) throw new Error('expected an item')
  return value
}

// The dialog, searched down to the Custom Actor Property template.
function searchPropertyTemplate(onInsert: (code: string) => void): void {
  render(<TemplateInserter open onClose={vi.fn<() => void>()} onInsert={onInsert} />)
  fireEvent.change(screen.getByPlaceholderText(/search/i), {
    target: { value: 'Custom Actor Property' }
  })
}

function openPropertyTemplate(onInsert: (code: string) => void, propertyName: string): void {
  searchPropertyTemplate(onInsert)
  fireEvent.click(screen.getByText('Custom Actor Property'))
  fireEvent.change(screen.getByLabelText(/Property Name/), { target: { value: propertyName } })
}

const preview = (): string =>
  screen.queryByText((_content, element) => element?.tagName === 'CODE')?.textContent ?? ''
const copyButton = (): HTMLElement => screen.getByRole('button', { name: /Copy/ })
const insertButton = (): HTMLElement => screen.getByRole('button', { name: /Insert Code/ })

// Timeouts at three times the test's slowest CI time under coverage, rounded up to the next 5 s.
// Two property names typed key by key, each keystroke re-rendering the dialog and its preview.
const TYPED_NAMES_TIMEOUT_MS = 15_000
// Two class pickers and a method picker opened, each listing its options in the full dialog.
const CLASS_PICKERS_TIMEOUT_MS = 20_000

describe('template dialog', () => {
  beforeEach(setUp)

  it('refuses to insert or copy a property name that is not an identifier', async () => {
    expect.hasAssertions()

    const onInsert = vi.fn<(code: string) => void>()
    openPropertyTemplate(onInsert, HOSTILE_NAME)

    expect(screen.getByText(/must be a valid JavaScript identifier/)).toBeInTheDocument()
    expect(preview()).not.toContain(HOSTILE_NAME)
    expect([
      copyButton().hasAttribute('disabled'),
      insertButton().hasAttribute('disabled')
    ]).toStrictEqual([true, true])

    fireEvent.click(copyButton())
    fireEvent.click(insertButton())
    fireEvent.keyDown(document, { key: 'Enter', ctrlKey: true })
    await Promise.resolve()

    expect([writeText.mock.calls.length, onInsert.mock.calls.length]).toStrictEqual([0, 0])
  })

  it('a template card keeps its favourite button outside the select button', () => {
    searchPropertyTemplate(vi.fn<(code: string) => void>())

    expect(screen.getByText('Custom Actor Property')).toBeInTheDocument()

    // Every element on the page is tested, whatever its role or visibility
    const nested = screen.queryAllByText(
      (_content, element) => element?.matches('button button') === true
    )
    process.stdout.write(`nested buttons ${String(nested.length)}\n`)

    expect(nested).toHaveLength(0)
  })

  it('the favourite button names its template and does not select the card', () => {
    searchPropertyTemplate(vi.fn<(code: string) => void>())
    fireEvent.click(screen.getByRole('button', { name: 'Add Custom Actor Property to favorites' }))

    expect(
      screen.getByRole('button', { name: 'Remove Custom Actor Property from favorites' })
    ).toBeInTheDocument()
    expect(screen.queryByLabelText(/Property Name/)).not.toBeInTheDocument()
  })

  it('inserts and copies a property name that passes the checks', async () => {
    expect.hasAssertions()

    const onInsert = vi.fn<(code: string) => void>()
    openPropertyTemplate(onInsert, 'loyalty')

    expect(preview()).toContain('loyalty')

    fireEvent.click(copyButton())
    await waitFor(() => {
      expect(writeText).toHaveBeenCalledTimes(1)
    })

    expect(first(first(writeText.mock.calls))).toContain('loyalty')

    fireEvent.click(insertButton())

    expect(onInsert).toHaveBeenCalledTimes(1)
    expect(first(first(onInsert.mock.calls))).toContain('loyalty')
  })
})

const SE_ID = 'audio-se-player'

function renderInserter(): {
  onClose: Mock<() => void>
  onInsert: Mock<(code: string) => void>
  unmount: () => void
} {
  const onClose = vi.fn<() => void>()
  const onInsert = vi.fn<(code: string) => void>()
  const { unmount } = render(<TemplateInserter open onClose={onClose} onInsert={onInsert} />)
  return { onClose, onInsert, unmount }
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

async function setFilename(user: UserEvent): Promise<void> {
  const field = screen.getByLabelText(/SE Filename/)
  await user.clear(field)
  await user.type(field, 'Cursor9')
}

const listedTemplate = (): HTMLElement | null =>
  screen.queryByRole('button', { name: /^Sound Effect Player/ })

function soundEffectTemplate(): NonNullable<ReturnType<typeof getTemplate>> {
  const template = getTemplate(SE_ID)
  if (template === undefined) throw new Error('sound effect template is missing')
  return template
}

// vitest/max-expects counts every expect outside a test against one module-wide budget of 5,
// so each helper below makes one equality of its checks.
function expectInvalidProperty(): void {
  const message = 'Property Name must be a valid JavaScript identifier (letters, numbers, _, $)'

  expect({
    error: screen.queryByText(message) !== null,
    injectedText: document.body.textContent.includes('__pwn'),
    insertDisabled: insertButton().matches(':disabled'),
    copyDisabled: copyButton().matches(':disabled')
  }).toStrictEqual({ error: true, injectedText: false, insertDisabled: true, copyDisabled: true })
}

// The button's description is the text of the element its aria-describedby names.
function expectRequiredProperty(errors: HTMLElement): void {
  const text = errors.textContent

  expect({
    heading: text.includes('Fix these fields to see the code:'),
    required: text.includes('Field "Property Name" is required'),
    description: insertButton().getAttribute('aria-describedby'),
    exact: /^Fix these fields to see the code:\s*Field "Property Name" is required$/.test(text)
  }).toStrictEqual({ heading: true, required: true, description: errors.id, exact: true })
}

function expectInvalidPropertyDescription(errors: HTMLElement, message: string): void {
  const text = errors.textContent

  expect({
    message: text.includes(message),
    required: text.includes('is required'),
    insertDisabled: insertButton().matches(':disabled'),
    description: insertButton().getAttribute('aria-describedby')
  }).toStrictEqual({ message: true, required: false, insertDisabled: true, description: errors.id })
}

// A button has no description without aria-describedby or a title.
function expectValidProperty(errors: HTMLElement): void {
  expect({
    empty: errors.textContent === '',
    insertDisabled: insertButton().matches(':disabled'),
    hasDescription: insertButton().hasAttribute('aria-describedby'),
    hasTitle: insertButton().hasAttribute('title')
  }).toStrictEqual({ empty: true, insertDisabled: false, hasDescription: false, hasTitle: false })
}

describe('template dialog actions: search', () => {
  beforeEach(setUp)

  it('opens with the registry count, nothing to insert and a prompt in the preview', async () => {
    expect.hasAssertions()

    renderInserter()

    const count = getAllTemplates().length

    expect(screen.getByText(`${String(count)} templates available`)).toBeInTheDocument()
    expect(insertButton()).toBeDisabled()
    expect(
      screen.getByText('// Select a template to preview the generated code')
    ).toBeInTheDocument()

    await searchBox()
  })

  it('search lists matching templates and nothing for a query no template matches', async () => {
    expect.hasAssertions()

    const user = userEvent.setup()
    renderInserter()
    const search = await searchBox()
    await user.type(search, 'Sound Effect')

    expect(listedTemplate()).toBeInTheDocument()

    await user.clear(search)
    await user.type(search, 'qqzzxx')

    expect(listedTemplate()).not.toBeInTheDocument()
    expect(screen.getByText('No templates found')).toBeInTheDocument()
  })
})

describe('template dialog actions: insertion and dismissal', () => {
  beforeEach(setUp)

  it('inserts the code the template generates from the edited fields, then closes', async () => {
    expect.hasAssertions()

    const user = userEvent.setup()
    const { onClose, onInsert } = renderInserter()
    await pickSoundEffect(user)
    await setFilename(user)
    await user.click(insertButton())

    expect(onInsert).toHaveBeenCalledTimes(1)

    const code = first(first(onInsert.mock.calls))

    expect(code).toContain('Cursor9')
    expect(code).toBe(
      soundEffectTemplate().generate({ ...getTemplateDefaults(SE_ID), filename: 'Cursor9' })
    )
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('cancel and a click on the backdrop close it; a click inside the panel does not', async () => {
    expect.hasAssertions()

    const user = userEvent.setup()
    const { onClose, onInsert } = renderInserter()
    await searchBox()
    await user.click(screen.getByText('Code Templates'))

    expect(onClose).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(onClose).toHaveBeenCalledTimes(1)

    // The backdrop has no role or name: it is the element the dialog renders outermost.
    await user.click(
      screen.getByText(
        (_content, element) =>
          element?.classList.contains('fixed') === true && element.classList.contains('inset-0')
      )
    )

    expect(onClose).toHaveBeenCalledTimes(2)
    expect(onInsert).not.toHaveBeenCalled()
  })

  it('escape closes it; Ctrl+Enter inserts the picked template and closes', async () => {
    expect.hasAssertions()

    const user = userEvent.setup()
    const { onClose, onInsert } = renderInserter()
    await searchBox()
    await user.keyboard('{Escape}')

    expect(onClose).toHaveBeenCalledTimes(1)
    expect(onInsert).not.toHaveBeenCalled()

    await pickSoundEffect(user)
    await setFilename(user)
    await user.keyboard('{Control>}{Enter}{/Control}')

    expect(onInsert).toHaveBeenCalledTimes(1)
    expect(first(first(onInsert.mock.calls))).toContain('Cursor9')
    expect(onClose).toHaveBeenCalledTimes(2)
  })
})

describe('template dialog actions: favorites and recent', () => {
  beforeEach(setUp)

  it('a starred template is listed under Favorites, also after the dialog is opened again', async () => {
    expect.hasAssertions()

    const user = userEvent.setup()
    const { unmount } = renderInserter()
    await user.type(await searchBox(), 'Sound Effect')
    await user.click(screen.getByRole('button', { name: 'Add Sound Effect Player to favorites' }))
    await user.click(screen.getByRole('button', { name: /^Favorites/ }))

    expect(listedTemplate()).toBeInTheDocument()
    expect(localStorage.getItem('mz-plugin-studio-templates')).toContain(SE_ID)

    unmount()
    renderInserter()
    await searchBox()
    await user.click(screen.getByRole('button', { name: /^Favorites/ }))

    expect(listedTemplate()).toBeInTheDocument()
  })

  it('an inserted template is listed under Recent', async () => {
    expect.hasAssertions()

    const user = userEvent.setup()
    renderInserter()
    await pickSoundEffect(user)
    await setFilename(user)
    await user.click(insertButton())
    await user.click(screen.getByRole('button', { name: /^Recent/ }))

    expect(listedTemplate()).toBeInTheDocument()
  })
})

describe('template dialog actions: clipboard and category', () => {
  beforeEach(setUp)

  it('copy puts on the clipboard the code Insert would insert', async () => {
    expect.hasAssertions()

    const user = userEvent.setup()
    const { onInsert } = renderInserter()
    await pickSoundEffect(user)
    await setFilename(user)
    await user.click(copyButton())

    const copiedButton = await screen.findByRole('button', { name: 'Copied' })

    expect(copiedButton).toBeInTheDocument()

    const copied = await navigator.clipboard.readText()

    await user.click(insertButton())

    expect(copied).toContain('Cursor9')
    expect(copied).toBe(first(first(onInsert.mock.calls)))
  })

  it('opens again on the category chosen last', async () => {
    expect.hasAssertions()

    const user = userEvent.setup()
    const { unmount } = renderInserter()
    await searchBox()
    await user.click(screen.getByRole('button', { name: /^Scene Hooks/ }))

    expect(screen.getByPlaceholderText('Search scene hooks templates...')).toBeInTheDocument()

    unmount()
    renderInserter()

    expect(screen.getByPlaceholderText('Search scene hooks templates...')).toBeInTheDocument()

    await searchBox()
  })
})

describe('template dialog actions: validation', () => {
  beforeEach(setUp)

  it(
    'a property name fixed in place clears the error and inserts the fixed code',
    async () => {
      expect.hasAssertions()

      const user = userEvent.setup()
      const { onInsert } = renderInserter()
      await user.type(await searchBox(), 'Custom Actor Property')
      await user.click(screen.getByRole('button', { name: /^Custom Actor Property/ }))
      const field = screen.getByLabelText(/Property Name/)
      await user.clear(field)
      await user.type(field, HOSTILE_NAME)

      expectInvalidProperty()

      await user.clear(field)
      await user.type(field, 'loyalty')

      expect(screen.queryByText('Fix these fields to see the code:')).not.toBeInTheDocument()

      await user.click(insertButton())

      expect(onInsert).toHaveBeenCalledTimes(1)
      expect(first(first(onInsert.mock.calls))).toContain('loyalty')
      expect(first(first(onInsert.mock.calls))).not.toContain('__pwn')

      const injected: unknown = Reflect.get(globalThis, '__pwn')

      expect(injected).toBeUndefined()
    },
    TYPED_NAMES_TIMEOUT_MS
  )

  it('announces the field errors and gives them as the disabled Insert button’s description', async () => {
    expect.hasAssertions()

    const user = userEvent.setup()
    renderInserter()
    // The region is on the page before an error appears, so a screen reader announces the change.
    const errors = screen.getByRole('status')

    expect(errors).toBeEmptyDOMElement()

    await user.type(await searchBox(), 'Custom Actor Property')
    await user.click(screen.getByRole('button', { name: /^Custom Actor Property/ }))

    expectRequiredProperty(errors)

    const field = screen.getByLabelText(/Property Name/)
    await user.type(field, '1st')
    const message = 'Property Name must be a valid JavaScript identifier (letters, numbers, _, $)'

    expectInvalidPropertyDescription(errors, message)

    await user.clear(field)
    await user.type(field, 'loyalty')

    expectValidProperty(errors)
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
  beforeEach(setUp)

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
