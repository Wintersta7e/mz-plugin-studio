// Links the page opens in a new window: only http and https reach the system browser, the
// window itself is always denied, and a browser that fails to open is logged, never left as
// an unhandled rejection in the main process.
import log from 'electron-log/main'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createWindowOpenHandler } from '../../src/main/window-open'

/** Lets every pending promise reaction and the next macrotask run. */
const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0))

describe('window open handler', () => {
  const unhandled = vi.fn()

  beforeEach(() => {
    vi.mocked(log.warn).mockClear()
    unhandled.mockClear()
    process.on('unhandledRejection', unhandled)
  })

  afterEach(() => {
    process.off('unhandledRejection', unhandled)
  })

  it('denies the window and logs a link the system browser could not open', async () => {
    const failure = new Error('no handler for this link')
    // A plain function, not vi.fn: a mock subscribes to the promise it returns, which would
    // mark the rejection handled and hide a missing catch.
    const opened: string[] = []
    const handler = createWindowOpenHandler((url) => {
      opened.push(url)
      return Promise.reject(failure)
    })

    expect(handler({ url: 'https://example.invalid/a' })).toEqual({ action: 'deny' })
    await flush()

    expect(opened).toEqual(['https://example.invalid/a'])
    expect(log.warn).toHaveBeenCalledTimes(1)
    expect(log.warn).toHaveBeenCalledWith('[window-open] Could not open link', failure)
    expect(unhandled).not.toHaveBeenCalled()
  })

  it.each(['https://example.invalid/a', 'http://example.invalid/'])(
    'opens %s in the system browser',
    async (url) => {
      const openExternal = vi.fn(() => Promise.resolve())
      expect(createWindowOpenHandler(openExternal)({ url })).toEqual({ action: 'deny' })
      await flush()
      expect(openExternal).toHaveBeenCalledTimes(1)
      expect(openExternal).toHaveBeenCalledWith(url)
      expect(log.warn).not.toHaveBeenCalled()
    }
  )

  it.each(['file:///x', 'javascript:alert(1)', 'not a url'])('never opens %s', async (url) => {
    const openExternal = vi.fn(() => Promise.resolve())
    expect(createWindowOpenHandler(openExternal)({ url })).toEqual({ action: 'deny' })
    await flush()
    expect(openExternal).not.toHaveBeenCalled()
  })
})
