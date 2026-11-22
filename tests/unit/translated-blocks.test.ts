// The translated annotation blocks a save with raw mode off removes from an imported plugin's
// file: the regenerated file keeps only the description and help of each language.
import { describe, expect, it } from 'vitest'
import {
  type DroppedTranslatedBlocks,
  findDroppedTranslatedBlocks,
  translatedBlocksNotice
} from '../../src/renderer/src/lib/translated-blocks'

const MAIN = `/*:
 * @target MZ
 * @plugindesc Main
 * @param speed
 * @type number
 * @command go
 */`

// The result with each struct name as text, so a language block's missing one reads 'null'
const view = (result: DroppedTranslatedBlocks): unknown =>
  result.known
    ? {
        known: true,
        blocks: result.blocks.map((block) => ({ ...block, structName: String(block.structName) }))
      }
    : result

const ROWS: [string, string | undefined, unknown][] = [
  [
    'a language block with parameters and a command is reported with its counts',
    `${MAIN}\n/*:ja\n * @plugindesc 日本語\n * @param speed\n * @text 速度\n * @param power\n * @command go\n * @arg target\n */`,
    {
      known: true,
      blocks: [{ lang: 'ja', kind: 'language', structName: 'null', params: 2, commands: 1 }]
    }
  ],
  [
    'a language block with only a description and help is not reported',
    `${MAIN}\n/*:ja\n * @plugindesc 日本語\n * @help\n * ヘルプ @param はここにない\n */`,
    { known: true, blocks: [] }
  ],
  [
    'a struct block in another language is reported',
    `${MAIN}\n/*~struct~Point:\n * @param x\n */\n/*~struct~Point:ja\n * @param x\n * @param y\n */`,
    {
      known: true,
      blocks: [{ lang: 'ja', kind: 'struct', structName: 'Point', params: 2, commands: 0 }]
    }
  ],
  [
    'blocks in the main block language are not reported, with an English main block',
    `/*:en\n * @param speed\n */\n/*~struct~Point:en\n * @param x\n */\n/*:ja\n * @param speed\n */`,
    {
      known: true,
      blocks: [{ lang: 'ja', kind: 'language', structName: 'null', params: 1, commands: 0 }]
    }
  ],
  ['a plugin with no file text cannot be checked', undefined, { known: false }],
  ['a plugin with empty file text cannot be checked', '', { known: false }]
]

describe(findDroppedTranslatedBlocks, () => {
  it.each(ROWS)('%s', (_title, rawSource, expected) => {
    expect(view(findDroppedTranslatedBlocks(rawSource))).toStrictEqual(expected)
  })

  it('checks every row of the table', () => {
    const checked = ROWS.filter(
      ([, rawSource, expected]) =>
        JSON.stringify(view(findDroppedTranslatedBlocks(rawSource))) === JSON.stringify(expected)
    ).length
    process.stdout.write(`detector rows: ${String(checked)}\n`)

    expect(checked, `detector rows: ${String(checked)}`).toBe(ROWS.length)
  })
})

describe(translatedBlocksNotice, () => {
  it.each([
    [
      'names each block with what it holds',
      `${MAIN}\n/*:ja\n * @param a\n * @param b\n * @command go\n */\n/*~struct~Point:ja\n */`,
      ' It also removes these translated blocks: /*:ja (2 parameters, 1 command), /*~struct~Point:ja.'
    ],
    [
      'names a single block',
      `${MAIN}\n/*:zh\n * @command go\n */`,
      ' It also removes this translated block: /*:zh (1 command).'
    ],
    ['adds nothing when no translated block is removed', MAIN, ''],
    [
      'says the blocks could not be checked without the file text',
      undefined,
      ' Its file text is not loaded, so its translated blocks could not be checked: the save may remove them too.'
    ]
  ])('%s', (_title, rawSource, expected) => {
    expect(translatedBlocksNotice(rawSource)).toBe(expected)
  })
})
