// Export from the code preview with no project open. Behind `window.api` sit the main-process
// save dialog and save-to-path functions, writing to a fresh temporary folder.
import { mkdtemp, readFile, rm } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { SaveDialogOptions } from 'electron'
import { showSaveFileDialog } from '../../src/main/ipc/dialog'
import { savePluginToPath } from '../../src/main/ipc/plugin'
import { CodePreview } from '../../src/renderer/src/components/preview/CodePreview'
import { generateTypeDeclaration } from '../../src/renderer/src/lib/exportFormats'
import { generatePluginOutput } from '../../src/renderer/src/lib/plugin-output'
import { usePluginStore } from '../../src/renderer/src/stores'
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

/** Wires `window.api` to the main-process save functions; the save dialog answers `chosen`. */
function wireMainSave(chosen: string): void {
  const dialog = {
    showSaveDialog: vi.fn(async (_options: SaveDialogOptions) => ({
      canceled: false,
      filePath: chosen
    }))
  }
  window.api = createFakeApi({
    dialog: { saveFile: (options) => showSaveFileDialog(dialog, options ?? {}) },
    plugin: { saveToPath: (filePath, content) => savePluginToPath(filePath, content) }
  })
}

describe('code preview export with no project', () => {
  it('writes the generated plugin to the path chosen in the save dialog', async () => {
    const target = join(tmp, 'Alpha.js')
    wireMainSave(target)
    render(<CodePreview />)
    fireEvent.click(screen.getByRole('button', { name: 'Export' }))
    const expected = generatePluginOutput(usePluginStore.getState().plugin, false)
    await waitFor(async () => expect(await readFile(target, 'utf8')).toBe(expected))
  })

  it('writes the type declarations from the other formats menu', async () => {
    const target = join(tmp, 'Alpha.d.ts')
    wireMainSave(target)
    render(<CodePreview />)
    fireEvent.click(screen.getByTitle('Export in other formats'))
    fireEvent.click(screen.getByText('Export .d.ts'))
    const expected = generateTypeDeclaration(usePluginStore.getState().plugin)
    await waitFor(async () => expect(await readFile(target, 'utf8')).toBe(expected))
  })
})
