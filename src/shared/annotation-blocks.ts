/** A comment block MZ reads plugin annotations from, with its offsets in the text it was found in. */
export interface AnnotationBlock {
  kind: 'main' | 'language' | 'struct'
  /** The opener's language suffix: '' for `/*:`, 'ja' for `/*:ja` */
  lang: string
  structName: string | null
  /** `/*:`, `/*:ja`, `/*~struct~Name:` … as written */
  opener: string
  /** Index of the opener */
  start: number
  /** Index just past the first `*\/` after the opener */
  end: number
}

const OPENER = /\/\*(?::([A-Za-z_]*)|~struct~(\w+):([A-Za-z_]*))/g

/**
 * Every annotation block of a plugin file, in file order. The main block is the bare `/*:`
 * block, else the `/*:en` block; every other `/*:xx` block is a language block. An opener
 * without a closing marker after it is not a block.
 */
export function findAnnotationBlocks(source: string): AnnotationBlock[] {
  const blocks: AnnotationBlock[] = []
  const opener = new RegExp(OPENER)
  let match: RegExpExecArray | null
  while ((match = opener.exec(source)) !== null) {
    const close = source.indexOf('*/', match.index + match[0].length)
    if (close === -1) break
    const struct = match[2] !== undefined
    blocks.push({
      kind: struct ? 'struct' : 'language',
      lang: (struct ? match[3] : match[1]) ?? '',
      structName: struct ? match[2] : null,
      opener: match[0],
      start: match.index,
      end: close + 2
    })
    opener.lastIndex = close + 2
  }
  const headers = blocks.filter((b) => b.kind === 'language')
  const main = headers.find((b) => b.lang === '') ?? headers.find((b) => b.lang === 'en')
  if (main !== undefined) main.kind = 'main'
  return blocks
}
