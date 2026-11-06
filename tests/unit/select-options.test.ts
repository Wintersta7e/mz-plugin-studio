// The one-line text of a select field's options: one option per line, as value|label.
import { describe, it, expect } from 'vitest'
import {
  normalizeOptions,
  optionsText,
  parseOptions
} from '../../src/renderer/src/lib/select-options'
import type { SelectOption } from '../../src/renderer/src/types/plugin'

/**
Every string of `alphabet` up to `max` characters long.
*/
function strings(alphabet: string[], max: number): string[] {
  let level = ['']
  const all: string[] = []
  for (let n = 1; n <= max; n++) {
    level = level.flatMap((s) => alphabet.map((c) => s + c))
    all.push(...level)
  }
  return all
}

// The box trims what it reads and falls back to the value for an empty label, so a stored
// option it can hold has trimmed parts and a label that is not empty.
const parts = [...new Set(strings(['a', '|', '\\', ' '], 3).map((s) => s.trim()))]
const labels = parts.filter(Boolean)

const HOSTILE: SelectOption[][] = [
  [{ value: 'a', text: 'b|c' }],
  [{ value: 'a|b', text: 'Label' }],
  [
    { value: 'A|B', text: 'A|B' },
    { value: 'c', text: 'c' }
  ],
  [{ value: 'dir\\', text: 'Folder' }],
  [{ value: 'C:\\games', text: 'C:\\games' }],
  [{ value: 'a\\|b', text: 'a\\|b' }],
  [{ value: 'end|', text: 'Ends in a pipe' }],
  [{ value: 'v', text: 'x\\|y\\' }],
  [{ value: '', text: 'No value' }],
  [{ value: '\\', text: '|' }]
]

describe('select options text', () => {
  it('reads back every option list it writes', () => {
    const lists = [...parts.flatMap((value) => labels.map((text) => [{ value, text }])), ...HOSTILE]

    expect(lists.map((options) => parseOptions(optionsText(options)))).toStrictEqual(lists)
  })

  it('reads a line without an escaped "|" as value and label split at the first "|"', () => {
    expect(
      ['v|l', 'l', 'a|b|c', ' a | b ', 'a|', 'C:\\games|Games'].map((line) => parseOptions(line))
    ).toStrictEqual([
      [{ value: 'v', text: 'l' }],
      [{ value: 'l', text: 'l' }],
      [{ value: 'a', text: 'b|c' }],
      [{ value: 'a', text: 'b' }],
      [{ value: 'a', text: 'a' }],
      [{ value: 'C:\\games', text: 'Games' }]
    ])
  })

  it('reads "\\|" as a "|" inside the value', () => {
    expect(parseOptions('A\\|B')).toStrictEqual([{ value: 'A|B', text: 'A|B' }])
    expect(parseOptions('a\\|b|Label')).toStrictEqual([{ value: 'a|b', text: 'Label' }])
    expect(parseOptions('dir\\\\|Folder')).toStrictEqual([{ value: 'dir\\', text: 'Folder' }])
  })

  it('skips blank and whitespace-only lines', () => {
    expect(parseOptions('a\n\n  \n\t\nb')).toStrictEqual([
      { value: 'a', text: 'a' },
      { value: 'b', text: 'b' }
    ])
  })

  it('writes an option without a "|" or a final "\\" in its value as it always did', () => {
    expect(
      optionsText([
        { value: 'a', text: 'Alpha' },
        { value: 'b', text: 'b' },
        { value: 'c', text: 'x|y' },
        { value: 'C:\\games', text: 'C:\\games' }
      ])
    ).toBe('a|Alpha\nb\nc|x|y\nC:\\games')
    expect(optionsText(undefined)).toBe('')
  })

  it('leaves the text it writes unchanged when that text is read back and written again', () => {
    for (const options of HOSTILE) {
      expect(normalizeOptions(optionsText(options))).toBe(optionsText(options))
    }
  })
})
