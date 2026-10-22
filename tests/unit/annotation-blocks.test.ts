// The annotation block finder: which comment blocks of a plugin file are its main block, its
// language blocks and its struct blocks, with their offsets in the text as given.
import { describe, expect, it } from 'vitest'
import { findAnnotationBlocks } from '../../src/shared/annotation-blocks'
import type { AnnotationBlock } from '../../src/shared/annotation-blocks'

type Shape = Pick<AnnotationBlock, 'kind' | 'lang' | 'structName' | 'opener'>

const shapes = (source: string): Shape[] =>
  findAnnotationBlocks(source).map(({ kind, lang, structName, opener }) => ({
    kind,
    lang,
    structName,
    opener
  }))

const main = (lang = ''): Shape => ({
  kind: 'main',
  lang,
  structName: null,
  opener: `/*:${lang}`
})
const language = (lang: string): Shape => ({
  kind: 'language',
  lang,
  structName: null,
  opener: `/*:${lang}`
})
const struct = (name: string, lang = ''): Shape => ({
  kind: 'struct',
  lang,
  structName: name,
  opener: `/*~struct~${name}:${lang}`
})

const CODE = '(() => {\n    /* plain comment */\n})();\n'

const CASES: [string, string, Shape[]][] = [
  [
    'bare block then a Japanese block',
    '/*:\n * @plugindesc A\n */\n/*:ja\n * @plugindesc B\n */\n' + CODE,
    [main(), language('ja')]
  ],
  [
    'Japanese block first',
    '/*:ja\n * @plugindesc B\n */\n/*:\n * @plugindesc A\n */\n' + CODE,
    [language('ja'), main()]
  ],
  [
    'English and Japanese blocks without a bare block',
    '/*:en\n * @plugindesc A\n */\n/*:ja\n * @plugindesc B\n */\n' + CODE,
    [main('en'), language('ja')]
  ],
  [
    'bare and English blocks: the bare one is the main block',
    '/*:en\n * @plugindesc A\n */\n/*:\n * @plugindesc B\n */\n' + CODE,
    [language('en'), main()]
  ],
  ['only a Japanese block', '/*:ja\n * @plugindesc B\n */\n' + CODE, [language('ja')]],
  ['no annotation block', '/*! licence */\n' + CODE, []],
  ['an unterminated opener', '/*:\n * @plugindesc A\n' + CODE.replace('*/', ''), []],
  [
    'struct blocks and their translations',
    '/*:\n */\n/*~struct~Pos:\n * @param x\n */\n/*~struct~Pos:ja\n * @param x\n */\n' +
      '/*~struct~Size:en\n */\n' +
      CODE,
    [main(), struct('Pos'), struct('Pos', 'ja'), struct('Size', 'en')]
  ]
]

describe('findAnnotationBlocks', () => {
  for (const [name, source, expected] of CASES) {
    it(name, () => {
      expect(shapes(source)).toEqual(expected)
    })
  }

  it('each block runs from its opener to the first closing marker after it', () => {
    const source = '﻿/*:\n * @plugindesc A\n */\r\n\r\n/*:ja\r\n * x\r\n */\r\n' + CODE
    const blocks = findAnnotationBlocks(source)
    expect(blocks.map((b) => source.slice(b.start, b.end))).toEqual([
      '/*:\n * @plugindesc A\n */',
      '/*:ja\r\n * x\r\n */'
    ])
    expect(blocks[0].start).toBe(1)
  })

  it('offsets in a CRLF text point at the same blocks as in its LF copy', () => {
    const lf = '/*:\n * @plugindesc A\n */\n\n/*~struct~Pos:\n * @param x\n */\n' + CODE
    const crlf = lf.replace(/\n/g, '\r\n')
    const slices = (text: string): string[] =>
      findAnnotationBlocks(text).map((b) => text.slice(b.start, b.end).replace(/\r\n/g, '\n'))
    expect(slices(crlf)).toEqual(slices(lf))
    expect(findAnnotationBlocks(crlf)[1].start).toBe(crlf.indexOf('/*~'))
  })

  it('prints its case count', () => {
    console.log(`annotation blocks: cases ${CASES.length + 2}`)
    expect(CASES.length).toBeGreaterThan(0)
  })
})
