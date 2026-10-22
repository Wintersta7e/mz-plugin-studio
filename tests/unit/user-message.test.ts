// The text an error toast shows: Electron's prefix on an error from main is removed, so the
// message starts with main's own reason.
import { describe, expect, it } from 'vitest'
import { userMessage } from '../../src/renderer/src/lib/utils'

describe('userMessage', () => {
  it('removes the prefix Electron adds to an error from main', () => {
    const error = new Error(
      "Error invoking remote method 'project:load': Error: data folder unreadable"
    )
    expect(userMessage(error)).toBe('data folder unreadable')
  })

  it('removes the name of any error class main threw', () => {
    const error = new Error(
      "Error invoking remote method 'plugin:read-raw': TypeError: Foo.js is not UTF-8"
    )
    expect(userMessage(error)).toBe('Foo.js is not UTF-8')
  })

  it('keeps a message main threw without an error name', () => {
    const error = new Error("Error invoking remote method 'plugin:save': disk full")
    expect(userMessage(error)).toBe('disk full')
  })

  it('keeps an error raised in the renderer as it is', () => {
    expect(userMessage(new Error('Error: kept'))).toBe('Error: kept')
  })

  it('shows a thrown value that is not an Error', () => {
    expect(userMessage('data folder unreadable')).toBe('data folder unreadable')
  })
})
