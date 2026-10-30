// The project data browser lists the open project's named game data by section, copies an
// entry's ID, and closes from its header.
import { act, cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ProjectBrowser } from '../../src/renderer/src/components/project/ProjectBrowser'
import { useProjectStore } from '../../src/renderer/src/stores'
import { createFakeApi, sampleProject } from '../helpers/fake-api'
import { resetStores } from './support/reset-stores'

/** The header's close button, the only button beside the panel title. */
const closeButton = (): HTMLElement =>
  within(
    screen.getByRole('heading', { name: 'Project Data' }).closest('.border-b') as HTMLElement
  ).getByRole('button')

/** Opens the sample project with two named switches, one unnamed, and one actor. */
function openProject(): void {
  const project = {
    ...sampleProject(),
    switches: [
      { id: 1, name: 'Door Open' },
      { id: 2, name: '' },
      { id: 3, name: 'Boss Beaten' }
    ],
    actors: [{ id: 1, name: 'Alpha', note: '' }]
  }
  act(() => {
    useProjectStore.getState().setProject(project)
    useProjectStore.getState().setAllGameData(project)
  })
}

describe('project data browser', () => {
  beforeEach(() => {
    resetStores()
    window.api = createFakeApi()
  })

  afterEach(cleanup)

  it('with no project open it says so, and its close button closes it', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<ProjectBrowser onClose={onClose} />)
    expect(screen.getByText('No project loaded')).toBeInTheDocument()
    await user.click(closeButton())
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('lists named entries under their section titles', async () => {
    const user = userEvent.setup()
    openProject()
    render(<ProjectBrowser onClose={() => {}} />)
    expect(screen.getByText('Sample Game')).toBeInTheDocument()
    const switches = screen.getByRole('button', { name: /^Switches/ })
    expect(switches).toHaveTextContent('Switches2')
    expect(screen.getByText('Door Open')).toBeInTheDocument()
    expect(screen.getByText('Boss Beaten')).toBeInTheDocument()
    expect(screen.queryByText('2:')).not.toBeInTheDocument()
    expect(screen.queryByText('Alpha')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /^Actors/ }))
    expect(screen.getByText('Alpha')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /^Variables/ }))
    expect(screen.getByText('No named variables')).toBeInTheDocument()
  })

  it('Copy ID puts the entry ID on the clipboard', async () => {
    const user = userEvent.setup()
    openProject()
    render(<ProjectBrowser onClose={() => {}} />)
    await user.click(screen.getByRole('button', { name: 'Copy ID 3' }))
    expect(await navigator.clipboard.readText()).toBe('3')
  })

  it('the close button closes it', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    openProject()
    render(<ProjectBrowser onClose={onClose} />)
    await user.click(closeButton())
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
