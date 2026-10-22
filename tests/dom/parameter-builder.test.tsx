// The parameter tab's Import menu (what a .mzparams file does once it is read in) and its Export
// button (where the selected parameters are written).
import { readFileSync } from 'fs'
import { access, mkdtemp, readFile, rm } from 'fs/promises'
import { tmpdir } from 'os'
import { join, resolve } from 'path'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import type { SaveDialogOptions } from 'electron'
import { showSaveFileDialog } from '../../src/main/ipc/dialog'
import { savePluginToPath } from '../../src/main/ipc/plugin'
import { ParameterBuilder } from '../../src/renderer/src/components/plugin/ParameterBuilder'
import { generatePlugin } from '../../src/renderer/src/lib/generator'
import { deserializeParams } from '../../src/renderer/src/lib/param-io'
import { usePluginStore, useSettingsStore } from '../../src/renderer/src/stores'
import { createEmptyParameter, createEmptyPlugin } from '../../src/renderer/src/types/plugin'
import { evaluatePlugin } from '../helpers/evaluate-plugin'
import { createFakeApi } from '../helpers/fake-api'
import { ALL_PAYLOADS } from '../helpers/hostile'
import { resetStores } from './support/reset-stores'

const fixtureText = (name: string): string =>
  readFileSync(resolve(process.cwd(), 'tests/fixtures/mzparams', name), 'utf8')

const parameterNames = (): string[] =>
  usePluginStore.getState().plugin.parameters.map((p) => p.name)

/** The plugin's parameter names at the moment each message was shown. */
const namesWhenShown: string[][] = []

// The Import menu sits in the toolbar, which shows once the plugin has a parameter.
beforeEach(() => {
  resetStores()
  namesWhenShown.length = 0
  const existing = { ...createEmptyParameter(), name: 'Existing' }
  usePluginStore.getState().openPlugin({ ...createEmptyPlugin(), parameters: [existing] })
})

/** Picks "From File (.mzparams)" with `text` as the chosen file; returns the dialog mock. */
function importFile(text: string): ReturnType<typeof vi.fn> {
  const message = vi.fn(async () => {
    namesWhenShown.push(parameterNames())
    return 0
  })
  window.api = createFakeApi({
    dialog: { openFile: vi.fn(async () => '/fixtures/in.mzparams'), message },
    plugin: { readByPath: vi.fn(async () => text) }
  })
  render(<ParameterBuilder />)
  fireEvent.keyDown(screen.getByRole('button', { name: 'Import' }), { key: 'Enter' })
  fireEvent.click(screen.getByText('From File (.mzparams)'))
  return message
}

describe('parameter import from a file', () => {
  it.each([
    ['not JSON', 'not json at all', 'This file could not be read: it is not valid JSON.'],
    [
      'without a version',
      fixtureText('invalid-missing-version.mzparams'),
      'This file is not an MZ Plugin Studio parameter file.'
    ],
    [
      'from a newer version',
      fixtureText('invalid-newer-version.mzparams'),
      'This file was made by a newer version of MZ Plugin Studio. Update the app to import it.'
    ]
  ])('says why it refuses a file %s', async (_label, text, expected) => {
    const message = importFile(text)
    await waitFor(() => expect(message).toHaveBeenCalledTimes(1))
    expect(message).toHaveBeenCalledWith({
      type: 'error',
      title: 'Import Failed',
      message: expected
    })
    expect(parameterNames()).toEqual(['Existing'])
  })

  it('adds the good parameters, then reports what it skipped and dropped', async () => {
    const file = JSON.parse(fixtureText('invalid-unknown-type.mzparams'))
    file.parameters[0].extra = 'not a parameter field'
    file.parameters.push(42)
    const message = importFile(JSON.stringify(file))
    await waitFor(() => expect(message).toHaveBeenCalledTimes(1))
    expect(message).toHaveBeenCalledWith({
      type: 'warning',
      title: 'Import Report',
      message:
        'Imported 1 parameter. Skipped 2: "Shape" (unknown type), item 3 (not a parameter). ' +
        'Dropped 1 field with the wrong type or an unknown name.'
    })
    expect(namesWhenShown).toEqual([['Existing', 'Label']])
  })

  it('keeps an imported description inside the plugin comment when the plugin runs', async () => {
    const payload = ALL_PAYLOADS.find((p) => p.name === 'comment-space')!
    const text = JSON.stringify({
      version: 1,
      source: 'Test',
      exportedAt: '2026-01-01T00:00:00.000Z',
      parameters: [
        { id: 'p', name: 'Label', text: 'Label', desc: payload.text, type: 'string', default: '' }
      ]
    })
    const message = importFile(text)
    await waitFor(() => expect(parameterNames()).toEqual(['Existing', 'Label']))
    expect(message).not.toHaveBeenCalled()
    const plugin = usePluginStore.getState().plugin
    expect(plugin.parameters[1].desc).toBe(payload.text)

    const result = evaluatePlugin(generatePlugin(plugin), { mode: 'generator' })
    expect(result.compileProblem).toBeNull()
    expect(result.threw).toBeNull()
    expect(result.sentinel).toBe(false)
  })
})

