// Export from the code preview with no project open, and the banner above the code. Behind
// `window.api` sit the main-process save dialog and save-to-path functions, writing to a fresh
// temporary folder.
import { access, mkdtemp, readFile, rm, writeFile } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { SaveDialogOptions } from 'electron'
import { showSaveFileDialog } from '../../src/main/ipc/dialog'
import { savePluginToPath } from '../../src/main/ipc/plugin'
import { CodePreview } from '../../src/renderer/src/components/preview/CodePreview'
import { generateTypeDeclaration } from '../../src/renderer/src/lib/exportFormats'
import { generatePlugin } from '../../src/renderer/src/lib/generator'
import {
  usePluginStore,
  useProjectStore,
  useToastStore,
  useUIStore
} from '../../src/renderer/src/stores'
import { createEmptyPlugin } from '../../src/renderer/src/types/plugin'
import { loadFixture } from '../golden/corpus/raw-mode'
import { createFakeApi } from '../helpers/fake-api'
import { resetStores } from './support/reset-stores'

let tmp: string

beforeEach(async () => {
  resetStores()
  tmp = await mkdtemp(join(tmpdir(), 'code-preview-'))
  const plugin = createEmptyPlugin()
  usePluginStore.getState().openPlugin({ ...plugin, meta: { ...plugin.meta, name: 'Alpha' } })
})

afterEach(async () => {
  await rm(tmp, { recursive: true, force: true })
})

/** Wires `window.api` to the main-process save functions; `saveFile` answers `chosen`. */
function wireMainSave(chosen: string, { throughDialog = true } = {}): void {
  const dialog = {
    showSaveDialog: vi.fn(async (_options: SaveDialogOptions) => ({
      canceled: false,
      filePath: chosen
    }))
  }
  window.api = createFakeApi({
    dialog: {
      saveFile: throughDialog
        ? (options) => showSaveFileDialog(dialog, options ?? {})
        : vi.fn(async () => chosen)
    },
    plugin: { saveToPath: (filePath, content) => savePluginToPath(filePath, content) }
  })
}

const clickExport = (): void => {
  fireEvent.click(screen.getByRole('button', { name: 'Export' }))
}

const clickExportDts = (): void => {
  fireEvent.click(screen.getByTitle('Export in other formats'))
  fireEvent.click(screen.getByText('Export .d.ts'))
}

const errorToasts = (): string[] =>
  useToastStore
    .getState()
    .toasts.filter((t) => t.type === 'error')
    .map((t) => t.message)

describe('code preview export with no project', () => {
  it('writes the generated plugin to the path chosen in the save dialog', async () => {
    const target = join(tmp, 'Alpha.js')
    wireMainSave(target)
    render(<CodePreview />)
    clickExport()
    const expected = generatePlugin(usePluginStore.getState().plugin)
    await waitFor(async () => expect(await readFile(target, 'utf8')).toBe(expected))
  })

  it('writes the type declarations from the other formats menu', async () => {
    const target = join(tmp, 'Alpha.d.ts')
    wireMainSave(target)
    render(<CodePreview />)
    clickExportDts()
    const expected = generateTypeDeclaration(usePluginStore.getState().plugin)
    await waitFor(async () => expect(await readFile(target, 'utf8')).toBe(expected))
  })

  it('writes the plugin again on a second export to the same path', async () => {
    const target = join(tmp, 'Alpha.js')
    wireMainSave(target)
    render(<CodePreview />)
    const expected = generatePlugin(usePluginStore.getState().plugin)
    clickExport()
    await waitFor(async () => expect(await readFile(target, 'utf8')).toBe(expected))
    await writeFile(target, 'stale')
    clickExport()
    await waitFor(async () => expect(await readFile(target, 'utf8')).toBe(expected))
    expect(errorToasts()).toEqual([])
  })

  it('shows an error and writes nothing when the chosen file type cannot be saved', async () => {
    const target = join(tmp, 'Alpha.exe')
    wireMainSave(target)
    render(<CodePreview />)
    clickExport()
    await waitFor(() => expect(errorToasts()).toHaveLength(1))
    expect(errorToasts()[0]).toMatch(/^Export failed: /)
    await expect(access(target)).rejects.toMatchObject({ code: 'ENOENT' })
  })

  it.each([
    ['Export', 'Alpha.js', clickExport],
    ['Export .d.ts', 'Alpha.d.ts', clickExportDts]
  ])(
    '%s shows an error and writes nothing for a path no save dialog returned',
    async (_label, name, click) => {
      const target = join(tmp, name)
      wireMainSave(target, { throughDialog: false })
      render(<CodePreview />)
      click()
      await waitFor(() =>
        expect(errorToasts()).toEqual([
          `Export failed: Access denied: ${target} was not chosen in a save dialog`
        ])
      )
      await expect(access(target)).rejects.toMatchObject({ code: 'ENOENT' })
    }
  )
})

