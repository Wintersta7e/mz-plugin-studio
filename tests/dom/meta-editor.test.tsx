// The meta tab: generating help text over text already there asks first, the plugin name of a
// plugin loaded from a file cannot be changed, and each field is written into the plugin code.
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent, { type UserEvent } from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MetaEditor } from '../../src/renderer/src/components/plugin/MetaEditor'
import { CodePreview } from '../../src/renderer/src/components/preview/CodePreview'
import { usePluginStore, useUIStore } from '../../src/renderer/src/stores'
import { createEmptyPlugin } from '../../src/renderer/src/types/plugin'
import { createFakeApi } from '../helpers/fake-api'
import { resetStores } from './support/reset-stores'

const HELP = 'Help written by hand'

/** Clicks Auto-generate with the message dialog answering `answer`; returns the dialog mock. */
function generateAnswering(answer: number) {
  const message = vi.fn(async () => answer)
  window.api = createFakeApi({ dialog: { message } })
  render(<MetaEditor />)
  fireEvent.click(screen.getByTitle('Auto-generate help text from plugin metadata'))
  return message
}

describe('meta editor help text', () => {
  beforeEach(() => {
    resetStores()
    act(() => {
      usePluginStore.getState().openPlugin(createEmptyPlugin())
      usePluginStore.getState().updateMeta({ help: HELP })
    })
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('replacing help text asks with Cancel as the default', async () => {
    const confirm = vi.spyOn(window, 'confirm')
    const message = generateAnswering(0)
    await waitFor(() => expect(message).toHaveBeenCalledTimes(1))

    expect(message).toHaveBeenCalledWith({
      type: 'question',
      title: 'Replace help text',
      message: 'This will replace the existing help text. Continue?',
      buttons: ['Cancel', 'Replace']
    })

    await act(async () => {})

    expect(usePluginStore.getState().plugin.meta.help).toBe(HELP)
    expect(confirm).not.toHaveBeenCalled()
  })

  it('choosing Replace replaces the help text', async () => {
    generateAnswering(1)
    await waitFor(() => expect(usePluginStore.getState().plugin.meta.help).not.toBe(HELP))
  })
})

describe('meta editor plugin name', () => {
  const NAME_NOTICE =
    "Loaded from Loaded.js: the name is the file name. Export in the preview can write a copy under another file name, but if the plugin's code names itself, the copy's commands and parameters may not work in a game; Export asks first when they would not."

  beforeEach(() => {
    resetStores()
    window.api = createFakeApi()
  })

  afterEach(() => {
    cleanup()
  })

  it('is read-only for a plugin loaded from a file, raw mode on or off', () => {
    const plugin = { ...createEmptyPlugin(), importedFrom: 'Loaded.js' }
    act(() => usePluginStore.getState().openPlugin(plugin))
    const { rerender } = render(<MetaEditor />)
    const notice =
      'Loaded from Loaded.js: the plugin name is the file name, so it cannot be changed here.'

    expect(screen.getByLabelText('Plugin Name')).toHaveAttribute('readonly')
    expect(screen.getByLabelText('Plugin Name')).toHaveAttribute('title', notice)

    act(() => useUIStore.getState().setRawModeForPlugin(plugin.id, false))
    rerender(<MetaEditor />)

    expect(screen.getByLabelText('Plugin Name')).toHaveAttribute('readonly')
    expect(screen.getByLabelText('Plugin Name')).toHaveAttribute('title', notice)
  })

  it('says under the name of a plugin loaded from a file why it cannot change', () => {
    act(() =>
      usePluginStore.getState().openPlugin({ ...createEmptyPlugin(), importedFrom: 'Loaded.js' })
    )
    render(<MetaEditor />)

    expect(screen.getByText(NAME_NOTICE)).toBeInTheDocument()
  })

  it('is editable for a plugin made in the app', () => {
    act(() => usePluginStore.getState().openPlugin(createEmptyPlugin()))
    render(<MetaEditor />)

    expect(screen.queryByText(NAME_NOTICE)).toBeNull()

    const name = screen.getByLabelText('Plugin Name')

    expect(name).not.toHaveAttribute('readonly')

    fireEvent.change(name, { target: { value: 'Renamed' } })

    expect(usePluginStore.getState().plugin.meta.name).toBe('Renamed')
  })
})

describe('meta editor fields in the plugin code', () => {
  beforeEach(() => {
    resetStores()
    window.api = createFakeApi()
    act(() => usePluginStore.getState().openPlugin(createEmptyPlugin()))
  })

  afterEach(() => {
    cleanup()
  })

  /** The generated plugin code the preview shows. */
  const preview = (): string => (screen.getByTestId('monaco-editor') as HTMLTextAreaElement).value

  function renderWithPreview(): UserEvent {
    const user = userEvent.setup()
    render(
      <>
        <MetaEditor />
        <CodePreview />
      </>
    )
    return user
  }

  async function retype(user: UserEvent, field: HTMLElement, text: string): Promise<void> {
    await user.clear(field)
    await user.type(field, text)
  }

  it('writes the typed name, author and URL into the plugin code', async () => {
    const user = renderWithPreview()
    await retype(user, screen.getByLabelText('Plugin Name'), 'Alpha')
    await retype(user, screen.getByLabelText('Version'), '2.1.0')
    await retype(user, screen.getByLabelText('Author'), 'Sample Author')
    await retype(user, screen.getByLabelText('URL'), 'https://example.com/alpha')

    expect(screen.getByLabelText('Version')).toHaveValue('2.1.0')

    await waitFor(() => {
      expect(preview()).toContain(' * @author Sample Author\n')
      expect(preview()).toContain(' * @url https://example.com/alpha\n')
      expect(preview()).toContain("const PLUGIN_NAME = 'Alpha';")
    })
  })

  it('writes the Japanese description into a block of its own', async () => {
    const user = renderWithPreview()
    await user.click(screen.getByRole('tab', { name: 'Japanese' }))
    await user.type(await screen.findByLabelText('Description (Japanese)'), 'Sample text')
    await waitFor(() => expect(preview()).toContain('/*:ja\n * @plugindesc Sample text\n'))
  })

  it.each([
    ['Dependencies (one per line)', '@base'],
    ['Order After (one per line)', '@orderAfter'],
    ['Order Before (one per line)', '@orderBefore'],
    ['Required Assets (one per line)', '@requiredAssets']
  ])('writes one %s line per entered line', async (label, tag) => {
    const user = renderWithPreview()
    await user.click(screen.getByLabelText(label))
    await user.paste('Alpha\nBeta')
    await waitFor(() => expect(preview()).toContain(` * ${tag} Alpha\n * ${tag} Beta\n`))
  })

  it.each([
    ['Dependencies (one per line)', '@base'],
    ['Order After (one per line)', '@orderAfter'],
    ['Order Before (one per line)', '@orderBefore'],
    ['Required Assets (one per line)', '@requiredAssets']
  ])('keeps an Enter typed at the end of %s', async (label, tag) => {
    const user = renderWithPreview()
    await user.type(screen.getByLabelText(label), 'Alpha{Enter}Beta')

    expect(screen.getByLabelText(label)).toHaveValue('Alpha\nBeta')

    await waitFor(() => expect(preview()).toContain(` * ${tag} Alpha\n * ${tag} Beta\n`))
  })

  it('shows the dependencies of the plugin opened after an Enter was typed', async () => {
    const user = renderWithPreview()
    await user.type(screen.getByLabelText('Dependencies (one per line)'), 'Alpha{Enter}')

    expect(screen.getByLabelText('Dependencies (one per line)')).toHaveValue('Alpha\n')

    const beta = createEmptyPlugin()
    act(() =>
      usePluginStore
        .getState()
        .openPlugin({ ...beta, meta: { ...beta.meta, dependencies: ['Beta'] } })
    )

    expect(screen.getByLabelText('Dependencies (one per line)')).toHaveValue('Beta')
  })
})
