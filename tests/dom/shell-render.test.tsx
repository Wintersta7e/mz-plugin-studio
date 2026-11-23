// What renders while you type: an edit re-renders the editor it changes, never the app's shell.
// The render counter goes first: React reads its hook once, when `react-dom` loads.
import { countRenders } from './support/render-counter'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../../src/renderer/src/App'
import { HISTORY_QUIET_MS, useHistoryStore } from '../../src/renderer/src/stores/history-store'
import { usePluginStore } from '../../src/renderer/src/stores/plugin-store'
import { createEmptyParameter, createEmptyPlugin } from '../../src/renderer/src/types/plugin'
import { unstubGlobals } from './support/load-persisted'
import { LOAD_PREVIEW_TIMEOUT_MS, loadPreview } from './support/load-preview'
import { resetStores } from './support/reset-stores'

// Each case renders the whole app, which takes seconds on a cold start
const APP_TIMEOUT = { timeout: 30_000 }

const SHELL = ['App', 'MainContent', 'PluginWorkspace'] as const

describe('renders while typing', APP_TIMEOUT, () => {
  beforeAll(loadPreview, LOAD_PREVIEW_TIMEOUT_MS)

  beforeEach(() => {
    resetStores()
    vi.stubGlobal('__APP_VERSION__', '0.0.0-test')
  })

  afterEach(unstubGlobals)

  it('one key typed into a parameter field renders no shell component and records one undo step', async () => {
    expect.hasAssertions()

    const plugin = { ...createEmptyPlugin(), parameters: [createEmptyParameter()] }
    usePluginStore.getState().openPlugin(plugin)
    render(<App />)
    const user = userEvent.setup()
    await user.click(screen.getByRole('tab', { name: 'Parameters' }))
    await user.click(screen.getByRole('button', { name: 'New Parameter' }))
    const field = screen.getByLabelText('Internal Name')
    await user.click(field)
    const stack = () => useHistoryStore.getState().stacks[plugin.id]?.past ?? []
    await waitFor(() => {
      expect(stack()).toHaveLength(1)
    })

    const { total, byName } = await countRenders(async () => {
      await user.keyboard('x')
    })
    const shell = Object.fromEntries(SHELL.map((name) => [name, byName.get(name) ?? 0]))

    expect(field).toHaveValue('NewParameterx')
    expect(total, 'components rendered by the key').toBeGreaterThan(0)
    expect(shell, `${String(total)} components rendered`).toStrictEqual({
      App: 0,
      MainContent: 0,
      PluginWorkspace: 0
    })

    await waitFor(
      () => {
        expect(stack().map((entry) => entry.parameters[0]?.name)).toStrictEqual([
          'NewParameter',
          'NewParameterx'
        ])
      },
      { timeout: HISTORY_QUIET_MS * 4 }
    )
  })
})