describe('code preview banner', () => {
  const FILE = 'Fixture_HandWritten.js'
  const RELOAD = 'Reload from project'

  /** Opens `file` as an imported tab, without its file text unless `withSource`. */
  function openImported(file: string, { withSource }: { withSource: boolean }): void {
    const { rawSource, ...rest } = loadFixture(file)
    usePluginStore
      .getState()
      .openPlugin({ ...rest, importedFrom: file, ...(withSource && { rawSource }) })
  }

  /** The banner holding `text`. */
  const bannerOf = async (text: string): Promise<HTMLElement> =>
    (await screen.findByText(text)).parentElement as HTMLElement

  const missingText = `This plugin's file text (${FILE}) is not loaded — plugins opened in an older version of the app did not keep it. Open its project and click Reload from project to restore it. Until then, raw mode cannot save it.`

  it('names the remedy as a warning when the file text is not loaded', async () => {
    window.api = createFakeApi()
    useProjectStore.setState({ project: await window.api.project.load('/fixture/mz-project') })
    openImported(FILE, { withSource: false })
    render(<CodePreview />)
    const banner = await bannerOf(missingText)
    expect(banner).toHaveClass('bg-yellow-500/10', 'text-yellow-500')
    expect(banner).not.toHaveClass('text-destructive')
    const button = screen.getByRole('button', { name: RELOAD })
    expect(button).toBeEnabled()
    expect(button).not.toHaveAttribute('title')
  })

  it('without a project the reload button is disabled and says why', async () => {
    window.api = createFakeApi()
    openImported(FILE, { withSource: false })
    render(<CodePreview />)
    await bannerOf(missingText)
    const button = screen.getByRole('button', { name: RELOAD })
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('title', 'Open the project first.')
  })

  it('offers the reload when the file text is loaded but the file as last read is not', async () => {
    window.api = createFakeApi()
    useProjectStore.setState({ project: await window.api.project.load('/fixture/mz-project') })
    openImported(FILE, { withSource: true })
    usePluginStore.setState({ baselineByPluginId: {} })
    render(<CodePreview />)
    expect(await screen.findByRole('button', { name: RELOAD })).toBeEnabled()
    const banner = await bannerOf(
      `The app's copy of ${FILE} as it was last read is missing, so raw mode cannot tell what changed. Open its project and click Reload from project to restore it. Until then, raw mode cannot save it.`
    )
    expect(banner).not.toHaveClass('text-destructive')
  })

  it('shows no reload banner with raw mode off', async () => {
    window.api = createFakeApi()
    openImported(FILE, { withSource: false })
    useUIStore.getState().setRawModeForPlugin(usePluginStore.getState().plugin.id, false)
    render(<CodePreview />)
    await screen.findByText('Generated Code')
    expect(screen.queryByText(missingText)).toBeNull()
    expect(screen.queryByRole('button', { name: RELOAD })).toBeNull()
  })

  it('shows a save that raw mode refuses as an error', async () => {
    window.api = createFakeApi()
    openImported('Fixture_NoBlock.js', { withSource: true })
    render(<CodePreview />)
    act(() => usePluginStore.getState().updateMeta({ description: 'Edited description' }))
    const banner = await bannerOf(
      'Header changes cannot be saved: Fixture_NoBlock.js has no main annotation block (/*: or /*:en). Undo the header changes, or turn raw mode off to save regenerated code.'
    )
    expect(banner).toHaveClass('bg-destructive/10', 'text-destructive')
    expect(banner).not.toHaveClass('text-yellow-500')
    expect(screen.queryByRole('button', { name: RELOAD })).toBeNull()
  })
})
