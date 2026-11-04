// The IPC contract names every channel once: the invoke, send and event lists split the channel
// constants between them, and the window API's member types follow from the contract.
import { describe, it, expect, expectTypeOf } from 'vitest'
import {
  EVENT_CHANNELS,
  INVOKE_CHANNELS,
  IPC_CHANNELS,
  SEND_CHANNELS,
  type API,
  type EventChannel,
  type InvokeChannel,
  type SaveGuard,
  type SaveResult,
  type SendChannel
} from '../../src/shared/ipc-types'

describe('ipc contract', () => {
  it('splits every channel constant into exactly one of invoke, send and event', () => {
    const constants = new Set<string>(Object.values(IPC_CHANNELS))
    const lists: readonly (readonly string[])[] = [INVOKE_CHANNELS, SEND_CHANNELS, EVENT_CHANNELS]
    const listed = lists.flat()

    console.log(
      `contract channels: invoke ${INVOKE_CHANNELS.length}, send ${SEND_CHANNELS.length}, ` +
        `event ${EVENT_CHANNELS.length}, constants ${constants.size}`
    )

    expect(constants.size).toBeGreaterThan(0)
    expect(listed).toHaveLength(constants.size)
    expect(new Set(listed)).toEqual(constants)
  })

  it('answers the window state and log folder requests', () => {
    expect(INVOKE_CHANNELS).toContain('window-is-maximized')
    expect(INVOKE_CHANNELS).toContain('log:open-folder')
    expect([...SEND_CHANNELS].sort()).toEqual(
      ['log:set-level', 'window-close', 'window-maximize', 'window-minimize'].sort()
    )
    expect([...EVENT_CHANNELS]).toEqual(['window-maximized-changed'])
  })

  it('derives the window API from the contract', () => {
    expectTypeOf<(typeof INVOKE_CHANNELS)[number]>().toEqualTypeOf<InvokeChannel>()
    expectTypeOf<(typeof SEND_CHANNELS)[number]>().toEqualTypeOf<SendChannel>()
    expectTypeOf<(typeof EVENT_CHANNELS)[number]>().toEqualTypeOf<EventChannel>()
    expectTypeOf<Window['api']>().toEqualTypeOf<API>()
    expectTypeOf<API['plugin']['save']>().toEqualTypeOf<
      (
        projectPath: string,
        filename: string,
        content: string,
        guard: SaveGuard
      ) => Promise<SaveResult>
    >()
    expectTypeOf<Parameters<API['plugin']['saveToPath']>[2]>().toEqualTypeOf<
      SaveGuard | undefined
    >()
    expectTypeOf<API['window']['onMaximizeChange']>().toEqualTypeOf<
      (callback: (isMaximized: boolean) => void) => () => void
    >()
  })
})
