// The parameter tab's Import menu: what a .mzparams file does once it is read in.
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ParameterBuilder } from '../../src/renderer/src/components/plugin/ParameterBuilder'
import { generatePlugin } from '../../src/renderer/src/lib/generator'
import { usePluginStore } from '../../src/renderer/src/stores'
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
