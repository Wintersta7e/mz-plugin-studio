// The Code tab: what is typed reaches the plugin code, a template is inserted where the editor
// says, and the tab's completion provider lives as long as the tab.
import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent, { type UserEvent } from '@testing-library/user-event'
import { CodeEditor } from '../../src/renderer/src/components/plugin/CodeEditor'
import { CodePreview } from '../../src/renderer/src/components/preview/CodePreview'
import { getTemplate, getTemplateDefaults } from '../../src/renderer/src/lib/generator/templates'
import { usePluginStore } from '../../src/renderer/src/stores'
import { createEmptyPlugin } from '../../src/renderer/src/types/plugin'
import { monacoStub } from '../setup/monaco-stub'
import { resetStores } from './support/reset-stores'

const SE_ID = 'audio-se-player'
const seCode = (): string => {
  const template = getTemplate(SE_ID)
  if (template === undefined) throw new Error(`no template ${SE_ID}`)
  return template.generate({ ...getTemplateDefaults(SE_ID), filename: 'Cursor9' })
}
const SE_CODE = seCode()

// The editor stub at a position on the screen; the tab's editor renders before the preview's
const editorAt = (index: number): HTMLTextAreaElement => {
  const element = screen.getAllByTestId('monaco-editor').at(index)
  if (!(element instanceof HTMLTextAreaElement))
    throw new TypeError(`no editor at ${String(index)}`)
  return element
}
const editor = (): HTMLTextAreaElement => editorAt(0)
const preview = (): string => editorAt(1).value

function openCodeTab(customCode = ''): UserEvent {
  usePluginStore.getState().openPlugin({ ...createEmptyPlugin(), customCode })
  const user = userEvent.setup()
  render(
    <>
      <CodeEditor />
      <CodePreview />
    </>
  )
  return user
}

// Inserts the Sound Effect Player template playing Cursor9; the dialog closes.
const insertSoundEffect = async (user: UserEvent): Promise<void> => {
  await user.click(screen.getByRole('button', { name: /Insert Template/ }))
  // The dialog moves focus to its search box shortly after it opens
  const search = screen.getByPlaceholderText(/search/i)
  await waitFor(() => {
    expect(search).toHaveFocus()
  })
  await user.type(search, 'Sound Effect')
  await user.click(screen.getByRole('button', { name: /^Sound Effect Player/ }))
  await user.type(screen.getByLabelText(/SE Filename/), 'Cursor9')
  await user.click(screen.getByRole('button', { name: /Insert Code/ }))

  expect(screen.queryByText('Code Templates')).not.toBeInTheDocument()
}

describe('code tab', () => {
  beforeEach(resetStores)

  it('writes typed code into the plugin code', async () => {
    expect.hasAssertions()

    const user = openCodeTab()
    await user.type(editor(), '// mine')
    await waitFor(() => {
      expect(preview()).toContain('// mine')
    })
  })

  it('fills an empty editor with the inserted template', async () => {
    expect.hasAssertions()

    const user = openCodeTab()
    await insertSoundEffect(user)

    expect(editor()).toHaveValue(SE_CODE)
  })

  it('appends the template after a blank line to code already there', async () => {
    expect.hasAssertions()

    const user = openCodeTab('const a = 1;')
    await insertSoundEffect(user)

    expect(editor()).toHaveValue('const a = 1;\n\n' + SE_CODE)
  })

  it('replaces the selected code with the template', async () => {
    expect.hasAssertions()

    const user = openCodeTab('const a = 1;\nconst b = 2;')
    // Drag across the whole second line
    await user.pointer([
      { target: editor(), offset: 13, keys: '[MouseLeft>]' },
      { offset: 25 },
      { keys: '[/MouseLeft]' }
    ])
    await insertSoundEffect(user)

    expect(editor()).toHaveValue('const a = 1;\n' + SE_CODE)
  })

  it('registers one completion provider while the tab is shown', () => {
    const { unmount } = render(<CodeEditor />)

    expect(monacoStub.providers).toStrictEqual([{ language: 'javascript', disposed: false }])

    unmount()

    expect(monacoStub.providers).toStrictEqual([{ language: 'javascript', disposed: true }])
  })
})
