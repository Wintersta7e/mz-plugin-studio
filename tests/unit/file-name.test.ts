// Which plugin names the file-name rule accepts, and that the validator refuses exactly those it
// refuses, so a name the validator passes can be saved as `<name>.js` on Linux and on Windows
import path from 'node:path'
import { describe, it, expect } from 'vitest'
import { unsafeFileNameReason } from '../../src/shared/file-name'
import { validatePlugin } from '../../src/renderer/src/lib/generator/index'
import type { PluginDefinition } from '../../src/shared/types/plugin'

interface Row {
  /**
  The plugin name; the file name is `<name>.js`
  */
  name: string
  /**
  Today's error text for `<name>.js`, or undefined when it is a file name
  */
  reason: string | undefined
}

const SEPARATOR = 'Invalid filename: must not contain path separators or traversal'
const invalid = (file: string): string => `Invalid filename: ${JSON.stringify(file)}`
const device = (file: string): string =>
  `Invalid filename: ${JSON.stringify(file)} is a device name on Windows`

const NAMES: Row[] = [
  { name: 'MyPlugin', reason: undefined },
  { name: 'My Plugin', reason: undefined },
  { name: 'my-plugin', reason: undefined },
  { name: '2nd', reason: undefined },
  { name: 'my.plugin.v2', reason: undefined },
  { name: 'テスト', reason: undefined },
  { name: '速度', reason: undefined },
  { name: 'CONFIG', reason: undefined },
  { name: '', reason: undefined },
  { name: 'a/b', reason: SEPARATOR },
  { name: String.raw`a\b`, reason: SEPARATOR },
  { name: '../x', reason: SEPARATOR },
  { name: 'a:b', reason: invalid('a:b.js') },
  { name: 'a\0b', reason: invalid('a\0b.js') },
  { name: 'CON', reason: device('CON.js') },
  { name: 'nul.js', reason: device('nul.js.js') },
  { name: 'COM1.js', reason: device('COM1.js.js') },
  { name: 'LPT9.js', reason: device('LPT9.js.js') },
  { name: 'aux ', reason: device('aux .js') }
]

// Each name quoted in the test titles, so an empty name, a space and NUL show
const ROWS = NAMES.map((row) => ({ ...row, shown: JSON.stringify(row.name) }))

function definition(name: string): PluginDefinition {
  return {
    id: 'file-name',
    meta: {
      name,
      version: '1.0.0',
      author: '',
      description: '',
      help: '',
      url: '',
      target: 'MZ',
      dependencies: [],
      orderAfter: [],
      localizations: {}
    },
    parameters: [],
    commands: [],
    structs: []
  }
}

const nameErrors = (name: string): string[] =>
  validatePlugin(definition(name)).errors.filter((error) => error.startsWith('Plugin name'))

describe('the file-name rule for plugin names', () => {
  it.each(ROWS)('$shown: the rule gives the reason for its .js file name', ({ name, reason }) => {
    expect(unsafeFileNameReason(`${name}.js`)).toBe(reason)
  })

  it.each(ROWS.filter((row) => row.reason === undefined))(
    '$shown: an accepted .js file name is its own base name on Linux and on Windows',
    ({ name }) => {
      const file = `${name}.js`

      expect(path.posix.basename(file)).toBe(file)
      expect(path.win32.basename(file)).toBe(file)
    }
  )

  it.each(ROWS)(
    '$shown: the validator refuses the names the rule refuses, and the empty name',
    ({ name, reason }) => {
      const refused =
        reason === undefined ? [] : [`Plugin name cannot be used as a file name: ${reason}`]

      expect(nameErrors(name)).toStrictEqual(name === '' ? ['Plugin name is required'] : refused)
    }
  )

  it('refuses a file name without the .js extension', () => {
    expect(unsafeFileNameReason('MyPlugin')).toBe('Invalid filename: must have .js extension')
    expect(unsafeFileNameReason('MyPlugin.txt')).toBe('Invalid filename: must have .js extension')
  })

  it('covers separators, a colon, NUL, traversal, device names and plain names', () => {
    const refused = ROWS.filter((row) => row.reason !== undefined).length

    expect(
      ROWS.length,
      `file-name rows: ${String(ROWS.length)} (refused ${String(refused)})`
    ).toBeGreaterThan(refused)
    expect(refused).toBeGreaterThan(0)
  })
})