describe('parameter export to a file', () => {
  let tmp: string

  beforeEach(async () => {
    tmp = await mkdtemp(join(tmpdir(), 'param-export-'))
  })

  afterEach(async () => {
    await rm(tmp, { recursive: true, force: true })
  })

  /**
   * Exports every parameter through the main-process save functions; `saveFile` answers
   * `target`, through the save dialog or not. Returns the message dialog mock.
   */
  function exportTo(target: string, { throughDialog = true } = {}): ReturnType<typeof vi.fn> {
    const dialog = {
      showSaveDialog: vi.fn(async (_options: SaveDialogOptions) => ({
        canceled: false,
        filePath: target
      }))
    }
    const message = vi.fn(async () => 0)
    window.api = createFakeApi({
      dialog: {
        saveFile: throughDialog
          ? (options) => showSaveFileDialog(dialog, options ?? {})
          : vi.fn(async () => target),
        message
      },
      plugin: { saveToPath: (filePath, content) => savePluginToPath(filePath, content) }
    })
    render(<ParameterBuilder />)
    fireEvent.click(screen.getByRole('button', { name: 'Select All' }))
    fireEvent.click(screen.getByRole('button', { name: 'Export' }))
    return message
  }

  it('writes the selected parameters to the path chosen in the save dialog', async () => {
    const target = join(tmp, 'Alpha-params.mzparams')
    const message = exportTo(target)
    const written = await waitFor(() => readFile(target, 'utf8'))
    const result = deserializeParams(written)
    expect(result.success && result.parameters.map((p) => p.name)).toEqual(['Existing'])
    expect(message).not.toHaveBeenCalled()
  })

  it('says why and writes nothing for a path no save dialog returned', async () => {
    const target = join(tmp, 'Alpha-params.mzparams')
    const message = exportTo(target, { throughDialog: false })
    await waitFor(() => expect(message).toHaveBeenCalledTimes(1))
    expect(message).toHaveBeenCalledWith({
      type: 'error',
      title: 'Export Failed',
      message: `Access denied: ${target} was not chosen in a save dialog`
    })
    await expect(access(target)).rejects.toMatchObject({ code: 'ENOENT' })
  })
})

describe('parameter prompts that discard work', () => {
  /** Renders the tab with every parameter selected; the message dialog answers Cancel. */
  function renderSelected(): ReturnType<typeof vi.fn> {
    const message = vi.fn(async () => 0)
    window.api = createFakeApi({ dialog: { message } })
    render(<ParameterBuilder />)
    fireEvent.click(screen.getByRole('button', { name: 'Select All' }))
    return message
  }

  it('deleting the selected parameters asks without a default', async () => {
    const message = renderSelected()
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
    await waitFor(() => expect(message).toHaveBeenCalledTimes(1))
    const options = message.mock.calls[0][0]
    expect(options.buttons).toEqual(['Cancel', 'Delete'])
    expect(options).not.toHaveProperty('defaultId')
    expect(options).not.toHaveProperty('cancelId')
    expect(parameterNames()).toEqual(['Existing'])
  })

  it('overwriting a preset asks without a default', async () => {
    const kept = { ...createEmptyParameter(), name: 'Kept' }
    useSettingsStore.setState({ parameterPresets: { Mine: [kept] } })
    const message = renderSelected()
    fireEvent.keyDown(screen.getByRole('button', { name: 'Presets' }), { key: 'Enter' })
    fireEvent.click(screen.getByText('Save Selection as Preset...'))
    fireEvent.change(screen.getByLabelText('Preset Name'), { target: { value: 'Mine' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(message).toHaveBeenCalledTimes(1))
    const options = message.mock.calls[0][0]
    expect(options.buttons).toEqual(['Cancel', 'Overwrite'])
    expect(options).not.toHaveProperty('defaultId')
    expect(options).not.toHaveProperty('cancelId')
    expect(useSettingsStore.getState().parameterPresets).toEqual({ Mine: [kept] })
  })
})
