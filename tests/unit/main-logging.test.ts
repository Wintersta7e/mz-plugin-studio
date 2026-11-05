// Main starts electron-log without the script it would otherwise load into every page: that
// script asks main for its options while the page is still loading, before main can tell which
// page is asking, and the request is refused. The app's preload carries the page's log lines.
import { describe, it, expect, vi } from 'vitest'
import log from 'electron-log/main'

vi.mock<Record<'app' | 'ipcMain', unknown>>(import('electron'), () => ({
  // The app never becomes ready, so only what the entry runs on import is exercised
  app: {
    whenReady: vi
      .fn<() => Promise<undefined>>()
      .mockReturnValue(Promise.withResolvers<undefined>().promise),
    on: vi.fn<() => void>()
  },
  ipcMain: { handle: vi.fn<() => void>(), on: vi.fn<() => void>() }
}))
vi.mock<Record<'electronApp' | 'optimizer' | 'is', unknown>>(
  import('@electron-toolkit/utils'),
  () => ({
    electronApp: {},
    optimizer: {},
    is: { dev: false }
  })
)

describe('main entry logging', () => {
  it('initialises electron-log once, without its page script', async () => {
    expect.hasAssertions()

    await import('../../src/main/index')

    expect(vi.mocked(log.initialize).mock.calls).toStrictEqual([[{ preload: false }]])
  })
})
