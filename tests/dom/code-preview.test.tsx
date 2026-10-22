// Export from the code preview with no project open. Behind `window.api` sit the main-process
// save dialog and save-to-path functions, writing to a fresh temporary folder.
import { access, mkdtemp, readFile, rm, writeFile } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { SaveDialogOptions } from 'electron'
import { showSaveFileDialog } from '../../src/main/ipc/dialog'
import { savePluginToPath } from '../../src/main/ipc/plugin'
import { CodePreview } from '../../src/renderer/src/components/preview/CodePreview'
import { generateTypeDeclaration } from '../../src/renderer/src/lib/exportFormats'
import { generatePlugin } from '../../src/renderer/src/lib/generator'
import { usePluginStore, useToastStore } from '../../src/renderer/src/stores'
import { createEmptyPlugin } from '../../src/renderer/src/types/plugin'
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
