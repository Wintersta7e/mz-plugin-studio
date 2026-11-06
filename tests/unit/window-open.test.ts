// Links the page opens in a new window: only http and https reach the system browser, the
// window itself is always denied, and a browser that fails to open is logged, never left as
// an unhandled rejection in the main process.
import log from 'electron-log/main'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createWindowOpenHandler } from '../../src/main/window-open'

/**
Lets every pending promise reaction and the next macrotask run.
*/
const flush = async (): Promise<void> => {
  await new Promise<void>((resolve) => setTimeout(resolve, 0))
}

const resolvedOpener = () =>
  vi.fn<() => Promise<void>>(async () => {
    await Promise.resolve()
  })

describe('window open handler', () => {
  const unhandled = vi.fn<() => void>()

  beforeEach(() => {
    vi.mocked(log.warn).mockClear()
    unhandled.mockClear()
    process.on('unhandledRejection', unhandled)
  })

  afterEach(() => {
    process.off('unhandledRejection', unhandled)
  })

  it('denies the window and logs a link the system browser could not open', async () => {
    expect.assertions(5)

    const failure = new Error('no handler for this link')
    // A plain function, not vi.fn: a mock subscribes to the promise it returns, which would
    // mark the rejection handled and hide a missing catch.
    const opened: string[] = []
    const handler = createWindowOpenHandler(async (url) => {
      opened.push(url)
      await Promise.resolve()
      throw failure
    })

    expect(handler({ url: 'https://example.invalid/a' })).toStrictEqual({ action: 'deny' })

    await flush()

    expect(opened).toStrictEqual(['https://example.invalid/a'])
    expect(log.warn).toHaveBeenCalledTimes(1)
    expect(log.warn).toHaveBeenCalledWith('[window-open] Could not open link', failure)
    expect(unhandled).not.toHaveBeenCalled()
  })

  it.each(['https://example.invalid/a', ['http:', '//example.invalid/'].join('')])(
    'opens %s in the system browser',
    async (url) => {
      expect.assertions(4)

      const openExternal = resolvedOpener()

      expect(createWindowOpenHandler(openExternal)({ url })).toStrictEqual({ action: 'deny' })

      await flush()

      expect(openExternal).toHaveBeenCalledTimes(1)
      expect(openExternal).toHaveBeenCalledWith(url)
      expect(log.warn).not.toHaveBeenCalled()
    }
  )

  it.each(['file:///x', 'javascript:alert(1)', 'not a url'])('never opens %s', async (url) => {
    expect.assertions(2)

    const openExternal = resolvedOpener()

    expect(createWindowOpenHandler(openExternal)({ url })).toStrictEqual({ action: 'deny' })

    await flush()

    expect(openExternal).not.toHaveBeenCalled()
  })
})
