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
const SE_CODE = getTemplate(SE_ID)!.generate({ ...getTemplateDefaults(SE_ID), filename: 'Cursor9' })

beforeEach(resetStores)

// The tab's editor renders before the preview's
const editor = (): HTMLTextAreaElement =>
  screen.getAllByTestId('monaco-editor')[0] as HTMLTextAreaElement
const preview = (): string =>
  (screen.getAllByTestId('monaco-editor')[1] as HTMLTextAreaElement).value

function renderTab(customCode = ''): UserEvent {
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

/** Inserts the Sound Effect Player template playing Cursor9; the dialog closes. */
async function insertSoundEffect(user: UserEvent): Promise<void> {
  await user.click(screen.getByRole('button', { name: /Insert Template/ }))
  // The dialog moves focus to its search box shortly after it opens
  const search = screen.getByPlaceholderText(/search/i)
  await waitFor(() => expect(search).toHaveFocus())
  await user.type(search, 'Sound Effect')
  await user.click(screen.getByRole('button', { name: /^Sound Effect Player/ }))
  await user.type(screen.getByLabelText(/SE Filename/), 'Cursor9')
  await user.click(screen.getByRole('button', { name: /Insert Code/ }))
  expect(screen.queryByText('Code Templates')).not.toBeInTheDocument()
}

describe('code tab', () => {
  it('writes typed code into the plugin code', async () => {
    const user = renderTab()
    await user.type(editor(), '// mine')
    await waitFor(() => expect(preview()).toContain('// mine'))
  })

  it('fills an empty editor with the inserted template', async () => {
    const user = renderTab()
    await insertSoundEffect(user)
    expect(editor()).toHaveValue(SE_CODE)
  })

  it('appends the template after a blank line to code already there', async () => {
    const user = renderTab('const a = 1;')
    await insertSoundEffect(user)
    expect(editor()).toHaveValue('const a = 1;\n\n' + SE_CODE)
  })

  it('replaces the selected code with the template', async () => {
    const user = renderTab('const a = 1;\nconst b = 2;')
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
    expect(monacoStub.providers).toEqual([{ language: 'javascript', disposed: false }])
    unmount()
    expect(monacoStub.providers).toEqual([{ language: 'javascript', disposed: true }])
  })
})
