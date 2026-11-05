// Settings lists the saved-state backups by key in the order a plain sort gives: UTF-16 code
// units, so capitals come before lower case and no locale reorders them.
import { afterEach, describe, expect, it } from 'vitest'
import { listBackups } from '../../src/renderer/src/stores/persist'

describe('saved-state backup list', () => {
  afterEach(() => {
    localStorage.clear()
  })

  it('orders backups by key in code-unit order and skips other keys', () => {
    localStorage.setItem('b.backup', 'second lower')
    localStorage.setItem('other-key', 'not a backup')
    localStorage.setItem('B.backup', 'capital')
    localStorage.setItem('a.backup', 'first lower')

    expect(listBackups().map((backup) => backup.key)).toStrictEqual([
      'B.backup',
      'a.backup',
      'b.backup'
    ])
  })
})
