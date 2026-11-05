// The analysis view counts the open project's plugins, their method overrides and the methods
// two plugins override, and rescans on request.
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AnalysisView } from '../../src/renderer/src/components/analysis/AnalysisView'
import { useProjectStore } from '../../src/renderer/src/stores'
import type { ScannedPluginHeader } from '../../src/shared/ipc-types'
import { createFakeApi, sampleProject } from '../helpers/fake-api'
import { resetStores } from './support/reset-stores'

const header = (name: string, overrides: string[]): ScannedPluginHeader => ({
  filename: `${name}.js`,
  name,
  base: [],
  orderAfter: [],
  orderBefore: [],
  overrides
})

// The number shown under a label of the overview card: the digits that follow the label in the
// block holding both
const counter = (label: string): string => {
  const block = screen.getByText(
    (_content, element) => {
      const text = element?.textContent ?? ''
      return text.startsWith(label) && /^\d+$/.test(text.slice(label.length))
    },
    { selector: 'div' }
  )
  return block.textContent.slice(label.length)
}

describe('analysis view', () => {
  beforeEach(() => {
    resetStores()
    vi.stubGlobal('api', createFakeApi())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('with no project open it says so', () => {
    render(<AnalysisView />)

    expect(screen.getByText('No project loaded')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Plugin Analysis' })).not.toBeInTheDocument()
  })

  it('counts plugins, overrides and a method two plugins override, and Rescan scans again', async () => {
    expect.hasAssertions()

    const user = userEvent.setup()
    const scanHeaders = vi
      .fn<Window['api']['plugin']['scanHeaders']>()
      .mockResolvedValue([
        header('Alpha', ['Scene_Map.prototype.update']),
        header('Beta', ['Scene_Map.prototype.update'])
      ])
    vi.stubGlobal('api', createFakeApi({ plugin: { scanHeaders } }))
    act(() => {
      useProjectStore.getState().setProject(sampleProject())
    })
    await act(async () => useProjectStore.getState().scanDependencies())
    render(<AnalysisView />)

    expect(screen.getByRole('heading', { name: 'Plugin Analysis' })).toBeInTheDocument()
    expect([counter('Plugins'), counter('Overrides'), counter('Conflicts')]).toStrictEqual([
      '2',
      '2',
      '1'
    ])
    expect(scanHeaders).toHaveBeenCalledTimes(1)

    const rescan = screen.getByRole('button', { name: 'Rescan' })
    await user.click(rescan)
    await waitFor(() => {
      expect(rescan).toBeEnabled()
    })

    // Both scans read the open project's folder
    expect(scanHeaders.mock.calls).toStrictEqual([['/project'], ['/project']])
  })
})
